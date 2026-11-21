import {
  Duck,
  GameState,
  MainTab,
  Rarity,
  SquadTalentKey,
  TreasuryState,
} from '../types/game';

export const ECONOMY_LIMITS = {
  MAX_DAILY_BARTER_STARS: 4,
  MAX_DAILY_BARTER_GOLD: 3,
  MAX_DAILY_ADS: 4,
  MAX_DAILY_ARENA_FULL_WINS: 5,
  ARENA_AFTER_CAP_RATIO: 0.35,
  TIMED_BONUS_COOLDOWN_SEC: 180,
  TIMED_BONUS_ENERGY: 75,
  AD_ENERGY_REWARD: 110,
  AD_STARS_REWARD: 3,
  AD_EGGS_REWARD: 1,
  BLITZ_ACTIVATION_COST: 90,
  RACE_ENTRY_COST: 55,
  MAX_TALENT_RANK: 20,
  MAX_DAILY_INVITE_CLAIMS: 3,
} as const;

export const RARITY_FEED_MULT: Record<Rarity, number> = {
  COMMON: 1.0,
  UNCOMMON: 1.35,
  RARE: 1.75,
  EPIC: 2.25,
  LEGENDARY: 3.0,
};

export function getLocalDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Exact Player Tier formula (1..10):
 * playerTier = min(10, 1 + floor(sumOfDragonLevels / 4 + (unlockedSlots - 3)))
 */
export function getPlayerTier(state: Pick<GameState, 'ducks' | 'unlockedSlots'>): number {
  const totalLevels = state.ducks.reduce((acc, d) => acc + Math.max(1, d.level), 0);
  const raw = 1 + Math.floor(totalLevels / 4 + Math.max(0, state.unlockedSlots - 3));
  return Math.max(1, Math.min(10, raw));
}

/**
 * Progressive scale factor:
 * tierScale = 1 + 0.18 * (playerTier - 1)
 */
export function getTierScale(playerTier: number): number {
  return 1 + 0.18 * Math.max(0, playerTier - 1);
}

/**
 * Legacy helper kept for reference; main dragon feeding uses calculateDragonFeedCost.
 */
export function calculateFeedCost(level: number): number {
  return Math.ceil(28 * Math.pow(1.48, Math.max(0, level - 1)));
}

/**
 * Rarity & Tier-Aware Feeding Cost Formula (strictly net deduction, zero energy refund):
 * ceil(28 * 1.48^(LVL - 1) * M_R * (1 + 0.10 * (T - 1)))
 */
export function calculateDragonFeedCost(
  level: number,
  rarity: Rarity = 'COMMON',
  playerTier = 1
): number {
  const mult = RARITY_FEED_MULT[rarity] ?? 1.0;
  const tierFactor = 1 + 0.1 * Math.max(0, playerTier - 1);
  return Math.ceil(28 * Math.pow(1.48, Math.max(0, level - 1)) * mult * tierFactor);
}

/**
 * Exact Star Customization Cost Formula:
 * ceil(10 * (1.35)^Custom_LVL)
 */
export function calculateCustomUpgradeCost(customLevel: number): number {
  return Math.ceil(10 * Math.pow(1.35, Math.max(0, customLevel)));
}

/**
 * Exact Skill Upgrade Cost Formula:
 * round(400 * (1.45)^(skillLevel - 1) * (1 + 0.10 * (playerTier - 1)))
 */
export function getSkillUpgradeCost(skillLevel: number, playerTier: number): number {
  const tierFactor = 1 + 0.1 * Math.max(0, playerTier - 1);
  return Math.round(400 * Math.pow(1.45, Math.max(0, skillLevel - 1)) * tierFactor);
}

/**
 * Continuous Dragon Intensive Combat Training Sink (post-LVL5 or anytime):
 * round(220 * 1.24^k * (1 + 0.12 * (T - 1)))
 */
