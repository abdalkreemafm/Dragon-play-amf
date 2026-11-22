export type AppScreen = 'TITLE' | 'PLAYING';

export type MainTab = 'MARKET' | 'EGGS' | 'DUCKS' | 'ARENA' | 'GODS' | 'TASKS';

export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export type DuckSkinId =
  | 'aqua'
  | 'lilac'
  | 'classic'
  | 'dj'
  | 'cupid'
  | 'pumpkin'
  | 'gamer'
  | 'skeleton'
  | 'bride'
  | 'cool'
  | 'pharaoh'
  | 'royal'
  | 'coffee'
  | 'ninja';

export type SkillType = 'BURST' | 'SHIELD' | 'VAMPIRE' | 'FRENZY' | 'TURBO';

export interface DuckSkillMeta {
  name: string;
  desc: string;
  type: SkillType;
  cooldownSec: number;
  basePower: number;
  passiveBonus: string;
}

export type DuckGearId = 'none' | 'crown' | 'helmet' | 'shades' | 'wings';
export type DuckAuraId = 'auto' | 'gold' | 'flame' | 'emerald';
export type DragonSize = 'NORMAL' | 'XL' | 'XXL';

export interface Duck {
  id: string;
  name: string;
  skin: DuckSkinId;
  rarity: Rarity;
  level: number;
  maxLevel: number;
  customLevel: number; // 0..10 (10★ to 100★ instant customization steps; ★10 transfers dragon to DMD exchange vault)
  dmd: number; // DMD value unlocked on this dragon toward its tier exchange price
  dmdStored: number; // Legacy field kept 0 (DMD is wallet-only, never mined)
  slotIndex: number | null; // Assigned chronologically 0..7 (null = reserve roster)
  feedCost: number;
  feedsProgress: number;
  feedsRequired: number;
  feedClicksSinceReset?: number; // Clicks within current 8h reset window
  costResetEndsAt?: number | null; // Epoch ms when 8h feed cost resets back to level base
  levelFeedsCompleted?: boolean; // True when current level clicks reached requiredClicks
  breedingEndsAt?: number | null; // Epoch ms when 24h breeding gate finishes -> level + 1
  breedingNextLevel?: number | null;
  lastBreedingEggAt?: number | null; // Tracks 15-min breeding egg generation intervals
  staked: boolean; // Legacy field kept false (no DMD mining)
  stakeRatePerHour: number; // Legacy field kept 0
  stakedItemId?: string;
  xl?: boolean;
  sizeTier?: DragonSize; // NORMAL | XL | XXL
  gear?: DuckGearId;
  aura?: DuckAuraId;
  skillLevel: number;
  trainingLevel?: number; // Continuous Energy combat training rank (0+)
  powerRating: number;
  unlockedAt: number;
}

export interface DragonSlotMeta {
  slotIndex: number; // 0..7
  label: string;
  efficiency: number; // 1.0, 0.75, 0.50
  efficiencyPct: number; // 100, 75, 50
  starCost: number;
  requirementText: string;
}

export interface TreasuryState {
  reserveUsd: number; // 50% dedicated to DMD Reserve Treasury
  opsUsd: number; // 50% dedicated to Operations, Dev & Growth
  storeRevenueUsd: number;
  adRevenueUsd: number;
  adsWatchedToday: number;
  maxAdsPerDay: number;
  totalPurchases: number;
  dailyDateKey?: string;
  barterStarsToday?: number;
  barterGoldToday?: number;
  arenaFullWinsToday?: number;
  energyEarnedToday?: number;
  energyBurnedToday?: number;
  starsEarnedToday?: number;
  starsBurnedToday?: number;
  invitesClaimedToday?: number;
}

export type EggItemType =
  | 'egg_1'
  | 'egg_2'
  | 'egg_3'
  | 'egg_4'
  | 'egg_5'
  | 'egg_6'
  | 'egg_7'
  | 'egg_love'
  | 'grapes'
  | 'chalice'
  | 'cornucopia'
  | 'feast'
  | 'chest';

