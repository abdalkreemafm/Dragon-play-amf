import { Duck, EggItemType, GameState, RewardBundle } from '../types/game';
import {
  ACHIEVEMENTS_REGISTRY,
  ACTIVE_SEASON,
  BATTLE_PASS_LEVELS,
  DAILY_PASS_REWARDS,
  HEART_MILESTONES_REGISTRY,
  HONOR_PACKS_REGISTRY,
  LIVE_EVENTS_REGISTRY,
  PROMO_CODES_REGISTRY,
  RARITY_STYLE,
  SKIN_CATALOG,
  SOCIAL_TASKS_REGISTRY,
  STORE_PACKAGES,
  TOURNAMENT_MILESTONES,
  TREASURE_RACE_STEPS,
  WEEKEND_EVENTS,
  WHEEL_REWARDS_REGISTRY,
  formatCompactNumber,
  getFeedCost,
  getLeagueMeta,
} from '../data/gameData';
import {
  ECONOMY_LIMITS,
  getBarterEnergyForGoldCost,
  getBarterEnergyForStarsCost,
  getBarterStarsToEnergyPayout,
  getFirstUnlockedDragonIndex,
  getInstantSummonStarCost,
  getLevelRequiredFeeds,
  getPlayerTier,
  getTraderDealStarCost,
  grantRewardBundle,
  isDragonSlotLocked,
  normalizeDragonSlots,
} from '../utils/economyEngine';
import {
  CentralActionContext,
  CentralActionOutcome,
  CentralGameAction,
} from './types';
import {
  formatEarnedSummary,
  withBurnedEnergy,
  withBurnedStars,
  withEarnedEnergy,
  withEarnedStars,
} from './economyHelpers';

function reject(prev: GameState, message?: string): CentralActionOutcome {
  return {
    nextState: prev,
    receipt: {
      ok: false,
      stateChanged: false,
      message,
      sound: message ? 'error' : undefined,
      haptic: message ? 'error' : undefined,
    },
  };
}

