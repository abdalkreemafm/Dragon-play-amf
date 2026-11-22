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

export function checkSlotUnlockEligibility(slotIndex: number, state: GameState) {
  const meta = DRAGON_SLOTS[slotIndex];
  if (!meta) return { metCondition: false, hasEnoughStars: false, canUnlock: false, reason: 'خانة غير صالحة' };
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
    desc: '+80 نجمة ★ و +1,200 طاقة إطعام لتسريع الوصول للمرحلة 5',
    priceUsd: 1.99,
    starsReward: 80,
    energyReward: 1200,
    eggsReward: ['egg_3', 'egg_3'],
    tag: 'تقدّم سريع',
  },
  {
    id: 'pkg_rare_hatchery',
    title: 'صندوق البيض الملكي',
    desc: '+220 نجمة ★ و 4 بيضات نادرة مع معزز دمج فوري',
    priceUsd: 4.99,
    starsReward: 220,
    energyReward: 3500,
    eggsReward: ['egg_5', 'egg_5', 'egg_6', 'egg_4'],
    tag: 'الأكثر طلباً',
  },
  {
    id: 'pkg_legendary_dragon',
    title: 'صندوق التنين الإمبراطوري الأسطوري',
    desc: 'تنين أسطوري بمستوى 3 وتاج المجد + 400 نجمة ★ جاهز للهيمنة',
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
};

export const LIVE_EVENTS_REGISTRY: LiveEventConfig[] = [
  {
    id: 'evt_arena_stars_x2',
    title: 'فعالية نهاية الأسبوع: مضاعفة نجوم الحلبة ×2',
    desc: 'كل فوز في الحلبة أو السباق يمنح ضعف مكافأة النجوم لتسريع التخصيص حتى ★100!',
    starBonusMult: 2,
    arenaEnergyMult: 1,
    templeEnergyMult: 1,
    badgeText: 'نجوم الحلبة ×2',
  },
  {
    id: 'evt_temple_fever',
    title: 'فعالية حُمّى التفقيس والمعبد',
    desc: 'مكافآت طاقة +35% من قرابين المعبد و+25% طاقة من نزالات الحلبة!',
    starBonusMult: 1,
    arenaEnergyMult: 1.25,
    templeEnergyMult: 1.35,
    badgeText: 'بركة المعبد +35%',
  },
];

// Alias kept for backwards compatibility with components reading WEEKEND_EVENTS
export const WEEKEND_EVENTS = LIVE_EVENTS_REGISTRY;

export const TOURNAMENT_MILESTONES: TournamentMilestoneConfig[] = [
  { score: 40, labelAr: '+150 طاقة ⚡', reward: { corn: 150 } },
  { score: 100, labelAr: '+250 طاقة و +4 ★', reward: { corn: 250, stars: 4 } },
  { score: 250, labelAr: '+500 طاقة و +12 ★ و +2 💎', reward: { corn: 500, stars: 12, duckGold: 2 } },
  { score: 400, labelAr: '+800 طاقة و +20 ★ و +4 💎', reward: { corn: 800, stars: 20, duckGold: 4 } },
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
    rewardDescAr: '+200 طاقة و +6 ★',
    reward: { corn: 200, stars: 6 },
  },
  {
    id: 'honor_p2',
    titleAr: 'حزمة الشرف الفضية',
    costLetters: 6,
    rewardDescAr: '+480 طاقة و +14 ★ و +3 💎',
    reward: { corn: 480, stars: 14, duckGold: 3 },
  },
  {
    id: 'honor_p3',
    titleAr: 'حزمة الشرف الإمبراطورية',
    costLetters: 12,
    rewardDescAr: '+1,100 طاقة و +30 ★ و +6 💎 وبيضة [5]',
    reward: { corn: 1100, stars: 30, duckGold: 6, eggs: ['egg_5'] },
  },
];

export const HEART_MILESTONES_REGISTRY: HeartMilestoneConfig[] = [
  {
    targetHearts: 500,
    rewardLabelAr: '+240 طاقة و +6 ★',
    reward: { corn: 240, stars: 6 },
  },
  {
    targetHearts: 1200,
    rewardLabelAr: '+550 طاقة و +14 ★ و +3 💎',
    reward: { corn: 550, stars: 14, duckGold: 3 },
  },
  {
    targetHearts: 2500,
    rewardLabelAr: '+1,200 طاقة و +28 ★ وبيضة [6]',
    reward: { corn: 1200, stars: 28, eggs: ['egg_6'] },
  },
];

