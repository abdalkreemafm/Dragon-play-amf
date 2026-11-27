import {
  AchievementRegistryItem,
  ActiveBuffs,
  DailyPassRewardConfig,
  DragonSlotMeta,
  Duck,
  DuckAuraId,
  DuckGearId,
  DuckSkillMeta,
  DuckSkinId,
  EggItemType,
  FlipCoinPack,
  GameState,
  GodCard,
  GodOrder,
  GodPatronId,
  GridCell,
  HeartMilestoneConfig,
  HonorPackConfig,
  LeagueTier,
  LiveEventConfig,
  MarketListing,
  PromoCodeReward,
  Rarity,
  RivalProfile,
  SeasonConfig,
  SocialTaskConfig,
  SquadTalents,
  TournamentMilestoneConfig,
  TreasureStepConfig,
  WheelRewardSegment,
} from '../types/game';
import {
  calculateCustomUpgradeCost,
  calculateDragonFeedCost,
  clampCustomLevel,
  createDailyAllianceGifts,
  createInitialAllianceLedger,
  createInitialAllianceLogs,
  createInitialAllianceNotifications,
  createInitialCoopProgress,
  createInitialJoinConditions,
  createInitialMemberRoles,
  createInitialRewardPool,
  createInitialSwarmDragonState,
  createInitialTechFunding,
  createInitialTechLevels,
  getDragonMaxDmdPrice,
  getLevelRequiredFeeds,
  resolveDragonSize,
} from '../utils/economyEngine';

export const RARITY_ORDER: Rarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

export const RARITY_STYLE: Record<
  Rarity,
  {
    label: string;
    labelAr: string;
    color: string;
    glow: string;
    border: string;
    bg: string;
    baseDmdPrice: number;
    baseDmdPerHour: number;
    maxCapHours: number;
    basePower: number;
  }
> = {
  COMMON: {
    label: 'COMMON',
    labelAr: 'عادي',
    color: 'text-slate-200',
    glow: 'from-slate-500/20 via-amber-500/10 to-transparent',
    border: 'border-slate-500/60',
    bg: 'bg-slate-700/40',
    baseDmdPrice: 15,
    baseDmdPerHour: 0,
    maxCapHours: 0,
    basePower: 110,
  },
  UNCOMMON: {
    label: 'UNCOMMON',
    labelAr: 'نادر',
    color: 'text-emerald-400',
    glow: 'from-emerald-500/30 via-emerald-500/10 to-transparent',
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-500/15',
    baseDmdPrice: 45,
    baseDmdPerHour: 0,
    maxCapHours: 0,
    basePower: 185,
  },
  RARE: {
    label: 'RARE',
    labelAr: 'ملحمي',
    color: 'text-sky-400',
    glow: 'from-sky-500/35 via-indigo-500/10 to-transparent',
    border: 'border-sky-500/50',
    bg: 'bg-sky-500/15',
    baseDmdPrice: 120,
    baseDmdPerHour: 0,
    maxCapHours: 0,
    basePower: 290,
  },
  EPIC: {
    label: 'EPIC',
    labelAr: 'أسطوري',
    color: 'text-purple-400',
    glow: 'from-purple-500/35 via-fuchsia-500/10 to-transparent',
    border: 'border-purple-500/50',
    bg: 'bg-purple-500/15',
    baseDmdPrice: 350,
    baseDmdPerHour: 0,
    maxCapHours: 0,
    basePower: 440,
  },
  LEGENDARY: {
    label: 'LEGENDARY',
    labelAr: 'خرافي',
    color: 'text-amber-400',
    glow: 'from-amber-400/40 via-orange-500/15 to-transparent',
    border: 'border-amber-400/60',
    bg: 'bg-amber-500/15',
    baseDmdPrice: 1000,
    baseDmdPerHour: 0,
    maxCapHours: 0,
    basePower: 680,
  },
};

export function getFeedCost(
  level: number,
  rarity: Rarity = 'COMMON',
  playerTier = 1,
  clicksSinceReset = 0,
  dragon?: Pick<Duck, 'sizeTier' | 'xl'>
): number {
  return calculateDragonFeedCost(level, rarity, playerTier, clicksSinceReset, resolveDragonSize(dragon));
}

export function getCustomUpgradeCost(customLevel: number): number {
  return calculateCustomUpgradeCost(customLevel);
}

export function getSlotEfficiency(slotIndex: number | null): number {
  if (slotIndex === null || slotIndex < 0) return 0;
  if (slotIndex <= 1) return 1.0;
  if (slotIndex <= 3) return 0.75;
  return 0.5;
}

export function getDragonVaultDmdPrice(dragon: Pick<Duck, 'rarity' | 'sizeTier' | 'xl'>): number {
  return getDragonMaxDmdPrice(dragon.rarity, resolveDragonSize(dragon));
}

// DMD is never mined hourly; kept strictly at 0 for interface compatibility
export function getDragonDmdPerHour(_dragon: Duck): number {
  return 0;
}

export function getDragonMaxCapDmd(_dragon: Duck): number {
  return 0;
}

export const DRAGON_SLOTS: DragonSlotMeta[] = [
  {
    slotIndex: 0,
    label: 'الخانة 1',
    efficiency: 1.0,
    efficiencyPct: 100,
    starCost: 0,
    requirementText: 'مفتوحة من البداية',
  },
  {
    slotIndex: 1,
    label: 'الخانة 2',
    efficiency: 1.0,
    efficiencyPct: 100,
    starCost: 0,
    requirementText: 'مفتوحة من البداية',
  },
  {
    slotIndex: 2,
    label: 'الخانة 3',
    efficiency: 0.75,
    efficiencyPct: 75,
    starCost: 0,
    requirementText: 'مفتوحة من البداية',
  },
  {
    slotIndex: 3,
    label: 'الخانة 4',
    efficiency: 0.75,
    efficiencyPct: 75,
    starCost: 30,
    requirementText: 'تنين واحد يصل إلى LVL 5',
  },
  {
    slotIndex: 4,
    label: 'الخانة 5',
    efficiency: 0.5,
    efficiencyPct: 50,
    starCost: 75,
    requirementText: 'إتمام أول ترقية تخصيص بالنجوم',
  },
  {
    slotIndex: 5,
    label: 'الخانة 6',
    efficiency: 0.5,
    efficiencyPct: 50,
    starCost: 150,
    requirementText: 'امتلاك تنينين من فئة نادر (RARE) فأعلى',
  },
  {
    slotIndex: 6,
    label: 'الخانة 7',
    efficiency: 0.5,
    efficiencyPct: 50,
    starCost: 300,
    requirementText: 'الفوز بـ 10 مواجهات في الحلبة',
  },
  {
    slotIndex: 7,
    label: 'الخانة 8',
    efficiency: 0.5,
    efficiencyPct: 50,
    starCost: 600,
    requirementText: 'تنين ملحمي مخصص + PASS LV.5',
  },
];

export function getDragonSlotMeta(slotIndex: number): DragonSlotMeta {
  const safeIdx = Math.max(0, Math.floor(slotIndex));
  if (safeIdx < DRAGON_SLOTS.length) {
    return DRAGON_SLOTS[safeIdx];
  }
  return {
    slotIndex: safeIdx,
    label: `الخانة ${safeIdx + 1}`,
    efficiency: 0.5,
    efficiencyPct: 50,
    starCost: 600 + (safeIdx - 7) * 150,
    requirementText: 'متاح للفتح بالنجوم ★',
  };
}

