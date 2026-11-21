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

export interface Duck {
  id: string;
  name: string;
  skin: DuckSkinId;
  rarity: Rarity;
  level: number;
  maxLevel: number;
  customLevel: number; // 0..10 (Star customization level; >= 1 at LVL 5 unlocks DMD generation!)
  dmd: number; // Lifetime DMD earned by this dragon
  dmdStored: number; // Accumulated unclaimed DMD in slot buffer (capped at maxCapHours)
  slotIndex: number | null; // Assigned slot 0..7 (null = reserve roster)
  feedCost: number;
  feedsProgress: number;
  feedsRequired: number;
  staked: boolean; // Active DMD generator state (auto-enabled once LVL 5 + customLevel >= 1)
  stakeRatePerHour: number;
  stakedItemId?: string;
  xl?: boolean;
  gear?: DuckGearId;
  aura?: DuckAuraId;
  skillLevel: number;
  trainingLevel?: number; // Continuous post-LVL5 Energy combat training rank (0+)
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

export interface GameState {
  username: string;
  corn: number; // Energy / Feeding Grains (الطاقة)
  stars: number; // Progression & Star Customization currency (النجوم)
  duckGold: number; // Dragon Relics / Gold (ذهب التنانين)
  dmdTotal: number; // Collected future DMD balance (read-only earned balance)
  ducks: Duck[];
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