export const ACHIEVEMENTS_REGISTRY: AchievementRegistryItem[] = [
  {
    id: 'ach_feed_50',
    titleAr: 'مروض التنانين الصاعد',
    descAr: 'أطعم التنانين 50 مرة',
    metric: 'feeds',
    target: 50,
    rewardLabelAr: '+5 ★ و +200 ⚡',
    reward: { stars: 5, corn: 200 },
  },
  {
    id: 'ach_merge_60',
    titleAr: 'ساحر التفقيس',
    descAr: 'ادمج 60 بيضة تنين',
    metric: 'merges',
    target: 60,
    rewardLabelAr: '+8 ★ و +320 ⚡',
    reward: { stars: 8, corn: 320 },
  },
  {
    id: 'ach_errand_15',
    titleAr: 'خادم المعبد المخلص',
    descAr: 'سلّم 15 قرباناً للمعبد',
    metric: 'errands',
    target: 15,
    rewardLabelAr: '+10 ★ و +3 💎',
    reward: { stars: 10, duckGold: 3 },
  },
  {
    id: 'ach_arena_10',
    titleAr: 'بطل الحلبة',
    descAr: 'اربح 10 نزالات في الحلبة',
    metric: 'wins',
    target: 10,
    rewardLabelAr: '+15 ★ و +20 🏅',
    reward: { stars: 15, medals: 20 },
  },
  {
    id: 'ach_star_10',
    titleAr: 'تخصيص مصقول ★5',
    descAr: 'صل بأي تنين إلى تخصيص ★5',
    metric: 'maxCustom',
    target: 5,
    rewardLabelAr: '+20 ★ و +5 💎',
    reward: { stars: 20, duckGold: 5 },
  },
  {
    id: 'ach_star_50',
    titleAr: 'ختم التخصيص الكامل ★10',
    descAr: 'أكمل تخصيص تنين للمستوى ★10 وأرسله للخزانة',
    metric: 'maxCustom',
    target: 10,
    rewardLabelAr: '+45 ★ و +12 💎 وبيضة [6]',
    reward: { stars: 45, duckGold: 12, eggs: ['egg_6'] },
  },
];

export const SOCIAL_TASKS_REGISTRY: SocialTaskConfig[] = [
  {
    id: 'soc_tg_channel',
    titleAr: 'انضم لقناة مجتمع DRAGON × DMD على تيليجرام',
    rewardDescAr: '+5 ★ و +180 طاقة',
    url: 'https://t.me/dragon_dmd_community',
    reward: { stars: 5, corn: 180 },
  },
  {
    id: 'soc_tg_chat',
    titleAr: 'شارك في دردشة المربين الرسمية',
    rewardDescAr: '+4 ★ و +140 طاقة',
    url: 'https://t.me/dragon_dmd_chat',
    reward: { stars: 4, corn: 140 },
  },
  {
    id: 'soc_x_follow',
    titleAr: 'تابع أخبار المواسم والتحديثات',
    rewardDescAr: '+5 ★ و +2 💎',
    url: 'https://x.com',
    reward: { stars: 5, duckGold: 2 },
  },
];

export const PROMO_CODES_REGISTRY: PromoCodeReward[] = [
  { code: 'DRAGON', labelAr: 'حزمة التنين الترحيبية', reward: { corn: 320, stars: 8, duckGold: 2 } },
  { code: 'DMD2025', labelAr: 'ذخيرة موسم عرش الجمر', reward: { corn: 450, stars: 12, medals: 15 } },
  { code: 'ARENA', labelAr: 'شحنة فرسان الحلبة', reward: { corn: 280, stars: 7, hammerBoosters: 1 } },
  { code: 'VIP', labelAr: 'تذكار النخبة الملكي', reward: { corn: 550, stars: 15, duckGold: 4, autoMergeBoosters: 1 } },
];

