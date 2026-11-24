import crypto from 'node:crypto';

export interface VerifiedTelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface SessionPayload {
  tgId: number;
  publicId: string;
  displayName: string;
  avatarUrl: string;
  iat: number;
  exp: number;
}

export interface EncryptedEnvelope {
  alg: 'AES-256-GCM';
  iv: string;
  tag: string;
  ciphertext: string;
}

export type ServerRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface ServerDragon {
  id: string;
  name: string;
  skin: string;
  rarity: ServerRarity;
  level: number;
  customLevel: number;
  skillLevel: number;
  trainingLevel: number;
  gear: string;
  sizeTier: 'NORMAL' | 'XL' | 'XXL';
}

export interface ServerPlayerState {
  publicId: string;
  tgIdHash: string;
  displayName: string;
  avatarUrl: string;
  corn: number;
  duckGold: number;
  stars: number;
  leaguePoints: number;
  allianceId: string | null;
  allianceRole: 'LEADER' | 'OFFICER' | 'MEMBER' | null;
  allianceTaxLv: number;
  allianceFuryLv: number;
  donationsToday: number;
  bossAttacksToday: number;
  lastDonationAt: number;
  dragons: ServerDragon[];
  updatedAt: number;
}

export interface TreasuryAuditEntry {
  id: string;
  allianceId: string;
  actorPublicId: string;
  actorName: string;
  action: 'DONATE' | 'BOSS_LOOT' | 'SUSPICIOUS_REJECTED';
  resource: 'CORN' | 'GOLD' | 'STARS';
  amountDelta: number;
  balanceBefore: number;
  balanceAfter: number;
  timestampIso: string;
  anomalyFlag: boolean;
  note: string;
  prevHash: string;
  entryHash: string;
}

export interface ServerAllianceState {
  id: string;
  packName: string;
  level: number;
  xp: number;
  power: number;
  treasuryCorn: number;
  vaultGold: number;
  techPointsPool: number;
  bossLevel: number;
  bossHp: number;
  bossMaxHp: number;
  memberPublicIds: string[];
  auditLogs: TreasuryAuditEntry[];
}

export interface ServerDonationTierSpec {
  id: 'SMALL_ENERGY' | 'MED_ENERGY' | 'GOLD_OFFERING';
  energyCost: number;
  goldCost: number;
  vaultCornGain: number;
  vaultGoldGain: number;
  techPointsGain: number;
  xpGain: number;
  powerGain: number;
}

export const SERVER_DONATION_TIERS: Record<string, ServerDonationTierSpec> = {
  SMALL_ENERGY: {
    id: 'SMALL_ENERGY',
    energyCost: 100,
    goldCost: 0,
    vaultCornGain: 100,
    vaultGoldGain: 0,
    techPointsGain: 45,
    xpGain: 120,
    powerGain: 5,
  },
  MED_ENERGY: {
    id: 'MED_ENERGY',
    energyCost: 500,
    goldCost: 0,
    vaultCornGain: 500,
    vaultGoldGain: 0,
    techPointsGain: 240,
    xpGain: 600,
    powerGain: 25,
  },
  GOLD_OFFERING: {
    id: 'GOLD_OFFERING',
    energyCost: 0,
    goldCost: 10,
    vaultCornGain: 400,
    vaultGoldGain: 10,
    techPointsGain: 420,
    xpGain: 900,
    powerGain: 40,
  },
};

const fallbackSessionSecret = crypto.randomBytes(32);
const fallbackDataKey = crypto.randomBytes(32);

function getSessionSecret(): Buffer {
  const envVal = process.env.SESSION_SECRET?.trim();
  if (envVal && envVal.length >= 16) {
    return crypto.createHash('sha256').update(envVal).digest();
  }
  return fallbackSessionSecret;
}

function getDataEncryptionKey(): Buffer {
  const envVal = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (envVal && envVal.length >= 16) {
    return crypto.createHash('sha256').update(envVal).digest();
  }
  return fallbackDataKey;
}

