export interface EncryptedSensitiveMap {
  alg: 'AES-256-GCM';
  iv: string;
  ciphertext: string;
}

// Held strictly in JS memory (never localStorage/sessionStorage)
let memorySessionToken: string | null = null;
let memoryPublicPlayerId: string | null = null;
let memoryTelegramIdHash: string | null = null;

export function setVerifiedSessionAuth(params: {
  token: string;
  publicId?: string;
  telegramIdHash?: string;
} | null): void {
  if (!params) {
    memorySessionToken = null;
    memoryPublicPlayerId = null;
    memoryTelegramIdHash = null;
    return;
  }
  memorySessionToken = params.token;
  memoryPublicPlayerId = params.publicId ?? null;
  memoryTelegramIdHash = params.telegramIdHash ?? null;
}

export function getVerifiedSessionToken(): string | null {
  return memorySessionToken;
}

export function getVerifiedPublicPlayerId(): string | null {
  return memoryPublicPlayerId;
}

export function getVerifiedTelegramIdHash(): string | null {
  return memoryTelegramIdHash;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export async function sha256Hex(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuf);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function deriveOwnerAesKey(uid: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(`dragon-dmd-vault-v1:${uid}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(`uid-salt:${uid}`),
      iterations: 60000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSensitiveForFirestore(
  uid: string,
  sensitiveObj: Record<string, unknown>
): Promise<EncryptedSensitiveMap> {
  const key = await deriveOwnerAesKey(uid);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(sensitiveObj));
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    alg: 'AES-256-GCM',
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipherBuf)),
  };
}

export async function decryptSensitiveFromFirestore<T = Record<string, unknown>>(
  uid: string,
  env: Partial<EncryptedSensitiveMap> | null | undefined
): Promise<T | null> {
  if (!env || env.alg !== 'AES-256-GCM' || !env.iv || !env.ciphertext) return null;
  try {
    const key = await deriveOwnerAesKey(uid);
    const iv = base64ToBytes(env.iv);
    const ct = base64ToBytes(env.ciphertext);
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(ct)
    );
    const json = new TextDecoder().decode(plainBuf);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export async function postVerifiedDonate(params: {
  allianceId: string;
  kind: 'SMALL_ENERGY' | 'MED_ENERGY' | 'GOLD_OFFERING';
  amount: number;
}): Promise<{ ok: boolean; reason?: string; status?: number; vaultCornAdded?: number }> {
  const token = memorySessionToken;
  if (!token) return { ok: false, reason: 'NO_VERIFIED_SESSION' };
  try {
    const res = await fetch('/api/alliance/donate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const data = (await res.json()) as { ok?: boolean; reason?: string; vaultCornAdded?: number };
    return {
      ok: Boolean(res.ok && data.ok),
      reason: data.reason,
      status: res.status,
      vaultCornAdded: data.vaultCornAdded,
    };
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
}

export async function postVerifiedBattleResolve(params: {
  mode: 'ARENA' | 'ALLIANCE_BOSS';
  rivalPower: number;
  dragonIds?: string[];
  clientClaimedPower?: number;
}): Promise<{
  ok: boolean;
  serverComputedPower?: number;
  won?: boolean;
  powerAnomalyDetected?: boolean;
  rewardCorn?: number;
  rewardStars?: number;
}> {
  const token = memorySessionToken;
  if (!token) return { ok: false };
  try {
    const res = await fetch('/api/battle/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) return { ok: false };
    return (await res.json()) as {
      ok: boolean;
      serverComputedPower?: number;
      won?: boolean;
      powerAnomalyDetected?: boolean;
      rewardCorn?: number;
      rewardStars?: number;
    };
  } catch {
    return { ok: false };
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (memorySessionToken) {
    headers.Authorization = `Bearer ${memorySessionToken}`;
  }
  return headers;
}

export interface ClientServerReceipt {
  commandType: string;
  playerPublicId: string;
  cornDelta: number;
  starsDelta: number;
  goldDelta: number;
  playerCornAfter: number;
  playerStarsAfter: number;
  playerGoldAfter: number;
  leaguePointsAfter: number;
  message: string;
  verifiedAtMs: number;
}

export async function apiDispatchServerAction<TData = Record<string, unknown>>(
  command: Record<string, unknown> & { type: string }
): Promise<{
  ok: boolean;
  status?: number;
  reason?: string;
  retryAfterSec?: number;
  receipt?: ClientServerReceipt;
  data?: TData;
}> {
  if (!memorySessionToken) return { ok: false, status: 401, reason: 'NO_SESSION' };
  try {
    const res = await fetch('/api/action', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(command),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      reason?: string;
      retryAfterSec?: number;
      receipt?: ClientServerReceipt;
      data?: TData;
    };
    return {
      ok: Boolean(res.ok && body.ok),
      status: res.status,
      reason: body.reason,
      retryAfterSec: body.retryAfterSec,
      receipt: body.receipt,
      data: body.data,
    };
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
}

export async function apiSyncPlayerState(payload: {
  username: string;
  corn: number;
  stars: number;
  duckGold: number;
  dmdTotal: number;
  leaguePoints: number;
  totalFeeds: number;
  dailyActivityPoints: number;
  tournamentScore: number;
  tournamentCycleId?: string;
  dragons: Array<{
    id: string;
    name: string;
    skin: string;
    rarity: string;
    level: number;
    customLevel: number;
    skillLevel: number;
    trainingLevel: number;
    gear: string;
    aura?: string;
    sizeTier: 'NORMAL' | 'XL' | 'XXL';
  }>;
}): Promise<{
  ok: boolean;
  publicId?: string;
  myAlliance?: Record<string, unknown> | null;
  alliances?: unknown[];
  auctions?: unknown[];
  leaderboard?: unknown[];
  competition?: Record<string, unknown>;
}> {
  if (!memorySessionToken) return { ok: false };
  try {
    const res = await fetch('/api/player/sync', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false };
    return (await res.json()) as {
      ok: boolean;
      publicId?: string;
      myAlliance?: Record<string, unknown> | null;
      alliances?: unknown[];
      auctions?: unknown[];
      leaderboard?: unknown[];
      competition?: Record<string, unknown>;
    };
  } catch {
    return { ok: false };
  }
}

export async function apiFetchPublicSnapshot(): Promise<{
  alliances: unknown[];
  auctions: unknown[];
  leaderboard: unknown[];
  competition: Record<string, unknown> | null;
}> {
  try {
    const [aRes, mRes, lRes, cRes] = await Promise.all([
      fetch('/api/alliances'),
      fetch('/api/auctions'),
      fetch('/api/leaderboard'),
      fetch('/api/competitions/current'),
    ]);
    const [aData, mData, lData, cData] = await Promise.all([
      aRes.ok ? aRes.json() : { alliances: [] },
      mRes.ok ? mRes.json() : { auctions: [] },
      lRes.ok ? lRes.json() : { players: [] },
      cRes.ok ? cRes.json() : null,
    ]);
    return {
      alliances: Array.isArray(aData?.alliances) ? aData.alliances : [],
      auctions: Array.isArray(mData?.auctions) ? mData.auctions : [],
      leaderboard: Array.isArray(lData?.players) ? lData.players : [],
      competition: cData && cData.ok ? cData : null,
    };
  } catch {
    return { alliances: [], auctions: [], leaderboard: [], competition: null };
  }
}

export async function apiCreateAlliance(params: {
  packName: string;
  motto?: string;
  emblemId?: string;
  visibility?: 'PUBLIC' | 'SECRET';
  joinConditions?: {
    minPower: number;
    minDragons: number;
    minDragonLevel: number;
    autoAccept: boolean;
  };
}): Promise<{ ok: boolean; alliance?: Record<string, unknown>; alliances?: unknown[]; reason?: string }> {
  if (!memorySessionToken) return { ok: false, reason: 'NO_SESSION' };
  try {
    const res = await fetch('/api/alliances/create', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
    return (await res.json()) as {
      ok: boolean;
      alliance?: Record<string, unknown>;
      alliances?: unknown[];
      reason?: string;
    };
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
}

export async function apiJoinAlliance(
  allianceId: string,
  inviteCode?: string
): Promise<{
  ok: boolean;
  alliance?: Record<string, unknown>;
  alliances?: unknown[];
  reason?: string;
}> {
  if (!memorySessionToken) return { ok: false, reason: 'NO_SESSION' };
  try {
    const res = await fetch(`/api/alliances/${encodeURIComponent(allianceId)}/join`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(inviteCode ? { inviteCode } : {}),
    });
    return (await res.json()) as {
      ok: boolean;
      alliance?: Record<string, unknown>;
      alliances?: unknown[];
      reason?: string;
    };
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
}

export async function apiJoinAllianceByCode(inviteCode: string): Promise<{
  ok: boolean;
  alliance?: Record<string, unknown>;
  alliances?: unknown[];
  reason?: string;
}> {
  if (!memorySessionToken) return { ok: false, reason: 'NO_SESSION' };
  try {
    const res = await fetch('/api/alliances/join-code', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ inviteCode }),
    });
    return (await res.json()) as {
      ok: boolean;
      alliance?: Record<string, unknown>;
      alliances?: unknown[];
      reason?: string;
    };
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
}

export async function apiLeaveAlliance(): Promise<{ ok: boolean; alliances?: unknown[]; reason?: string }> {
  if (!memorySessionToken) return { ok: false, reason: 'NO_SESSION' };
  try {
    const res = await fetch('/api/alliances/leave', {
      method: 'POST',
      headers: authHeaders(),
    });
    return (await res.json()) as { ok: boolean; alliances?: unknown[]; reason?: string };
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
}

export async function apiUpdateAllianceIdentity(
  allianceId: string,
  patch: {
    packName?: string;
    motto?: string;
    emblemId?: string;
    visibility?: 'PUBLIC' | 'SECRET';
    regenerateInviteCode?: boolean;
    joinConditions?: {
      minPower: number;
      minDragons: number;
      minDragonLevel: number;
      autoAccept: boolean;
    };
  }
): Promise<{ ok: boolean; alliance?: Record<string, unknown>; alliances?: unknown[]; reason?: string }> {
  if (!memorySessionToken) return { ok: false, reason: 'NO_SESSION' };
  try {
    const res = await fetch(`/api/alliances/${encodeURIComponent(allianceId)}/identity`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    return (await res.json()) as {
      ok: boolean;
      alliance?: Record<string, unknown>;
      alliances?: unknown[];
      reason?: string;
    };
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
}

export async function apiManageAllianceMember(
  allianceId: string,
  targetPublicId: string,
  action: 'PROMOTE' | 'DEMOTE' | 'KICK' | 'TRANSFER_LEADERSHIP'
): Promise<{ ok: boolean; alliance?: Record<string, unknown>; alliances?: unknown[]; reason?: string }> {
  if (!memorySessionToken) return { ok: false, reason: 'NO_SESSION' };
  try {
    const res = await fetch(`/api/alliances/${encodeURIComponent(allianceId)}/member`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ targetPublicId, action }),
    });
    return (await res.json()) as {
      ok: boolean;
      alliance?: Record<string, unknown>;
      alliances?: unknown[];
      reason?: string;
    };
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
}

export async function apiSendAllianceChatMessage(
  allianceId: string,
  text: string
): Promise<{ ok: boolean; messages?: unknown[]; reason?: string }> {
  if (!memorySessionToken) return { ok: false, reason: 'NO_SESSION' };
  try {
    const res = await fetch(`/api/alliances/${encodeURIComponent(allianceId)}/message`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text }),
    });
    return (await res.json()) as { ok: boolean; messages?: unknown[]; reason?: string };
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
}

export async function apiListDragonAuction(params: {
  dragon: Record<string, unknown>;
  startCornPrice: number;
  buyNowStars: number;
  durationMinutes: number;
}): Promise<{ ok: boolean; auction?: Record<string, unknown>; listingFee?: number; reason?: string }> {
  if (!memorySessionToken) return { ok: false, reason: 'NO_SESSION' };
  try {
    const res = await fetch('/api/auctions/list', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
    return (await res.json()) as {
      ok: boolean;
      auction?: Record<string, unknown>;
      listingFee?: number;
      reason?: string;
    };
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
}

export async function apiAuctionAction(
  auctionId: string,
  action: 'bid' | 'buy-now' | 'cancel' | 'claim-buyer' | 'claim-seller'
): Promise<Record<string, unknown>> {
  if (!memorySessionToken) return { ok: false, reason: 'NO_SESSION' };
  try {
    const res = await fetch(`/api/auctions/${encodeURIComponent(auctionId)}/${action}`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
}