export const WHEEL_REWARDS_REGISTRY: WheelRewardSegment[] = [
  { id: 'w_energy_180', label: '+180 طاقة ⚡', shortLabel: '+180 ⚡', color: '#0284c7', reward: { corn: 180 } },
  { id: 'w_stars_6', label: '+6 نجوم ★', shortLabel: '+6 ★', color: '#d97706', reward: { stars: 6 } },
  { id: 'w_gold_4', label: '+4 ذهب تنانين 💎', shortLabel: '+4 💎', color: '#7c3aed', reward: { duckGold: 4 } },
  { id: 'w_egg_4', label: 'بيضة الزمرد [4] 🥚', shortLabel: 'بيضة [4]', color: '#059669', reward: { eggs: ['egg_4'] } },
  { id: 'w_medals_18', label: '+18 وسام قتال 🏅', shortLabel: '+18 🏅', color: '#e11d48', reward: { medals: 18 } },
  { id: 'w_jackpot', label: 'جائزة كبرى (+300⚡ و +10★)', shortLabel: 'كبرى ★', color: '#f59e0b', reward: { corn: 300, stars: 10, duckGold: 2 } },
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
    dailyCorn: 220,
    dailyStars: 2,
    dailyGold: 1,
  },
  {
    tier: 'SILVER',
    nameAr: 'الدوري الفضي',
    minPoints: 150,
    color: 'text-slate-200',
    bg: 'bg-slate-400/15',
    border: 'border-slate-400/40',
    dailyCorn: 380,
    dailyStars: 3,
    dailyGold: 2,
  },
  {
    tier: 'GOLD',
    nameAr: 'الدوري الذهبي',
    minPoints: 400,
    color: 'text-amber-300',
    bg: 'bg-amber-400/15',
    border: 'border-amber-400/50',
    dailyCorn: 580,
    dailyStars: 5,
    dailyGold: 3,
  },
  {
    tier: 'DIAMOND',
    nameAr: 'الدوري الماسي',
    minPoints: 800,
    color: 'text-sky-300',
    bg: 'bg-sky-400/15',
    border: 'border-sky-400/50',
    dailyCorn: 820,
    dailyStars: 7,
    dailyGold: 4,
  },
  {
    tier: 'LEGENDARY',
    nameAr: 'الدوري الأسطوري',
    minPoints: 1400,
    color: 'text-rose-300',
    bg: 'bg-rose-500/15',
    border: 'border-rose-400/60',
    dailyCorn: 1100,
    dailyStars: 10,
    dailyGold: 6,
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
  const freeStars = Math.max(2, Math.round(lv * 0.9));
  const freeEggs = Math.min(3, Math.ceil(lv / 4));
  const freeCorn = lv * 110;
  const premGold = Math.max(2, Math.round(lv * 1.5));
  const premStars = Math.max(3, Math.round(lv * 2));
  return {
    level: lv,
    xpRequired: lv * 100,
    freeLabel: lv % 3 === 0 ? `+${freeStars} ★` : lv % 2 === 0 ? `+${freeEggs} بيضة` : `+${freeCorn.toLocaleString()} طاقة`,
    freeType: lv % 3 === 0 ? 'stars' : lv % 2 === 0 ? 'eggs' : 'corn',
    freeAmount: lv % 3 === 0 ? freeStars : lv % 2 === 0 ? freeEggs : freeCorn,
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
    next: 'egg_love',
    desc: 'بيضة الكريستال السماوية المطلقة.',
    cornValue: 880,
  },
  egg_love: {
    id: 'egg_love',
    name: 'بيضة القلب الأسطورية ❤️',
    tier: 8,
    next: null,
    desc: 'أندر بيضة تنين! تمنح طاقة عالية ومكافآت نجوم عند التسليم.',
    cornValue: 1400,
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
    secondaryLabelAr: 'حزمة موارد',
    reward: {
      corn: 320,
      stars: 3,
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
    secondaryLabelAr: 'طاقة ونجوم',
    reward: {
      corn: 420,
      stars: 5,
      eggs: ['egg_3'],
      keys: 1,
      battlePassXp: 20,
    },
  },
  {
    day: 3,
    titleAr: 'اليوم 3 · بركة المعبد',
    primaryItem: 'egg_3',
    primaryLabelAr: 'بيضتان [3]',
    secondaryItem: 'grapes',
    secondaryLabelAr: 'قلوب المعبد',
    reward: {
      corn: 520,
      stars: 6,
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
      corn: 650,
      stars: 8,
      medals: 25,
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
      corn: 800,
      stars: 10,
      duckGold: 3,
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
      corn: 950,
      stars: 12,
      honorLetters: 2,
      keys: 1,
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
      corn: 1200,
      stars: 18,
      duckGold: 6,
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

export function createInitialGrid(): GridCell[] {
  const lockedIndices = new Set([0, 7, 48, 55]);
  const presetItems: Partial<Record<number, EggItemType>> = {
    1: 'egg_1',
    2: 'egg_1',
    4: 'egg_2',
    5: 'egg_2',
    9: 'egg_1',
    10: 'egg_3',
    12: 'egg_2',
    15: 'egg_1',
    17: 'grapes',
    18: 'egg_2',
    20: 'egg_1',
    22: 'egg_3',
    24: 'egg_1',
    26: 'grapes',
    28: 'egg_2',
    30: 'egg_1',
    32: 'egg_2',
    35: 'chalice',
    37: 'egg_1',
    39: 'egg_2',
    42: 'egg_1',
    44: 'egg_3',
    50: 'egg_2',
    53: 'egg_1',
  };

  return Array.from({ length: 56 }, (_, index) => ({
    index,
    locked: lockedIndices.has(index),
    item: lockedIndices.has(index) ? null : presetItems[index] ?? null,
  }));
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
  return [
    {
      id: 'mkt_1',
      duckName: 'تنين الصقيع الأزرق XL',
      skin: 'cool',
      rarity: 'UNCOMMON',
      level: 3,
      xl: true,
      dmd: 0,
      seller: 'CAMA_9L',
      cornPrice: 2400,
      starPrice: 35,
      timeLeftSec: 22,
      isUserBid: false,
      soldStatus: 'ACTIVE',
    },
    {
      id: 'mkt_2',
      duckName: 'تنين العظام الأثري',
      skin: 'skeleton',
      rarity: 'UNCOMMON',
      level: 4,
      dmd: 0,
      seller: 'NUBUBIICA',
      cornPrice: 3100,
      starPrice: 42,
      timeLeftSec: 28,
      isUserBid: false,
      soldStatus: 'ACTIVE',
    },
    {
      id: 'mkt_3',
      duckName: 'تنين الظل الليلي',
      skin: 'ninja',
      rarity: 'RARE',
      level: 4,
      dmd: 0,
      seller: 'MULTI_BOSS',
      cornPrice: 5400,
      starPrice: 68,
      timeLeftSec: 36,
      isUserBid: false,
      soldStatus: 'ACTIVE',
    },
    {
      id: 'mkt_4',
      duckName: 'تنين البحار السماوي',
      skin: 'aqua',
      rarity: 'RARE',
      level: 4,
      dmd: 0,
      seller: 'VIP_DRAGON',
      cornPrice: 6200,
      starPrice: 75,
      timeLeftSec: 42,
      isUserBid: false,
      soldStatus: 'ACTIVE',
    },
    {
      id: 'mkt_5',
      duckName: 'تنين السديم الليلكي',
      skin: 'lilac',
      rarity: 'EPIC',
      level: 5,
      dmd: 0,
      seller: 'SOLAFEIFEI',
      cornPrice: 14500,
      starPrice: 135,
      timeLeftSec: 52,
      isUserBid: false,
      soldStatus: 'ACTIVE',
    },
    {
      id: 'mkt_6',
      duckName: 'التنين الإمبراطوري الملكي',
      skin: 'royal',
      rarity: 'LEGENDARY',
      level: 5,
      xl: true,
      dmd: 0,
      seller: 'ZLOYPHILIPP',
      cornPrice: 32000,
      starPrice: 280,
      timeLeftSec: 60,
      isUserBid: false,
      soldStatus: 'ACTIVE',
    },
  ];
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
      bonusDesc: 'يزيد غنائم الحلبة وصناديق الكنوز بنسبة +35% دون المساس بسقف DMD.',
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
        rewardStars: 2,
        rewardEnergy: 80,
        claimed: false,
        actionLabel: 'استلام المكافأة',
      },
      {
        id: 'dt_feed',
        title: 'أطعم التنانين 25 مرة',
        progress: 0,
        target: 25,
        rewardStars: 3,
        rewardEnergy: 130,
        claimed: false,
        actionTab: 'DUCKS',
        actionLabel: 'إطعام',
      },
      {
        id: 'dt_merge',
        title: 'ادمج 15 بيضة تنين',
        progress: 0,
        target: 15,
        rewardStars: 3,
        rewardEnergy: 160,
        claimed: false,
        actionTab: 'EGGS',
        actionLabel: 'إلى البيض',
      },
      {
        id: 'dt_errands',
        title: 'سلّم 5 قرابين لحراس المعبد',
        progress: 0,
        target: 5,
        rewardStars: 4,
        rewardEnergy: 190,
        claimed: false,
        actionTab: 'EGGS',
        actionLabel: 'إلى المعبد',
      },
      {
        id: 'dt_claims',
        title: 'اربح 3 مواجهات في الحلبة',
        progress: 0,
        target: 3,
        rewardStars: 5,
        rewardEnergy: 220,
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
      packName: 'عش التنانين (Draco)',
      power: 446,
      members: 14,
      treasuryCorn: 18500,
      messages: [
        { id: 'm1', sender: 'DRAGON_LEADER', text: 'مرحباً! طوروا تنانينكم للمستوى 5 وابدأوا تخصيص النجوم!', time: '14:20' },
        { id: 'm2', sender: 'FERMER_DRACO', text: 'الخانة 4 تفتح بعد وصول تنين واحد لـ LVL 5!', time: '14:22' },
      ],
      talents: {
        fury: 0,
        carapace: 0,
        incubation: 0,
        prestige: 0,
      },
    },
    wallet: {
      connected: false,
      address: 'UQDragon...DMD99',
      gram: 0,
    },
    tournament: {
      score: 0,
      claimedMilestones: [],
      resetSeconds: 5180,
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
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}