export function getDragonTrainingCost(trainingLevel: number, playerTier: number): number {
  const tierFactor = 1 + 0.12 * Math.max(0, playerTier - 1);
  return Math.round(220 * Math.pow(1.24, Math.max(0, trainingLevel)) * tierFactor);
}

export interface SquadTalentMeta {
  key: SquadTalentKey;
  nameAr: string;
  effectPerRankAr: string;
  descAr: string;
}

export const SQUAD_TALENT_CATALOG: SquadTalentMeta[] = [
  {
    key: 'fury',
    nameAr: 'غريزة الهجوم',
    effectPerRankAr: '+2.5% ضرر حلبة / رتبة',
    descAr: 'يرفع هجوم كل تنانينك في نزالات الحلبة.',
  },
  {
    key: 'carapace',
    nameAr: 'درع العش',
    effectPerRankAr: '+3% صحة قتالية / رتبة',
    descAr: 'يعزز صمود التنانين ونقاط الحياة القصوى.',
  },
  {
    key: 'incubation',
    nameAr: 'دقة التفقيس',
    effectPerRankAr: '+3% طاقة دمج ومعبد / رتبة',
    descAr: 'يزيد عائد الطاقة من دمج البيض وقرابين المعبد.',
  },
  {
    key: 'prestige',
    nameAr: 'هيبة الأبطال',
    effectPerRankAr: '+3% نقاط دوري و -2% رسوم حلبة',
    descAr: 'يرفع نقاط الدوري ويخفض رسوم دخول الحلبة.',
  },
];

export function getSquadTalentCost(
  key: SquadTalentKey,
  currentRank: number,
  playerTier: number
): { corn: number; stars: number; gold: number; medals: number } {
  const r = Math.max(0, currentRank);
  const tScale = 1 + 0.08 * Math.max(0, playerTier - 1);
  switch (key) {
    case 'fury':
      return {
        corn: Math.round(260 * Math.pow(1.22, r) * tScale),
        stars: 0,
        gold: 0,
        medals: Math.round(14 * Math.pow(1.14, r)),
      };
    case 'carapace':
      return {
        corn: Math.round(280 * Math.pow(1.22, r) * tScale),
        stars: 0,
        gold: Math.round(2 * Math.pow(1.15, r)),
        medals: 0,
      };
    case 'incubation':
      return {
        corn: Math.round(240 * Math.pow(1.21, r) * tScale),
        stars: Math.round(2 + r * 1.2),
        gold: 0,
        medals: 0,
      };
    case 'prestige':
      return {
        corn: 0,
        stars: Math.round(3 + r * 1.4),
        gold: Math.round(2 * Math.pow(1.16, r)),
        medals: 0,
      };
  }
}

export interface RelicForgeOffer {
  id: 'duel_fury' | 'crit_edge' | 'egg_surge' | 'buy_hammer' | 'buy_automerge';
  nameAr: string;
  descAr: string;
  durationLabel: string;
  cornCost: number;
  goldCost: number;
  medalsCost: number;
  starsCost: number;
}