export function checkSlotUnlockEligibility(slotIndex: number, state: GameState) {
  if (slotIndex < 0 || !Number.isInteger(slotIndex)) {
    return { metCondition: false, hasEnoughStars: false, canUnlock: false, reason: 'خانة غير صالحة' };
  }
  const meta = getDragonSlotMeta(slotIndex);
  if (slotIndex < state.unlockedSlots) {
    return { metCondition: true, hasEnoughStars: true, canUnlock: false, reason: 'مفتوحة بالفعل' };
  }
  if (slotIndex > state.unlockedSlots) {
    return {
      metCondition: false,
      hasEnoughStars: false,
      canUnlock: false,
      reason: `افتح الخانة ${slotIndex} أولاً`,
    };
  }

  let metCondition = true;
  const allOwned = [...state.ducks, ...(state.customizedVault ?? [])];
  if (slotIndex === 3) {
    metCondition = allOwned.some((d) => d.level >= 5);
  } else if (slotIndex === 4) {
    metCondition = allOwned.some((d) => d.customLevel >= 1);
  } else if (slotIndex === 5) {
    const epicOrHigher = allOwned.filter((d) => RARITY_ORDER.indexOf(d.rarity) >= 2).length;
    metCondition = epicOrHigher >= 2;
  } else if (slotIndex === 6) {
    metCondition = state.league.wins >= 10;
  } else if (slotIndex === 7) {
    const passLv = Math.floor(state.battlePass.xp / 100) + 1;
    const hasCustomLegendary = allOwned.some(
      (d) => RARITY_ORDER.indexOf(d.rarity) >= 3 && d.customLevel >= 1
    );
    metCondition = hasCustomLegendary && passLv >= 5;
  }

  const hasEnoughStars = state.stars >= meta.starCost;
  return {
    metCondition,
    hasEnoughStars,
    canUnlock: metCondition && hasEnoughStars,
    reason: !metCondition ? `المتطلب: ${meta.requirementText}` : !hasEnoughStars ? `تحتاج ${meta.starCost} ★` : 'جاهز للفتح',
  };
}

export interface StorePackage {
  id: string;
  title: string;
  desc: string;
  priceUsd: number;
  starsReward: number;
  energyReward: number;
  eggsReward: EggItemType[];
  legendaryDragon?: {
    name: string;
    skin: DuckSkinId;
    rarity: Rarity;
    gear: DuckGearId;
    aura: DuckAuraId;
  };
  tag: string;
}

export const STORE_PACKAGES: StorePackage[] = [
  {
    id: 'pkg_stars_starter',
    title: 'حزمة نجوم التخصيص',
    desc: '+80 نجمة ★ و +1,200 طعام تنين',
    priceUsd: 1.99,
    starsReward: 80,
    energyReward: 1200,
    eggsReward: ['egg_3', 'egg_3'],
    tag: 'تقدّم سريع',
  },
  {
    id: 'pkg_rare_hatchery',
    title: 'صندوق البيض الملكي',
    desc: '+220 نجمة ★ و 4 بيضات نادرة مع معزز دمج',
    priceUsd: 4.99,
    starsReward: 220,
    energyReward: 3500,
    eggsReward: ['egg_5', 'egg_5', 'egg_6', 'egg_4'],
    tag: 'الأكثر طلباً',
  },
  {
    id: 'pkg_legendary_dragon',
    title: 'صندوق التنين الإمبراطوري الأسطوري',
    desc: 'تنين أسطوري بمستوى 3 وتاج المجد + 400 نجمة ★',
    priceUsd: 9.99,
    starsReward: 400,
    energyReward: 8000,
    eggsReward: ['egg_7', 'egg_love'],
    legendaryDragon: {
      name: 'التنين الإمبراطوري الأسطوري',
      skin: 'royal',
      rarity: 'LEGENDARY',
      gear: 'crown',
      aura: 'gold',
    },
    tag: 'عنصر أسطوري',
  },
];

export const ACTIVE_SEASON: SeasonConfig = {
  id: 'season_1_ember_crown',
  seasonNumber: 1,
  nameAr: 'الموسم الأول · عرش الجمر',
  passTitleAr: 'تذكرة الموسم · عرش الجمر',
  passLevels: 15,
  premiumPriceUsd: 4.99,
  premiumFallbackStarsCost: 60,
  bonusDescriptionAr: 'مضاعفة مكافآت الدوري وتنين إمبراطوري أسطوري عند المستوى 15',
  dropRates: {
    common: 0.58,
    rare: 0.32,
    epic: 0.10,
  },
};

export const LIVE_EVENTS_REGISTRY: LiveEventConfig[] = [
  {
    id: 'evt_arena_stars_x2',
    title: 'حدث خاص: نجوم الحلبة ×2',
    desc: 'تفتح نزالات الحلبة والسباق ربح النجوم المضاعف طوال الحدث!',
    starBonusMult: 2,
    arenaEnergyMult: 1,
    templeEnergyMult: 1,
    badgeText: 'نجوم الحلبة ×2',
  },
  {
    id: 'evt_temple_fever',
    title: 'حدث حُمّى التفقيس والمعبد',
    desc: '+35% طعام تنين من قرابين المعبد و +25% من الحلبة.',
    starBonusMult: 1,
    arenaEnergyMult: 1.25,
    templeEnergyMult: 1.35,
    badgeText: 'بركة المعبد +35%',
  },
];

// Alias kept for backwards compatibility with components reading WEEKEND_EVENTS
export const WEEKEND_EVENTS = LIVE_EVENTS_REGISTRY;

export const TOURNAMENT_MILESTONES: TournamentMilestoneConfig[] = [
  { score: 40, labelAr: '+150 طعام 🍖', reward: { corn: 150 } },
  { score: 100, labelAr: '+250 طعام و +4 ★', reward: { corn: 250, stars: 4 } },
  { score: 250, labelAr: '+500 طعام و +12 ★ و +2 💎', reward: { corn: 500, stars: 12, duckGold: 2 } },
  { score: 400, labelAr: '+800 طعام و +20 ★ و +4 💎', reward: { corn: 800, stars: 20, duckGold: 4 } },
];

export const TREASURE_RACE_STEPS: TreasureStepConfig[] = [
  {
    step: 1,
    titleAr: 'الخطوة الأولى · بوابة الحجر',
    rewardLabelAr: '+180 طاقة + 4 ★',
    reward: { corn: 180, stars: 4 },
  },
  {
    step: 2,
    titleAr: 'الخطوة الثانية · مذبح النار',
    rewardLabelAr: '+280 طاقة + 6 ★ + 3 💎',
    reward: { corn: 280, stars: 6, duckGold: 3 },
  },
  {
    step: 3,
    titleAr: 'الخطوة الثالثة · قبة الصاعقة',
    rewardLabelAr: '+420 طاقة + 10 ★ + بيضة [4]',
    reward: { corn: 420, stars: 10, eggs: ['egg_4'] },
  },
  {
    step: 4,
    titleAr: 'الخطوة الرابعة · خزانة الأساطير',
    rewardLabelAr: '+650 طاقة + 18 ★ + 5 💎 + معزز دمج',
    reward: { corn: 650, stars: 18, duckGold: 5, autoMergeBoosters: 1 },
  },
];

export const HONOR_PACKS_REGISTRY: HonorPackConfig[] = [
  {
    id: 'honor_p1',
    titleAr: 'حزمة الشرف البرونزية',
    costLetters: 3,
    rewardDescAr: '+260 طعام تنين و +15 🏅',
    reward: { corn: 260, medals: 15 },
  },
  {
    id: 'honor_p2',
    titleAr: 'حزمة الشرف الفضية',
    costLetters: 6,
    rewardDescAr: '+620 طعام تنين و +4 💎 و +25 🏅',
    reward: { corn: 620, duckGold: 4, medals: 25 },
  },
  {
    id: 'honor_p3',
    titleAr: 'حزمة الشرف الإمبراطورية',
    costLetters: 12,
    rewardDescAr: '+1,400 طعام تنين و +8 💎 وبيضة [5]',
    reward: { corn: 1400, duckGold: 8, eggs: ['egg_5'] },
  },
];

export const HEART_MILESTONES_REGISTRY: HeartMilestoneConfig[] = [
  {
    targetHearts: 500,
    rewardLabelAr: '+320 طعام تنين و +2 💎',
    reward: { corn: 320, duckGold: 2 },
  },
  {
    targetHearts: 1200,
    rewardLabelAr: '+720 طعام تنين و +5 💎 و +20 🏅',
    reward: { corn: 720, duckGold: 5, medals: 20 },
  },
  {
    targetHearts: 2500,
    rewardLabelAr: '+1,500 طعام تنين و +8 💎 وبيضة [6]',
    reward: { corn: 1500, duckGold: 8, eggs: ['egg_6'] },
  },
];

