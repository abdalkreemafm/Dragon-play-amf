import {
  DragonSize,
  Duck,
  EventModifiers,
  GameState,
  LiveEventConfig,
  MainTab,
  Rarity,
  RewardBundle,
  SquadTalentKey,
  StarEvolutionTierMeta,
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
  MAX_CUSTOM_STAR_LEVEL: 10,
  FEED_RESET_DURATION_MS: 8 * 3600 * 1000,
  BREEDING_DURATION_MS: 24 * 3600 * 1000,
  BREEDING_EGG_INTERVAL_MS: 15 * 60 * 1000,
} as const;

export const STAR_EVOLUTION_TIERS: StarEvolutionTierMeta[] = [
  {
    minStar: 0,
    nameAr: 'فطري',
    subtitleAr: 'التكوين الأساسي للتنين قبل التخصيص',
    auraColorHex: '#94a3b8',
    badgeClass: 'bg-slate-800/80 text-slate-300 border-slate-600/60',
  },
  {
    minStar: 1,
    nameAr: 'يافع ★1',
    subtitleAr: 'بداية فتح قيمة DMD في المحفظة',
    auraColorHex: '#38bdf8',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/50',
  },
  {
    minStar: 3,
    nameAr: 'مصقول ★3',
    subtitleAr: 'تشققات طاقة مصقولة وتوهج حراشف',
    auraColorHex: '#34d399',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60',
  },
  {
    minStar: 5,
    nameAr: 'عتيق ★5',
    subtitleAr: 'أشواك رونية متوهجة ونصف قيمة التنين',
    auraColorHex: '#a78bfa',
    badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-400/60',
  },
  {
    minStar: 7,
    nameAr: 'نجمي ★7',
    subtitleAr: 'هالة مدارية مزدوجة ونبض كوني',
    auraColorHex: '#f59e0b',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/60',
  },
  {
    minStar: 9,
    nameAr: 'سماوي ★9',
    subtitleAr: 'تاج نوراني قبل الختم النهائي',
    auraColorHex: '#f43f5e',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-400/60',
  },
  {
    minStar: 10,
    nameAr: 'مخصّص ★10',
    subtitleAr: 'مختوم في الخزانة وجاهز لاستبدال DMD',
    auraColorHex: '#fde047',
    badgeClass: 'bg-amber-400/30 text-yellow-200 border-yellow-300/80',
  },
];

export function clampCustomLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL, Math.floor(level)));
}

export function getStarTierMeta(customLevel: number): StarEvolutionTierMeta {
  const lv = clampCustomLevel(customLevel);
  let active = STAR_EVOLUTION_TIERS[0];
  for (const tier of STAR_EVOLUTION_TIERS) {
    if (lv >= tier.minStar) active = tier;
  }
  return active;
}

export const RARITY_FEED_MULT: Record<Rarity, number> = {
  COMMON: 1.0,
  UNCOMMON: 1.35,
  RARE: 1.75,
  EPIC: 2.25,
  LEGENDARY: 3.0,
};

export const RARITY_INDEX_ORDER: Rarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

// Exact 5-tier DMD pricing at Customization ★10 + XL / XXL ladder multipliers:
// عادي 15 | نادر 45 | ملحمي 120 | أسطوري 350 | خرافي 1000 | XL+خرافي 2500 | XXL+خرافي 6500
export const BASE_DMD_PRICE_BY_RARITY: Record<Rarity, number> = {
  COMMON: 15,
  UNCOMMON: 45,
  RARE: 120,
  EPIC: 350,
  LEGENDARY: 1000,
};

export const DMD_PRICE_LADDER = [15, 45, 120, 350, 1000, 2500, 6500] as const;

export function resolveDragonSize(dragon?: Pick<Duck, 'sizeTier' | 'xl'> | null): DragonSize {
  if (!dragon) return 'NORMAL';
  if (dragon.sizeTier === 'XXL') return 'XXL';
  if (dragon.sizeTier === 'XL' || dragon.xl) return 'XL';
  return 'NORMAL';
}

export function getDragonMaxDmdPrice(rarity: Rarity, size: DragonSize = 'NORMAL'): number {
  const baseIdx = Math.max(0, RARITY_INDEX_ORDER.indexOf(rarity));
  const sizeOffset = size === 'XXL' ? 2 : size === 'XL' ? 1 : 0;
  const targetIdx = Math.min(DMD_PRICE_LADDER.length - 1, baseIdx + sizeOffset);
  return DMD_PRICE_LADDER[targetIdx];
}

