import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  ALLIANCE_ROLE_WEIGHT,
  type DragonAuctionValuation,
  type ServerAllianceEmblemId,
  type ServerAllianceJoinConditions,
  type ServerAllianceRole,
  type ServerAllianceState,
  type ServerAllianceVisibility,
  type ServerDragon,
  type ServerPlayerState,
  type ServerRarity,
  type SessionPayload,
  computeDragonUpgradeValuation,
  hashTelegramId,
  recomputeTotalPlayerPower,
  sanitizeAvatarUrl,
  sanitizeDisplayName,
} from './security.ts';

export interface ServerAuctionRecord {
  id: string;
  sellerUid: string;
  sellerActorKey: string;
  sellerName: string;
  dragon: ServerDragon;
  rarity: ServerRarity;
  valuation: DragonAuctionValuation;
  startCornPrice: number;
  currentCornPrice: number;
  buyNowStars: number;
  highestBidderUid: string;
  highestBidderActorKey: string;
  highestBidderName: string;
  bidCount: number;
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'CLAIMED';
  winnerUid: string;
  settlementType: 'NONE' | 'BID' | 'BUY_NOW' | 'EXPIRED';
  sellerClaimed: boolean;
  buyerClaimed: boolean;
  endsAtMs: number;
  createdAtMs: number;
  cycleEndsAtMs: number;
  auctionPhase: 'DESCENDING' | 'BIDDING' | 'SOLD' | 'CANCELLED';
  lastPriceDirection: 'DOWN' | 'UP' | 'NONE';
}

export interface ServerCompetitionState {
  cycleId: string;
  cycleNumber: number;
  startedAt: number;
  endsAt: number;
  durationMs: number;
  activeEventIndex: number;
  eventEndsAt: number;
  eventDurationMs: number;
  scoresByPublicId: Record<string, { displayName: string; score: number; powerRating: number; updatedAt: number }>;
}

interface PersistedDatabaseSchema {
  version: number;
  players: Record<string, ServerPlayerState>;
  alliances: Record<string, ServerAllianceState>;
  auctions: Record<string, ServerAuctionRecord>;
  competition: ServerCompetitionState;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
let dbFilePath = process.env.DRAGON_DB_FILE
  ? path.resolve(process.env.DRAGON_DB_FILE)
  : path.join(DATA_DIR, 'game_db.json');
const COMPETITION_DURATION_MS = 24 * 60 * 60 * 1000;
const EVENT_DURATION_MS = 12 * 60 * 60 * 1000;
const TOTAL_WEEKEND_EVENTS = 4;

function createInitialCompetition(nowMs = Date.now()): ServerCompetitionState {
  return {
    cycleId: `comp_1_${nowMs}`,
    cycleNumber: 1,
    startedAt: nowMs,
    endsAt: nowMs + COMPETITION_DURATION_MS,
    durationMs: COMPETITION_DURATION_MS,
    activeEventIndex: 0,
    eventEndsAt: nowMs + EVENT_DURATION_MS,
    eventDurationMs: EVENT_DURATION_MS,
    scoresByPublicId: {},
  };
}

function createEmptyDb(nowMs = Date.now()): PersistedDatabaseSchema {
  return {
    version: 1,
    players: {},
    alliances: {},
    auctions: {},
    competition: createInitialCompetition(nowMs),
  };
}

let dbState: PersistedDatabaseSchema | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

export function configureDbFilePathForTests(customFilePath: string): void {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  dbState = null;
  dbFilePath = path.resolve(customFilePath);
}

export function clearPendingPersistTimerForTests(): void {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
}

function generateAllianceInviteCode(db: PersistedDatabaseSchema): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const bytes = crypto.randomBytes(6);
    let suffix = '';
    for (let i = 0; i < 6; i += 1) {
      suffix += alphabet[bytes[i] % alphabet.length];
    }
    const code = `DRG-${suffix}`;
    const conflict = Object.values(db.alliances).some(
      (a) => (a.inviteCode || '').toUpperCase() === code
    );
    if (!conflict) return code;
  }
  return `DRG-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function getDb(): PersistedDatabaseSchema {
  if (dbState) return dbState;
  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedDatabaseSchema>;
      dbState = {
        version: parsed.version ?? 1,
        players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {},
        alliances: parsed.alliances && typeof parsed.alliances === 'object' ? parsed.alliances : {},
        auctions: parsed.auctions && typeof parsed.auctions === 'object' ? parsed.auctions : {},
        competition: parsed.competition && typeof parsed.competition === 'object'
          ? parsed.competition
          : createInitialCompetition(),
      };
      for (const ally of Object.values(dbState.alliances)) {
        if (ally.visibility !== 'SECRET') {
          ally.visibility = 'PUBLIC';
        }
        if (!ally.inviteCode || typeof ally.inviteCode !== 'string') {
          ally.inviteCode = generateAllianceInviteCode(dbState);
        }
        if (!ally.memberRoles || typeof ally.memberRoles !== 'object') {
          ally.memberRoles = {};
        }
        if (ally.leaderPublicId) {
          ally.memberRoles[ally.leaderPublicId] = 'LEADER';
        }
      }
      return dbState;
    }
  } catch (err) {
    console.error('Failed to read game_db.json, initializing fresh database:', err);
  }
  dbState = createEmptyDb();
  persistDbNow();
  return dbState;
}

export function persistDbNow(): void {
  if (!dbState) return;
  try {
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpFile = `${dbFilePath}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(dbState), 'utf8');
    fs.renameSync(tmpFile, dbFilePath);
  } catch (err) {
    console.error('Failed to persist game_db.json:', err);
  }
}

export function schedulePersistDb(): void {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    persistDbNow();
  }, 150);
}



