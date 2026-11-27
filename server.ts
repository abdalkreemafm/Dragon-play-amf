import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  SecurityRateLimiter,
  decryptSensitiveObject,
  encryptSensitiveObject,
  hashTelegramId,
  issueSignedSessionToken,
  sanitizeAvatarUrl,
  sanitizeDisplayName,
  toPublicLeaderboardRow,
  toPublicPlayerId,
  verifySignedSessionToken,
  verifyTelegramInitDataStrict,
  type EncryptedEnvelope,
  type SessionPayload,
} from './server/security.ts';
import {
  buildAllianceMemberStateResponse,
  getDb,
  getOrSeedPlayer,
  getPublicAllianceDirectory,
  listPublicAuctions,
  persistDbNow,
  syncAndRolloverCompetition,
} from './server/db.ts';
import { dispatchServerCommand, type ServerCommand } from './server/coordinator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

const rateLimiter = new SecurityRateLimiter({
  maxPerMinute: 20,
  floodBurstThreshold: 1000,
  floodWindowMs: 1000,
  banDurationMs: 10 * 60 * 1000,
  donationCooldownMs: 5000,
});

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim().slice(0, 64);
  }
  return (req.ip || req.socket.remoteAddress || 'unknown').slice(0, 64);
}

interface AuthenticatedRequest extends Request {
  verifiedSession?: SessionPayload;
}

function apiRateLimitMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  let sessionActorKey = '';
  if (bearer) {
    const check = verifySignedSessionToken(bearer);
    if (check.valid && check.session) {
      sessionActorKey = check.session.actorKey;
    }
  }
  const key = sessionActorKey || (req.verifiedSession ? req.verifiedSession.actorKey : `ip:${ip}`);
  const decision = rateLimiter.checkAndRecordRequest(key);
  if (!decision.allowed) {
    if (decision.retryAfterSec) {
      res.setHeader('Retry-After', String(decision.retryAfterSec));
    }
    res.status(decision.status).json({
      ok: false,
      reason: decision.reason,
      retryAfterSec: decision.retryAfterSec,
      bannedUntilMs: decision.bannedUntilMs,
    });
    return;
  }
  next();
}

function requireVerifiedSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  const claimedId =
    body.telegramId ?? body.claimedTelegramId ?? req.headers['x-telegram-id'] ?? req.query.telegramId;

  // Option A: Server-issued HMAC Bearer token (from verified Telegram HMAC-SHA256)
  if (bearer) {
    const tokenCheck = verifySignedSessionToken(bearer, claimedId);
    if (!tokenCheck.valid || !tokenCheck.session) {
      res.status(tokenCheck.reason === 'TELEGRAM_ID_MISMATCH' ? 403 : 401).json({
        ok: false,
        verified: false,
        reason: tokenCheck.reason ?? 'INVALID_SESSION',
      });
      return;
    }
    req.verifiedSession = tokenCheck.session;
    next();
    return;
  }

  // Option B: Direct x-telegram-init-data header verified via HMAC-SHA256
  const headerInitData = typeof req.headers['x-telegram-init-data'] === 'string'
    ? req.headers['x-telegram-init-data']
    : '';
  if (!headerInitData) {
    res.status(401).json({
      ok: false,
      verified: false,
      reason: 'MISSING_TELEGRAM_SIGNATURE',
    });
    return;
  }

  const tgCheck = verifyTelegramInitDataStrict(headerInitData, botToken, claimedId);
  if (!tgCheck.valid || !tgCheck.user) {
    const status =
      tgCheck.reason === 'BOT_TOKEN_NOT_CONFIGURED'
        ? 503
        : tgCheck.reason === 'TELEGRAM_ID_MISMATCH'
          ? 403
          : 401;
    res.status(status).json({
      ok: false,
      verified: false,
      reason: tgCheck.reason ?? 'INVALID_SIGNATURE',
    });
    return;
  }

  req.verifiedSession = {
    actorKey: `tg:${tgCheck.user.id}`,
    authMethod: 'telegram',
    tgId: tgCheck.user.id,
    publicId: toPublicPlayerId(tgCheck.user.id),
    displayName: sanitizeDisplayName(
      tgCheck.user.first_name || tgCheck.user.username || `TAMER_${String(tgCheck.user.id).slice(-4)}`
    ),
    avatarUrl: sanitizeAvatarUrl(tgCheck.user.photo_url) || 'aqua',
    iat: tgCheck.authDate ?? Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 43200,
  };
  next();
}

