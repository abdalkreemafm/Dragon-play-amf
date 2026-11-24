import {
  AllianceEmblemId,
  AllianceGiftItem,
  AllianceJoinConditions,
  AllianceLedger,
  AllianceLogEntry,
  AllianceMapTargetType,
  AllianceMemberRole,
  AllianceNotification,
  AllianceRallyDragon,
  AllianceRewardPool,
  AllianceTechId,
  DragonSize,
  Duck,
  DuckAuraId,
  DuckGearId,
  DuckSkinId,
  EggItemType,
  EventModifiers,
  GameState,
  LiveEventConfig,
  MainTab,
  Rarity,
  RewardBundle,
  SquadTalentKey,
  StarEvolutionTierMeta,
  SwarmDragonDonationEntry,
  SwarmDragonGearSlot,
  SwarmDragonState,
  SwarmDragonUpgradeKey,
  TreasuryState,
} from '../types/game';

const EGG_SELL_REWARD_MAP: Record<EggItemType, { corn: number; stars: number; gold: number }> = {
  egg_1: { corn: 5, stars: 0, gold: 0 },
  egg_2: { corn: 12, stars: 0, gold: 0 },
  egg_3: { corn: 24, stars: 0, gold: 0 },
  egg_4: { corn: 48, stars: 1, gold: 0 },
  egg_5: { corn: 95, stars: 1, gold: 0 },
  egg_6: { corn: 180, stars: 2, gold: 0 },
  egg_7: { corn: 340, stars: 3, gold: 1 },
  egg_love: { corn: 560, stars: 5, gold: 2 },
  grapes: { corn: 12, stars: 0, gold: 0 },
  chalice: { corn: 32, stars: 0, gold: 0 },
  cornucopia: { corn: 85, stars: 1, gold: 0 },
  feast: { corn: 220, stars: 2, gold: 1 },
  chest: { corn: 0, stars: 0, gold: 0 },
};

export function getEggSellReward(item: EggItemType): { corn: number; stars: number; gold: number } {
  return EGG_SELL_REWARD_MAP[item] ?? { corn: 5, stars: 0, gold: 0 };
}

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
  AUCTION_LISTING_FEE_RATE: 0.05,
  AUCTION_SALE_TAX_RATE: 0.08,
  ENERGY_HARD_CAP_MULT: 2.5,
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
  const hardCap = getEnergyHardCap(playerTier);
  const rawCorn = Math.max(0, Math.round(bundle.corn ?? 0));
  const softAdjusted =
    rawCorn > 0
      ? options?.applySoftCap
        ? applySoftCapDamping(rawCorn, state.corn, softCap, state.treasury.energyEarnedToday ?? 0).finalGain
        : rawCorn
      : 0;
  const grantedEnergy = Math.max(0, Math.min(softAdjusted, Math.max(0, hardCap - state.corn)));
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

export function getEnergyHardCap(playerTier: number): number {
  return Math.round(getEnergySoftCap(playerTier) * ECONOMY_LIMITS.ENERGY_HARD_CAP_MULT);
}

export function applySoftCapDamping(
  rawEnergyGain: number,
  currentCorn: number,
  softCap: number,
  energyEarnedToday = 0
): { finalGain: number; damped: boolean; multiplier: number } {
  if (rawEnergyGain <= 0) return { finalGain: 0, damped: false, multiplier: 1 };
  let mult = 1;
  if (currentCorn >= softCap * 1.5) {
    mult *= 0.3;
  } else if (currentCorn >= softCap) {
    mult *= 0.6;
  }
  // Daily inflation damper: slows passive farming beyond 3.5x daily soft cap
  if (energyEarnedToday >= softCap * 3.5) {
    mult *= 0.5;
  }
  if (mult < 1) {
    return {
      finalGain: Math.max(1, Math.round(rawEnergyGain * mult)),
      damped: true,
      multiplier: Number(mult.toFixed(2)),
    };
  }
  return { finalGain: Math.round(rawEnergyGain), damped: false, multiplier: 1 };
}

export function getAuctionPriceBand(
  rarity: Rarity,
  level: number,
  sizeTier: DragonSize
): { minStart: number; maxStart: number; suggestedStart: number; minStars: number; maxStars: number; suggestedStars: number } {
  const baseMap: Record<Rarity, { min: number; max: number; starsMin: number; starsMax: number }> = {
    COMMON: { min: 300, max: 12000, starsMin: 5, starsMax: 60 },
    UNCOMMON: { min: 800, max: 35000, starsMin: 10, starsMax: 140 },
    RARE: { min: 2000, max: 95000, starsMin: 20, starsMax: 350 },
    EPIC: { min: 5000, max: 240000, starsMin: 40, starsMax: 900 },
    LEGENDARY: { min: 12000, max: 650000, starsMin: 80, starsMax: 2500 },
  };
  const b = baseMap[rarity] ?? baseMap.COMMON;
  const lvMult = 1 + Math.max(0, level - 1) * 0.22;
  const sizeMult = sizeTier === 'XXL' ? 1.85 : sizeTier === 'XL' ? 1.35 : 1;
  const minStart = Math.round(b.min * lvMult * sizeMult);
  const maxStart = Math.round(b.max * lvMult * sizeMult);
  const suggestedStart = Math.round(minStart * 1.75);
  const minStars = Math.round(b.starsMin * sizeMult);
  const maxStars = Math.round(b.starsMax * sizeMult);
  const suggestedStars = Math.round((minStars + maxStars * 0.35));
  return { minStart, maxStart, suggestedStart, minStars, maxStars, suggestedStars };
}

export function calculateAuctionListingFee(startPriceCorn: number): number {
  return Math.max(25, Math.round(startPriceCorn * ECONOMY_LIMITS.AUCTION_LISTING_FEE_RATE));
}