// Cumulative percentage unlocked across ★0..10 steps (strictly reaches 100% at ★10)
const CUSTOM_STEP_CUMULATIVE_PCT = [0, 5, 11, 18, 26, 35, 45, 57, 70, 84, 100] as const;

export function getCumulativeDmdAtCustomLevel(
  rarity: Rarity,
  size: DragonSize,
  customLevel: number
): number {
  const lv = clampCustomLevel(customLevel);
  const maxPrice = getDragonMaxDmdPrice(rarity, size);
  const pct = CUSTOM_STEP_CUMULATIVE_PCT[lv] ?? 0;
  return Math.round(maxPrice * (pct / 100) * 100) / 100;
}

export function getNextCustomDmdGain(dragon: Pick<Duck, 'rarity' | 'sizeTier' | 'xl' | 'customLevel'>): number {
  const lv = clampCustomLevel(dragon.customLevel);
  if (lv >= ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL) return 0;
  const size = resolveDragonSize(dragon);
  const cur = getCumulativeDmdAtCustomLevel(dragon.rarity, size, lv);
  const nxt = getCumulativeDmdAtCustomLevel(dragon.rarity, size, lv + 1);
  return Math.max(0, Math.round((nxt - cur) * 100) / 100);
}

export function getLocalDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Exact Player Tier formula (1..10)
 */
export function getPlayerTier(state: Pick<GameState, 'ducks' | 'unlockedSlots'>): number {
  const totalLevels = state.ducks.reduce((acc, d) => acc + Math.max(1, d.level), 0);
  const raw = 1 + Math.floor(totalLevels / 4 + Math.max(0, state.unlockedSlots - 3));
  return Math.max(1, Math.min(10, raw));
}

export function getTierScale(playerTier: number): number {
  return 1 + 0.18 * Math.max(0, playerTier - 1);
}

export interface LevelFeedScheduleRule {
  level: number;
  startCost: number;
  stepBlock: number;
  stages: [number, number, number];
  postStepInc: number;
  requiredClicks: number;
}

// Exact 5-Level Feeding Schedule:
// LVL 1: 100 clicks | 1 -> 2 (15) -> 3 (15) -> +3 per click
// LVL 2: 200 clicks | 2 -> 4 (20) -> 8 (20) -> +2 per click
// LVL 3: 300 clicks | 3 -> 6 (30) -> 12 (30) -> +3 per click
// LVL 4: 400 clicks | 4 -> 8 (40) -> 16 (40) -> +4 per click
// LVL 5: 500 clicks | 5 -> 10 (50) -> 20 (50) -> +5 per click
export const LEVEL_FEED_SCHEDULE: Record<number, LevelFeedScheduleRule> = {
  1: { level: 1, startCost: 1, stepBlock: 15, stages: [1, 2, 3], postStepInc: 3, requiredClicks: 100 },
  2: { level: 2, startCost: 2, stepBlock: 20, stages: [2, 4, 8], postStepInc: 2, requiredClicks: 200 },
  3: { level: 3, startCost: 3, stepBlock: 30, stages: [3, 6, 12], postStepInc: 3, requiredClicks: 300 },
  4: { level: 4, startCost: 4, stepBlock: 40, stages: [4, 8, 16], postStepInc: 4, requiredClicks: 400 },
  5: { level: 5, startCost: 5, stepBlock: 50, stages: [5, 10, 20], postStepInc: 5, requiredClicks: 500 },
};

export function getLevelRequiredFeeds(level: number): number {
  const clamped = Math.max(1, Math.min(5, Math.floor(level || 1)));
  return LEVEL_FEED_SCHEDULE[clamped].requiredClicks;
}