export function reduceTasksArenaAction(
  prev: GameState,
  action: CentralGameAction,
  ctx: CentralActionContext
): CentralActionOutcome | null {
  const { nowTs } = ctx;

  switch (action.type) {
    case 'SPEND_ARENA_ENTRY': {
      if (prev.corn < action.cost) {
        return reject(prev, `تحتاج ${action.cost}⚡ كرسوم دخول للحلبة!`);
      }
      return {
        nextState: {
          ...prev,
          corn: prev.corn - action.cost,
          treasury: withBurnedEnergy(prev.treasury, action.cost),
        },
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -action.cost,
        },
      };
    }

    case 'REFUND_ARENA_ENTRY': {
      if (action.amount <= 0) return reject(prev);
      return {
        nextState: {
          ...prev,
          corn: prev.corn + action.amount,
          treasury: {
            ...prev.treasury,
            energyBurnedToday: Math.max(0, (prev.treasury.energyBurnedToday ?? 0) - action.amount),
          },
        },
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: action.amount,
          message: `تم إلغاء الجولة قبل بدايتها واسترداد ${action.amount}⚡.`,
        },
      };
    }

    case 'BATTLE_RESULT': {
      const activeGodPlunder = prev.godCards.some((g) => g.godKey === 'plunder' && g.owned);
      const plunderMult = activeGodPlunder && action.won ? 1.35 : 1;
      const eventMods = resolveSafeEventMods(prev.weekendEventIndex);
      const starEventActive = eventMods.starBonusMult > 1;
      const eventStarMult = action.won ? eventMods.starBonusMult : 1;
      const activeDragon = prev.ducks[prev.activeDuckIndex] ?? prev.ducks[0];
      const pharaohMult = action.won && activeDragon?.skin === 'pharaoh' ? 1.2 : 1;
      const royalMult = activeDragon?.skin === 'royal' ? 1.2 : 1;
      const winsUsed = prev.treasury.arenaFullWinsToday ?? 0;
      const capRatio =
        action.won && winsUsed >= ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS
          ? ECONOMY_LIMITS.ARENA_AFTER_CAP_RATIO
          : 1;
      const rawCorn = Math.max(
        15,
        Math.round(
          action.rewardCorn * plunderMult * pharaohMult * capRatio * eventMods.arenaEnergyMult
        )
      );
      const finalStars =
        action.won && starEventActive && action.rewardStars > 0
          ? Math.max(1, Math.round(action.rewardStars * eventStarMult * capRatio))
          : 0;
      const finalGold =
        action.gold > 0 ? Math.max(1, Math.round(action.gold * pharaohMult * capRatio)) : 0;
      const finalMedals =
        action.won && (action.rewardMedals ?? 0) > 0
          ? Math.max(1, Math.round((action.rewardMedals ?? 0) * capRatio))
          : 0;
      const prestigeMult = 1 + (prev.pack.talents?.prestige ?? 0) * 0.03;
      const finalLeaguePts = Math.round(action.leaguePts * prestigeMult);
      const finalXp = Math.round(action.xp * royalMult);

      const energyGrant = withEarnedEnergy(prev, rawCorn);
      const nextTreasury = withEarnedStars(energyGrant.treasury, finalStars);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + finalStars,
        duckGold: prev.duckGold + finalGold,
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + finalXp },
        treasury: {
          ...nextTreasury,
          arenaFullWinsToday: action.won
            ? Math.min(ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS + 99, winsUsed + 1)
            : winsUsed,
        },
        stats:
          finalMedals > 0 ? { ...prev.stats, medals: prev.stats.medals + finalMedals } : prev.stats,
        league: {
          ...prev.league,
          points: prev.league.points + finalLeaguePts,
          wins: action.won ? prev.league.wins + 1 : prev.league.wins,
          winStreak: action.won ? prev.league.winStreak + 1 : 0,
        },
        dailyTasks: prev.dailyTasks.map((dt) =>
          dt.id === 'dt_claims' && action.won
            ? { ...dt, progress: Math.min(dt.target, dt.progress + 1) }
            : dt
        ),
      };

      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: finalStars,
          actualGoldDelta: finalGold,
        },
      };
    }

    case 'RACE_RESULT': {
      const eventMods = resolveSafeEventMods(prev.weekendEventIndex);
      const activeDragon = prev.ducks[prev.activeDuckIndex] ?? prev.ducks[0];
      const pharaohMult = action.place <= 2 && activeDragon?.skin === 'pharaoh' ? 1.2 : 1;
      const royalMult = activeDragon?.skin === 'royal' ? 1.2 : 1;
      const winsUsed = prev.treasury.arenaFullWinsToday ?? 0;
      const isFullWinCounted = action.place <= 2;
      const capRatio =
        isFullWinCounted && winsUsed >= ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS
          ? ECONOMY_LIMITS.ARENA_AFTER_CAP_RATIO
          : 1;
      const rawCorn = Math.max(
        20,
        Math.round(action.rewardCorn * pharaohMult * capRatio * eventMods.arenaEnergyMult)
      );
      const starEventActive = eventMods.starBonusMult > 1;
      const finalStars =
        starEventActive && action.place <= 3 && action.rewardStars > 0
          ? Math.max(1, Math.round(action.rewardStars * eventMods.starBonusMult * capRatio))
          : 0;
      const finalXp = Math.round(action.xp * royalMult);
      const energyGrant = withEarnedEnergy(prev, rawCorn);
      const nextTreasury = withEarnedStars(energyGrant.treasury, finalStars);
      const prestigeMult = 1 + (prev.pack.talents?.prestige ?? 0) * 0.03;

      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + finalStars,
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + finalXp },
        treasury: {
          ...nextTreasury,
          arenaFullWinsToday: isFullWinCounted
            ? Math.min(ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS + 99, winsUsed + 1)
            : winsUsed,
        },
        league: {
          ...prev.league,
          points: prev.league.points + Math.round(action.leaguePts * prestigeMult),
          racesWon: action.place === 1 ? prev.league.racesWon + 1 : prev.league.racesWon,
        },
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: finalStars,
          message: `أنهيت السباق في المركز #${action.place}! +${cornDelta.toLocaleString()} طعام تنين${
            finalStars > 0 ? ` و +${finalStars} ★` : ''
          }`,
        },
      };
    }

    case 'CLAIM_DAILY_LEAGUE': {
      if (prev.league.dailyClaimed) {
        return reject(prev, 'تم استلام مكافأة الدوري اليومية بالفعل!');
      }
      const meta = getLeagueMeta(prev.league.points);
      const energyGrant = withEarnedEnergy(prev, meta.dailyCorn);
      const nextTreasury = withEarnedStars(energyGrant.treasury, meta.dailyStars);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + meta.dailyStars,
        duckGold: prev.duckGold + meta.dailyGold,
        treasury: nextTreasury,
        league: { ...prev.league, dailyClaimed: true },
      };
      const summary = formatEarnedSummary({
        corn: nextState.corn - prev.corn,
        stars: meta.dailyStars,
        gold: meta.dailyGold,
      });
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: nextState.corn - prev.corn,
          actualStarsDelta: meta.dailyStars,
          actualGoldDelta: meta.dailyGold,
          sound: 'claim',
          haptic: 'success',
          message: `تم استلام مكافأة ${meta.nameAr}! (${summary})`,
        },
      };
    }

    case 'ROTATE_WEEKEND_EVENT': {
      return {
        nextState: {
          ...prev,
          weekendEventIndex: (prev.weekendEventIndex + 1) % WEEKEND_EVENTS.length,
        },
        receipt: { ok: true, stateChanged: true },
      };
    }

    case 'ACTIVATE_GOD': {
      const god = prev.godCards.find((g) => g.id === action.godId);
      if (!god || god.owned) return reject(prev);
      if (action.payWith === 'gold' && prev.duckGold < god.goldCost) {
        return reject(prev, `تحتاج ${god.goldCost} من ذهب التنانين 💎 لتفعيل ${god.name}!`);
      }
      if (action.payWith === 'stars' && prev.stars < god.starCost) {
        return reject(prev, `تحتاج ${god.starCost} نجمة ★ لتفعيل ${god.name}!`);
      }
      const nextState: GameState = {
        ...prev,
        duckGold: action.payWith === 'gold' ? prev.duckGold - god.goldCost : prev.duckGold,
        stars: action.payWith === 'stars' ? prev.stars - god.starCost : prev.stars,
        treasury:
          action.payWith === 'stars' ? withBurnedStars(prev.treasury, god.starCost) : prev.treasury,
        godCards: prev.godCards.map((g) =>
          g.id === action.godId ? { ...g, owned: true, active: true } : g
        ),
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualStarsDelta: action.payWith === 'stars' ? -god.starCost : 0,
          actualGoldDelta: action.payWith === 'gold' ? -god.goldCost : 0,
          sound: 'godConfirm',
          haptic: 'success',
          message: `تم تفعيل ${god.name} بشكل دائم!`,
        },
      };
    }

    case 'BUY_STORE_PACKAGE': {
      const pkg = STORE_PACKAGES.find((p) => p.id === action.packageId);
      if (!pkg) return reject(prev);
      const reserveShare = pkg.priceUsd * 0.5;
      const opsShare = pkg.priceUsd * 0.5;
      const tier = getPlayerTier(prev);
      let extraDucks = prev.ducks;
      let nextActiveIdx = prev.activeDuckIndex;

      if (pkg.legendaryDragon) {
        const reqFeeds = getLevelRequiredFeeds(3);
        const leg: Duck = {
          id: `dragon_store_${nowTs}`,
          name: pkg.legendaryDragon.name,
          skin: pkg.legendaryDragon.skin,
          rarity: pkg.legendaryDragon.rarity,
          level: 3,
          maxLevel: 5,
          customLevel: 0,
          dmd: 0,
          dmdStored: 0,
          slotIndex: null,
          feedCost: getFeedCost(3, pkg.legendaryDragon.rarity, tier, 0),
          feedsProgress: 0,
          feedsRequired: reqFeeds,
          feedClicksSinceReset: 0,
          costResetEndsAt: null,
          levelFeedsCompleted: false,
          breedingEndsAt: null,
          breedingNextLevel: null,
          lastBreedingEggAt: null,
          staked: false,
          stakeRatePerHour: 0,
          sizeTier: 'NORMAL',
          gear: pkg.legendaryDragon.gear,
          aura: pkg.legendaryDragon.aura,
          skillLevel: 3,
          trainingLevel: 0,
          powerRating: RARITY_STYLE.LEGENDARY.basePower + 80,
          unlockedAt: nowTs,
        };
        extraDucks = normalizeDragonSlots([...prev.ducks, leg], prev.unlockedSlots);
        const legIdx = extraDucks.findIndex((d) => d.id === leg.id);
        nextActiveIdx =
          legIdx >= 0 && !isDragonSlotLocked(extraDucks[legIdx], prev.unlockedSlots)
            ? legIdx
            : getFirstUnlockedDragonIndex(extraDucks, prev.unlockedSlots);
      }

      const energyGrant = withEarnedEnergy(prev, pkg.energyReward, true);
      const nextTreasury = withEarnedStars(energyGrant.treasury, pkg.starsReward);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + pkg.starsReward,
        ducks: extraDucks,
        activeDuckIndex: nextActiveIdx,
        eggQueue: [...pkg.eggsReward, ...prev.eggQueue],
        treasury: {
          ...nextTreasury,
          reserveUsd: nextTreasury.reserveUsd + reserveShare,
          opsUsd: nextTreasury.opsUsd + opsShare,
          storeRevenueUsd: nextTreasury.storeRevenueUsd + pkg.priceUsd,
          totalPurchases: nextTreasury.totalPurchases + 1,
        },
        stats: {
          ...prev.stats,
          autoMergeBoosters:
            prev.stats.autoMergeBoosters + (pkg.id === 'pkg_rare_hatchery' ? 1 : 0),
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: nextState.corn - prev.corn,
          actualStarsDelta: pkg.starsReward,
          sound: 'chestOpen',
          message: `تم الشراء بنجاح! +$${reserveShare.toFixed(2)} إلى خزانة المجتمع والجوائز (50%)!`,
        },
      };
    }

    case 'WATCH_REWARDED_AD': {
      if (action.kind === 'stars') {
        return reject(prev, 'النجوم عملة صعبة تأتي من الشحن والأحداث الخاصة فقط.');
      }
      if (prev.treasury.adsWatchedToday >= prev.treasury.maxAdsPerDay) {
        return reject(
          prev,
          `وصلت للحد اليومي (${prev.treasury.maxAdsPerDay}/${prev.treasury.maxAdsPerDay}) للإعلانات الاختيارية!`
        );
      }
      const adRevenue = 0.04;
      const reserveShare = adRevenue * 0.5;
      const opsShare = adRevenue * 0.5;
      const energyGrant =
        action.kind === 'energy'
          ? withEarnedEnergy(prev, ECONOMY_LIMITS.AD_ENERGY_REWARD)
          : { corn: prev.corn, finalGain: 0, damped: false, treasury: prev.treasury };

      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        eggQueue: action.kind === 'eggs' ? ['egg_1', ...prev.eggQueue] : prev.eggQueue,
        treasury: {
          ...energyGrant.treasury,
          reserveUsd: energyGrant.treasury.reserveUsd + reserveShare,
          opsUsd: energyGrant.treasury.opsUsd + opsShare,
          adRevenueUsd: energyGrant.treasury.adRevenueUsd + adRevenue,
          adsWatchedToday: energyGrant.treasury.adsWatchedToday + 1,
        },
      };
      const cornDelta = nextState.corn - prev.corn;
      const label =
        action.kind === 'energy'
          ? `+${cornDelta} طعام تنين`
          : `+${ECONOMY_LIMITS.AD_EGGS_REWARD} بيضة تنين`;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          sound: 'claim',
          message: `تمت المكافأة: ${label}`,
        },
      };
    }

    case 'SELL_OWN_DRAGON': {
      const soldDragon = prev.ducks.find((d) => d.id === action.duckId);
      if (!soldDragon || prev.ducks.length <= 1) return reject(prev);
      const remaining = normalizeDragonSlots(
        prev.ducks.filter((d) => d.id !== action.duckId),
        prev.unlockedSlots
      );
      const energyGrant = withEarnedEnergy(prev, action.cornPrice);
      const safeIdx = Math.min(prev.activeDuckIndex, Math.max(0, remaining.length - 1));
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        treasury: energyGrant.treasury,
        ducks: remaining,
        activeDuckIndex: isDragonSlotLocked(remaining[safeIdx], prev.unlockedSlots)
          ? getFirstUnlockedDragonIndex(remaining, prev.unlockedSlots)
          : safeIdx,
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          sound: 'claim',
          message: `تم بيع التنين مقابل ${formatCompactNumber(cornDelta)} طعام تنين!`,
        },
      };
    }

    case 'BARTER_TRADE': {
      const tier = getPlayerTier(prev);
      const energyPayout = getBarterStarsToEnergyPayout(tier);
      const goldEnergyCost = getBarterEnergyForGoldCost(tier);

      if (action.tradeType === 'CORN_TO_STARS') {
        return reject(prev, 'النجوم عملة صعبة من الشحن والأحداث فقط ولا تُشترى بطعام التنين.');
      }

      if (action.tradeType === 'STARS_TO_CORN') {
        if (prev.stars < 10) return reject(prev, 'الرصيد غير كافٍ لإتمام المقايضة.');
        const energyGrant = withEarnedEnergy(prev, energyPayout, true);
        const nextState: GameState = {
          ...prev,
          stars: prev.stars - 10,
          corn: energyGrant.corn,
          treasury: withBurnedStars(energyGrant.treasury, 10),
        };
        const cornDelta = nextState.corn - prev.corn;
        return {
          nextState,
          receipt: {
            ok: true,
            stateChanged: true,
            actualCornDelta: cornDelta,
            actualStarsDelta: -10,
            sound: 'claim',
            message: `تمت المقايضة: +${cornDelta.toLocaleString()} طعام تنين مقابل 10 ★!`,
          },
        };
      }

      if ((prev.treasury.barterGoldToday ?? 0) >= ECONOMY_LIMITS.MAX_DAILY_BARTER_GOLD) {
        return reject(prev, 'اكتمل الحد اليومي لمقايضة الذهب!');
      }
      if (prev.corn < goldEnergyCost) {
        return reject(prev, `تحتاج ${goldEnergyCost.toLocaleString()} طعام تنين!`);
      }
      const nextTreasury = withBurnedEnergy(prev.treasury, goldEnergyCost);
      const nextState: GameState = {
        ...prev,
        corn: prev.corn - goldEnergyCost,
        duckGold: prev.duckGold + 12,
        treasury: { ...nextTreasury, barterGoldToday: (nextTreasury.barterGoldToday ?? 0) + 1 },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -goldEnergyCost,
          actualGoldDelta: 12,
          sound: 'claim',
          message: `تمت المقايضة: +12 ذهب 💎 مقابل ${goldEnergyCost.toLocaleString()} طاقة!`,
        },
      };
    }

    case 'BUY_TRADER_DEAL': {
      const dealCost = getTraderDealStarCost(getPlayerTier(prev));
      if (prev.stars < dealCost) {
        return reject(prev, `تحتاج ${dealCost} ★ لإتمام صفقة التاجر!`);
      }
      const nextState: GameState = {
        ...prev,
        stars: prev.stars - dealCost,
        treasury: withBurnedStars(prev.treasury, dealCost),
        eggQueue: ['cornucopia', 'chalice', 'egg_3', 'egg_2', ...prev.eggQueue],
        stats: { ...prev.stats, traderDeals: prev.stats.traderDeals + 1 },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualStarsDelta: -dealCost,
          sound: 'chestOpen',
          haptic: 'success',
          message: 'تمت الصفقة! وصل قرن الوفرة والكأس وبيضتان إلى قائمة انتظار البيض.',
        },
      };
    }

    case 'CLAIM_DAILY_TASK': {
      const task = prev.dailyTasks.find((t) => t.id === action.taskId);
      if (!task || task.claimed || task.progress < task.target) return reject(prev);
      const energyGrant = withEarnedEnergy(prev, task.rewardEnergy);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + task.rewardStars,
        treasury: withEarnedStars(energyGrant.treasury, task.rewardStars),
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 30 },
        dailyTasks: prev.dailyTasks.map((t) =>
          t.id === action.taskId ? { ...t, claimed: true } : t
        ),
        stats: { ...prev.stats, totalTasksClaimed: prev.stats.totalTasksClaimed + 1 },
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: task.rewardStars,
          sound: 'claim',
          haptic: 'success',
          message: `تم استلام مكافأة المهمة (+${task.rewardStars} ★ و +${cornDelta} طاقة)!`,
        },
      };
    }

    case 'CLAIM_DAILY_LEVEL_REWARD': {
      if (prev.claimedDailyLevelRewards.includes(action.rewardId)) return reject(prev);
      const completedTasksCount = prev.dailyTasks.filter((t) => t.claimed).length;
      const curTier = getPlayerTier(prev);
      const unlocked =
        action.rewardId === 1 ? completedTasksCount >= 2 : prev.dmdTotal >= 0.5 || curTier >= 3;
      if (!unlocked) {
        return reject(
          prev,
          action.rewardId === 1
            ? 'أكمل واستلم مهمتين يوميتين أولاً لفتح هذه الجائزة!'
            : 'اجمع 0.50 AMF أو بلُغ الرتبة 3 لفتح هذه الجائزة!'
        );
      }
      const energyGrant = withEarnedEnergy(prev, action.cornReward);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        treasury: energyGrant.treasury,
        eggQueue:
          action.eggsReward > 0
            ? [...prev.eggQueue, ...Array.from({ length: action.eggsReward }, () => 'egg_1' as EggItemType)]
            : prev.eggQueue,
        claimedDailyLevelRewards: [...prev.claimedDailyLevelRewards, action.rewardId],
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          sound: 'chestOpen',
          haptic: 'success',
          message: `تم استلام مكافأة المرحلة (+${cornDelta}⚡${
            action.eggsReward > 0 ? ` و +${action.eggsReward} بيضة` : ''
          })!`,
        },
      };
    }

    case 'CLAIM_DAILY_PASS_DAY': {
      if (prev.stats.dailyPassClaimedToday) {
        return reject(prev, 'تم استلام مكافأة اليوم بالفعل!');
      }
      const currentDay = Math.min(7, Math.max(1, prev.stats.dailyPassDay || 1));
      const dayConfig = DAILY_PASS_REWARDS[currentDay - 1] ?? DAILY_PASS_REWARDS[0];
      const granted = grantRewardBundle(prev, dayConfig.reward, { applySoftCap: true }).nextState;
      const nextState: GameState = {
        ...granted,
        stats: { ...granted.stats, dailyPassClaimedToday: true },
      };
      const cornDelta = nextState.corn - prev.corn;
      const starsDelta = nextState.stars - prev.stars;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: starsDelta,
          sound: 'chestOpen',
          haptic: 'success',
          message: `تم استلام ${dayConfig.titleAr} (${formatEarnedSummary({
            corn: cornDelta,
            stars: starsDelta,
            gold: nextState.duckGold - prev.duckGold,
          }) || 'مكتمل'})!`,
        },
      };
    }

    case 'UNLOCK_BATTLE_PASS_PREMIUM': {
      if (prev.battlePass.premiumUnlocked) return reject(prev);
      const cost = ACTIVE_SEASON.premiumFallbackStarsCost;
      if (prev.stars < cost) {
        return reject(prev, `تحتاج ${cost} ★ لتفعيل المسار الملكي!`);
      }
      const nextState: GameState = {
        ...prev,
        stars: prev.stars - cost,
        treasury: withBurnedStars(prev.treasury, cost),
        battlePass: { ...prev.battlePass, premiumUnlocked: true },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualStarsDelta: -cost,
          sound: 'godConfirm',
          haptic: 'success',
          message: `👑 تم تفعيل المسار الملكي لـ ${ACTIVE_SEASON.nameAr}!`,
        },
      };
    }

    case 'CLAIM_BATTLE_PASS_REWARD': {
      const meta = BATTLE_PASS_LEVELS.find((l) => l.level === action.level);
      if (!meta) return reject(prev);
      let nextState: GameState;
      if (action.track === 'FREE') {
        if (prev.battlePass.claimedFree.includes(action.level)) return reject(prev);
        const energyGrant =
          meta.freeType === 'corn'
            ? withEarnedEnergy(prev, meta.freeAmount)
            : { corn: prev.corn, finalGain: 0, damped: false, treasury: prev.treasury };
        const nextTreasury =
          meta.freeType === 'stars'
            ? withEarnedStars(energyGrant.treasury, meta.freeAmount)
            : energyGrant.treasury;
        nextState = {
          ...prev,
          corn: energyGrant.corn,
          stars: meta.freeType === 'stars' ? prev.stars + meta.freeAmount : prev.stars,
          treasury: nextTreasury,
          eggQueue:
            meta.freeType === 'eggs'
              ? [...prev.eggQueue, ...Array.from({ length: meta.freeAmount }, () => 'egg_2' as EggItemType)]
              : prev.eggQueue,
          battlePass: {
            ...prev.battlePass,
            claimedFree: [...prev.battlePass.claimedFree, action.level],
          },
        };
      } else {
        if (
          !prev.battlePass.premiumUnlocked ||
          prev.battlePass.claimedPremium.includes(action.level)
        ) {
          return reject(prev);
        }
        let extraDucks = prev.ducks;
        if (meta.premiumType === 'duck') {
          const bpDragon: Duck = {
            id: `dragon_bp_${nowTs}`,
            name: 'التنين الإمبراطوري الأسطوري',
            skin: 'royal',
            rarity: 'LEGENDARY',
            level: 1,
            maxLevel: 5,
            customLevel: 0,
            dmd: 0,
            dmdStored: 0,
            slotIndex: null,
            feedCost: getFeedCost(1, 'LEGENDARY', getPlayerTier(prev), 0),
            feedsProgress: 0,
            feedsRequired: getLevelRequiredFeeds(1),
            feedClicksSinceReset: 0,
            costResetEndsAt: null,
            levelFeedsCompleted: false,
            breedingEndsAt: null,
            breedingNextLevel: null,
            lastBreedingEggAt: null,
            staked: false,
            stakeRatePerHour: 0,
            sizeTier: 'NORMAL',
            skillLevel: 3,
            trainingLevel: 0,
            powerRating: 750,
            unlockedAt: nowTs,
          };
          extraDucks = normalizeDragonSlots([...prev.ducks, bpDragon], prev.unlockedSlots);
        }
        nextState = {
          ...prev,
          stars: meta.premiumType === 'stars' ? prev.stars + meta.premiumAmount : prev.stars,
          duckGold: meta.premiumType === 'gold' ? prev.duckGold + meta.premiumAmount : prev.duckGold,
          treasury:
            meta.premiumType === 'stars'
              ? withEarnedStars(prev.treasury, meta.premiumAmount)
              : prev.treasury,
          ducks: extraDucks,
          stats:
            meta.premiumType === 'boost'
              ? {
                  ...prev.stats,
                  autoMergeBoosters: prev.stats.autoMergeBoosters + meta.premiumAmount,
                  hammerBoosters: prev.stats.hammerBoosters + 1,
                }
              : prev.stats,
          battlePass: {
            ...prev.battlePass,
            claimedPremium: [...prev.battlePass.claimedPremium, action.level],
          },
        };
      }
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: nextState.corn - prev.corn,
          actualStarsDelta: nextState.stars - prev.stars,
          actualGoldDelta: nextState.duckGold - prev.duckGold,
          sound: 'claim',
          haptic: 'success',
          message: `تم استلام جائزة المستوى ${action.level} من تذكرة الموسم!`,
        },
      };
    }

    case 'CLAIM_TOURNAMENT_MILESTONE': {
      const milestone = TOURNAMENT_MILESTONES.find((m) => m.score === action.scoreThreshold);
      if (
        !milestone ||
        prev.tournament.score < milestone.score ||
        prev.tournament.claimedMilestones.includes(action.scoreThreshold)
      ) {
        return reject(prev);
      }
      const granted = grantRewardBundle(prev, milestone.reward, { applySoftCap: true }).nextState;
      const nextState: GameState = {
        ...granted,
        tournament: {
          ...granted.tournament,
          claimedMilestones: [...granted.tournament.claimedMilestones, action.scoreThreshold],
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: nextState.corn - prev.corn,
          actualStarsDelta: nextState.stars - prev.stars,
          actualGoldDelta: nextState.duckGold - prev.duckGold,
          sound: 'chestOpen',
          haptic: 'success',
          message: `تم استلام جائزة البطولة الكبرى (${milestone.labelAr})!`,
        },
      };
    }

    case 'CLAIM_TREASURE_STEP': {
      const step = TREASURE_RACE_STEPS.find((s) => s.step === action.stepNumber);
      if (!step || prev.claimedTreasureSteps.includes(action.threshold)) return reject(prev);
      const granted = grantRewardBundle(prev, step.reward, { applySoftCap: true }).nextState;
      const nextState: GameState = {
        ...granted,
        claimedTreasureSteps: [...granted.claimedTreasureSteps, action.threshold],
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: nextState.corn - prev.corn,
          actualStarsDelta: nextState.stars - prev.stars,
          actualGoldDelta: nextState.duckGold - prev.duckGold,
          sound: 'chestOpen',
          haptic: 'success',
          message: `تم استلام مكافأة ${step.titleAr} (${step.rewardLabelAr})!`,
        },
      };
    }

    case 'CLAIM_HONOR_PACK': {
      const pack = HONOR_PACKS_REGISTRY.find((h) => h.id === action.packId);
      if (!pack || prev.claimedHonorPacks.includes(action.packId)) return reject(prev);
      if (prev.stats.honorLetters < pack.costLetters) {
        return reject(prev, 'رسائل الشرف غير كافية!');
      }
      const deducted: GameState = {
        ...prev,
        stats: { ...prev.stats, honorLetters: prev.stats.honorLetters - pack.costLetters },
        claimedHonorPacks: [...prev.claimedHonorPacks, action.packId],
      };
      const nextState = grantRewardBundle(deducted, pack.reward, { applySoftCap: true }).nextState;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: nextState.corn - prev.corn,
          actualStarsDelta: nextState.stars - prev.stars,
          actualGoldDelta: nextState.duckGold - prev.duckGold,
          sound: 'claim',
          haptic: 'success',
          message: `تم استلام ${pack.titleAr} (${pack.rewardDescAr})!`,
        },
      };
    }

    case 'CLAIM_ACHIEVEMENT': {
      const ach = ACHIEVEMENTS_REGISTRY.find((a) => a.id === action.id);
      if (!ach || prev.claimedAchievements.includes(action.id)) return reject(prev);
      const granted = grantRewardBundle(prev, ach.reward, { applySoftCap: true }).nextState;
      const nextState: GameState = {
        ...granted,
        claimedAchievements: [...granted.claimedAchievements, action.id],
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: nextState.corn - prev.corn,
          actualStarsDelta: nextState.stars - prev.stars,
          actualGoldDelta: nextState.duckGold - prev.duckGold,
          sound: 'claim',
          haptic: 'success',
          message: `تم استلام إنجاز "${ach.titleAr}" (${ach.rewardLabelAr})!`,
        },
      };
    }

    case 'CLAIM_HEART_MILESTONE': {
      const milestone = HEART_MILESTONES_REGISTRY.find((m) => m.targetHearts === action.threshold);
      if (!milestone || prev.claimedHeartMilestones.includes(action.threshold)) return reject(prev);
      const granted = grantRewardBundle(prev, milestone.reward, { applySoftCap: true }).nextState;
      const nextState: GameState = {
        ...granted,
        claimedHeartMilestones: [...granted.claimedHeartMilestones, action.threshold],
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: nextState.corn - prev.corn,
          actualStarsDelta: nextState.stars - prev.stars,
          actualGoldDelta: nextState.duckGold - prev.duckGold,
          sound: 'claim',
          haptic: 'success',
          message: `تم استلام مكافأة القلوب (${milestone.rewardLabelAr})!`,
        },
      };
    }

    case 'CLAIM_SOCIAL': {
      const soc = SOCIAL_TASKS_REGISTRY.find((s) => s.id === action.id);
      if (!soc || prev.claimedSocials.includes(action.id)) return reject(prev);
      const granted = grantRewardBundle(prev, soc.reward, { applySoftCap: true }).nextState;
      const nextState: GameState = {
        ...granted,
        claimedSocials: [...granted.claimedSocials, action.id],
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: nextState.corn - prev.corn,
          actualStarsDelta: nextState.stars - prev.stars,
          sound: 'claim',
          message: `تم التحقق! ${soc.rewardDescAr}`,
        },
      };
    }

    case 'INVITE_FRIEND_SIM': {
      const usedInvites = prev.treasury.invitesClaimedToday ?? 0;
      if (usedInvites >= ECONOMY_LIMITS.MAX_DAILY_INVITE_CLAIMS) {
        return reject(
          prev,
          `وصلت للحد اليومي لدعوات الأصدقاء (${ECONOMY_LIMITS.MAX_DAILY_INVITE_CLAIMS}/${ECONOMY_LIMITS.MAX_DAILY_INVITE_CLAIMS})!`
        );
      }
      const rawCorn = action.premium ? 320 : 120;
      const goldBonus = action.premium ? 2 : 0;
      const medalsBonus = action.premium ? 15 : 5;
      const energyGrant = withEarnedEnergy(prev, rawCorn);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        duckGold: prev.duckGold + goldBonus,
        stats: { ...prev.stats, medals: prev.stats.medals + medalsBonus },
        treasury: { ...energyGrant.treasury, invitesClaimedToday: usedInvites + 1 },
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualGoldDelta: goldBonus,
          sound: 'claim',
          message: action.premium
            ? `+${cornDelta} طعام تنين و +${goldBonus} 💎 و +${medalsBonus} 🏅!`
            : `+${cornDelta} طعام تنين و +${medalsBonus} 🏅 من دعوة صديق!`,
        },
      };
    }

    case 'INSTANT_SUMMON_DRAGON': {
      const cost = getInstantSummonStarCost(action.rarity, getPlayerTier(prev));
      if (prev.stars < cost) {
        return reject(prev, `تحتاج ${cost} ★ للاستدعاء الفوري!`);
      }
      const newDragon: Duck = {
        id: `dragon_inst_${nowTs}`,
        name: action.rarity === 'RARE' ? 'تنين الرمال الفرعوني' : 'تنين الجحيم اليقطيني',
        skin: action.rarity === 'RARE' ? 'pharaoh' : 'pumpkin',
        rarity: action.rarity,
        level: 1,
        maxLevel: 5,
        customLevel: 0,
        dmd: 0,
        dmdStored: 0,
        slotIndex: null,
        feedCost: getFeedCost(1, action.rarity, getPlayerTier(prev), 0),
        feedsProgress: 0,
        feedsRequired: getLevelRequiredFeeds(1),
        feedClicksSinceReset: 0,
        costResetEndsAt: null,
        levelFeedsCompleted: false,
        breedingEndsAt: null,
        breedingNextLevel: null,
        lastBreedingEggAt: null,
        staked: false,
        stakeRatePerHour: 0,
        sizeTier: 'NORMAL',
        skillLevel: 2,
        trainingLevel: 0,
        powerRating: RARITY_STYLE[action.rarity].basePower + 25,
        unlockedAt: nowTs,
      };
      const normalized = normalizeDragonSlots([...prev.ducks, newDragon], prev.unlockedSlots);
      const newIdx = normalized.findIndex((d) => d.id === newDragon.id);
      const newDragonLocked = newIdx >= 0 && isDragonSlotLocked(normalized[newIdx], prev.unlockedSlots);
      const nextActiveIdx =
        newIdx >= 0 && !newDragonLocked
          ? newIdx
          : getFirstUnlockedDragonIndex(normalized, prev.unlockedSlots);
      const nextState: GameState = {
        ...prev,
        stars: prev.stars - cost,
        treasury: withBurnedStars(prev.treasury, cost),
        ducks: normalized,
        activeDuckIndex: nextActiveIdx,
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualStarsDelta: -cost,
          sound: 'chestOpen',
          haptic: 'success',
          message: newDragonLocked
            ? `تم استدعاء تنين ${RARITY_STYLE[action.rarity].labelAr} في الخانة ${newIdx + 1} (مقفلة — افتح الخانة لاستخدامه)!`
            : `تم استدعاء تنين ${RARITY_STYLE[action.rarity].labelAr} فوري!`,
        },
      };
    }

    case 'FLIP_COIN': {
      const pack = prev.flipCoins.find((p) => p.id === action.packId);
      if (!pack || pack.count <= 0) return reject(prev);
      const pickedSkin = pack.possibleSkins[Math.floor(Math.random() * pack.possibleSkins.length)];
      const updatedPacks = prev.flipCoins.map((p) => {
        if (p.id !== action.packId) return p;
        const nextUnlocked = p.unlockedSkins.includes(pickedSkin)
          ? p.unlockedSkins
          : [...p.unlockedSkins, pickedSkin];
        return { ...p, count: p.count - 1, unlockedSkins: nextUnlocked };
      });
      const updatedDucks = prev.ducks.map((d, idx) =>
        idx === prev.activeDuckIndex
          ? { ...d, skin: pickedSkin, name: SKIN_CATALOG[pickedSkin].name }
          : d
      );
      const nextSkins = prev.unlockedSkins.includes(pickedSkin)
        ? prev.unlockedSkins
        : [...prev.unlockedSkins, pickedSkin];
      return {
        nextState: {
          ...prev,
          flipCoins: updatedPacks,
          ducks: updatedDucks,
          unlockedSkins: nextSkins,
        },
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'chestOpen',
          extra: { pickedSkin },
        },
      };
    }

    case 'SPIN_WHEEL_PREPARE': {
      if (action.mega && prev.stars < 100) return reject(prev, 'تحتاج 100 ★ لعجلة الحظ الكبرى!');
      if (!action.mega && prev.stats.medals < 100) return reject(prev, 'تحتاج 100 وسام 🏅 للدوران!');

      const segIdx = Math.floor(Math.random() * WHEEL_REWARDS_REGISTRY.length);
      const seg = WHEEL_REWARDS_REGISTRY[segIdx];
      const mult = action.mega ? 5 : 1;
      const bundle: RewardBundle = {
        corn: seg.reward.corn ? seg.reward.corn * mult : undefined,
        stars: seg.reward.stars ? seg.reward.stars * mult : undefined,
        duckGold: seg.reward.duckGold ? seg.reward.duckGold * mult : undefined,
        medals: seg.reward.medals ? seg.reward.medals * mult : undefined,
        eggs: seg.reward.eggs
          ? Array.from({ length: action.mega ? 3 : 1 }, () => seg.reward.eggs!).flat()
          : undefined,
      };
      const nextState: GameState = {
        ...prev,
        stars: action.mega ? prev.stars - 100 : prev.stars,
        treasury: action.mega ? withBurnedStars(prev.treasury, 100) : prev.treasury,
        stats: {
          ...prev.stats,
          medals: !action.mega ? prev.stats.medals - 100 : prev.stats.medals,
          wheelSpins: prev.stats.wheelSpins + 1,
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualStarsDelta: action.mega ? -100 : 0,
          extra: {
            segmentIndex: segIdx,
            label: action.mega ? `${seg.label} (×${mult})` : seg.label,
            bundle,
          },
        },
      };
    }

    case 'SPIN_WHEEL_COMMIT': {
      const nextState = grantRewardBundle(prev, action.bundle, { applySoftCap: true }).nextState;
      const cornDelta = nextState.corn - prev.corn;
      const starsDelta = nextState.stars - prev.stars;
      const goldDelta = nextState.duckGold - prev.duckGold;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: starsDelta,
          actualGoldDelta: goldDelta,
          sound: 'chestOpen',
          haptic: 'success',
          message: `🎡 جائزة العجلة: ${action.label}!`,
        },
      };
    }

    case 'REDEEM_PROMO': {
      const normalized = action.code.trim().toUpperCase();
      const match = PROMO_CODES_REGISTRY.find((p) => p.code.toUpperCase() === normalized);
      if (!match) {
        return reject(
          prev,
          `الرمز غير صحيح! جرّب ${PROMO_CODES_REGISTRY[0]?.code ?? 'DRAGON'} أو ${
            PROMO_CODES_REGISTRY[1]?.code ?? 'AMF2025'
          }`
        );
      }
      if (prev.usedPromoCodes.includes(match.code)) {
        return reject(prev, 'تم استخدام هذا الرمز مسبقاً.');
      }
      const granted = grantRewardBundle(prev, match.reward, { applySoftCap: true }).nextState;
      const nextState: GameState = {
        ...granted,
        usedPromoCodes: [...granted.usedPromoCodes, match.code],
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: nextState.corn - prev.corn,
          actualStarsDelta: nextState.stars - prev.stars,
          sound: 'claim',
          haptic: 'success',
          message: `تم التفعيل! حصلت على ${match.labelAr}`,
        },
      };
    }

    case 'TOGGLE_WALLET_CONNECT': {
      return {
        nextState: {
          ...prev,
          wallet: { ...prev.wallet, connected: !prev.wallet.connected },
        },
        receipt: { ok: true, stateChanged: true },
      };
    }

    case 'TOGGLE_MUTE': {
      return {
        nextState: { ...prev, muted: !prev.muted },
        receipt: { ok: true, stateChanged: true },
      };
    }

    case 'TOGGLE_HAPTICS': {
      const next = !(prev.hapticsEnabled ?? true);
      return {
        nextState: { ...prev, hapticsEnabled: next },
        receipt: {
          ok: true,
          stateChanged: true,
          haptic: next ? 'light' : undefined,
        },
      };
    }

    case 'TOGGLE_DRAGON_MOTION': {
      return {
        nextState: {
          ...prev,
          dragonMotionEnabled: !(prev.dragonMotionEnabled ?? true),
        },
        receipt: { ok: true, stateChanged: true },
      };
    }

    default:
      return null;
  }
}

function resolveSafeEventMods(eventIndex: number) {
  const cfg = LIVE_EVENTS_REGISTRY[eventIndex % LIVE_EVENTS_REGISTRY.length];
  if (!cfg) {
    return { starBonusMult: 1, arenaEnergyMult: 1, templeEnergyMult: 1, badgeText: 'اعتيادي' };
  }
  return {
    starBonusMult: Math.max(1, cfg.starBonusMult),
    arenaEnergyMult: Math.max(1, cfg.arenaEnergyMult),
    templeEnergyMult: Math.max(1, cfg.templeEnergyMult),
    badgeText: cfg.badgeText,
  };
}
