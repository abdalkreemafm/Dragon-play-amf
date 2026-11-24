/**
 * Firebase Cloud Functions (Blaze / User-Owned GCP Project)
 * Server-authoritative writers for /leaderboard/{uid} and /alliances/{allianceId}/treasury/main
 * + immutable /alliances/{allianceId}/treasuryAuditLogs/{logId}.
 *
 * Deploy separately inside `functions/` once Cloud Functions & Cloud Billing are enabled.
 */
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();

const ALLOWED_TIERS: Record<string, { energyCost: number; goldCost: number; vaultCornGain: number }> = {
  SMALL_ENERGY: { energyCost: 100, goldCost: 0, vaultCornGain: 100 },
  MED_ENERGY: { energyCost: 500, goldCost: 0, vaultCornGain: 500 },
  GOLD_OFFERING: { energyCost: 0, goldCost: 10, vaultCornGain: 400 },
};

// Layer 1 & 5: Sync ONLY sanitized public leaderboard fields (NO telegramId, NO PII)
export const syncPublicLeaderboard = onDocumentWritten('playerProfiles/{uid}', async (event) => {
  const uid = event.params.uid;
  const after = event.data?.after.data();
  if (!after) return;

  await db.doc(`leaderboard/${uid}`).set(
    {
      uid,
      username: String(after.username || 'DRAGON_TAMER').slice(0, 32),
      avatarUrl: String(after.avatarUrl || after.activeDragonSkin || 'aqua').slice(0, 256),
      powerRating: Math.max(0, Math.min(10000000, Math.round(Number(after.powerRating || 0)))),
      leaguePoints: Math.max(0, Math.min(10000000, Math.round(Number(after.leaguePoints || 0)))),
      dragonCount: Math.max(1, Math.min(200, Math.round(Number(after.dragonCount || 1)))),
      activeDragonName: String(after.activeDragonName || 'تنين البداية').slice(0, 48),
      activeDragonSkin: String(after.activeDragonSkin || 'aqua').slice(0, 24),
      activeDragonRarity: String(after.activeDragonRarity || 'COMMON'),
      activeDragonLevel: Math.max(1, Math.min(5, Math.round(Number(after.activeDragonLevel || 1)))),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
});

// Layer 1, 3, 4 & 5: Server-only alliance treasury update + 5s cooldown + audit log
export const donateToAllianceTreasury = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid || !request.auth?.token?.email_verified) {
    throw new HttpsError('unauthenticated', 'Verified sign-in required.');
  }

  const allianceId = String(request.data?.allianceId || '').trim();
  const kind = String(request.data?.kind || '').trim();
  const requestedAmount = Number(request.data?.amount);
  const tier = ALLOWED_TIERS[kind];

  if (!tier || requestedAmount !== (tier.energyCost || tier.goldCost)) {
    throw new HttpsError('invalid-argument', 'Invalid donation tier or tampered amount.');
  }

  const memberRef = db.doc(`alliances/${allianceId}/members/${uid}`);
  const treasuryRef = db.doc(`alliances/${allianceId}/treasury/main`);
  const logRef = db.collection(`alliances/${allianceId}/treasuryAuditLogs`).doc();

  await db.runTransaction(async (tx) => {
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) {
      throw new HttpsError('permission-denied', 'Caller is not an alliance member.');
    }

    const memberData = memberSnap.data() || {};
    const lastDonateMs = Number(memberData.lastDonateMs || 0);
    if (Date.now() - lastDonateMs < 5000) {
      throw new HttpsError('resource-exhausted', 'Donation cooldown: 5 seconds.');
    }

    const treasurySnap = await tx.get(treasuryRef);
    const curCorn = Number(treasurySnap.data()?.treasuryCorn || 0);
    const nextCorn = curCorn + tier.vaultCornGain;

    tx.set(
      treasuryRef,
      {
        allianceId,
        treasuryCorn: nextCorn,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    tx.update(memberRef, { lastDonateMs: Date.now() });
    tx.set(logRef, {
      id: logRef.id,
      allianceId,
      actorUid: uid,
      actorName: String(memberData.displayName || 'DRAGON_TAMER').slice(0, 32),
      action: 'DONATE',
      resource: tier.energyCost > 0 ? 'CORN' : 'GOLD',
      amountDelta: tier.vaultCornGain,
      balanceBefore: curCorn,
      balanceAfter: nextCorn,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { ok: true, addedCorn: tier.vaultCornGain };
});