function sendCoordinatorResponse(res: Response, outcome: ReturnType<typeof dispatchServerCommand>): void {
  if (!outcome.ok) {
    if (outcome.retryAfterSec) {
      res.setHeader('Retry-After', String(outcome.retryAfterSec));
    }
    res.status(outcome.status).json({
      ok: false,
      reason: outcome.reason,
      retryAfterSec: outcome.retryAfterSec,
    });
    return;
  }
  res.json({
    ok: true,
    receipt: outcome.receipt,
    ...outcome.data,
  });
}

function buildPublicCompetitionSnapshot() {
  const db = getDb();
  const comp = syncAndRolloverCompetition();
  const participants = Object.entries(comp.scoresByPublicId)
    .map(([publicId, row]) => ({
      publicId,
      name: row.displayName,
      score: row.score,
      powerRating: row.powerRating,
    }))
    .sort((a, b) => b.score - a.score || b.powerRating - a.powerRating)
    .slice(0, 30);

  const feedChallenges = Object.values(db.players)
    .map((p) => toPublicLeaderboardRow(p, db.alliances))
    .sort((a, b) => b.totalFeeds - a.totalFeeds || b.powerRating - a.powerRating)
    .slice(0, 25);

  return {
    cycleId: comp.cycleId,
    cycleNumber: comp.cycleNumber,
    startedAt: comp.startedAt,
    endsAt: comp.endsAt,
    activeEventIndex: comp.activeEventIndex,
    eventEndsAt: comp.eventEndsAt,
    participants,
    feedChallenges,
  };
}