export const ACHIEVEMENTS_REGISTRY: AchievementRegistryItem[] = [
  {
    id: 'ach_feed_50',
    titleAr: 'مروض التنانين الصاعد',
    descAr: 'أطعم التنانين 50 مرة',
    metric: 'feeds',
    target: 50,
    rewardLabelAr: '+260 طعام تنين و +2 💎',
    reward: { corn: 260, duckGold: 2 },
  },
  {
    id: 'ach_merge_60',
    titleAr: 'ساحر التفقيس',
    descAr: 'ادمج 60 بيضة تنين',
    metric: 'merges',
    target: 60,
    rewardLabelAr: '+420 طعام تنين و +15 🏅',
    reward: { corn: 420, medals: 15 },
  },
  {
    id: 'ach_errand_15',
    titleAr: 'خادم المعبد المخلص',
    descAr: 'سلّم 15 قرباناً للمعبد',
    metric: 'errands',
    target: 15,
    rewardLabelAr: '+550 طعام تنين و +4 💎',
    reward: { corn: 550, duckGold: 4 },
  },
  {
    id: 'ach_arena_10',
    titleAr: 'بطل الحلبة',
    descAr: 'اربح 10 نزالات في الحلبة',
    metric: 'wins',
    target: 10,
    rewardLabelAr: '+680 طعام تنين و +30 🏅',
    reward: { corn: 680, medals: 30 },
  },
  {
    id: 'ach_star_10',
    titleAr: 'تخصيص مصقول ★5',
    descAr: 'صل بأي تنين إلى تخصيص ★5',
    metric: 'maxCustom',
    target: 5,
    rewardLabelAr: '+950 طعام تنين و +7 💎',
    reward: { corn: 950, duckGold: 7 },
  },
  {
    id: 'ach_star_50',
    titleAr: 'ختم التخصيص الكامل ★10',
    descAr: 'أكمل تخصيص تنين للمستوى ★10 وأرسله للخزانة',
    metric: 'maxCustom',
    target: 10,
    rewardLabelAr: '+1,800 طعام تنين و +15 💎 وبيضة [6]',
    reward: { corn: 1800, duckGold: 15, eggs: ['egg_6'] },
  },
];

export const SOCIAL_TASKS_REGISTRY: SocialTaskConfig[] = [
  {
    id: 'soc_tg_channel',
    titleAr: 'انضم لقناة مجتمع DRAGON × AMF على تيليجرام',
    rewardDescAr: '+260 طعام تنين و +10 🏅',
    url: 'https://t.me/dragon_amf_community',
    reward: { corn: 260, medals: 10 },
  },
  {
    id: 'soc_tg_chat',
    titleAr: 'شارك في دردشة المربين الرسمية',
    rewardDescAr: '+200 طعام تنين و +2 💎',
    url: 'https://t.me/dragon_amf_chat',
    reward: { corn: 200, duckGold: 2 },
  },
  {
    id: 'soc_x_follow',
    titleAr: 'تابع أخبار المواسم والتحديثات',
    rewardDescAr: '+240 طعام تنين و +3 💎',
    url: 'https://x.com',
    reward: { corn: 240, duckGold: 3 },
  },
];

export const PROMO_CODES_REGISTRY: PromoCodeReward[] = [
  { code: 'DRAGON', labelAr: 'حزمة التنين الترحيبية', reward: { corn: 320, stars: 8, duckGold: 2 } },
  { code: 'AMF2025', labelAr: 'ذخيرة موسم عرش الجمر', reward: { corn: 450, stars: 12, medals: 15 } },
  { code: 'ARENA', labelAr: 'شحنة فرسان الحلبة', reward: { corn: 280, stars: 7, hammerBoosters: 1 } },
  { code: 'VIP', labelAr: 'تذكار النخبة الملكي', reward: { corn: 550, stars: 15, duckGold: 4, autoMergeBoosters: 1 } },
];

export const WHEEL_REWARDS_REGISTRY: WheelRewardSegment[] = [
  { id: 'w_energy_180', label: '+220 طعام تنين 🍖', shortLabel: '+220 🍖', color: '#0284c7', reward: { corn: 220 } },
  { id: 'w_corn_320', label: '+320 طعام تنين 🍖', shortLabel: '+320 🍖', color: '#d97706', reward: { corn: 320 } },
  { id: 'w_gold_4', label: '+4 ذهب تنانين 💎', shortLabel: '+4 💎', color: '#7c3aed', reward: { duckGold: 4 } },
  { id: 'w_egg_4', label: 'بيضة الزمرد [4] 🥚', shortLabel: 'بيضة [4]', color: '#059669', reward: { eggs: ['egg_4'] } },
  { id: 'w_medals_18', label: '+18 وسام قتال 🏅', shortLabel: '+18 🏅', color: '#e11d48', reward: { medals: 18 } },
  { id: 'w_jackpot', label: 'جائزة كبرى (+500 طعام و +5💎)', shortLabel: 'كبرى 💎', color: '#f59e0b', reward: { corn: 500, duckGold: 5, medals: 20 } },
];

export const RIVALS_CATALOG: RivalProfile[] = [
  {
    id: 'rival_1',
    name: 'حارس الظل',
    skin: 'ninja',
    rarity: 'UNCOMMON',
    basePower: 220,
    baseHp: 210,
    baseAtk: 17,
    cornReward: 210,
    starReward: 4,
    medalReward: 12,
  },
  {
    id: 'rival_2',
    name: 'عاصفة الجليد',
    skin: 'cool',
    rarity: 'RARE',
    basePower: 340,
    baseHp: 295,
    baseAtk: 24,
    cornReward: 320,
    starReward: 6,
    medalReward: 18,
  },
  {
    id: 'rival_3',
    name: 'تنين الفراعنة',
    skin: 'pharaoh',
    rarity: 'EPIC',
    basePower: 510,
    baseHp: 390,
    baseAtk: 31,
    cornReward: 460,
    starReward: 9,
    medalReward: 26,
  },
  {
    id: 'rival_4',
    name: 'الإمبراطور الخالد',
    skin: 'royal',
    rarity: 'LEGENDARY',
    basePower: 760,
    baseHp: 520,
    baseAtk: 41,
    cornReward: 660,
    starReward: 14,
    medalReward: 38,
  },
];

export const DUCK_GEAR_CATALOG: {
  id: DuckGearId;
  nameAr: string;
  icon: string;
  bonusDesc: string;
  powerBonus: number;
}[] = [
  { id: 'none', nameAr: 'طبيعي', icon: '🐉', bonusDesc: 'الشكل الفطري للتنين', powerBonus: 0 },
  { id: 'crown', nameAr: 'تاج الملوك', icon: '👑', bonusDesc: '+15 قوة و +5% هيبة', powerBonus: 15 },
  { id: 'helmet', nameAr: 'درع الحراشف', icon: '🪖', bonusDesc: '+25 صحة في الحلبة', powerBonus: 20 },
  { id: 'shades', nameAr: 'عدسة اللهب', icon: '🕶️', bonusDesc: '+6% ضربة حاسمة', powerBonus: 18 },
  { id: 'wings', nameAr: 'أجنحة العاصفة', icon: '🪽', bonusDesc: '+15% سرعة طيران', powerBonus: 24 },
];

export const DUCK_AURA_CATALOG: {
  id: DuckAuraId;
  nameAr: string;
  swatch: string;
  bonusDesc: string;
}[] = [
  { id: 'auto', nameAr: 'هالة العنصر', swatch: 'bg-sky-400', bonusDesc: 'تتبدل مع المستوى' },
  { id: 'gold', nameAr: 'لهيب ذهبي', swatch: 'bg-amber-400', bonusDesc: 'توهج إمبراطوري' },
  { id: 'flame', nameAr: 'جمر البركان', swatch: 'bg-rose-500', bonusDesc: 'طاقة هجومية' },
  { id: 'emerald', nameAr: 'زمرد السديم', swatch: 'bg-emerald-400', bonusDesc: 'حيوية وتجدد' },
];

