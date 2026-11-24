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
  endsAt?: number;
  isUserBid: boolean;
  rivalSniped?: boolean;
  soldStatus?: 'ACTIVE' | 'SOLD_OTHER' | 'SOLD_YOU';
  soldAt?: number;
}

export interface DragonAuctionRecord {
  id: string;
  sellerUid: string;
  sellerName: string;
  dragon: {
    id: string;
    name: string;
    skin: DuckSkinId;
    rarity: Rarity;
    level: number;
    customLevel?: number;
    sizeTier?: DragonSize;
    gear?: DuckGearId;
    aura?: DuckAuraId;
    skillLevel?: number;
    trainingLevel?: number;
    powerRating?: number;
  };
  rarity: Rarity;
  startCornPrice: number;
  currentCornPrice: number;
  buyNowStars: number;
  highestBidderUid: string;
  highestBidderName: string;
  bidCount: number;
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'CLAIMED';
  winnerUid: string;
  settlementType: 'NONE' | 'BID' | 'BUY_NOW' | 'EXPIRED';
  sellerClaimed: boolean;
  buyerClaimed: boolean;
  endsAtMs: number;
}

export interface ActiveEscrowBid {
  auctionId: string;
  amount: number;
  placedAt: number;
}

export interface PlayerLeaderboardEntry {
  uid: string;
  username: string;
  avatarUrl?: string;
  powerRating: number;
  leaguePoints: number;
  dmdTotal: number;
  dragonCount: number;
  activeDragonName: string;
  activeDragonSkin: string;
  activeDragonRarity: Rarity;
  activeDragonLevel: number;
}

export interface PackMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isSystemInvite?: boolean;
  actionSubTab?: 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'ROSTER';
  actionLabel?: string;
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

export interface AllianceGiftItem {
  id: string;
  sender: string;
  titleAr: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  corn: number;
  stars: number;
  allianceCoins: number;
  claimed: boolean;
}

export type AllianceLogType =
  | 'JOIN'
  | 'DONATE'
  | 'BOSS'
  | 'COOP'
  | 'HELP'
  | 'ROLE'
  | 'RESEARCH'
  | 'RALLY'
  | 'DIVIDEND'
  | 'DRAGON';

export interface AllianceLogEntry {
  id: string;
  type: AllianceLogType;
  actor: string;
  message: string;
  time: string;
  timestamp: number;
}

export type AllianceMemberRole = 'LEADER' | 'DEPUTY' | 'ELITE' | 'MEMBER';

export type AllianceTechId =
  | 'tech_rally_capacity'
  | 'tech_pyramid_siege'
  | 'tech_march_speed'
  | 'tech_treasury_tax'
  | 'tech_dragon_phalanx'
  | 'tech_dividend_vault';

export type AllianceMapTargetType = 'PYRAMID' | 'MONSTER' | 'EVENT';

export type AllianceEmblemId =
  | 'dragon_shield'
  | 'royal_crown'
  | 'phoenix_wing'
  | 'sun_pyramid'
  | 'storm_fang'
  | 'eternal_flame'
  | 'obsidian_sword'
  | 'emerald_throne';

export interface AllianceJoinConditions {
  minPower: number;
  minDragons: number;
  minDragonLevel: number;
  autoAccept: boolean;
}

export type SwarmDragonGearSlot = 'claws' | 'scales' | 'wings' | 'crown';
export type SwarmDragonUpgradeKey = 'breath' | 'armor' | 'swiftness' | 'fury';

export interface SwarmDragonDonationEntry {
  id: string;
  donorName: string;
  dragonName: string;
  skin: DuckSkinId;
  rarity: Rarity;
  level: number;
  customLevel: number;
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
  donatedAt: number;
}

export interface SwarmDragonState {
  unlocked: boolean;
  requiredDragons: number;
  donatedCount: number;
  name: string;
  skin: DuckSkinId;
  level: number;
  xp: number;
  inheritedPower: number;
  inheritedHp: number;
  inheritedAttack: number;
  inheritedDefense: number;
  inheritedSpeed: number;
  inheritedGearIds: DuckGearId[];
  inheritedAuraIds: DuckAuraId[];
  inheritedSkins: DuckSkinId[];
  upgrades: Record<SwarmDragonUpgradeKey, number>;
  gearLevels: Record<SwarmDragonGearSlot, number>;
  donations: SwarmDragonDonationEntry[];
}