export const RELIC_FORGE_CATALOG: RelicForgeOffer[] = [
  {
    id: 'duel_fury',
    nameAr: 'تعويذة غضب الحلبة',
    descAr: '+20% ضرر هجومي في كل نزالات الحلبة',
    durationLabel: '24 ساعة',
    cornCost: 180,
    goldCost: 3,
    medalsCost: 15,
    starsCost: 0,
  },
  {
    id: 'crit_edge',
    nameAr: 'حدّ النصل الحرج',
    descAr: '+15% فرصة ضربة حاسمة في الحلبة',
    durationLabel: '24 ساعة',
    cornCost: 150,
    goldCost: 2,
    medalsCost: 20,
    starsCost: 0,
  },
  {
    id: 'egg_surge',
    nameAr: 'إكسير التفقيس المتوهج',
    descAr: '+20% طاقة إضافية من دمج البيض والمعبد',
    durationLabel: '24 ساعة',
    cornCost: 0,
    goldCost: 3,
    medalsCost: 18,
    starsCost: 2,
  },
  {
    id: 'buy_hammer',
    nameAr: 'صقل مطرقة الترقية (+1)',
    descAr: 'شحنة مطرقة فورية لترقية أي بيضة',
    durationLabel: 'فوري',
    cornCost: 220,
    goldCost: 2,
    medalsCost: 12,
    starsCost: 2,
  },
  {
    id: 'buy_automerge',
    nameAr: 'شحنة دمج ذكي (+1)',
    descAr: 'شحنة دمج تلقائي لساحة البيض',
    durationLabel: 'فوري',
    cornCost: 180,
    goldCost: 2,
    medalsCost: 10,
    starsCost: 0,
  },
];

export function getArenaEntryCost(rivalIndex: number, prestigeRank = 0, isRace = false): number {
  const base = isRace
    ? ECONOMY_LIMITS.RACE_ENTRY_COST
    : [45, 65, 85, 110][Math.max(0, Math.min(3, rivalIndex))];
  const discount = Math.min(0.4, Math.max(0, prestigeRank) * 0.02);
  return Math.max(25, Math.round(base * (1 - discount)));
}

/**
 * Active Treasury Soft-Cap:
 * EnergySoftCap(T) = 4,500 * (1 + 0.25 * (T - 1))
 */
export function getEnergySoftCap(playerTier: number): number {
  return Math.round(4500 * (1 + 0.25 * Math.max(0, playerTier - 1)));
}

export function applySoftCapDamping(
  rawEnergyGain: number,
  currentCorn: number,
  softCap: number
): { finalGain: number; damped: boolean; multiplier: number } {
  if (rawEnergyGain <= 0) return { finalGain: 0, damped: false, multiplier: 1 };
  if (currentCorn >= softCap * 1.5) {
    return {
      finalGain: Math.max(1, Math.round(rawEnergyGain * 0.3)),
      damped: true,
      multiplier: 0.3,
    };
  }
  if (currentCorn >= softCap) {
    return {
      finalGain: Math.max(1, Math.round(rawEnergyGain * 0.6)),
      damped: true,
      multiplier: 0.6,
    };
  }
  return { finalGain: Math.round(rawEnergyGain), damped: false, multiplier: 1 };
}

export function getDailyBurnRatio(treasury: TreasuryState): number {
  const earned = treasury.energyEarnedToday ?? 0;
  const burned = treasury.energyBurnedToday ?? 0;
  if (earned <= 0) return burned > 0 ? 100 : 0;
  return Math.min(999, Math.round((burned / earned) * 100));
}

/**
 * Progressive Barter Energy -> +10 Stars (max 4/day):
 * round(2800 * tierScale)
 */
export function getBarterEnergyForStarsCost(playerTier: number): number {
  return Math.round(2800 * getTierScale(playerTier));
}

/**
 * Inverse Stars -> Energy Barter with Spread Safeguard (~28% spread to prevent arbitrage)
 */
export function getBarterStarsToEnergyPayout(playerTier: number): number {
  return Math.round(2800 * getTierScale(playerTier) * 0.72);
}

/**
 * Progressive Barter Energy -> +12 Dragon Gold (max 3/day)
 */
export function getBarterEnergyForGoldCost(playerTier: number): number {
  return Math.round(2200 * getTierScale(playerTier));
}

export function getTraderDealStarCost(playerTier: number): number {
  return Math.round(22 * (1 + 0.12 * Math.max(0, playerTier - 1)));
}

export function getInstantSummonStarCost(rarity: 'UNCOMMON' | 'RARE', playerTier: number): number {
  const base = rarity === 'RARE' ? 42 : 16;
  return Math.round(base * (1 + 0.08 * Math.max(0, playerTier - 1)));
}