export function getDuckCombatStats(
  duck: Duck,
  totalDmd: number,
  packJoined: boolean,
  packPower: number,
  talents?: SquadTalents,
  activeBuffs?: ActiveBuffs
) {
  const now = Date.now();
  const customLv = clampCustomLevel(duck.customLevel);
  const gearBonus = DUCK_GEAR_CATALOG.find((g) => g.id === (duck.gear ?? 'none'))?.powerBonus ?? 0;
  // Bounded scaling across ★0..100 so ★11..100 remains rewarding without breaking Arena balance
  const customPowerBonus =
    Math.min(10, customLv) * 28 + Math.max(0, customLv - 10) * 10;
  const trainLv = duck.trainingLevel ?? 0;
  const furyPct = (talents?.fury ?? 0) * 2.5;
  const carapacePct = (talents?.carapace ?? 0) * 3;
  const buffFuryPct = activeBuffs && activeBuffs.duelFuryUntil > now ? 20 : 0;
  const buffCritBonus = activeBuffs && activeBuffs.critEdgeUntil > now ? 15 : 0;

  const dmdSynergyPct = Math.min(35, Math.round(totalDmd * 0.4));
  const packSynergyPct = packJoined ? 10 + Math.min(20, Math.floor(packPower / 30)) : 0;
  const baseMult = 1 + (dmdSynergyPct + packSynergyPct) / 100;

  const baseHp =
    240 +
    duck.level * 24 +
    duck.skillLevel * 20 +
    trainLv * 14 +
    Math.round((duck.powerRating + gearBonus + customPowerBonus) * 0.35) +
    (duck.gear === 'helmet' ? 25 : 0);
  const maxHp = Math.round(baseHp * (baseMult + carapacePct / 100));

  const baseAtk =
    12 +
    duck.level * 2 +
    duck.skillLevel * 3 +
    trainLv * 2 +
    Math.round((duck.powerRating + gearBonus + customPowerBonus) * 0.04);
  const skeletonAtkBonus = duck.skin === 'skeleton' ? 0.15 : 0;
  const attack = Math.round(baseAtk * (baseMult + skeletonAtkBonus + (furyPct + buffFuryPct) / 100));

  const skinCritBonus = duck.skin === 'ninja' ? 20 : duck.skin === 'gamer' ? 12 : 0;
  const customCritBonus = Math.min(10, customLv) + Math.floor(Math.max(0, customLv - 10) / 10);
  const critChance = Math.min(
    85,
    20 + skinCritBonus + (duck.gear === 'shades' ? 6 : 0) + customCritBonus + buffCritBonus
  );

  return {
    maxHp,
    attack,
    critChance,
    dmdSynergyPct,
    packSynergyPct,
    trainingLevel: trainLv,
    totalPowerScore: Math.round(maxHp * 0.45 + attack * 8 + critChance * 2),
  };
}

export interface DuckEvolutionStage {
  level: number;
  titleAr: string;
  scaleClass: string;
  powerBonus: number;
  feedsRequired: number;
  ringColor: string;
  badgeText: string;
}

export const DUCK_EVOLUTION_LEVELS: DuckEvolutionStage[] = [
  {
    level: 1,
    titleAr: 'المرحلة 1 · فقس التنين',
    scaleClass: 'scale-[0.86]',
    powerBonus: 0,
    feedsRequired: 100,
    ringColor: 'border-slate-500/40 bg-slate-400/10',
    badgeText: 'I',
  },
  {
    level: 2,
    titleAr: 'المرحلة 2 · تنين يافع',
    scaleClass: 'scale-[0.92]',
    powerBonus: 25,
    feedsRequired: 200,
    ringColor: 'border-emerald-400/55 bg-emerald-400/15',
    badgeText: 'II',
  },
  {
    level: 3,
    titleAr: 'المرحلة 3 · تنين مقاتل',
    scaleClass: 'scale-[0.97]',
    powerBonus: 60,
    feedsRequired: 300,
    ringColor: 'border-sky-400/65 bg-sky-400/20',
    badgeText: 'III',
  },
  {
    level: 4,
    titleAr: 'المرحلة 4 · تنين مجنّح',
    scaleClass: 'scale-[1.02]',
    powerBonus: 110,
    feedsRequired: 400,
    ringColor: 'border-purple-400/75 bg-purple-400/25',
    badgeText: 'IV',
  },
  {
    level: 5,
    titleAr: 'المرحلة 5 · التنين البالغ ★',
    scaleClass: 'scale-[1.08]',
    powerBonus: 180,
    feedsRequired: 500,
    ringColor: 'border-amber-400/90 bg-amber-400/30',
    badgeText: 'V ★',
  },
];

export const DUCK_SKILLS: Record<DuckSkinId, DuckSkillMeta> = {
  aqua: {
    name: 'نَفَس المدّ السماوي',
    desc: 'موجة بحرية خاطفة تضرب الخصم وتزيد سرعة الطيران +40%.',
    type: 'TURBO',
    cooldownSec: 5,
    basePower: 38,
    passiveBonus: '+18% سرعة سباق وكومبو الإطعام',
  },
  lilac: {
    name: 'زئير السديم الليلكي',
    desc: 'طاقة بنفسجية تمتص صحة الخصم وتضاعف القوة الهجومية.',
    type: 'VAMPIRE',
    cooldownSec: 6,
    basePower: 46,
    passiveBonus: '+15% طاقة كومبو عند الإطعام',
  },
  classic: {
    name: 'لهب التنين الذهبي',
    desc: 'اندفاع ناري مباشر مع تسريع اندفاع السباق +35%.',
    type: 'TURBO',
    cooldownSec: 5,
    basePower: 28,
    passiveBonus: '+10% سرعة شحن الكومبو',
  },
  dj: {
    name: 'صاعقة الرعد الصوتي',
    desc: 'موجة رعدية تهز الحلبة وتضاعف الضربات الحرجة.',
    type: 'FRENZY',
    cooldownSec: 6,
    basePower: 34,
    passiveBonus: '+15% مدة وضع الحماس',
  },
  gamer: {
    name: 'مخلب البرق الحرج',
    desc: 'هجوم دقيق يطلق 3 ضربات حاسمة متتالية على الخصم.',
    type: 'BURST',
    cooldownSec: 6,
    basePower: 42,
    passiveBonus: '+12% فرصة ضربة حاسمة',
  },
  cupid: {
    name: 'شعاع الأثير الممتص',
    desc: 'يسحب طاقة الخصم ويعالج تنينك أثناء القتال.',
    type: 'VAMPIRE',
    cooldownSec: 7,
    basePower: 30,
    passiveBonus: '+75% قلوب إضافية عند الإطعام (14 ❤️)',
  },
  pumpkin: {
    name: 'درع الجحيم المشتعل',
    desc: 'درع ناري يحجب هجمة الخصم القادمة ويرد الضرر.',
    type: 'SHIELD',
    cooldownSec: 7,
    basePower: 32,
    passiveBonus: 'درع مقاومة قوي في الحلبة',
  },
  skeleton: {
    name: 'زئير العظام الأثري',
    desc: 'ضربة تخترق الدفاعات وتُحدث ضرراً مضاعفاً.',
    type: 'BURST',
    cooldownSec: 6,
    basePower: 44,
    passiveBonus: '+15% ضرر قتالي',
  },
  bride: {
    name: 'بريق اللؤلؤ السماوي',
    desc: 'يعيد التوازن والصحة ويمنح سرعة طيران متقدمة.',
    type: 'VAMPIRE',
    cooldownSec: 6,
    basePower: 33,
    passiveBonus: '+15% كفاءة حلبة وسباق',
  },
  cool: {
    name: 'عاصفة الصقيع الأزرق',
    desc: 'انطلاق جليدي خارق السرعة يتجاوز خصوم السباق.',
    type: 'TURBO',
    cooldownSec: 5,
    basePower: 36,
    passiveBonus: '+18% سرعة طيران',
  },
  pharaoh: {
    name: 'درع رمال الفراعنة',
    desc: 'درع رملي حصين لمدة 3.5 ثوانٍ مع صاعقة ذهبية.',
    type: 'SHIELD',
    cooldownSec: 7,
    basePower: 46,
    passiveBonus: '+20% مكافآت الطاقة والذهب',
  },
  royal: {
    name: 'مرسوم التنين الإمبراطوري',
    desc: 'عاصفة ملكية مزدوجة ترفع ضرر الضربات إلى الذروة.',
    type: 'FRENZY',
    cooldownSec: 6,
    basePower: 52,
    passiveBonus: '+20% نقاط خبرة ومكافآت',
  },
  coffee: {
    name: 'انفجار الحمم البركانية',
    desc: 'تسريع جنوني لضربات المخالب لمدة 4 ثوانٍ.',
    type: 'TURBO',
    cooldownSec: 5,
    basePower: 35,
    passiveBonus: '+20% سرعة شحن المهارات',
  },
  ninja: {
    name: 'ظلّ التنين الصامت',
    desc: 'هجوم مباغت بنسبة حرج 100% لا يمكن صده.',
    type: 'BURST',
    cooldownSec: 5.5,
    basePower: 48,
    passiveBonus: '+20% فرصة ضربة حاسمة',
  },
};