export interface GridCell {
  index: number;
  item: EggItemType | null;
  locked: boolean;
  justMerged?: boolean;
}

export type GodPatronId = 'anubis' | 'horus' | 'dionysus' | 'bastet' | 'zeus';

export interface GodOrder {
  id: string;
  godId: GodPatronId;
  name: string;
  wantedItem: EggItemType;
  cornReward: number;
  trophyPoints: number;
}

export interface GodCard {
  id: string;
  godKey: 'harvest' | 'hype' | 'fortune' | 'plunder';
  name: string;
  subtitle: string;
  bonusDesc: string;
  goldCost: number;
  starCost: number;
  owned: boolean;
  active: boolean;
}

export interface DailyTask {
  id: string;
  title: string;
  progress: number;
  target: number;
  rewardStars: number;
  rewardEnergy: number;
  claimed: boolean;
  actionTab?: MainTab;
  actionLabel: string;
}

export interface FlipCoinPack {
  id: string;
  name: string;
  collectionName: string;
  count: number;
  totalSkins: number;
  unlockedSkins: DuckSkinId[];
  possibleSkins: DuckSkinId[];
}

export interface MarketListing {
  id: string;
  duckName: string;
  skin: DuckSkinId;
  rarity: Rarity;
  level: number;
  xl?: boolean;
  dmd: number;
  seller: string;
  lastBidder?: string;
  cornPrice: number;
  starPrice: number;
  timeLeftSec: number;
  isUserBid: boolean;
  rivalSniped?: boolean;
  soldStatus?: 'ACTIVE' | 'SOLD_OTHER' | 'SOLD_YOU';
  soldAt?: number;
}

export interface PackMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

export type SquadTalentKey = 'fury' | 'carapace' | 'incubation' | 'prestige';

export interface SquadTalents {
  fury: number;
  carapace: number;
  incubation: number;
  prestige: number;
}

export type ForgeBuffId = 'duel_fury' | 'crit_edge' | 'egg_surge';

export interface ActiveBuffs {
  duelFuryUntil: number;
  critEdgeUntil: number;
  eggSurgeUntil: number;
}

export interface PackState {
  joined: boolean;
  packName: string;
  power: number;
  members: number;
  treasuryCorn: number;
  messages: PackMessage[];
  talents?: SquadTalents;
}

export interface WalletState {
  connected: boolean;
  address: string;
  gram: number;
}

export interface TournamentState {
  score: number;
  claimedMilestones: number[];
  resetSeconds: number;
}

export type LeagueTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'LEGENDARY';

export interface LeagueState {
  points: number;
  wins: number;
  racesWon: number;
  winStreak: number;
  dailyClaimed: boolean;
}

export interface BattlePassState {
  xp: number;
  premiumUnlocked: boolean;
  claimedFree: number[];
  claimedPremium: number[];
}

export interface GameStats {
  totalFeeds: number;
  totalMerges: number;
  totalErrands: number;
  totalTasksClaimed: number;
  totalEggsHatched: number;
  totalDucksMerged: number;
  hearts: number;
  medals: number;
  honorLetters: number;
  coinsOfChange: number;
  keys: number;
  wheelSpins: number;
  traderDeals: number;
  dailyPassDay: number;
  dailyPassClaimedToday: boolean;
  autoMergeBoosters: number;
  hammerBoosters: number;
}

export interface RewardBundle {
  corn?: number;
  stars?: number;
  duckGold?: number;
  medals?: number;
  hearts?: number;
  keys?: number;
  honorLetters?: number;
  coinsOfChange?: number;
  battlePassXp?: number;
  autoMergeBoosters?: number;
  hammerBoosters?: number;
  eggs?: EggItemType[];
  tournamentScore?: number;
}

export interface EventModifiers {
  starBonusMult: number;
  arenaEnergyMult: number;
  templeEnergyMult: number;
  badgeText: string;
}