export function getOrSeedPlayer(session: SessionPayload): ServerPlayerState {
  const db = getDb();
  const nowMs = Date.now();
  const existing = db.players[session.actorKey];
  if (existing) {
    const incomingName = sanitizeDisplayName(session.displayName, '');
    const isGenericFallback =
      !incomingName || incomingName === 'AMF Player' || incomingName === 'DRAGON_TAMER' || /^TAMER_\d+$/.test(incomingName);
    if (incomingName && (!isGenericFallback || !existing.displayName)) {
      existing.displayName = incomingName;
    }
    if (session.avatarUrl && session.avatarUrl !== 'aqua') {
      existing.avatarUrl = sanitizeAvatarUrl(session.avatarUrl) || existing.avatarUrl;
    }
    existing.lastSeenAt = nowMs;
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
    powerRating: 100,
  };

  const created: ServerPlayerState = {
    actorKey: session.actorKey,
    publicId: session.publicId,
    tgIdHash: hashTelegramId(session.tgId),
    displayName: sanitizeDisplayName(session.displayName),
    avatarUrl: sanitizeAvatarUrl(session.avatarUrl) || 'aqua',
    corn: 500,
    duckGold: 15,
    stars: 10,
    amfTotal: 0,
    leaguePoints: 100,
    tournamentScore: 0,
    totalFeeds: 0,
    allianceId: null,
    allianceRole: null,
    allianceTaxLv: 0,
    allianceFuryLv: 0,
    donationsToday: 0,
    bossAttacksToday: 0,
    donatedEnergyTotal: 0,
    donatedTechTotal: 0,
    rallyScoreTotal: 0,
    dailyActivityPoints: 0,
    lastDonationAt: 0,
    lastSeenAt: nowMs,
    dragons: [starterDragon],
    updatedAt: nowMs,
  };

  db.players[session.actorKey] = created;
  persistDbNow();
  return created;
}