export interface LeagueTierMeta {
  tier: LeagueTier;
  nameAr: string;
  minPoints: number;
  color: string;
  bg: string;
  border: string;
  dailyCorn: number;
  dailyStars: number;
  dailyGold: number;
}

export const LEAGUE_TIERS: LeagueTierMeta[] = [
  {
    tier: 'BRONZE',
    nameAr: 'الدوري البرونزي',
    minPoints: 0,
    color: 'text-orange-300',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/40',
    dailyCorn: 280,
    dailyStars: 0,
    dailyGold: 2,
  },
  {
    tier: 'SILVER',
    nameAr: 'الدوري الفضي',
    minPoints: 150,
    color: 'text-slate-200',
    bg: 'bg-slate-400/15',
    border: 'border-slate-400/40',
    dailyCorn: 460,
    dailyStars: 0,
    dailyGold: 3,
  },
  {
    tier: 'GOLD',
    nameAr: 'الدوري الذهبي',
    minPoints: 400,
    color: 'text-amber-300',
    bg: 'bg-amber-400/15',
    border: 'border-amber-400/50',
    dailyCorn: 720,
    dailyStars: 0,
    dailyGold: 4,
  },
  {
    tier: 'DIAMOND',
    nameAr: 'الدوري الماسي',
    minPoints: 800,
    color: 'text-sky-300',
    bg: 'bg-sky-400/15',
    border: 'border-sky-400/50',
    dailyCorn: 1050,
    dailyStars: 0,
    dailyGold: 6,
  },
  {
    tier: 'LEGENDARY',
    nameAr: 'الدوري الأسطوري',
    minPoints: 1400,
    color: 'text-rose-300',
    bg: 'bg-rose-500/15',
    border: 'border-rose-400/60',
    dailyCorn: 1450,
    dailyStars: 0,
    dailyGold: 8,
  },
];

export function getLeagueMeta(points: number): LeagueTierMeta {
  let current = LEAGUE_TIERS[0];
  for (const tier of LEAGUE_TIERS) {
    if (points >= tier.minPoints) current = tier;
  }
  return current;
}

export interface BattlePassLevelReward {
  level: number;
  xpRequired: number;
  freeLabel: string;
  freeType: 'corn' | 'stars' | 'eggs' | 'boost';
  freeAmount: number;
  premiumLabel: string;
  premiumType: 'stars' | 'gold' | 'duck' | 'boost';
  premiumAmount: number;
}

export const BATTLE_PASS_LEVELS: BattlePassLevelReward[] = Array.from({ length: 15 }, (_, i) => {
  const lv = i + 1;
  const freeEggs = Math.min(3, Math.ceil(lv / 4));
  const freeCorn = lv * 135;
  const premGold = Math.max(2, Math.round(lv * 1.5));
  const premStars = Math.max(3, Math.round(lv * 2));
  return {
    level: lv,
    xpRequired: lv * 100,
    freeLabel: lv % 2 === 0 ? `+${freeEggs} بيضة` : `+${freeCorn.toLocaleString()} طعام`,
    freeType: lv % 2 === 0 ? 'eggs' : 'corn',
    freeAmount: lv % 2 === 0 ? freeEggs : freeCorn,
    premiumLabel:
      lv === 15
        ? 'تنين أسطوري 👑'
        : lv % 4 === 0
          ? '+1 معزز دمج ⚡'
          : lv % 2 === 0
            ? `+${premGold} ذهب 💎`
            : `+${premStars} ★`,
    premiumType: lv === 15 ? 'duck' : lv % 4 === 0 ? 'boost' : lv % 2 === 0 ? 'gold' : 'stars',
    premiumAmount: lv === 15 ? 1 : lv % 4 === 0 ? 1 : lv % 2 === 0 ? premGold : premStars,
  };
});

export interface EggItemMeta {
  id: EggItemType;
  name: string;
  tier: number;
  next: EggItemType | null;
  desc: string;
  cornValue: number;
}

export const EGG_ITEM_META: Record<EggItemType, EggItemMeta> = {
  egg_1: {
    id: 'egg_1',
    name: 'بيضة تنين [1]',
    tier: 1,
    next: 'egg_2',
    desc: 'بيضة تنين بدائية. ادمج اثنتين للحصول على بيضة مدارية.',
    cornValue: 8,
  },
  egg_2: {
    id: 'egg_2',
    name: 'بيضة تنين [2]',
    tier: 2,
    next: 'egg_3',
    desc: 'بيضة بحرية لامعة. ادمجها لترقية عنصر التنين.',
    cornValue: 20,
  },
  egg_3: {
    id: 'egg_3',
    name: 'بيضة السديم [3]',
    tier: 3,
    next: 'egg_4',
    desc: 'بيضة السديم البنفسجية. اجمعها لقرابين المعبد.',
    cornValue: 45,
  },
  egg_4: {
    id: 'egg_4',
    name: 'بيضة الزمرد [4]',
    tier: 4,
    next: 'egg_5',
    desc: 'بيضة تنين الغابات المشتعلة.',
    cornValue: 95,
  },
  egg_5: {
    id: 'egg_5',
    name: 'بيضة الشمس [5]',
    tier: 5,
    next: 'egg_6',
    desc: 'بيضة شمسية مشحونة بالطاقة الذهبية.',
    cornValue: 210,
  },
  egg_6: {
    id: 'egg_6',
    name: 'بيضة الياقوت [6]',
    tier: 6,
    next: 'egg_7',
    desc: 'بيضة الياقوت القرمزية النادرة.',
    cornValue: 420,
  },
  egg_7: {
    id: 'egg_7',
    name: 'بيضة الكريستال [7]',
    tier: 7,
    next: 'egg_8',
    desc: 'بيضة الكريستال السماوية المطلقة.',
    cornValue: 880,
  },
  egg_8: {
    id: 'egg_8',
    name: 'بيضة الأسطورة [8]',
    tier: 8,
    next: 'egg_9',
    desc: 'بيضة أسطورية مشبعة بقوى التنانين العتيقة.',
    cornValue: 1200,
  },
  egg_9: {
    id: 'egg_9',
    name: 'بيضة التنين العظيم [9]',
    tier: 9,
    next: 'egg_10',
    desc: 'بيضة مهيبة تنبض بطاقة الكواكب.',
    cornValue: 1800,
  },
  egg_10: {
    id: 'egg_10',
    name: 'بيضة السيادة المطلقة [10]',
    tier: 10,
    next: 'egg_love',
    desc: 'بيضة السيادة الكونية العظمى.',
    cornValue: 2500,
  },
  egg_love: {
    id: 'egg_love',
    name: 'بيضة القلب الأسطورية ❤️',
    tier: 11,
    next: null,
    desc: 'أندر بيضة تنين تمنح طعام تنين وذهب عند التسليم.',
    cornValue: 3500,
  },
  grapes: {
    id: 'grapes',
    name: 'جوهرة الطاقة [1]',
    tier: 1,
    next: 'chalice',
    desc: 'مورد من صندوق الكنوز. ادمجها لصنع الكأس الإمبراطوري.',
    cornValue: 25,
  },
  chalice: {
    id: 'chalice',
    name: 'الكأس الإمبراطوري [2]',
    tier: 2,
    next: 'cornucopia',
    desc: 'كأس مشتعل بالطاقة. ادمجه لصنع قرن الوفرة.',
    cornValue: 75,
  },
  cornucopia: {
    id: 'cornucopia',
    name: 'قرن الوفرة [3]',
    tier: 3,
    next: 'feast',
    desc: 'قرن الوفرة المليء بجواهر التنانين.',
    cornValue: 210,
  },
  feast: {
    id: 'feast',
    name: 'وليمة التنانين [4]',
    tier: 4,
    next: null,
    desc: 'أثمن قربان يطلبه حراس المعبد في البطولات!',
    cornValue: 540,
  },
  chest: {
    id: 'chest',
    name: 'صندوق الكنوز',
    tier: 0,
    next: null,
    desc: 'افتحه للحصول على جواهر التنين ومعززات الدمج.',
    cornValue: 130,
  },
};

