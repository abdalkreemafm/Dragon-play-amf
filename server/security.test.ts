import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  SecurityRateLimiter,
  ServerAllianceState,
  ServerDragon,
  ServerPlayerState,
  computeDragonUpgradeValuation,
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
import {
  bidOnRealAuction,
  buyNowRealAuction,
  claimSellerRealAuction,
  clearPendingPersistTimerForTests,
  configureDbFilePathForTests,
  createRealAlliance,
  createRealAuction,
  getDb,
  getOrSeedPlayer,
  getPublicAllianceDirectory,
  joinRealAlliance,
  leaveRealAlliance,
  manageRealAllianceMember,
  persistDbNow,
  syncAndRolloverCompetition,
  updateRealAllianceIdentity,
} from './db.ts';
import { dispatchServerCommand } from './coordinator.ts';
import { applySoftCapDamping } from '../src/utils/economyEngine.ts';

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
  const publicId = toPublicPlayerId(987654321);
  const player: ServerPlayerState = {
    actorKey: 'tg:987654321',
    publicId,
    tgIdHash: hashTelegramId(987654321),
    displayName: 'Amir',
    avatarUrl: 'https://t.me/i/userpic/320/test.jpg',
    corn: 500,
    duckGold: 10,
    stars: 5,
    amfTotal: 12.5,
    leaguePoints: 100,
    tournamentScore: 40,
    totalFeeds: 3,
    allianceId: 'ally_test_1',
    allianceRole: 'MEMBER',
    allianceTaxLv: 0,
    allianceFuryLv: 0,
    donationsToday: 0,
    bossAttacksToday: 0,
    donatedEnergyTotal: 0,
    donatedTechTotal: 0,
    rallyScoreTotal: 0,
    dailyActivityPoints: 0,
    lastDonationAt: 0,
    lastSeenAt: baseMs,
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
    id: 'ally_test_1',
    packName: 'عش التنانين',
    motto: 'وحدة التنانين',
    emblemId: 'dragon_shield',
    leaderPublicId: publicId,
    leaderName: 'Amir',
    joinConditions: {
      minPower: 100,
      minDragons: 1,
      minDragonLevel: 1,
      autoAccept: true,
    },
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
    memberRoles: { [player.publicId]: 'LEADER' },
    messages: [],
    logs: [],
    auditLogs: [],
    createdAt: baseMs,
  };

  // Tampered 999999 donation rejected
  const badAmount = validateAndExecuteDonation({
    player,
    alliance,
    allianceId: 'ally_test_1',
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
    allianceId: 'ally_test_1',
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
    allianceId: 'ally_test_1',
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

export function runRealDbAndAuctionTests(): void {
  const tempDbPath = path.join(os.tmpdir(), `dragon_amf_test_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  configureDbFilePathForTests(tempDbPath);

  try {
    // 1. Valuation accuracy: upgraded dragon must cost & price higher than Lv1 common
    const starterDragon: ServerDragon = {
      id: 'd_low',
      name: 'Starter',
      skin: 'aqua',
      rarity: 'COMMON',
      level: 1,
      customLevel: 0,
      skillLevel: 1,
      trainingLevel: 0,
      gear: 'none',
      sizeTier: 'NORMAL',
    };
    const upgradedDragon: ServerDragon = {
      id: 'd_high',
      name: 'Apex',
      skin: 'nova',
      rarity: 'LEGENDARY',
      level: 4,
      customLevel: 5,
      skillLevel: 7,
      trainingLevel: 20,
      gear: 'crown',
      sizeTier: 'XL',
    };
    const lowVal = computeDragonUpgradeValuation(starterDragon);
    const highVal = computeDragonUpgradeValuation(upgradedDragon);
    assert.equal(
      highVal.upgradeInvestmentEnergy > lowVal.upgradeInvestmentEnergy * 5,
      true,
      'Upgraded legendary dragon valuation scales substantially with investment'
    );
    assert.equal(highVal.suggestedStartCorn > lowVal.suggestedStartCorn, true);
    assert.equal(highVal.suggestedBuyNowStars > lowVal.suggestedBuyNowStars, true);

    // 2. Fresh DB starts with zero fake players, alliances, or auctions
    const db = getDb();
    assert.equal(Object.keys(db.players).length, 0, 'Fresh DB has zero fake players');
    assert.equal(Object.keys(db.alliances).length, 0, 'Fresh DB has zero fake alliances');
    assert.equal(Object.keys(db.auctions).length, 0, 'Fresh DB has zero fake auctions');

    // 3. Seed two real Telegram players
    const nowSec = Math.floor(Date.now() / 1000);
    const p1 = getOrSeedPlayer({
      actorKey: 'tg:100001',
      authMethod: 'telegram',
      tgId: 100001,
      publicId: toPublicPlayerId(100001),
      displayName: 'LeaderOne',
      avatarUrl: 'aqua',
      iat: nowSec,
      exp: nowSec + 3600,
    });
    const p2 = getOrSeedPlayer({
      actorKey: 'tg:100002',
      authMethod: 'telegram',
      tgId: 100002,
      publicId: toPublicPlayerId(100002),
      displayName: 'MemberTwo',
      avatarUrl: 'aqua',
      iat: nowSec,
      exp: nowSec + 3600,
    });

    // 4. Central Coordinator enforces Telegram-only auth, alliance flow, auctions, and receipts
    const unauthAction = dispatchServerCommand({
      session: null,
      command: { type: 'ALLIANCE_LEAVE' },
      rateLimiter: new SecurityRateLimiter(),
    });
    assert.equal(unauthAction.ok, false);
    assert.equal(unauthAction.status, 401);

    const centralSync = dispatchServerCommand({
      session: {
        actorKey: p1.actorKey,
        authMethod: 'telegram',
        tgId: 100001,
        publicId: p1.publicId,
        displayName: p1.displayName,
        avatarUrl: 'aqua',
        iat: nowSec,
        exp: nowSec + 3600,
      },
      command: { type: 'PLAYER_SYNC', payload: { corn: 9000, stars: 50, totalFeeds: 7 } },
      rateLimiter: new SecurityRateLimiter(),
    });
    assert.equal(centralSync.ok, true);
    if (centralSync.ok) {
      assert.equal(centralSync.receipt.playerPublicId, p1.publicId);
      assert.equal(centralSync.receipt.playerCornAfter, 9000);
    }

    // 5. Real alliance creation, join condition check, promotion, kick, and leave
    const createdAlly = createRealAlliance(p1, {
      packName: 'سرب الفجر الحقيقي',
      motto: 'لا مكان للوهميين',
      emblemId: 'phoenix_wing',
      joinConditions: { minPower: 300, minDragons: 1, minDragonLevel: 1, autoAccept: true },
    });
    assert.equal(createdAlly.ok, true);
    if (!createdAlly.ok) throw new Error('Alliance creation failed');

    const directory = getPublicAllianceDirectory();
    assert.equal(directory.some((a) => a.id === createdAlly.alliance.id), true);

    // Ineligible player rejected because default starter power < 300
    const rejectedJoin = joinRealAlliance(p2, createdAlly.alliance.id);
    assert.equal(rejectedJoin.ok, false);
    if (!rejectedJoin.ok) assert.equal(rejectedJoin.reason, 'JOIN_CONDITIONS_NOT_MET');

    // Upgrade p2 dragon and join successfully
    p2.dragons = [upgradedDragon];
    const okJoin = joinRealAlliance(p2, createdAlly.alliance.id);
    assert.equal(okJoin.ok, true);
    assert.equal(createdAlly.alliance.memberPublicIds.includes(p2.publicId), true);

    const promo = manageRealAllianceMember(p1, createdAlly.alliance.id, p2.publicId, 'PROMOTE');
    assert.equal(promo.ok, true);
    assert.equal(createdAlly.alliance.memberRoles[p2.publicId], 'ELITE');

    const kick = manageRealAllianceMember(p1, createdAlly.alliance.id, p2.publicId, 'KICK');
    assert.equal(kick.ok, true);
    assert.equal(createdAlly.alliance.memberPublicIds.includes(p2.publicId), false);

    // 6. Real Online Auction creation, bidding, buy-now & seller proceeds
    const auctionRes = createRealAuction(p1, {
      dragon: upgradedDragon,
      startCornPrice: highVal.suggestedStartCorn,
      buyNowStars: highVal.suggestedBuyNowStars,
      durationMinutes: 60,
    });
    assert.equal(auctionRes.ok, true);
    if (!auctionRes.ok) throw new Error('Auction creation failed');

    const ownBid = bidOnRealAuction(p1, auctionRes.auction.id);
    assert.equal(ownBid.ok, false, 'Seller cannot bid on own dragon');

    const rivalBid = bidOnRealAuction(p2, auctionRes.auction.id);
    assert.equal(rivalBid.ok, true);

    const buyNow = buyNowRealAuction(p2, auctionRes.auction.id);
    assert.equal(buyNow.ok, true);

    const sellerClaim = claimSellerRealAuction(p1, auctionRes.auction.id);
    assert.equal(sellerClaim.ok, true);
    if (sellerClaim.ok) {
      assert.equal(sellerClaim.netStars > 0, true);
      assert.equal(sellerClaim.taxBurned > 0, true);
    }

    // Leader leaves alliance (cleans empty alliance)
    const left = leaveRealAlliance(p1);
    assert.equal(left.ok, true);

    // 7. Timed Competition & Event Rollover
    const futureMs = db.competition.endsAt + 5000;
    const prevCycle = db.competition.cycleNumber;
    db.competition.scoresByPublicId[p1.publicId] = {
      displayName: p1.displayName,
      score: 999,
      powerRating: 500,
      updatedAt: Date.now(),
    };
    const rolled = syncAndRolloverCompetition(futureMs);
    assert.equal(rolled.cycleNumber, prevCycle + 1, 'Expired competition increments cycle number');
    assert.equal(Object.keys(rolled.scoresByPublicId).length, 0, 'Expired competition resets leaderboard scores');
  } finally {
    clearPendingPersistTimerForTests();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  }
}

runFiveLayerSecurityTests();
runRealDbAndAuctionTests();

export function runSwarmDbSecretAndRbacTests(): void {
  const tempDbPath = path.join(os.tmpdir(), `dragon_swarm_rbac_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  configureDbFilePathForTests(tempDbPath);

  const makeSession = (tgId: number, displayName: string, publicId: string) => {
    const nowSec = Math.floor(Date.now() / 1000);
    return {
      actorKey: `tg:${tgId}`,
      authMethod: 'telegram' as const,
      tgId,
      publicId,
      displayName,
      avatarUrl: 'aqua',
      iat: nowSec,
      exp: nowSec + 3600,
    };
  };

  try {
    const limiter = new SecurityRateLimiter({ maxPerMinute: 120 });

    const sLeader = makeSession(200001, 'LeaderAlpha', toPublicPlayerId(200001));
    const sDeputy = makeSession(200002, 'DeputyBeta', toPublicPlayerId(200002));
    const sDeputy2 = makeSession(200003, 'DeputyGamma', toPublicPlayerId(200003));
    const sElite = makeSession(200004, 'EliteDelta', toPublicPlayerId(200004));
    const sMember = makeSession(200005, 'MemberEpsilon', toPublicPlayerId(200005));
    const sPublicHost = makeSession(200006, 'PublicHost', toPublicPlayerId(200006));

    const pLeader = getOrSeedPlayer(sLeader);
    const pDeputy = getOrSeedPlayer(sDeputy);
    const pDeputy2 = getOrSeedPlayer(sDeputy2);
    const pElite = getOrSeedPlayer(sElite);
    const pMember = getOrSeedPlayer(sMember);
    const pPublicHost = getOrSeedPlayer(sPublicHost);

    // 1. Create a PUBLIC swarm and a SECRET swarm via coordinator
    const pubCreate = dispatchServerCommand({
      session: sPublicHost,
      rateLimiter: limiter,
      command: {
        type: 'ALLIANCE_CREATE',
        packName: 'سرب السماء العام',
        motto: 'باب مفتوح للجميع',
        emblemId: 'dragon_shield',
        visibility: 'PUBLIC',
        joinConditions: { minPower: 100, minDragons: 1, minDragonLevel: 1, autoAccept: true },
      },
    });
    assert.equal(pubCreate.ok, true);
    if (!pubCreate.ok) throw new Error('Public swarm creation failed');

    const secCreate = dispatchServerCommand({
      session: sLeader,
      rateLimiter: limiter,
      command: {
        type: 'ALLIANCE_CREATE',
        packName: 'سرب الظلال السري',
        motto: 'الدخول برمز سري فقط',
        emblemId: 'void_eye',
        visibility: 'SECRET',
        joinConditions: { minPower: 100, minDragons: 1, minDragonLevel: 1, autoAccept: true },
      },
    });
    assert.equal(secCreate.ok, true);
    if (!secCreate.ok) throw new Error('Secret swarm creation failed');

    const secAllyObj = secCreate.data.alliance as { id: string; inviteCode: string };
    const pubAllyObj = pubCreate.data.alliance as { id: string };
    const secretAllyId = secAllyObj.id;
    const secretInviteCode = secAllyObj.inviteCode;
    assert.equal(secretInviteCode.startsWith('DRG-'), true, 'Secret swarm gets DRG- invite code');

    // 2. Directory lists PUBLIC swarm (without inviteCode) and hides SECRET swarm
    const dirBefore = getPublicAllianceDirectory();
    const pubEntry = dirBefore.find((a) => a.id === pubAllyObj.id);
    assert.ok(pubEntry, 'Public swarm appears in public directory');
    assert.equal('inviteCode' in (pubEntry as unknown as Record<string, unknown>), false, 'Directory strips inviteCode');
    assert.equal(
      dirBefore.some((a) => a.id === secretAllyId),
      false,
      'SECRET swarm is excluded from public directory'
    );

    // 3. Joining SECRET swarm without code or with wrong code is rejected (403); valid code succeeds
    const joinNoCode = dispatchServerCommand({
      session: sMember,
      rateLimiter: limiter,
      command: { type: 'ALLIANCE_JOIN', allianceId: secretAllyId },
    });
    assert.equal(joinNoCode.ok, false);
    assert.equal(joinNoCode.status, 403);
    assert.equal(joinNoCode.reason, 'INVALID_SECRET_INVITE_CODE');

    const joinBadCode = dispatchServerCommand({
      session: sMember,
      rateLimiter: limiter,
      command: { type: 'ALLIANCE_JOIN', inviteCode: 'DRG-WRONG9' },
    });
    assert.equal(joinBadCode.ok, false);
    assert.equal(joinBadCode.reason, 'INVALID_SECRET_INVITE_CODE');

    for (const sess of [sDeputy, sDeputy2, sElite, sMember]) {
      const okSecretJoin = dispatchServerCommand({
        session: sess,
        rateLimiter: limiter,
        command: { type: 'ALLIANCE_JOIN', inviteCode: secretInviteCode.toLowerCase() },
      });
      assert.equal(okSecretJoin.ok, true, `${sess.displayName} joins secret swarm via inviteCode`);
    }

    // 4. Reload DB from disk and verify full persistence of alliances, visibility, inviteCode, and roles
    persistDbNow();
    configureDbFilePathForTests(tempDbPath);
    const reloadedDb = getDb();
    assert.equal(Object.keys(reloadedDb.alliances).length, 2, 'Both alliances persisted to disk');
    const reloadedSecret = reloadedDb.alliances[secretAllyId];
    assert.ok(reloadedSecret);
    assert.equal(reloadedSecret.visibility, 'SECRET');
    assert.equal(reloadedSecret.inviteCode, secretInviteCode);
    assert.equal(reloadedSecret.memberPublicIds.length, 5);

    // Re-bind player refs after reload
    const rLeader = reloadedDb.players[pLeader.actorKey];
    const rDeputy = reloadedDb.players[pDeputy.actorKey];
    const rDeputy2 = reloadedDb.players[pDeputy2.actorKey];
    const rElite = reloadedDb.players[pElite.actorKey];
    const rMember = reloadedDb.players[pMember.actorKey];
    assert.ok(rLeader && rDeputy && rDeputy2 && rElite && rMember && reloadedDb.players[pPublicHost.actorKey]);

    // 5. Promote Deputy1 -> ELITE -> DEPUTY, Deputy2 -> ELITE -> DEPUTY, Elite -> ELITE by LEADER
    assert.equal(manageRealAllianceMember(rLeader, secretAllyId, rDeputy.publicId, 'PROMOTE').ok, true);
    assert.equal(manageRealAllianceMember(rLeader, secretAllyId, rDeputy.publicId, 'PROMOTE').ok, true);
    assert.equal(reloadedSecret.memberRoles[rDeputy.publicId], 'DEPUTY');

    assert.equal(manageRealAllianceMember(rLeader, secretAllyId, rDeputy2.publicId, 'PROMOTE').ok, true);
    assert.equal(manageRealAllianceMember(rLeader, secretAllyId, rDeputy2.publicId, 'PROMOTE').ok, true);
    assert.equal(reloadedSecret.memberRoles[rDeputy2.publicId], 'DEPUTY');

    assert.equal(manageRealAllianceMember(rLeader, secretAllyId, rElite.publicId, 'PROMOTE').ok, true);
    assert.equal(reloadedSecret.memberRoles[rElite.publicId], 'ELITE');
    assert.equal(reloadedSecret.memberRoles[rMember.publicId], 'MEMBER');

    // 6. RBAC Matrix Checks
    // MEMBER & ELITE blocked from identity/join-conditions & member management
    for (const lowActor of [rMember, rElite]) {
      const idFail = updateRealAllianceIdentity(lowActor, secretAllyId, {
        joinConditions: { minPower: 200 },
      });
      assert.equal(idFail.ok, false);
      if (!idFail.ok) assert.equal(idFail.status, 403);

      const promoFail = manageRealAllianceMember(lowActor, secretAllyId, rMember.publicId, 'PROMOTE');
      assert.equal(promoFail.ok, false);
      if (!promoFail.ok) assert.equal(promoFail.status, 403);

      const kickFail = manageRealAllianceMember(lowActor, secretAllyId, rMember.publicId, 'KICK');
      assert.equal(kickFail.ok, false);
      if (!kickFail.ok) assert.equal(kickFail.status, 403);
    }

    // DEPUTY permissions: allowed joinConditions + promote MEMBER->ELITE + demote ELITE->MEMBER
    const deputyCondOk = updateRealAllianceIdentity(rDeputy, secretAllyId, {
      joinConditions: { minPower: 250, minDragons: 1, minDragonLevel: 1, autoAccept: true },
    });
    assert.equal(deputyCondOk.ok, true, 'DEPUTY can edit joinConditions');

    const deputyPromoteMember = manageRealAllianceMember(rDeputy, secretAllyId, rMember.publicId, 'PROMOTE');
    assert.equal(deputyPromoteMember.ok, true, 'DEPUTY can promote MEMBER -> ELITE');
    assert.equal(reloadedSecret.memberRoles[rMember.publicId], 'ELITE');

    const deputyDemoteElite = manageRealAllianceMember(rDeputy, secretAllyId, rMember.publicId, 'DEMOTE');
    assert.equal(deputyDemoteElite.ok, true, 'DEPUTY can demote ELITE -> MEMBER');
    assert.equal(reloadedSecret.memberRoles[rMember.publicId], 'MEMBER');

    // DEPUTY blocked from: leader-only identity/visibility/code regen, promoting ELITE->DEPUTY, touching another DEPUTY or LEADER, transferring leadership
    const deputyNameFail = updateRealAllianceIdentity(rDeputy, secretAllyId, { packName: 'اختراق الاسم' });
    assert.equal(deputyNameFail.ok, false);
    if (!deputyNameFail.ok) assert.equal(deputyNameFail.reason, 'LEADER_ONLY_ACTION');

    const deputyVisFail = updateRealAllianceIdentity(rDeputy, secretAllyId, { visibility: 'PUBLIC' });
    assert.equal(deputyVisFail.ok, false);
    if (!deputyVisFail.ok) assert.equal(deputyVisFail.reason, 'LEADER_ONLY_ACTION');

    const deputyRegenFail = updateRealAllianceIdentity(rDeputy, secretAllyId, { regenerateInviteCode: true });
    assert.equal(deputyRegenFail.ok, false);
    if (!deputyRegenFail.ok) assert.equal(deputyRegenFail.reason, 'LEADER_ONLY_ACTION');

    const deputyToDeputyFail = manageRealAllianceMember(rDeputy, secretAllyId, rElite.publicId, 'PROMOTE');
    assert.equal(deputyToDeputyFail.ok, false, 'DEPUTY cannot promote ELITE to DEPUTY');
    if (!deputyToDeputyFail.ok) assert.equal(deputyToDeputyFail.reason, 'INSUFFICIENT_ALLIANCE_RANK');

    const deputyPeerKickFail = manageRealAllianceMember(rDeputy, secretAllyId, rDeputy2.publicId, 'KICK');
    assert.equal(deputyPeerKickFail.ok, false, 'DEPUTY cannot kick another DEPUTY');
    if (!deputyPeerKickFail.ok) assert.equal(deputyPeerKickFail.reason, 'CANNOT_MANAGE_EQUAL_OR_HIGHER_RANK');

    const deputyLeaderKickFail = manageRealAllianceMember(rDeputy, secretAllyId, rLeader.publicId, 'KICK');
    assert.equal(deputyLeaderKickFail.ok, false);
    if (!deputyLeaderKickFail.ok) assert.equal(deputyLeaderKickFail.reason, 'CANNOT_MODIFY_LEADER');

    const deputyTransferFail = manageRealAllianceMember(rDeputy, secretAllyId, rDeputy2.publicId, 'TRANSFER_LEADERSHIP');
    assert.equal(deputyTransferFail.ok, false);
    if (!deputyTransferFail.ok) assert.equal(deputyTransferFail.reason, 'LEADER_ONLY_ACTION');

    // 7. LEADER permissions: regenerate inviteCode (old fails, new works), toggle SECRET <-> PUBLIC, and TRANSFER_LEADERSHIP
    const regenRes = dispatchServerCommand({
      session: sLeader,
      rateLimiter: limiter,
      command: {
        type: 'ALLIANCE_UPDATE_IDENTITY',
        allianceId: secretAllyId,
        regenerateInviteCode: true,
        visibility: 'PUBLIC',
        packName: 'سرب الظلال المفتوح',
      },
    });
    assert.equal(regenRes.ok, true);
    if (!regenRes.ok) throw new Error('Leader update identity failed');
    const newInviteCode = reloadedSecret.inviteCode;
    assert.notEqual(newInviteCode, secretInviteCode, 'Regenerated inviteCode changed');
    assert.equal(getPublicAllianceDirectory().some((a) => a.id === secretAllyId), true, 'Toggled PUBLIC now visible');

    // Toggle back to SECRET and verify old code fails while new code passes
    const toggleBack = updateRealAllianceIdentity(rLeader, secretAllyId, { visibility: 'SECRET' });
    assert.equal(toggleBack.ok, true);
    assert.equal(getPublicAllianceDirectory().some((a) => a.id === secretAllyId), false);

    // Kick member via DEPUTY (allowed) then rejoin using NEW code (old rejected)
    const deputyKickMember = manageRealAllianceMember(rDeputy, secretAllyId, rMember.publicId, 'KICK');
    assert.equal(deputyKickMember.ok, true, 'DEPUTY can kick MEMBER');

    const oldCodeJoin = joinRealAlliance(rMember, '', { inviteCode: secretInviteCode });
    assert.equal(oldCodeJoin.ok, false, 'Old invite code rejected after regeneration');
    if (!oldCodeJoin.ok) assert.equal(oldCodeJoin.reason, 'INVALID_SECRET_INVITE_CODE');

    const condBlockedJoin = joinRealAlliance(rMember, '', { inviteCode: newInviteCode });
    assert.equal(condBlockedJoin.ok, false, 'Updated DEPUTY minPower condition enforced on rejoin');
    if (!condBlockedJoin.ok) assert.equal(condBlockedJoin.reason, 'JOIN_CONDITIONS_NOT_MET');

    rMember.dragons = [
      {
        ...rMember.dragons[0],
        rarity: 'LEGENDARY',
        level: 4,
        trainingLevel: 10,
      },
    ];
    const newCodeJoin = joinRealAlliance(rMember, '', { inviteCode: newInviteCode });
    assert.equal(newCodeJoin.ok, true, 'New invite code accepted once joinConditions met');

    // Transfer leadership from rLeader -> rDeputy via coordinator
    const transferRes = dispatchServerCommand({
      session: sLeader,
      rateLimiter: limiter,
      command: {
        type: 'ALLIANCE_MEMBER_ACTION',
        allianceId: secretAllyId,
        targetPublicId: rDeputy.publicId,
        action: 'TRANSFER_LEADERSHIP',
      },
    });
    assert.equal(transferRes.ok, true, 'Leader can transfer leadership to another member');
    assert.equal(reloadedSecret.leaderPublicId, rDeputy.publicId);
    assert.equal(reloadedSecret.memberRoles[rDeputy.publicId], 'LEADER');
    assert.equal(reloadedSecret.memberRoles[rLeader.publicId], 'DEPUTY');

    // Former leader (now DEPUTY) loses leader-only privileges; new leader retains them
    const oldLeaderRenameFail = updateRealAllianceIdentity(rLeader, secretAllyId, { packName: 'اسم مرفوض' });
    assert.equal(oldLeaderRenameFail.ok, false);
    if (!oldLeaderRenameFail.ok) assert.equal(oldLeaderRenameFail.reason, 'LEADER_ONLY_ACTION');

    const newLeaderRenameOk = updateRealAllianceIdentity(rDeputy, secretAllyId, { packName: 'سرب النخبة الجديد' });
    assert.equal(newLeaderRenameOk.ok, true);

    // New leader leaves -> highest-ranked member (DEPUTY) inherits leadership
    const leaveRes = leaveRealAlliance(rDeputy);
    assert.equal(leaveRes.ok, true);
    assert.equal(
      reloadedSecret.leaderPublicId === rLeader.publicId || reloadedSecret.leaderPublicId === rDeputy2.publicId,
      true,
      'Highest-ranked DEPUTY inherits leadership on leader leave'
    );
  } finally {
    clearPendingPersistTimerForTests();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  }
}

runSwarmDbSecretAndRbacTests();

export function runAntiInflationAndRealRankingsTests(): void {
  const tempDbPath = path.join(os.tmpdir(), `dragon_anti_inflation_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  configureDbFilePathForTests(tempDbPath);

  try {
    // 1. Progressive anti-inflation soft-cap damping with >= 25% floor & min 1
    const baseGain = applySoftCapDamping(100, 1200, 4500, 0);
    assert.equal(baseGain.finalGain, 100);
    assert.equal(baseGain.damped, false);

    const midHoard = applySoftCapDamping(100, 5400, 4500, 0); // 1.2x softCap -> 0.78
    assert.equal(midHoard.finalGain, 78);
    assert.equal(midHoard.damped, true);

    const heavyHoard = applySoftCapDamping(100, 20000, 4500, 15000); // >2.5x stock & daily -> 0.35 * 0.75 = 0.2625 -> 0.26
    assert.equal(heavyHoard.multiplier >= 0.25, true, 'Damping multiplier never drops below 25% floor');
    assert.equal(heavyHoard.finalGain >= 25, true);

    const tinyGain = applySoftCapDamping(1, 50000, 4500, 50000);
    assert.equal(tinyGain.finalGain, 1, 'Minimum gain is always at least 1 so player never feels stuck');

    // 2. Stars strict hard-currency gating in battle resolution
    const nowSec = Math.floor(Date.now() / 1000);
    const p1 = getOrSeedPlayer({
      actorKey: 'tg:300001',
      authMethod: 'telegram',
      tgId: 300001,
      publicId: toPublicPlayerId(300001),
      displayName: 'RankHero',
      avatarUrl: 'aqua',
      iat: nowSec,
      exp: nowSec + 3600,
    });
    const created = createRealAlliance(p1, {
      packName: 'سرب الترتيب الحقيقي',
      motto: 'تصنيف حقيقي',
      emblemId: 'phoenix_wing',
      visibility: 'PUBLIC',
    });
    assert.equal(created.ok, true);
    if (!created.ok) throw new Error('Alliance creation failed');

    const arenaNormal = validateAndResolveBattle({
      player: p1,
      alliance: created.alliance,
      mode: 'ARENA',
      rivalPower: 100,
      isStarEventActive: false,
    });
    assert.equal(arenaNormal.won, true);
    assert.equal(arenaNormal.rewardStars, 0, 'Routine Arena win mints 0 Stars outside Star Event');

    const arenaStarEvent = validateAndResolveBattle({
      player: p1,
      alliance: created.alliance,
      mode: 'ARENA',
      rivalPower: 100,
      isStarEventActive: true,
    });
    assert.equal(arenaStarEvent.won, true);
    assert.equal(arenaStarEvent.rewardStars, 2, 'Active Star Event Arena win mints 2 Stars');

    created.alliance.bossHp = 10;
    const bossKill = validateAndResolveBattle({
      player: p1,
      alliance: created.alliance,
      mode: 'ALLIANCE_BOSS',
      rivalPower: 100,
      isStarEventActive: true,
    });
    assert.equal(bossKill.won, true);
    assert.equal(bossKill.rewardStars, 0, 'Alliance Boss kill mints 0 Stars');

    // 3. Real leaderboard & public swarm directory expose real stats & zero inviteCode
    const db = getDb();
    const row = toPublicLeaderboardRow(p1, db.alliances);
    assert.equal(row.allianceName, 'سرب الترتيب الحقيقي');

    const dir = getPublicAllianceDirectory();
    assert.equal(dir.length, 1);
    assert.equal(dir[0].treasuryCorn, created.alliance.treasuryCorn);
    assert.equal(dir[0].bossLevel, created.alliance.bossLevel);
    assert.equal('inviteCode' in dir[0], false, 'Public swarm directory must never leak inviteCode');
  } finally {
    clearPendingPersistTimerForTests();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  }
}

runAntiInflationAndRealRankingsTests();
console.log('FIVE_LAYER_SECURITY_AND_REAL_DB_TESTS_OK');