export function sanitizeDisplayName(raw: unknown, fallback = 'DRAGON_TAMER'): string {
  const cleaned = String(raw ?? '')
    .replace(/[<>&"'`/\\]/g, '')
    .trim()
    .slice(0, 32);
  return cleaned || fallback;
}

export function sanitizeAvatarUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 256) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Allow internal safe skin key fallback if not URL
    if (/^[a-z0-9_-]{1,24}$/i.test(trimmed)) return trimmed;
  }
  return '';
}

export function hashTelegramId(tgId: number | string): string {
  return crypto
    .createHmac('sha256', getDataEncryptionKey())
    .update(`tg:${String(tgId)}`)
    .digest('hex');
}

export function toPublicPlayerId(tgId: number | string): string {
  return `plyr_${hashTelegramId(tgId).slice(0, 20)}`;
}

export function encryptSensitiveObject(payload: unknown): EncryptedEnvelope {
  const iv = crypto.randomBytes(12);
  const key = getDataEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    alg: 'AES-256-GCM',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptSensitiveObject<T = unknown>(env: EncryptedEnvelope): T {
  if (!env || env.alg !== 'AES-256-GCM') {
    throw new Error('UNSUPPORTED_CIPHER');
  }
  const key = getDataEncryptionKey();
  const iv = Buffer.from(env.iv, 'base64');
  const tag = Buffer.from(env.tag, 'base64');
  const ct = Buffer.from(env.ciphertext, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  return JSON.parse(out) as T;
}

export function verifyTelegramInitDataStrict(
  initData: string,
  botToken: string,
  claimedTelegramId?: unknown,
  nowSec = Math.floor(Date.now() / 1000)
): {
  valid: boolean;
  user?: VerifiedTelegramUser;
  authDate?: number;
  startParam?: string;
  reason?: string;
} {
  if (!botToken || !botToken.trim()) {
    return { valid: false, reason: 'BOT_TOKEN_NOT_CONFIGURED' };
  }
  if (!initData || typeof initData !== 'string' || initData.length > 4096) {
    return { valid: false, reason: 'MISSING_OR_INVALID_INIT_DATA' };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    return { valid: false, reason: 'MISSING_OR_INVALID_HASH' };
  }

  const authDate = Number(params.get('auth_date') || 0);
  if (!Number.isFinite(authDate) || authDate <= 0 || nowSec - authDate > 86400 || authDate - nowSec > 60) {
    return { valid: false, reason: 'EXPIRED_OR_INVALID_AUTH_DATE' };
  }

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== 'hash') {
      pairs.push(`${key}=${value}`);
    }
  });
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken.trim()).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const actualBuf = Buffer.from(hash.toLowerCase(), 'utf8');
  const expectedBuf = Buffer.from(expectedHash.toLowerCase(), 'utf8');
  if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
    return { valid: false, reason: 'SIGNATURE_MISMATCH' };
  }

  const userRaw = params.get('user');
  if (!userRaw) {
    return { valid: false, reason: 'MISSING_SIGNED_USER' };
  }

  let parsedUser: VerifiedTelegramUser;
  try {
    const candidate = JSON.parse(userRaw) as VerifiedTelegramUser;
    if (
      !candidate ||
      typeof candidate.id !== 'number' ||
      !Number.isSafeInteger(candidate.id) ||
      candidate.id <= 0
    ) {
      return { valid: false, reason: 'INVALID_USER_ID' };
    }
    parsedUser = {
      id: candidate.id,
      first_name: typeof candidate.first_name === 'string' ? candidate.first_name.slice(0, 64) : undefined,
      last_name: typeof candidate.last_name === 'string' ? candidate.last_name.slice(0, 64) : undefined,
      username: typeof candidate.username === 'string' ? candidate.username.slice(0, 32) : undefined,
      photo_url: sanitizeAvatarUrl(candidate.photo_url) || undefined,
      language_code: typeof candidate.language_code === 'string' ? candidate.language_code.slice(0, 12) : undefined,
      is_premium: Boolean(candidate.is_premium),
    };
  } catch {
    return { valid: false, reason: 'MALFORMED_USER_JSON' };
  }

  if (claimedTelegramId !== undefined && claimedTelegramId !== null && String(claimedTelegramId).trim() !== '') {
    if (String(claimedTelegramId).trim() !== String(parsedUser.id)) {
      return { valid: false, reason: 'TELEGRAM_ID_MISMATCH' };
    }
  }

  return {
    valid: true,
    user: parsedUser,
    authDate,
    startParam: params.get('start_param')?.slice(0, 64),
  };
}