export const SKIN_CATALOG: Record<DuckSkinId, { name: string; title: string }> = {
  aqua: { name: 'تنين البحار السماوي', title: 'Aqua Dragon' },
  lilac: { name: 'تنين السديم الليلكي', title: 'Lilac Dragon' },
  classic: { name: 'تنين النار الذهبي', title: 'Solar Dragon' },
  dj: { name: 'تنين الرعد الصوتي', title: 'Storm Dragon' },
  cupid: { name: 'تنين القلوب الوردية', title: 'Aether Dragon' },
  pumpkin: { name: 'تنين الجحيم اليقطيني', title: 'Inferno Dragon' },
  gamer: { name: 'تنين الكريستال الرقمي', title: 'Cyber Dragon' },
  skeleton: { name: 'تنين العظام الأثري', title: 'Bone Dragon' },
  bride: { name: 'تنين اللؤلؤ الأبيض', title: 'Pearl Dragon' },
  cool: { name: 'تنين الصقيع الأزرق', title: 'Frost Dragon' },
  pharaoh: { name: 'تنين الرمال الفرعوني', title: 'Sand Dragon' },
  royal: { name: 'التنين الإمبراطوري الملكي', title: 'Emperor Dragon' },
  coffee: { name: 'تنين البركان الداكن', title: 'Magma Dragon' },
  ninja: { name: 'تنين الظل الليلي', title: 'Shadow Dragon' },
};

/**
 * Rarity-based dragon 2D artworks (from the 5 uploaded dragon tier shapes).
 */
export const DRAGON_RARITY_ARTWORKS: Record<Rarity, string> = {
  COMMON: '/assets/aistudio/_____3d0392f9.png',
  UNCOMMON: '/assets/aistudio/_____e389eb71.png',
  RARE: '/assets/aistudio/_______655c1976.png',
  EPIC: '/assets/aistudio/_______09561691.png',
  LEGENDARY: '/assets/aistudio/_______5261d0f3.png',
};

/**
 * Fallback skin-to-artwork registry when rarity is not explicitly passed.
 */
export const DRAGON_SKIN_ARTWORKS: Record<DuckSkinId, string> = {
  classic: DRAGON_RARITY_ARTWORKS.COMMON,
  gamer: DRAGON_RARITY_ARTWORKS.COMMON,
  pharaoh: DRAGON_RARITY_ARTWORKS.COMMON,
  aqua: DRAGON_RARITY_ARTWORKS.UNCOMMON,
  cool: DRAGON_RARITY_ARTWORKS.UNCOMMON,
  bride: DRAGON_RARITY_ARTWORKS.UNCOMMON,
  pumpkin: DRAGON_RARITY_ARTWORKS.RARE,
  dj: DRAGON_RARITY_ARTWORKS.EPIC,
  ninja: DRAGON_RARITY_ARTWORKS.EPIC,
  coffee: DRAGON_RARITY_ARTWORKS.EPIC,
  lilac: DRAGON_RARITY_ARTWORKS.LEGENDARY,
  cupid: DRAGON_RARITY_ARTWORKS.LEGENDARY,
  skeleton: DRAGON_RARITY_ARTWORKS.LEGENDARY,
  royal: DRAGON_RARITY_ARTWORKS.LEGENDARY,
};

export function getDragonArtworkUrl(skin: DuckSkinId, rarity?: Rarity): string {
  if (rarity && DRAGON_RARITY_ARTWORKS[rarity]) {
    return DRAGON_RARITY_ARTWORKS[rarity];
  }
  return DRAGON_SKIN_ARTWORKS[skin] ?? DRAGON_RARITY_ARTWORKS.COMMON;
}

export function getDragonElement(skin: DuckSkinId): 'frost' | 'storm' | 'ember' {
  if (skin === 'aqua' || skin === 'bride' || skin === 'cool') return 'frost';
  if (skin === 'dj' || skin === 'skeleton' || skin === 'ninja' || skin === 'gamer') return 'storm';
  return 'ember';
}

export const DAILY_PASS_REWARDS: DailyPassRewardConfig[] = [
  {
    day: 1,
    titleAr: 'اليوم 1 · انطلاقة العرين',
    primaryItem: 'egg_2',
    primaryLabelAr: 'بيضتان [2]',
    secondaryItem: 'cornucopia',
    secondaryLabelAr: 'طعام ومعزز',
    reward: {
      corn: 360,
      stars: 0,
      eggs: ['egg_2', 'egg_2'],
      autoMergeBoosters: 1,
      battlePassXp: 15,
    },
  },
  {
    day: 2,
    titleAr: 'اليوم 2 · شرارة التدريب',
    primaryItem: 'egg_3',
    primaryLabelAr: 'بيضة نادرة [3]',
    secondaryItem: 'chalice',
    secondaryLabelAr: 'طعام ومفاتيح',
    reward: {
      corn: 480,
      stars: 0,
      eggs: ['egg_3'],
      keys: 1,
      medals: 15,
      battlePassXp: 20,
    },
  },
  {
    day: 3,
    titleAr: 'اليوم 3 · بركة المعبد',
    primaryItem: 'egg_3',
    primaryLabelAr: 'بيضتان [3]',
    secondaryItem: 'grapes',
    secondaryLabelAr: 'قلوب وطعام',
    reward: {
      corn: 600,
      stars: 0,
      hearts: 60,
      eggs: ['egg_3', 'egg_3'],
      hammerBoosters: 1,
      battlePassXp: 25,
    },
  },
  {
    day: 4,
    titleAr: 'اليوم 4 · زحف العاصفة',
    primaryItem: 'egg_4',
    primaryLabelAr: 'بيضة زمرد [4]',
    secondaryItem: 'egg_2',
    secondaryLabelAr: 'أوسمة الحلبة',
    reward: {
      corn: 760,
      stars: 0,
      medals: 30,
      eggs: ['egg_4'],
      autoMergeBoosters: 1,
      battlePassXp: 30,
    },
  },
  {
    day: 5,
    titleAr: 'اليوم 5 · خزانة الجواهر',
    primaryItem: 'egg_5',
    primaryLabelAr: 'بيضة جمشت [5]',
    secondaryItem: 'feast',
    secondaryLabelAr: 'ذهب التنانين',
    reward: {
      corn: 920,
      stars: 0,
      duckGold: 4,
      eggs: ['egg_5'],
      keys: 1,
      battlePassXp: 35,
    },
  },
  {
    day: 6,
    titleAr: 'اليوم 6 · مجد الأبطال',
    primaryItem: 'egg_5',
    primaryLabelAr: 'بيضتان [5]',
    secondaryItem: 'chest',
    secondaryLabelAr: 'مفاتيح وشرف',
    reward: {
      corn: 1100,
      stars: 0,
      honorLetters: 2,
      keys: 1,
      duckGold: 3,
      eggs: ['egg_5', 'egg_5'],
      battlePassXp: 40,
    },
  },
  {
    day: 7,
    titleAr: 'اليوم 7 · الذروة الإمبراطورية',
    primaryItem: 'egg_6',
    primaryLabelAr: 'بيضة ياقوت [6]',
    secondaryItem: 'chest',
    secondaryLabelAr: 'كنز الأسبوع',
    reward: {
      corn: 1450,
      stars: 0,
      duckGold: 7,
      keys: 2,
      eggs: ['egg_6'],
      autoMergeBoosters: 2,
      battlePassXp: 60,
    },
  },
];