export function calculateScheduledFeedCost(
  level: number,
  clicksSinceReset = 0,
  rarity: Rarity = 'COMMON',
  size: DragonSize = 'NORMAL'
): number {
  const clampedLv = Math.max(1, Math.min(5, Math.floor(level || 1)));
  const rule = LEVEL_FEED_SCHEDULE[clampedLv];
  const c = Math.max(0, Math.floor(clicksSinceReset));

  let baseCost: number;
  if (c < rule.stepBlock) {
    baseCost = rule.stages[0];
  } else if (c < rule.stepBlock * 2) {
    baseCost = rule.stages[1];
  } else if (c < rule.stepBlock * 3) {
    baseCost = rule.stages[2];
  } else {
    const extraClicks = c - rule.stepBlock * 3 + 1;
    baseCost = rule.stages[2] + extraClicks * rule.postStepInc;
  }

  const rarityMult = RARITY_FEED_MULT[rarity] ?? 1.0;
  const sizeMult = size === 'XXL' ? 2.2 : size === 'XL' ? 1.5 : 1.0;
  return Math.max(1, Math.round(baseCost * rarityMult * sizeMult));
}

export function calculateFeedCost(level: number): number {
  return calculateScheduledFeedCost(level, 0, 'COMMON', 'NORMAL');
}

export function calculateDragonFeedCost(
  level: number,
  rarity: Rarity = 'COMMON',
  _playerTier = 1,
  clicksSinceReset = 0,
  size: DragonSize = 'NORMAL'
): number {
  return calculateScheduledFeedCost(level, clicksSinceReset, rarity, size);
}

/**
 * Breeding Eggs cost to instantly upgrade an XL or XXL dragon by +1 level (LVL 1..4 -> +1)
 */
export function getXlEggUpgradeCost(level: number, size: DragonSize): number {
  if (size === 'NORMAL' || level >= 5) return 0;
  return size === 'XXL' ? level * 8 : level * 4;
}

/**
 * Chronological Acquisition Slot Assignment:
 * Oldest acquired dragons (lowest unlockedAt) occupy Slots 0 .. unlockedSlots - 1.
 */
export function normalizeDragonSlots(ducks: Duck[], unlockedSlots: number): Duck[] {
  const sorted = [...ducks].sort((a, b) => (a.unlockedAt || 0) - (b.unlockedAt || 0));
  return sorted.map((d, idx) => ({
    ...d,
    slotIndex: idx < unlockedSlots ? idx : null,
  }));
}

/**
 * Exact 10-step Star Customization Cost Formula (★0 -> ★10):
 * 10★, 20★, 30★, 40★, 50★, 60★, 70★, 80★, 90★, 100★
 */
export function calculateCustomUpgradeCost(customLevel: number): number {
  const lv = clampCustomLevel(customLevel);
  if (lv >= ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL) return 0;
  return (lv + 1) * 10;
}

export function getCustomDmdMultiplier(customLevel: number): number {
  const lv = clampCustomLevel(customLevel);
  return 1 + lv * 0.12;
}

export function resolveEventModifiers(eventConfig?: LiveEventConfig | null): EventModifiers {
  if (!eventConfig) {
    return { starBonusMult: 1, arenaEnergyMult: 1, templeEnergyMult: 1, badgeText: 'اعتيادي' };
  }
  return {
    starBonusMult: Math.max(1, eventConfig.starBonusMult),
    arenaEnergyMult: Math.max(1, eventConfig.arenaEnergyMult),
    templeEnergyMult: Math.max(1, eventConfig.templeEnergyMult),
    badgeText: eventConfig.badgeText,
  };
}