export function issueSignedSessionToken(user: VerifiedTelegramUser, ttlSec = 43200): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const displayName = sanitizeDisplayName(
    user.first_name || user.username || `TAMER_${String(user.id).slice(-4)}`
  );
  const payload: SessionPayload = {
    tgId: user.id,
    publicId: toPublicPlayerId(user.id),
    displayName,
    avatarUrl: sanitizeAvatarUrl(user.photo_url) || 'aqua',
    iat: nowSec,
    exp: nowSec + ttlSec,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySignedSessionToken(
  token: string,
  claimedTelegramId?: unknown
): { valid: boolean; session?: SessionPayload; reason?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'MISSING_SESSION_TOKEN' };
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'MALFORMED_SESSION_TOKEN' };
  }
  const [body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(body).digest('base64url');
  const actualBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
    return { valid: false, reason: 'INVALID_SESSION_SIGNATURE' };
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return { valid: false, reason: 'CORRUPT_SESSION_PAYLOAD' };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload || !Number.isSafeInteger(payload.tgId) || payload.exp < nowSec) {
    return { valid: false, reason: 'SESSION_EXPIRED' };
  }

  if (claimedTelegramId !== undefined && claimedTelegramId !== null && String(claimedTelegramId).trim() !== '') {
    if (String(claimedTelegramId).trim() !== String(payload.tgId)) {
      return { valid: false, reason: 'TELEGRAM_ID_MISMATCH' };
    }
  }

  return { valid: true, session: payload };
}

export interface RateLimitDecision {
  allowed: boolean;
  status: number;
  reason?: string;
  retryAfterSec?: number;
  bannedUntilMs?: number;
}

export class SecurityRateLimiter {
  private readonly maxPerMinute: number;
  private readonly floodBurstThreshold: number;
  private readonly floodWindowMs: number;
  private readonly banDurationMs: number;
  private readonly donationCooldownMs: number;

  private readonly minuteHits = new Map<string, number[]>();
  private readonly burstHits = new Map<string, number[]>();
  private readonly bans = new Map<string, number>();
  private readonly lastDonation = new Map<string, number>();

  constructor(opts?: {
    maxPerMinute?: number;
    floodBurstThreshold?: number;
    floodWindowMs?: number;
    banDurationMs?: number;
    donationCooldownMs?: number;
  }) {
    this.maxPerMinute = opts?.maxPerMinute ?? 20;
    this.floodBurstThreshold = opts?.floodBurstThreshold ?? 1000;
    this.floodWindowMs = opts?.floodWindowMs ?? 1000;
    this.banDurationMs = opts?.banDurationMs ?? 10 * 60 * 1000;
    this.donationCooldownMs = opts?.donationCooldownMs ?? 5000;
  }