export function getDragonSellCornPrice(dragon: Duck, playerTier: number): number {
  const rarityVal =
    dragon.rarity === 'LEGENDARY'
      ? 680
      : dragon.rarity === 'EPIC'
        ? 440
        : dragon.rarity === 'RARE'
          ? 290
          : dragon.rarity === 'UNCOMMON'
            ? 185
            : 110;
  return Math.round((rarityVal * 3 + dragon.level * 140) * (1 + 0.08 * Math.max(0, playerTier - 1)));
}

export function getMarketListingScaledCornFloor(rarity: Rarity, playerTier: number): number {
  const base =
    rarity === 'LEGENDARY'
      ? 24000
      : rarity === 'EPIC'
        ? 11500
        : rarity === 'RARE'
          ? 4800
          : 2200;
  return Math.round(base * (1 + 0.14 * Math.max(0, playerTier - 1)));
}

/**
 * Automatically resets daily economic caps when local calendar day changes.
 */
export function syncDailyEconomyState(state: GameState): GameState {
  const today = getLocalDateKey();
  if (state.treasury.dailyDateKey === today) {
    return state;
  }
  return {
    ...state,
    treasury: {
      ...state.treasury,
      dailyDateKey: today,
      adsWatchedToday: 0,
      maxAdsPerDay: ECONOMY_LIMITS.MAX_DAILY_ADS,
      barterStarsToday: 0,
      barterGoldToday: 0,
      arenaFullWinsToday: 0,
      energyEarnedToday: 0,
      energyBurnedToday: 0,
      starsEarnedToday: 0,
      starsBurnedToday: 0,
      invitesClaimedToday: 0,
    },
    league: {
      ...state.league,
      dailyClaimed: false,
    },
    stats: {
      ...state.stats,
      dailyPassClaimedToday: false,
    },
  };
}

export type AdvisorActionType =
  | 'COLLECT_DMD'
  | 'CUSTOMIZE_STAR'
  | 'UNLOCK_SLOT'
  | 'TRAIN_DRAGON'
  | 'UPGRADE_TALENT'
  | 'CLAIM_LEAGUE'
  | 'CLAIM_TASK'
  | 'FEED_DRAGON'
  | 'CLAIM_TIMED'
  | 'GO_ARENA'
  | 'GO_EGGS';

export interface NextStepAdvice {
  id: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  title: string;
  reason: string;
  ctaLabel: string;
  action: AdvisorActionType;
  targetDuckIndex?: number;
  targetSlotIndex?: number;
  targetTab?: MainTab;
}