export function calculateAuctionNetProceeds(grossAmount: number): { net: number; taxBurned: number } {
  const safe = Math.max(0, Math.round(grossAmount));
  const taxBurned = Math.floor(safe * ECONOMY_LIMITS.AUCTION_SALE_TAX_RATE);
  return {
    net: Math.max(1, safe - taxBurned),
    taxBurned,
  };
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

export const ALLIANCE_DAILY_LIMITS = {
  MAX_DONATIONS_PER_DAY: 15,
  MAX_HELPS_PER_DAY: 10,
  MAX_BOSS_ATTACKS_PER_DAY: 5,
  BREEDING_HELP_REDUCTION_MS: 2 * 3600 * 1000,
  BREEDING_HELP_COOLDOWN_MS: 4 * 3600 * 1000,
  DIVIDEND_COOLDOWN_MS: 2 * 3600 * 1000,
  MAX_ALLIANCE_LEVEL: 30,
} as const;

export type AllianceDonationKind =
  | 'CORN_SMALL'
  | 'CORN_CONVOY'
  | 'CORN_TITAN'
  | 'GOLD_ROYAL';

export interface AllianceDonationTierMeta {
  id: AllianceDonationKind;
  titleAr: string;
  subtitleAr: string;
  energyCost: number;
  goldCost: number;
  vaultCornGain: number;
  vaultGoldGain: number;
  techPointsGain: number;
  xpGain: number;
  coinsGain: number;
  powerGain: number;
  activityGain: number;
  starsReward: number;
}

export const ALLIANCE_EMBLEM_CATALOG: Array<{
  id: AllianceEmblemId;
  nameAr: string;
  descAr: string;
  bgGradient: string;
  borderClass: string;
  iconColorClass: string;
}> = [
  {
    id: 'dragon_shield',
    nameAr: 'درع التنين الذهبي',
    descAr: 'رمز الفرسان وحماة العش',
    bgGradient: 'from-rose-500/35 to-amber-500/25',
    borderClass: 'border-amber-400/60',
    iconColorClass: 'text-amber-300',
  },
  {
    id: 'royal_crown',
    nameAr: 'تاج السلطان الأعظم',
    descAr: 'شعار الملوك وسيادة المملكة',
    bgGradient: 'from-amber-500/35 to-yellow-600/25',
    borderClass: 'border-yellow-400/65',
    iconColorClass: 'text-yellow-300',
  },
  {
    id: 'phoenix_wing',
    nameAr: 'جناح العنقاء الناري',
    descAr: 'النهوض والانطلاق نحو الغارات',
    bgGradient: 'from-orange-500/35 to-rose-600/25',
    borderClass: 'border-orange-400/60',
    iconColorClass: 'text-orange-300',
  },
  {
    id: 'sun_pyramid',
    nameAr: 'هرم النور الخالد',
    descAr: 'السيطرة على أهرام المملكة',
    bgGradient: 'from-amber-400/30 to-emerald-500/25',
    borderClass: 'border-amber-300/60',
    iconColorClass: 'text-amber-200',
  },
  {
    id: 'storm_fang',
    nameAr: 'ناب العاصفة الزرقاء',
    descAr: 'سرعة المسير وضربات البرق',
    bgGradient: 'from-sky-500/35 to-indigo-600/25',
    borderClass: 'border-sky-400/60',
    iconColorClass: 'text-sky-300',
  },
  {
    id: 'eternal_flame',
    nameAr: 'شعلة المجد الأبدية',
    descAr: 'روح القتال في الحلبة والزعماء',
    bgGradient: 'from-rose-600/35 to-purple-600/25',
    borderClass: 'border-rose-400/60',
    iconColorClass: 'text-rose-300',
  },
  {
    id: 'obsidian_sword',
    nameAr: 'سيف الأساطير المزدوج',
    descAr: 'شعار التحشيد وكسر الحصون',
    bgGradient: 'from-slate-600/45 to-cyan-600/25',
    borderClass: 'border-cyan-400/60',
    iconColorClass: 'text-cyan-300',
  },
  {
    id: 'emerald_throne',
    nameAr: 'عرش الزمرد والثروة',
    descAr: 'الخزينة الوفيرة وتوزيع الأرباح',
    bgGradient: 'from-emerald-500/35 to-teal-600/25',
    borderClass: 'border-emerald-400/60',
    iconColorClass: 'text-emerald-300',
  },
];

export const ALLIANCE_DONATION_TIERS: AllianceDonationTierMeta[] = [
  {
    id: 'CORN_SMALL',
    titleAr: 'تبرع الطليعة',
    subtitleAr: 'دعم سريع لخزينة السرب ومجمع البحث',
    energyCost: 500,
    goldCost: 0,
    vaultCornGain: 2200,
    vaultGoldGain: 0,
    techPointsGain: 2800,
    xpGain: 3500,
    coinsGain: 120,
    powerGain: 35,
    activityGain: 12,
    starsReward: 0,
  },
  {
    id: 'CORN_CONVOY',
    titleAr: 'قافلة الإمداد الكبرى',
    subtitleAr: 'تمويل ضخم لخزينة السرب وأبحاث 100K+',
    energyCost: 2500,
    goldCost: 0,
    vaultCornGain: 12500,
    vaultGoldGain: 0,
    techPointsGain: 15000,
    xpGain: 18000,
    coinsGain: 540,
    powerGain: 140,
    activityGain: 25,
    starsReward: 1,
  },
  {
    id: 'CORN_TITAN',
    titleAr: 'خزينة التنين الأعظم',
    subtitleAr: 'تبرع إمبراطوري يقفز بتمويل البحث والجدارة',
    energyCost: 10000,
    goldCost: 0,
    vaultCornGain: 54000,
    vaultGoldGain: 1,
    techPointsGain: 62000,
    xpGain: 65000,
    coinsGain: 2100,
    powerGain: 520,
    activityGain: 45,
    starsReward: 3,
  },
  {
    id: 'GOLD_ROYAL',
    titleAr: 'هبة الذهب الملكي',
    subtitleAr: 'يُودع ذهب التنانين مباشرة لبدء أبحاث السرب العليا',
    energyCost: 0,
    goldCost: 5,
    vaultCornGain: 30000,
    vaultGoldGain: 5,
    techPointsGain: 45000,
    xpGain: 45000,
    coinsGain: 1350,
    powerGain: 320,
    activityGain: 35,
    starsReward: 5,
  },
];

export interface AllianceQuestMeta {
  id: 'aq_feed' | 'aq_merge' | 'aq_errands' | 'aq_donate' | 'aq_boss';
  titleAr: string;
  descAr: string;
  target: number;
  activityPts: number;
  allianceCoins: number;
  corn: number;
  stars: number;
  xp: number;
}

export const ALLIANCE_QUESTS_CATALOG: AllianceQuestMeta[] = [
  {
    id: 'aq_feed',
    titleAr: 'إمداد تنانين السرب',
    descAr: 'أطعم تنانينك 15 مرة اليوم لدعم الجاهزية القتالية.',
    target: 15,
    activityPts: 20,
    allianceCoins: 110,
    corn: 280,
    stars: 2,
    xp: 4500,
  },
  {
    id: 'aq_merge',
    titleAr: 'تفريخ الحضّانات',
    descAr: 'نفّذ 10 عمليات دمج بيض لتغذية خزينة العش.',
    target: 10,
    activityPts: 20,
    allianceCoins: 120,
    corn: 320,
    stars: 2,
    xp: 5500,
  },
  {
    id: 'aq_errands',
    titleAr: 'قرابين السرب',
    descAr: 'سلّم 3 طلبات لمعبد التفقيس باسم السرب.',
    target: 3,
    activityPts: 25,
    allianceCoins: 160,
    corn: 420,
    stars: 3,
    xp: 7200,
  },
  {
    id: 'aq_donate',
    titleAr: 'دعم خزينة السرب',
    descAr: 'تبرع للخزينة أو تقنيات السرب 3 مرات اليوم.',
    target: 3,
    activityPts: 20,
    allianceCoins: 180,
    corn: 350,
    stars: 3,
    xp: 8500,
  },
  {
    id: 'aq_boss',
    titleAr: 'غارة زعيم السرب',
    descAr: 'هاجم تنين العاصفة المشترك مرتين اليوم.',
    target: 2,
    activityPts: 25,
    allianceCoins: 220,
    corn: 500,
    stars: 4,
    xp: 10000,
  },
];

export interface AllianceActivityChestMeta {
  threshold: number;
  titleAr: string;
  corn: number;
  stars: number;
  duckGold: number;
  allianceCoins: number;
}

export const ALLIANCE_ACTIVITY_CHESTS: AllianceActivityChestMeta[] = [
  { threshold: 25, titleAr: 'صندوق الطليعة', corn: 320, stars: 2, duckGold: 0, allianceCoins: 90 },
  { threshold: 50, titleAr: 'صندوق الإخوة', corn: 580, stars: 3, duckGold: 1, allianceCoins: 150 },
  { threshold: 80, titleAr: 'صندوق الغنائم', corn: 920, stars: 5, duckGold: 2, allianceCoins: 240 },
  { threshold: 100, titleAr: 'صندوق عرش العش', corn: 1500, stars: 8, duckGold: 4, allianceCoins: 420 },
];

export interface AllianceShopOffer {
  id: 'shop_energy' | 'shop_eggs' | 'shop_breed_eggs' | 'shop_stars' | 'shop_automerge' | 'shop_hammer' | 'shop_gold';
  titleAr: string;
  descAr: string;
  costCoins: number;
  badgeText: string;
}

export const ALLIANCE_SHOP_CATALOG: AllianceShopOffer[] = [
  {
    id: 'shop_energy',
    titleAr: 'إمداد طاقة السرب',
    descAr: '+650 طاقة فورية لتطوير التنانين ودعم الخزينة',
    costCoins: 140,
    badgeText: '+650⚡',
  },
  {
    id: 'shop_eggs',
    titleAr: 'صندوق بيض السرب',
    descAr: '+2 بيضة تنين [2] لساحة الدمج',
    costCoins: 180,
    badgeText: '+2 🥚[2]',
  },
  {
    id: 'shop_breed_eggs',
    titleAr: 'بيض تزاوج نقي',
    descAr: '+3 بيضة تزاوج لترقية تنانين XL و XXL',
    costCoins: 260,
    badgeText: '+3 بيضة XL',
  },
  {
    id: 'shop_stars',
    titleAr: 'وسام نجوم التحالف',
    descAr: '+6 نجوم ★ لتخصيص التنانين وفتح الخانات',
    costCoins: 320,
    badgeText: '+6 ★',
  },
  {
    id: 'shop_automerge',
    titleAr: 'معزز الدمج التلقائي',
    descAr: '+2 شحنة دمج ذكي لساحة البيض',
    costCoins: 350,
    badgeText: '+2 ⚡',
  },
  {
    id: 'shop_hammer',
    titleAr: 'مطرقة الصائغ الملكي',
    descAr: '+2 مطرقة ترقية فورية لأي بيضة',
    costCoins: 390,
    badgeText: '+2 🔨',
  },
  {
    id: 'shop_gold',
    titleAr: 'سبيكة ذهب التنانين',
    descAr: '+5 ذهب التنانين 💎 لتفعيل البركات والمواهب',
    costCoins: 520,
    badgeText: '+5 💎',
  },
];

export const ALLIANCE_ROLE_META: Record<
  AllianceMemberRole,
  {
    rankCode: 'R5' | 'R4' | 'R3' | 'R1';
    labelAr: string;
    badgeClass: string;
    perkAr: string;
    dividendMult: number;
  }
> = {
  LEADER: {
    rankCode: 'R5',
    labelAr: 'قائد السرب',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/60',
    perkAr: 'إدارة التحالف + معامل توزيع أرباح ×1.25',
    dividendMult: 1.25,
  },
  DEPUTY: {
    rankCode: 'R4',
    labelAr: 'نائب القائد',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-400/60',
    perkAr: '+15% مكافآت غارة الزعيم + معامل أرباح ×1.15',
    dividendMult: 1.15,
  },
  ELITE: {
    rankCode: 'R3',
    labelAr: 'عضو مميز',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-400/60',
    perkAr: 'أولوية صناديق الغنائم + معامل أرباح ×1.08',
    dividendMult: 1.08,
  },
  MEMBER: {
    rankCode: 'R1',
    labelAr: 'عضو السرب',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/60',
    perkAr: 'المساهمة اليومية في المهام والخزينة (×1.00)',
    dividendMult: 1.0,
  },
};

export interface AllianceCoopMissionMeta {
  id: 'coop_eggs' | 'coop_feeds' | 'coop_treasury' | 'coop_boss';
  titleAr: string;
  descAr: string;
  unitAr: string;
  target: number;
  initialSeed: number;
  supportCostCorn: number;
  supportBoost: number;
  rewardCorn: number;
  rewardCoins: number;
  rewardStars: number;
  rewardGold: number;
  rewardEgg?: EggItemType;
  rewardBreedingEggs?: number;
  rewardXp: number;
}

export const ALLIANCE_COOP_MISSIONS_CATALOG: AllianceCoopMissionMeta[] = [
  {
    id: 'coop_eggs',
    titleAr: 'حملة تجميع ودمج البيض الكبرى',
    descAr: 'يتعاون أعضاء السرب لدمج 1,500 بيضة وتنمية الحضّانة الإمبراطورية.',
    unitAr: 'بيضة',
    target: 1500,
    initialSeed: 720,
    supportCostCorn: 400,
    supportBoost: 95,
    rewardCorn: 1400,
    rewardCoins: 420,
    rewardStars: 6,
    rewardGold: 1,
    rewardEgg: 'egg_4',
    rewardXp: 22000,
  },
  {
    id: 'coop_feeds',
    titleAr: 'وليمة إطعام تنانين العش الضخمة',
    descAr: '4,000 عملية إطعام جماعية لرفع قوة جميع أساطيل السرب.',
    unitAr: 'إطعام',
    target: 4000,
    initialSeed: 1850,
    supportCostCorn: 450,
    supportBoost: 240,
    rewardCorn: 1800,
    rewardCoins: 520,
    rewardStars: 7,
    rewardGold: 2,
    rewardXp: 28000,
  },
  {
    id: 'coop_treasury',
    titleAr: 'تحصين خزينة السرب الإمبراطورية',
    descAr: 'الوصول بالخزينة الجماعية إلى 250,000 طاقة لتمويل أبحاث السرب العليا والحصارات.',
    unitAr: '⚡',
    target: 250000,
    initialSeed: 125000,
    supportCostCorn: 800,
    supportBoost: 6500,
    rewardCorn: 2800,
    rewardCoins: 750,
    rewardStars: 8,
    rewardGold: 4,
    rewardXp: 42000,
  },
  {
    id: 'coop_boss',
    titleAr: 'حملة إبادة زعماء السرب',
    descAr: 'إلحاق 120,000 ضرر جماعي بزعماء السرب عبر غارات الأعضاء المتتالية.',
    unitAr: 'ضرر',
    target: 120000,
    initialSeed: 48000,
    supportCostCorn: 600,
    supportBoost: 7200,
    rewardCorn: 3200,
    rewardCoins: 900,
    rewardStars: 10,
    rewardGold: 5,
    rewardBreedingEggs: 4,
    rewardXp: 58000,
  },
];

export interface AllianceRosterNpc {
  id: string;
  name: string;
  role: AllianceMemberRole;
  rank: 'R5' | 'R4' | 'R3' | 'R2' | 'R1';
  titleAr: string;
  power: number;
  weeklyContrib: number;
  donatedEnergy: number;
  donatedTech: number;
  rallyScore: number;
  dailyActivity: number;
  lastSeenAr: string;
  online: boolean;
}

export const ALLIANCE_ROSTER_MEMBERS: AllianceRosterNpc[] = [
  {
    id: 'm_leader',
    name: 'DRAGON_LEADER',
    role: 'LEADER',
    rank: 'R5',
    titleAr: 'قائد السرب',
    power: 28500,
    weeklyContrib: 14200,
    donatedEnergy: 46500,
    donatedTech: 12400,
    rallyScore: 8900,
    dailyActivity: 98,
    lastSeenAr: 'متصل الآن',
    online: true,
  },
  {
    id: 'm_officer1',
    name: 'SAQR_STORM',
    role: 'DEPUTY',
    rank: 'R4',
    titleAr: 'نائب القائد',
    power: 22400,
    weeklyContrib: 11400,
    donatedEnergy: 34200,
    donatedTech: 9100,
    rallyScore: 7100,
    dailyActivity: 91,
    lastSeenAr: 'متصل الآن',
    online: true,
  },
  {
    id: 'm_officer2',
    name: 'FERMER_DRACO',
    role: 'DEPUTY',
    rank: 'R4',
    titleAr: 'نائب القائد',
    power: 19800,
    weeklyContrib: 9600,
    donatedEnergy: 28500,
    donatedTech: 7600,
    rallyScore: 5400,
    dailyActivity: 84,
    lastSeenAr: 'منذ 12 د',
    online: false,
  },
  {
    id: 'm_knight1',
    name: 'LAYLA_FROST',
    role: 'ELITE',
    rank: 'R3',
    titleAr: 'عضو مميز',
    power: 16900,
    weeklyContrib: 7850,
    donatedEnergy: 21400,
    donatedTech: 5800,
    rallyScore: 4200,
    dailyActivity: 79,
    lastSeenAr: 'متصل الآن',
    online: true,
  },
  {
    id: 'm_knight2',
    name: 'OMAR_EMBER',
    role: 'MEMBER',
    rank: 'R2',
    titleAr: 'عضو السرب',
    power: 13200,
    weeklyContrib: 5100,
    donatedEnergy: 14800,
    donatedTech: 3600,
    rallyScore: 2800,
    dailyActivity: 68,
    lastSeenAr: 'منذ 35 د',
    online: false,
  },
];

function makeMemberDragons(
  prefix: string,
  specs: Array<[string, DuckSkinId, Rarity, number, number]>
): AllianceRallyDragon[] {
  return specs.map(([name, skin, rarity, level, power], idx) => ({
    id: `${prefix}_d${idx + 1}`,
    name,
    skin,
    rarity,
    level,
    power,
  }));
}

export const ALLIANCE_RALLY_REINFORCEMENT_POOL: Array<{
  id: string;
  name: string;
  role: AllianceMemberRole;
  power: number;
  dragonsCount: number;
  dragons: AllianceRallyDragon[];
}> = [
  {
    id: 'r_leader',
    name: 'DRAGON_LEADER',
    role: 'LEADER',
    power: 28500,
    dragonsCount: 3,
    dragons: makeMemberDragons('r_leader', [
      ['الإمبراطور الذهبي', 'royal', 'LEGENDARY', 5, 11800],
      ['حارس الرمال', 'pharaoh', 'EPIC', 5, 9200],
      ['ناب اللهب', 'classic', 'RARE', 4, 7500],
    ]),
  },
  {
    id: 'r_saqr',
    name: 'SAQR_STORM',
    role: 'DEPUTY',
    power: 22400,
    dragonsCount: 3,
    dragons: makeMemberDragons('r_saqr', [
      ['تنين الرعد الصوتي', 'dj', 'EPIC', 5, 8900],
      ['عاصفة الجليد', 'cool', 'RARE', 5, 7300],
      ['ظل الليل', 'ninja', 'RARE', 4, 6200],
    ]),
  },
  {
    id: 'r_fahd',
    name: 'FAHD_TITAN',
    role: 'DEPUTY',
    power: 24800,
    dragonsCount: 3,
    dragons: makeMemberDragons('r_fahd', [
      ['سيد السديم', 'lilac', 'LEGENDARY', 5, 10200],
      ['جحيم البركان', 'coffee', 'EPIC', 4, 8100],
      ['حراشف الحجر', 'skeleton', 'RARE', 4, 6500],
    ]),
  },
  {
    id: 'r_fermer',
    name: 'FERMER_DRACO',
    role: 'DEPUTY',
    power: 19800,
    dragonsCount: 3,
    dragons: makeMemberDragons('r_fermer', [
      ['تنين السديم الملكي', 'lilac', 'EPIC', 5, 7900],
      ['مد البحار', 'aqua', 'RARE', 4, 6400],
      ['جمر اليقطين', 'pumpkin', 'RARE', 4, 5500],
    ]),
  },
  {
    id: 'r_zaid',
    name: 'ZAID_SHADOW',
    role: 'ELITE',
    power: 18600,
    dragonsCount: 2,
    dragons: makeMemberDragons('r_zaid', [
      ['الشبح الصامت', 'ninja', 'EPIC', 5, 10100],
      ['برق الفضاء', 'gamer', 'RARE', 4, 8500],
    ]),
  },
  {
    id: 'r_layla',
    name: 'LAYLA_FROST',
    role: 'ELITE',
    power: 16900,
    dragonsCount: 2,
    dragons: makeMemberDragons('r_layla', [
      ['ملكة الجليد', 'cool', 'EPIC', 5, 9400],
      ['لؤلؤ السماء', 'bride', 'RARE', 4, 7500],
    ]),
  },
  {
    id: 'r_tariq',
    name: 'TARIQ_WYRM',
    role: 'ELITE',
    power: 17500,
    dragonsCount: 2,
    dragons: makeMemberDragons('r_tariq', [
      ['صقر الصحراء', 'pharaoh', 'EPIC', 4, 9600],
      ['أثير القلوب', 'cupid', 'RARE', 4, 7900],
    ]),
  },
  {
    id: 'r_noor',
    name: 'NOOR_SOLAR',
    role: 'MEMBER',
    power: 15100,
    dragonsCount: 2,
    dragons: makeMemberDragons('r_noor', [
      ['تنين الشمس الذهبي', 'classic', 'RARE', 4, 8300],
      ['تنين المحيط', 'aqua', 'UNCOMMON', 4, 6800],
    ]),
  },
  {
    id: 'r_reem',
    name: 'REEM_BLAZE',
    role: 'MEMBER',
    power: 14600,
    dragonsCount: 2,
    dragons: makeMemberDragons('r_reem', [
      ['لهيب الفجر', 'pumpkin', 'RARE', 4, 7900],
      ['سحابة الورد', 'cupid', 'UNCOMMON', 4, 6700],
    ]),
  },
  {
    id: 'r_omar',
    name: 'OMAR_EMBER',
    role: 'MEMBER',
    power: 13200,
    dragonsCount: 2,
    dragons: makeMemberDragons('r_omar', [
      ['جمر البراكين', 'coffee', 'RARE', 4, 7200],
      ['عظم الأثر', 'skeleton', 'UNCOMMON', 3, 6000],
    ]),
  },
  {
    id: 'r_hala',
    name: 'HALA_SKY',
    role: 'MEMBER',
    power: 11800,
    dragonsCount: 2,
    dragons: makeMemberDragons('r_hala', [
      ['زهرة الجوهر', 'bride', 'RARE', 4, 6500],
      ['تيار الصقيع', 'aqua', 'UNCOMMON', 3, 5300],
    ]),
  },
  {
    id: 'r_karim',
    name: 'KARIM_APEX',
    role: 'ELITE',
    power: 21200,
    dragonsCount: 3,
    dragons: makeMemberDragons('r_karim', [
      ['كريستال النخبة', 'gamer', 'EPIC', 5, 8600],
      ['عاصفة الرعد', 'dj', 'RARE', 4, 6900],
      ['تنين النار', 'classic', 'RARE', 4, 5700],
    ]),
  },
  {
    id: 'r_sara',
    name: 'SARA_SOLSTICE',
    role: 'DEPUTY',
    power: 23400,
    dragonsCount: 3,
    dragons: makeMemberDragons('r_sara', [
      ['التاج المضيء', 'royal', 'LEGENDARY', 5, 9800],
      ['جناح السديم', 'lilac', 'EPIC', 4, 7600],
      ['صقيع الشمال', 'cool', 'RARE', 4, 6000],
    ]),
  },
  {
    id: 'r_yasser',
    name: 'YASSER_FURY',
    role: 'MEMBER',
    power: 16200,
    dragonsCount: 2,
    dragons: makeMemberDragons('r_yasser', [
      ['غضب الظل', 'ninja', 'EPIC', 4, 9100],
      ['حامي العرين', 'skeleton', 'RARE', 4, 7100],
    ]),
  },
  {
    id: 'r_malik',
    name: 'MALIK_CHRONO',
    role: 'ELITE',
    power: 19200,
    dragonsCount: 2,
    dragons: makeMemberDragons('r_malik', [
      ['حارس الزمن', 'pharaoh', 'EPIC', 5, 10800],
      ['رعد السماء', 'dj', 'RARE', 4, 8400],
    ]),
  },
];

export interface AllianceResearchMeta {
  id: AllianceTechId;
  nameAr: string;
  descAr: string;
  effectPerLevelAr: string;
  maxLevel: number;
  baseTechPoints: number;
  baseVaultCorn: number;
  baseHours: number;
}

export const ALLIANCE_RESEARCH_CATALOG: AllianceResearchMeta[] = [
  {
    id: 'tech_rally_capacity',
    nameAr: 'توسعة الحشود الملكية (سعة التحشيد)',
    descAr: 'يزيد عدد مقاعد الأعضاء وتنانينهم في الحشد الجماعي ويرفع القوة التراكمية.',
    effectPerLevelAr: '+1 مقعد حشد و +8% قوة حشد لكل مستوى',
    maxLevel: 20,
    baseTechPoints: 100000,
    baseVaultCorn: 40000,
    baseHours: 4,
  },
  {
    id: 'tech_pyramid_siege',
    nameAr: 'تكتيكات حصار الأهرام والعمالقة',
    descAr: 'اختصاص جماعي لكسر دفاعات الأهرامات العظمى ووحوش العالم الضخمة.',
    effectPerLevelAr: '+12% ضرر حصار الأهرامات والوحوش و +10% غنائم',
    maxLevel: 20,
    baseTechPoints: 100000,
    baseVaultCorn: 55000,
    baseHours: 6,
  },
  {
    id: 'tech_march_speed',
    nameAr: 'أجنحة النفير وتسريع الانتظار',
    descAr: 'يقلّص ساعات انتظار الأبحاث الضخمة وسرعة مسير الحشود على خريطة المملكة.',
    effectPerLevelAr: '-4% ساعات انتظار الأبحاث والحشود لكل مستوى (حتى 65%)',
    maxLevel: 20,
    baseTechPoints: 100000,
    baseVaultCorn: 35000,
    baseHours: 3.5,
  },
  {
    id: 'tech_treasury_tax',
    nameAr: 'هندسة الخزينة والجزية',
    descAr: 'يضاعف عائد تبرعات الأعضاء للخزينة الجماعية ويرفع إنتاج نقاط البحث.',
    effectPerLevelAr: '+12% كفاءة التبرع للخزينة ونقاط البحث لكل مستوى',
    maxLevel: 20,
    baseTechPoints: 100000,
    baseVaultCorn: 32000,
    baseHours: 3,
  },
  {
    id: 'tech_dragon_phalanx',
    nameAr: 'درع وعزيمة فيلق التنانين',
    descAr: 'يرفع القوة الإجمالية لأساطيل تنانين جميع أعضاء السرب في الحشود والأهرام.',
    effectPerLevelAr: '+6% قوة جماعية شاملة لتنانين الأعضاء لكل مستوى',
    maxLevel: 20,
    baseTechPoints: 100000,
    baseVaultCorn: 60000,
    baseHours: 8,
  },
  {
    id: 'tech_dividend_vault',
    nameAr: 'صندوق توزيع الأرباح والخراج',
    descAr: 'يحوّل حصة متصاعدة من غنائم الحشود وخراج الأهرامات إلى صندوق توزيع المكافآت.',
    effectPerLevelAr: '+15% تدفق لصندوق التوزيع الجماعي و +8% خراج الأهرام',
    maxLevel: 20,
    baseTechPoints: 100000,
    baseVaultCorn: 45000,
    baseHours: 5,
  },
];

export function getAllianceTechRequirements(
  techId: AllianceTechId,
  currentLevel: number,
  marchSpeedLevel = 0
): {
  nextLevel: number;
  requiredTechPoints: number;
  requiredVaultCorn: number;
  requiredVaultGold: number;
  durationHours: number;
  durationMs: number;
} {
  const meta =
    ALLIANCE_RESEARCH_CATALOG.find((t) => t.id === techId) ?? ALLIANCE_RESEARCH_CATALOG[0];
  const nextLevel = Math.min(meta.maxLevel, currentLevel + 1);
  // Starts at 100,000 points for Level 1 and doubles (×2) with every subsequent level
  const pointsMultiplier = Math.pow(2, Math.max(0, currentLevel));
  const vaultMultiplier = Math.pow(1.65, Math.max(0, currentLevel));
  const requiredTechPoints = Math.round(meta.baseTechPoints * pointsMultiplier);
  const requiredVaultCorn = Math.round(meta.baseVaultCorn * vaultMultiplier);
  const requiredVaultGold = currentLevel >= 1 ? Math.round(3 * Math.pow(1.35, currentLevel)) : 0;
  const speedReduction = Math.min(0.65, Math.max(0, marchSpeedLevel * 0.04));
  const rawHours = Math.min(96, meta.baseHours * Math.pow(1.28, currentLevel));
  const durationHours = Number(Math.max(1, rawHours * (1 - speedReduction)).toFixed(1));
  return {
    nextLevel,
    requiredTechPoints,
    requiredVaultCorn,
    requiredVaultGold,
    durationHours,
    durationMs: Math.round(durationHours * 3600 * 1000),
  };
}

export interface AllianceMapTargetMeta {
  id: string;
  type: AllianceMapTargetType;
  nameAr: string;
  level: number;
  descAr: string;
  coords: { x: number; y: number };
  mapPct: { x: number; y: number };
  requiredPower: number;
  minAllies: number;
  staminaCostCorn: number;
  occupyHours: number;
  hourlyCornVault: number;
  hourlyTechPts: number;
  cooldownMinutes: number;
  allianceXpReward: number;
  rewards: {
    vaultCorn: number;
    techPts: number;
    coins: number;
    stars: number;
    gold: number;
    egg?: EggItemType;
    breedingEggs?: number;
    poolCorn: number;
    poolCoins: number;
    poolStars: number;
  };
}

export const ALLIANCE_MAP_TARGETS: AllianceMapTargetMeta[] = [
  {
    id: 'mon_phoenix',
    type: 'MONSTER',
    nameAr: 'عنقاء الجحيم المدرعة',
    level: 18,
    descAr: 'وحش خريطة متوسط يتطلب تحشيد 3+ أساطيل أعضاء لاختراق درعه الناري.',
    coords: { x: 528, y: 542 },
    mapPct: { x: 68, y: 74 },
    requiredPower: 42000,
    minAllies: 3,
    staminaCostCorn: 180,
    occupyHours: 0,
    hourlyCornVault: 0,
    hourlyTechPts: 0,
    cooldownMinutes: 45,
    allianceXpReward: 18000,
    rewards: {
      vaultCorn: 6500,
      techPts: 1800,
      coins: 360,
      stars: 4,
      gold: 1,
      egg: 'egg_3',
      poolCorn: 1800,
      poolCoins: 420,
      poolStars: 6,
    },
  },
  {
    id: 'pyr_golden',
    type: 'PYRAMID',
    nameAr: 'هرم الرمال الذهبي',
    level: 5,
    descAr: 'معلم أثري؛ احتلاله لمدة 6 ساعات يدرّ طاقة ونقاط أبحاث ضخمة كل ساعة.',
    coords: { x: 488, y: 534 },
    mapPct: { x: 26, y: 67 },
    requiredPower: 78000,
    minAllies: 5,
    staminaCostCorn: 280,
    occupyHours: 6,
    hourlyCornVault: 3600,
    hourlyTechPts: 920,
    cooldownMinutes: 90,
    allianceXpReward: 32000,
    rewards: {
      vaultCorn: 12000,
      techPts: 3200,
      coins: 620,
      stars: 6,
      gold: 2,
      poolCorn: 3200,
      poolCoins: 680,
      poolStars: 10,
    },
  },
  {
    id: 'evt_caravan',
    type: 'EVENT',
    nameAr: 'قافلة الكنز السلطانية',
    level: 24,
    descAr: 'حدث خريطة موقوت محروس بفرسان الظل، محمّل ببيض التزاوج والنجوم وسبائك الذهب.',
    coords: { x: 538, y: 518 },
    mapPct: { x: 76, y: 50 },
    requiredPower: 115000,
    minAllies: 6,
    staminaCostCorn: 350,
    occupyHours: 0,
    hourlyCornVault: 0,
    hourlyTechPts: 0,
    cooldownMinutes: 75,
    allianceXpReward: 44000,
    rewards: {
      vaultCorn: 16500,
      techPts: 4400,
      coins: 780,
      stars: 8,
      gold: 2,
      breedingEggs: 3,
      poolCorn: 4500,
      poolCoins: 950,
      poolStars: 14,
    },
  },
  {
    id: 'mon_abyss',
    type: 'MONSTER',
    nameAr: 'تنين الهاوية المصفّح',
    level: 32,
    descAr: 'زعيم عالمي ضخم لا يُسقَط إلا بتحالف 8+ حشود مترابطة وأبحاث حصار متقدمة.',
    coords: { x: 468, y: 476 },
    mapPct: { x: 20, y: 24 },
    requiredPower: 175000,
    minAllies: 8,
    staminaCostCorn: 460,
    occupyHours: 0,
    hourlyCornVault: 0,
    hourlyTechPts: 0,
    cooldownMinutes: 120,
    allianceXpReward: 62000,
    rewards: {
      vaultCorn: 26000,
      techPts: 6800,
      coins: 1100,
      stars: 12,
      gold: 4,
      egg: 'egg_5',
      poolCorn: 7000,
      poolCoins: 1400,
      poolStars: 20,
    },
  },
  {
    id: 'evt_rift',
    type: 'EVENT',
    nameAr: 'بوابة الغزو الإمبراطورية',
    level: 40,
    descAr: 'حدث غزو عالمي ضخم يتطلب تعبئة السرب الكامل مع جوائز استثنائية لصندوق التوزيع.',
    coords: { x: 492, y: 468 },
    mapPct: { x: 48, y: 18 },
    requiredPower: 240000,
    minAllies: 10,
    staminaCostCorn: 600,
    occupyHours: 0,
    hourlyCornVault: 0,
    hourlyTechPts: 0,
    cooldownMinutes: 180,
    allianceXpReward: 85000,
    rewards: {
      vaultCorn: 38000,
      techPts: 9800,
      coins: 1550,
      stars: 16,
      gold: 5,
      breedingEggs: 5,
      poolCorn: 10500,
      poolCoins: 2100,
      poolStars: 28,
    },
  },
  {
    id: 'pyr_osiris',
    type: 'PYRAMID',
    nameAr: 'هرم أوزيريس الملكي الأعظم',
    level: 10,
    descAr: 'أعظم أهرام المملكة! يتطلب 310,000+ قوة جماعية ويمنح سيطرة 12 ساعة وعوائد إمبراطورية.',
    coords: { x: 548, y: 488 },
    mapPct: { x: 78, y: 25 },
    requiredPower: 310000,
    minAllies: 12,
    staminaCostCorn: 750,
    occupyHours: 12,
    hourlyCornVault: 8500,
    hourlyTechPts: 2100,
    cooldownMinutes: 240,
    allianceXpReward: 120000,
    rewards: {
      vaultCorn: 55000,
      techPts: 14500,
      coins: 2200,
      stars: 22,
      gold: 8,
      poolCorn: 16000,
      poolCoins: 3200,
      poolStars: 40,
    },
  },
];

export const ALLIANCE_RALLY_PREP_OPTIONS = [
  { minutes: 15, labelAr: '15 دقيقة (هجوم خاطف)', lootMult: 1.0 },
  { minutes: 60, labelAr: 'ساعة واحدة (حشد قياسي)', lootMult: 1.35 },
  { minutes: 240, labelAr: '4 ساعات (تعبئة كبرى)', lootMult: 1.8 },
  { minutes: 720, labelAr: '12 ساعة (حصار إمبراطوري)', lootMult: 2.5 },
] as const;

export function createInitialAllianceLedger(): AllianceLedger {
  return {
    techPointsPool: 45000,
    vaultGold: 28,
    playerEnergyDonated: 0,
    playerGoldDonated: 0,
    playerTechDonated: 0,
    playerRallyContrib: 0,
    allianceTotalEnergyDonated: 145400,
    allianceTotalGoldDonated: 64,
    ralliesWon: 6,
    pyramidsCaptured: 2,
    totalDividendsClaimed: 0,
  };
}

export function createInitialRewardPool(): AllianceRewardPool {
  return {
    corn: 12500,
    allianceCoins: 2400,
    stars: 35,
    duckGold: 8,
    cycleNumber: 1,
  };
}

export function createInitialAllianceNotifications(): AllianceNotification[] {
  const now = Date.now();
  return [
    {
      id: `notif_init_${now}`,
      category: 'DIVIDEND_READY',
      titleAr: 'صندوق توزيع غنائم السرب جاهز!',
      bodyAr: 'تراكم في صندوق الأرباح 12,500⚡ و 2,400🪙 و 35★ و 8💎 جاهزة للتوزيع حسب جدارة الأعضاء.',
      createdAt: now - 5 * 60 * 1000,
      read: false,
      targetSubTab: 'ROSTER',
      inviteText: '🏛️ يا إخوة السرب: صندوق توزيع المكافآت الجماعية جاهز! ارفعوا مساهماتكم في الخزينة والأبحاث لزيادة نسبتكم.',
    },
  ];
}

export function appendAllianceNotification(
  existing: AllianceNotification[] | undefined,
  notif: Omit<AllianceNotification, 'id' | 'createdAt' | 'read'>
): AllianceNotification[] {
  const now = Date.now();
  const nextItem: AllianceNotification = {
    id: `anotif_${now}_${Math.random().toString(36).slice(2, 6)}`,
    category: notif.category,
    titleAr: notif.titleAr,
    bodyAr: notif.bodyAr,
    createdAt: now,
    read: false,
    targetSubTab: notif.targetSubTab,
    inviteText: notif.inviteText,
  };
  return [nextItem, ...(existing ?? [])].slice(0, 20);
}

export function createInitialTechLevels(): Record<AllianceTechId, number> {
  return {
    tech_rally_capacity: 0,
    tech_pyramid_siege: 0,
    tech_march_speed: 0,
    tech_treasury_tax: 0,
    tech_dragon_phalanx: 0,
    tech_dividend_vault: 0,
  };
}

export function createInitialTechFunding(): Record<AllianceTechId, number> {
  return {
    tech_rally_capacity: 52000,
    tech_pyramid_siege: 38000,
    tech_march_speed: 25000,
    tech_treasury_tax: 44000,
    tech_dragon_phalanx: 31000,
    tech_dividend_vault: 28000,
  };
}

export function formatDurationAr(ms: number): string {
  const safeSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = safeSec % 60;
  if (h > 0) {
    return `${h}س ${String(m).padStart(2, '0')}د ${String(s).padStart(2, '0')}ث`;
  }
  return `${String(m).padStart(2, '0')}د ${String(s).padStart(2, '0')}ث`;
}

export function createInitialMemberRoles(): Record<string, AllianceMemberRole> {
  return {
    m_leader: 'LEADER',
    m_officer1: 'DEPUTY',
    m_officer2: 'DEPUTY',
    m_knight1: 'ELITE',
    m_knight2: 'MEMBER',
  };
}

export function createInitialCoopProgress(): Record<string, number> {
  return ALLIANCE_COOP_MISSIONS_CATALOG.reduce<Record<string, number>>((acc, item) => {
    acc[item.id] = item.initialSeed;
    return acc;
  }, {});
}

export function createInitialAllianceLogs(): AllianceLogEntry[] {
  const now = Date.now();
  return [
    {
      id: 'log_seed_1',
      type: 'RALLY',
      actor: 'DRAGON_LEADER',
      message: 'قاد حشد 8 أساطيل وافتتح السيطرة على هرم الرمال الذهبي (+12,000⚡ للخزينة)!',
      time: '14:35',
      timestamp: now - 4 * 60 * 1000,
    },
    {
      id: 'log_seed_2',
      type: 'DONATE',
      actor: 'SAQR_STORM',
      message: 'تبرع بقافلة 2,500⚡ (+1,400 نقطة بحث للتحالف · حظ ×2!).',
      time: '14:28',
      timestamp: now - 11 * 60 * 1000,
    },
    {
      id: 'log_seed_3',
      type: 'RESEARCH',
      actor: 'FERMER_DRACO',
      message: 'ضخ +3,500 نقطة بحث في تطوير توسعة الحشود الملكية.',
      time: '14:19',
      timestamp: now - 20 * 60 * 1000,
    },
    {
      id: 'log_seed_4',
      type: 'HELP',
      actor: 'LAYLA_FROST',
      message: 'سرّعت بوابة التزاوج وأبحاث السرب لـ 6 أعضاء.',
      time: '14:10',
      timestamp: now - 29 * 60 * 1000,
    },
    {
      id: 'log_seed_5',
      type: 'JOIN',
      actor: 'OMAR_EMBER',
      message: 'انضم رسمياً إلى صفوف عش التنانين (Draco).',
      time: '13:52',
      timestamp: now - 47 * 60 * 1000,
    },
  ];
}

export function appendAllianceLog(
  existing: AllianceLogEntry[] | undefined,
  entry: Omit<AllianceLogEntry, 'id' | 'time' | 'timestamp'>
): AllianceLogEntry[] {
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const nextItem: AllianceLogEntry = {
    id: `alog_${now}_${Math.random().toString(36).slice(2, 6)}`,
    type: entry.type,
    actor: entry.actor,
    message: entry.message,
    time: timeStr,
    timestamp: now,
  };
  return [nextItem, ...(existing ?? [])].slice(0, 40);
}

export function getAllianceRankMeta(contribution: number, totalPower: number): {
  rank: 'R5' | 'R4' | 'R3' | 'R2' | 'R1';
  roleKey: AllianceMemberRole;
  titleAr: string;
  colorClass: string;
  score: number;
  nextTitleAr: string | null;
  nextScoreRequired: number | null;
} {
  const score = contribution + Math.floor(totalPower * 0.4);
  if (score >= 8500) {
    return {
      rank: 'R5',
      roleKey: 'LEADER',
      titleAr: 'قائد السرب',
      colorClass: 'bg-amber-500/20 text-amber-300 border-amber-400/60',
      score,
      nextTitleAr: null,
      nextScoreRequired: null,
    };
  }
  if (score >= 3800) {
    return {
      rank: 'R4',
      roleKey: 'DEPUTY',
      titleAr: 'نائب القائد',
      colorClass: 'bg-rose-500/20 text-rose-300 border-rose-400/60',
      score,
      nextTitleAr: 'قائد السرب (R5)',
      nextScoreRequired: 8500,
    };
  }
  if (score >= 1600) {
    return {
      rank: 'R3',
      roleKey: 'ELITE',
      titleAr: 'عضو مميز',
      colorClass: 'bg-purple-500/20 text-purple-300 border-purple-400/60',
      score,
      nextTitleAr: 'نائب القائد (R4)',
      nextScoreRequired: 3800,
    };
  }
  if (score >= 450) {
    return {
      rank: 'R2',
      roleKey: 'MEMBER',
      titleAr: 'محارب السرب',
      colorClass: 'bg-sky-500/20 text-sky-300 border-sky-400/60',
      score,
      nextTitleAr: 'عضو مميز (R3)',
      nextScoreRequired: 1600,
    };
  }
  return {
    rank: 'R1',
    roleKey: 'MEMBER',
    titleAr: 'عضو جديد',
    colorClass: 'bg-slate-700/50 text-slate-300 border-slate-600',
    score,
    nextTitleAr: 'محارب السرب (R2)',
    nextScoreRequired: 450,
  };
}

export function getXpRequiredForAllianceLevel(lv: number): number {
  return Math.round(100000 * Math.pow(2, Math.max(0, lv - 1)));
}

const ALLIANCE_MILESTONE_UNLOCKS: Record<number, string> = {
  1: 'تأسيس العش · فتح الخزينة والشات ومساعدات الإخوة',
  2: 'فتح متجر السرب + صناديق النشاط اليومية + تنبيهات الحشود',
  3: '+1 مقعد إضافي في الحشود الجماعية + مضاعفة قوافل التبرع',
  4: 'فتح غزوات أهرام الرمال الذهبية واستثمار الخراج الساعي',
  5: 'تخفيض -5% إضافي من أوقات انتظار الأبحاث ورفع ضرر الزعيم',
  6: '+2 مقاعد حشد إجمالية + تعزيز نقاط الأبحاث الجماعية +15%',
  7: 'صندوق الغنائم الإمبراطوري + خراج إضافي من الأهرام +12%',
  8: 'راية الفيلق الذهبي (+10% قوة أساطيل التنانين في التحشيد)',
  10: 'قاعة الأرباح الكبرى (+12% تدفق إلى صندوق توزيع المكافآت) + +3 مقاعد حشد',
  12: 'فتح غزو هرم أوزيريس الملكي وبوابة الغزو الإمبراطورية',
  15: 'تاج السلاطين (+20% سرعة مسير وتخفيض تكاليف البحث الذهبية)',
  20: 'فيلق التنانين الخالد (+45% قوة تحالف و 60 مقعد عضو)',
  25: 'عرش الخزينة الكبرى (سعة تتجاوز 2.4M⚡ وعلاوة غنائم +72%)',
  30: 'الذروة الإمبراطورية للتحالف (80 عضواً · +87% غنائم · +63% قوة)',
};

export function getAllianceLevelMilestoneUnlock(lv: number): string {
  if (ALLIANCE_MILESTONE_UNLOCKS[lv]) return ALLIANCE_MILESTONE_UNLOCKS[lv];
  if (lv % 2 === 1) {
    return `توسيع صفوف العش إلى ${20 + lv * 2} عضواً + زيادة علاوة الغنائم إلى +${(lv - 1) * 3}%`;
  }
  return `مكافأة قيادية: +1 مقعد حشد جماعي كل 3 مستويات + +95,000⚡ سعة خزينة`;
}

export interface AllianceLevelPerkEntry {
  level: number;
  xpRequired: number;
  maxMembers: number;
  vaultCapacity: number;
  levelLootBonusPct: number;
  powerBonusPct: number;
  rallySlotBonus: number;
  unlockedFeatureAr: string;
}

export function getAllianceLevelPerks(lv: number): AllianceLevelPerkEntry {
  const safeLv = Math.max(1, Math.min(ALLIANCE_DAILY_LIMITS.MAX_ALLIANCE_LEVEL, Math.floor(lv)));
  return {
    level: safeLv,
    xpRequired: getXpRequiredForAllianceLevel(safeLv),
    maxMembers: 20 + safeLv * 2,
    vaultCapacity: 150000 + (safeLv - 1) * 95000,
    levelLootBonusPct: (safeLv - 1) * 3,
    powerBonusPct: 5 + (safeLv - 1) * 2,
    rallySlotBonus: Math.floor((safeLv - 1) / 3),
    unlockedFeatureAr: getAllianceLevelMilestoneUnlock(safeLv),
  };
}

export function getAllianceLevelInfo(xp = 0): {
  level: number;
  totalXp: number;
  currentXp: number;
  nextXp: number;
  pct: number;
  maxMembers: number;
  vaultCapacity: number;
  levelLootBonusPct: number;
  powerBonusPct: number;
  rallySlotBonus: number;
  unlockedFeatureAr: string;
} {
  let rem = Math.max(0, Math.floor(xp));
  let level = 1;
  while (level < ALLIANCE_DAILY_LIMITS.MAX_ALLIANCE_LEVEL) {
    const req = getXpRequiredForAllianceLevel(level);
    if (rem < req) {
      const perks = getAllianceLevelPerks(level);
      return {
        level,
        totalXp: Math.max(0, Math.floor(xp)),
        currentXp: rem,
        nextXp: req,
        pct: Math.min(100, Math.round((rem / Math.max(1, req)) * 100)),
        maxMembers: perks.maxMembers,
        vaultCapacity: perks.vaultCapacity,
        levelLootBonusPct: perks.levelLootBonusPct,
        powerBonusPct: perks.powerBonusPct,
        rallySlotBonus: perks.rallySlotBonus,
        unlockedFeatureAr: perks.unlockedFeatureAr,
      };
    }
    rem -= req;
    level++;
  }
  const capPerks = getAllianceLevelPerks(ALLIANCE_DAILY_LIMITS.MAX_ALLIANCE_LEVEL);
  return {
    level: ALLIANCE_DAILY_LIMITS.MAX_ALLIANCE_LEVEL,
    totalXp: Math.max(0, Math.floor(xp)),
    currentXp: capPerks.xpRequired,
    nextXp: capPerks.xpRequired,
    pct: 100,
    maxMembers: capPerks.maxMembers,
    vaultCapacity: capPerks.vaultCapacity,
    levelLootBonusPct: capPerks.levelLootBonusPct,
    powerBonusPct: capPerks.powerBonusPct,
    rallySlotBonus: capPerks.rallySlotBonus,
    unlockedFeatureAr: capPerks.unlockedFeatureAr,
  };
}

export interface AllianceDividendMemberShare {
  id: string;
  name: string;
  role: AllianceMemberRole;
  rank: string;
  meritScore: number;
  sharePct: number;
  cornShare: number;
  coinsShare: number;
  starsShare: number;
  goldShare: number;
  isSelf: boolean;
}

export function calculateAllianceDividendBreakdown(
  state: GameState,
  playerTotalPower: number
): {
  pool: AllianceRewardPool;
  totalMerit: number;
  playerShare: AllianceDividendMemberShare;
  members: AllianceDividendMemberShare[];
} {
  const pack = state.pack;
  const pool = pack.rewardPool ?? createInitialRewardPool();
  const ledger = { ...createInitialAllianceLedger(), ...(pack.ledger ?? {}) };
  const memberRoles = { ...createInitialMemberRoles(), ...(pack.memberRoles ?? {}) };
  const rankMeta = getAllianceRankMeta(pack.contributionTotal ?? 0, playerTotalPower);

  const kickedSet = new Set(pack.kickedMemberIds ?? []);
  const activeNpcMembers = ALLIANCE_ROSTER_MEMBERS.filter((m) => !kickedSet.has(m.id));

  const rawEntries = [
    ...(pack.joined
      ? [
          {
            id: 'player_self',
            name: state.username,
            role: rankMeta.roleKey,
            rank: rankMeta.rank,
            donatedEnergy: ledger.playerEnergyDonated + ledger.playerGoldDonated * 3000,
            donatedTech: ledger.playerTechDonated,
            rallyScore: ledger.playerRallyContrib + (pack.bossAttacksToday ?? 0) * 450,
            dailyActivity: pack.activityPoints ?? 0,
            isSelf: true,
          },
        ]
      : []),
    ...activeNpcMembers.map((m) => {
      const assignedRole = memberRoles[m.id] ?? m.role;
      return {
        id: m.id,
        name: m.name,
        role: assignedRole,
        rank: ALLIANCE_ROLE_META[assignedRole].rankCode,
        donatedEnergy: m.donatedEnergy,
        donatedTech: m.donatedTech,
        rallyScore: m.rallyScore,
        dailyActivity: m.dailyActivity,
        isSelf: false,
      };
    }),
  ].map((entry) => {
    const roleMult = ALLIANCE_ROLE_META[entry.role].dividendMult;
    const meritScore = Math.max(
      120,
      Math.round(
        (entry.donatedEnergy * 0.04 +
          entry.donatedTech * 0.25 +
          entry.rallyScore * 0.8 +
          entry.dailyActivity * 25) *
          roleMult
      )
    );
    return { ...entry, meritScore };
  });

  const totalMerit = Math.max(
    1,
    rawEntries.reduce((sum, item) => sum + item.meritScore, 0)
  );

  const members: AllianceDividendMemberShare[] = rawEntries
    .map((entry) => {
      const ratio = entry.meritScore / totalMerit;
      const sharePct = Number((ratio * 100).toFixed(1));
      const cycleCornCeiling = getEnergySoftCap(Math.max(1, Math.min(10, Math.round(pack.level ?? 1))));
      const cappedPoolCorn = Math.min(pool.corn, Math.round(cycleCornCeiling * 1.6));
      return {
        id: entry.id,
        name: entry.name,
        role: entry.role,
        rank: entry.rank,
        meritScore: entry.meritScore,
        sharePct,
        cornShare: Math.max(40, Math.min(Math.round(cycleCornCeiling * 0.45), Math.round(cappedPoolCorn * ratio))),
        coinsShare: Math.max(15, Math.min(1200, Math.round(pool.allianceCoins * ratio))),
        starsShare: Math.max(0, Math.min(8, Math.round(pool.stars * ratio))),
        goldShare: Math.max(0, Math.min(4, Math.round(pool.duckGold * ratio))),
        isSelf: entry.isSelf,
      };
    })
    .sort((a, b) => b.meritScore - a.meritScore);

  const playerShare = members.find((m) => m.isSelf) ?? members[0];
  return { pool, totalMerit, playerShare, members };
}

// === JOIN CONDITIONS, BLESSING-TO-RESEARCH MISSIONS & SWARM DRAGON ENGINE ===

export function createInitialJoinConditions(): AllianceJoinConditions {
  return {
    minPower: 100,
    minDragons: 1,
    minDragonLevel: 1,
    autoAccept: true,
  };
}

export interface BlessingResearchMissionMeta {
  godId: string;
  godKey: 'harvest' | 'hype' | 'fortune' | 'plunder';
  missionTitleAr: string;
  missionDescAr: string;
  techPointsGain: number;
  allianceXpGain: number;
  coinsGain: number;
  activityGain: number;
}

export const ALLIANCE_BLESSING_RESEARCH_MISSIONS: Record<string, BlessingResearchMissionMeta> = {
  god_harvest: {
    godId: 'god_harvest',
    godKey: 'harvest',
    missionTitleAr: 'مهمة بحث: كفاءة حصاد السرب',
    missionDescAr: 'تحويل بركة الحصاد إلى خوارزمية خفض استهلاك موارد أبحاث السرب.',
    techPointsGain: 45000,
    allianceXpGain: 18000,
    coinsGain: 380,
    activityGain: 20,
  },
  god_hype: {
    godId: 'god_hype',
    godKey: 'hype',
    missionTitleAr: 'مهمة بحث: تسريع حضّانات السرب',
    missionDescAr: 'تحويل طاقة الحماس الملكية إلى تسريع خط أبحاث السرب والتزاوج.',
    techPointsGain: 55000,
    allianceXpGain: 24000,
    coinsGain: 480,
    activityGain: 20,
  },
  god_fortune: {
    godId: 'god_fortune',
    godKey: 'fortune',
    missionTitleAr: 'مهمة بحث: خزينة الثروة والمحظوظين',
    missionDescAr: 'استثمار بركة الثروة لضخ نقاط بحث ضخمة وتعزيز عائد الصناديق.',
    techPointsGain: 75000,
    allianceXpGain: 32000,
    coinsGain: 620,
    activityGain: 25,
  },
  god_plunder: {
    godId: 'god_plunder',
    godKey: 'plunder',
    missionTitleAr: 'مهمة بحث: تكتيك الغنائم والحصار الأعظم',
    missionDescAr: 'تحويل بركة الغنائم الأسطورية إلى أقوى مهمة بحثية في مختبر السرب.',
    techPointsGain: 95000,
    allianceXpGain: 45000,
    coinsGain: 850,
    activityGain: 30,
  },
};

export interface SwarmDragonUpgradeMeta {
  key: SwarmDragonUpgradeKey;
  nameAr: string;
  descAr: string;
  effectPerLvAr: string;
  maxLevel: number;
  baseEnergyCost: number;
  baseCoinsCost: number;
}

export const SWARM_DRAGON_UPGRADE_CATALOG: SwarmDragonUpgradeMeta[] = [
  {
    key: 'breath',
    nameAr: 'نَفَس اللهب الجماعي',
    descAr: 'يزيد الهجوم الصافي لتنين السرب في غارات الزعيم والحشود.',
    effectPerLvAr: '+65 هجوم و +350 قوة / مستوى',
    maxLevel: 30,
    baseEnergyCost: 450,
    baseCoinsCost: 95,
  },
  {
    key: 'armor',
    nameAr: 'حراشف العش المدرعة',
    descAr: 'يرفع نقاط الصحة والدفاع لتنين السرب ضد ضربات العمالقة.',
    effectPerLvAr: '+420 صحة و +48 دفاع / مستوى',
    maxLevel: 30,
    baseEnergyCost: 420,
    baseCoinsCost: 90,
  },
  {
    key: 'swiftness',
    nameAr: 'أجنحة الغارة الخاطفة',
    descAr: 'يعزز سرعة تنين السرب ويمنح دفعة لقوة الأساطيل.',
    effectPerLvAr: '+24 سرعة و +240 قوة / مستوى',
    maxLevel: 30,
    baseEnergyCost: 380,
    baseCoinsCost: 85,
  },
  {
    key: 'fury',
    nameAr: 'زئير السرب الموحّد',
    descAr: 'يضاعف التناغم بين التنانين المتبرّع بها ويرفع الضرر الحرج.',
    effectPerLvAr: '+4% مضاعف قوة شامل / مستوى',
    maxLevel: 25,
    baseEnergyCost: 520,
    baseCoinsCost: 115,
  },
];

export interface SwarmDragonGearMeta {
  slot: SwarmDragonGearSlot;
  nameAr: string;
  descAr: string;
  bonusPerLvAr: string;
  maxLevel: number;
  baseCoinsCost: number;
  baseGoldCost: number;
}

export const SWARM_DRAGON_GEAR_CATALOG: SwarmDragonGearMeta[] = [
  {
    slot: 'claws',
    nameAr: 'مخالب السديم الحادة',
    descAr: 'عتاد هجومي يضاعف اختراق الدروع.',
    bonusPerLvAr: '+95 هجوم و +380 قوة',
    maxLevel: 20,
    baseCoinsCost: 140,
    baseGoldCost: 1,
  },
  {
    slot: 'scales',
    nameAr: 'درع الحراشف الملكي',
    descAr: 'عتاد دفاعي يرفع الصمود والصلابة.',
    bonusPerLvAr: '+620 صحة و +70 دفاع',
    maxLevel: 20,
    baseCoinsCost: 140,
    baseGoldCost: 1,
  },
  {
    slot: 'wings',
    nameAr: 'أجنحة النيزك العاصف',
    descAr: 'عتاد السرعة والتحليق نحو الحشود.',
    bonusPerLvAr: '+35 سرعة و +320 قوة',
    maxLevel: 20,
    baseCoinsCost: 130,
    baseGoldCost: 1,
  },
  {
    slot: 'crown',
    nameAr: 'تاج سيادة السرب',
    descAr: 'تاج أسطوري يرفع جميع خصائص تنين السرب بنسبة إضافية.',
    bonusPerLvAr: '+5% تعزيز جميع الخصائص',
    maxLevel: 20,
    baseCoinsCost: 220,
    baseGoldCost: 2,
  },
];

export function extractDragonTransferStats(dragon: Duck): {
  sizeTier: DragonSize;
  gear: DuckGearId;
  aura: DuckAuraId;
  skillLevel: number;
  trainingLevel: number;
  powerAdded: number;
  hpAdded: number;
  attackAdded: number;
  defenseAdded: number;
  speedAdded: number;
} {
  const sizeTier = resolveDragonSize(dragon);
  const gear: DuckGearId = dragon.gear ?? 'none';
  const aura: DuckAuraId = dragon.aura ?? 'auto';
  const skillLevel = dragon.skillLevel ?? 1;
  const trainingLevel = dragon.trainingLevel ?? 0;
  const customLv = clampCustomLevel(dragon.customLevel ?? 0);
  const sizeMult = sizeTier === 'XXL' ? 1.55 : sizeTier === 'XL' ? 1.28 : 1.0;
  const gearBonus = gear === 'crown' ? 160 : gear === 'helmet' ? 110 : gear === 'wings' ? 95 : gear === 'shades' ? 85 : 0;
  const auraBonus = aura !== 'auto' ? 75 : 0;
  const rarityMult =
    dragon.rarity === 'LEGENDARY'
      ? 1.5
      : dragon.rarity === 'EPIC'
        ? 1.3
        : dragon.rarity === 'RARE'
          ? 1.15
          : dragon.rarity === 'UNCOMMON'
            ? 1.06
            : 1.0;

  const powerAdded = Math.round(
    ((dragon.powerRating ?? 110) * 4.5 +
      dragon.level * 190 +
      customLv * 95 +
      skillLevel * 70 +
      trainingLevel * 60 +
      gearBonus +
      auraBonus) *
      sizeMult *
      rarityMult
  );
  const hpAdded = Math.round(
    (420 + dragon.level * 130 + trainingLevel * 55 + (gear === 'helmet' ? 180 : 60) + customLv * 45) *
      sizeMult *
      rarityMult
  );
  const attackAdded = Math.round(
    (48 + dragon.level * 22 + skillLevel * 18 + trainingLevel * 12 + (gear === 'crown' ? 40 : 12) + customLv * 10) *
      sizeMult *
      rarityMult
  );
  const defenseAdded = Math.round(
    (36 + dragon.level * 16 + trainingLevel * 9 + (gear === 'helmet' ? 45 : 15) + customLv * 8) *
      sizeMult *
      rarityMult
  );
  const speedAdded = Math.round(
    (22 + dragon.level * 8 + skillLevel * 6 + (gear === 'wings' ? 36 : 8) + customLv * 4) *
      rarityMult
  );

  return {
    sizeTier,
    gear,
    aura,
    skillLevel,
    trainingLevel,
    powerAdded,
    hpAdded,
    attackAdded,
    defenseAdded,
    speedAdded,
  };
}

export function createInitialSwarmDragonState(): SwarmDragonState {
  const now = Date.now();
  const seedDonations: SwarmDragonDonationEntry[] = [
    {
      id: 'sd_seed_1',
      donorName: 'DRAGON_LEADER',
      dragonName: 'تنين الحرس الملكي',
      skin: 'royal',
      rarity: 'EPIC',
      level: 4,
      customLevel: 3,
      sizeTier: 'XL',
      gear: 'crown',
      aura: 'gold',
      skillLevel: 3,
      trainingLevel: 4,
      powerAdded: 3650,
      hpAdded: 1920,
      attackAdded: 295,
      defenseAdded: 210,
      speedAdded: 112,
      donatedAt: now - 3 * 3600 * 1000,
    },
    {
      id: 'sd_seed_2',
      donorName: 'SAQR_STORM',
      dragonName: 'تنين الرعد المجنّح',
      skin: 'dj',
      rarity: 'RARE',
      level: 3,
      customLevel: 2,
      sizeTier: 'NORMAL',
      gear: 'wings',
      aura: 'flame',
      skillLevel: 2,
      trainingLevel: 3,
      powerAdded: 2240,
      hpAdded: 1210,
      attackAdded: 195,
      defenseAdded: 138,
      speedAdded: 118,
      donatedAt: now - 90 * 60 * 1000,
    },
  ];

  const inheritedPower = seedDonations.reduce((a, b) => a + b.powerAdded, 0);
  const inheritedHp = seedDonations.reduce((a, b) => a + b.hpAdded, 0);
  const inheritedAttack = seedDonations.reduce((a, b) => a + b.attackAdded, 0);
  const inheritedDefense = seedDonations.reduce((a, b) => a + b.defenseAdded, 0);
  const inheritedSpeed = seedDonations.reduce((a, b) => a + b.speedAdded, 0);

  return {
    unlocked: false,
    requiredDragons: 4,
    donatedCount: seedDonations.length,
    name: 'ليفاياثان السرب الأعظم',
    skin: 'royal',
    level: 1,
    xp: 0,
    inheritedPower,
    inheritedHp,
    inheritedAttack,
    inheritedDefense,
    inheritedSpeed,
    inheritedGearIds: ['crown', 'wings'],
    inheritedAuraIds: ['gold', 'flame'],
    inheritedSkins: ['royal', 'dj'],
    upgrades: {
      breath: 0,
      armor: 0,
      swiftness: 0,
      fury: 0,
    },
    gearLevels: {
      claws: 0,
      scales: 0,
      wings: 0,
      crown: 0,
    },
    donations: seedDonations,
  };
}

export function getSwarmDragonLevelUpCost(currentLevel: number): {
  energyCost: number;
  coinsCost: number;
  xpNeeded: number;
} {
  const lv = Math.max(1, currentLevel);
  return {
    energyCost: Math.round(380 * Math.pow(1.18, lv - 1)),
    coinsCost: Math.round(80 * Math.pow(1.14, lv - 1)),
    xpNeeded: Math.round(100 * Math.pow(1.2, lv - 1)),
  };
}

export function getSwarmDragonUpgradeCost(
  key: SwarmDragonUpgradeKey,
  currentLevel: number
): { energyCost: number; coinsCost: number } {
  const meta =
    SWARM_DRAGON_UPGRADE_CATALOG.find((u) => u.key === key) ?? SWARM_DRAGON_UPGRADE_CATALOG[0];
  const lv = Math.max(0, currentLevel);
  return {
    energyCost: Math.round(meta.baseEnergyCost * Math.pow(1.24, lv)),
    coinsCost: Math.round(meta.baseCoinsCost * Math.pow(1.2, lv)),
  };
}

export function getSwarmDragonGearUpgradeCost(
  slot: SwarmDragonGearSlot,
  currentLevel: number
): { coinsCost: number; goldCost: number } {
  const meta =
    SWARM_DRAGON_GEAR_CATALOG.find((g) => g.slot === slot) ?? SWARM_DRAGON_GEAR_CATALOG[0];
  const lv = Math.max(0, currentLevel);
  return {
    coinsCost: Math.round(meta.baseCoinsCost * Math.pow(1.28, lv)),
    goldCost: Math.max(1, Math.round(meta.baseGoldCost + Math.floor(lv / 2))),
  };
}

export function computeSwarmDragonTotalStats(sd: SwarmDragonState): {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  totalPower: number;
  crownMultPct: number;
} {
  const lvBonus = Math.max(0, sd.level - 1);
  const upg = sd.upgrades ?? { breath: 0, armor: 0, swiftness: 0, fury: 0 };
  const gr = sd.gearLevels ?? { claws: 0, scales: 0, wings: 0, crown: 0 };
  const crownMultPct = gr.crown * 5 + upg.fury * 4;
  const mult = 1 + crownMultPct / 100;

  const rawHp = sd.inheritedHp + lvBonus * 350 + upg.armor * 420 + gr.scales * 620;
  const rawAttack = sd.inheritedAttack + lvBonus * 45 + upg.breath * 65 + gr.claws * 95;
  const rawDefense = sd.inheritedDefense + lvBonus * 32 + upg.armor * 48 + gr.scales * 70;
  const rawSpeed = sd.inheritedSpeed + lvBonus * 14 + upg.swiftness * 24 + gr.wings * 35;

  const hp = Math.round(rawHp * mult);
  const attack = Math.round(rawAttack * mult);
  const defense = Math.round(rawDefense * mult);
  const speed = Math.round(rawSpeed * mult);

  const rawPower =
    sd.inheritedPower +
    lvBonus * 620 +
    upg.breath * 350 +
    upg.armor * 280 +
    upg.swiftness * 240 +
    gr.claws * 380 +
    gr.scales * 340 +
    gr.wings * 320;

  const totalPower = Math.round(rawPower * mult);
  return { hp, attack, defense, speed, totalPower, crownMultPct };
}

export function createDailyAllianceGifts(dateSeed = ''): AllianceGiftItem[] {
  const suffix = dateSeed || getLocalDateKey();
  return [
    {
      id: `ag_1_${suffix}`,
      sender: 'DRAGON_LEADER',
      titleAr: 'غنيمة إخضاع التنين البري',
      rarity: 'EPIC',
      corn: 420,
      stars: 3,
      allianceCoins: 110,
      claimed: false,
    },
    {
      id: `ag_2_${suffix}`,
      sender: 'SAQR_STORM',
      titleAr: 'صندوق موارد الجناح',
      rarity: 'RARE',
      corn: 260,
      stars: 2,
      allianceCoins: 75,
      claimed: false,
    },
    {
      id: `ag_3_${suffix}`,
      sender: 'LAYLA_FROST',
      titleAr: 'هدية نشاط الإخوة',
      rarity: 'COMMON',
      corn: 160,
      stars: 1,
      allianceCoins: 45,
      claimed: false,
    },
  ];
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
    pack: {
      ...state.pack,
      activityPoints: 0,
      donationsToday: 0,
      helpsToday: 0,
      bossAttacksToday: 0,
      claimedActivityChests: [],
      claimedAllianceQuests: [],
      questBaselines: {
        feeds: state.stats.totalFeeds,
        merges: state.stats.totalMerges,
        errands: state.stats.totalErrands,
      },
      gifts: createDailyAllianceGifts(today),
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