  checkAndRecordRequest(key: string, nowMs = Date.now()): RateLimitDecision {
    const bannedUntil = this.bans.get(key) ?? 0;
    if (bannedUntil > nowMs) {
      return {
        allowed: false,
        status: 429,
        reason: 'TEMPORARILY_BANNED_10_MIN',
        retryAfterSec: Math.ceil((bannedUntil - nowMs) / 1000),
        bannedUntilMs: bannedUntil,
      };
    } else if (bannedUntil > 0) {
      this.bans.delete(key);
    }

    // Layer 4: 1-second flood detector (1000 req/sec -> 10 minute ban)
    const burstCutoff = nowMs - this.floodWindowMs;
    const prevBurst = (this.burstHits.get(key) ?? []).filter((t) => t > burstCutoff);
    prevBurst.push(nowMs);
    this.burstHits.set(key, prevBurst);

    if (prevBurst.length >= this.floodBurstThreshold) {
      const nextBanUntil = nowMs + this.banDurationMs;
      this.bans.set(key, nextBanUntil);
      this.burstHits.delete(key);
      return {
        allowed: false,
        status: 429,
        reason: 'TEMPORARILY_BANNED_10_MIN',
        retryAfterSec: Math.ceil(this.banDurationMs / 1000),
        bannedUntilMs: nextBanUntil,
      };
    }

    // Layer 4: 20 requests/minute sliding window
    const minuteCutoff = nowMs - 60000;
    const prevMinute = (this.minuteHits.get(key) ?? []).filter((t) => t > minuteCutoff);
    if (prevMinute.length >= this.maxPerMinute) {
      const oldest = prevMinute[0] ?? nowMs;
      return {
        allowed: false,
        status: 429,
        reason: 'RATE_LIMIT_20_PER_MIN',
        retryAfterSec: Math.max(1, Math.ceil((oldest + 60000 - nowMs) / 1000)),
      };
    }
    prevMinute.push(nowMs);
    this.minuteHits.set(key, prevMinute);

    return { allowed: true, status: 200 };
  }

  checkAndRecordDonation(actorKey: string, nowMs = Date.now()): RateLimitDecision {
    const prev = this.lastDonation.get(actorKey) ?? 0;
    const elapsed = nowMs - prev;
    if (elapsed < this.donationCooldownMs) {
      return {
        allowed: false,
        status: 429,
        reason: 'DONATION_COOLDOWN_5S',
        retryAfterSec: Math.max(1, Math.ceil((this.donationCooldownMs - elapsed) / 1000)),
      };
    }
    this.lastDonation.set(actorKey, nowMs);
    return { allowed: true, status: 200 };
  }

  isBanned(key: string, nowMs = Date.now()): boolean {
    return (this.bans.get(key) ?? 0) > nowMs;
  }
}

const RARITY_BASE_POWER: Record<ServerRarity, number> = {
  COMMON: 100,
  UNCOMMON: 210,
  RARE: 430,
  EPIC: 900,
  LEGENDARY: 1950,
};

const GEAR_POWER_BONUS: Record<string, number> = {
  none: 0,
  crown: 140,
  visor: 115,
  headphones: 130,
  halo: 185,
  cloak: 210,
};

export function recomputeDragonPower(dragon: ServerDragon): number {
  const base = RARITY_BASE_POWER[dragon.rarity] ?? 100;
  const level = Math.max(1, Math.min(5, Math.round(dragon.level || 1)));
  const custom = Math.max(0, Math.min(10, Math.round(dragon.customLevel || 0)));
  const skill = Math.max(1, Math.min(10, Math.round(dragon.skillLevel || 1)));
  const train = Math.max(0, Math.min(1000, Math.round(dragon.trainingLevel || 0)));
  const sizeMult = dragon.sizeTier === 'XXL' ? 1.35 : dragon.sizeTier === 'XL' ? 1.16 : 1;
  const gearBonus = GEAR_POWER_BONUS[dragon.gear] ?? 0;
  return Math.round((base * (1 + (level - 1) * 0.45 + custom * 0.14) + skill * 55 + train * 18 + gearBonus) * sizeMult);
}

export function recomputeTotalPlayerPower(player: ServerPlayerState, selectedDragonIds?: string[]): number {
  const pool =
    Array.isArray(selectedDragonIds) && selectedDragonIds.length > 0
      ? player.dragons.filter((d) => selectedDragonIds.includes(d.id))
      : player.dragons;
  const active = pool.length > 0 ? pool : player.dragons;
  const dragonSum = active.reduce((acc, d) => acc + recomputeDragonPower(d), 0);
  const talentBonus = Math.max(0, player.allianceFuryLv) * 95;
  return Math.max(100, dragonSum + talentBonus);
}