export const GOD_PATRONS: Record<GodPatronId, { name: string; title: string; color: string }> = {
  anubis: { name: 'أنوبيس', title: 'حارس المعبد', color: '#f59e0b' },
  horus: { name: 'حورس', title: 'سيد السماء', color: '#38bdf8' },
  dionysus: { name: 'ديونيسوس', title: 'سيد الولائم', color: '#a855f7' },
  bastet: { name: 'باستت', title: 'حامية الكنوز', color: '#ec4899' },
  zeus: { name: 'زيوس', title: 'سيد البرق', color: '#eab308' },
};

export const EGG_GRID_TOTAL_SLOTS = 30;
export const EGG_GRID_INITIAL_UNLOCKED = 9;

export function createInitialGrid(): GridCell[] {
  // Center 9 slots open out of 30 (5 columns x 6 rows)
  const openIndices = new Set([6, 7, 8, 11, 12, 13, 16, 17, 18]);
  const presetItems: Partial<Record<number, EggItemType>> = {
    6: 'egg_1',
    7: 'egg_1',
    8: 'egg_2',
    11: 'egg_2',
    12: 'egg_3',
    13: 'grapes',
    16: 'chalice',
    18: 'chest', // Persistent Snack Chest cell
  };

  return Array.from({ length: EGG_GRID_TOTAL_SLOTS }, (_, index) => {
    const locked = !openIndices.has(index);
    return {
      index,
      locked,
      item: locked ? null : presetItems[index] ?? null,
    };
  });
}

export function createRandomGodOrder(indexSeed = 0): GodOrder {
  const patrons: GodPatronId[] = ['anubis', 'horus', 'dionysus', 'bastet', 'zeus'];
  const wants: { item: EggItemType; reward: number; pts: number }[] = [
    { item: 'egg_4', reward: 90, pts: 5 },
    { item: 'egg_5', reward: 175, pts: 6 },
    { item: 'egg_6', reward: 340, pts: 10 },
    { item: 'chalice', reward: 130, pts: 5 },
    { item: 'cornucopia', reward: 290, pts: 10 },
    { item: 'feast', reward: 560, pts: 15 },
    { item: 'egg_love', reward: 750, pts: 20 },
  ];
  const godId = patrons[(indexSeed + Math.floor(Math.random() * patrons.length)) % patrons.length];
  const pick = wants[Math.floor(Math.random() * wants.length)];
  return {
    id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    godId,
    name: GOD_PATRONS[godId].name,
    wantedItem: pick.item,
    cornReward: pick.reward,
    trophyPoints: pick.pts,
  };
}

export function createInitialMarketListings(): MarketListing[] {
  return [];
}