export function grantRewardBundle(
  state: GameState,
  bundle: RewardBundle,
  options?: { applySoftCap?: boolean; trackDailyEnergy?: boolean }
): { nextState: GameState; grantedEnergy: number } {
  const playerTier = getPlayerTier(state);
  const softCap = getEnergySoftCap(playerTier);
  const rawCorn = Math.max(0, Math.round(bundle.corn ?? 0));
  const grantedEnergy =
    rawCorn > 0
      ? options?.applySoftCap
        ? applySoftCapDamping(rawCorn, state.corn, softCap).finalGain
        : rawCorn
      : 0;
  const starsGain = Math.max(0, Math.round(bundle.stars ?? 0));
  const goldGain = Math.max(0, Math.round(bundle.duckGold ?? 0));
  const xpGain = Math.max(0, Math.round(bundle.battlePassXp ?? 0));

  const nextState: GameState = {
    ...state,
    corn: state.corn + grantedEnergy,
    stars: state.stars + starsGain,
    duckGold: state.duckGold + goldGain,
    eggQueue: bundle.eggs?.length ? [...state.eggQueue, ...bundle.eggs] : state.eggQueue,
    battlePass:
      xpGain > 0
        ? { ...state.battlePass, xp: state.battlePass.xp + xpGain }
        : state.battlePass,
    tournament:
      bundle.tournamentScore && bundle.tournamentScore > 0
        ? { ...state.tournament, score: state.tournament.score + bundle.tournamentScore }
        : state.tournament,
    stats: {
      ...state.stats,
      medals: state.stats.medals + (bundle.medals ?? 0),
      hearts: state.stats.hearts + (bundle.hearts ?? 0),
      keys: state.stats.keys + (bundle.keys ?? 0),
      honorLetters: state.stats.honorLetters + (bundle.honorLetters ?? 0),
      coinsOfChange: state.stats.coinsOfChange + (bundle.coinsOfChange ?? 0),
      autoMergeBoosters: state.stats.autoMergeBoosters + (bundle.autoMergeBoosters ?? 0),
      hammerBoosters: state.stats.hammerBoosters + (bundle.hammerBoosters ?? 0),
    },
    treasury: {
      ...state.treasury,
      energyEarnedToday:
        (state.treasury.energyEarnedToday ?? 0) +
        (options?.trackDailyEnergy === false ? 0 : grantedEnergy),
      starsEarnedToday: (state.treasury.starsEarnedToday ?? 0) + starsGain,
    },
  };

  return { nextState, grantedEnergy };
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
      dailyPassDay: state.stats.dailyPassClaimedToday
        ? ((Math.max(1, state.stats.dailyPassDay || 1)) % 7) + 1
        : Math.min(7, Math.max(1, state.stats.dailyPassDay || 1)),
      dailyPassClaimedToday: false,
    },
  };
}