const VALID_RARITIES = new Set<ServerRarity>(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']);
const VALID_EMBLEMS = new Set<ServerAllianceEmblemId>([
  'dragon_shield',
  'royal_crown',
  'phoenix_wing',
  'sun_pyramid',
  'storm_fang',
  'eternal_flame',
  'obsidian_sword',
  'emerald_throne',
]);

export function sanitizeDragonList(raw: unknown): ServerDragon[] {
  if (!Array.isArray(raw)) return [];
  const out: ServerDragon[] = [];
  for (const item of raw.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue;
    const d = item as Record<string, unknown>;
    const rarity = VALID_RARITIES.has(d.rarity as ServerRarity) ? (d.rarity as ServerRarity) : 'COMMON';
    const sizeTier = d.sizeTier === 'XXL' ? 'XXL' : d.sizeTier === 'XL' ? 'XL' : 'NORMAL';
    const cleanDragon: ServerDragon = {
      id: String(d.id || `d_${out.length}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64),
      name: sanitizeDisplayName(d.name, 'تنين'),
      skin: typeof d.skin === 'string' ? d.skin.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'aqua' : 'aqua',
      rarity,
      level: Math.max(1, Math.min(5, Math.round(Number(d.level || 1)))),
      customLevel: Math.max(0, Math.min(10, Math.round(Number(d.customLevel || 0)))),
      skillLevel: Math.max(1, Math.min(10, Math.round(Number(d.skillLevel || 1)))),
      trainingLevel: Math.max(0, Math.min(1000, Math.round(Number(d.trainingLevel || 0)))),
      gear: typeof d.gear === 'string' ? d.gear.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'none' : 'none',
      aura: typeof d.aura === 'string' ? d.aura.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'auto' : 'auto',
      sizeTier,
    };
    out.push(cleanDragon);
  }
  return out;
}

export function syncPlayerFromClient(
  player: ServerPlayerState,
  body: Record<string, unknown>
): ServerCompetitionState {
  const db = getDb();
  const nowMs = Date.now();
  const comp = syncAndRolloverCompetition(nowMs);

  if (typeof body.username === 'string' && body.username.trim()) {
    player.displayName = sanitizeDisplayName(body.username, player.displayName);
  }
  const dragons = sanitizeDragonList(body.dragons);
  if (dragons.length > 0) {
    player.dragons = dragons;
  }
  if (typeof body.corn === 'number' && Number.isFinite(body.corn)) {
    // Allow organic progression sync up to reasonable non-tampered delta
    const maxCorn = Math.min(50_000_000, Math.max(250_000, player.corn + 250_000));
    player.corn = Math.max(0, Math.min(maxCorn, Math.round(body.corn)));
  }
  if (typeof body.stars === 'number' && Number.isFinite(body.stars)) {
    const maxStars = Math.min(2_000_000, Math.max(1000, player.stars + 500));
    player.stars = Math.max(0, Math.min(maxStars, Math.round(body.stars)));
  }
  if (typeof body.duckGold === 'number' && Number.isFinite(body.duckGold)) {
    player.duckGold = Math.max(0, Math.min(1_000_000, Math.round(body.duckGold)));
  }
  if (typeof body.dmdTotal === 'number' && Number.isFinite(body.dmdTotal)) {
    player.amfTotal = Math.max(0, Math.min(10_000_000, Number(body.dmdTotal.toFixed(2))));
  }
  if (typeof body.leaguePoints === 'number' && Number.isFinite(body.leaguePoints)) {
    player.leaguePoints = Math.max(0, Math.min(10_000_000, Math.round(body.leaguePoints)));
  }
  if (typeof body.totalFeeds === 'number' && Number.isFinite(body.totalFeeds)) {
    player.totalFeeds = Math.max(0, Math.min(10_000_000, Math.round(body.totalFeeds)));
  }
  if (typeof body.dailyActivityPoints === 'number' && Number.isFinite(body.dailyActivityPoints)) {
    player.dailyActivityPoints = Math.max(0, Math.min(100000, Math.round(body.dailyActivityPoints)));
  }
  if (typeof body.tournamentScore === 'number' && Number.isFinite(body.tournamentScore)) {
    const cleanScore = Math.max(0, Math.min(5_000_000, Math.round(body.tournamentScore)));
    player.tournamentScore = cleanScore;
    if (!body.tournamentCycleId || body.tournamentCycleId === comp.cycleId) {
      comp.scoresByPublicId[player.publicId] = {
        displayName: player.displayName,
        score: cleanScore,
        powerRating: recomputeTotalPlayerPower(player),
        updatedAt: nowMs,
      };
    }
  }

  player.lastSeenAt = nowMs;
  player.updatedAt = nowMs;

  if (player.allianceId && db.alliances[player.allianceId]) {
    recomputeAlliancePower(db.alliances[player.allianceId]);
  }

  schedulePersistDb();
  return comp;
}

export function syncAndRolloverCompetition(nowMs = Date.now()): ServerCompetitionState {
  const db = getDb();
  let comp = db.competition;
  let dirty = false;

  if (nowMs >= comp.endsAt) {
    const cyclesElapsed = Math.max(1, Math.floor((nowMs - comp.startedAt) / comp.durationMs));
    const nextStarted = comp.startedAt + cyclesElapsed * comp.durationMs;
    comp = {
      ...comp,
      cycleNumber: comp.cycleNumber + cyclesElapsed,
      cycleId: `comp_${comp.cycleNumber + cyclesElapsed}_${nextStarted}`,
      startedAt: nextStarted,
      endsAt: nextStarted + comp.durationMs,
      scoresByPublicId: {},
    };
    db.competition = comp;
    dirty = true;
  }

  if (nowMs >= comp.eventEndsAt) {
    const eventSteps = Math.max(1, Math.floor((nowMs - comp.eventEndsAt) / comp.eventDurationMs) + 1);
    comp.activeEventIndex = (comp.activeEventIndex + eventSteps) % TOTAL_WEEKEND_EVENTS;
    comp.eventEndsAt = comp.eventEndsAt + eventSteps * comp.eventDurationMs;
    dirty = true;
  }

  if (dirty) {
    schedulePersistDb();
  }
  return comp;
}

function recomputeAlliancePower(alliance: ServerAllianceState): void {
  const db = getDb();
  let totalPower = 0;
  const members = Object.values(db.players).filter((p) => p.allianceId === alliance.id);
  for (const m of members) {
    totalPower += recomputeTotalPlayerPower(m);
  }
  alliance.power = Math.max(totalPower, alliance.power || 0);
}

function formatClockHm(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function appendAllianceLogEntry(
  alliance: ServerAllianceState,
  type: ServerAllianceState['logs'][number]['type'],
  actor: string,
  message: string,
  nowMs = Date.now()
) {
  alliance.logs.unshift({
    id: `alog_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
    type,
    actor: sanitizeDisplayName(actor),
    message: message.slice(0, 220),
    time: formatClockHm(nowMs),
    timestamp: nowMs,
  });
  if (alliance.logs.length > 60) {
    alliance.logs = alliance.logs.slice(0, 60);
  }
}

export function getPublicAllianceDirectory(): Array<{
  id: string;
  packName: string;
  motto: string;
  emblemId: ServerAllianceEmblemId;
  visibility: ServerAllianceVisibility;
  leaderName: string;
  level: number;
  memberCount: number;
  onlineCount: number;
  maxMembers: number;
  power: number;
  treasuryCorn: number;
  bossLevel: number;
  joinConditions: ServerAllianceJoinConditions;
  createdAt: number;
}> {
  const db = getDb();
  const nowMs = Date.now();
  return Object.values(db.alliances)
    .filter((a) => (a.visibility ?? 'PUBLIC') === 'PUBLIC')
    .map((a) => {
      const members = Object.values(db.players).filter((p) => p.allianceId === a.id);
      const onlineCount = members.filter((m) => nowMs - m.lastSeenAt < 2 * 60 * 1000).length;
      return {
        id: a.id,
        packName: a.packName,
        motto: a.motto,
        emblemId: a.emblemId,
        visibility: 'PUBLIC' as const,
        leaderName: a.leaderName,
        level: a.level,
        memberCount: a.memberPublicIds.length,
        onlineCount,
        maxMembers: 20 + Math.max(0, a.level - 1) * 5,
        power: a.power,
        treasuryCorn: a.treasuryCorn,
        bossLevel: a.bossLevel,
        joinConditions: a.joinConditions,
        createdAt: a.createdAt,
      };
    })
    .sort((a, b) => b.power - a.power || b.memberCount - a.memberCount);
}

export function createRealAlliance(
  player: ServerPlayerState,
  params: {
    packName: string;
    motto?: string;
    emblemId?: string;
    visibility?: ServerAllianceVisibility;
    joinConditions?: Partial<ServerAllianceJoinConditions>;
  }
): { ok: true; alliance: ServerAllianceState } | { ok: false; status: number; reason: string } {
  const db = getDb();
  const nowMs = Date.now();
  if (player.allianceId && db.alliances[player.allianceId]) {
    return { ok: false, status: 400, reason: 'ALREADY_IN_ALLIANCE' };
  }

  const cleanName = String(params.packName || '')
    .replace(/[<>&"'`/\\]/g, '')
    .trim()
    .slice(0, 28);
  if (cleanName.length < 3) {
    return { ok: false, status: 400, reason: 'ALLIANCE_NAME_TOO_SHORT' };
  }

  const duplicate = Object.values(db.alliances).some(
    (a) => a.packName.toLowerCase() === cleanName.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, status: 409, reason: 'ALLIANCE_NAME_EXISTS' };
  }

  const emblemId = VALID_EMBLEMS.has(params.emblemId as ServerAllianceEmblemId)
    ? (params.emblemId as ServerAllianceEmblemId)
    : 'dragon_shield';
  const visibility: ServerAllianceVisibility = params.visibility === 'SECRET' ? 'SECRET' : 'PUBLIC';
  const inviteCode = generateAllianceInviteCode(db);
  const motto = String(params.motto || 'وحدة التنانين تفتح أبواب المجد وعرش AMF')
    .replace(/[<>&"'`/\\]/g, '')
    .trim()
    .slice(0, 72);

  const jc = params.joinConditions || {};
  const joinConditions: ServerAllianceJoinConditions = {
    minPower: Math.max(100, Math.min(500000, Math.round(Number(jc.minPower ?? 100)))),
    minDragons: Math.max(1, Math.min(20, Math.round(Number(jc.minDragons ?? 1)))),
    minDragonLevel: Math.max(1, Math.min(5, Math.round(Number(jc.minDragonLevel ?? 1)))),
    autoAccept: Boolean(jc.autoAccept ?? true),
  };

  const id = `ally_${nowMs.toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const playerPower = recomputeTotalPlayerPower(player);

  const alliance: ServerAllianceState = {
    id,
    packName: cleanName,
    motto: motto || 'وحدة التنانين تفتح أبواب المجد وعرش AMF',
    emblemId,
    visibility,
    inviteCode,
    leaderPublicId: player.publicId,
    leaderName: player.displayName,
    joinConditions,
    level: 1,
    xp: 0,
    power: playerPower,
    treasuryCorn: 0,
    vaultGold: 0,
    techPointsPool: 0,
    bossLevel: 1,
    bossHp: 5000,
    bossMaxHp: 5000,
    memberPublicIds: [player.publicId],
    memberRoles: { [player.publicId]: 'LEADER' },
    messages: [
      {
        id: `msg_${nowMs}`,
        senderPublicId: 'system',
        sender: 'النظام',
        text:
          visibility === 'SECRET'
            ? `تم تأسيس السرب السري "${cleanName}" بقيادة ${player.displayName}! رمز الدعوة: ${inviteCode}`
            : `تم تأسيس السرب "${cleanName}" بقيادة ${player.displayName}!`,
        time: formatClockHm(nowMs),
        createdAt: nowMs,
      },
    ],
    logs: [],
    auditLogs: [],
    createdAt: nowMs,
  };

  appendAllianceLogEntry(
    alliance,
    'JOIN',
    player.displayName,
    visibility === 'SECRET'
      ? `أسس سرباً سرياً "${cleanName}" وتولى القيادة (R5).`
      : `أسس تحالف "${cleanName}" وتولى القيادة (R5).`,
    nowMs
  );

  db.alliances[id] = alliance;
  player.allianceId = id;
  player.allianceRole = 'LEADER';
  player.updatedAt = nowMs;

  persistDbNow();
  return { ok: true, alliance };
}

export function joinRealAlliance(
  player: ServerPlayerState,
  allianceId: string,
  opts?: { inviteCode?: string }
): { ok: true; alliance: ServerAllianceState } | { ok: false; status: number; reason: string } {
  const db = getDb();
  const nowMs = Date.now();
  const cleanId = String(allianceId || '').trim();
  const normalizedCode = String(opts?.inviteCode || '')
    .trim()
    .toUpperCase();

  let alliance: ServerAllianceState | undefined = cleanId ? db.alliances[cleanId] : undefined;
  if (!alliance && normalizedCode) {
    alliance = Object.values(db.alliances).find(
      (a) => (a.inviteCode || '').trim().toUpperCase() === normalizedCode
    );
  }
  if (!alliance) {
    return {
      ok: false,
      status: 404,
      reason: normalizedCode ? 'INVALID_SECRET_INVITE_CODE' : 'ALLIANCE_NOT_FOUND',
    };
  }

  const alreadyMember = alliance.memberPublicIds.includes(player.publicId);
  if ((alliance.visibility ?? 'PUBLIC') === 'SECRET' && !alreadyMember) {
    const expectedCode = (alliance.inviteCode || '').trim().toUpperCase();
    if (!normalizedCode || normalizedCode !== expectedCode) {
      return { ok: false, status: 403, reason: 'INVALID_SECRET_INVITE_CODE' };
    }
  }

  if (player.allianceId && player.allianceId !== alliance.id && db.alliances[player.allianceId]) {
    return { ok: false, status: 400, reason: 'LEAVE_CURRENT_ALLIANCE_FIRST' };
  }

  const maxMembers = 20 + Math.max(0, alliance.level - 1) * 5;
  if (!alreadyMember && alliance.memberPublicIds.length >= maxMembers) {
    return { ok: false, status: 400, reason: 'ALLIANCE_FULL' };
  }

  const playerPower = recomputeTotalPlayerPower(player);
  const maxLv = player.dragons.reduce((mx, d) => Math.max(mx, d.level), 1);
  if (
    !alreadyMember &&
    (playerPower < alliance.joinConditions.minPower ||
      player.dragons.length < alliance.joinConditions.minDragons ||
      maxLv < alliance.joinConditions.minDragonLevel)
  ) {
    return { ok: false, status: 403, reason: 'JOIN_CONDITIONS_NOT_MET' };
  }

  if (!alreadyMember) {
    alliance.memberPublicIds.push(player.publicId);
    alliance.memberRoles[player.publicId] = 'MEMBER';
    appendAllianceLogEntry(
      alliance,
      'JOIN',
      player.displayName,
      normalizedCode ? `انضم إلى السرب عبر رمز الدعوة.` : `انضم إلى السرب ${alliance.packName}.`,
      nowMs
    );
  }
  player.allianceId = alliance.id;
  player.allianceRole = alliance.memberRoles[player.publicId] ?? 'MEMBER';
  player.updatedAt = nowMs;
  recomputeAlliancePower(alliance);

  persistDbNow();
  return { ok: true, alliance };
}

export function leaveRealAlliance(
  player: ServerPlayerState
): { ok: true } | { ok: false; status: number; reason: string } {
  const db = getDb();
  const nowMs = Date.now();
  if (!player.allianceId || !db.alliances[player.allianceId]) {
    player.allianceId = null;
    player.allianceRole = null;
    return { ok: true };
  }

  const alliance = db.alliances[player.allianceId];
  alliance.memberPublicIds = alliance.memberPublicIds.filter((id) => id !== player.publicId);
  delete alliance.memberRoles[player.publicId];
  player.allianceId = null;
  player.allianceRole = null;
  player.updatedAt = nowMs;

  if (alliance.memberPublicIds.length === 0) {
    delete db.alliances[alliance.id];
    persistDbNow();
    return { ok: true };
  }

  if (alliance.leaderPublicId === player.publicId) {
    const sortedSuccessors = [...alliance.memberPublicIds].sort((aId, bId) => {
      const aRole = alliance.memberRoles[aId] ?? 'MEMBER';
      const bRole = alliance.memberRoles[bId] ?? 'MEMBER';
      return ALLIANCE_ROLE_WEIGHT[bRole] - ALLIANCE_ROLE_WEIGHT[aRole];
    });
    const nextLeaderId = sortedSuccessors[0];
    const nextLeader = Object.values(db.players).find((p) => p.publicId === nextLeaderId);
    alliance.leaderPublicId = nextLeaderId;
    alliance.leaderName = nextLeader?.displayName ?? 'قائد جديد';
    alliance.memberRoles[nextLeaderId] = 'LEADER';
    if (nextLeader) nextLeader.allianceRole = 'LEADER';
    appendAllianceLogEntry(
      alliance,
      'ROLE',
      player.displayName,
      `غادر القيادة وتولى ${alliance.leaderName} قيادة السرب.`,
      nowMs
    );
  } else {
    appendAllianceLogEntry(alliance, 'JOIN', player.displayName, 'غادر السرب.', nowMs);
  }

  recomputeAlliancePower(alliance);
  persistDbNow();
  return { ok: true };
}

export function updateRealAllianceIdentity(
  player: ServerPlayerState,
  allianceId: string,
  patch: {
    packName?: string;
    motto?: string;
    emblemId?: string;
    visibility?: ServerAllianceVisibility;
    regenerateInviteCode?: boolean;
    joinConditions?: Partial<ServerAllianceJoinConditions>;
  }
): { ok: true; alliance: ServerAllianceState } | { ok: false; status: number; reason: string } {
  const db = getDb();
  const alliance = db.alliances[allianceId];
  if (!alliance || player.allianceId !== allianceId || !alliance.memberPublicIds.includes(player.publicId)) {
    return { ok: false, status: 403, reason: 'NOT_ALLIANCE_MEMBER' };
  }
  const role: ServerAllianceRole =
    alliance.memberRoles[player.publicId] ??
    (alliance.leaderPublicId === player.publicId ? 'LEADER' : 'MEMBER');

  const touchesLeaderOnlyFields =
    patch.packName !== undefined ||
    patch.motto !== undefined ||
    patch.emblemId !== undefined ||
    patch.visibility !== undefined ||
    Boolean(patch.regenerateInviteCode);

  if (touchesLeaderOnlyFields && role !== 'LEADER') {
    return { ok: false, status: 403, reason: 'LEADER_ONLY_ACTION' };
  }

  if (role !== 'LEADER' && role !== 'DEPUTY') {
    return { ok: false, status: 403, reason: 'INSUFFICIENT_ALLIANCE_RANK' };
  }

  if (typeof patch.packName === 'string') {
    const cleanNext = patch.packName.replace(/[<>&"'`/\\]/g, '').trim().slice(0, 28);
    if (cleanNext.length < 3) {
      return { ok: false, status: 400, reason: 'ALLIANCE_NAME_TOO_SHORT' };
    }
    const duplicate = Object.values(db.alliances).some(
      (a) => a.id !== alliance.id && a.packName.toLowerCase() === cleanNext.toLowerCase()
    );
    if (duplicate) {
      return { ok: false, status: 409, reason: 'ALLIANCE_NAME_EXISTS' };
    }
    alliance.packName = cleanNext;
  }
  if (typeof patch.motto === 'string' && patch.motto.trim()) {
    alliance.motto = patch.motto.replace(/[<>&"'`/\\]/g, '').trim().slice(0, 72);
  }
  if (patch.emblemId && VALID_EMBLEMS.has(patch.emblemId as ServerAllianceEmblemId)) {
    alliance.emblemId = patch.emblemId as ServerAllianceEmblemId;
  }
  if (patch.visibility === 'PUBLIC' || patch.visibility === 'SECRET') {
    alliance.visibility = patch.visibility;
  }
  if (patch.regenerateInviteCode) {
    alliance.inviteCode = generateAllianceInviteCode(db);
  }
  if (patch.joinConditions) {
    const jc = patch.joinConditions;
    alliance.joinConditions = {
      minPower: Math.max(100, Math.min(500000, Math.round(Number(jc.minPower ?? alliance.joinConditions.minPower)))),
      minDragons: Math.max(1, Math.min(20, Math.round(Number(jc.minDragons ?? alliance.joinConditions.minDragons)))),
      minDragonLevel: Math.max(1, Math.min(5, Math.round(Number(jc.minDragonLevel ?? alliance.joinConditions.minDragonLevel)))),
      autoAccept: Boolean(jc.autoAccept ?? alliance.joinConditions.autoAccept),
    };
  }
  appendAllianceLogEntry(
    alliance,
    'ROLE',
    player.displayName,
    touchesLeaderOnlyFields ? 'حدّث هوية وإعدادات السرب.' : 'حدّث شروط الانضمام للسرب.'
  );
  persistDbNow();
  return { ok: true, alliance };
}

export function manageRealAllianceMember(
  actor: ServerPlayerState,
  allianceId: string,
  targetPublicId: string,
  action: 'PROMOTE' | 'DEMOTE' | 'KICK' | 'TRANSFER_LEADERSHIP'
): { ok: true; alliance: ServerAllianceState } | { ok: false; status: number; reason: string } {
  const db = getDb();
  const alliance = db.alliances[allianceId];
  if (!alliance || actor.allianceId !== allianceId || !alliance.memberPublicIds.includes(actor.publicId)) {
    return { ok: false, status: 403, reason: 'NOT_ALLIANCE_MEMBER' };
  }
  const actorRole: ServerAllianceRole =
    alliance.memberRoles[actor.publicId] ??
    (alliance.leaderPublicId === actor.publicId ? 'LEADER' : 'MEMBER');
  if (actorRole !== 'LEADER' && actorRole !== 'DEPUTY') {
    return { ok: false, status: 403, reason: 'INSUFFICIENT_ALLIANCE_RANK' };
  }
  if (targetPublicId === actor.publicId || !alliance.memberPublicIds.includes(targetPublicId)) {
    return { ok: false, status: 400, reason: 'INVALID_TARGET_MEMBER' };
  }

  const targetPlayer = Object.values(db.players).find((p) => p.publicId === targetPublicId);
  const targetRole: ServerAllianceRole = alliance.memberRoles[targetPublicId] ?? 'MEMBER';
  if (targetRole === 'LEADER') {
    return { ok: false, status: 403, reason: 'CANNOT_MODIFY_LEADER' };
  }

  if (action === 'TRANSFER_LEADERSHIP') {
    if (actorRole !== 'LEADER') {
      return { ok: false, status: 403, reason: 'LEADER_ONLY_ACTION' };
    }
    alliance.memberRoles[actor.publicId] = 'DEPUTY';
    actor.allianceRole = 'DEPUTY';
    alliance.memberRoles[targetPublicId] = 'LEADER';
    if (targetPlayer) {
      targetPlayer.allianceRole = 'LEADER';
    }
    alliance.leaderPublicId = targetPublicId;
    alliance.leaderName = targetPlayer?.displayName ?? alliance.leaderName;
    appendAllianceLogEntry(
      alliance,
      'ROLE',
      actor.displayName,
      `نقل قيادة السرب (R5) إلى ${alliance.leaderName} وأصبح نائباً (R4).`
    );
    persistDbNow();
    return { ok: true, alliance };
  }

  if (ALLIANCE_ROLE_WEIGHT[actorRole] <= ALLIANCE_ROLE_WEIGHT[targetRole]) {
    return { ok: false, status: 403, reason: 'CANNOT_MANAGE_EQUAL_OR_HIGHER_RANK' };
  }

  if (action === 'KICK') {
    alliance.memberPublicIds = alliance.memberPublicIds.filter((id) => id !== targetPublicId);
    delete alliance.memberRoles[targetPublicId];
    if (targetPlayer) {
      targetPlayer.allianceId = null;
      targetPlayer.allianceRole = null;
    }
    appendAllianceLogEntry(
      alliance,
      'ROLE',
      actor.displayName,
      `طرد ${targetPlayer?.displayName ?? targetPublicId} من السرب.`
    );
    recomputeAlliancePower(alliance);
    persistDbNow();
    return { ok: true, alliance };
  }

  const ladder: ServerAllianceRole[] = ['MEMBER', 'ELITE', 'DEPUTY'];
  const idx = Math.max(0, ladder.indexOf(targetRole));
  const nextIdx = action === 'PROMOTE' ? Math.min(ladder.length - 1, idx + 1) : Math.max(0, idx - 1);
  const nextRole = ladder[nextIdx];

  if (nextRole === targetRole) {
    return { ok: false, status: 400, reason: 'RANK_BOUNDARY_REACHED' };
  }

  if (ALLIANCE_ROLE_WEIGHT[nextRole] >= ALLIANCE_ROLE_WEIGHT[actorRole]) {
    return { ok: false, status: 403, reason: 'INSUFFICIENT_ALLIANCE_RANK' };
  }

  alliance.memberRoles[targetPublicId] = nextRole;
  if (targetPlayer) {
    targetPlayer.allianceRole = nextRole;
  }
  appendAllianceLogEntry(
    alliance,
    'ROLE',
    actor.displayName,
    `${action === 'PROMOTE' ? 'رقّى' : 'خفّض'} ${targetPlayer?.displayName ?? targetPublicId} إلى رتبة ${nextRole}.`
  );
  persistDbNow();
  return { ok: true, alliance };
}

export function postRealAllianceChatMessage(
  player: ServerPlayerState,
  allianceId: string,
  rawText: string
): { ok: true; messages: ServerAllianceState['messages'] } | { ok: false; status: number; reason: string } {
  const db = getDb();
  const alliance = db.alliances[allianceId];
  if (!alliance || player.allianceId !== allianceId) {
    return { ok: false, status: 403, reason: 'NOT_ALLIANCE_MEMBER' };
  }
  const cleanText = String(rawText || '').replace(/[<>]/g, '').trim().slice(0, 260);
  if (!cleanText) {
    return { ok: false, status: 400, reason: 'EMPTY_MESSAGE' };
  }
  const nowMs = Date.now();
  alliance.messages.push({
    id: `msg_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
    senderPublicId: player.publicId,
    sender: player.displayName,
    text: cleanText,
    time: formatClockHm(nowMs),
    createdAt: nowMs,
  });
  if (alliance.messages.length > 50) {
    alliance.messages = alliance.messages.slice(-50);
  }
  schedulePersistDb();
  return { ok: true, messages: alliance.messages };
}

export function buildAllianceMemberStateResponse(alliance: ServerAllianceState) {
  const db = getDb();
  const nowMs = Date.now();
  const members = Object.values(db.players)
    .filter((p) => p.allianceId === alliance.id)
    .map((p) => {
      const role: ServerAllianceRole =
        alliance.memberRoles[p.publicId] ??
        (alliance.leaderPublicId === p.publicId ? 'LEADER' : p.allianceRole ?? 'MEMBER');
      const online = nowMs - p.lastSeenAt < 2 * 60 * 1000;
      const minsAgo = Math.max(1, Math.floor((nowMs - p.lastSeenAt) / 60000));
      return {
        publicId: p.publicId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        role,
        rank: role === 'LEADER' ? 'R5' : role === 'DEPUTY' ? 'R4' : role === 'ELITE' ? 'R3' : 'R1',
        powerRating: recomputeTotalPlayerPower(p),
        donatedEnergy: p.donatedEnergyTotal || 0,
        donatedTech: p.donatedTechTotal || 0,
        rallyScore: p.rallyScoreTotal || 0,
        dailyActivity: p.dailyActivityPoints || 0,
        online,
        lastSeenAr: online ? 'متصل الآن' : `منذ ${minsAgo} د`,
      };
    })
    .sort((a, b) => ALLIANCE_ROLE_WEIGHT[b.role] - ALLIANCE_ROLE_WEIGHT[a.role] || b.powerRating - a.powerRating);

  return {
    id: alliance.id,
    packName: alliance.packName,
    motto: alliance.motto,
    emblemId: alliance.emblemId,
    visibility: alliance.visibility ?? 'PUBLIC',
    inviteCode: alliance.inviteCode ?? '',
    leaderPublicId: alliance.leaderPublicId,
    leaderName: alliance.leaderName,
    joinConditions: alliance.joinConditions,
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
    messages: alliance.messages.slice(-40),
    logs: alliance.logs.slice(0, 40),
    auditLogs: alliance.auditLogs.slice(-40),
  };
}

// === REAL ONLINE DRAGON AUCTIONS (WITH UPGRADE-COST VALIDATION) ===

export function settleExpiredAuctions(nowMs = Date.now()): void {
  const db = getDb();
  let changed = false;
  for (const auc of Object.values(db.auctions)) {
    if (auc.status !== 'ACTIVE') continue;

    // Ensure 30s cycle window is initialized
    if (!auc.cycleEndsAtMs) {
      auc.cycleEndsAtMs = auc.createdAtMs + 30000;
      auc.auctionPhase = auc.bidCount > 0 ? 'BIDDING' : 'DESCENDING';
      auc.lastPriceDirection = 'NONE';
      changed = true;
    }

    if (auc.bidCount === 0) {
      // Phase 1: No bids yet (Dutch stage) - 30 seconds timer
      // If 30 seconds elapse without a buyer, price decreases slightly
      if (nowMs >= auc.cycleEndsAtMs) {
        const cyclesPassed = Math.floor((nowMs - auc.cycleEndsAtMs) / 30000) + 1;
        const minFloor = auc.valuation?.minStartCorn || Math.round(auc.startCornPrice * 0.4);

        let newPrice = auc.currentCornPrice;
        for (let i = 0; i < cyclesPassed; i += 1) {
          const dropAmount = Math.max(25, Math.round(newPrice * 0.05));
          newPrice = Math.max(minFloor, newPrice - dropAmount);
        }

        auc.currentCornPrice = newPrice;
        auc.lastPriceDirection = 'DOWN';
        auc.auctionPhase = 'DESCENDING';
        auc.cycleEndsAtMs += cyclesPassed * 30000;
        changed = true;

        // If total overall auction lifetime has elapsed and reached floor
        if (nowMs >= auc.endsAtMs && auc.currentCornPrice <= minFloor) {
          auc.status = 'CANCELLED';
          auc.settlementType = 'EXPIRED';
          auc.auctionPhase = 'CANCELLED';
        }
      }
    } else {
      // Phase 2: Bids active! 30 seconds timer
      // If 30 seconds pass without anyone outbidding, dragon transfers to the winning buyer!
      if (nowMs >= auc.cycleEndsAtMs) {
        auc.status = 'SOLD';
        auc.winnerUid = auc.highestBidderUid;
        auc.settlementType = 'BID';
        auc.auctionPhase = 'SOLD';
        changed = true;
      }
    }
  }
  if (changed) schedulePersistDb();
}

export function listPublicAuctions(nowMs = Date.now()) {
  settleExpiredAuctions(nowMs);
  const db = getDb();
  return Object.values(db.auctions)
    .filter((a) => a.status === 'ACTIVE' || a.status === 'SOLD' || (a.status === 'CANCELLED' && !a.sellerClaimed))
    .map(({ sellerActorKey: _sak, highestBidderActorKey: _hak, ...pub }) => pub)
    .sort((a, b) => a.endsAtMs - b.endsAtMs);
}

export function createRealAuction(
  player: ServerPlayerState,
  params: {
    dragon: ServerDragon;
    startCornPrice: number;
    buyNowStars: number;
    durationMinutes: number;
  }
): { ok: true; auction: Omit<ServerAuctionRecord, 'sellerActorKey' | 'highestBidderActorKey'>; listingFee: number } | { ok: false; status: number; reason: string } {
  const db = getDb();
  const nowMs = Date.now();
  const [cleanDragon] = sanitizeDragonList([params.dragon]);
  if (!cleanDragon) {
    return { ok: false, status: 400, reason: 'INVALID_DRAGON_DATA' };
  }

  const valuation = computeDragonUpgradeValuation(cleanDragon);
  // Automatic market valuation calculation
  const startPrice = Math.max(
    valuation.minStartCorn,
    Math.min(valuation.maxStartCorn, Math.round(Number(params.startCornPrice || valuation.suggestedStartCorn)))
  );
  const buyNowStars = Math.max(
    valuation.minBuyNowStars,
    Math.min(valuation.maxBuyNowStars, Math.round(Number(params.buyNowStars || valuation.suggestedBuyNowStars)))
  );
  // Nominal fee (zero if low balance) so players are never blocked from selling
  const listingFee = Math.min(player.corn, Math.max(0, Math.round(startPrice * 0.02)));
  const durationMinutes = Math.max(5, Math.min(240, Math.round(Number(params.durationMinutes || 60))));

  const activeCount = Object.values(db.auctions).filter(
    (a) => a.sellerActorKey === player.actorKey && a.status === 'ACTIVE'
  ).length;
  if (activeCount >= 5) {
    return { ok: false, status: 400, reason: 'MAX_ACTIVE_AUCTIONS_5' };
  }

  const id = `auc_${nowMs.toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  const rec: ServerAuctionRecord = {
    id,
    sellerUid: player.publicId,
    sellerActorKey: player.actorKey,
    sellerName: player.displayName,
    dragon: cleanDragon,
    rarity: cleanDragon.rarity,
    valuation,
    startCornPrice: startPrice,
    currentCornPrice: startPrice,
    buyNowStars,
    highestBidderUid: '',
    highestBidderActorKey: '',
    highestBidderName: '',
    bidCount: 0,
    status: 'ACTIVE',
    winnerUid: '',
    settlementType: 'NONE',
    sellerClaimed: false,
    buyerClaimed: false,
    endsAtMs: nowMs + durationMinutes * 60 * 1000,
    createdAtMs: nowMs,
    cycleEndsAtMs: nowMs + 30000,
    auctionPhase: 'DESCENDING',
    lastPriceDirection: 'NONE',
  };

  db.auctions[id] = rec;
  persistDbNow();
  const { sellerActorKey: _sak, highestBidderActorKey: _hak, ...pub } = rec;
  return { ok: true, auction: pub, listingFee };
}

export function bidOnRealAuction(
  player: ServerPlayerState,
  auctionId: string
): { ok: true; acceptedPrice: number; endsAtMs: number; cycleEndsAtMs: number } | { ok: false; status: number; reason: string } {
  const nowMs = Date.now();
  settleExpiredAuctions(nowMs);
  const db = getDb();
  const auc = db.auctions[auctionId];
  if (!auc) return { ok: false, status: 404, reason: 'AUCTION_NOT_FOUND' };
  if (auc.status !== 'ACTIVE' || (auc.bidCount > 0 && nowMs >= auc.cycleEndsAtMs)) {
    return { ok: false, status: 400, reason: 'AUCTION_NOT_ACTIVE' };
  }
  if (auc.sellerUid === player.publicId) {
    return { ok: false, status: 400, reason: 'CANNOT_BID_OWN' };
  }
  if (auc.highestBidderUid === player.publicId) {
    return { ok: false, status: 400, reason: 'ALREADY_HIGHEST_BIDDER' };
  }

  const acceptedPrice = auc.currentCornPrice;

  // Refund previous highest bidder escrow inside server record
  if (auc.bidCount > 0 && auc.highestBidderActorKey && db.players[auc.highestBidderActorKey]) {
    db.players[auc.highestBidderActorKey].corn += acceptedPrice;
  }

  // Raise price for next bidder by 5% (min 50)
  const priceBump = Math.max(50, Math.round(acceptedPrice * 0.05));
  auc.currentCornPrice = acceptedPrice + priceBump;
  auc.highestBidderUid = player.publicId;
  auc.highestBidderActorKey = player.actorKey;
  auc.highestBidderName = player.displayName;
  auc.bidCount += 1;
  auc.auctionPhase = 'BIDDING';
  auc.lastPriceDirection = 'UP';
  // Reset 30s timer for new bids!
  auc.cycleEndsAtMs = nowMs + 30000;
  auc.endsAtMs = Math.max(auc.endsAtMs, auc.cycleEndsAtMs);

  persistDbNow();
  return { ok: true, acceptedPrice, endsAtMs: auc.endsAtMs, cycleEndsAtMs: auc.cycleEndsAtMs };
}

export function buyNowRealAuction(
  player: ServerPlayerState,
  auctionId: string
): { ok: true; dragon: ServerDragon; buyNowStars: number } | { ok: false; status: number; reason: string } {
  const nowMs = Date.now();
  settleExpiredAuctions(nowMs);
  const db = getDb();
  const auc = db.auctions[auctionId];
  if (!auc) return { ok: false, status: 404, reason: 'AUCTION_NOT_FOUND' };
  if (auc.status !== 'ACTIVE') return { ok: false, status: 400, reason: 'AUCTION_NOT_ACTIVE' };
  if (auc.sellerUid === player.publicId) return { ok: false, status: 400, reason: 'CANNOT_BUY_OWN' };

  if (auc.bidCount > 0 && auc.highestBidderActorKey && db.players[auc.highestBidderActorKey]) {
    db.players[auc.highestBidderActorKey].corn += auc.currentCornPrice;
  }

  auc.status = 'SOLD';
  auc.winnerUid = player.publicId;
  auc.highestBidderUid = player.publicId;
  auc.highestBidderActorKey = player.actorKey;
  auc.highestBidderName = player.displayName;
  auc.settlementType = 'BUY_NOW';
  auc.buyerClaimed = true;

  persistDbNow();
  return { ok: true, dragon: auc.dragon, buyNowStars: auc.buyNowStars };
}

export function cancelRealAuction(
  player: ServerPlayerState,
  auctionId: string
): { ok: true; dragon: ServerDragon } | { ok: false; status: number; reason: string } {
  const nowMs = Date.now();
  settleExpiredAuctions(nowMs);
  const db = getDb();
  const auc = db.auctions[auctionId];
  if (!auc) return { ok: false, status: 404, reason: 'AUCTION_NOT_FOUND' };
  if (auc.sellerUid !== player.publicId) return { ok: false, status: 403, reason: 'NOT_SELLER' };
  if (auc.bidCount > 0 || auc.status === 'SOLD') {
    return { ok: false, status: 400, reason: 'AUCTION_HAS_BIDS' };
  }

  auc.status = 'CANCELLED';
  auc.settlementType = 'EXPIRED';
  auc.sellerClaimed = true;
  persistDbNow();
  return { ok: true, dragon: auc.dragon };
}

export function claimBuyerRealAuction(
  player: ServerPlayerState,
  auctionId: string
): { ok: true; dragon: ServerDragon } | { ok: false; status: number; reason: string } {
  const nowMs = Date.now();
  settleExpiredAuctions(nowMs);
  const db = getDb();
  const auc = db.auctions[auctionId];
  if (!auc) return { ok: false, status: 404, reason: 'AUCTION_NOT_FOUND' };
  if (auc.buyerClaimed || auc.highestBidderUid !== player.publicId || auc.status !== 'SOLD') {
    return { ok: false, status: 400, reason: 'CANNOT_CLAIM_DRAGON' };
  }

  auc.buyerClaimed = true;
  auc.winnerUid = player.publicId;
  if (auc.sellerClaimed) auc.status = 'CLAIMED';
  persistDbNow();
  return { ok: true, dragon: auc.dragon };
}

export function claimSellerRealAuction(
  player: ServerPlayerState,
  auctionId: string
): {
  ok: true;
  settlementType: 'BID' | 'BUY_NOW';
  netCorn: number;
  netStars: number;
  taxBurned: number;
} | { ok: false; status: number; reason: string } {
  const nowMs = Date.now();
  settleExpiredAuctions(nowMs);
  const db = getDb();
  const auc = db.auctions[auctionId];
  if (!auc) return { ok: false, status: 404, reason: 'AUCTION_NOT_FOUND' };
  if (auc.sellerUid !== player.publicId || auc.sellerClaimed || auc.status !== 'SOLD') {
    return { ok: false, status: 400, reason: 'CANNOT_CLAIM_PROCEEDS' };
  }

  const isBuyNow = auc.settlementType === 'BUY_NOW';
  const grossCorn = isBuyNow ? 0 : auc.currentCornPrice;
  const grossStars = isBuyNow ? auc.buyNowStars : 0;
  const cornTax = Math.floor(grossCorn * 0.08);
  const starTax = Math.floor(grossStars * 0.08);

  auc.sellerClaimed = true;
  if (auc.buyerClaimed) auc.status = 'CLAIMED';
  persistDbNow();

  return {
    ok: true,
    settlementType: isBuyNow ? 'BUY_NOW' : 'BID',
    netCorn: grossCorn > 0 ? Math.max(1, grossCorn - cornTax) : 0,
    netStars: grossStars > 0 ? Math.max(1, grossStars - starTax) : 0,
    taxBurned: cornTax + starTax,
  };
}
