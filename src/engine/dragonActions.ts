import { Duck, DuckSkinId, GameState } from '../types/game';
import {
  RARITY_ORDER,
  RARITY_STYLE,
  SKIN_CATALOG,
  checkSlotUnlockEligibility,
  getDragonSlotMeta,
  getDragonVaultDmdPrice,
  getFeedCost,
} from '../data/gameData';
import {
  ECONOMY_LIMITS,
  RELIC_FORGE_CATALOG,
  SQUAD_TALENT_CATALOG,
  calculateCustomUpgradeCost,
  clampCustomLevel,
  createInitialCoopProgress,
  getCumulativeDmdAtCustomLevel,
  getDragonTrainingCost,
  getFirstUnlockedDragonIndex,
  getLevelRequiredFeeds,
  getPlayerTier,
  getSkillUpgradeCost,
  getSquadTalentCost,
  getXlEggUpgradeCost,
  isDragonSlotLocked,
  normalizeDragonSlots,
  resolveDragonSize,
} from '../utils/economyEngine';
import {
  CentralActionContext,
  CentralActionOutcome,
  CentralGameAction,
} from './types';
import {
  createFallbackStarterDragon,
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

export function reduceDragonAction(
  prev: GameState,
  action: CentralGameAction,
  ctx: CentralActionContext
): CentralActionOutcome | null {
  const { nowTs } = ctx;

  switch (action.type) {
    case 'SELECT_DUCK': {
      const idx = Math.max(0, Math.min(prev.ducks.length - 1, Math.floor(action.index)));
      const picked = prev.ducks[idx];
      if (!picked) return reject(prev);
      if (isDragonSlotLocked(picked, prev.unlockedSlots)) {
        return reject(prev, `الخانة ${(picked.slotIndex ?? idx) + 1} مقفلة! افتحها أولاً لاستخدام هذا التنين.`);
      }
      if (idx === prev.activeDuckIndex) {
        return { nextState: prev, receipt: { ok: true, stateChanged: false } };
      }
      return {
        nextState: { ...prev, activeDuckIndex: idx },
        receipt: { ok: true, stateChanged: true },
      };
    }

    case 'FEED_DUCK': {
      const target = prev.ducks.find((d) => d.id === action.duckId);
      if (!target) return reject(prev);
      if (isDragonSlotLocked(target, prev.unlockedSlots)) {
        return reject(prev, 'هذا التنين في خانة مقفلة! افتح الخانة أولاً لاستخدامه.');
      }
      if (target.breedingEndsAt && target.breedingEndsAt > nowTs) {
        return reject(
          prev,
          'التنين في بوابة التزاوج حالياً! انتظر انتهاء العداد للانتقال للمستوى التالي.'
        );
      }
      if (target.feedsProgress >= target.feedsRequired) {
        return reject(
          prev,
          target.level < 5
            ? 'اكتملت ضغطات هذا المستوى! ابدأ بوابة التزاوج (24 ساعة).'
            : 'اكتمل إطعام المستوى الخامس بالكامل!'
        );
      }

      const playerTier = getPlayerTier(prev);
      const hasHarvest = prev.godCards.some((g) => g.godKey === 'harvest' && g.owned);
      const prevClicks = target.feedClicksSinceReset ?? 0;
      const baseFeedCost = getFeedCost(target.level, target.rarity, playerTier, prevClicks, target);
      const effectiveCost = hasHarvest ? Math.max(1, Math.ceil(baseFeedCost * 0.8)) : baseFeedCost;
      if (prev.corn < effectiveCost) {
        return reject(
          prev,
          `طاقة الإطعام غير كافية (${effectiveCost}⚡ مطلوبة)! اجمع الطاقة من البيض أو الحلبة.`
        );
      }

      const comboMultiplier = action.comboMultiplier ?? 1;
      const isCrit = Boolean(action.isCrit);
      const comboStepBonus = comboMultiplier >= 5 ? 1 : 0;
      const tapSteps = (isCrit ? 2 : 1) + comboStepBonus;
      const nextProgress = Math.min(target.feedsRequired, target.feedsProgress + tapSteps);
      const completedLevelFeeds = nextProgress >= target.feedsRequired;
      const nextClicks = prevClicks + 1;
      const nextResetAt =
        target.costResetEndsAt && target.costResetEndsAt > nowTs
          ? target.costResetEndsAt
          : nowTs + ECONOMY_LIMITS.FEED_RESET_DURATION_MS;
      const nextFeedCost = getFeedCost(target.level, target.rarity, playerTier, nextClicks, target);

      const nextState: GameState = {
        ...prev,
        corn: prev.corn - effectiveCost,
        treasury: withBurnedEnergy(prev.treasury, effectiveCost),
        battlePass: {
          ...prev.battlePass,
          xp: prev.battlePass.xp + (isCrit ? 6 : 3) + (completedLevelFeeds ? 30 : 0),
        },
        ducks: prev.ducks.map((d) =>
          d.id === action.duckId
            ? {
                ...d,
                feedsProgress: nextProgress,
                feedClicksSinceReset: nextClicks,
                costResetEndsAt: nextResetAt,
                feedCost: nextFeedCost,
                levelFeedsCompleted: completedLevelFeeds,
              }
            : d
        ),
        eggQueue: (prev.stats.totalFeeds + 1) % 12 === 0 ? [...prev.eggQueue, 'egg_1'] : prev.eggQueue,
        stats: {
          ...prev.stats,
          totalFeeds: prev.stats.totalFeeds + 1,
          hearts: prev.stats.hearts + (target.skin === 'cupid' ? 14 : 8),
        },
        dailyTasks: prev.dailyTasks.map((dt) =>
          dt.id === 'dt_feed' ? { ...dt, progress: Math.min(dt.target, dt.progress + 1) } : dt
        ),
        pack: {
          ...prev.pack,
          coopProgress: {
            ...createInitialCoopProgress(),
            ...(prev.pack.coopProgress ?? {}),
            coop_feeds: (prev.pack.coopProgress?.coop_feeds ?? 280) + 1,
          },
        },
      };

      const message = completedLevelFeeds
        ? target.level < 5
          ? `🔥 اكتملت ضغطات LVL ${target.level}! افتح بوابة التزاوج (24 ساعة) للانتقال إلى LVL ${target.level + 1}!`
          : '🏆 اكتمل المستوى الخامس (500/500)! يمكنك الآن دمج XL/XXL أو التخصيص بالنجوم ★!'
        : undefined;

      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -effectiveCost,
          message,
          extra: {
            burnedEnergy: effectiveCost,
            tapSteps,
            leveledUp: completedLevelFeeds,
          },
        },
      };
    }

    case 'START_BREEDING': {
      const target = prev.ducks.find((d) => d.id === action.duckId);
      if (!target) return reject(prev);
      if (isDragonSlotLocked(target, prev.unlockedSlots)) {
        return reject(prev, 'هذا التنين في خانة مقفلة! افتح الخانة أولاً لاستخدامه.');
      }
      if (target.level >= 5) return reject(prev, 'بلغ التنين المستوى الخامس بالفعل!');
      if (target.feedsProgress < target.feedsRequired) {
        return reject(
          prev,
          `أكمل ضغطات الإطعام أولاً (${target.feedsProgress}/${target.feedsRequired})!`
        );
      }
      if (target.breedingEndsAt && target.breedingEndsAt > nowTs) {
        return {
          nextState: prev,
          receipt: {
            ok: false,
            stateChanged: false,
            message: 'عملية التزاوج جارية بالفعل لهذا التنين!',
          },
        };
      }
      const nextState: GameState = {
        ...prev,
        ducks: prev.ducks.map((d) =>
          d.id === action.duckId
            ? {
                ...d,
                breedingEndsAt: nowTs + ECONOMY_LIMITS.BREEDING_DURATION_MS,
                breedingNextLevel: d.level + 1,
                lastBreedingEggAt: nowTs,
              }
            : d
        ),
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'godConfirm',
          haptic: 'success',
          message: `❤️ بدأت بوابة التزاوج 24 ساعة للانتقال إلى LVL ${target.level + 1} (بيضة كل 15 دقيقة)!`,
        },
      };
    }

    case 'UPGRADE_XL_EGGS': {
      const target = prev.ducks.find((d) => d.id === action.duckId);
      if (!target) return reject(prev);
      if (isDragonSlotLocked(target, prev.unlockedSlots)) {
        return reject(prev, 'هذا التنين في خانة مقفلة! افتح الخانة أولاً لاستخدامه.');
      }
      const sz = resolveDragonSize(target);
      if (sz === 'NORMAL' || target.level >= 5) return reject(prev);
      const costEggs = getXlEggUpgradeCost(target.level, sz);
      if ((prev.breedingEggs ?? 0) < costEggs) {
        return reject(prev, `تحتاج ${costEggs} بيضة تزاوج للترقية (لديك ${prev.breedingEggs ?? 0})!`);
      }
      const nextLv = Math.min(5, target.level + 1);
      const tier = getPlayerTier(prev);
      const nextState: GameState = {
        ...prev,
        breedingEggs: Math.max(0, (prev.breedingEggs ?? 0) - costEggs),
        ducks: prev.ducks.map((d) =>
          d.id === action.duckId
            ? {
                ...d,
                level: nextLv,
                feedsProgress: 0,
                feedsRequired: getLevelRequiredFeeds(nextLv),
                levelFeedsCompleted: false,
                feedClicksSinceReset: 0,
                costResetEndsAt: null,
                breedingEndsAt: null,
                breedingNextLevel: null,
                lastBreedingEggAt: null,
                powerRating: d.powerRating + (30 + nextLv * 15),
                feedCost: getFeedCost(nextLv, d.rarity, tier, 0, d),
              }
            : d
        ),
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'levelUp',
          haptic: 'success',
          message: `🥚 تمت ترقية ${target.name} (${sz}) إلى LVL ${nextLv} باستخدام ${costEggs} بيضة تزاوج!`,
        },
      };
    }

    case 'UPGRADE_STAR_CUSTOMIZATION': {
      const curDragon = prev.ducks.find((d) => d.id === action.duckId);
      if (!curDragon) return reject(prev);
      if (isDragonSlotLocked(curDragon, prev.unlockedSlots)) {
        return reject(prev, 'هذا التنين في خانة مقفلة! افتح الخانة أولاً لاستخدامه.');
      }
      if (curDragon.level < 5) {
        return reject(prev, 'يجب وصول التنين إلى المستوى 5 أولاً قبل التخصيص بالنجوم!');
      }
      const startLv = clampCustomLevel(curDragon.customLevel);
      if (startLv >= ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL) {
        return reject(prev, 'وصل التنين إلى التخصيص النهائي ★10/10!');
      }

      const requestedSteps = Math.max(1, Math.min(10, Math.floor(action.steps ?? 1)));
      let curLv = startLv;
      let remStars = prev.stars;
      let totalSpent = 0;
      let powerGain = 0;
      let performed = 0;
      const curSize = resolveDragonSize(curDragon);
      const startCumulativeDmd = getCumulativeDmdAtCustomLevel(curDragon.rarity, curSize, curLv);

      while (performed < requestedSteps && curLv < ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL) {
        const cost = calculateCustomUpgradeCost(curLv);
        if (remStars < cost) break;
        remStars -= cost;
        totalSpent += cost;
        powerGain += 40;
        curLv++;
        performed++;
      }

      if (performed === 0) {
        const needed = calculateCustomUpgradeCost(startLv);
        return reject(prev, `تحتاج ${needed} نجمة ★ للترقية إلى ★${startLv + 1}!`);
      }

      const endCumulativeDmd = getCumulativeDmdAtCustomLevel(curDragon.rarity, curSize, curLv);
      const dmdAdded = Math.max(0, Math.round((endCumulativeDmd - startCumulativeDmd) * 100) / 100);

      let nextState: GameState;
      if (curLv >= ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL) {
        const sealedDragon: Duck = {
          ...curDragon,
          customLevel: ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL,
          dmd: getDragonVaultDmdPrice(curDragon),
          dmdStored: 0,
          staked: false,
          stakeRatePerHour: 0,
          slotIndex: null,
          powerRating: curDragon.powerRating + powerGain,
        };
        const remainingRaw = prev.ducks.filter((d) => d.id !== action.duckId);
        const ensured =
          remainingRaw.length > 0 ? remainingRaw : [createFallbackStarterDragon(getPlayerTier(prev))];
        const nextDucks = normalizeDragonSlots(ensured, prev.unlockedSlots);
        const safeActiveIdx = Math.min(
          prev.activeDuckIndex,
          Math.max(0, nextDucks.length - 1),
          Math.max(0, prev.unlockedSlots - 1)
        );
        nextState = {
          ...prev,
          stars: remStars,
          dmdTotal: Math.round((prev.dmdTotal + dmdAdded) * 100) / 100,
          treasury: withBurnedStars(prev.treasury, totalSpent),
          battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + performed * 35 },
          ducks: nextDucks,
          activeDuckIndex: isDragonSlotLocked(nextDucks[safeActiveIdx], prev.unlockedSlots)
            ? getFirstUnlockedDragonIndex(nextDucks, prev.unlockedSlots)
            : safeActiveIdx,
          customizedVault: [...(prev.customizedVault ?? []), sealedDragon],
        };
      } else {
        nextState = {
          ...prev,
          stars: remStars,
          dmdTotal: Math.round((prev.dmdTotal + dmdAdded) * 100) / 100,
          treasury: withBurnedStars(prev.treasury, totalSpent),
          battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + performed * 35 },
          ducks: prev.ducks.map((d) =>
            d.id === action.duckId
              ? {
                  ...d,
                  customLevel: curLv,
                  dmd: Math.round((d.dmd + dmdAdded) * 100) / 100,
                  dmdStored: 0,
                  staked: false,
                  stakeRatePerHour: 0,
                  powerRating: d.powerRating + powerGain,
                }
              : d
          ),
        };
      }

      const message =
        curLv >= ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL
          ? `🏦 اكتمل ★10! تم نقل ${curDragon.name} إلى خزانة التنانين المخصصة (+${dmdAdded.toFixed(2)} AMF للمحفظة)!`
          : `⭐ تمت ترقية التخصيص إلى ★${curLv} (+${dmdAdded.toFixed(2)} AMF للمحفظة · -${totalSpent}★)!`;

      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualStarsDelta: -totalSpent,
          actualDmdDelta: dmdAdded,
          sound: 'godConfirm',
          haptic: 'success',
          message,
        },
      };
    }

    case 'UPGRADE_DUCK_SKILL': {
      const target = prev.ducks.find((d) => d.id === action.duckId);
      if (!target || target.skillLevel >= 5) return reject(prev);
      if (isDragonSlotLocked(target, prev.unlockedSlots)) {
        return reject(prev, 'هذا التنين في خانة مقفلة! افتح الخانة أولاً لاستخدامه.');
      }
      const cost = getSkillUpgradeCost(target.skillLevel, getPlayerTier(prev));
      if (prev.corn < cost) {
        return reject(prev, `تحتاج ${cost.toLocaleString()} طاقة لترقية المهارة!`);
      }
      const nextState: GameState = {
        ...prev,
        corn: prev.corn - cost,
        treasury: withBurnedEnergy(prev.treasury, cost),
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 25 },
        ducks: prev.ducks.map((d) =>
          d.id === action.duckId
            ? { ...d, skillLevel: d.skillLevel + 1, powerRating: d.powerRating + 38 }
            : d
        ),
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -cost,
          sound: 'levelUp',
          message: `تمت ترقية مهارة ${target.name} إلى م${target.skillLevel + 1}! (+38 قوة)`,
        },
      };
    }

    case 'TRAIN_DRAGON': {
      const target = prev.ducks.find((d) => d.id === action.duckId);
      if (!target) return reject(prev);
      if (isDragonSlotLocked(target, prev.unlockedSlots)) {
        return reject(prev, 'هذا التنين في خانة مقفلة! افتح الخانة أولاً لاستخدامه.');
      }
      const trainRank = target.trainingLevel ?? 0;
      const cost = getDragonTrainingCost(trainRank, getPlayerTier(prev));
      if (prev.corn < cost) {
        return reject(prev, `تحتاج ${cost.toLocaleString()} طاقة للتدريب القتالي التالي!`);
      }
      const nextState: GameState = {
        ...prev,
        corn: prev.corn - cost,
        treasury: withBurnedEnergy(prev.treasury, cost),
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 20 },
        ducks: prev.ducks.map((d) =>
          d.id === action.duckId
            ? { ...d, trainingLevel: (d.trainingLevel ?? 0) + 1, powerRating: d.powerRating + 18 }
            : d
        ),
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -cost,
          sound: 'levelUp',
          message: `💪 تم تدريب ${target.name} للرتبة ${trainRank + 1} (+14 صحة و +2 هجوم)!`,
        },
      };
    }

    case 'UPGRADE_SQUAD_TALENT': {
      const prevTalents = prev.pack.talents ?? { fury: 0, carapace: 0, incubation: 0, prestige: 0 };
      const currentRank = prevTalents[action.talentKey] ?? 0;
      if (currentRank >= ECONOMY_LIMITS.MAX_TALENT_RANK) {
        return reject(prev, 'بلغت هذه الموهبة الحد الأقصى (20/20)!');
      }
      const cost = getSquadTalentCost(action.talentKey, currentRank, getPlayerTier(prev));
      if (
        prev.corn < cost.corn ||
        prev.stars < cost.stars ||
        prev.duckGold < cost.gold ||
        prev.stats.medals < cost.medals
      ) {
        return reject(prev, 'الموارد غير كافية لترقية هذه الموهبة!');
      }
      const meta = SQUAD_TALENT_CATALOG.find((t) => t.key === action.talentKey);
      let nextTreasury = withBurnedEnergy(prev.treasury, cost.corn);
      nextTreasury = withBurnedStars(nextTreasury, cost.stars);
      const nextState: GameState = {
        ...prev,
        corn: prev.corn - cost.corn,
        stars: prev.stars - cost.stars,
        duckGold: prev.duckGold - cost.gold,
        treasury: nextTreasury,
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 30 },
        pack: {
          ...prev.pack,
          power: prev.pack.power + 12,
          talents: {
            ...prevTalents,
            [action.talentKey]: currentRank + 1,
          },
        },
        stats: {
          ...prev.stats,
          medals: prev.stats.medals - cost.medals,
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -cost.corn,
          actualStarsDelta: -cost.stars,
          actualGoldDelta: -cost.gold,
          sound: 'godConfirm',
          message: `🛡️ تمت ترقية موهبة "${meta?.nameAr ?? action.talentKey}" إلى المستوى ${currentRank + 1}!`,
        },
      };
    }

    case 'FORGE_RELIC': {
      const offer = RELIC_FORGE_CATALOG.find((o) => o.id === action.offerId);
      if (!offer) return reject(prev);
      if (
        prev.corn < offer.cornCost ||
        prev.duckGold < offer.goldCost ||
        prev.stats.medals < offer.medalsCost ||
        prev.stars < offer.starsCost
      ) {
        return reject(prev, 'الموارد غير كافية لصقل هذه التعويذة!');
      }
      const expiresAt = nowTs + 24 * 60 * 60 * 1000;
      const prevBuffs = prev.activeBuffs ?? { duelFuryUntil: 0, critEdgeUntil: 0, eggSurgeUntil: 0 };
      let nextTreasury = withBurnedEnergy(prev.treasury, offer.cornCost);
      nextTreasury = withBurnedStars(nextTreasury, offer.starsCost);
      const nextState: GameState = {
        ...prev,
        corn: prev.corn - offer.cornCost,
        duckGold: prev.duckGold - offer.goldCost,
        stars: prev.stars - offer.starsCost,
        treasury: nextTreasury,
        activeBuffs: {
          ...prevBuffs,
          duelFuryUntil: offer.id === 'duel_fury' ? expiresAt : prevBuffs.duelFuryUntil,
          critEdgeUntil: offer.id === 'crit_edge' ? expiresAt : prevBuffs.critEdgeUntil,
          eggSurgeUntil: offer.id === 'egg_surge' ? expiresAt : prevBuffs.eggSurgeUntil,
        },
        stats: {
          ...prev.stats,
          medals: prev.stats.medals - offer.medalsCost,
          hammerBoosters: prev.stats.hammerBoosters + (offer.id === 'buy_hammer' ? 1 : 0),
          autoMergeBoosters: prev.stats.autoMergeBoosters + (offer.id === 'buy_automerge' ? 1 : 0),
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -offer.cornCost,
          actualStarsDelta: -offer.starsCost,
          actualGoldDelta: -offer.goldCost,
          sound: 'chestOpen',
          message: `✨ تم تفعيل "${offer.nameAr}" بنجاح!`,
        },
      };
    }

    case 'UNLOCK_DRAGON_SLOT': {
      if (action.slotIndex >= prev.ducks.length) {
        return reject(prev, 'لا يوجد تنين في هذه الخانة بعد.');
      }
      const check = checkSlotUnlockEligibility(action.slotIndex, prev);
      if (!check.canUnlock) {
        return reject(prev, check.reason);
      }
      const meta = getDragonSlotMeta(action.slotIndex);
      const nextSlots = action.slotIndex + 1;
      const normalized = normalizeDragonSlots(prev.ducks, nextSlots);
      const unlockedDragon = normalized[action.slotIndex];
      const nextIdx = unlockedDragon
        ? action.slotIndex
        : getFirstUnlockedDragonIndex(normalized, nextSlots);
      const nextState: GameState = {
        ...prev,
        stars: prev.stars - meta.starCost,
        treasury: withBurnedStars(prev.treasury, meta.starCost),
        unlockedSlots: nextSlots,
        ducks: normalized,
        activeDuckIndex: nextIdx,
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualStarsDelta: -meta.starCost,
          sound: 'chestOpen',
          haptic: 'success',
          message: `تم فتح ${meta.label} وتفعيل ${unlockedDragon?.name ?? 'التنين'} للعب!`,
        },
      };
    }

    case 'ASSIGN_DRAGON_SLOT': {
      if (action.slotIndex >= prev.unlockedSlots) return reject(prev);
      const currentOccupant = prev.ducks.find((d) => d.slotIndex === action.slotIndex);
      const movingDragon = prev.ducks.find((d) => d.id === action.duckId);
      if (!movingDragon) return reject(prev);
      const oldSlot = movingDragon.slotIndex;
      const updatedDucks = prev.ducks.map((d) => {
        if (d.id === action.duckId) return { ...d, slotIndex: action.slotIndex };
        if (currentOccupant && d.id === currentOccupant.id) return { ...d, slotIndex: oldSlot };
        return d;
      });
      return {
        nextState: { ...prev, ducks: updatedDucks },
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'tabSwitch',
          message: `تم نقل التنين إلى الخانة ${action.slotIndex + 1}!`,
        },
      };
    }

    case 'MERGE_DUCKS': {
      const picked = prev.ducks.filter((d) => action.duckIds.includes(d.id));
      if (picked.length !== 4) return reject(prev);
      if (picked.some((d) => isDragonSlotLocked(d, prev.unlockedSlots))) {
        return reject(prev, 'لا يمكن دمج تنين موجود في خانة مقفلة! افتح الخانة أولاً.');
      }
      const baseRarity = picked[0].rarity;
      const baseSize = resolveDragonSize(picked[0]);
      if (baseRarity === 'COMMON' || baseSize === 'XXL') return reject(prev);
      const allMatch = picked.every(
        (d) =>
          d.rarity === baseRarity &&
          resolveDragonSize(d) === baseSize &&
          d.level >= 5 &&
          d.feedsProgress >= 500
      );
      if (!allMatch) {
        return reject(prev, 'يجب اختيار 4 تنانين مكتملة LVL 5 من نفس التصنيف والحجم!');
      }

      const nextSize = baseSize === 'NORMAL' ? 'XL' : 'XXL';
      const curRarityIdx = RARITY_ORDER.indexOf(baseRarity);
      const skins: DuckSkinId[] = ['gamer', 'pumpkin', 'pharaoh', 'royal', 'cool'];
      const newSkin = skins[(curRarityIdx + prev.stats.totalDucksMerged) % skins.length];
      const tier = getPlayerTier(prev);
      const reqFeeds = getLevelRequiredFeeds(1);

      const mergedDragon: Duck = {
        id: `dragon_merged_${nowTs}`,
        name: `${SKIN_CATALOG[newSkin].name} ${nextSize}`,
        skin: newSkin,
        rarity: baseRarity,
        level: 1,
        maxLevel: 5,
        customLevel: 0,
        dmd: 0,
        dmdStored: 0,
        slotIndex: null,
        feedCost: getFeedCost(1, baseRarity, tier, 0, { sizeTier: nextSize, xl: true }),
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
        xl: true,
        sizeTier: nextSize,
        skillLevel: 2,
        trainingLevel: 0,
        powerRating: RARITY_STYLE[baseRarity].basePower * (nextSize === 'XXL' ? 2 : 1.5),
        unlockedAt: nowTs,
      };

      const remaining = prev.ducks.filter((d) => !action.duckIds.includes(d.id));
      const normalized = normalizeDragonSlots([...remaining, mergedDragon], prev.unlockedSlots);
      const mergedIdx = normalized.findIndex((d) => d.id === mergedDragon.id);
      const safeIdx =
        mergedIdx >= 0 && !isDragonSlotLocked(normalized[mergedIdx], prev.unlockedSlots)
          ? mergedIdx
          : getFirstUnlockedDragonIndex(normalized, prev.unlockedSlots);

      const nextState: GameState = {
        ...prev,
        ducks: normalized,
        activeDuckIndex: safeIdx,
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 75 },
        stats: {
          ...prev.stats,
          totalDucksMerged: prev.stats.totalDucksMerged + 1,
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'levelUp',
          haptic: 'success',
          message: `نجح الدمج! حصلت على تنين ${RARITY_STYLE[baseRarity].labelAr} (${nextSize}) مستوى 1!`,
        },
      };
    }

    case 'CUSTOMIZE_DUCK': {
      return {
        nextState: {
          ...prev,
          ducks: prev.ducks.map((d) =>
            d.id === action.duckId ? { ...d, gear: action.gear, aura: action.aura } : d
          ),
        },
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'godConfirm',
          message: 'تم حفظ مظهر التنين وتجهيزه بنجاح!',
        },
      };
    }

    case 'CHANGE_DRAGON_SKIN': {
      if (!prev.unlockedSkins.includes(action.skin)) {
        return reject(prev, 'هذا المظهر غير مفتوح بعد! افتحه عبر عملة المظهر في قسم المهام.');
      }
      return {
        nextState: {
          ...prev,
          ducks: prev.ducks.map((d) =>
            d.id === action.duckId
              ? { ...d, skin: action.skin, name: SKIN_CATALOG[action.skin]?.name ?? d.name }
              : d
          ),
        },
        receipt: {
          ok: true,
          stateChanged: true,
          haptic: 'success',
          message: `تم تجهيز مظهر ${SKIN_CATALOG[action.skin]?.name ?? action.skin} بنجاح!`,
        },
      };
    }

    case 'CLAIM_TIMED_BONUS': {
      const energyGrant = withEarnedEnergy(prev, ECONOMY_LIMITS.TIMED_BONUS_ENERGY);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        treasury: energyGrant.treasury,
        eggQueue: [...prev.eggQueue, 'egg_1'],
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          sound: 'claim',
          haptic: 'light',
          timedBonusReadyAt: nowTs + ECONOMY_LIMITS.TIMED_BONUS_COOLDOWN_SEC * 1000,
          message: `تم استلام الإمداد المؤقت (+${cornDelta} طعام تنين و +1 بيضة)!`,
        },
      };
    }

    case 'CLAIM_EXTRA_CHEST': {
      const readyAt = prev.stats.extraChestReadyAt ?? 0;
      if (nowTs < readyAt) {
        return {
          nextState: prev,
          receipt: { ok: false, stateChanged: false, message: 'الصندوق الإضافي قيد الشحن!' },
        };
      }
      const opensCount = prev.stats.extraChestOpensCount ?? 0;
      const baseCooldownMs = 5 * 60 * 1000;
      const cooldownMs = Math.min(baseCooldownMs * Math.pow(2, opensCount), 24 * 3600 * 1000);
      const energyGain = 450 * (opensCount + 1);
      const goldGain = 2 * (opensCount + 1);

      const energyGrant = withEarnedEnergy(prev, energyGain);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        duckGold: prev.duckGold + goldGain,
        treasury: energyGrant.treasury,
        eggQueue: [...prev.eggQueue, opensCount >= 3 ? 'egg_3' : 'egg_2'],
        stats: {
          ...prev.stats,
          extraChestReadyAt: nowTs + cooldownMs,
          extraChestOpensCount: opensCount + 1,
        },
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualGoldDelta: goldGain,
          sound: 'chestOpen',
          haptic: 'success',
          extraChestReadyAt: nextState.stats.extraChestReadyAt,
          message: `تم فتح صندوق الإمداد (+${cornDelta} طعام تنين، +${goldGain}💎، وبيضة مميزة)!`,
        },
      };
    }

    case 'CLAIM_BEST_TASK': {
      const readyTask = prev.dailyTasks.find((t) => !t.claimed && t.progress >= t.target);
      if (!readyTask) {
        return {
          nextState: prev,
          receipt: { ok: false, stateChanged: false, extra: { openTasksTab: true } },
        };
      }
      const energyGrant = withEarnedEnergy(prev, readyTask.rewardEnergy);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + readyTask.rewardStars,
        treasury: withEarnedStars(energyGrant.treasury, readyTask.rewardStars),
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 30 },
        dailyTasks: prev.dailyTasks.map((t) =>
          t.id === readyTask.id ? { ...t, claimed: true } : t
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
          actualStarsDelta: readyTask.rewardStars,
          sound: 'claim',
          haptic: 'success',
          message: `تم استلام مكافأة المهمة (+${readyTask.rewardStars} ★ و +${cornDelta} طاقة)!`,
        },
      };
    }

    default:
      return null;
  }
}