export function createInitialGameState(): GameState {
  // 3 Open Default Slots occupied chronologically by 3 starter dragons — DMD starts strictly at 0!
  const now = Date.now();
  const starterDragons: Duck[] = [
    {
      id: 'dragon_solar_1',
      name: 'تنين النار الذهبي',
      skin: 'classic',
      rarity: 'COMMON',
      level: 1,
      maxLevel: 5,
      customLevel: 0,
      dmd: 0,
      dmdStored: 0,
      slotIndex: 0,
      feedCost: getFeedCost(1, 'COMMON', 1, 0),
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
      xl: false,
      skillLevel: 1,
      trainingLevel: 0,
      powerRating: 125,
      unlockedAt: now - 95000000,
    },
    {
      id: 'dragon_aqua_1',
      name: 'تنين البحار السماوي',
      skin: 'aqua',
      rarity: 'UNCOMMON',
      level: 2,
      maxLevel: 5,
      customLevel: 0,
      dmd: 0,
      dmdStored: 0,
      slotIndex: 1,
      feedCost: getFeedCost(2, 'UNCOMMON', 1, 0),
      feedsProgress: 12,
      feedsRequired: getLevelRequiredFeeds(2),
      feedClicksSinceReset: 0,
      costResetEndsAt: null,
      levelFeedsCompleted: false,
      breedingEndsAt: null,
      breedingNextLevel: null,
      lastBreedingEggAt: null,
      staked: false,
      stakeRatePerHour: 0,
      sizeTier: 'NORMAL',
      xl: false,
      skillLevel: 1,
      trainingLevel: 0,
      powerRating: 210,
      unlockedAt: now - 90000000,
    },
    {
      id: 'dragon_lilac_1',
      name: 'تنين السديم الليلكي',
      skin: 'lilac',
      rarity: 'RARE',
      level: 3,
      maxLevel: 5,
      customLevel: 0,
      dmd: 0,
      dmdStored: 0,
      slotIndex: 2,
      feedCost: getFeedCost(3, 'RARE', 1, 0),
      feedsProgress: 18,
      feedsRequired: getLevelRequiredFeeds(3),
      feedClicksSinceReset: 0,
      costResetEndsAt: null,
      levelFeedsCompleted: false,
      breedingEndsAt: null,
      breedingNextLevel: null,
      lastBreedingEggAt: null,
      staked: false,
      stakeRatePerHour: 0,
      sizeTier: 'NORMAL',
      xl: false,
      skillLevel: 2,
      trainingLevel: 0,
      powerRating: 310,
      unlockedAt: now - 86400000,
    },
  ];

  const godCards: GodCard[] = [
    {
      id: 'god_harvest',
      godKey: 'harvest',
      name: 'بركة الحصاد',
      subtitle: 'توفير 20% طاقة إطعام',
      bonusDesc: 'يخفض تكلفة الإطعام بنسبة 20% مع ضمان حرق صافي لا يقل عن 80% في كل نقرة.',
      goldCost: 40,
      starCost: 45,
      owned: false,
      active: false,
    },
    {
      id: 'god_hype',
      godKey: 'hype',
      name: 'بركة الزخم',
      subtitle: 'مكافآت البطولة +50%',
      bonusDesc: 'يرفع نقاط البطولة الكبرى والتقدم بنسبة +50%.',
      goldCost: 45,
      starCost: 50,
      owned: false,
      active: false,
    },
    {
      id: 'god_fortune',
      godKey: 'fortune',
      name: 'بركة الحظ المضاعف',
      subtitle: 'قفزة تفقيس +20%',
      bonusDesc: 'فرصة 20% لترقية بيض التنانين مستويين دفعة واحدة عند الدمج!',
      goldCost: 70,
      starCost: 75,
      owned: false,
      active: false,
    },
    {
      id: 'god_plunder',
      godKey: 'plunder',
      name: 'بركة الغنائم',
      subtitle: 'نجوم وطاقة المعارك +35%',
      bonusDesc: 'يزيد غنائم الحلبة وصناديق الكنوز بنسبة +35% دون المساس بسقف AMF.',
      goldCost: 90,
      starCost: 90,
      owned: false,
      active: false,
    },
  ];

  const flipCoins: FlipCoinPack[] = [
    {
      id: 'fc_halloween',
      name: 'فصيلة الجحيم',
      collectionName: 'فصيلة الجحيم',
      count: 2,
      totalSkins: 6,
      unlockedSkins: ['pumpkin'],
      possibleSkins: ['pumpkin', 'skeleton', 'ninja', 'cupid', 'cool', 'pharaoh'],
    },
    {
      id: 'fc_royal',
      name: 'التاج الإمبراطوري',
      collectionName: 'التاج الإمبراطوري',
      count: 1,
      totalSkins: 5,
      unlockedSkins: ['lilac'],
      possibleSkins: ['lilac', 'royal', 'bride', 'pharaoh', 'classic'],
    },
    {
      id: 'fc_festival',
      name: 'تنانين العناصر',
      collectionName: 'تنانين العناصر',
      count: 3,
      totalSkins: 6,
      unlockedSkins: ['aqua', 'dj', 'gamer'],
      possibleSkins: ['aqua', 'dj', 'gamer', 'cool', 'cupid', 'coffee'],
    },
    {
      id: 'fc_coffee',
      name: 'رماد البركان',
      collectionName: 'رماد البركان',
      count: 1,
      totalSkins: 3,
      unlockedSkins: [],
      possibleSkins: ['coffee', 'classic', 'cool'],
    },
  ];

  return {
    schemaVersion: 3,
    username: 'DRAGON_TAMER',
    corn: 480,
    stars: 12,
    duckGold: 4,
    dmdTotal: 0,
    breedingEggs: 2,
    ducks: starterDragons,
    customizedVault: [],
    activeDuckIndex: 0,
    unlockedSlots: 3, // 3 default open slots out of 8
    treasury: {
      reserveUsd: 124.5, // Transparent Reserve Treasury ledger (50% of revenue)
      opsUsd: 124.5, // 50% Operations & Dev ledger
      storeRevenueUsd: 210.0,
      adRevenueUsd: 39.0,
      adsWatchedToday: 0,
      maxAdsPerDay: 4,
      totalPurchases: 0,
      barterStarsToday: 0,
      barterGoldToday: 0,
      arenaFullWinsToday: 0,
      energyEarnedToday: 0,
      energyBurnedToday: 0,
      starsEarnedToday: 0,
      starsBurnedToday: 0,
      invitesClaimedToday: 0,
    },
    weekendEventIndex: 0,
    grid: createInitialGrid(),
    eggQueue: ['egg_1', 'egg_2', 'egg_1', 'egg_3', 'egg_1', 'grapes'],
    godOrders: [
      {
        id: 'ord_init_1',
        godId: 'anubis',
        name: 'أنوبيس',
        wantedItem: 'egg_4',
        cornReward: 95,
        trophyPoints: 5,
      },
      {
        id: 'ord_init_2',
        godId: 'horus',
        name: 'حورس',
        wantedItem: 'egg_5',
        cornReward: 180,
        trophyPoints: 6,
      },
      {
        id: 'ord_init_3',
        godId: 'dionysus',
        name: 'ديونيسوس',
        wantedItem: 'chalice',
        cornReward: 130,
        trophyPoints: 5,
      },
    ],
    godCards,
    dailyTasks: [
      {
        id: 'dt_login',
        title: 'تسجيل الدخول اليومي لعالم التنانين',
        progress: 1,
        target: 1,
        rewardStars: 0,
        rewardEnergy: 140,
        claimed: false,
        actionLabel: 'استلام المكافأة',
      },
      {
        id: 'dt_feed',
        title: 'أطعم التنانين 25 مرة',
        progress: 0,
        target: 25,
        rewardStars: 0,
        rewardEnergy: 210,
        claimed: false,
        actionTab: 'DUCKS',
        actionLabel: 'إطعام',
      },
      {
        id: 'dt_merge',
        title: 'ادمج 15 بيضة تنين',
        progress: 0,
        target: 15,
        rewardStars: 0,
        rewardEnergy: 260,
        claimed: false,
        actionTab: 'EGGS',
        actionLabel: 'إلى البيض',
      },
      {
        id: 'dt_errands',
        title: 'سلّم 5 قرابين لحراس المعبد',
        progress: 0,
        target: 5,
        rewardStars: 0,
        rewardEnergy: 310,
        claimed: false,
        actionTab: 'EGGS',
        actionLabel: 'إلى المعبد',
      },
      {
        id: 'dt_claims',
        title: 'اربح 3 مواجهات في الحلبة',
        progress: 0,
        target: 3,
        rewardStars: 0,
        rewardEnergy: 380,
        claimed: false,
        actionTab: 'ARENA',
        actionLabel: 'إلى الحلبة',
      },
    ],
    claimedDailyLevelRewards: [],
    claimedChallengeRewards: [],
    claimedAchievements: [],
    claimedSocials: [],
    claimedHeartMilestones: [],
    claimedTreasureSteps: [],
    claimedHonorPacks: [],
    usedPromoCodes: [],
    flipCoins,
    unlockedSkins: ['aqua', 'lilac', 'classic', 'dj', 'gamer', 'cupid'],
    marketListings: createInitialMarketListings(),
    pack: {
      joined: false,
      allianceId: '',
      leaderPublicId: '',
      leaderName: '',
      realMembers: [],
      packName: '',
      motto: 'وحدة التنانين تفتح أبواب المجد وعرش AMF',
      emblemId: 'dragon_shield',
      power: 0,
      members: 0,
      treasuryCorn: 0,
      messages: [],
      talents: {
        fury: 0,
        carapace: 0,
        incubation: 0,
        prestige: 0,
      },
      level: 1,
      xp: 0,
      allianceCoins: 0,
      contributionTotal: 0,
      activityPoints: 0,
      donationsToday: 0,
      helpsToday: 0,
      bossLevel: 1,
      bossHp: 5000,
      bossMaxHp: 5000,
      bossAttacksToday: 0,
      lastBreedHelpAt: 0,
      claimedActivityChests: [],
      claimedAllianceQuests: [],
      questBaselines: { feeds: 0, merges: 0, errands: 0 },
      gifts: createDailyAllianceGifts(),
      logs: createInitialAllianceLogs(),
      coopProgress: createInitialCoopProgress(),
      claimedCoopGoals: [],
      memberRoles: createInitialMemberRoles(),
      kickedMemberIds: [],
      joinConditions: createInitialJoinConditions(),
      convertedBlessingIds: [],
      swarmDragon: createInitialSwarmDragonState(),
      ledger: createInitialAllianceLedger(),
      techLevels: createInitialTechLevels(),
      techFunding: createInitialTechFunding(),
      activeResearch: null,
      activeRally: null,
      occupiedSites: [],
      mapCooldowns: {},
      notifications: createInitialAllianceNotifications(),
      rewardPool: createInitialRewardPool(),
      lastDividendAt: 0,
    },
    wallet: {
      connected: false,
      address: 'UQDragon...AMF99',
      gram: 0,
    },
    tournament: {
      score: 0,
      claimedMilestones: [],
      resetSeconds: 86400,
      resetAt: now + 86400 * 1000,
    },
    league: {
      points: 100,
      wins: 0,
      racesWon: 0,
      winStreak: 0,
      dailyClaimed: false,
    },
    battlePass: {
      xp: 0,
      premiumUnlocked: false,
      claimedFree: [],
      claimedPremium: [],
    },
    stats: {
      totalFeeds: 0,
      totalMerges: 0,
      totalErrands: 0,
      totalTasksClaimed: 0,
      totalEggsHatched: 0,
      totalDucksMerged: 0,
      hearts: 300,
      medals: 40,
      honorLetters: 6,
      coinsOfChange: 1,
      keys: 1,
      wheelSpins: 0,
      traderDeals: 0,
      dailyPassDay: 1,
      dailyPassClaimedToday: false,
      autoMergeBoosters: 1,
      hammerBoosters: 1,
    },
    activeBuffs: {
      duelFuryUntil: 0,
      critEdgeUntil: 0,
      eggSurgeUntil: 0,
    },
    muted: false,
    hapticsEnabled: true,
    dragonMotionEnabled: false,
    lastSavedAt: Date.now(),
  };
}

export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return Math.floor(num).toLocaleString();
}

export function formatTimer(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export interface ChestDropRoll {
  rarity: 'common' | 'rare' | 'epic';
  rarityLabelAr: string;
  colorClass: string;
  eggs: EggItemType[];
  cornBonus: number;
}

export function rollSupplyChestDrops(seasonId?: string): ChestDropRoll {
  const season = ACTIVE_SEASON;
  const rates = season.dropRates ?? { common: 0.60, rare: 0.30, epic: 0.10 };
  const roll = Math.random();
  const commonLimit = rates.common;
  const rareLimit = commonLimit + rates.rare;

  if (roll < commonLimit) {
    return {
      rarity: 'common',
      rarityLabelAr: 'شائع (Common)',
      colorClass: 'text-slate-300 border-slate-600 bg-slate-800/50',
      eggs: ['egg_1', 'grapes'],
      cornBonus: 120,
    };
  } else if (roll < rareLimit) {
    return {
      rarity: 'rare',
      rarityLabelAr: 'نادر (Rare)',
      colorClass: 'text-sky-300 border-sky-500/50 bg-sky-950/40',
      eggs: ['egg_3', 'chalice'],
      cornBonus: 220,
    };
  } else {
    return {
      rarity: 'epic',
      rarityLabelAr: 'ملحمي / موسمي (Epic)',
      colorClass: 'text-amber-300 border-amber-400/60 bg-amber-950/40',
      eggs: ['egg_5', 'egg_6'],
      cornBonus: 450,
    };
  }
}