export interface AllianceActiveResearch {
  techId: AllianceTechId;
  targetLevel: number;
  startedAt: number;
  endsAt: number;
  helpsReceived: number;
}

export interface AllianceRallyDragon {
  id: string;
  name: string;
  skin: DuckSkinId;
  rarity: Rarity;
  level: number;
  power: number;
}

export interface AllianceRallyParticipant {
  id: string;
  name: string;
  role: AllianceMemberRole;
  power: number;
  dragonsCount: number;
  dragons?: AllianceRallyDragon[];
  joinedAt: number;
}

export interface AllianceActiveRally {
  id: string;
  targetId: string;
  targetNameAr: string;
  targetType: AllianceMapTargetType;
  coords: { x: number; y: number };
  requiredPower: number;
  maxSlots: number;
  prepMinutes: number;
  startedAt: number;
  marchEndsAt: number;
  lootMultiplier: number;
  participants: AllianceRallyParticipant[];
  status: 'GATHERING' | 'READY' | 'RESOLVED';
  helpUsedCount: number;
}

export interface AllianceOccupiedSite {
  targetId: string;
  nameAr: string;
  coords: { x: number; y: number };
  occupiedAt: number;
  expiresAt: number;
  hourlyCornVault: number;
  hourlyTechPts: number;
  lastHarvestAt: number;
}

export interface AllianceLedger {
  techPointsPool: number;
  vaultGold: number;
  playerEnergyDonated: number;
  playerGoldDonated: number;
  playerTechDonated: number;
  playerRallyContrib: number;
  allianceTotalEnergyDonated: number;
  allianceTotalGoldDonated: number;
  ralliesWon: number;
  pyramidsCaptured: number;
  totalDividendsClaimed?: number;
}

export type AllianceNotificationCategory =
  | 'RALLY_STARTED'
  | 'RALLY_READY'
  | 'RESEARCH_DONE'
  | 'LEVEL_UP'
  | 'PYRAMID_CAPTURED'
  | 'DIVIDEND_READY';

export interface AllianceNotification {
  id: string;
  category: AllianceNotificationCategory;
  titleAr: string;
  bodyAr: string;
  createdAt: number;
  read: boolean;
  targetSubTab: 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'ROSTER';
  inviteText?: string;
}

export interface AllianceRewardPool {
  corn: number;
  allianceCoins: number;
  stars: number;
  duckGold: number;
  cycleNumber: number;
}

export interface PackState {
  joined: boolean;
  packName: string;
  motto?: string;
  emblemId?: AllianceEmblemId;
  power: number;
  members: number;
  treasuryCorn: number;
  messages: PackMessage[];
  talents?: SquadTalents;
  level?: number;
  xp?: number;
  allianceCoins?: number;
  contributionTotal?: number;
  activityPoints?: number;
  donationsToday?: number;
  helpsToday?: number;
  bossLevel?: number;
  bossHp?: number;
  bossMaxHp?: number;
  bossAttacksToday?: number;
  lastBreedHelpAt?: number;
  claimedActivityChests?: number[];
  claimedAllianceQuests?: string[];
  questBaselines?: {
    feeds: number;
    merges: number;
    errands: number;
  };
  gifts?: AllianceGiftItem[];
  logs?: AllianceLogEntry[];
  coopProgress?: Record<string, number>;
  claimedCoopGoals?: string[];
  memberRoles?: Record<string, AllianceMemberRole>;
  kickedMemberIds?: string[];
  joinConditions?: AllianceJoinConditions;
  convertedBlessingIds?: string[];
  swarmDragon?: SwarmDragonState;
  ledger?: AllianceLedger;
  techLevels?: Record<AllianceTechId, number>;
  techFunding?: Record<AllianceTechId, number>;
  activeResearch?: AllianceActiveResearch | null;
  activeRally?: AllianceActiveRally | null;
  occupiedSites?: AllianceOccupiedSite[];
  mapCooldowns?: Record<string, number>;
  notifications?: AllianceNotification[];
  rewardPool?: AllianceRewardPool;
  lastDividendAt?: number;
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
  resetAt?: number;
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
  activeEscrowBids?: ActiveEscrowBid[];
  pack: PackState;
  wallet: WalletState;
  tournament: TournamentState;
  league: LeagueState;
  battlePass: BattlePassState;
  stats: GameStats;
  activeBuffs?: ActiveBuffs;
  muted: boolean;
  hapticsEnabled?: boolean;
  dragonMotionEnabled?: boolean;
  lastSavedAt: number;
}
