import {
  SecurityRateLimiter,
  type ServerDragon,
  type SessionPayload,
  toPublicLeaderboardRow,
  validateAndExecuteDonation,
  validateAndResolveBattle,
} from './security.ts';
import {
  bidOnRealAuction,
  buildAllianceMemberStateResponse,
  buyNowRealAuction,
  cancelRealAuction,
  claimBuyerRealAuction,
  claimSellerRealAuction,
  createRealAlliance,
  createRealAuction,
  getDb,
  getOrSeedPlayer,
  getPublicAllianceDirectory,
  joinRealAlliance,
  leaveRealAlliance,
  listPublicAuctions,
  manageRealAllianceMember,
  persistDbNow,
  postRealAllianceChatMessage,
  syncAndRolloverCompetition,
  syncPlayerFromClient,
  updateRealAllianceIdentity,
} from './db.ts';

export type ServerCommand =
  | { type: 'PLAYER_SYNC'; payload: Record<string, unknown> }
  | {
      type: 'ALLIANCE_CREATE';
      packName: string;
      motto?: string;
      emblemId?: string;
      visibility?: 'PUBLIC' | 'SECRET';
      joinConditions?: {
        minPower?: number;
        minDragons?: number;
        minDragonLevel?: number;
        autoAccept?: boolean;
      };
    }
  | { type: 'ALLIANCE_JOIN'; allianceId?: string; inviteCode?: string }
  | { type: 'ALLIANCE_LEAVE' }
  | {
      type: 'ALLIANCE_UPDATE_IDENTITY';
      allianceId: string;
      packName?: string;
      motto?: string;
      emblemId?: string;
      visibility?: 'PUBLIC' | 'SECRET';
      regenerateInviteCode?: boolean;
      joinConditions?: {
        minPower?: number;
        minDragons?: number;
        minDragonLevel?: number;
        autoAccept?: boolean;
      };
    }
  | {
      type: 'ALLIANCE_MEMBER_ACTION';
      allianceId: string;
      targetPublicId: string;
      action: 'PROMOTE' | 'DEMOTE' | 'KICK' | 'TRANSFER_LEADERSHIP';
    }
  | { type: 'ALLIANCE_CHAT'; allianceId: string; text: string }
  | { type: 'ALLIANCE_DONATE'; allianceId: string; kind: string; amount: number }
  | {
      type: 'BATTLE_RESOLVE';
      mode: 'ARENA' | 'ALLIANCE_BOSS';
      rivalPower: number;
      dragonIds?: string[];
      clientClaimedPower?: number;
    }
  | {
      type: 'AUCTION_LIST';
      dragon: ServerDragon;
      startCornPrice: number;
      buyNowStars: number;
      durationMinutes: number;
    }
  | {
      type: 'AUCTION_ACTION';
      auctionId: string;
      operation: 'BID' | 'BUY_NOW' | 'CANCEL' | 'CLAIM_BUYER' | 'CLAIM_SELLER';
    };