export function appendTreasuryAuditEntry(
  alliance: ServerAllianceState,
  params: {
    actorPublicId: string;
    actorName: string;
    action: TreasuryAuditEntry['action'];
    resource: TreasuryAuditEntry['resource'];
    amountDelta: number;
    balanceBefore: number;
    balanceAfter: number;
    anomalyFlag: boolean;
    note: string;
    nowMs?: number;
  }
): TreasuryAuditEntry {
  const prevHash =
    alliance.auditLogs.length > 0
      ? alliance.auditLogs[alliance.auditLogs.length - 1].entryHash
      : 'GENESIS_00000000';
  const timestampIso = new Date(params.nowMs ?? Date.now()).toISOString();
  const id = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const rawDigest = `${id}|${alliance.id}|${params.actorPublicId}|${params.action}|${params.resource}|${params.amountDelta}|${params.balanceBefore}|${params.balanceAfter}|${timestampIso}|${prevHash}`;
  const entryHash = crypto.createHash('sha256').update(rawDigest).digest('hex');

  const entry: TreasuryAuditEntry = {
    id,
    allianceId: alliance.id,
    actorPublicId: params.actorPublicId,
    actorName: sanitizeDisplayName(params.actorName),
    action: params.action,
    resource: params.resource,
    amountDelta: params.amountDelta,
    balanceBefore: params.balanceBefore,
    balanceAfter: params.balanceAfter,
    timestampIso,
    anomalyFlag: params.anomalyFlag,
    note: params.note.slice(0, 160),
    prevHash,
    entryHash,
  };
  alliance.auditLogs.push(entry);
  if (alliance.auditLogs.length > 200) {
    alliance.auditLogs = alliance.auditLogs.slice(-200);
  }
  return entry;
}