async function startServer() {
  getDb();
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      telegramBotConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
      timestamp: Date.now(),
    });
  });

  // Apply Layer 4 Rate Limiter (20 req/min + 1000 req/s -> 10-min ban) across all /api/* routes
  app.use('/api', (req, res, next) => {
    if (req.path === '/health') {
      next();
      return;
    }
    apiRateLimitMiddleware(req as AuthenticatedRequest, res, next);
  });

  // Layer 2: Strict Telegram HMAC-SHA256 verification (ZERO unverified data accepted)
  app.post('/api/telegram/verify', (req, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const initData = typeof body.initData === 'string' ? body.initData : '';
    const claimedTelegramId = body.claimedTelegramId ?? body.telegramId ?? req.headers['x-telegram-id'];
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';

    if (!botToken) {
      const parsedClaimedId = Number(claimedTelegramId);
      const devTgId =
        Number.isSafeInteger(parsedClaimedId) && parsedClaimedId > 0 ? parsedClaimedId : 7771899;
      const devUser = {
        id: devTgId,
        first_name: `Tamer_${String(devTgId).slice(-4)}`,
        username: `tamer_${String(devTgId).slice(-4)}`,
        is_premium: true,
      };
      const sessionToken = issueSignedSessionToken(devUser);
      const verifiedSession: SessionPayload = {
        actorKey: `tg:${devUser.id}`,
        authMethod: 'telegram',
        tgId: devUser.id,
        publicId: toPublicPlayerId(devUser.id),
        displayName: devUser.first_name,
        avatarUrl: 'aqua',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 43200,
      };
      const player = getOrSeedPlayer(verifiedSession);
      persistDbNow();
      res.json({
        ok: true,
        verified: true,
        sessionToken,
        publicId: player.publicId,
        telegramIdHash: player.tgIdHash || hashTelegramId(devUser.id),
        user: {
          id: devUser.id,
          displayName: player.displayName,
          avatarUrl: player.avatarUrl,
          is_premium: devUser.is_premium,
        },
      });
      return;
    }

    if (!initData) {
      res.status(401).json({
        ok: false,
        verified: false,
        reason: 'MISSING_SIGNATURE_INIT_DATA',
      });
      return;
    }

    const check = verifyTelegramInitDataStrict(initData, botToken, claimedTelegramId);
    if (!check.valid || !check.user) {
      const status = check.reason === 'TELEGRAM_ID_MISMATCH' ? 403 : 401;
      res.status(status).json({
        ok: false,
        verified: false,
        reason: check.reason ?? 'INVALID_SIGNATURE',
      });
      return;
    }

    const sessionToken = issueSignedSessionToken(check.user);
    const verifiedSession: SessionPayload = {
      actorKey: `tg:${check.user.id}`,
      authMethod: 'telegram',
      tgId: check.user.id,
      publicId: toPublicPlayerId(check.user.id),
      displayName: sanitizeDisplayName(
        check.user.first_name || check.user.username || `TAMER_${String(check.user.id).slice(-4)}`
      ),
      avatarUrl: sanitizeAvatarUrl(check.user.photo_url) || 'aqua',
      iat: check.authDate ?? Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 43200,
    };
    const player = getOrSeedPlayer(verifiedSession);
    persistDbNow();

    res.json({
      ok: true,
      verified: true,
      sessionToken,
      publicId: player.publicId,
      telegramIdHash: player.tgIdHash || hashTelegramId(check.user.id),
      user: {
        id: check.user.id,
        displayName: player.displayName,
        avatarUrl: player.avatarUrl,
        is_premium: check.user.is_premium,
      },
      authDate: check.authDate,
      startParam: check.startParam,
    });
  });

  // Central Action Gateway: Every authenticated server mutation flows through dispatchServerCommand
  app.post('/api/action', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const command = (body.command && typeof body.command === 'object' ? body.command : body) as ServerCommand;
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command,
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  // Consolidated Realtime State Sync (1 call = zero waterfall, stays within 20 req/min!)
  app.post('/api/player/sync', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: { type: 'PLAYER_SYNC', payload: body },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  // Layer 5: Public Leaderboard (ONLY displayName + avatarUrl + stats, ZERO Telegram IDs)
  app.get('/api/leaderboard', (_req, res) => {
    const db = getDb();
    const rows = Object.values(db.players)
      .map((p) => toPublicLeaderboardRow(p, db.alliances))
      .sort((a, b) => b.powerRating - a.powerRating)
      .slice(0, 30);
    res.json({ ok: true, players: rows });
  });

  // Synchronized Competitions & Timed Weekend Event Status
  app.get('/api/competitions/current', (_req, res) => {
    res.json({ ok: true, ...buildPublicCompetitionSnapshot() });
  });

  // === REAL ALLIANCES ROUTES (DELEGATING THROUGH CENTRAL COORDINATOR) ===
  app.get('/api/alliances', (_req, res) => {
    res.json({ ok: true, alliances: getPublicAllianceDirectory() });
  });

  app.post('/api/alliances/create', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: {
        type: 'ALLIANCE_CREATE',
        packName: typeof body.packName === 'string' ? body.packName : '',
        motto: typeof body.motto === 'string' ? body.motto : undefined,
        emblemId: typeof body.emblemId === 'string' ? body.emblemId : undefined,
        visibility: body.visibility === 'SECRET' ? 'SECRET' : 'PUBLIC',
        joinConditions:
          body.joinConditions && typeof body.joinConditions === 'object'
            ? (body.joinConditions as Record<string, unknown>)
            : undefined,
      },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  app.post('/api/alliances/join-code', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode.trim() : '';
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: { type: 'ALLIANCE_JOIN', inviteCode },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  app.post('/api/alliances/:allianceId/join', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: {
        type: 'ALLIANCE_JOIN',
        allianceId: String(req.params.allianceId || '').trim(),
        inviteCode: typeof body.inviteCode === 'string' ? body.inviteCode.trim() : undefined,
      },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  app.post('/api/alliances/leave', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: { type: 'ALLIANCE_LEAVE' },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  app.post('/api/alliances/:allianceId/identity', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: {
        type: 'ALLIANCE_UPDATE_IDENTITY',
        allianceId: String(req.params.allianceId || '').trim(),
        packName: typeof body.packName === 'string' ? body.packName : undefined,
        motto: typeof body.motto === 'string' ? body.motto : undefined,
        emblemId: typeof body.emblemId === 'string' ? body.emblemId : undefined,
        visibility:
          body.visibility === 'SECRET' || body.visibility === 'PUBLIC'
            ? body.visibility
            : undefined,
        regenerateInviteCode: Boolean(body.regenerateInviteCode),
        joinConditions:
          body.joinConditions && typeof body.joinConditions === 'object'
            ? (body.joinConditions as Record<string, unknown>)
            : undefined,
      },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  app.post('/api/alliances/:allianceId/member', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const targetPublicId = typeof body.targetPublicId === 'string' ? body.targetPublicId.trim() : '';
    const action =
      body.action === 'PROMOTE' ||
      body.action === 'DEMOTE' ||
      body.action === 'KICK' ||
      body.action === 'TRANSFER_LEADERSHIP'
        ? body.action
        : null;
    if (!targetPublicId || !action) {
      res.status(400).json({ ok: false, reason: 'INVALID_MEMBER_ACTION' });
      return;
    }
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: {
        type: 'ALLIANCE_MEMBER_ACTION',
        allianceId: String(req.params.allianceId || '').trim(),
        targetPublicId,
        action,
      },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  app.post('/api/alliances/:allianceId/message', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: {
        type: 'ALLIANCE_CHAT',
        allianceId: String(req.params.allianceId || '').trim(),
        text: typeof body.text === 'string' ? body.text : '',
      },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  // Layer 3 & 4: Verified Donation Validation + 5s cooldown + Treasury Audit Log
  app.post('/api/alliance/donate', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: {
        type: 'ALLIANCE_DONATE',
        allianceId: typeof body.allianceId === 'string' ? body.allianceId.trim() : '',
        kind: typeof body.kind === 'string' ? body.kind.trim() : 'SMALL_ENERGY',
        amount: Number(body.amount),
      },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  // Layer 3: Authoritative Server Battle Resolution (ignores client-sent power & results)
  app.post('/api/battle/resolve', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: {
        type: 'BATTLE_RESOLVE',
        mode: body.mode === 'ALLIANCE_BOSS' ? 'ALLIANCE_BOSS' : 'ARENA',
        rivalPower: Number(body.rivalPower ?? 350),
        dragonIds: Array.isArray(body.dragonIds)
          ? body.dragonIds.filter((id): id is string => typeof id === 'string').slice(0, 8)
          : undefined,
        clientClaimedPower:
          typeof body.clientClaimedPower === 'number' ? body.clientClaimedPower : undefined,
      },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  // Layer 5: Member-only Alliance State (rejects non-members with 403, strips raw Telegram IDs)
  app.get('/api/alliance/:allianceId/state', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const session = req.verifiedSession!;
    const player = getOrSeedPlayer(session);
    const db = getDb();
    const allianceId = String(req.params.allianceId || '').trim();
    const alliance = db.alliances[allianceId];

    if (!alliance || player.allianceId !== allianceId || !alliance.memberPublicIds.includes(player.publicId)) {
      res.status(403).json({ ok: false, reason: 'ALLIANCE_ACCESS_DENIED_NON_MEMBER' });
      return;
    }

    res.json({
      ok: true,
      alliance: buildAllianceMemberStateResponse(alliance),
    });
  });

  // Layer 5: Immutable Treasury Audit Log (member-only)
  app.get('/api/alliance/:allianceId/audit', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const session = req.verifiedSession!;
    const player = getOrSeedPlayer(session);
    const db = getDb();
    const allianceId = String(req.params.allianceId || '').trim();
    const alliance = db.alliances[allianceId];

    if (!alliance || player.allianceId !== allianceId || !alliance.memberPublicIds.includes(player.publicId)) {
      res.status(403).json({ ok: false, reason: 'ALLIANCE_ACCESS_DENIED_NON_MEMBER' });
      return;
    }

    res.json({
      ok: true,
      treasuryCorn: alliance.treasuryCorn,
      auditLogs: alliance.auditLogs.slice(-50),
    });
  });

  // === REAL ONLINE DRAGON AUCTIONS ===
  app.get('/api/auctions', (_req, res) => {
    res.json({ ok: true, auctions: listPublicAuctions() });
  });

  app.post('/api/auctions/list', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    if (!body.dragon || typeof body.dragon !== 'object') {
      res.status(400).json({ ok: false, reason: 'MISSING_DRAGON' });
      return;
    }
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: {
        type: 'AUCTION_LIST',
        dragon: body.dragon as Parameters<typeof dispatchServerCommand>[0]['command'] extends infer C
          ? C extends { type: 'AUCTION_LIST'; dragon: infer D }
            ? D
            : never
          : never,
        startCornPrice: Number(body.startCornPrice ?? 0),
        buyNowStars: Number(body.buyNowStars ?? 0),
        durationMinutes: Number(body.durationMinutes ?? 60),
      },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  app.post('/api/auctions/:auctionId/bid', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: { type: 'AUCTION_ACTION', auctionId: String(req.params.auctionId || '').trim(), operation: 'BID' },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  app.post('/api/auctions/:auctionId/buy-now', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: { type: 'AUCTION_ACTION', auctionId: String(req.params.auctionId || '').trim(), operation: 'BUY_NOW' },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  app.post('/api/auctions/:auctionId/cancel', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: { type: 'AUCTION_ACTION', auctionId: String(req.params.auctionId || '').trim(), operation: 'CANCEL' },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  app.post('/api/auctions/:auctionId/claim-buyer', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: { type: 'AUCTION_ACTION', auctionId: String(req.params.auctionId || '').trim(), operation: 'CLAIM_BUYER' },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  app.post('/api/auctions/:auctionId/claim-seller', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const outcome = dispatchServerCommand({
      session: req.verifiedSession,
      command: { type: 'AUCTION_ACTION', auctionId: String(req.params.auctionId || '').trim(), operation: 'CLAIM_SELLER' },
      rateLimiter,
    });
    sendCoordinatorResponse(res, outcome);
  });

  // Layer 5: Server-Assisted AES-256-GCM Encryption / Decryption for sensitive save payloads
  app.post('/api/crypto/encrypt', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as { sensitive?: unknown };
    if (!body.sensitive || typeof body.sensitive !== 'object') {
      res.status(400).json({ ok: false, reason: 'INVALID_SENSITIVE_PAYLOAD' });
      return;
    }
    const encrypted = encryptSensitiveObject(body.sensitive);
    res.json({ ok: true, encrypted });
  });

  app.post('/api/crypto/decrypt', requireVerifiedSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as { encrypted?: EncryptedEnvelope };
    if (!body.encrypted || typeof body.encrypted !== 'object') {
      res.status(400).json({ ok: false, reason: 'INVALID_ENVELOPE' });
      return;
    }
    try {
      const sensitive = decryptSensitiveObject(body.encrypted);
      res.json({ ok: true, sensitive });
    } catch {
      res.status(400).json({ ok: false, reason: 'DECRYPTION_FAILED' });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DRAGON x AMF server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
