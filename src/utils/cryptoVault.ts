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