export function validateAndExecuteDonation(params: {
  player: ServerPlayerState;
  alliance: ServerAllianceState | undefined;
  allianceId: string;
  kind: string;
  requestedAmount: number;
  rateLimiter: SecurityRateLimiter;
  nowMs?: number;
}):
  | {
      ok: true;
      energySpent: number;
      goldSpent: number;
      vaultCornAdded: number;
      vaultGoldAdded: number;
      playerCornAfter: number;
      playerGoldAfter: number;
      allianceTreasuryAfter: number;
      auditEntry: TreasuryAuditEntry;
    }
  | { ok: false; status: number; reason: string; retryAfterSec?: number } {
  const nowMs = params.nowMs ?? Date.now();
  const { player, alliance, allianceId, kind, requestedAmount } = params;

  if (!alliance || player.allianceId !== allianceId || !alliance.memberPublicIds.includes(player.publicId)) {
    if (alliance) {
      appendTreasuryAuditEntry(alliance, {
        actorPublicId: player.publicId,
        actorName: player.displayName,
        action: 'SUSPICIOUS_REJECTED',
        resource: 'CORN',
        amountDelta: 0,
        balanceBefore: alliance.treasuryCorn,
        balanceAfter: alliance.treasuryCorn,
        anomalyFlag: true,
        note: `Blocked non-member donation attempt to ${allianceId}`,
        nowMs,
      });
    }
    return { ok: false, status: 403, reason: 'NOT_ALLIANCE_MEMBER' };
  }

  const tier = SERVER_DONATION_TIERS[kind];
  if (!tier) {
    return { ok: false, status: 400, reason: 'INVALID_DONATION_TIER' };
  }

  const expectedAmount = tier.energyCost > 0 ? tier.energyCost : tier.goldCost;
  if (!Number.isSafeInteger(requestedAmount) || requestedAmount <= 0 || requestedAmount !== expectedAmount) {
    appendTreasuryAuditEntry(alliance, {
      actorPublicId: player.publicId,
      actorName: player.displayName,
      action: 'SUSPICIOUS_REJECTED',
      resource: tier.energyCost > 0 ? 'CORN' : 'GOLD',
      amountDelta: 0,
      balanceBefore: alliance.treasuryCorn,
      balanceAfter: alliance.treasuryCorn,
      anomalyFlag: true,
      note: `Tampered donation amount rejected (${String(requestedAmount)} vs ${expectedAmount})`,
      nowMs,
    });
    return { ok: false, status: 400, reason: 'INVALID_OR_TAMPERED_AMOUNT' };
  }

  const cooldown = params.rateLimiter.checkAndRecordDonation(player.publicId, nowMs);
  if (!cooldown.allowed) {
    return {
      ok: false,
      status: cooldown.status,
      reason: cooldown.reason ?? 'DONATION_COOLDOWN_5S',
      retryAfterSec: cooldown.retryAfterSec,
    };
  }

  if (player.donationsToday >= 15) {
    return { ok: false, status: 400, reason: 'DAILY_DONATION_CAP_REACHED' };
  }

  if (player.corn < tier.energyCost || player.duckGold < tier.goldCost) {
    appendTreasuryAuditEntry(alliance, {
      actorPublicId: player.publicId,
      actorName: player.displayName,
      action: 'SUSPICIOUS_REJECTED',
      resource: tier.energyCost > 0 ? 'CORN' : 'GOLD',
      amountDelta: 0,
      balanceBefore: alliance.treasuryCorn,
      balanceAfter: alliance.treasuryCorn,
      anomalyFlag: true,
      note: `Insufficient funds rejected (has ${player.corn}⚡/${player.duckGold}💎)`,
      nowMs,
    });
    return { ok: false, status: 400, reason: 'INSUFFICIENT_FUNDS' };
  }

  // Server computes exact treasury delta (never accepts inflated client numbers)
  const taxLv = Math.max(0, Math.min(10, player.allianceTaxLv));
  const vaultCornAdded = Math.round(tier.vaultCornGain * (1 + taxLv * 0.05));
  const balanceBefore = alliance.treasuryCorn;
  const balanceAfter = balanceBefore + vaultCornAdded;

  player.corn -= tier.energyCost;
  player.duckGold -= tier.goldCost;
  player.donationsToday += 1;
  player.lastDonationAt = nowMs;
  player.updatedAt = nowMs;

  alliance.treasuryCorn = balanceAfter;
  alliance.vaultGold += tier.vaultGoldGain;
  alliance.techPointsPool += tier.techPointsGain;
  alliance.xp += tier.xpGain;
  alliance.power += tier.powerGain;

  const auditEntry = appendTreasuryAuditEntry(alliance, {
    actorPublicId: player.publicId,
    actorName: player.displayName,
    action: 'DONATE',
    resource: tier.energyCost > 0 ? 'CORN' : 'GOLD',
    amountDelta: vaultCornAdded,
    balanceBefore,
    balanceAfter,
    anomalyFlag: false,
    note: `Verified donation (${tier.id}): -${tier.energyCost}⚡/-${tier.goldCost}💎 -> +${vaultCornAdded}⚡`,
    nowMs,
  });

  return {
    ok: true,
    energySpent: tier.energyCost,
    goldSpent: tier.goldCost,
    vaultCornAdded,
    vaultGoldAdded: tier.vaultGoldGain,
    playerCornAfter: player.corn,
    playerGoldAfter: player.duckGold,
    allianceTreasuryAfter: alliance.treasuryCorn,
    auditEntry,
  };
}

