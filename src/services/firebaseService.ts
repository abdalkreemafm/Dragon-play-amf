import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  DragonAuctionRecord,
  Duck,
  GameState,
  PlayerLeaderboardEntry,
} from '../types/game';
import { resolveDragonSize } from '../utils/economyEngine';
import {
  decryptSensitiveFromFirestore,
  encryptSensitiveForFirestore,
  sha256Hex,
  type EncryptedSensitiveMap,
} from '../utils/cryptoVault';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

function sanitizeId(raw: string, maxLen = 64): string {
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, maxLen);
  return clean || `id_${Date.now()}`;
}

function sanitizeText(raw: string, maxLen: number): string {
  return String(raw || '').trim().slice(0, maxLen);
}

export function subscribeAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

// Layer 1 & 5: Owner-only private profile with SHA-256 telegramIdHash (never plaintext Telegram ID)
export async function syncPlayerProfile(
  uid: string,
  state: GameState,
  tgInfo?: { id?: number; verified?: boolean }
): Promise<void> {
  const path = `playerProfiles/${uid}`;
  const active = state.ducks[state.activeDuckIndex] ?? state.ducks[0];
  const totalPower = Math.max(
    1,
    Math.min(10000000, Math.round(state.ducks.reduce((acc, d) => acc + (d.powerRating ?? 100), 0)))
  );

  const payload: Record<string, unknown> = {
    uid: sanitizeId(uid, 128),
    username: sanitizeText(state.username, 32) || 'DRAGON_TAMER',
    avatarUrl: sanitizeText(active?.skin ?? 'aqua', 24),
    telegramVerified: Boolean(tgInfo?.verified),
    powerRating: totalPower,
    leaguePoints: Math.max(0, Math.min(10000000, Math.round(state.league.points ?? 0))),
    dmdTotal: Math.max(0, Math.min(10000000, Number((state.dmdTotal ?? 0).toFixed(2)))),
    dragonCount: Math.max(1, Math.min(200, state.ducks.length)),
    allianceId: state.pack.joined ? 'global_swarm_alpha' : '',
    activeDragonName: sanitizeText(active?.name ?? 'تنين البداية', 48),
    activeDragonSkin: sanitizeText(active?.skin ?? 'aqua', 24),
    activeDragonRarity: active?.rarity ?? 'COMMON',
    activeDragonLevel: Math.max(1, Math.min(5, Math.round(active?.level ?? 1))),
    updatedAt: serverTimestamp(),
  };

  if (tgInfo?.id) {
    payload.telegramIdHash = await sha256Hex(`tg:${tgInfo.id}`);
  }

  try {
    await setDoc(doc(db, 'playerProfiles', uid), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Layer 5: AES-256-GCM encrypted cloud save (sensitive currencies, wallet, treasury & telegramId encrypted)
export async function saveCloudGameState(
  uid: string,
  state: GameState,
  telegramId?: number
): Promise<void> {
  const path = `playerSaves/${uid}`;
  const boundedPack = {
    ...state.pack,
    logs: (state.pack.logs ?? []).slice(0, 40),
    messages: (state.pack.messages ?? []).slice(-35),
    notifications: (state.pack.notifications ?? []).slice(0, 20),
    swarmDragon: state.pack.swarmDragon
      ? {
          ...state.pack.swarmDragon,
          donations: (state.pack.swarmDragon.donations ?? []).slice(0, 35),
        }
      : undefined,
  };

  const sensitiveSlice: Record<string, unknown> = {
    corn: state.corn,
    duckGold: state.duckGold,
    stars: state.stars,
    dmdTotal: state.dmdTotal,
    wallet: state.wallet,
    treasury: state.treasury,
    packLedger: state.pack.ledger ?? null,
    telegramId: telegramId ? String(telegramId) : null,
  };

  const encryptedSensitive = await encryptSensitiveForFirestore(uid, sensitiveSlice);

  // Strip sensitive plaintext balances/wallet from public map portion
  const publicSafeMap: Record<string, unknown> = {
    ...state,
    corn: 0,
    duckGold: 0,
    stars: 0,
    dmdTotal: 0,
    pack: boundedPack,
    lastSavedAt: Date.now(),
  };
  delete publicSafeMap.wallet;
  delete publicSafeMap.treasury;

  const payload: Record<string, unknown> = {
    uid: sanitizeId(uid, 128),
    schemaVersion: Math.max(1, Math.min(20, Math.round(state.schemaVersion ?? 4))),
    encryptedSensitive,
    gameStateMap: publicSafeMap,
    updatedAt: serverTimestamp(),
  };

  if (telegramId) {
    payload.telegramIdHash = await sha256Hex(`tg:${telegramId}`);
  }

  try {
    await setDoc(doc(db, 'playerSaves', uid), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadCloudGameState(uid: string): Promise<Partial<GameState> | null> {
  const path = `playerSaves/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'playerSaves', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as {
      gameStateMap?: Partial<GameState>;
      encryptedSensitive?: Partial<EncryptedSensitiveMap>;
    };
    const baseMap = data?.gameStateMap ?? null;
    if (!baseMap) return null;

    const decrypted = await decryptSensitiveFromFirestore<{
      corn?: number;
      duckGold?: number;
      stars?: number;
      dmdTotal?: number;
      wallet?: GameState['wallet'];
      treasury?: GameState['treasury'];
    }>(uid, data.encryptedSensitive);

    if (decrypted) {
      return {
        ...baseMap,
        corn: typeof decrypted.corn === 'number' ? decrypted.corn : baseMap.corn,
        duckGold: typeof decrypted.duckGold === 'number' ? decrypted.duckGold : baseMap.duckGold,
        stars: typeof decrypted.stars === 'number' ? decrypted.stars : baseMap.stars,
        dmdTotal: typeof decrypted.dmdTotal === 'number' ? decrypted.dmdTotal : baseMap.dmdTotal,
        wallet: decrypted.wallet ?? baseMap.wallet,
        treasury: decrypted.treasury ?? baseMap.treasury,
      };
    }

    return baseMap;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Layer 1 & 5: Read-only public leaderboard (/leaderboard collection written exclusively by server/Cloud Functions)
export function subscribeLeaderboard(
  cb: (players: PlayerLeaderboardEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'leaderboard';
  const q = query(collection(db, path), orderBy('powerRating', 'desc'), limit(25));
  return onSnapshot(
    q,
    (snap) => {
      const rows: PlayerLeaderboardEntry[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (typeof d.uid === 'string' && typeof d.powerRating === 'number') {
          rows.push({
            uid: d.uid,
            username: String(d.username || 'DRAGON_TAMER'),
            avatarUrl: typeof d.avatarUrl === 'string' ? d.avatarUrl : undefined,
            powerRating: Number(d.powerRating || 0),
            leaguePoints: Number(d.leaguePoints || 0),
            dmdTotal: Number(d.dmdTotal || 0),
            dragonCount: Number(d.dragonCount || 1),
            activeDragonName: typeof d.activeDragonName === 'string' ? d.activeDragonName : 'تنين البداية',
            activeDragonSkin: typeof d.activeDragonSkin === 'string' ? d.activeDragonSkin : 'aqua',
            activeDragonRarity: d.activeDragonRarity ?? 'COMMON',
            activeDragonLevel: Number(d.activeDragonLevel || 1),
          });
        }
      });
      cb(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped as Error);
      }
    }
  );
}

export function subscribeDragonAuctions(
  cb: (auctions: DragonAuctionRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'dragonAuctions';
  const q = query(
    collection(db, path),
    where('status', 'in', ['ACTIVE', 'SOLD']),
    limit(40)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: DragonAuctionRecord[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: String(d.id || docSnap.id),
          sellerUid: String(d.sellerUid || ''),
          sellerName: String(d.sellerName || 'مروض'),
          dragon: d.dragon as DragonAuctionRecord['dragon'],
          rarity: d.rarity,
          startCornPrice: Number(d.startCornPrice || 0),
          currentCornPrice: Number(d.currentCornPrice || 0),
          buyNowStars: Number(d.buyNowStars || 0),
          highestBidderUid: String(d.highestBidderUid || ''),
          highestBidderName: String(d.highestBidderName || ''),
          bidCount: Number(d.bidCount || 0),
          status: d.status,
          winnerUid: String(d.winnerUid || ''),
          settlementType: d.settlementType ?? 'NONE',
          sellerClaimed: Boolean(d.sellerClaimed),
          buyerClaimed: Boolean(d.buyerClaimed),
          endsAtMs: Number(d.endsAtMs || 0),
        });
      });
      list.sort((a, b) => a.endsAtMs - b.endsAtMs);
      cb(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped as Error);
      }
    }
  );
}

export async function createDragonAuction(params: {
  uid: string;
  sellerName: string;
  dragon: Duck;
  startCornPrice: number;
  buyNowStars: number;
  durationMinutes: number;
}): Promise<string> {
  const auctionId = sanitizeId(`auc_${params.uid.slice(0, 8)}_${Date.now()}`, 64);
  const path = `dragonAuctions/${auctionId}`;
  const endsAtMs = Date.now() + Math.max(5, Math.min(240, params.durationMinutes)) * 60 * 1000;
  const startPrice = Math.max(200, Math.min(5000000, Math.round(params.startCornPrice)));
  const starsPrice = Math.max(5, Math.min(50000, Math.round(params.buyNowStars)));

  const dragonPayload: Record<string, unknown> = {
    id: sanitizeId(params.dragon.id, 64),
    name: sanitizeText(params.dragon.name, 48) || 'تنين السرب',
    skin: sanitizeText(params.dragon.skin, 24),
    rarity: params.dragon.rarity,
    level: Math.max(1, Math.min(5, Math.round(params.dragon.level))),
    customLevel: Math.max(0, Math.min(10, Math.round(params.dragon.customLevel ?? 0))),
    sizeTier: resolveDragonSize(params.dragon),
    gear: sanitizeText(params.dragon.gear ?? 'none', 24) || 'none',
    aura: sanitizeText(params.dragon.aura ?? 'auto', 24) || 'auto',
    skillLevel: Math.max(1, Math.min(10, Math.round(params.dragon.skillLevel ?? 1))),
    trainingLevel: Math.max(0, Math.min(1000, Math.round(params.dragon.trainingLevel ?? 0))),
    powerRating: Math.max(1, Math.min(1000000, Math.round(params.dragon.powerRating ?? 100))),
  };

  const docData: Record<string, unknown> = {
    id: auctionId,
    sellerUid: sanitizeId(params.uid, 128),
    sellerName: sanitizeText(params.sellerName, 32) || 'DRAGON_TAMER',
    dragon: dragonPayload,
    rarity: params.dragon.rarity,
    startCornPrice: startPrice,
    currentCornPrice: startPrice,
    buyNowStars: starsPrice,
    highestBidderUid: '',
    highestBidderName: '',
    bidCount: 0,
    status: 'ACTIVE',
    winnerUid: '',
    settlementType: 'NONE',
    sellerClaimed: false,
    buyerClaimed: false,
    endsAtMs,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'dragonAuctions', auctionId), docData);
    return auctionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function bidOnDragonAuction(
  auctionId: string,
  uid: string,
  bidderName: string,
  minNextPrice: number
): Promise<{ acceptedPrice: number }> {
  const path = `dragonAuctions/${auctionId}`;
  const ref = doc(db, 'dragonAuctions', auctionId);
  try {
    const acceptedPrice = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('AUCTION_NOT_FOUND');
      const d = snap.data();
      if (d.status !== 'ACTIVE') throw new Error('AUCTION_NOT_ACTIVE');
      if (d.sellerUid === uid) throw new Error('CANNOT_BID_OWN');
      const currentPrice = Number(d.currentCornPrice || 0);
      const nextPrice = Math.max(minNextPrice, currentPrice + Math.max(50, Math.round(currentPrice * 0.1)));
      const nowMs = Date.now();
      const currentEnd = Number(d.endsAtMs || 0);
      if (nowMs > currentEnd) throw new Error('AUCTION_EXPIRED');
      const extendedEnd = currentEnd - nowMs < 20000 ? currentEnd + 15000 : currentEnd;

      tx.update(ref, {
        currentCornPrice: nextPrice,
        highestBidderUid: sanitizeId(uid, 128),
        highestBidderName: sanitizeText(bidderName, 32) || 'DRAGON_TAMER',
        bidCount: Number(d.bidCount || 0) + 1,
        endsAtMs: extendedEnd,
        updatedAt: serverTimestamp(),
      });
      return nextPrice;
    });
    return { acceptedPrice };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function buyNowDragonAuction(
  auctionId: string,
  uid: string,
  buyerName: string
): Promise<void> {
  const path = `dragonAuctions/${auctionId}`;
  const ref = doc(db, 'dragonAuctions', auctionId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('AUCTION_NOT_FOUND');
      const d = snap.data();
      if (d.status !== 'ACTIVE') throw new Error('AUCTION_NOT_ACTIVE');
      if (d.sellerUid === uid) throw new Error('CANNOT_BUY_OWN');
      tx.update(ref, {
        status: 'SOLD',
        winnerUid: sanitizeId(uid, 128),
        settlementType: 'BUY_NOW',
        buyerClaimed: true,
        highestBidderUid: sanitizeId(uid, 128),
        highestBidderName: sanitizeText(buyerName, 32) || 'DRAGON_TAMER',
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function cancelDragonAuction(auctionId: string, uid: string): Promise<void> {
  const path = `dragonAuctions/${auctionId}`;
  const ref = doc(db, 'dragonAuctions', auctionId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('AUCTION_NOT_FOUND');
      const d = snap.data();
      if (d.sellerUid !== uid || d.status !== 'ACTIVE' || Number(d.bidCount || 0) > 0) {
        throw new Error('CANNOT_CANCEL_AUCTION');
      }
      tx.update(ref, {
        status: 'CANCELLED',
        settlementType: 'EXPIRED',
        sellerClaimed: true,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function claimBuyerAuctionDragon(auctionId: string, uid: string): Promise<void> {
  const path = `dragonAuctions/${auctionId}`;
  const ref = doc(db, 'dragonAuctions', auctionId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('AUCTION_NOT_FOUND');
      const d = snap.data();
      if (d.buyerClaimed || d.highestBidderUid !== uid) throw new Error('NOT_WINNER');
      const nextStatus = d.sellerClaimed ? 'CLAIMED' : 'SOLD';
      tx.update(ref, {
        status: nextStatus,
        winnerUid: sanitizeId(uid, 128),
        settlementType: 'BID',
        buyerClaimed: true,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function claimSellerAuctionProceeds(
  auctionId: string,
  uid: string
): Promise<{ settlementType: 'BID' | 'BUY_NOW'; grossCorn: number; grossStars: number }> {
  const path = `dragonAuctions/${auctionId}`;
  const ref = doc(db, 'dragonAuctions', auctionId);
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('AUCTION_NOT_FOUND');
      const d = snap.data();
      if (d.sellerUid !== uid || d.sellerClaimed) throw new Error('CANNOT_CLAIM_PROCEEDS');
      const isBuyNow = d.settlementType === 'BUY_NOW';
      const nextStatus = d.buyerClaimed ? 'CLAIMED' : 'SOLD';
      tx.update(ref, {
        status: nextStatus,
        winnerUid: String(d.winnerUid || d.highestBidderUid || ''),
        settlementType: isBuyNow ? 'BUY_NOW' : 'BID',
        sellerClaimed: true,
        updatedAt: serverTimestamp(),
      });
      return {
        settlementType: isBuyNow ? 'BUY_NOW' : 'BID',
        grossCorn: isBuyNow ? 0 : Number(d.currentCornPrice || 0),
        grossStars: isBuyNow ? Number(d.buyNowStars || 0) : 0,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Alliance treasury & stats are now Server/Cloud Functions write-only per Layer 1 rules.
export async function syncGlobalAllianceState(
  _allianceId: string,
  _uid: string,
  _state: GameState
): Promise<void> {
  // No-op from client SDK: treasury/stats mutations must go through /api/alliance/donate or Cloud Functions
  return Promise.resolve();
}

export async function sendGlobalAllianceMessage(
  allianceId: string,
  uid: string,
  senderName: string,
  text: string
): Promise<void> {
  const cleanAllianceId = sanitizeId(allianceId, 64);
  const messageId = sanitizeId(`msg_${uid.slice(0, 6)}_${Date.now()}`, 64);
  const path = `alliances/${cleanAllianceId}/messages/${messageId}`;
  const cleanText = sanitizeText(text, 280);
  if (!cleanText) return;

  try {
    await setDoc(doc(db, 'alliances', cleanAllianceId, 'messages', messageId), {
      id: messageId,
      allianceId: cleanAllianceId,
      senderUid: sanitizeId(uid, 128),
      senderName: sanitizeText(senderName, 32) || 'DRAGON_TAMER',
      text: cleanText,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeAllianceMessages(
  allianceId: string,
  cb: (msgs: { id: string; sender: string; text: string; time: string }[]) => void,
  onError?: (err: Error) => void
): () => void {
  const cleanAllianceId = sanitizeId(allianceId, 64);
  const path = `alliances/${cleanAllianceId}/messages`;
  const q = query(
    collection(db, 'alliances', cleanAllianceId, 'messages'),
    where('allianceId', '==', cleanAllianceId),
    limit(25)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: { id: string; sender: string; text: string; time: string; ts: number }[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const tsMs =
          typeof d.createdAt?.toMillis === 'function' ? d.createdAt.toMillis() : Date.now();
        items.push({
          id: String(d.id || docSnap.id),
          sender: String(d.senderName || 'حليف'),
          text: String(d.text || ''),
          time: new Date(tsMs).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          ts: tsMs,
        });
      });
      items.sort((a, b) => a.ts - b.ts);
      cb(items.map(({ id, sender, text, time }) => ({ id, sender, text, time })));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped as Error);
      }
    }
  );
}