export function evaluateNextStepAdvice(
  state: GameState,
  timedBonusReadyIn: number,
  getRatePerHour: (d: Duck) => number,
  getMaxCap: (d: Duck) => number,
  checkSlotUnlock: (slotIdx: number, st: GameState) => { canUnlock: boolean; metCondition: boolean; reason: string },
  feedCostResolver: (level: number, rarity?: Rarity, playerTier?: number) => number
): NextStepAdvice {
  const playerTier = getPlayerTier(state);
  const softCap = getEnergySoftCap(playerTier);
  const active = state.ducks[state.activeDuckIndex] ?? state.ducks[0];

  // 1. Check any dragon near >= 80% DMD storage cap so generation doesn't stall
  for (let i = 0; i < state.ducks.length; i++) {
    const d = state.ducks[i];
    const rate = getRatePerHour(d);
    const cap = getMaxCap(d);
    if (rate > 0 && cap > 0 && d.dmdStored / cap >= 0.8) {
      return {
        id: `collect_${d.id}`,
        priority: 'URGENT',
        title: `خزان ${d.name} أوشك على الامتلاء`,
        reason: `اجمع +${d.dmdStored.toFixed(3)} DMD الآن حتى لا يتوقف التوليد عند السقف.`,
        ctaLabel: 'جمع DMD',
        action: 'COLLECT_DMD',
        targetDuckIndex: i,
      };
    }
  }

  // 2. Ready to unlock next squad slot
  if (state.unlockedSlots < 8) {
    const nextSlot = state.unlockedSlots;
    const slotCheck = checkSlotUnlock(nextSlot, state);
    if (slotCheck.canUnlock) {
      return {
        id: `unlock_slot_${nextSlot}`,
        priority: 'URGENT',
        title: `الخانة ${nextSlot + 1} جاهزة للفتح الآن!`,
        reason: 'استثمر نجومك لتوسيع السرب وزيادة طاقتك الإنتاجية.',
        ctaLabel: `فتح الخانة ${nextSlot + 1}`,
        action: 'UNLOCK_SLOT',
        targetSlotIndex: nextSlot,
      };
    }
  }

  // 3. Soft-cap guard: suggest burning Energy in Dragon Training or Squad Talents
  if (active && state.corn >= softCap * 0.85) {
    const trainCost = getDragonTrainingCost(active.trainingLevel ?? 0, playerTier);
    if (state.corn >= trainCost) {
      return {
        id: `train_softcap_${active.id}`,
        priority: 'URGENT',
        title: 'طاقتك تقترب من سقف الخزانة!',
        reason: `درّب ${active.name} الآن (${trainCost.toLocaleString()}⚡) لرفع الصحة والهجوم قبل تباطؤ التدفق.`,
        ctaLabel: `تدريب القوة (${trainCost}⚡)`,
        action: 'TRAIN_DRAGON',
      };
    }
    return {
      id: 'talent_softcap',
      priority: 'HIGH',
      title: 'استثمر فائض الطاقة في مواهب السرب',
      reason: 'طوّر مواهب السرب لحرق الفائض ورفع قوة كل التنانين قبل التحديث القادم.',
      ctaLabel: 'مواهب السرب',
      action: 'UPGRADE_TALENT',
    };
  }

  // 4. Dragon at LVL 5 with customLevel === 0 and enough stars to activate DMD
  const starGateCost = calculateCustomUpgradeCost(0);
  const frozenLv5Idx = state.ducks.findIndex((d) => d.level >= 5 && d.customLevel === 0);
  if (frozenLv5Idx >= 0 && state.stars >= starGateCost) {
    const target = state.ducks[frozenLv5Idx];
    return {
      id: `custom_star_${target.id}`,
      priority: 'URGENT',
      title: `فعّل توليد DMD لتنينك ${target.name}`,
      reason: `وصل إلى LVL 5! خصّصه بـ ★1 (${starGateCost} ★) لبدء إنتاج DMD بالساعة.`,
      ctaLabel: `ترقية ★1 (${starGateCost}★)`,
      action: 'CUSTOMIZE_STAR',
      targetDuckIndex: frozenLv5Idx,
    };
  }

  // 5. Ready daily task or daily league reward
  const readyTask = state.dailyTasks.find((t) => !t.claimed && t.progress >= t.target);
  if (readyTask) {
    return {
      id: 'claim_task',
      priority: 'HIGH',
      title: 'مهمة يومية مكتملة بانتظارك',
      reason: `استلم +${readyTask.rewardStars} ★ و +${readyTask.rewardEnergy} طاقة لدعم تطوير التنين.`,
      ctaLabel: 'استلام المكافأة',
      action: 'CLAIM_TASK',
    };
  }

  if (!state.league.dailyClaimed) {
    return {
      id: 'claim_league',
      priority: 'HIGH',
      title: 'مكافأة الدوري اليومية جاهزة',
      reason: 'احصل على حصتك اليومية من الطاقة والنجوم والذهب من تبويب الحلبة.',
      ctaLabel: 'استلام من الحلبة',
      action: 'CLAIM_LEAGUE',
      targetTab: 'ARENA',
    };
  }

  // 6. Timed supply chest ready
  if (timedBonusReadyIn === 0) {
    return {
      id: 'claim_timed',
      priority: 'HIGH',
      title: 'إمداد الطاقة المؤقت جاهز',
      reason: `استلم +${ECONOMY_LIMITS.TIMED_BONUS_ENERGY} طاقة وبيضة تنين جديدة.`,
      ctaLabel: 'استلام الإمداد',
      action: 'CLAIM_TIMED',
    };
  }

  // 7. Active dragon can be fed toward LVL 5
  const hasHarvest = state.godCards.some((g) => g.godKey === 'harvest' && g.owned);
  if (active && active.level < 5) {
    const rawCost = feedCostResolver(active.level, active.rarity, playerTier);
    const cost = hasHarvest ? Math.ceil(rawCost * 0.8) : rawCost;
    if (state.corn >= cost) {
      return {
        id: `feed_${active.id}`,
        priority: 'NORMAL',
        title: `طوّر ${active.name} نحو المرحلة ${active.level + 1}`,
        reason: `متبقي ${active.feedsRequired - active.feedsProgress} إطعام للترقية (${cost}⚡ صافي لكل نقرة).`,
        ctaLabel: `إطعام (${cost}⚡)`,
        action: 'FEED_DRAGON',
      };
    }
  }

  // 8. If active dragon is LVL 5 and can afford Intensive Training
  if (active && active.level >= 5) {
    const trainCost = getDragonTrainingCost(active.trainingLevel ?? 0, playerTier);
    if (state.corn >= trainCost) {
      return {
        id: `train_${active.id}`,
        priority: 'NORMAL',
        title: `تدريب القوة لـ ${active.name} (رتبة ${(active.trainingLevel ?? 0) + 1})`,
        reason: `حرق ${trainCost.toLocaleString()}⚡ يمنح +14 صحة و +2 هجوم دائم في الحلبة!`,
        ctaLabel: `تدريب (${trainCost}⚡)`,
        action: 'TRAIN_DRAGON',
      };
    }
  }

  // 9. Recommend Squad Talents if player has spare gold/medals
  const talents = state.pack.talents ?? { fury: 0, carapace: 0, incubation: 0, prestige: 0 };
  const furyCost = getSquadTalentCost('fury', talents.fury, playerTier);
  if (talents.fury < ECONOMY_LIMITS.MAX_TALENT_RANK && state.corn >= furyCost.corn && state.stats.medals >= furyCost.medals) {
    return {
      id: 'talent_fury',
      priority: 'NORMAL',
      title: 'طوّر موهبة غريزة الهجوم للسرب',
      reason: `ترقية جديدة متاحة مقابل ${furyCost.corn}⚡ و ${furyCost.medals}🏅 لرفع ضرر الحلبة.`,
      ctaLabel: 'مواهب السرب',
      action: 'UPGRADE_TALENT',
    };
  }

  // 10. Low on energy/stars -> recommend Arena skill duel or Egg merge
  if ((state.treasury.arenaFullWinsToday ?? 0) < ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS) {
    return {
      id: 'go_arena',
      priority: 'NORMAL',
      title: 'اكسب الطاقة والنجوم في الحلبة',
      reason: `متبقي لك ${ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS - (state.treasury.arenaFullWinsToday ?? 0)} انتصارات كاملة المكافأة اليوم مع الصدّ المضاد!`,
      ctaLabel: 'دخول الحلبة',
      action: 'GO_ARENA',
      targetTab: 'ARENA',
    };
  }

  return {
    id: 'go_eggs',
    priority: 'NORMAL',
    title: 'ادمج البيض في ساحة التفقيس',
    reason: 'حوّل البيض المتراكم إلى طاقة إضافية وقرابين لمعبد البركات.',
    ctaLabel: 'ساحة البيض',
    action: 'GO_EGGS',
    targetTab: 'EGGS',
  };
}