export interface ServerCommandReceipt {
  commandType: ServerCommand['type'];
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

export type ServerCommandResponse =
  | {
      ok: true;
      status: number;
      receipt: ServerCommandReceipt;
      data: Record<string, unknown>;
    }
  | {
      ok: false;
      status: number;
      reason: string;
      retryAfterSec?: number;
    };

export function dispatchServerCommand(params: {
  session: SessionPayload | undefined | null;
  command: ServerCommand | undefined | null;
  rateLimiter: SecurityRateLimiter;
  nowMs?: number;
}): ServerCommandResponse {
  const { session, command, rateLimiter } = params;
  const nowMs = params.nowMs ?? Date.now();

  if (!session || session.authMethod !== 'telegram' || !Number.isSafeInteger(session.tgId)) {
    return { ok: false, status: 401, reason: 'UNAUTHORIZED_TELEGRAM_SESSION' };
  }

  if (!command || typeof command !== 'object' || typeof command.type !== 'string') {
    return { ok: false, status: 400, reason: 'INVALID_CENTRAL_COMMAND' };
  }

  const db = getDb();
  const player = getOrSeedPlayer(session);
  const cornBefore = player.corn;
  const starsBefore = player.stars;
  const goldBefore = player.duckGold;

  const makeReceipt = (message: string): ServerCommandReceipt => ({
    commandType: command.type,
    playerPublicId: player.publicId,
    cornDelta: player.corn - cornBefore,
    starsDelta: player.stars - starsBefore,
    goldDelta: player.duckGold - goldBefore,
    playerCornAfter: player.corn,
    playerStarsAfter: player.stars,
    playerGoldAfter: player.duckGold,
    leaguePointsAfter: player.leaguePoints,
    message,
    verifiedAtMs: nowMs,
  });

  switch (command.type) {
    case 'PLAYER_SYNC': {
      const comp = syncPlayerFromClient(player, command.payload || {});
      const alliance = player.allianceId ? db.alliances[player.allianceId] : undefined;
      const leaderboard = Object.values(db.players)
        .map((p) => toPublicLeaderboardRow(p, db.alliances))
        .sort((a, b) => b.powerRating - a.powerRating)
        .slice(0, 30);

      return {
        ok: true,
        status: 200,
        receipt: makeReceipt('تمت مزامنة التقدم بنجاح'),
        data: {
          publicId: player.publicId,
          myAlliance: alliance ? buildAllianceMemberStateResponse(alliance) : null,
          alliances: getPublicAllianceDirectory(),
          auctions: listPublicAuctions(nowMs),
          leaderboard,
          competition: {
            cycleId: comp.cycleId,
            cycleNumber: comp.cycleNumber,
            startedAt: comp.startedAt,
            endsAt: comp.endsAt,
            activeEventIndex: comp.activeEventIndex,
            eventEndsAt: comp.eventEndsAt,
            participants: Object.entries(comp.scoresByPublicId)
              .map(([publicId, row]) => ({
                publicId,
                name: row.displayName,
                score: row.score,
                powerRating: row.powerRating,
              }))
              .sort((a, b) => b.score - a.score || b.powerRating - a.powerRating)
              .slice(0, 30),
            feedChallenges: leaderboard
              .slice()
              .sort((a, b) => b.totalFeeds - a.totalFeeds || b.powerRating - a.powerRating),
          },
        },
      };
    }

    case 'ALLIANCE_CREATE': {
      const result = createRealAlliance(player, {
        packName: command.packName,
        motto: command.motto,
        emblemId: command.emblemId,
        visibility: command.visibility === 'SECRET' ? 'SECRET' : 'PUBLIC',
        joinConditions: command.joinConditions,
      });
      if (!result.ok) {
        return { ok: false, status: result.status, reason: result.reason };
      }
      const isSecret = result.alliance.visibility === 'SECRET';
      return {
        ok: true,
        status: 200,
        receipt: makeReceipt(
          isSecret
            ? `تم تأسيس السرب السري "${result.alliance.packName}" (رمز الدعوة: ${result.alliance.inviteCode})`
            : `تم تأسيس تحالف "${result.alliance.packName}" رسمياً`
        ),
        data: {
          alliance: buildAllianceMemberStateResponse(result.alliance),
          alliances: getPublicAllianceDirectory(),
        },
      };
    }

    case 'ALLIANCE_JOIN': {
      const result = joinRealAlliance(player, String(command.allianceId || '').trim(), {
        inviteCode: typeof command.inviteCode === 'string' ? command.inviteCode : undefined,
      });
      if (!result.ok) {
        return { ok: false, status: result.status, reason: result.reason };
      }
      return {
        ok: true,
        status: 200,
        receipt: makeReceipt(`انضممت إلى تحالف "${result.alliance.packName}" بنجاح`),
        data: {
          alliance: buildAllianceMemberStateResponse(result.alliance),
          alliances: getPublicAllianceDirectory(),
        },
      };
    }

    case 'ALLIANCE_LEAVE': {
      const result = leaveRealAlliance(player);
      if (!result.ok) {
        return { ok: false, status: result.status, reason: result.reason };
      }
      return {
        ok: true,
        status: 200,
        receipt: makeReceipt('تمت مغادرة السرب وحفظ التغييرات'),
        data: {
          alliances: getPublicAllianceDirectory(),
        },
      };
    }

    case 'ALLIANCE_UPDATE_IDENTITY': {
      const result = updateRealAllianceIdentity(player, String(command.allianceId || '').trim(), {
        packName: command.packName,
        motto: command.motto,
        emblemId: command.emblemId,
        visibility:
          command.visibility === 'SECRET' || command.visibility === 'PUBLIC'
            ? command.visibility
            : undefined,
        regenerateInviteCode: Boolean(command.regenerateInviteCode),
        joinConditions: command.joinConditions,
      });
      if (!result.ok) {
        return { ok: false, status: result.status, reason: result.reason };
      }
      return {
        ok: true,
        status: 200,
        receipt: makeReceipt('تم تحديث هوية وإعدادات السرب بنجاح'),
        data: {
          alliance: buildAllianceMemberStateResponse(result.alliance),
          alliances: getPublicAllianceDirectory(),
        },
      };
    }

    case 'ALLIANCE_MEMBER_ACTION': {
      const targetPublicId = String(command.targetPublicId || '').trim();
      const action =
        command.action === 'PROMOTE' ||
        command.action === 'DEMOTE' ||
        command.action === 'KICK' ||
        command.action === 'TRANSFER_LEADERSHIP'
          ? command.action
          : null;
      if (!targetPublicId || !action) {
        return { ok: false, status: 400, reason: 'INVALID_MEMBER_ACTION' };
      }
      const result = manageRealAllianceMember(player, String(command.allianceId || '').trim(), targetPublicId, action);
      if (!result.ok) {
        return { ok: false, status: result.status, reason: result.reason };
      }
      return {
        ok: true,
        status: 200,
        receipt: makeReceipt(
          action === 'TRANSFER_LEADERSHIP'
            ? 'تم نقل قيادة السرب بنجاح'
            : action === 'PROMOTE'
              ? 'تمت ترقية العضو بنجاح'
              : action === 'DEMOTE'
                ? 'تم خفض رتبة العضو'
                : 'تم إبعاد العضو من السرب'
        ),
        data: {
          alliance: buildAllianceMemberStateResponse(result.alliance),
          alliances: getPublicAllianceDirectory(),
        },
      };
    }

    case 'ALLIANCE_CHAT': {
      const result = postRealAllianceChatMessage(
        player,
        String(command.allianceId || '').trim(),
        String(command.text || '')
      );
      if (!result.ok) {
        return { ok: false, status: result.status, reason: result.reason };
      }
      return {
        ok: true,
        status: 200,
        receipt: makeReceipt('تم إرسال الرسالة'),
        data: { messages: result.messages },
      };
    }

    case 'ALLIANCE_DONATE': {
      const allianceId = String(command.allianceId || '').trim();
      const result = validateAndExecuteDonation({
        player,
        alliance: db.alliances[allianceId],
        allianceId,
        kind: String(command.kind || 'SMALL_ENERGY').trim(),
        requestedAmount: Number(command.amount),
        rateLimiter,
        nowMs,
      });
      if (!result.ok) {
        return {
          ok: false,
          status: result.status,
          reason: result.reason,
          retryAfterSec: result.retryAfterSec,
        };
      }
      player.donatedEnergyTotal += result.vaultCornAdded;
      player.donatedTechTotal += Math.round(result.vaultCornAdded * 0.45);
      player.dailyActivityPoints += 15;
      persistDbNow();

      return {
        ok: true,
        status: 200,
        receipt: makeReceipt(`تم توثيق التبرع (+${result.vaultCornAdded} ⚡ لخزينة السرب)`),
        data: result,
      };
    }

    case 'BATTLE_RESOLVE': {
      const alliance = player.allianceId ? db.alliances[player.allianceId] : undefined;
      const activeComp = syncAndRolloverCompetition(nowMs);
      const outcome = validateAndResolveBattle({
        player,
        alliance,
        mode: command.mode === 'ALLIANCE_BOSS' ? 'ALLIANCE_BOSS' : 'ARENA',
        rivalPower: Number(command.rivalPower ?? 350),
        selectedDragonIds: Array.isArray(command.dragonIds)
          ? command.dragonIds.filter((id): id is string => typeof id === 'string').slice(0, 8)
          : undefined,
        clientClaimedPower:
          typeof command.clientClaimedPower === 'number' ? command.clientClaimedPower : undefined,
        isStarEventActive: activeComp.activeEventIndex === 0,
        nowMs,
      });
      persistDbNow();

      return {
        ok: true,
        status: 200,
        receipt: makeReceipt(
          outcome.won
            ? `انتصار موثق! +${outcome.rewardCorn} ⚡${outcome.rewardStars > 0 ? ` و +${outcome.rewardStars} ★` : ''}`
            : `انتهت الجولة — +${outcome.rewardCorn} ⚡`
        ),
        data: outcome,
      };
    }

    case 'AUCTION_LIST': {
      if (!command.dragon || typeof command.dragon !== 'object') {
        return { ok: false, status: 400, reason: 'MISSING_DRAGON' };
      }
      const result = createRealAuction(player, {
        dragon: command.dragon,
        startCornPrice: Number(command.startCornPrice ?? 0),
        buyNowStars: Number(command.buyNowStars ?? 0),
        durationMinutes: Number(command.durationMinutes ?? 60),
      });
      if (!result.ok) {
        return { ok: false, status: result.status, reason: result.reason };
      }
      player.corn = Math.max(0, player.corn - result.listingFee);
      persistDbNow();

      return {
        ok: true,
        status: 200,
        receipt: makeReceipt(`تم إدراج التنين في المزاد (رسوم الإدراج: -${result.listingFee} ⚡)`),
        data: {
          auction: result.auction,
          listingFee: result.listingFee,
          auctions: listPublicAuctions(nowMs),
        },
      };
    }

    case 'AUCTION_ACTION': {
      const auctionId = String(command.auctionId || '').trim();
      if (!auctionId) {
        return { ok: false, status: 400, reason: 'MISSING_AUCTION_ID' };
      }

      if (command.operation === 'BID') {
        const result = bidOnRealAuction(player, auctionId);
        if (!result.ok) return { ok: false, status: result.status, reason: result.reason };
        return {
          ok: true,
          status: 200,
          receipt: makeReceipt(`تم قبول المزايدة عند ${result.acceptedPrice.toLocaleString()} ⚡`),
          data: { ...result, auctions: listPublicAuctions(nowMs) },
        };
      }

      if (command.operation === 'BUY_NOW') {
        const result = buyNowRealAuction(player, auctionId);
        if (!result.ok) return { ok: false, status: result.status, reason: result.reason };
        return {
          ok: true,
          status: 200,
          receipt: makeReceipt(`تم الشراء الفوري مقابل ${result.buyNowStars} ★ واستلام التنين!`),
          data: { ...result, auctions: listPublicAuctions(nowMs) },
        };
      }

      if (command.operation === 'CANCEL') {
        const result = cancelRealAuction(player, auctionId);
        if (!result.ok) return { ok: false, status: result.status, reason: result.reason };
        return {
          ok: true,
          status: 200,
          receipt: makeReceipt(`تم إلغاء المزاد واسترجاع ${result.dragon.name}`),
          data: { ...result, auctions: listPublicAuctions(nowMs) },
        };
      }

      if (command.operation === 'CLAIM_BUYER') {
        const result = claimBuyerRealAuction(player, auctionId);
        if (!result.ok) return { ok: false, status: result.status, reason: result.reason };
        return {
          ok: true,
          status: 200,
          receipt: makeReceipt(`تم استلام التنين الفائز ${result.dragon.name}!`),
          data: { ...result, auctions: listPublicAuctions(nowMs) },
        };
      }

      if (command.operation === 'CLAIM_SELLER') {
        const result = claimSellerRealAuction(player, auctionId);
        if (!result.ok) return { ok: false, status: result.status, reason: result.reason };
        if (result.netCorn > 0) player.corn += result.netCorn;
        if (result.netStars > 0) player.stars += result.netStars;
        persistDbNow();

        const payoutText =
          result.settlementType === 'BUY_NOW' ? `+${result.netStars} ★` : `+${result.netCorn.toLocaleString()} ⚡`;
        return {
          ok: true,
          status: 200,
          receipt: makeReceipt(`تم استلام عائد المزاد: ${payoutText} (حرق ضريبي 8%: ${result.taxBurned})`),
          data: { ...result, auctions: listPublicAuctions(nowMs) },
        };
      }

      return { ok: false, status: 400, reason: 'UNSUPPORTED_AUCTION_OPERATION' };
    }

    default:
      return { ok: false, status: 400, reason: 'UNKNOWN_CENTRAL_COMMAND' };
  }
}
