import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  SecurityRateLimiter,
  ServerAllianceState,
  ServerPlayerState,
  decryptSensitiveObject,
  encryptSensitiveObject,
  hashTelegramId,
  issueSignedSessionToken,
  toPublicLeaderboardRow,
  toPublicPlayerId,
  validateAndExecuteDonation,
  validateAndResolveBattle,
  verifySignedSessionToken,
  verifyTelegramInitDataStrict,
} from './security.ts';

function buildSignedTelegramInitData(userObj: Record<string, unknown>, botToken: string, authDateSec: number): string {
  const params = new URLSearchParams();
  params.set('auth_date', String(authDateSec));
  params.set('query_id', 'AAHdF6IQAAAAAN0XohDhrOrc');
  params.set('user', JSON.stringify(userObj));
  const pairs: string[] = [];
  params.forEach((v, k) => pairs.push(`${k}=${v}`));
  pairs.sort();
  const dataCheckString = pairs.join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

export function runFiveLayerSecurityTests(): void {
  const botToken = '123456:TEST_BOT_TOKEN_SECRET';
  const nowSec = Math.floor(Date.now() / 1000);
  const validInitData = buildSignedTelegramInitData(
    { id: 987654321, first_name: 'Amir', username: 'amir_dragon', photo_url: 'https://t.me/i/userpic/320/test.jpg' },
    botToken,
    nowSec
  );

  // Layer 2: HMAC-SHA256 verification
  const okCheck = verifyTelegramInitDataStrict(validInitData, botToken, 987654321, nowSec);
  assert.equal(okCheck.valid, true, 'Valid Telegram HMAC signature accepted');
  assert.equal(okCheck.user?.id, 987654321);

  const forgedCheck = verifyTelegramInitDataStrict(`${validInitData}tampered`, botToken, 987654321, nowSec);
  assert.equal(forgedCheck.valid, false, 'Tampered HMAC signature rejected');

  const mismatchedIdCheck = verifyTelegramInitDataStrict(validInitData, botToken, 111222333, nowSec);
  assert.equal(mismatchedIdCheck.valid, false);
  assert.equal(mismatchedIdCheck.reason, 'TELEGRAM_ID_MISMATCH', 'Mismatched Telegram ID rejected');

  const missingTokenCheck = verifyTelegramInitDataStrict(validInitData, '', 987654321, nowSec);
  assert.equal(missingTokenCheck.valid, false, 'Missing bot token rejected (no unverified bypass)');

  // Signed Bearer token & ID mismatch guard
  const token = issueSignedSessionToken(okCheck.user!);
  assert.equal(verifySignedSessionToken(token, 987654321).valid, true);
  assert.equal(verifySignedSessionToken(token, 555).valid, false);

  // Layer 4: Rate Limiting (20/min, 5s donation cooldown, 1000 req/sec -> 10m ban)
  const limiter = new SecurityRateLimiter({
    maxPerMinute: 20,
    floodBurstThreshold: 1000,
    floodWindowMs: 1000,
    banDurationMs: 10 * 60 * 1000,
    donationCooldownMs: 5000,
  });
  const baseMs = 1_700_000_000_000;
  for (let i = 0; i < 20; i += 1) {
    assert.equal(limiter.checkAndRecordRequest('caller_min', baseMs + i * 2000).allowed, true);
  }
  const over20 = limiter.checkAndRecordRequest('caller_min', baseMs + 45000);
  assert.equal(over20.allowed, false);
  assert.equal(over20.reason, 'RATE_LIMIT_20_PER_MIN');

  // 1000 requests in 1 second -> 10-minute ban
  for (let i = 0; i < 999; i += 1) {
    limiter.checkAndRecordRequest('flooder', baseMs + (i % 500));
  }
  const floodBan = limiter.checkAndRecordRequest('flooder', baseMs + 600);
  assert.equal(floodBan.allowed, false);
  assert.equal(floodBan.reason, 'TEMPORARILY_BANNED_10_MIN');
  assert.equal(limiter.isBanned('flooder', baseMs + 9 * 60 * 1000), true, 'Still banned after 9 mins');
  assert.equal(limiter.isBanned('flooder', baseMs + 11 * 60 * 1000), false, 'Ban expires after 10 mins');

  // Layer 3: Server-Side Validation & Audit Log
  const player: ServerPlayerState = {
    publicId: toPublicPlayerId(987654321),
    tgIdHash: hashTelegramId(987654321),
    displayName: 'Amir',
    avatarUrl: 'https://t.me/i/userpic/320/test.jpg',
    corn: 500,
    duckGold: 10,
    stars: 5,
    leaguePoints: 100,
    allianceId: 'global_swarm_alpha',
    allianceRole: 'MEMBER',
    allianceTaxLv: 0,
    allianceFuryLv: 0,
    donationsToday: 0,
    bossAttacksToday: 0,
    lastDonationAt: 0,
    dragons: [
      {
        id: 'd1',
        name: 'Aqua',
        skin: 'aqua',
        rarity: 'COMMON',
        level: 1,
        customLevel: 0,
        skillLevel: 1,
        trainingLevel: 0,
        gear: 'none',
        sizeTier: 'NORMAL',
      },
    ],
    updatedAt: baseMs,
  };
  const alliance: ServerAllianceState = {
    id: 'global_swarm_alpha',
    packName: 'عش التنانين',
    level: 1,
    xp: 0,
    power: 1000,
    treasuryCorn: 1000,
    vaultGold: 0,
    techPointsPool: 0,
    bossLevel: 4,
    bossHp: 12500,
    bossMaxHp: 12500,
    memberPublicIds: [player.publicId],
    auditLogs: [],
  };

  // Tampered 999999 donation rejected
  const badAmount = validateAndExecuteDonation({
    player,
    alliance,
    allianceId: 'global_swarm_alpha',
    kind: 'SMALL_ENERGY',
    requestedAmount: 999999,
    rateLimiter: limiter,
    nowMs: baseMs,
  });
  assert.equal(badAmount.ok, false);
  assert.equal(alliance.treasuryCorn, 1000, 'Treasury untouched on tampered donation');

  // Valid 100 donation succeeds
  const goodDonate = validateAndExecuteDonation({
    player,
    alliance,
    allianceId: 'global_swarm_alpha',
    kind: 'SMALL_ENERGY',
    requestedAmount: 100,
    rateLimiter: limiter,
    nowMs: baseMs + 100,
  });
  assert.equal(goodDonate.ok, true);
  assert.equal(player.corn, 400);
  assert.equal(alliance.treasuryCorn, 1100);

  // Second donation within 5s rejected
  const fastRepeat = validateAndExecuteDonation({
    player,
    alliance,
    allianceId: 'global_swarm_alpha',
    kind: 'SMALL_ENERGY',
    requestedAmount: 100,
    rateLimiter: limiter,
    nowMs: baseMs + 2000,
  });
  assert.equal(fastRepeat.ok, false);
  if (!fastRepeat.ok) {
    assert.equal(fastRepeat.reason, 'DONATION_COOLDOWN_5S');
  }

  // Battle ignores inflated client power
  const battle = validateAndResolveBattle({
    player,
    alliance,
    mode: 'ARENA',
    rivalPower: 5000,
    clientClaimedPower: 999999,
    nowMs: baseMs + 6000,
  });
  assert.equal(battle.powerAnomalyDetected, true);
  assert.equal(battle.won, false, 'Server recomputed power loses fairly against stronger rival');

  // Layer 5: Privacy & AES-256-GCM encryption
  const pubRow = toPublicLeaderboardRow(player);
  assert.equal('tgIdHash' in pubRow, false);
  assert.equal('telegramId' in pubRow, false);
  assert.equal(pubRow.displayName, 'Amir');

  const enc = encryptSensitiveObject({ telegramId: 987654321, corn: 400 });
  assert.equal(enc.alg, 'AES-256-GCM');
  const dec = decryptSensitiveObject<{ telegramId: number; corn: number }>(enc);
  assert.equal(dec.telegramId, 987654321);
  assert.equal(dec.corn, 400);
  assert.equal(alliance.auditLogs.length >= 3, true, 'Treasury audit logs recorded for every event');
}

runFiveLayerSecurityTests();
console.log('FIVE_LAYER_SECURITY_TESTS_OK');
