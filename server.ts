import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { NextFunction, Request, Response } from 'express';
import {
  SecurityRateLimiter,
  ServerAllianceState,
  ServerDragon,
  ServerPlayerState,
  decryptSensitiveObject,
  encryptSensitiveObject,
  hashTelegramId,
  issueSignedSessionToken,
  recomputeTotalPlayerPower,
  sanitizeAvatarUrl,
  sanitizeDisplayName,
  toPublicLeaderboardRow,
  toPublicPlayerId,
  validateAndExecuteDonation,
  validateAndResolveBattle,
  verifySignedSessionToken,
  verifyTelegramInitDataStrict,
  type EncryptedEnvelope,
  type SessionPayload,
} from './server/security.ts';

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

// Authoritative server-side stores (keyed by verified Telegram ID, never trusted from client numbers)
const playerStore = new Map<number, ServerPlayerState>();
const allianceStore = new Map<string, ServerAllianceState>();

allianceStore.set('global_swarm_alpha', {
  id: 'global_swarm_alpha',
  packName: 'عش التنانين الملكي',
  level: 3,
  xp: 245000,
  power: 42500,
  treasuryCorn: 125000,
  vaultGold: 280,
  techPointsPool: 18500,
  bossLevel: 4,
  bossHp: 12500,
  bossMaxHp: 12500,
  memberPublicIds: [],
  auditLogs: [],
});

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim().slice(0, 64);
  }
  return (req.ip || req.socket.remoteAddress || 'unknown').slice(0, 64);
}

function getOrSeedServerPlayer(session: SessionPayload): ServerPlayerState {
  const existing = playerStore.get(session.tgId);
  if (existing) {
    existing.displayName = session.displayName || existing.displayName;
    if (session.avatarUrl) existing.avatarUrl = session.avatarUrl;
    return existing;
  }

  const starterDragon: ServerDragon = {
    id: `starter_${session.publicId}`,
    name: 'تنين البداية',
    skin: 'aqua',
    rarity: 'COMMON',
    level: 1,
    customLevel: 0,
    skillLevel: 1,
    trainingLevel: 0,
    gear: 'none',
    sizeTier: 'NORMAL',
  };

  const created: ServerPlayerState = {
    publicId: session.publicId,
    tgIdHash: hashTelegramId(session.tgId),
    displayName: session.displayName,
    avatarUrl: session.avatarUrl || 'aqua',
    corn: 500,
    duckGold: 15,
    stars: 10,
    leaguePoints: 100,
    allianceId: 'global_swarm_alpha',
    allianceRole: 'MEMBER',
    allianceTaxLv: 0,
    allianceFuryLv: 0,
    donationsToday: 0,
    bossAttacksToday: 0,
    lastDonationAt: 0,
    dragons: [starterDragon],
    updatedAt: Date.now(),
  };
  playerStore.set(session.tgId, created);

  const defaultAlliance = allianceStore.get('global_swarm_alpha');
  if (defaultAlliance && !defaultAlliance.memberPublicIds.includes(created.publicId)) {
    defaultAlliance.memberPublicIds.push(created.publicId);
  }
  return created;
}

interface AuthenticatedRequest extends Request {
  verifiedSession?: SessionPayload;
}

function apiRateLimitMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const key = req.verifiedSession ? `tg:${req.verifiedSession.tgId}` : `ip:${ip}`;
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