export interface LiveEventConfig {
  id: string;
  title: string;
  desc: string;
  starBonusMult: number;
  arenaEnergyMult: number;
  templeEnergyMult: number;
  badgeText: string;
}

export interface SeasonConfig {
  id: string;
  seasonNumber: number;
  nameAr: string;
  passTitleAr: string;
  passLevels: number;
  premiumPriceUsd: number;
  premiumFallbackStarsCost: number;
  bonusDescriptionAr: string;
}

export interface StarEvolutionTierMeta {
  minStar: number;
  nameAr: string;
  subtitleAr: string;
  auraColorHex: string;
  badgeClass: string;
}

export interface TournamentMilestoneConfig {
  score: number;
  labelAr: string;
  reward: RewardBundle;
}

export interface TreasureStepConfig {
  step: number;
  titleAr: string;
  rewardLabelAr: string;
  reward: RewardBundle;
}

export interface HonorPackConfig {
  id: string;
  titleAr: string;
  costLetters: number;
  rewardDescAr: string;
  reward: RewardBundle;
}

export interface HeartMilestoneConfig {
  targetHearts: number;
  rewardLabelAr: string;
  reward: RewardBundle;
}

export interface AchievementRegistryItem {
  id: string;
  titleAr: string;
  descAr: string;
  metric: 'feeds' | 'merges' | 'errands' | 'tasks' | 'wins' | 'ducks' | 'maxCustom';
  target: number;
  rewardLabelAr: string;
  reward: RewardBundle;
}

export interface SocialTaskConfig {
  id: string;
  titleAr: string;
  rewardDescAr: string;
  url?: string;
  reward: RewardBundle;
}

export interface PromoCodeReward {
  code: string;
  labelAr: string;
  reward: RewardBundle;
}

export interface WheelRewardSegment {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  reward: RewardBundle;
}

export interface DailyPassRewardConfig {
  day: number;
  titleAr: string;
  primaryItem: EggItemType;
  primaryLabelAr: string;
  secondaryItem: EggItemType;
  secondaryLabelAr: string;
  reward: RewardBundle;
}

export interface RivalProfile {
  id: string;
  name: string;
  skin: DuckSkinId;
  rarity: Rarity;
  basePower: number;
  baseHp: number;
  baseAtk: number;
  cornReward: number;
  starReward: number;
  medalReward: number;
}

export interface GameState {
  schemaVersion?: number;
  username: string;
  corn: number; // Energy / Feeding Grains (الطاقة)
  stars: number; // Progression & Star Customization currency (النجوم)
  duckGold: number; // Dragon Relics / Gold (ذهب التنانين)
  dmdTotal: number; // Wallet DMD credited from ★1-10 customization, awaiting official exchange event
  breedingEggs?: number; // Eggs generated every 15m during 24h breeding gates, used to upgrade XL & XXL dragons
  ducks: Duck[];
  customizedVault?: Duck[]; // Dragons that reached ★10 customization & await official DMD token swap
  activeDuckIndex: number;
  unlockedSlots: number; // 3..8 open dragon slots
  treasury: TreasuryState;
  weekendEventIndex: number;
  grid: GridCell[];
  eggQueue: EggItemType[];
  godOrders: GodOrder[];
  godCards: GodCard[];
  dailyTasks: DailyTask[];
  claimedDailyLevelRewards: number[];
  claimedChallengeRewards: number[];
  claimedAchievements: string[];
  claimedSocials: string[];
  claimedHeartMilestones: number[];
  claimedTreasureSteps: number[];
  claimedHonorPacks: string[];
  usedPromoCodes: string[];
  flipCoins: FlipCoinPack[];
  unlockedSkins: DuckSkinId[];
  marketListings: MarketListing[];
  pack: PackState;
  wallet: WalletState;
  tournament: TournamentState;
  league: LeagueState;
  battlePass: BattlePassState;
  stats: GameStats;
  activeBuffs?: ActiveBuffs;
  muted: boolean;
  lastSavedAt: number;
}