export function validateAndResolveBattle(params: {
  player: ServerPlayerState;
  alliance?: ServerAllianceState;
  mode: 'ARENA' | 'ALLIANCE_BOSS';
  rivalPower: number;
  selectedDragonIds?: string[];
  clientClaimedPower?: number;
  nowMs?: number;
}): {
  ok: true;
  serverComputedPower: number;
  rivalPower: number;
  won: boolean;
  powerAnomalyDetected: boolean;
  rewardCorn: number;
  rewardStars: number;
  leaguePointsDelta: number;
  bossDamage: number;
  playerCornAfter: number;
  playerStarsAfter: number;
  leaguePointsAfter: number;
} {
  const nowMs = params.nowMs ?? Date.now();
  const { player, alliance, mode } = params;
  const serverComputedPower = recomputeTotalPlayerPower(player, params.selectedDragonIds);
  const boundedRivalPower = Math.max(100, Math.min(2000000, Math.round(params.rivalPower || 350)));

  const powerAnomalyDetected =
    typeof params.clientClaimedPower === 'number' &&
    Number.isFinite(params.clientClaimedPower) &&
    params.clientClaimedPower > serverComputedPower * 1.15;

  if (powerAnomalyDetected && alliance) {
    appendTreasuryAuditEntry(alliance, {
      actorPublicId: player.publicId,
      actorName: player.displayName,
      action: 'SUSPICIOUS_REJECTED',
      resource: 'CORN',
      amountDelta: 0,
      balanceBefore: alliance.treasuryCorn,
      balanceAfter: alliance.treasuryCorn,
      anomalyFlag: true,
      note: `Client claimed power ${Math.round(params.clientClaimedPower ?? 0)} ignored; server used ${serverComputedPower}`,
      nowMs,
    });
  }

  if (mode === 'ALLIANCE_BOSS' && alliance) {
    const damage = Math.max(420, Math.min(250000, Math.round(serverComputedPower * 0.95)));
    const isKill = alliance.bossHp - damage <= 0;
    if (isKill) {
      alliance.bossLevel += 1;
      alliance.bossMaxHp = 12500 + (alliance.bossLevel - 4) * 4500;
      alliance.bossHp = alliance.bossMaxHp;
    } else {
      alliance.bossHp = Math.max(1, alliance.bossHp - damage);
    }

    const rewardCorn = isKill ? 520 : 180;
    const rewardStars = isKill ? 4 : 0;
    const treasuryBefore = alliance.treasuryCorn;
    const treasuryLoot = isKill ? 1800 : 350;
    alliance.treasuryCorn += treasuryLoot;

    player.corn += rewardCorn;
    player.stars += rewardStars;
    player.bossAttacksToday += 1;
    player.updatedAt = nowMs;

    appendTreasuryAuditEntry(alliance, {
      actorPublicId: player.publicId,
      actorName: player.displayName,
      action: 'BOSS_LOOT',
      resource: 'CORN',
      amountDelta: treasuryLoot,
      balanceBefore: treasuryBefore,
      balanceAfter: alliance.treasuryCorn,
      anomalyFlag: powerAnomalyDetected,
      note: `Boss hit (${damage} dmg${isKill ? ', KILL' : ''}) using server power ${serverComputedPower}`,
      nowMs,
    });

    return {
      ok: true,
      serverComputedPower,
      rivalPower: alliance.bossMaxHp,
      won: isKill,
      powerAnomalyDetected,
      rewardCorn,
      rewardStars,
      leaguePointsDelta: 0,
      bossDamage: damage,
      playerCornAfter: player.corn,
      playerStarsAfter: player.stars,
      leaguePointsAfter: player.leaguePoints,
    };
  }

  // ARENA resolution strictly from serverComputedPower vs boundedRivalPower
  const won = serverComputedPower >= boundedRivalPower * 0.92;
  const rewardCorn = won ? Math.min(1800, 120 + Math.round(boundedRivalPower * 0.25)) : 25;
  const rewardStars = won ? 2 : 0;
  const leaguePointsDelta = won ? 25 : 5;

  player.corn += rewardCorn;
  player.stars += rewardStars;
  player.leaguePoints += leaguePointsDelta;
  player.updatedAt = nowMs;

  return {
    ok: true,
    serverComputedPower,
    rivalPower: boundedRivalPower,
    won,
    powerAnomalyDetected,
    rewardCorn,
    rewardStars,
    leaguePointsDelta,
    bossDamage: 0,
    playerCornAfter: player.corn,
    playerStarsAfter: player.stars,
    leaguePointsAfter: player.leaguePoints,
  };
}

export function toPublicLeaderboardRow(player: ServerPlayerState) {
  const lead = player.dragons[0];
  return {
    publicId: player.publicId,
    displayName: player.displayName,
    avatarUrl: player.avatarUrl || lead?.skin || 'aqua',
    powerRating: recomputeTotalPlayerPower(player),
    leaguePoints: player.leaguePoints,
    dragonCount: player.dragons.length,
    activeDragonName: lead?.name ?? 'تنين البداية',
    activeDragonSkin: lead?.skin ?? 'aqua',
    activeDragonRarity: lead?.rarity ?? 'COMMON',
    activeDragonLevel: lead?.level ?? 1,
  };
}