function requireVerifiedTelegramSession(
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

  // Option A: Server-issued HMAC Bearer token (issued only after Telegram HMAC-SHA256 verification)
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

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      telegramBotConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
      timestamp: Date.now(),
    });
  });

  // Apply Layer 4 Rate Limiter (20 req/min + 1000 req/s -> 10-min ban) across all /api/* mutation/data routes
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
      res.status(503).json({
        ok: false,
        verified: false,
        reason: 'BOT_TOKEN_NOT_CONFIGURED',
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
      tgId: check.user.id,
      publicId: toPublicPlayerId(check.user.id),
      displayName: sanitizeDisplayName(
        check.user.first_name || check.user.username || `TAMER_${String(check.user.id).slice(-4)}`
      ),
      avatarUrl: sanitizeAvatarUrl(check.user.photo_url) || 'aqua',
      iat: check.authDate ?? Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 43200,
    };
    const player = getOrSeedServerPlayer(verifiedSession);

    res.json({
      ok: true,
      verified: true,
      sessionToken,
      publicId: player.publicId,
      telegramIdHash: player.tgIdHash,
      // Return only safe public/display details; caller already possesses own Telegram user in WebApp
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

  // Layer 5: Public Leaderboard (ONLY displayName + avatarUrl + stats, ZERO Telegram IDs)
  app.get('/api/leaderboard', (_req, res) => {
    const rows = Array.from(playerStore.values())
      .map(toPublicLeaderboardRow)
      .sort((a, b) => b.powerRating - a.powerRating)
      .slice(0, 25);
    res.json({ ok: true, players: rows });
  });

  // Layer 3 & 4: Verified Donation Validation + 5s cooldown + Treasury Audit Log
  app.post('/api/alliance/donate', requireVerifiedTelegramSession, (req: AuthenticatedRequest, res) => {
    const session = req.verifiedSession!;
    const player = getOrSeedServerPlayer(session);
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const allianceId = typeof body.allianceId === 'string' ? body.allianceId.trim() : '';
    const kind = typeof body.kind === 'string' ? body.kind.trim() : 'SMALL_ENERGY';
    const requestedAmount = Number(body.amount);

    const result = validateAndExecuteDonation({
      player,
      alliance: allianceStore.get(allianceId),
      allianceId,
      kind,
      requestedAmount,
      rateLimiter,
    });

    if (!result.ok) {
      if (result.retryAfterSec) {
        res.setHeader('Retry-After', String(result.retryAfterSec));
      }
      res.status(result.status).json(result);
      return;
    }

    res.json(result);
  });

  // Layer 3: Authoritative Server Battle Resolution (ignores client-sent power & results)
  app.post('/api/battle/resolve', requireVerifiedTelegramSession, (req: AuthenticatedRequest, res) => {
    const session = req.verifiedSession!;
    const player = getOrSeedServerPlayer(session);
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const mode = body.mode === 'ALLIANCE_BOSS' ? 'ALLIANCE_BOSS' : 'ARENA';
    const rivalPower = Number(body.rivalPower ?? 350);
    const clientClaimedPower =
      typeof body.clientClaimedPower === 'number' ? body.clientClaimedPower : undefined;
    const selectedDragonIds = Array.isArray(body.dragonIds)
      ? body.dragonIds.filter((id): id is string => typeof id === 'string').slice(0, 8)
      : undefined;

    const alliance = player.allianceId ? allianceStore.get(player.allianceId) : undefined;
    const outcome = validateAndResolveBattle({
      player,
      alliance,
      mode,
      rivalPower,
      selectedDragonIds,
      clientClaimedPower,
    });

    res.json(outcome);
  });

  // Layer 5: Member-only Alliance State (rejects non-members with 403, strips raw Telegram IDs)
  app.get('/api/alliance/:allianceId/state', requireVerifiedTelegramSession, (req: AuthenticatedRequest, res) => {
    const session = req.verifiedSession!;
    const player = getOrSeedServerPlayer(session);
    const allianceId = String(req.params.allianceId || '').trim();
    const alliance = allianceStore.get(allianceId);

    if (!alliance || player.allianceId !== allianceId || !alliance.memberPublicIds.includes(player.publicId)) {
      res.status(403).json({ ok: false, reason: 'ALLIANCE_ACCESS_DENIED_NON_MEMBER' });
      return;
    }

    const members = Array.from(playerStore.values())
      .filter((p) => p.allianceId === allianceId)
      .map((p) => ({
        publicId: p.publicId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        role: p.allianceRole ?? 'MEMBER',
        powerRating: recomputeTotalPlayerPower(p),
      }));

    res.json({
      ok: true,
      alliance: {
        id: alliance.id,
        packName: alliance.packName,
        level: alliance.level,
        xp: alliance.xp,
        power: alliance.power,
        treasuryCorn: alliance.treasuryCorn,
        vaultGold: alliance.vaultGold,
        techPointsPool: alliance.techPointsPool,
        bossLevel: alliance.bossLevel,
        bossHp: alliance.bossHp,
        bossMaxHp: alliance.bossMaxHp,
        members,
        auditLogs: alliance.auditLogs.slice(-40),
      },
    });
  });

  // Layer 5: Immutable Treasury Audit Log (member-only)
  app.get('/api/alliance/:allianceId/audit', requireVerifiedTelegramSession, (req: AuthenticatedRequest, res) => {
    const session = req.verifiedSession!;
    const player = getOrSeedServerPlayer(session);
    const allianceId = String(req.params.allianceId || '').trim();
    const alliance = allianceStore.get(allianceId);

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

  // Layer 5: Server-Assisted AES-256-GCM Encryption / Decryption for sensitive Firestore save payloads
  app.post('/api/crypto/encrypt', requireVerifiedTelegramSession, (req: AuthenticatedRequest, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as { sensitive?: unknown };
    if (!body.sensitive || typeof body.sensitive !== 'object') {
      res.status(400).json({ ok: false, reason: 'INVALID_SENSITIVE_PAYLOAD' });
      return;
    }
    const encrypted = encryptSensitiveObject(body.sensitive);
    res.json({ ok: true, encrypted });
  });

  app.post('/api/crypto/decrypt', requireVerifiedTelegramSession, (req: AuthenticatedRequest, res) => {
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
    console.log(`DRAGON x DMD server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