export type AdvisorActionType =
  | 'START_BREEDING'
  | 'UPGRADE_XL_EGG'
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
  _getRatePerHour: (d: Duck) => number,
  _getMaxCap: (d: Duck) => number,
  checkSlotUnlock: (slotIdx: number, st: GameState) => { canUnlock: boolean; metCondition: boolean; reason: string },
  _feedCostResolver: (level: number, rarity?: Rarity, playerTier?: number) => number
): NextStepAdvice {
  const playerTier = getPlayerTier(state);
  const softCap = getEnergySoftCap(playerTier);
  const active = state.ducks[state.activeDuckIndex] ?? state.ducks[0];

  // 1. Dragon completed feeding for LVL 1..4 and ready to open 24h breeding gate
  const readyBreedIdx = state.ducks.findIndex(
    (d) => d.level < 5 && d.feedsProgress >= d.feedsRequired && !d.breedingEndsAt
  );
  if (readyBreedIdx >= 0) {
    const target = state.ducks[readyBreedIdx];
    return {
      id: `breed_gate_${target.id}`,
      priority: 'URGENT',
      title: `بوابة التزاوج جاهزة لـ ${target.name}`,
      reason: `أكمل إطعام المستوى ${target.level}! ابدأ تزاوج 24 ساعة للانتقال إلى LVL ${target.level + 1} وكسب بيضة كل 15د.`,
      ctaLabel: 'بدء التزاوج (24س)',
      action: 'START_BREEDING',
      targetDuckIndex: readyBreedIdx,
    };
  }

  // 2. XL/XXL dragon can be upgraded with Breeding Eggs
  const eggUpgradeIdx = state.ducks.findIndex((d) => {
    const sz = resolveDragonSize(d);
    if (sz === 'NORMAL' || d.level >= 5) return false;
    return (state.breedingEggs ?? 0) >= getXlEggUpgradeCost(d.level, sz);
  });
  if (eggUpgradeIdx >= 0) {
    const target = state.ducks[eggUpgradeIdx];
    const sz = resolveDragonSize(target);
    const reqEggs = getXlEggUpgradeCost(target.level, sz);
    return {
      id: `xl_egg_up_${target.id}`,
      priority: 'URGENT',
      title: `ترقية ${target.name} (${sz}) ببيض التزاوج`,
      reason: `لديك ${state.breedingEggs ?? 0} بيضة تزاوج! استخدم ${reqEggs} بيضة للترقية الفورية إلى LVL ${target.level + 1}.`,
      ctaLabel: `ترقية (${reqEggs} 🥚)`,
      action: 'UPGRADE_XL_EGG',
      targetDuckIndex: eggUpgradeIdx,
    };
  }

  // 3. Ready to unlock next squad slot
  if (state.unlockedSlots < 8) {
    const nextSlot = state.unlockedSlots;
    const slotCheck = checkSlotUnlock(nextSlot, state);
    if (slotCheck.canUnlock) {
      return {
        id: `unlock_slot_${nextSlot}`,
        priority: 'URGENT',
        title: `الخانة ${nextSlot + 1} جاهزة للفتح الآن!`,
        reason: 'استثمر نجومك لتوسيع السرب حسب أقدمية الحصول على التنانين.',
        ctaLabel: `فتح الخانة ${nextSlot + 1}`,
        action: 'UNLOCK_SLOT',
        targetSlotIndex: nextSlot,
      };
    }
  }

  // 4. Soft-cap guard: suggest burning Energy in Dragon Training or Squad Talents
  if (active && state.corn >= softCap * 0.85) {
    const trainCost = getDragonTrainingCost(active.trainingLevel ?? 0, playerTier);
    if (state.corn >= trainCost) {
      return {
        id: `train_softcap_${active.id}`,
        priority: 'URGENT',
        title: 'طاقتك تقترب من سقف الخزانة!',
        reason: `درّب ${active.name} الآن (${trainCost.toLocaleString()}⚡) لرفع الصحة والهجوم.`,
        ctaLabel: `تدريب القوة (${trainCost}⚡)`,
        action: 'TRAIN_DRAGON',
      };
    }
    return {
      id: 'talent_softcap',
      priority: 'HIGH',
      title: 'استثمر فائض الطاقة في مواهب السرب',
      reason: 'طوّر مواهب السرب لحرق الفائض ورفع قوة كل التنانين.',
      ctaLabel: 'مواهب السرب',
      action: 'UPGRADE_TALENT',
    };
  }

  // 5. Dragon at LVL 5 ready for Star Customization ★1..10 toward DMD exchange value
  const customIdx = state.ducks.findIndex(
    (d) => d.level >= 5 && d.customLevel < ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL && state.stars >= calculateCustomUpgradeCost(d.customLevel)
  );
  if (customIdx >= 0) {
    const target = state.ducks[customIdx];
    const starCost = calculateCustomUpgradeCost(target.customLevel);
    const dmdGain = getNextCustomDmdGain(target);
    return {
      id: `custom_star_${target.id}`,
      priority: 'URGENT',
      title: `تخصيص ★${target.customLevel + 1} لـ ${target.name}`,
      reason: `يضيف +${dmdGain} DMD إلى رصيد محفظتك مقابل ${starCost} ★.`,
      ctaLabel: `تخصيص ★${target.customLevel + 1} (${starCost}★)`,
      action: 'CUSTOMIZE_STAR',
      targetDuckIndex: customIdx,
    };
  }

  // 6. Ready daily task or daily league reward
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

  // 7. Timed supply chest ready
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

  // 8. Active dragon can still be fed
  const hasHarvest = state.godCards.some((g) => g.godKey === 'harvest' && g.owned);
  if (active && !active.breedingEndsAt && active.feedsProgress < active.feedsRequired) {
    const rawCost = calculateScheduledFeedCost(
      active.level,
      active.feedClicksSinceReset ?? 0,
      active.rarity,
      resolveDragonSize(active)
    );
    const cost = hasHarvest ? Math.max(1, Math.ceil(rawCost * 0.8)) : rawCost;
    if (state.corn >= cost) {
      return {
        id: `feed_${active.id}`,
        priority: 'NORMAL',
        title: `أطعم ${active.name} (LVL ${active.level})`,
        reason: `متبقي ${active.feedsRequired - active.feedsProgress} ضغطة (${cost}⚡ للضغطة · يعاد ضبط التكلفة خلال 8 ساعات).`,
        ctaLabel: `إطعام (${cost}⚡)`,
        action: 'FEED_DRAGON',
      };
    }
  }

  // 9. Low on energy/stars -> recommend Arena or Egg merge
  if ((state.treasury.arenaFullWinsToday ?? 0) < ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS) {
    return {
      id: 'go_arena',
      priority: 'NORMAL',
      title: 'اكسب الطاقة والنجوم في الحلبة',
      reason: `متبقي لك ${ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS - (state.treasury.arenaFullWinsToday ?? 0)} انتصارات كاملة المكافأة اليوم.`,
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
