import React, { useEffect, useState, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  CheckSquare,
  Crown,
  Egg,
  Flame,
  Shield,
  Sparkles,
  Store,
  Swords,
  TrendingUp,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';
import {
  AllianceActiveRally,
  AllianceActiveResearch,
  AllianceEmblemId,
  AllianceJoinConditions,
  AllianceMemberRole,
  AllianceRallyDragon,
  AllianceTechId,
  AppScreen,
  DragonAuctionRecord,
  Duck,
  DuckAuraId,
  DuckGearId,
  DuckSkinId,
  EggItemType,
  GameState,
  GridCell,
  MainTab,
  PlayerLeaderboardEntry,
  Rarity,
  RewardBundle,
  SquadTalentKey,
  SwarmDragonGearSlot,
  SwarmDragonUpgradeKey,
} from './types/game';
import {
  ACHIEVEMENTS_REGISTRY,
  ACTIVE_SEASON,
  BATTLE_PASS_LEVELS,
  DAILY_PASS_REWARDS,
  DRAGON_SLOTS,
  DUCK_EVOLUTION_LEVELS,
  EGG_GRID_INITIAL_UNLOCKED,
  EGG_GRID_TOTAL_SLOTS,
  EGG_ITEM_META,
  HEART_MILESTONES_REGISTRY,
  HONOR_PACKS_REGISTRY,
  LIVE_EVENTS_REGISTRY,
  PROMO_CODES_REGISTRY,
  RARITY_ORDER,
  RARITY_STYLE,
  SKIN_CATALOG,
  SOCIAL_TASKS_REGISTRY,
  STORE_PACKAGES,
  TOURNAMENT_MILESTONES,
  TREASURE_RACE_STEPS,
  WEEKEND_EVENTS,
  WHEEL_REWARDS_REGISTRY,
  checkSlotUnlockEligibility,
  createInitialGameState,
  createInitialMarketListings,
  createRandomGodOrder,
  formatCompactNumber,
  getDragonVaultDmdPrice,
  getFeedCost,
  getLeagueMeta,
} from './data/gameData';
import { soundFX } from './utils/sound';
import {
  getTelegramUser,
  initTelegramWebApp,
  setTelegramHapticsEnabled,
  triggerTelegramHaptic,
  verifyTelegramSession,
} from './utils/telegram';
import {
  getVerifiedSessionToken,
  postVerifiedBattleResolve,
  postVerifiedDonate,
} from './utils/cryptoVault';
import {
  bidOnDragonAuction,
  buyNowDragonAuction,
  cancelDragonAuction,
  claimBuyerAuctionDragon,
  claimSellerAuctionProceeds,
  createDragonAuction,
  loadCloudGameState,
  saveCloudGameState,
  sendGlobalAllianceMessage,
  signInWithGoogle,
  signOutFirebase,
  subscribeAllianceMessages,
  subscribeAuth,
  subscribeDragonAuctions,
  subscribeLeaderboard,
  syncGlobalAllianceState,
  syncPlayerProfile,
} from './services/firebaseService';
import {
  ALLIANCE_ACTIVITY_CHESTS,
  ALLIANCE_BLESSING_RESEARCH_MISSIONS,
  ALLIANCE_COOP_MISSIONS_CATALOG,
  ALLIANCE_DAILY_LIMITS,
  ALLIANCE_DONATION_TIERS,
  ALLIANCE_EMBLEM_CATALOG,
  ALLIANCE_MAP_TARGETS,
  ALLIANCE_QUESTS_CATALOG,
  ALLIANCE_RALLY_PREP_OPTIONS,
  ALLIANCE_RALLY_REINFORCEMENT_POOL,
  ALLIANCE_RESEARCH_CATALOG,
  ALLIANCE_ROLE_META,
  ALLIANCE_ROSTER_MEMBERS,
  ALLIANCE_SHOP_CATALOG,
  AllianceCoopMissionMeta,
  AllianceDonationKind,
  AllianceQuestMeta,
  AllianceShopOffer,
  ECONOMY_LIMITS,
  RELIC_FORGE_CATALOG,
  RelicForgeOffer,
  SQUAD_TALENT_CATALOG,
  SWARM_DRAGON_GEAR_CATALOG,
  SWARM_DRAGON_UPGRADE_CATALOG,
  appendAllianceLog,
  appendAllianceNotification,
  applySoftCapDamping,
  calculateAllianceDividendBreakdown,
  calculateAuctionListingFee,
  calculateAuctionNetProceeds,
  calculateCustomUpgradeCost,
  clampCustomLevel,
  computeSwarmDragonTotalStats,
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
  extractDragonTransferStats,
  getAllianceLevelInfo,
  getAllianceTechRequirements,
  getAuctionPriceBand,
  getBarterEnergyForGoldCost,
  getBarterEnergyForStarsCost,
  getBarterStarsToEnergyPayout,
  getCumulativeDmdAtCustomLevel,
  getDragonTrainingCost,
  getEggSellReward,
  getEnergyHardCap,
  getEnergySoftCap,
  getInstantSummonStarCost,
  getLevelRequiredFeeds,
  getLocalDateKey,
  getMarketListingScaledCornFloor,
  getPlayerTier,
  getSkillUpgradeCost,
  getSquadTalentCost,
  getSwarmDragonGearUpgradeCost,
  getSwarmDragonLevelUpCost,
  getSwarmDragonUpgradeCost,
  getTraderDealStarCost,
  getXlEggUpgradeCost,
  grantRewardBundle,
  normalizeDragonSlots,
  resolveDragonSize,
  resolveEventModifiers,
  syncDailyEconomyState,
} from './utils/economyEngine';
import { TitleScreen } from './components/TitleScreen';
import { CornIcon, StarIcon } from './components/art/DuckArt';
import { DucksTab } from './components/tabs/DucksTab';
import { EggsTab } from './components/tabs/EggsTab';
import { ArenaTab } from './components/tabs/ArenaTab';
import { GodsTab } from './components/tabs/GodsTab';
import { TasksTab } from './components/tabs/TasksTab';
import { MarketTab } from './components/tabs/MarketTab';
import { ActiveModal, GameModals } from './components/modals/GameModals';

const STORAGE_KEY = 'dragon_dmd_save_v1';
const AUCTION_RIVALS = ['DRAGON_KING', 'ZLOYPHILIPP', 'NUBUBIICA', 'SOLAFEIFEI', 'IGNIS_LORD'];

function withEarnedEnergy(
  prev: GameState,
  rawGain: number,
  bypassSoftCap = false
): { corn: number; finalGain: number; damped: boolean; treasury: GameState['treasury'] } {
  if (rawGain <= 0) {
    return { corn: prev.corn, finalGain: 0, damped: false, treasury: prev.treasury };
  }
  const tier = getPlayerTier(prev);
  const softCap = getEnergySoftCap(tier);
  const hardCap = getEnergyHardCap(tier);
  const res = bypassSoftCap
    ? { finalGain: Math.round(rawGain), damped: false, multiplier: 1 }
    : applySoftCapDamping(rawGain, prev.corn, softCap, prev.treasury.energyEarnedToday ?? 0);
  const cappedGain = bypassSoftCap
    ? res.finalGain
    : Math.max(0, Math.min(res.finalGain, Math.max(0, hardCap - prev.corn)));
  return {
    corn: prev.corn + cappedGain,
    finalGain: cappedGain,
    damped: res.damped || cappedGain < res.finalGain,
    treasury: {
      ...prev.treasury,
      energyEarnedToday: (prev.treasury.energyEarnedToday ?? 0) + (bypassSoftCap ? 0 : cappedGain),
    },
  };
}

function withBurnedEnergy(treasury: GameState['treasury'], cost: number): GameState['treasury'] {
  if (cost <= 0) return treasury;
  return {
    ...treasury,
    energyBurnedToday: (treasury.energyBurnedToday ?? 0) + cost,
  };
}

function withEarnedStars(treasury: GameState['treasury'], amount: number): GameState['treasury'] {
  if (amount <= 0) return treasury;
  return {
    ...treasury,
    starsEarnedToday: (treasury.starsEarnedToday ?? 0) + amount,
  };
}

function withBurnedStars(treasury: GameState['treasury'], amount: number): GameState['treasury'] {
  if (amount <= 0) return treasury;
  return {
    ...treasury,
    starsBurnedToday: (treasury.starsBurnedToday ?? 0) + amount,
  };
}

function applyAllianceXpAndLevelNotification(
  pack: GameState['pack'],
  addedXp: number
): GameState['pack'] {
  const prevXp = pack.xp ?? 2250;
  const prevInfo = getAllianceLevelInfo(prevXp);
  const nextXp = prevXp + Math.max(0, Math.round(addedXp));
  const nextInfo = getAllianceLevelInfo(nextXp);
  let nextPack: GameState['pack'] = {
    ...pack,
    xp: nextXp,
    level: nextInfo.level,
  };
  if (nextInfo.level > prevInfo.level) {
    nextPack = {
      ...nextPack,
      notifications: appendAllianceNotification(nextPack.notifications, {
        category: 'LEVEL_UP',
        titleAr: `ارتقى السرب إلى المستوى Lv.${nextInfo.level}!`,
        bodyAr: `سعة الأعضاء ${nextInfo.maxMembers} · علاوة الغنائم +${nextInfo.levelLootBonusPct}% · سعة الخزينة ${nextInfo.vaultCapacity.toLocaleString()}⚡.`,
        targetSubTab: 'HQ',
        inviteText: `🎉 مبروك لأبطال السرب! ارتقينا للمستوى Lv.${nextInfo.level} (+${nextInfo.levelLootBonusPct}% غنائم و +${nextInfo.powerBonusPct}% قوة جماعية)!`,
      }),
      logs: appendAllianceLog(nextPack.logs, {
        type: 'COOP',
        actor: 'إدارة السرب',
        message: `ارتقى تحالف ${nextPack.packName} رسمياً إلى المستوى Lv.${nextInfo.level}!`,
      }),
    };
  }
  return nextPack;
}

function createFallbackStarterDragon(playerTier = 1): Duck {
  return {
    id: `duck_starter_${Date.now()}`,
    name: 'تنين البداية المائي',
    skin: 'aqua',
    rarity: 'COMMON',
    level: 1,
    maxLevel: 5,
    customLevel: 0,
    dmd: 0,
    dmdStored: 0,
    slotIndex: 0,
    feedCost: getFeedCost(1, 'COMMON', playerTier, 0),
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
    skillLevel: 1,
    trainingLevel: 0,
    powerRating: 130,
    unlockedAt: Date.now(),
  };
}

function fillGridFromQueue(
  grid: GridCell[],
  eggQueue: EggItemType[]
): { grid: GridCell[]; eggQueue: EggItemType[]; placedCount: number } {
  if (eggQueue.length === 0) return { grid, eggQueue, placedCount: 0 };
  const emptyIndices = grid.filter((c) => !c.locked && c.item === null).map((c) => c.index);
  const count = Math.min(emptyIndices.length, eggQueue.length);
  if (count === 0) return { grid, eggQueue, placedCount: 0 };
  const placedMap = new Map<number, EggItemType>();
  for (let i = 0; i < count; i++) {
    placedMap.set(emptyIndices[i], eggQueue[i]);
  }
  return {
    grid: grid.map((c) =>
      placedMap.has(c.index) ? { ...c, item: placedMap.get(c.index) ?? null, justMerged: true } : c
    ),
    eggQueue: eggQueue.slice(count),
    placedCount: count,
  };
}

function migrateGridTo30Slots(
  savedGrid: GridCell[],
  savedQueue: EggItemType[]
): { grid: GridCell[]; eggQueue: EggItemType[] } {
  if (savedGrid.length === EGG_GRID_TOTAL_SLOTS) {
    return fillGridFromQueue(savedGrid, savedQueue);
  }
  const existingItems = savedGrid
    .map((c) => c.item)
    .filter((item): item is EggItemType => Boolean(item));
  const openCount = Math.min(
    EGG_GRID_TOTAL_SLOTS,
    Math.max(EGG_GRID_INITIAL_UNLOCKED, Math.min(existingItems.length, 16))
  );
  const nextGrid: GridCell[] = Array.from({ length: EGG_GRID_TOTAL_SLOTS }, (_, index) => ({
    index,
    locked: index >= openCount,
    item: index < openCount ? existingItems[index] ?? null : null,
  }));
  const overflow = existingItems.slice(openCount);
  const combinedQueue = [...overflow, ...savedQueue];
  const filled = fillGridFromQueue(nextGrid, combinedQueue);
  return { grid: filled.grid, eggQueue: filled.eggQueue };
}

function loadSavedState(): { state: GameState; hasSave: boolean; offlineDmdEarned: number } {
  const defaults = createInitialGameState();
  const tgUser = getTelegramUser();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameState>;
      if (parsed && Array.isArray(parsed.ducks) && Array.isArray(parsed.grid)) {
        const unlockedSlots = parsed.unlockedSlots ?? 3;
        const schemaVer = parsed.schemaVersion ?? 1;
        const nowTs = Date.now();
        const tier = getPlayerTier({
          ducks: parsed.ducks,
          unlockedSlots,
        });
        let legacyDmdFolded = 0;
        let offlineBreedingEggs = 0;

        const migratedDragons: Duck[] = parsed.ducks.map((d) => {
          const rawCustom = d.customLevel ?? 0;
          const migratedCustom =
            schemaVer < 3 && rawCustom > ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL
              ? Math.min(9, Math.floor(rawCustom / 10))
              : clampCustomLevel(rawCustom);

          let level = Math.max(1, Math.min(5, d.level ?? 1));
          let feedsRequired = getLevelRequiredFeeds(level);
          let feedsProgress =
            schemaVer < 3 && (d.feedsRequired ?? 0) > 0 && (d.feedsRequired ?? 0) !== feedsRequired
              ? Math.min(feedsRequired, Math.round(((d.feedsProgress ?? 0) / d.feedsRequired) * feedsRequired))
              : Math.min(feedsRequired, d.feedsProgress ?? 0);

          let feedClicksSinceReset = d.feedClicksSinceReset ?? 0;
          let costResetEndsAt = d.costResetEndsAt ?? null;
          if (costResetEndsAt && nowTs >= costResetEndsAt) {
            costResetEndsAt = null;
            feedClicksSinceReset = 0;
          }

          let breedingEndsAt = d.breedingEndsAt ?? null;
          let breedingNextLevel = d.breedingNextLevel ?? null;
          let lastBreedingEggAt = d.lastBreedingEggAt ?? null;
          let powerRating = d.powerRating ?? RARITY_STYLE[d.rarity].basePower + level * 20;

          if (breedingEndsAt) {
            const anchor = lastBreedingEggAt ?? breedingEndsAt - ECONOMY_LIMITS.BREEDING_DURATION_MS;
            const effectiveEnd = Math.min(nowTs, breedingEndsAt);
            const eggsEarned = Math.max(
              0,
              Math.floor((effectiveEnd - anchor) / ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS)
            );
            offlineBreedingEggs += eggsEarned;
            lastBreedingEggAt = anchor + eggsEarned * ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS;

            if (nowTs >= breedingEndsAt) {
              const nextLv = Math.min(5, breedingNextLevel ?? level + 1);
              powerRating += 30 + nextLv * 15;
              level = nextLv;
              feedsRequired = getLevelRequiredFeeds(nextLv);
              feedsProgress = 0;
              feedClicksSinceReset = 0;
              costResetEndsAt = null;
              breedingEndsAt = null;
              breedingNextLevel = null;
              lastBreedingEggAt = null;
            }
          }

          const sizeTier = resolveDragonSize(d);
          legacyDmdFolded += d.dmdStored ?? 0;

          return {
            ...d,
            level,
            maxLevel: 5,
            customLevel: migratedCustom,
            dmdStored: 0,
            staked: false,
            stakeRatePerHour: 0,
            sizeTier,
            xl: sizeTier !== 'NORMAL',
            feedsProgress,
            feedsRequired,
            feedClicksSinceReset,
            costResetEndsAt,
            levelFeedsCompleted: feedsProgress >= feedsRequired,
            breedingEndsAt,
            breedingNextLevel,
            lastBreedingEggAt,
            feedCost: getFeedCost(level, d.rarity ?? 'COMMON', tier, feedClicksSinceReset, {
              sizeTier,
              xl: sizeTier !== 'NORMAL',
            }),
            skillLevel: d.skillLevel ?? 1,
            trainingLevel: d.trainingLevel ?? 0,
            powerRating,
          };
        });

        const safeDragons =
          migratedDragons.length > 0 ? migratedDragons : [createFallbackStarterDragon(tier)];
        const normalizedDragons = normalizeDragonSlots(safeDragons, unlockedSlots);
        const syncedGodCards = (parsed.godCards ?? defaults.godCards).map((g) =>
          g.godKey === 'harvest'
            ? {
                ...g,
                subtitle: 'توفير 20% طاقة إطعام',
                bonusDesc: 'يخفض تكلفة الإطعام بنسبة 20% مع ضمان حرق صافي لا يقل عن 80% في كل نقرة.',
              }
            : g
        );
        const resolvedUsername =
          parsed.username && parsed.username !== 'DRAGON_TAMER'
            ? parsed.username
            : tgUser?.displayName || defaults.username;

        const migratedBoard = migrateGridTo30Slots(parsed.grid, parsed.eggQueue ?? []);

        return {
          state: syncDailyEconomyState({
            ...defaults,
            ...parsed,
            schemaVersion: 3,
            username: resolvedUsername,
            hapticsEnabled: parsed.hapticsEnabled ?? true,
            dragonMotionEnabled: parsed.dragonMotionEnabled ?? true,
            dmdTotal: (parsed.dmdTotal ?? 0) + legacyDmdFolded,
            breedingEggs: (parsed.breedingEggs ?? 0) + offlineBreedingEggs,
            customizedVault: parsed.customizedVault ?? [],
            ducks: normalizedDragons,
            godCards: syncedGodCards,
            unlockedSlots,
            grid: migratedBoard.grid,
            eggQueue: migratedBoard.eggQueue,
            activeDuckIndex: Math.min(
              parsed.activeDuckIndex ?? 0,
              Math.max(0, normalizedDragons.length - 1)
            ),
            treasury: {
              ...defaults.treasury,
              ...(parsed.treasury ?? {}),
              maxAdsPerDay: ECONOMY_LIMITS.MAX_DAILY_ADS,
              energyEarnedToday: parsed.treasury?.energyEarnedToday ?? 0,
              energyBurnedToday: parsed.treasury?.energyBurnedToday ?? 0,
              starsEarnedToday: parsed.treasury?.starsEarnedToday ?? 0,
              starsBurnedToday: parsed.treasury?.starsBurnedToday ?? 0,
              invitesClaimedToday: parsed.treasury?.invitesClaimedToday ?? 0,
            },
            pack: {
              ...defaults.pack,
              ...(parsed.pack ?? {}),
              emblemId: parsed.pack?.emblemId ?? 'dragon_shield',
              talents: {
                ...(defaults.pack.talents ?? { fury: 0, carapace: 0, incubation: 0, prestige: 0 }),
                ...(parsed.pack?.talents ?? {}),
              },
              questBaselines: parsed.pack?.questBaselines ?? {
                feeds: parsed.stats?.totalFeeds ?? 0,
                merges: parsed.stats?.totalMerges ?? 0,
                errands: parsed.stats?.totalErrands ?? 0,
              },
              gifts:
                parsed.pack?.gifts && parsed.pack.gifts.length > 0
                  ? parsed.pack.gifts
                  : defaults.pack.gifts,
              logs:
                parsed.pack?.logs && parsed.pack.logs.length > 0
                  ? parsed.pack.logs
                  : createInitialAllianceLogs(),
              coopProgress: {
                ...createInitialCoopProgress(),
                ...(parsed.pack?.coopProgress ?? {}),
              },
              claimedCoopGoals: parsed.pack?.claimedCoopGoals ?? [],
              memberRoles: {
                ...createInitialMemberRoles(),
                ...(parsed.pack?.memberRoles ?? {}),
              },
              kickedMemberIds: Array.isArray(parsed.pack?.kickedMemberIds)
                ? parsed.pack.kickedMemberIds
                : [],
              joinConditions: {
                ...createInitialJoinConditions(),
                ...(parsed.pack?.joinConditions ?? {}),
              },
              convertedBlessingIds: Array.isArray(parsed.pack?.convertedBlessingIds)
                ? parsed.pack.convertedBlessingIds
                : [],
              swarmDragon: parsed.pack?.swarmDragon
                ? {
                    ...createInitialSwarmDragonState(),
                    ...parsed.pack.swarmDragon,
                    upgrades: {
                      ...createInitialSwarmDragonState().upgrades,
                      ...(parsed.pack.swarmDragon.upgrades ?? {}),
                    },
                    gearLevels: {
                      ...createInitialSwarmDragonState().gearLevels,
                      ...(parsed.pack.swarmDragon.gearLevels ?? {}),
                    },
                  }
                : createInitialSwarmDragonState(),
              ledger: {
                ...createInitialAllianceLedger(),
                ...(parsed.pack?.ledger ?? {}),
              },
              techLevels: {
                ...createInitialTechLevels(),
                ...(parsed.pack?.techLevels ?? {}),
              },
              techFunding: {
                ...createInitialTechFunding(),
                ...(parsed.pack?.techFunding ?? {}),
              },
              activeResearch: parsed.pack?.activeResearch ?? null,
              activeRally: parsed.pack?.activeRally ?? null,
              occupiedSites: Array.isArray(parsed.pack?.occupiedSites)
                ? parsed.pack.occupiedSites
                : [],
              mapCooldowns: parsed.pack?.mapCooldowns ?? {},
              notifications:
                Array.isArray(parsed.pack?.notifications) && parsed.pack.notifications.length > 0
                  ? parsed.pack.notifications
                  : createInitialAllianceNotifications(),
              rewardPool: {
                ...createInitialRewardPool(),
                ...(parsed.pack?.rewardPool ?? {}),
              },
              lastDividendAt: parsed.pack?.lastDividendAt ?? 0,
            },
            activeBuffs: {
              ...(defaults.activeBuffs ?? { duelFuryUntil: 0, critEdgeUntil: 0, eggSurgeUntil: 0 }),
              ...(parsed.activeBuffs ?? {}),
            },
            league: { ...defaults.league, ...(parsed.league ?? {}) },
            battlePass: { ...defaults.battlePass, ...(parsed.battlePass ?? {}) },
            stats: { ...defaults.stats, ...(parsed.stats ?? {}) },
          }),
          hasSave: true,
          offlineDmdEarned: legacyDmdFolded,
        };
      }
    }
  } catch {
    // ignore corrupted save
  }
  const initialFilled = fillGridFromQueue(defaults.grid, defaults.eggQueue);
  return {
    state: {
      ...defaults,
      grid: initialFilled.grid,
      eggQueue: initialFilled.eggQueue,
      schemaVersion: 3,
      username: tgUser?.displayName || defaults.username,
    },
    hasSave: false,
    offlineDmdEarned: 0,
  };
}

export default function App() {
  const [initialLoaded] = useState(() => loadSavedState());
  const [screen, setScreen] = useState<AppScreen>('TITLE');
  const [activeTab, setActiveTab] = useState<MainTab>('DUCKS');
  const [godsInitialSubTab, setGodsInitialSubTab] = useState<'TREASURES' | 'TASKS' | 'GODS' | 'SHOP'>('GODS');
  const [packInitialSubTab, setPackInitialSubTab] = useState<'CHAT' | 'TALENTS' | 'FORGE'>('CHAT');
  const [modal, setModal] = useState<ActiveModal>(null);
  const [state, setState] = useState<GameState>(initialLoaded.state);
  const [hasSave, setHasSave] = useState<boolean>(initialLoaded.hasSave);
  const [offlineNoticeShown, setOfflineNoticeShown] = useState(false);
  const [timedBonusReadyAt, setTimedBonusReadyAt] = useState<number>(0);
  const [blitzEndsAt, setBlitzEndsAt] = useState<number>(0);
  const [cooldownNowMs, setCooldownNowMs] = useState<number>(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);

  // Telegram + Firebase Cloud State
  const [tgVerified, setTgVerified] = useState<boolean>(false);
  const [tgUserInfo, setTgUserInfo] = useState<{ id?: number; username?: string } | null>(() => {
    const u = getTelegramUser();
    return u ? { id: u.id, username: u.username } : null;
  });
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<PlayerLeaderboardEntry[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<DragonAuctionRecord[]>([]);

  const latestStateRef = useRef<GameState>(state);
  latestStateRef.current = state;
  const hasSaveRef = useRef<boolean>(hasSave);
  hasSaveRef.current = hasSave;
  const tgMetaRef = useRef<{ id?: number; username?: string; verified: boolean }>({
    id: tgUserInfo?.id,
    username: tgUserInfo?.username,
    verified: tgVerified,
  });
  tgMetaRef.current = {
    id: tgUserInfo?.id,
    username: tgUserInfo?.username,
    verified: tgVerified,
  };
  const dirtySaveRef = useRef<boolean>(false);
  const cloudDirtyRef = useRef<boolean>(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudLoadedUidRef = useRef<string | null>(null);

  // Conditional 1s ticker ONLY while short timedBonus or blitz countdown is active
  useEffect(() => {
    const now = Date.now();
    if (timedBonusReadyAt <= now && blitzEndsAt <= now) return;
    setCooldownNowMs(now);
    const id = setInterval(() => {
      const t = Date.now();
      setCooldownNowMs(t);
      if (t >= timedBonusReadyAt && t >= blitzEndsAt) {
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timedBonusReadyAt, blitzEndsAt]);

  const timedBonusReadyIn =
    timedBonusReadyAt > cooldownNowMs ? Math.ceil((timedBonusReadyAt - cooldownNowMs) / 1000) : 0;
  const blitzSecLeft =
    blitzEndsAt > cooldownNowMs ? Math.ceil((blitzEndsAt - cooldownNowMs) / 1000) : 0;

  // Auto-drop queued eggs whenever unlocked slots are free on the 30-slot grid
  useEffect(() => {
    if (state.eggQueue.length === 0) return;
    const hasFreeSlot = state.grid.some((c) => !c.locked && c.item === null);
    if (!hasFreeSlot) return;
    setState((prev) => {
      const filled = fillGridFromQueue(prev.grid, prev.eggQueue);
      if (filled.placedCount === 0) return prev;
      return {
        ...prev,
        grid: filled.grid,
        eggQueue: filled.eggQueue,
      };
    });
  }, [state.eggQueue, state.grid]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const flushSaveNow = useCallback((stateToSave?: GameState) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      const src = stateToSave ?? latestStateRef.current;
      const compacted: GameState = {
        ...src,
        pack: {
          ...src.pack,
          logs: (src.pack.logs ?? []).slice(0, 45),
          messages: (src.pack.messages ?? []).slice(-35),
          notifications: (src.pack.notifications ?? []).slice(0, 20),
          swarmDragon: src.pack.swarmDragon
            ? {
                ...src.pack.swarmDragon,
                donations: (src.pack.swarmDragon.donations ?? []).slice(0, 35),
              }
            : undefined,
        },
        lastSavedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted));
      dirtySaveRef.current = false;
      setHasSave(true);
    } catch {
      // ignore storage quota
    }
  }, []);

  useEffect(() => {
    const cleanup = initTelegramWebApp();
    verifyTelegramSession().then((res) => {
      if (res.verified && res.user) {
        setTgVerified(true);
        setTgUserInfo({ id: res.user.id, username: res.user.username });
        const displayName =
          res.user.username ||
          [res.user.first_name, res.user.last_name].filter(Boolean).join('_').slice(0, 18);
        if (displayName) {
          setState((prev) =>
            prev.username === 'DRAGON_TAMER' ? { ...prev, username: displayName } : prev
          );
        }
      }
    });
    return cleanup;
  }, []);

  // Subscribe Firebase Auth & load Cloud Save once upon verified sign-in
  useEffect(() => {
    const unsub = subscribeAuth(async (user) => {
      setFirebaseUser(user);
      if (user && user.emailVerified && cloudLoadedUidRef.current !== user.uid) {
        cloudLoadedUidRef.current = user.uid;
        try {
          const cloudMap = await loadCloudGameState(user.uid);
          if (cloudMap && Array.isArray(cloudMap.ducks) && Array.isArray(cloudMap.grid)) {
            setState((local) => {
              const cloudTime = Number(cloudMap.lastSavedAt ?? 0);
              const localDmd = local.dmdTotal ?? 0;
              const cloudDmd = Number(cloudMap.dmdTotal ?? 0);
              const shouldAdoptCloud =
                !hasSaveRef.current ||
                (cloudTime > (local.lastSavedAt ?? 0) &&
                  (cloudDmd >= localDmd || cloudMap.ducks!.length > local.ducks.length));
              if (!shouldAdoptCloud) return local;
              const mergedDucks = normalizeDragonSlots(
                cloudMap.ducks as Duck[],
                cloudMap.unlockedSlots ?? local.unlockedSlots
              );
              return syncDailyEconomyState({
                ...local,
                ...(cloudMap as Partial<GameState>),
                ducks: mergedDucks,
                schemaVersion: 4,
              });
            });
            showToast('تمت مزامنة تقدمك من السحابة بنجاح ☁️');
          }
          await syncPlayerProfile(user.uid, latestStateRef.current, tgMetaRef.current);
        } catch {
          // Non-fatal offline fallback
        }
      } else if (!user) {
        cloudLoadedUidRef.current = null;
      }
    });
    return unsub;
  }, [showToast]);

  // Subscribe real-time Leaderboard & Global Dragon Auctions & Escrow Refund Watcher
  useEffect(() => {
    const unsubLb = subscribeLeaderboard(
      (rows) => setLeaderboardPlayers(rows),
      () => {}
    );
    const unsubAuc = subscribeDragonAuctions(
      (list) => {
        setLiveAuctions(list);
        const uid = firebaseUser?.uid;
        if (!uid) return;
        const escrow = latestStateRef.current.activeEscrowBids ?? [];
        if (escrow.length === 0) return;

        let refundTotal = 0;
        const remainingEscrow = escrow.filter((eb) => {
          const match = list.find((a) => a.id === eb.auctionId);
          if (!match) return true;
          const outbidOrCancelled =
            (match.highestBidderUid && match.highestBidderUid !== uid) ||
            match.status === 'CANCELLED' ||
            (match.status === 'SOLD' && match.winnerUid !== uid);
          if (outbidOrCancelled) {
            refundTotal += eb.amount;
            return false;
          }
          return true;
        });

        if (refundTotal > 0) {
          setState((prev) => {
            const grant = withEarnedEnergy(prev, refundTotal, true);
            return {
              ...prev,
              corn: grant.corn,
              activeEscrowBids: remainingEscrow,
            };
          });
          showToast(`تمت إعادة ${refundTotal.toLocaleString()}⚡ لمحفظتك بعد تخطي عرضك في المزاد!`);
        }
      },
      () => {}
    );
    return () => {
      unsubLb();
      unsubAuc();
    };
  }, [firebaseUser?.uid, showToast]);

  // Subscribe Global Swarm Chat when joined & authenticated
  useEffect(() => {
    if (!state.pack.joined || !firebaseUser?.emailVerified) return;
    const unsubChat = subscribeAllianceMessages(
      'global_swarm_alpha',
      (cloudMsgs) => {
        if (cloudMsgs.length === 0) return;
        setState((prev) => {
          const existingIds = new Set(prev.pack.messages.map((m) => m.id));
          const fresh = cloudMsgs.filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          return {
            ...prev,
            pack: {
              ...prev.pack,
              messages: [...prev.pack.messages, ...fresh].slice(-35),
            },
          };
        });
      },
      () => {}
    );
    return unsubChat;
  }, [state.pack.joined, firebaseUser?.emailVerified]);

  // Periodic background cloud sync (every 18s when dirty & verified)
  useEffect(() => {
    if (!firebaseUser?.emailVerified) return;
    const id = setInterval(async () => {
      if (!cloudDirtyRef.current || document.visibilityState === 'hidden') return;
      cloudDirtyRef.current = false;
      try {
        const cur = latestStateRef.current;
        await Promise.all([
          saveCloudGameState(firebaseUser.uid, cur, tgUserInfo?.id),
          syncPlayerProfile(firebaseUser.uid, cur, {
            id: tgUserInfo?.id,
            verified: tgVerified,
          }),
          cur.pack.joined
            ? syncGlobalAllianceState('global_swarm_alpha', firebaseUser.uid, cur)
            : Promise.resolve(),
        ]);
      } catch {
        cloudDirtyRef.current = true;
      }
    }, 18000);
    return () => clearInterval(id);
  }, [firebaseUser, tgUserInfo?.id, tgVerified]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    soundFX.muted = state.muted;
  }, [state.muted]);

  useEffect(() => {
    setTelegramHapticsEnabled(state.hapticsEnabled ?? true);
  }, [state.hapticsEnabled]);

  useEffect(() => {
    dirtySaveRef.current = true;
    cloudDirtyRef.current = true;
    if (!saveTimerRef.current) {
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        if (dirtySaveRef.current) {
          flushSaveNow();
        }
      }, 4500);
    }
  }, [state, flushSaveNow]);

  useEffect(() => {
    const handleVisibilityOrUnload = () => {
      if (document.visibilityState === 'hidden' || dirtySaveRef.current) {
        flushSaveNow();
      }
    };
    window.addEventListener('pagehide', handleVisibilityOrUnload);
    window.addEventListener('beforeunload', handleVisibilityOrUnload);
    document.addEventListener('visibilitychange', handleVisibilityOrUnload);
    return () => {
      window.removeEventListener('pagehide', handleVisibilityOrUnload);
      window.removeEventListener('beforeunload', handleVisibilityOrUnload);
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (dirtySaveRef.current) flushSaveNow();
    };
  }, [flushSaveNow]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'PLAYING') return;
      if (e.key === 'Escape') {
        setModal((prev) => (prev ? null : 'PAUSE'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen]);

  // 5-second deadline watcher (zero re-renders when nothing matured, eliminating per-second freeze/lag)
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const nowTs = Date.now();

      setState((prevRaw) => {
        const dateChanged = prevRaw.treasury.dailyDateKey !== getLocalDateKey(new Date(nowTs));
        const anyDragonEvent = prevRaw.ducks.some((d) => {
          if (d.costResetEndsAt && nowTs >= d.costResetEndsAt) return true;
          if (!d.breedingEndsAt) return false;
          if (nowTs >= d.breedingEndsAt) return true;
          const anchor = d.lastBreedingEggAt ?? d.breedingEndsAt - ECONOMY_LIMITS.BREEDING_DURATION_MS;
          return Math.floor((Math.min(nowTs, d.breedingEndsAt) - anchor) / ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS) > 0;
        });

        const anyListingEvent = prevRaw.marketListings.some((item) => {
          const endMs = item.endsAt ?? nowTs + item.timeLeftSec * 1000;
          if (item.soldStatus !== 'ACTIVE') return !item.soldAt || nowTs - item.soldAt > 6000;
          if (nowTs >= endMs) return true;
          if (item.isUserBid && endMs - nowTs <= 5500) return true;
          return false;
        });

        const marketRarities: Rarity[] = ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
        const missingRarity = marketRarities.some(
          (rar) => !prevRaw.marketListings.some((l) => l.rarity === rar && l.soldStatus === 'ACTIVE')
        );

        const tournResetAt = prevRaw.tournament.resetAt ?? nowTs + prevRaw.tournament.resetSeconds * 1000;
        const tournamentEnding = nowTs >= tournResetAt;
        const researchDone = Boolean(prevRaw.pack.activeResearch && nowTs >= prevRaw.pack.activeResearch.endsAt);
        const rallyReady = Boolean(
          prevRaw.pack.activeRally &&
            prevRaw.pack.activeRally.status === 'GATHERING' &&
            nowTs >= prevRaw.pack.activeRally.marchEndsAt
        );
        const expiredSites = (prevRaw.pack.occupiedSites ?? []).some((s) => nowTs >= s.expiresAt);

        if (
          !dateChanged &&
          !anyDragonEvent &&
          !anyListingEvent &&
          !missingRarity &&
          !tournamentEnding &&
          !researchDone &&
          !rallyReady &&
          !expiredSites
        ) {
          return prevRaw;
        }

        const prev = dateChanged ? syncDailyEconomyState(prevRaw) : prevRaw;
        const playerTier = getPlayerTier(prev);
        let eggsGainedThisTick = 0;

        let updatedDucks = anyDragonEvent
          ? prev.ducks.map((d) => {
              let changed = false;
              let next = d;

              if (d.costResetEndsAt && nowTs >= d.costResetEndsAt) {
                changed = true;
                next = {
                  ...next,
                  costResetEndsAt: null,
                  feedClicksSinceReset: 0,
                  feedCost: getFeedCost(d.level, d.rarity, playerTier, 0, d),
                };
              }

              if (d.breedingEndsAt) {
                const anchor =
                  d.lastBreedingEggAt ?? d.breedingEndsAt - ECONOMY_LIMITS.BREEDING_DURATION_MS;
                const effectiveEnd = Math.min(nowTs, d.breedingEndsAt);
                const newEggs = Math.max(
                  0,
                  Math.floor((effectiveEnd - anchor) / ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS)
                );
                if (newEggs > 0) {
                  eggsGainedThisTick += newEggs;
                  changed = true;
                  next = {
                    ...next,
                    lastBreedingEggAt: anchor + newEggs * ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS,
                  };
                }

                if (nowTs >= d.breedingEndsAt) {
                  const nextLv = Math.min(d.maxLevel, d.breedingNextLevel ?? d.level + 1);
                  changed = true;
                  next = {
                    ...next,
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
                    feedCost: getFeedCost(nextLv, d.rarity, playerTier, 0, d),
                  };
                }
              }

              return changed ? next : d;
            })
          : prev.ducks;

        let snipeOccurred = false;
        let wonAuction = false;

        const updatedListings = prev.marketListings
          .filter((item) => item.soldStatus === 'ACTIVE' || !item.soldAt || nowTs - item.soldAt <= 6000)
          .map((item) => {
            if (item.soldStatus !== 'ACTIVE') {
              return item.soldAt ? item : { ...item, soldAt: nowTs };
            }
            const endMs = item.endsAt ?? nowTs + item.timeLeftSec * 1000;

            if (item.isUserBid && endMs - nowTs <= 5500 && endMs > nowTs && Math.random() < 0.45) {
              const rivalName = AUCTION_RIVALS[Math.floor(Math.random() * AUCTION_RIVALS.length)];
              snipeOccurred = true;
              const nextEnd = endMs + 8000;
              return {
                ...item,
                cornPrice: Math.round(item.cornPrice * 1.1),
                isUserBid: false,
                rivalSniped: true,
                lastBidder: rivalName,
                endsAt: nextEnd,
                timeLeftSec: Math.ceil((nextEnd - nowTs) / 1000),
              };
            }

            if (nowTs < endMs) {
              return item.endsAt ? item : { ...item, endsAt: endMs };
            }

            if (item.isUserBid) {
              const sz = item.xl ? 'XL' : 'NORMAL';
              const reqFeeds = getLevelRequiredFeeds(item.level);
              const wonDragon: Duck = {
                id: `dragon_won_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                name: item.duckName,
                skin: item.skin,
                rarity: item.rarity,
                level: item.level,
                maxLevel: 5,
                customLevel: 0,
                dmd: 0,
                dmdStored: 0,
                slotIndex: null,
                feedCost: getFeedCost(item.level, item.rarity, playerTier, 0, {
                  sizeTier: sz,
                  xl: Boolean(item.xl),
                }),
                feedsProgress: item.level >= 5 ? reqFeeds : 0,
                feedsRequired: reqFeeds,
                feedClicksSinceReset: 0,
                costResetEndsAt: null,
                levelFeedsCompleted: item.level >= 5,
                breedingEndsAt: null,
                breedingNextLevel: null,
                lastBreedingEggAt: null,
                staked: false,
                stakeRatePerHour: 0,
                xl: item.xl,
                sizeTier: sz,
                skillLevel: 1,
                trainingLevel: 0,
                powerRating: RARITY_STYLE[item.rarity].basePower + item.level * 20,
                unlockedAt: Date.now(),
              };
              updatedDucks = normalizeDragonSlots([...updatedDucks, wonDragon], prev.unlockedSlots);
              wonAuction = true;
              return { ...item, timeLeftSec: 0, endsAt: nowTs, soldStatus: 'SOLD_YOU' as const, soldAt: nowTs, rivalSniped: false };
            }
            return { ...item, timeLeftSec: 0, endsAt: nowTs, soldStatus: 'SOLD_OTHER' as const, soldAt: nowTs, rivalSniped: false };
          });

        if (snipeOccurred) soundFX.playAuctionAlert();
        if (wonAuction) soundFX.playVictory();

        let finalListings = updatedListings;
        if (missingRarity) {
          const freshPool = createInitialMarketListings().map((l) => ({
            ...l,
            cornPrice: Math.max(l.cornPrice, getMarketListingScaledCornFloor(l.rarity, playerTier)),
          }));
          finalListings = marketRarities.flatMap((rar) => {
            const activeForRar = updatedListings.filter((l) => l.rarity === rar && l.soldStatus === 'ACTIVE');
            if (activeForRar.length > 0) {
              return updatedListings.filter((l) => l.rarity === rar);
            }
            const preservedSold = updatedListings.filter((l) => l.rarity === rar && l.soldStatus !== 'ACTIVE');
            const replacements = freshPool
              .filter((l) => l.rarity === rar)
              .map((l) => ({ ...l, id: `${l.id}_${Date.now().toString().slice(-4)}` }));
            return [...replacements, ...preservedSold];
          });
        }

        const cycleBonusMedals =
          tournamentEnding && prev.tournament.score >= 25
            ? Math.min(30, Math.floor(prev.tournament.score / 25))
            : 0;

        let nextPack = prev.pack;
        if (prev.pack.activeResearch && nowTs >= prev.pack.activeResearch.endsAt) {
          const doneRes = prev.pack.activeResearch;
          const techMeta = ALLIANCE_RESEARCH_CATALOG.find((t) => t.id === doneRes.techId);
          const xpReward = 24000 * doneRes.targetLevel;
          nextPack = {
            ...nextPack,
            power: nextPack.power + 180 * doneRes.targetLevel,
            activeResearch: null,
            techLevels: {
              ...createInitialTechLevels(),
              ...(nextPack.techLevels ?? {}),
              [doneRes.techId]: doneRes.targetLevel,
            },
            techFunding: {
              ...createInitialTechFunding(),
              ...(nextPack.techFunding ?? {}),
              [doneRes.techId]: 0,
            },
            notifications: appendAllianceNotification(nextPack.notifications, {
              category: 'RESEARCH_DONE',
              titleAr: `اكتمل بحث ${techMeta?.nameAr ?? doneRes.techId} (Lv.${doneRes.targetLevel})!`,
              bodyAr: `مفعّل الآن لجميع الأعضاء: ${techMeta?.effectPerLevelAr ?? ''} (+${xpReward.toLocaleString()} خبرة للسرب).`,
              targetSubTab: 'RESEARCH',
              inviteText: `🔬 إعلان تقني: اكتمل بحث "${techMeta?.nameAr ?? doneRes.techId}" للمستوى ${doneRes.targetLevel}! ادخلوا لتمويل البحث التالي.`,
            }),
            logs: appendAllianceLog(nextPack.logs, {
              type: 'RESEARCH',
              actor: 'مختبر أبحاث السرب',
              message: `اكتمل بحث "${techMeta?.nameAr ?? doneRes.techId}" وارتفع للمستوى ${doneRes.targetLevel}!`,
            }),
          };
          nextPack = applyAllianceXpAndLevelNotification(nextPack, xpReward);
        }

        if (
          nextPack.activeRally &&
          nextPack.activeRally.status === 'GATHERING' &&
          nowTs >= nextPack.activeRally.marchEndsAt
        ) {
          const readyRally = nextPack.activeRally;
          nextPack = {
            ...nextPack,
            activeRally: {
              ...readyRally,
              status: 'READY',
            },
            notifications: appendAllianceNotification(nextPack.notifications, {
              category: 'RALLY_READY',
              titleAr: `الحشد جاهز للاشتباك: ${readyRally.targetNameAr}`,
              bodyAr: `اكتمل زمن التجمع (${readyRally.participants.length} حلفاء عند ${readyRally.coords.x}, ${readyRally.coords.y}). ابدأوا الحسم الآن!`,
              targetSubTab: 'MAP',
              inviteText: `⚔️ حشد "${readyRally.targetNameAr}" جاهز للحسم عند (${readyRally.coords.x}, ${readyRally.coords.y})! ادخلوا الخريطة لاستلام الغنائم.`,
            }),
          };
        }

        if (expiredSites) {
          nextPack = {
            ...nextPack,
            occupiedSites: (nextPack.occupiedSites ?? []).filter((s) => nowTs < s.expiresAt),
          };
        }

        return {
          ...prev,
          pack: nextPack,
          breedingEggs: (prev.breedingEggs ?? 0) + eggsGainedThisTick,
          ducks: updatedDucks,
          marketListings: finalListings,
          stats:
            cycleBonusMedals > 0
              ? { ...prev.stats, medals: prev.stats.medals + cycleBonusMedals }
              : prev.stats,
          tournament: tournamentEnding
            ? {
                score: 0,
                claimedMilestones: [],
                resetSeconds: 5180,
                resetAt: nowTs + 5180 * 1000,
              }
            : {
                ...prev.tournament,
                resetAt: tournResetAt,
                resetSeconds: Math.max(0, Math.floor((tournResetAt - nowTs) / 1000)),
              },
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [screen]);

  const activeGodHarvest = state.godCards.some((g) => g.godKey === 'harvest' && g.owned);
  const activeGodHype = state.godCards.some((g) => g.godKey === 'hype' && g.owned);
  const activeGodFortune = state.godCards.some((g) => g.godKey === 'fortune' && g.owned);
  const activeGodPlunder = state.godCards.some((g) => g.godKey === 'plunder' && g.owned);

  // === FEEDING HANDLER (5-Level Escalating Schedule + 8h Reset Timer -> Unlocks 24h Breeding Gate) ===
  const handleFeedDuck = (
    duckId: string,
    comboMultiplier = 1,
    isCrit = false
  ): { burnedEnergy: number; tapSteps: number; leveledUp: boolean } | null => {
    const cur = latestStateRef.current;
    const target = cur.ducks.find((d) => d.id === duckId);
    if (!target) return null;
    const nowTs = Date.now();
    if (target.breedingEndsAt && target.breedingEndsAt > nowTs) {
      showToast('التنين في بوابة التزاوج حالياً! انتظر انتهاء العداد للانتقال للمستوى التالي.');
      return null;
    }
    if (target.feedsProgress >= target.feedsRequired) {
      showToast(
        target.level < 5
          ? 'اكتملت ضغطات هذا المستوى! ابدأ بوابة التزاوج (24 ساعة).'
          : 'اكتمل إطعام المستوى الخامس بالكامل!'
      );
      return null;
    }

    const playerTier = getPlayerTier(cur);
    const hasHarvest = cur.godCards.some((g) => g.godKey === 'harvest' && g.owned);
    const prevClicks = target.feedClicksSinceReset ?? 0;
    const baseFeedCost = getFeedCost(target.level, target.rarity, playerTier, prevClicks, target);
    const effectiveCost = hasHarvest ? Math.max(1, Math.ceil(baseFeedCost * 0.8)) : baseFeedCost;
    if (cur.corn < effectiveCost) {
      triggerTelegramHaptic('error');
      showToast(`طاقة الإطعام غير كافية (${effectiveCost}⚡ مطلوبة)! اجمع الطاقة من البيض أو الحلبة.`);
      return null;
    }

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
      ...cur,
      corn: cur.corn - effectiveCost,
      treasury: withBurnedEnergy(cur.treasury, effectiveCost),
      battlePass: {
        ...cur.battlePass,
        xp: cur.battlePass.xp + (isCrit ? 6 : 3) + (completedLevelFeeds ? 30 : 0),
      },
      ducks: cur.ducks.map((d) => {
        if (d.id !== duckId) return d;
        return {
          ...d,
          feedsProgress: nextProgress,
          feedClicksSinceReset: nextClicks,
          costResetEndsAt: nextResetAt,
          feedCost: nextFeedCost,
          levelFeedsCompleted: completedLevelFeeds,
        };
      }),
      eggQueue: (cur.stats.totalFeeds + 1) % 12 === 0 ? [...cur.eggQueue, 'egg_1'] : cur.eggQueue,
      stats: {
        ...cur.stats,
        totalFeeds: cur.stats.totalFeeds + 1,
        hearts: cur.stats.hearts + (target.skin === 'cupid' ? 14 : 8),
      },
      dailyTasks: cur.dailyTasks.map((dt) =>
        dt.id === 'dt_feed' ? { ...dt, progress: Math.min(dt.target, dt.progress + 1) } : dt
      ),
      pack: {
        ...cur.pack,
        coopProgress: {
          ...createInitialCoopProgress(),
          ...(cur.pack.coopProgress ?? {}),
          coop_feeds: ((cur.pack.coopProgress?.coop_feeds ?? 280) + 1),
        },
      },
    };

    latestStateRef.current = nextState;
    setState(nextState);

    if (completedLevelFeeds) {
      if (target.level < 5) {
        showToast(`🔥 اكتملت ضغطات LVL ${target.level}! افتح بوابة التزاوج (24 ساعة) للانتقال إلى LVL ${target.level + 1}!`);
      } else {
        showToast('🏆 اكتمل المستوى الخامس (500/500)! يمكنك الآن دمج XL/XXL أو التخصيص بالنجوم ★!');
      }
    }
    return { burnedEnergy: effectiveCost, tapSteps, leveledUp: completedLevelFeeds };
  };

  // === 24-HOUR BREEDING GATE + 15-MIN BREEDING EGGS ===
  const handleStartBreeding = (duckId: string) => {
    const target = state.ducks.find((d) => d.id === duckId);
    if (!target) return;
    if (target.level >= 5) {
      soundFX.playError();
      showToast('بلغ التنين المستوى الخامس بالفعل!');
      return;
    }
    if (target.feedsProgress < target.feedsRequired) {
      soundFX.playError();
      showToast(`أكمل ضغطات الإطعام أولاً (${target.feedsProgress}/${target.feedsRequired})!`);
      return;
    }
    if (target.breedingEndsAt && target.breedingEndsAt > Date.now()) {
      showToast('عملية التزاوج جارية بالفعل لهذا التنين!');
      return;
    }

    const nowTs = Date.now();
    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    setState((prev) => ({
      ...prev,
      ducks: prev.ducks.map((d) =>
        d.id === duckId
          ? {
              ...d,
              breedingEndsAt: nowTs + ECONOMY_LIMITS.BREEDING_DURATION_MS,
              breedingNextLevel: d.level + 1,
              lastBreedingEggAt: nowTs,
            }
          : d
      ),
    }));
    showToast(`❤️ بدأت بوابة التزاوج 24 ساعة للانتقال إلى LVL ${target.level + 1} (بيضة كل 15 دقيقة)!`);
  };

  // === UPGRADE XL / XXL DRAGON WITH BREEDING EGGS ===
  const handleUpgradeXlWithEggs = (duckId: string) => {
    const target = state.ducks.find((d) => d.id === duckId);
    if (!target) return;
    const sz = resolveDragonSize(target);
    if (sz === 'NORMAL' || target.level >= 5) {
      soundFX.playError();
      return;
    }
    const costEggs = getXlEggUpgradeCost(target.level, sz);
    if ((state.breedingEggs ?? 0) < costEggs) {
      soundFX.playError();
      triggerTelegramHaptic('error');
      showToast(`تحتاج ${costEggs} بيضة تزاوج للترقية (لديك ${state.breedingEggs ?? 0})!`);
      return;
    }

    const nextLv = Math.min(5, target.level + 1);
    const tier = getPlayerTier(state);
    soundFX.playLevelUp();
    triggerTelegramHaptic('success');
    setState((prev) => ({
      ...prev,
      breedingEggs: Math.max(0, (prev.breedingEggs ?? 0) - costEggs),
      ducks: prev.ducks.map((d) =>
        d.id === duckId
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
    }));
    showToast(`🥚 تمت ترقية ${target.name} (${sz}) إلى LVL ${nextLv} باستخدام ${costEggs} بيضة تزاوج!`);
  };

  // === STAR CUSTOMIZATION UPGRADE (★1..10: 10★..100★; Unlocks Wallet DMD; ★10 Seals to Vault!) ===
  const handleUpgradeStarCustomization = (duckId: string, steps = 1) => {
    const target = state.ducks.find((d) => d.id === duckId);
    if (!target) return;
    if (target.level < 5) {
      soundFX.playError();
      triggerTelegramHaptic('error');
      showToast('يجب وصول التنين إلى المستوى 5 أولاً قبل التخصيص بالنجوم!');
      return;
    }

    const startLv = clampCustomLevel(target.customLevel);
    if (startLv >= ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL) {
      soundFX.playError();
      triggerTelegramHaptic('error');
      showToast('وصل التنين إلى التخصيص النهائي ★10/10!');
      return;
    }

    const requestedSteps = Math.max(1, Math.min(10, Math.floor(steps)));
    let previewLv = startLv;
    let previewStars = state.stars;
    let previewSpent = 0;
    let previewCount = 0;
    let previewDmdGain = 0;
    const targetSize = resolveDragonSize(target);

    while (
      previewCount < requestedSteps &&
      previewLv < ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL
    ) {
      const stepCost = calculateCustomUpgradeCost(previewLv);
      if (previewStars < stepCost) break;
      const beforeDmd = getCumulativeDmdAtCustomLevel(target.rarity, targetSize, previewLv);
      const afterDmd = getCumulativeDmdAtCustomLevel(target.rarity, targetSize, previewLv + 1);
      previewDmdGain += Math.max(0, afterDmd - beforeDmd);
      previewStars -= stepCost;
      previewSpent += stepCost;
      previewLv++;
      previewCount++;
    }

    if (previewCount === 0) {
      const needed = calculateCustomUpgradeCost(startLv);
      soundFX.playError();
      triggerTelegramHaptic('error');
      showToast(`تحتاج ${needed} نجمة ★ للترقية إلى ★${startLv + 1}!`);
      return;
    }

    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');

    setState((prev) => {
      const curDragon = prev.ducks.find((d) => d.id === duckId);
      if (!curDragon || curDragon.level < 5) return prev;
      let curLv = clampCustomLevel(curDragon.customLevel);
      let remStars = prev.stars;
      let totalSpent = 0;
      let powerGain = 0;
      let performed = 0;
      const curSize = resolveDragonSize(curDragon);
      const startCumulativeDmd = getCumulativeDmdAtCustomLevel(curDragon.rarity, curSize, curLv);

      while (
        performed < requestedSteps &&
        curLv < ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL
      ) {
        const cost = calculateCustomUpgradeCost(curLv);
        if (remStars < cost) break;
        remStars -= cost;
        totalSpent += cost;
        powerGain += 40;
        curLv++;
        performed++;
      }

      if (performed === 0) return prev;
      const endCumulativeDmd = getCumulativeDmdAtCustomLevel(curDragon.rarity, curSize, curLv);
      const dmdAdded = Math.max(0, Math.round((endCumulativeDmd - startCumulativeDmd) * 100) / 100);

      // Seal permanently at ★10 into Customized Vault for DMD exchange
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
        const remainingRaw = prev.ducks.filter((d) => d.id !== duckId);
        const ensured =
          remainingRaw.length > 0
            ? remainingRaw
            : [createFallbackStarterDragon(getPlayerTier(prev))];
        const nextDucks = normalizeDragonSlots(ensured, prev.unlockedSlots);
        return {
          ...prev,
          stars: remStars,
          dmdTotal: Math.round((prev.dmdTotal + dmdAdded) * 100) / 100,
          treasury: withBurnedStars(prev.treasury, totalSpent),
          battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + performed * 35 },
          ducks: nextDucks,
          activeDuckIndex: Math.min(prev.activeDuckIndex, Math.max(0, nextDucks.length - 1)),
          customizedVault: [...(prev.customizedVault ?? []), sealedDragon],
        };
      }

      const updatedDucks = prev.ducks.map((d) =>
        d.id === duckId
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
      );

      return {
        ...prev,
        stars: remStars,
        dmdTotal: Math.round((prev.dmdTotal + dmdAdded) * 100) / 100,
        treasury: withBurnedStars(prev.treasury, totalSpent),
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + performed * 35 },
        ducks: updatedDucks,
      };
    });

    if (previewLv >= ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL) {
      showToast(
        `🏦 اكتمل ★10! تم نقل ${target.name} إلى خزانة التنانين المخصصة (+${previewDmdGain.toFixed(2)} DMD للمحفظة)!`
      );
    } else {
      showToast(
        `⭐ تمت ترقية التخصيص إلى ★${previewLv} (+${previewDmdGain.toFixed(2)} DMD للمحفظة · -${previewSpent}★)!`
      );
    }
  };

  const handleUpgradeDuckSkill = (duckId: string) => {
    const target = state.ducks.find((d) => d.id === duckId);
    if (!target || target.skillLevel >= 5) return;
    const cost = getSkillUpgradeCost(target.skillLevel, getPlayerTier(state));
    if (state.corn < cost) {
      soundFX.playError();
      showToast(`تحتاج ${cost.toLocaleString()} طاقة لترقية المهارة!`);
      return;
    }
    setState((prev) => ({
      ...prev,
      corn: prev.corn - cost,
      treasury: withBurnedEnergy(prev.treasury, cost),
      battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 25 },
      ducks: prev.ducks.map((d) =>
        d.id === duckId ? { ...d, skillLevel: d.skillLevel + 1, powerRating: d.powerRating + 38 } : d
      ),
    }));
    showToast(`تمت ترقية مهارة ${target.name} إلى م${target.skillLevel + 1}! (+38 قوة)`);
  };

  // === CONTINUOUS DRAGON INTENSIVE TRAINING (Unlimited Post-LVL5 Energy Sink) ===
  const handleTrainDragon = (duckId: string) => {
    const target = state.ducks.find((d) => d.id === duckId);
    if (!target) return;
    const trainRank = target.trainingLevel ?? 0;
    const cost = getDragonTrainingCost(trainRank, getPlayerTier(state));
    if (state.corn < cost) {
      soundFX.playError();
      showToast(`تحتاج ${cost.toLocaleString()} طاقة للتدريب القتالي التالي!`);
      return;
    }
    soundFX.playLevelUp();
    setState((prev) => ({
      ...prev,
      corn: prev.corn - cost,
      treasury: withBurnedEnergy(prev.treasury, cost),
      battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 20 },
      ducks: prev.ducks.map((d) =>
        d.id === duckId
          ? {
              ...d,
              trainingLevel: (d.trainingLevel ?? 0) + 1,
              powerRating: d.powerRating + 18,
            }
          : d
      ),
    }));
    showToast(`💪 تم تدريب ${target.name} للرتبة ${trainRank + 1} (+14 صحة و +2 هجوم)!`);
  };

  // === 4-TRACK SQUAD TALENTS (Continuous Multi-Resource Sink) ===
  const handleUpgradeSquadTalent = (talentKey: SquadTalentKey) => {
    const talents = state.pack.talents ?? { fury: 0, carapace: 0, incubation: 0, prestige: 0 };
    const currentRank = talents[talentKey] ?? 0;
    if (currentRank >= ECONOMY_LIMITS.MAX_TALENT_RANK) {
      soundFX.playError();
      showToast('بلغت هذه الموهبة الحد الأقصى (20/20)!');
      return;
    }
    const cost = getSquadTalentCost(talentKey, currentRank, getPlayerTier(state));
    if (
      state.corn < cost.corn ||
      state.stars < cost.stars ||
      state.duckGold < cost.gold ||
      state.stats.medals < cost.medals
    ) {
      soundFX.playError();
      showToast('الموارد غير كافية لترقية هذه الموهبة!');
      return;
    }
    const meta = SQUAD_TALENT_CATALOG.find((t) => t.key === talentKey);
    soundFX.playGodConfirm();
    setState((prev) => {
      const prevTalents = prev.pack.talents ?? { fury: 0, carapace: 0, incubation: 0, prestige: 0 };
      let nextTreasury = withBurnedEnergy(prev.treasury, cost.corn);
      nextTreasury = withBurnedStars(nextTreasury, cost.stars);
      return {
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
            [talentKey]: (prevTalents[talentKey] ?? 0) + 1,
          },
        },
        stats: {
          ...prev.stats,
          medals: prev.stats.medals - cost.medals,
        },
      };
    });
    showToast(`🛡️ تمت ترقية موهبة "${meta?.nameAr ?? talentKey}" إلى المستوى ${currentRank + 1}!`);
  };

  // === ADVENTURE RELIC FORGE (Continuous Gold + Medals + Stars + Energy Sink) ===
  const handleForgeRelic = (offerId: RelicForgeOffer['id']) => {
    const offer = RELIC_FORGE_CATALOG.find((o) => o.id === offerId);
    if (!offer) return;
    if (
      state.corn < offer.cornCost ||
      state.duckGold < offer.goldCost ||
      state.stats.medals < offer.medalsCost ||
      state.stars < offer.starsCost
    ) {
      soundFX.playError();
      showToast('الموارد غير كافية لصقل هذه التعويذة!');
      return;
    }
    soundFX.playChestOpen();
    const durationMs = 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + durationMs;
    setState((prev) => {
      const prevBuffs = prev.activeBuffs ?? { duelFuryUntil: 0, critEdgeUntil: 0, eggSurgeUntil: 0 };
      let nextTreasury = withBurnedEnergy(prev.treasury, offer.cornCost);
      nextTreasury = withBurnedStars(nextTreasury, offer.starsCost);
      return {
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
    });
    showToast(`✨ تم تفعيل "${offer.nameAr}" بنجاح!`);
  };

  // === ARENA ENTRY TICKET SINK ===
  const handleSpendArenaEntry = useCallback(
    (cost: number): boolean => {
      if (state.corn < cost) {
        soundFX.playError();
        showToast(`تحتاج ${cost}⚡ كرسوم دخول للحلبة!`);
        return false;
      }
      setState((prev) => ({
        ...prev,
        corn: prev.corn - cost,
        treasury: withBurnedEnergy(prev.treasury, cost),
      }));
      return true;
    },
    [showToast, state.corn]
  );

  const handleRefundArenaEntry = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      setState((prev) => ({
        ...prev,
        corn: prev.corn + amount,
        treasury: {
          ...prev.treasury,
          energyBurnedToday: Math.max(0, (prev.treasury.energyBurnedToday ?? 0) - amount),
        },
      }));
      showToast(`تم إلغاء الجولة قبل بدايتها واسترداد ${amount}⚡.`);
    },
    [showToast]
  );

  // === UNLOCK DRAGON SLOT (Slots 4..8 with exact Star cost & Progression requirement) ===
  const handleUnlockDragonSlot = (slotIndex: number) => {
    const check = checkSlotUnlockEligibility(slotIndex, state);
    if (!check.canUnlock) {
      soundFX.playError();
      showToast(check.reason);
      return;
    }

    const meta = DRAGON_SLOTS[slotIndex];
    soundFX.playChestOpen();

    // Pick a reserve unassigned dragon or hatch a fresh companion dragon into the new slot
    const skins: DuckSkinId[] = ['cool', 'dj', 'gamer', 'pharaoh', 'ninja'];
    const pick = skins[slotIndex % skins.length];

    setState((prev) => {
      const nextSlots = slotIndex + 1;
      const hasReserve = prev.ducks.some((d) => d.slotIndex === null);
      let nextDucks = prev.ducks;
      let focusId = prev.ducks[prev.activeDuckIndex]?.id;

      if (!hasReserve) {
        const rarity: Rarity = slotIndex >= 5 ? 'RARE' : 'UNCOMMON';
        const reqFeeds = getLevelRequiredFeeds(1);
        const newDragon: Duck = {
          id: `dragon_slot_${slotIndex}_${Date.now()}`,
          name: SKIN_CATALOG[pick].name,
          skin: pick,
          rarity,
          level: 1,
          maxLevel: 5,
          customLevel: 0,
          dmd: 0,
          dmdStored: 0,
          slotIndex: null,
          feedCost: getFeedCost(1, rarity, getPlayerTier(prev), 0),
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
          skillLevel: 1,
          trainingLevel: 0,
          powerRating: slotIndex >= 5 ? 290 : 185,
          unlockedAt: Date.now(),
        };
        nextDucks = [...prev.ducks, newDragon];
        focusId = newDragon.id;
      }

      const normalized = normalizeDragonSlots(nextDucks, nextSlots);
      const nextIdx = Math.max(0, normalized.findIndex((d) => d.id === focusId));

      return {
        ...prev,
        stars: prev.stars - meta.starCost,
        treasury: withBurnedStars(prev.treasury, meta.starCost),
        unlockedSlots: nextSlots,
        ducks: normalized,
        activeDuckIndex: nextIdx,
      };
    });

    showToast(`تم فتح ${meta.label} وتوزيع التنانين حسب أقدمية الحصول عليها!`);
  };

  const handleAssignDragonToSlot = (duckId: string, slotIndex: number) => {
    if (slotIndex >= state.unlockedSlots) return;
    soundFX.playTabSwitch();
    setState((prev) => {
      const currentOccupant = prev.ducks.find((d) => d.slotIndex === slotIndex);
      const movingDragon = prev.ducks.find((d) => d.id === duckId);
      if (!movingDragon) return prev;
      const oldSlot = movingDragon.slotIndex;

      const updatedDucks = prev.ducks.map((d) => {
        if (d.id === duckId) return { ...d, slotIndex };
        if (currentOccupant && d.id === currentOccupant.id) return { ...d, slotIndex: oldSlot };
        return d;
      });
      return { ...prev, ducks: updatedDucks };
    });
    showToast(`تم نقل التنين إلى الخانة ${slotIndex + 1}!`);
  };

  // === XL / XXL MERGING (Tiers 2..5 completed LVL 5: 4x NORMAL -> XL, 4x XL -> XXL) ===
  const handleMergeDucks = (duckIds: string[]) => {
    const picked = state.ducks.filter((d) => duckIds.includes(d.id));
    if (picked.length !== 4) return;
    const baseRarity = picked[0].rarity;
    const baseSize = resolveDragonSize(picked[0]);
    if (baseRarity === 'COMMON' || baseSize === 'XXL') return;
    const allMatch = picked.every(
      (d) =>
        d.rarity === baseRarity &&
        resolveDragonSize(d) === baseSize &&
        d.level >= 5 &&
        d.feedsProgress >= 500
    );
    if (!allMatch) {
      soundFX.playError();
      showToast('يجب اختيار 4 تنانين مكتملة LVL 5 من نفس التصنيف والحجم!');
      return;
    }

    const nextSize = baseSize === 'NORMAL' ? 'XL' : 'XXL';
    const curRarityIdx = RARITY_ORDER.indexOf(baseRarity);
    const skins: DuckSkinId[] = ['gamer', 'pumpkin', 'pharaoh', 'royal', 'cool'];
    const newSkin = skins[(curRarityIdx + state.stats.totalDucksMerged) % skins.length];
    const tier = getPlayerTier(state);
    const reqFeeds = getLevelRequiredFeeds(1);

    const mergedDragon: Duck = {
      id: `dragon_merged_${Date.now()}`,
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
      unlockedAt: Date.now(),
    };

    setState((prev) => {
      const remaining = prev.ducks.filter((d) => !duckIds.includes(d.id));
      const normalized = normalizeDragonSlots([...remaining, mergedDragon], prev.unlockedSlots);
      const mergedIdx = Math.max(0, normalized.findIndex((d) => d.id === mergedDragon.id));
      return {
        ...prev,
        ducks: normalized,
        activeDuckIndex: mergedIdx,
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 75 },
        stats: {
          ...prev.stats,
          totalDucksMerged: prev.stats.totalDucksMerged + 1,
        },
      };
    });
    showToast(
      `نجح الدمج! حصلت على تنين ${RARITY_STYLE[baseRarity].labelAr} (${nextSize}) مستوى 1!`
    );
  };

  const handleCustomizeDuck = (duckId: string, gear: DuckGearId, aura: DuckAuraId) => {
    setState((prev) => ({
      ...prev,
      ducks: prev.ducks.map((d) => (d.id === duckId ? { ...d, gear, aura } : d)),
    }));
    showToast('تم حفظ مظهر التنين وتجهيزه بنجاح!');
  };

  const handleChangeDragonSkin = (duckId: string, skin: DuckSkinId) => {
    if (!state.unlockedSkins.includes(skin)) {
      soundFX.playError();
      triggerTelegramHaptic('error');
      showToast('هذا المظهر غير مفتوح بعد! افتحه عبر عملة المظهر في قسم المهام.');
      return;
    }
    setState((prev) => ({
      ...prev,
      ducks: prev.ducks.map((d) =>
        d.id === duckId ? { ...d, skin, name: SKIN_CATALOG[skin]?.name ?? d.name } : d
      ),
    }));
    triggerTelegramHaptic('success');
    showToast(`تم تجهيز مظهر ${SKIN_CATALOG[skin]?.name ?? skin} بنجاح!`);
  };

  // === STORE PACKAGE PURCHASE (Feeds 50% to DMD Reserve Treasury & 50% to Ops!) ===
  const handleBuyStorePackage = (packageId: string) => {
    const pkg = STORE_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return;

    soundFX.playChestOpen();
    const reserveShare = pkg.priceUsd * 0.5;
    const opsShare = pkg.priceUsd * 0.5;

    setState((prev) => {
      const tier = getPlayerTier(prev);
      let extraDucks = prev.ducks;
      let nextActiveIdx = prev.activeDuckIndex;
      if (pkg.legendaryDragon) {
        const reqFeeds = getLevelRequiredFeeds(3);
        const leg: Duck = {
          id: `dragon_store_${Date.now()}`,
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
          unlockedAt: Date.now(),
        };
        extraDucks = normalizeDragonSlots([...prev.ducks, leg], prev.unlockedSlots);
        nextActiveIdx = Math.max(0, extraDucks.findIndex((d) => d.id === leg.id));
      }

      const energyGrant = withEarnedEnergy(prev, pkg.energyReward, true);
      const nextTreasury = withEarnedStars(energyGrant.treasury, pkg.starsReward);

      return {
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
          autoMergeBoosters: prev.stats.autoMergeBoosters + (pkg.id === 'pkg_rare_hatchery' ? 1 : 0),
        },
      };
    });
    showToast(`تم الشراء! +$${reserveShare.toFixed(2)} إلى صندوق دعم DMD المستقبلية (50%)!`);
  };

  // === OPTIONAL REWARDED AD (Capped at 4/day, feeds 50% into DMD Reserve Treasury) ===
  const handleWatchRewardedAd = (kind: 'energy' | 'stars' | 'eggs') => {
    if (state.treasury.adsWatchedToday >= state.treasury.maxAdsPerDay) {
      soundFX.playError();
      showToast(`وصلت للحد اليومي (${state.treasury.maxAdsPerDay}/${state.treasury.maxAdsPerDay}) للإعلانات الاختيارية!`);
      return;
    }

    soundFX.playClaim();
    const adRevenue = 0.04;
    const reserveShare = adRevenue * 0.5;
    const opsShare = adRevenue * 0.5;

    setState((prev) => {
      const energyGrant =
        kind === 'energy'
          ? withEarnedEnergy(prev, ECONOMY_LIMITS.AD_ENERGY_REWARD)
          : { corn: prev.corn, finalGain: 0, damped: false, treasury: prev.treasury };
      const nextTreasury =
        kind === 'stars'
          ? withEarnedStars(energyGrant.treasury, ECONOMY_LIMITS.AD_STARS_REWARD)
          : energyGrant.treasury;
      return {
        ...prev,
        corn: energyGrant.corn,
        stars: kind === 'stars' ? prev.stars + ECONOMY_LIMITS.AD_STARS_REWARD : prev.stars,
        eggQueue: kind === 'eggs' ? ['egg_1', ...prev.eggQueue] : prev.eggQueue,
        treasury: {
          ...nextTreasury,
          reserveUsd: nextTreasury.reserveUsd + reserveShare,
          opsUsd: nextTreasury.opsUsd + opsShare,
          adRevenueUsd: nextTreasury.adRevenueUsd + adRevenue,
          adsWatchedToday: nextTreasury.adsWatchedToday + 1,
        },
      };
    });

    const label =
      kind === 'energy'
        ? `+${ECONOMY_LIMITS.AD_ENERGY_REWARD} طاقة إطعام`
        : kind === 'stars'
          ? `+${ECONOMY_LIMITS.AD_STARS_REWARD} نجوم ★`
          : `+${ECONOMY_LIMITS.AD_EGGS_REWARD} بيضة تنين`;
    showToast(`شكراً لمشاهدتك! ${label} (دعم الصندوق بـ 50% من العائد)`);
  };

  const handleMergeCells = (fromIndex: number, toIndex: number) => {
    const fromCell = state.grid[fromIndex];
    const toCell = state.grid[toIndex];
    if (!fromCell || !toCell || fromCell.locked || toCell.locked || !fromCell.item) return;

    if (!toCell.item) {
      soundFX.playTapFeed();
      setState((prev) => ({
        ...prev,
        grid: prev.grid.map((c) => {
          if (c.index === fromIndex) return { ...c, item: null, justMerged: false };
          if (c.index === toIndex) return { ...c, item: fromCell.item, justMerged: false };
          return { ...c, justMerged: false };
        }),
      }));
      return;
    }

    if (fromCell.item === toCell.item) {
      const meta = EGG_ITEM_META[fromCell.item];
      if (!meta.next) {
        soundFX.playError();
        return;
      }

      let resultItem: EggItemType = meta.next;
      if (activeGodFortune && Math.random() < 0.2 && EGG_ITEM_META[resultItem]?.next) {
        resultItem = EGG_ITEM_META[resultItem].next!;
      }

      const resultMeta = EGG_ITEM_META[resultItem];
      const blitzMult = blitzSecLeft > 0 ? 2 : 1;
      const incubationMult = 1 + (state.pack.talents?.incubation ?? 0) * 0.03;
      const surgeMult = (state.activeBuffs?.eggSurgeUntil ?? 0) > Date.now() ? 1.2 : 1;
      const rawEnergy = Math.round(resultMeta.cornValue * blitzMult * incubationMult * surgeMult);
      soundFX.playMerge(resultMeta.tier);

      setState((prev) => {
        const energyGrant = withEarnedEnergy(prev, rawEnergy);
        return {
          ...prev,
          corn: energyGrant.corn,
          treasury: energyGrant.treasury,
          battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 6 * blitzMult },
          stats: {
            ...prev.stats,
            totalMerges: prev.stats.totalMerges + 1,
            totalEggsHatched: prev.stats.totalEggsHatched + 1,
            hearts: prev.stats.hearts + (resultItem === 'egg_love' ? 140 : 12),
          },
          dailyTasks: prev.dailyTasks.map((dt) =>
            dt.id === 'dt_merge' ? { ...dt, progress: Math.min(dt.target, dt.progress + 1) } : dt
          ),
          grid: prev.grid.map((c) => {
            if (c.index === fromIndex) return { ...c, item: null, justMerged: false };
            if (c.index === toIndex) return { ...c, item: resultItem, justMerged: true };
            return { ...c, justMerged: false };
          }),
          pack: {
            ...prev.pack,
            coopProgress: {
              ...createInitialCoopProgress(),
              ...(prev.pack.coopProgress ?? {}),
              coop_eggs: (prev.pack.coopProgress?.coop_eggs ?? 145) + 1,
            },
          },
        };
      });
    }
  };

  const handleStartBlitz = () => {
    const cost = ECONOMY_LIMITS.BLITZ_ACTIVATION_COST;
    if (state.corn < cost) {
      soundFX.playError();
      showToast(`تحتاج ${cost}⚡ لتفعيل موجة 2×!`);
      return;
    }
    setBlitzEndsAt(Date.now() + 30000);
    setState((p) => ({
      ...p,
      corn: p.corn - cost,
      treasury: withBurnedEnergy(p.treasury, cost),
      eggQueue: ['egg_2', 'egg_1', 'egg_1', 'grapes', ...p.eggQueue],
    }));
    showToast(`🔥 بدأت موجة دمج 2× لمدة 30 ثانية (-${cost}⚡)!`);
  };

  const handleAutoMergeBoard = (): number => {
    if (state.stats.autoMergeBoosters <= 0) {
      showToast('لا توجد شحنات دمج تلقائي متبقية! اصقلها من مواهب السرب أو تذكرة الموسم.');
      return 0;
    }

    let mergesPerformed = 0;
    let totalCornEarned = 0;
    const nextGrid = state.grid.map((c) => ({ ...c, justMerged: false }));

    const itemBuckets = new Map<EggItemType, number[]>();
    nextGrid.forEach((cell) => {
      if (!cell.locked && cell.item && EGG_ITEM_META[cell.item]?.next) {
        const list = itemBuckets.get(cell.item) ?? [];
        list.push(cell.index);
        itemBuckets.set(cell.item, list);
      }
    });

    itemBuckets.forEach((indices, itemType) => {
      const nextTier = EGG_ITEM_META[itemType]?.next;
      if (!nextTier) return;
      for (let i = 0; i + 1 < indices.length && mergesPerformed < 6; i += 2) {
        const idxA = indices[i];
        const idxB = indices[i + 1];
        nextGrid[idxA].item = null;
        nextGrid[idxB].item = nextTier;
        nextGrid[idxB].justMerged = true;
        mergesPerformed++;
        totalCornEarned += EGG_ITEM_META[nextTier].cornValue;
      }
    });

    if (mergesPerformed === 0) {
      showToast('لا توجد أزواج متطابقة جاهزة للدمج الآن!');
      return 0;
    }

    setState((prev) => {
      const energyGrant = withEarnedEnergy(prev, totalCornEarned);
      return {
        ...prev,
        corn: energyGrant.corn,
        treasury: energyGrant.treasury,
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + mergesPerformed * 8 },
        grid: nextGrid,
        stats: {
          ...prev.stats,
          autoMergeBoosters: prev.stats.autoMergeBoosters - 1,
          totalMerges: prev.stats.totalMerges + mergesPerformed,
        },
        pack: {
          ...prev.pack,
          coopProgress: {
            ...createInitialCoopProgress(),
            ...(prev.pack.coopProgress ?? {}),
            coop_eggs: (prev.pack.coopProgress?.coop_eggs ?? 145) + mergesPerformed,
          },
        },
      };
    });
    showToast(`⚡ الدمج الذكي نفّذ ${mergesPerformed} عمليات دمج (+${totalCornEarned} طاقة)!`);
    return mergesPerformed;
  };

  const handleUseHammerOnCell = (cellIndex: number) => {
    const cell = state.grid[cellIndex];
    if (!cell || !cell.item || state.stats.hammerBoosters <= 0) return;
    const nextTier = EGG_ITEM_META[cell.item]?.next;
    if (!nextTier) return;

    setState((prev) => ({
      ...prev,
      grid: prev.grid.map((c) =>
        c.index === cellIndex ? { ...c, item: nextTier, justMerged: true } : { ...c, justMerged: false }
      ),
      stats: { ...prev.stats, hammerBoosters: prev.stats.hammerBoosters - 1 },
    }));
    showToast(`🔨 تمت ترقية العنصر إلى ${EGG_ITEM_META[nextTier].name}!`);
  };

  const handlePlaceQueuedEgg = (targetIndex?: number) => {
    if (state.eggQueue.length === 0) return;
    const nextItem = state.eggQueue[0];
    const emptyIdx =
      targetIndex !== undefined && !state.grid[targetIndex]?.locked && !state.grid[targetIndex]?.item
        ? targetIndex
        : state.grid.findIndex((c) => !c.locked && c.item === null);

    if (emptyIdx === -1) {
      soundFX.playError();
      showToast('الساحة ممتلئة! استخدم الدمج التلقائي أو ادمج يدوياً.');
      return;
    }

    setState((prev) => ({
      ...prev,
      eggQueue: prev.eggQueue.slice(1),
      grid: prev.grid.map((c) =>
        c.index === emptyIdx ? { ...c, item: nextItem, justMerged: true } : { ...c, justMerged: false }
      ),
    }));
  };

  const handleDeliverToGod = (orderId: string, cellIndex?: number) => {
    const order = state.godOrders.find((o) => o.id === orderId);
    if (!order) return;
    const idx =
      cellIndex !== undefined
        ? cellIndex
        : state.grid.findIndex((c) => !c.locked && c.item === order.wantedItem);
    if (idx === -1) return;

    const eventMods = resolveEventModifiers(
      LIVE_EVENTS_REGISTRY[state.weekendEventIndex % LIVE_EVENTS_REGISTRY.length]
    );
    const blitzMult = blitzSecLeft > 0 ? 2 : 1;
    const incubationMult = 1 + (state.pack.talents?.incubation ?? 0) * 0.03;
    const surgeMult = (state.activeBuffs?.eggSurgeUntil ?? 0) > Date.now() ? 1.2 : 1;
    const rawOrderCorn = Math.round(
      order.cornReward * blitzMult * incubationMult * surgeMult * eventMods.templeEnergyMult
    );
    const prestigeMult = 1 + (state.pack.talents?.prestige ?? 0) * 0.03;
    const basePts = activeGodHype ? Math.round(order.trophyPoints * 1.5) : order.trophyPoints;
    const ptsEarned = Math.round(basePts * blitzMult * prestigeMult);
    const goldGain = order.trophyPoints >= 10 ? 1 : 0;
    const newOrder = createRandomGodOrder(state.stats.totalErrands + 1);

    setState((prev) => {
      const energyGrant = withEarnedEnergy(prev, rawOrderCorn);
      return {
        ...prev,
        corn: energyGrant.corn,
        duckGold: prev.duckGold + goldGain,
        treasury: energyGrant.treasury,
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 20 },
        godOrders: prev.godOrders.map((o) => (o.id === orderId ? newOrder : o)),
        grid: prev.grid.map((c) => (c.index === idx ? { ...c, item: null, justMerged: false } : c)),
        tournament: {
          ...prev.tournament,
          score: prev.tournament.score + ptsEarned,
        },
        stats: {
          ...prev.stats,
          totalErrands: prev.stats.totalErrands + 1,
          medals: prev.stats.medals + 5,
        },
        dailyTasks: prev.dailyTasks.map((dt) =>
          dt.id === 'dt_errands' ? { ...dt, progress: Math.min(dt.target, dt.progress + 1) } : dt
        ),
      };
    });
    triggerTelegramHaptic('success');
    showToast(
      `تم تسليم ${EGG_ITEM_META[order.wantedItem].name}! +${rawOrderCorn} طاقة${goldGain > 0 ? ' و +1 💎' : ''} و +${ptsEarned} 🏆`
    );
  };

  const handleOpenSnackChest = (cellIndex: number) => {
    const drops: EggItemType[] = ['grapes', 'egg_2'];
    const rawBonus = activeGodPlunder ? 175 : 130;
    setState((prev) => {
      const energyGrant = withEarnedEnergy(prev, rawBonus);
      return {
        ...prev,
        corn: energyGrant.corn,
        treasury: energyGrant.treasury,
        grid: prev.grid.map((c) => (c.index === cellIndex ? { ...c, item: 'chalice', justMerged: true } : c)),
        eggQueue: [...drops, ...prev.eggQueue],
        stats: {
          ...prev.stats,
          autoMergeBoosters: prev.stats.autoMergeBoosters + 1,
        },
      };
    });
    showToast(`تم فتح صندوق الكنوز! +${rawBonus} طاقة و +1 معزز دمج!`);
  };

  const handleUnlockGridSlot = (cellIndex: number) => {
    if (state.stars < 10) {
      soundFX.playError();
      triggerTelegramHaptic('error');
      showToast('تحتاج 10 نجوم ★ لفتح خانة جديدة في الساحة!');
      return;
    }
    setState((prev) => ({
      ...prev,
      stars: prev.stars - 10,
      treasury: withBurnedStars(prev.treasury, 10),
      grid: prev.grid.map((c) => (c.index === cellIndex ? { ...c, locked: false } : c)),
    }));
    showToast('تم فتح خانة جديدة في حقل البيض!');
  };

  const handleSellGridItem = (cellIndex: number) => {
    const cell = state.grid[cellIndex];
    if (!cell || cell.locked || !cell.item || cell.item === 'chest') return;
    const item = cell.item;
    const meta = EGG_ITEM_META[item];
    const reward = getEggSellReward(item);

    setState((prev) => {
      const target = prev.grid[cellIndex];
      if (!target || target.locked || target.item !== item) return prev;
      const energyGrant = withEarnedEnergy(prev, reward.corn);
      return {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + reward.stars,
        duckGold: prev.duckGold + reward.gold,
        treasury: {
          ...energyGrant.treasury,
          starsEarnedToday: (energyGrant.treasury.starsEarnedToday ?? 0) + reward.stars,
        },
        grid: prev.grid.map((c) =>
          c.index === cellIndex ? { ...c, item: null, justMerged: false } : c
        ),
      };
    });

    soundFX.playClaim();
    triggerTelegramHaptic('light');
    const extras: string[] = [`+${reward.corn} طاقة ⚡`];
    if (reward.stars > 0) extras.push(`+${reward.stars} ★`);
    if (reward.gold > 0) extras.push(`+${reward.gold} 💎`);
    showToast(`تم بيع ${meta.name}: ${extras.join(' · ')}`);
  };

  const handleSellQueuedEgg = (queueIndex: number) => {
    const item = state.eggQueue[queueIndex];
    if (!item || item === 'chest') return;
    const meta = EGG_ITEM_META[item];
    const reward = getEggSellReward(item);

    setState((prev) => {
      if (prev.eggQueue[queueIndex] !== item) return prev;
      const energyGrant = withEarnedEnergy(prev, reward.corn);
      return {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + reward.stars,
        duckGold: prev.duckGold + reward.gold,
        treasury: {
          ...energyGrant.treasury,
          starsEarnedToday: (energyGrant.treasury.starsEarnedToday ?? 0) + reward.stars,
        },
        eggQueue: prev.eggQueue.filter((_, idx) => idx !== queueIndex),
      };
    });

    soundFX.playClaim();
    triggerTelegramHaptic('light');
    const extras: string[] = [`+${reward.corn} طاقة ⚡`];
    if (reward.stars > 0) extras.push(`+${reward.stars} ★`);
    if (reward.gold > 0) extras.push(`+${reward.gold} 💎`);
    showToast(`تم بيع ${meta.name} من قائمة الانتظار: ${extras.join(' · ')}`);
  };

  const handlePlaceAllQueuedEggs = () => {
    if (state.eggQueue.length === 0) return;
    const emptyIndices = state.grid.filter((c) => !c.locked && c.item === null).map((c) => c.index);
    if (emptyIndices.length === 0) {
      soundFX.playError();
      showToast('الساحة ممتلئة! ادمج أو بع بعض العناصر لإتاحة مساحة.');
      return;
    }

    const dropCount = Math.min(emptyIndices.length, state.eggQueue.length);
    setState((prev) => {
      const available = prev.grid.filter((c) => !c.locked && c.item === null).map((c) => c.index);
      const count = Math.min(available.length, prev.eggQueue.length);
      if (count === 0) return prev;
      const toPlace = prev.eggQueue.slice(0, count);
      const targetMap = new Map<number, EggItemType>();
      available.slice(0, count).forEach((gridIdx, i) => {
        targetMap.set(gridIdx, toPlace[i]);
      });
      return {
        ...prev,
        eggQueue: prev.eggQueue.slice(count),
        grid: prev.grid.map((c) =>
          targetMap.has(c.index)
            ? { ...c, item: targetMap.get(c.index) ?? null, justMerged: true }
            : { ...c, justMerged: false }
        ),
      };
    });
    soundFX.playTapFeed();
    showToast(`تم إنزال ${dropCount} بيضة إلى الساحة!`);
  };

  // === ALLIANCE (السرب) ACTION HANDLERS ===
  const handleJoinPack = () => {
    if (state.pack.joined) return;
    const cond = { ...createInitialJoinConditions(), ...(state.pack.joinConditions ?? {}) };
    const playerPower = state.ducks.reduce((acc, d) => acc + (d.powerRating ?? 100), 0);
    const maxDragonLv = state.ducks.reduce((mx, d) => Math.max(mx, d.level), 1);

    if (playerPower < cond.minPower) {
      soundFX.playError();
      showToast(`شرط الانضمام: قوة تنانينك (${playerPower.toLocaleString()}) أقل من الحد المطلوب (${cond.minPower.toLocaleString()})!`);
      return;
    }
    if (state.ducks.length < cond.minDragons) {
      soundFX.playError();
      showToast(`شرط الانضمام: يلزم امتلاك ${cond.minDragons} تنانين على الأقل!`);
      return;
    }
    if (maxDragonLv < cond.minDragonLevel) {
      soundFX.playError();
      showToast(`شرط الانضمام: يلزم تنين بمستوى Lv.${cond.minDragonLevel} على الأقل!`);
      return;
    }

    setState((p) => {
      const energyGrant = withEarnedEnergy(p, 240);
      return {
        ...p,
        corn: energyGrant.corn,
        stars: p.stars + 3,
        treasury: withEarnedStars(energyGrant.treasury, 3),
        pack: {
          ...p.pack,
          joined: true,
          members: p.pack.members + 1,
          allianceCoins: (p.pack.allianceCoins ?? 60) + 50,
          questBaselines: p.pack.questBaselines ?? {
            feeds: p.stats.totalFeeds,
            merges: p.stats.totalMerges,
            errands: p.stats.totalErrands,
          },
          logs: appendAllianceLog(p.pack.logs, {
            type: 'JOIN',
            actor: p.username,
            message: `انضم رسمياً إلى صفوف ${p.pack.packName} وحصل على شارة العضوية!`,
          }),
        },
      };
    });
    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    showToast('انضممت إلى عش التنانين (+240⚡ و +3★ و +50 عملة سرب)!');
  };

  const handleLeavePack = () => {
    if (!state.pack.joined) return;
    setState((p) => ({
      ...p,
      pack: {
        ...p.pack,
        joined: false,
        members: Math.max(1, p.pack.members - 1),
        logs: appendAllianceLog(p.pack.logs, {
          type: 'ROLE',
          actor: p.username,
          message: `غادر صفوف ${p.pack.packName}.`,
        }),
      },
    }));
    soundFX.playTabSwitch();
    triggerTelegramHaptic('medium');
    showToast('غادرت السرب بنجاح. يمكنك الانضمام لاحقاً عند استيفاء الشروط.');
  };

  const handleUpdateJoinConditions = (nextCond: AllianceJoinConditions) => {
    const cleaned: AllianceJoinConditions = {
      minPower: Math.max(0, Math.min(50000, Math.round(nextCond.minPower))),
      minDragons: Math.max(1, Math.min(10, Math.round(nextCond.minDragons))),
      minDragonLevel: Math.max(1, Math.min(5, Math.round(nextCond.minDragonLevel))),
      autoAccept: Boolean(nextCond.autoAccept),
    };
    setState((p) => ({
      ...p,
      pack: {
        ...p.pack,
        joinConditions: cleaned,
        logs: appendAllianceLog(p.pack.logs, {
          type: 'ROLE',
          actor: p.username,
          message: `حدّث شروط الانضمام للسرب (قوة ${cleaned.minPower}+ · ${cleaned.minDragons}+ تنين · Lv.${cleaned.minDragonLevel}+).`,
        }),
      },
    }));
    soundFX.playGodConfirm();
    showToast('تم حفظ شروط الانضمام الجديدة للسرب!');
  };

  const lastAllianceDonateAtRef = useRef<number>(0);

  const handleDonateAlliance = (kind: AllianceDonationKind) => {
    const nowMs = Date.now();
    if (nowMs - lastAllianceDonateAtRef.current < 5000) {
      soundFX.playError();
      showToast('انتظر 5 ثوانٍ بين كل تبرع وآخر (حماية السبام)!');
      return;
    }
    const used = state.pack.donationsToday ?? 0;
    if (used >= ALLIANCE_DAILY_LIMITS.MAX_DONATIONS_PER_DAY) {
      soundFX.playError();
      showToast('وصلت للحد اليومي من تبرعات السرب!');
      return;
    }
    const tierMeta =
      ALLIANCE_DONATION_TIERS.find((t) => t.id === kind) ?? ALLIANCE_DONATION_TIERS[0];

    if (tierMeta.energyCost > 0 && state.corn < tierMeta.energyCost) {
      soundFX.playError();
      showToast(`تحتاج ${tierMeta.energyCost.toLocaleString()}⚡ لهذا التبرع!`);
      return;
    }
    if (tierMeta.goldCost > 0 && state.duckGold < tierMeta.goldCost) {
      soundFX.playError();
      showToast(`تحتاج ${tierMeta.goldCost} ذهب تنانين 💎 لهذا التبرع!`);
      return;
    }
    lastAllianceDonateAtRef.current = nowMs;

    if (getVerifiedSessionToken()) {
      const serverKind =
        tierMeta.goldCost > 0
          ? 'GOLD_OFFERING'
          : tierMeta.energyCost >= 500
            ? 'MED_ENERGY'
            : 'SMALL_ENERGY';
      const serverAmount = tierMeta.goldCost > 0 ? 10 : tierMeta.energyCost >= 500 ? 500 : 100;
      void postVerifiedDonate({
        allianceId: 'global_swarm_alpha',
        kind: serverKind,
        amount: serverAmount,
      });
    }

    const taxLv = state.pack.techLevels?.tech_treasury_tax ?? 0;
    const taxMult = 1 + taxLv * 0.12;
    const critRoll = Math.random();
    const critMult = critRoll < 0.06 ? 5 : critRoll < 0.16 ? 3 : critRoll < 0.36 ? 2 : 1;

    const vaultCornGain = Math.round(tierMeta.vaultCornGain * taxMult);
    const techGain = Math.round(tierMeta.techPointsGain * taxMult * critMult);
    const coinGain = Math.round(tierMeta.coinsGain * (critMult > 1 ? 1.45 : 1));
    const poolCornFeed = Math.round(vaultCornGain * 0.08);

    setState((p) => {
      const curLedger = { ...createInitialAllianceLedger(), ...(p.pack.ledger ?? {}) };
      const curPool = { ...createInitialRewardPool(), ...(p.pack.rewardPool ?? {}) };
      const nextTreasuryAfterEnergy =
        tierMeta.energyCost > 0 ? withBurnedEnergy(p.treasury, tierMeta.energyCost) : p.treasury;
      const nextTreasury =
        tierMeta.starsReward > 0
          ? withEarnedStars(nextTreasuryAfterEnergy, tierMeta.starsReward)
          : nextTreasuryAfterEnergy;

      let nextPack: GameState['pack'] = {
        ...p.pack,
        power: p.pack.power + tierMeta.powerGain,
        treasuryCorn: p.pack.treasuryCorn + vaultCornGain,
        allianceCoins: (p.pack.allianceCoins ?? 0) + coinGain,
        contributionTotal: (p.pack.contributionTotal ?? 0) + coinGain,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + tierMeta.activityGain),
        donationsToday: (p.pack.donationsToday ?? 0) + 1,
        rewardPool: {
          ...curPool,
          corn: curPool.corn + poolCornFeed,
          allianceCoins: curPool.allianceCoins + Math.round(coinGain * 0.25),
        },
        ledger: {
          ...curLedger,
          techPointsPool: curLedger.techPointsPool + techGain,
          vaultGold: curLedger.vaultGold + tierMeta.vaultGoldGain,
          playerEnergyDonated: curLedger.playerEnergyDonated + tierMeta.energyCost,
          playerGoldDonated: curLedger.playerGoldDonated + tierMeta.goldCost,
          playerTechDonated: curLedger.playerTechDonated + techGain,
          allianceTotalEnergyDonated: curLedger.allianceTotalEnergyDonated + vaultCornGain,
          allianceTotalGoldDonated: curLedger.allianceTotalGoldDonated + tierMeta.vaultGoldGain,
        },
        coopProgress: {
          ...createInitialCoopProgress(),
          ...(p.pack.coopProgress ?? {}),
          coop_treasury: Math.max(
            p.pack.treasuryCorn + vaultCornGain,
            (p.pack.coopProgress?.coop_treasury ?? 125000) + vaultCornGain
          ),
        },
        logs: appendAllianceLog(p.pack.logs, {
          type: 'DONATE',
          actor: p.username,
          message: `قدّم "${tierMeta.titleAr}" (+${vaultCornGain.toLocaleString()}⚡ للخزينة · +${techGain.toLocaleString()} بحث${critMult > 1 ? ` · مضاعف حظ ×${critMult}!` : ''}).`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, tierMeta.xpGain);

      return {
        ...p,
        corn: p.corn - tierMeta.energyCost,
        duckGold: p.duckGold - tierMeta.goldCost,
        stars: p.stars + tierMeta.starsReward,
        treasury: nextTreasury,
        pack: nextPack,
      };
    });

    soundFX.playClaim();
    triggerTelegramHaptic(critMult > 1 ? 'success' : 'light');
    showToast(
      `${critMult > 1 ? `🔥 ضربة حظ ×${critMult}! ` : ''}${tierMeta.titleAr}: +${coinGain.toLocaleString()}🪙 · +${techGain.toLocaleString()} بحث · +${vaultCornGain.toLocaleString()}⚡ خزينة!`
    );
  };

  // === ALLIANCE RESEARCH TREE HANDLERS (MEGA SCALE) ===
  const handleFundAllianceTech = (
    techId: AllianceTechId,
    mode: 'ENERGY_SMALL' | 'ENERGY_CONVOY' | 'POOL'
  ) => {
    const meta = ALLIANCE_RESEARCH_CATALOG.find((t) => t.id === techId);
    if (!meta) return;
    const curLv = state.pack.techLevels?.[techId] ?? 0;
    if (curLv >= meta.maxLevel) return;
    const marchLv = state.pack.techLevels?.tech_march_speed ?? 0;
    const req = getAllianceTechRequirements(techId, curLv, marchLv);
    const curFund = state.pack.techFunding?.[techId] ?? 0;
    if (curFund >= req.requiredTechPoints) {
      showToast('تمويل النقاط لهذا البحث مكتمل! يمكنك بدء التطوير الآن.');
      return;
    }

    if (mode === 'ENERGY_SMALL' || mode === 'ENERGY_CONVOY') {
      const energyCost = mode === 'ENERGY_CONVOY' ? 2500 : 500;
      const rawBoost = mode === 'ENERGY_CONVOY' ? 28000 : 5000;
      const coinsReward = mode === 'ENERGY_CONVOY' ? 480 : 90;
      const xpReward = mode === 'ENERGY_CONVOY' ? 14000 : 2800;

      if (state.corn < energyCost) {
        soundFX.playError();
        showToast(`تحتاج ${energyCost.toLocaleString()}⚡ لتمويل البحث!`);
        return;
      }
      const boostPts = Math.min(req.requiredTechPoints - curFund, rawBoost);
      setState((p) => {
        const curLedger = { ...createInitialAllianceLedger(), ...(p.pack.ledger ?? {}) };
        let nextPack: GameState['pack'] = {
          ...p.pack,
          treasuryCorn: p.pack.treasuryCorn + energyCost,
          allianceCoins: (p.pack.allianceCoins ?? 0) + coinsReward,
          contributionTotal: (p.pack.contributionTotal ?? 0) + coinsReward,
          activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 10),
          techFunding: {
            ...createInitialTechFunding(),
            ...(p.pack.techFunding ?? {}),
            [techId]: Math.min(req.requiredTechPoints, curFund + boostPts),
          },
          ledger: {
            ...curLedger,
            playerEnergyDonated: curLedger.playerEnergyDonated + energyCost,
            playerTechDonated: curLedger.playerTechDonated + boostPts,
            allianceTotalEnergyDonated: curLedger.allianceTotalEnergyDonated + energyCost,
          },
          logs: appendAllianceLog(p.pack.logs, {
            type: 'RESEARCH',
            actor: p.username,
            message: `موّل بحث "${meta.nameAr}" بـ +${boostPts.toLocaleString()} نقطة بحث (-${energyCost.toLocaleString()}⚡).`,
          }),
        };
        nextPack = applyAllianceXpAndLevelNotification(nextPack, xpReward);
        return {
          ...p,
          corn: p.corn - energyCost,
          treasury: withBurnedEnergy(p.treasury, energyCost),
          pack: nextPack,
        };
      });
      soundFX.playClaim();
      showToast(`تم تمويل "${meta.nameAr}" (+${boostPts.toLocaleString()} نقطة بحث · +${coinsReward}🪙)!`);
    } else {
      const pool = state.pack.ledger?.techPointsPool ?? 0;
      const chunk = Math.min(25000, req.requiredTechPoints - curFund, pool);
      if (chunk <= 0) {
        soundFX.playError();
        showToast('رصيد نقاط أبحاث السرب غير كافٍ! تبرّع للخزينة أو انتصر في الحشود.');
        return;
      }
      setState((p) => {
        const curLedger = { ...createInitialAllianceLedger(), ...(p.pack.ledger ?? {}) };
        const actualChunk = Math.min(
          25000,
          req.requiredTechPoints - (p.pack.techFunding?.[techId] ?? 0),
          curLedger.techPointsPool
        );
        if (actualChunk <= 0) return p;
        return {
          ...p,
          pack: {
            ...p.pack,
            allianceCoins: (p.pack.allianceCoins ?? 0) + 120,
            techFunding: {
              ...createInitialTechFunding(),
              ...(p.pack.techFunding ?? {}),
              [techId]: (p.pack.techFunding?.[techId] ?? 0) + actualChunk,
            },
            ledger: {
              ...curLedger,
              techPointsPool: curLedger.techPointsPool - actualChunk,
            },
            logs: appendAllianceLog(p.pack.logs, {
              type: 'RESEARCH',
              actor: p.username,
              message: `وجّه +${actualChunk.toLocaleString()} نقطة من مخزون السرب إلى "${meta.nameAr}".`,
            }),
          },
        };
      });
      soundFX.playClaim();
      showToast(`تم ضخ +${chunk.toLocaleString()} نقطة بحث من مخزون السرب!`);
    }
  };

  const handleConvertBlessingToResearch = (godId: string, targetTechId: AllianceTechId) => {
    const card = state.godCards.find((g) => g.id === godId);
    const missionMeta = ALLIANCE_BLESSING_RESEARCH_MISSIONS[godId];
    const techMeta = ALLIANCE_RESEARCH_CATALOG.find((t) => t.id === targetTechId);
    if (!card || !missionMeta || !techMeta) return;

    if (!card.owned) {
      soundFX.playError();
      showToast(`يلزم تفعيل بطاقة "${card.name}" أولاً لتحويلها إلى مهمة في أبحاث السرب!`);
      return;
    }
    if ((state.pack.convertedBlessingIds ?? []).includes(godId)) {
      soundFX.playError();
      showToast('تم تحويل هذه البطاقة إلى مهمة أبحاث السرب مسبقاً!');
      return;
    }

    const curLv = state.pack.techLevels?.[targetTechId] ?? 0;
    const marchLv = state.pack.techLevels?.tech_march_speed ?? 0;
    const req = getAllianceTechRequirements(targetTechId, curLv, marchLv);
    const curFund = state.pack.techFunding?.[targetTechId] ?? 0;
    const needed = Math.max(0, req.requiredTechPoints - curFund);
    const directApplied = Math.min(needed, missionMeta.techPointsGain);
    const overflowToPool = Math.max(0, missionMeta.techPointsGain - directApplied);

    setState((p) => {
      if ((p.pack.convertedBlessingIds ?? []).includes(godId)) return p;
      const curLedger = { ...createInitialAllianceLedger(), ...(p.pack.ledger ?? {}) };
      let nextPack: GameState['pack'] = {
        ...p.pack,
        convertedBlessingIds: [...(p.pack.convertedBlessingIds ?? []), godId],
        allianceCoins: (p.pack.allianceCoins ?? 0) + missionMeta.coinsGain,
        contributionTotal: (p.pack.contributionTotal ?? 0) + missionMeta.coinsGain,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + missionMeta.activityGain),
        techFunding: {
          ...createInitialTechFunding(),
          ...(p.pack.techFunding ?? {}),
          [targetTechId]: Math.min(req.requiredTechPoints, curFund + directApplied),
        },
        ledger: {
          ...curLedger,
          techPointsPool: curLedger.techPointsPool + overflowToPool,
          playerTechDonated: curLedger.playerTechDonated + missionMeta.techPointsGain,
        },
        logs: appendAllianceLog(p.pack.logs, {
          type: 'RESEARCH',
          actor: p.username,
          message: `حوّل بطاقة "${card.name}" إلى "${missionMeta.missionTitleAr}" (+${missionMeta.techPointsGain.toLocaleString()} نقطة نحو ${techMeta.nameAr})!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, missionMeta.allianceXpGain);
      return { ...p, pack: nextPack };
    });

    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    showToast(
      `✨ تحوّلت "${card.name}" لمهمة أبحاث السرب: +${missionMeta.techPointsGain.toLocaleString()} نقطة و +${missionMeta.coinsGain}🪙!`
    );
  };

  const handleStartAllianceResearch = (techId: AllianceTechId) => {
    if (state.pack.activeResearch) {
      soundFX.playError();
      showToast('يوجد بحث قيد التطوير حالياً في مختبر أبحاث السرب!');
      return;
    }
    const meta = ALLIANCE_RESEARCH_CATALOG.find((t) => t.id === techId);
    if (!meta) return;
    const curLv = state.pack.techLevels?.[techId] ?? 0;
    if (curLv >= meta.maxLevel) return;
    const marchLv = state.pack.techLevels?.tech_march_speed ?? 0;
    const req = getAllianceTechRequirements(techId, curLv, marchLv);
    const curFund = state.pack.techFunding?.[techId] ?? 0;
    const vaultGold = state.pack.ledger?.vaultGold ?? 0;

    if (curFund < req.requiredTechPoints) {
      soundFX.playError();
      showToast(`يلزم إكمال تمويل النقاط (${curFund.toLocaleString()}/${req.requiredTechPoints.toLocaleString()}) أولاً!`);
      return;
    }
    if (state.pack.treasuryCorn < req.requiredVaultCorn) {
      soundFX.playError();
      showToast(`خزينة السرب تحتاج ${req.requiredVaultCorn.toLocaleString()}⚡ لبدء هذا التطوير!`);
      return;
    }
    if (vaultGold < req.requiredVaultGold) {
      soundFX.playError();
      showToast(`خزينة السرب تحتاج ${req.requiredVaultGold}💎 ذهب التنانين لبدء التطوير!`);
      return;
    }

    const nowTs = Date.now();
    const researchObj: AllianceActiveResearch = {
      techId,
      targetLevel: req.nextLevel,
      startedAt: nowTs,
      endsAt: nowTs + req.durationMs,
      helpsReceived: 0,
    };

    setState((p) => {
      const curLedger = { ...createInitialAllianceLedger(), ...(p.pack.ledger ?? {}) };
      return {
        ...p,
        pack: {
          ...p.pack,
          treasuryCorn: p.pack.treasuryCorn - req.requiredVaultCorn,
          ledger: {
            ...curLedger,
            vaultGold: Math.max(0, curLedger.vaultGold - req.requiredVaultGold),
          },
          activeResearch: researchObj,
          logs: appendAllianceLog(p.pack.logs, {
            type: 'RESEARCH',
            actor: p.username,
            message: `أطلق تطوير "${meta.nameAr}" إلى المستوى ${req.nextLevel} (مدة الانتظار: ${req.durationHours} ساعة)!`,
          }),
        },
      };
    });
    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    showToast(`🔬 بدأ تطوير "${meta.nameAr}" (المدة: ${req.durationHours} ساعة)!`);
  };

  const handleSpeedupAllianceResearch = (mode: 'FREE' | 'GOLD_6H' | 'GOLD_24H') => {
    const active = state.pack.activeResearch;
    if (!active) return;
    if (mode === 'FREE') {
      if (active.helpsReceived >= 12) {
        soundFX.playError();
        showToast('اكتملت فزعات تسريع الأعضاء لهذا البحث (12/12)!');
        return;
      }
      const reductionMs = 60 * 60 * 1000;
      setState((p) => {
        if (!p.pack.activeResearch) return p;
        return {
          ...p,
          pack: {
            ...p.pack,
            allianceCoins: (p.pack.allianceCoins ?? 0) + 45,
            activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 6),
            activeResearch: {
              ...p.pack.activeResearch,
              endsAt: Math.max(Date.now() + 1000, p.pack.activeResearch.endsAt - reductionMs),
              helpsReceived: p.pack.activeResearch.helpsReceived + 1,
            },
          },
        };
      });
      soundFX.playClaim();
      showToast('فزعة السرب قلّصت وقت البحث -1 ساعة كاملة (+45🪙)!');
    } else {
      const goldCost = mode === 'GOLD_24H' ? 3 : 1;
      const hoursCut = mode === 'GOLD_24H' ? 24 : 6;
      if (state.duckGold < goldCost) {
        soundFX.playError();
        showToast(`تحتاج ${goldCost}💎 ذهب التنانين لتسريع البحث -${hoursCut} ساعة!`);
        return;
      }
      const reductionMs = hoursCut * 3600 * 1000;
      setState((p) => {
        if (!p.pack.activeResearch || p.duckGold < goldCost) return p;
        return {
          ...p,
          duckGold: p.duckGold - goldCost,
          pack: {
            ...p.pack,
            allianceCoins: (p.pack.allianceCoins ?? 0) + goldCost * 90,
            activeResearch: {
              ...p.pack.activeResearch,
              endsAt: Math.max(Date.now() + 500, p.pack.activeResearch.endsAt - reductionMs),
            },
          },
        };
      });
      soundFX.playGodConfirm();
      showToast(`⚡ تم تسريع بحث التحالف -${hoursCut} ساعة!`);
    }
  };

  const handleUpdateAllianceIdentity = (
    nextName: string,
    nextMotto: string,
    emblemId: AllianceEmblemId
  ) => {
    const cleanedName = nextName.trim().slice(0, 32) || state.pack.packName;
    const cleanedMotto =
      nextMotto.trim().slice(0, 72) || (state.pack.motto ?? 'وحدة التنانين تفتح أبواب المجد وعرش DMD');
    const emblemMeta =
      ALLIANCE_EMBLEM_CATALOG.find((e) => e.id === emblemId) ?? ALLIANCE_EMBLEM_CATALOG[0];

    setState((p) => ({
      ...p,
      pack: {
        ...p.pack,
        packName: cleanedName,
        motto: cleanedMotto,
        emblemId: emblemMeta.id,
        logs: appendAllianceLog(p.pack.logs, {
          type: 'ROLE',
          actor: p.username,
          message: `حدّث هوية التحالف إلى "${cleanedName}" واختار شعار "${emblemMeta.nameAr}".`,
        }),
      },
    }));
    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    showToast(`تم حفظ هوية السرب: ${cleanedName} (${emblemMeta.nameAr})!`);
  };

  // === ALLIANCE WAR MAP & COLLECTIVE RALLY HANDLERS ===
  const computeDragonRallyPower = (duck: Duck, phalanxLv: number) => {
    const base = Math.max(85, duck.powerRating ?? 100);
    const raw = Math.round(base * 14 + duck.level * 480 + (duck.customLevel ?? 0) * 180);
    return Math.round(raw * (1 + phalanxLv * 0.06));
  };

  const toRallyDragon = (duck: Duck, phalanxLv: number): AllianceRallyDragon => ({
    id: duck.id,
    name: duck.name,
    skin: duck.skin,
    rarity: duck.rarity,
    level: duck.level,
    power: computeDragonRallyPower(duck, phalanxLv),
  });

  const handleStartAllianceRally = (
    targetId: string,
    prepMinutes: number,
    selectedDragonIds?: string[]
  ) => {
    if (state.pack.activeRally) {
      soundFX.playError();
      showToast('يوجد حشد تحالف نشط حالياً على الخريطة!');
      return;
    }
    const target = ALLIANCE_MAP_TARGETS.find((t) => t.id === targetId);
    if (!target) return;

    const nowTs = Date.now();
    const cdUntil = state.pack.mapCooldowns?.[targetId] ?? 0;
    if (cdUntil > nowTs) {
      soundFX.playError();
      showToast('هذا الهدف في فترة استعادة الهدوء حالياً!');
      return;
    }
    if (state.corn < target.staminaCostCorn) {
      soundFX.playError();
      showToast(`تحتاج ${target.staminaCostCorn}⚡ لإطلاق نداء الحشد!`);
      return;
    }

    const prepMeta =
      ALLIANCE_RALLY_PREP_OPTIONS.find((o) => o.minutes === prepMinutes) ??
      ALLIANCE_RALLY_PREP_OPTIONS[1];
    const lvInfo = getAllianceLevelInfo(state.pack.xp ?? 2250);
    const rallyCapLv = state.pack.techLevels?.tech_rally_capacity ?? 0;
    const marchLv = state.pack.techLevels?.tech_march_speed ?? 0;
    const phalanxLv = state.pack.techLevels?.tech_dragon_phalanx ?? 0;
    const speedReduction = Math.min(0.65, marchLv * 0.04);
    const durationMs = Math.max(
      45 * 1000,
      Math.round(prepMeta.minutes * 60 * 1000 * (1 - speedReduction))
    );
    const maxSlots = 6 + rallyCapLv + lvInfo.rallySlotBonus;

    const chosenDucks =
      selectedDragonIds && selectedDragonIds.length > 0
        ? state.ducks.filter((d) => selectedDragonIds.includes(d.id))
        : [...state.ducks]
            .sort((a, b) => (b.powerRating ?? 100) - (a.powerRating ?? 100))
            .slice(0, Math.min(3, state.ducks.length));
    const playerDragons = (chosenDucks.length > 0 ? chosenDucks : state.ducks.slice(0, 1)).map((d) =>
      toRallyDragon(d, phalanxLv)
    );
    const playerEffectivePower = playerDragons.reduce((acc, d) => acc + d.power, 0);

    const captain = ALLIANCE_RALLY_REINFORCEMENT_POOL[0];
    const captainDragons = captain.dragons.map((dr) => ({
      ...dr,
      power: Math.round(dr.power * (1 + phalanxLv * 0.06)),
    }));

    const newRally: AllianceActiveRally = {
      id: `rally_${nowTs}`,
      targetId: target.id,
      targetNameAr: target.nameAr,
      targetType: target.type,
      coords: target.coords,
      requiredPower: target.requiredPower,
      maxSlots,
      prepMinutes: prepMeta.minutes,
      startedAt: nowTs,
      marchEndsAt: nowTs + durationMs,
      lootMultiplier: prepMeta.lootMult,
      participants: [
        {
          id: 'player_self',
          name: state.username,
          role: 'DEPUTY',
          power: playerEffectivePower,
          dragonsCount: playerDragons.length,
          dragons: playerDragons,
          joinedAt: nowTs,
        },
        {
          id: captain.id,
          name: captain.name,
          role: captain.role,
          power: captainDragons.reduce((acc, d) => acc + d.power, 0),
          dragonsCount: captainDragons.length,
          dragons: captainDragons,
          joinedAt: nowTs + 100,
        },
      ],
      status: 'GATHERING',
      helpUsedCount: 0,
    };

    const rallyInviteText = `📣 نداء حشد عاجل بتنانين الأعضاء! الهدف: "${target.nameAr}" (${target.coords.x}, ${target.coords.y}) · القوة المطلوبة ${target.requiredPower.toLocaleString()} · مضاعف الغنائم ×${prepMeta.lootMult}. أرسلوا تنانينكم الآن!`;

    setState((p) => ({
      ...p,
      corn: p.corn - target.staminaCostCorn,
      treasury: withBurnedEnergy(p.treasury, target.staminaCostCorn),
      pack: {
        ...p.pack,
        activeRally: newRally,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 15),
        notifications: appendAllianceNotification(p.pack.notifications, {
          category: 'RALLY_STARTED',
          titleAr: `حشد جديد نحو ${target.nameAr}!`,
          bodyAr: `أطلقه ${p.username} بـ ${playerDragons.length} تنين عند (${target.coords.x}, ${target.coords.y}) · مطلوب ${target.requiredPower.toLocaleString()} قوة جماعية.`,
          targetSubTab: 'MAP',
          inviteText: rallyInviteText,
        }),
        logs: appendAllianceLog(p.pack.logs, {
          type: 'RALLY',
          actor: p.username,
          message: `أطلق حشد السرب بـ ${playerDragons.length} تنين نحو "${target.nameAr}" (${target.coords.x}, ${target.coords.y}).`,
        }),
      },
    }));
    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    showToast(`📣 انطلق الحشد مع تنانينك (${playerDragons.length})! افتح تفاصيل الحشد لمتابعة المسير والتسريع!`);
  };

  const handleDispatchDragonToRally = (dragonId: string) => {
    const rally = state.pack.activeRally;
    if (!rally || rally.status === 'RESOLVED') return;
    const duck = state.ducks.find((d) => d.id === dragonId);
    if (!duck) return;

    const phalanxLv = state.pack.techLevels?.tech_dragon_phalanx ?? 0;
    const rallyDragon = toRallyDragon(duck, phalanxLv);

    setState((p) => {
      if (!p.pack.activeRally) return p;
      const selfPt = p.pack.activeRally.participants.find((pt) => pt.id === 'player_self');
      const alreadySent = (selfPt?.dragons ?? []).some((dr) => dr.id === dragonId);
      if (alreadySent) return p;

      const curLedger = { ...createInitialAllianceLedger(), ...(p.pack.ledger ?? {}) };
      return {
        ...p,
        pack: {
          ...p.pack,
          allianceCoins: (p.pack.allianceCoins ?? 0) + 45,
          contributionTotal: (p.pack.contributionTotal ?? 0) + 70,
          ledger: {
            ...curLedger,
            playerRallyContrib: curLedger.playerRallyContrib + rallyDragon.power,
          },
          activeRally: {
            ...p.pack.activeRally,
            participants: p.pack.activeRally.participants.map((pt) => {
              if (pt.id !== 'player_self') return pt;
              const nextDragons = [...(pt.dragons ?? []), rallyDragon];
              return {
                ...pt,
                power: pt.power + rallyDragon.power,
                dragonsCount: nextDragons.length,
                dragons: nextDragons,
              };
            }),
          },
          logs: appendAllianceLog(p.pack.logs, {
            type: 'RALLY',
            actor: p.username,
            message: `أرسل التنين "${duck.name}" [Lv.${duck.level}] للمشاركة في حشد "${p.pack.activeRally.targetNameAr}" (+${rallyDragon.power.toLocaleString()} قوة)!`,
          }),
        },
      };
    });
    soundFX.playClaim();
    triggerTelegramHaptic('light');
    showToast(`🐉 انطلق التنين "${duck.name}" إلى صفوف الحشد (+${rallyDragon.power.toLocaleString()} قوة)!`);
  };

  const handleReinforceRally = (mode: 'ALLY_CALL' | 'SELF_BOOST') => {
    const rally = state.pack.activeRally;
    if (!rally || rally.status === 'RESOLVED') return;

    if (mode === 'ALLY_CALL') {
      const joinedIds = new Set(rally.participants.map((pt) => pt.id));
      const available = ALLIANCE_RALLY_REINFORCEMENT_POOL.filter((m) => !joinedIds.has(m.id));
      const freeSlots = Math.max(0, rally.maxSlots - rally.participants.length);
      if (freeSlots === 0 || available.length === 0) {
        soundFX.playError();
        showToast('اكتملت جميع مقاعد الحشد! طوّر بحث "توسعة الحشود الملكية" أو ارفع مستوى السرب.');
        return;
      }
      const joining = available.slice(0, Math.min(3, freeSlots));
      const phalanxLv = state.pack.techLevels?.tech_dragon_phalanx ?? 0;
      const nowTs = Date.now();
      const addedParticipants = joining.map((m) => {
        const scaledDragons = m.dragons.map((dr) => ({
          ...dr,
          power: Math.round(dr.power * (1 + phalanxLv * 0.06)),
        }));
        return {
          id: m.id,
          name: m.name,
          role: m.role,
          power: scaledDragons.reduce((a, b) => a + b.power, 0),
          dragonsCount: scaledDragons.length,
          dragons: scaledDragons,
          joinedAt: nowTs,
        };
      });
      const powerAdded = addedParticipants.reduce((a, b) => a + b.power, 0);
      const dragonsAdded = addedParticipants.reduce((a, b) => a + b.dragonsCount, 0);

      setState((p) => {
        if (!p.pack.activeRally) return p;
        return {
          ...p,
          pack: {
            ...p.pack,
            activeRally: {
              ...p.pack.activeRally,
              participants: [...p.pack.activeRally.participants, ...addedParticipants],
            },
            logs: appendAllianceLog(p.pack.logs, {
              type: 'RALLY',
              actor: joining.map((j) => j.name).join(' و '),
              message: `أرسلوا ${dragonsAdded} تنانين للمهمة ودعموا الحشد بـ +${powerAdded.toLocaleString()} قوة جماعية!`,
            }),
          },
        };
      });
      soundFX.playClaim();
      triggerTelegramHaptic('light');
      showToast(`🐉 انضم ${joining.length} أعضاء وأرسلوا ${dragonsAdded} تنانين (+${powerAdded.toLocaleString()} قوة)!`);
    } else {
      if (state.corn < 250) {
        soundFX.playError();
        showToast('تحتاج 250⚡ لتعزيز طاقة تنانينك داخل الحشد!');
        return;
      }
      const boostPower = Math.max(
        2400,
        Math.round(state.ducks.reduce((acc, d) => acc + (d.powerRating ?? 100), 0) * 3.5)
      );
      setState((p) => {
        if (!p.pack.activeRally) return p;
        const curLedger = { ...createInitialAllianceLedger(), ...(p.pack.ledger ?? {}) };
        return {
          ...p,
          corn: p.corn - 250,
          treasury: withBurnedEnergy(p.treasury, 250),
          pack: {
            ...p.pack,
            allianceCoins: (p.pack.allianceCoins ?? 0) + 65,
            contributionTotal: (p.pack.contributionTotal ?? 0) + 100,
            ledger: {
              ...curLedger,
              playerRallyContrib: curLedger.playerRallyContrib + boostPower,
            },
            activeRally: {
              ...p.pack.activeRally,
              participants: p.pack.activeRally.participants.map((pt) =>
                pt.id === 'player_self'
                  ? { ...pt, power: pt.power + boostPower }
                  : pt
              ),
            },
          },
        };
      });
      soundFX.playClaim();
      showToast(`🔥 عزّزت طاقة تنانينك في الحشد (+${boostPower.toLocaleString()} قوة · +65🪙)!`);
    }
  };

  const handleSpeedupRally = (mode: 'ALLY_HELP' | 'RESOURCE_BOOST' | 'FAST_MARCH') => {
    const rally = state.pack.activeRally;
    if (!rally || rally.status !== 'GATHERING') return;

    if (mode === 'ALLY_HELP') {
      if (rally.helpUsedCount >= 5) {
        soundFX.playError();
        showToast('استُخدمت فزعات الأعضاء المجانية لهذا الحشد بالكامل (5/5)!');
        return;
      }
      const nowTs = Date.now();
      const nextEnds = Math.max(nowTs, rally.marchEndsAt - 15 * 60 * 1000);
      setState((p) => {
        if (!p.pack.activeRally) return p;
        return {
          ...p,
          pack: {
            ...p.pack,
            allianceCoins: (p.pack.allianceCoins ?? 0) + 25,
            activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 4),
            activeRally: {
              ...p.pack.activeRally,
              marchEndsAt: nextEnds,
              status: nextEnds <= nowTs ? 'READY' : 'GATHERING',
              helpUsedCount: p.pack.activeRally.helpUsedCount + 1,
            },
          },
        };
      });
      soundFX.playClaim();
      showToast('🐎 فزعة الأعضاء سرّعت مسير الحشد -15 دقيقة (+25🪙)!');
    } else if (mode === 'RESOURCE_BOOST') {
      if (state.corn < 100) {
        soundFX.playError();
        showToast('تحتاج 100⚡ لتسريع مسير الحشد -45 دقيقة!');
        return;
      }
      const nowTs = Date.now();
      const nextEnds = Math.max(nowTs, rally.marchEndsAt - 45 * 60 * 1000);
      setState((p) => {
        if (!p.pack.activeRally || p.corn < 100) return p;
        return {
          ...p,
          corn: p.corn - 100,
          treasury: withBurnedEnergy(p.treasury, 100),
          pack: {
            ...p.pack,
            allianceCoins: (p.pack.allianceCoins ?? 0) + 35,
            activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 5),
            activeRally: {
              ...p.pack.activeRally,
              marchEndsAt: nextEnds,
              status: nextEnds <= nowTs ? 'READY' : 'GATHERING',
            },
            logs: appendAllianceLog(p.pack.logs, {
              type: 'RALLY',
              actor: p.username,
              message: `ضغط تسريع مسير الحشد (-45 دقيقة · 100⚡).`,
            }),
          },
        };
      });
      soundFX.playClaim();
      showToast('⚡ تم تسريع مسير الحشد -45 دقيقة (+35🪙)!');
    } else {
      if (state.corn < 250) {
        soundFX.playError();
        showToast('تحتاج 250⚡ للتسريع الفائق -4 ساعات!');
        return;
      }
      const nowTs = Date.now();
      const nextEnds = Math.max(nowTs, rally.marchEndsAt - 240 * 60 * 1000);
      setState((p) => {
        if (!p.pack.activeRally || p.corn < 250) return p;
        return {
          ...p,
          corn: p.corn - 250,
          treasury: withBurnedEnergy(p.treasury, 250),
          pack: {
            ...p.pack,
            allianceCoins: (p.pack.allianceCoins ?? 0) + 75,
            activeRally: {
              ...p.pack.activeRally,
              marchEndsAt: nextEnds,
              status: nextEnds <= nowTs ? 'READY' : 'GATHERING',
            },
          },
        };
      });
      soundFX.playGodConfirm();
      showToast('🚀 تم التسريع الفائق لمسير التحشيد (-4 ساعات)!');
    }
  };

  const handleResolveAllianceRally = () => {
    const rally = state.pack.activeRally;
    if (!rally) return;
    const nowTs = Date.now();
    if (rally.status === 'GATHERING' && nowTs < rally.marchEndsAt) {
      soundFX.playError();
      showToast('الحشد ما زال في مرحلة التجمع والمسير! سرّع المسير أو انتظر انتهاء العدّاد.');
      return;
    }
    const target = ALLIANCE_MAP_TARGETS.find((t) => t.id === rally.targetId);
    if (!target) return;

    const lvInfo = getAllianceLevelInfo(state.pack.xp ?? 2250);
    const rallyCapLv = state.pack.techLevels?.tech_rally_capacity ?? 0;
    const siegeLv = state.pack.techLevels?.tech_pyramid_siege ?? 0;
    const divLv = state.pack.techLevels?.tech_dividend_vault ?? 0;

    const sdState = state.pack.swarmDragon ?? createInitialSwarmDragonState();
    const swarmBonusPower = sdState.unlocked ? computeSwarmDragonTotalStats(sdState).totalPower : 0;

    const rawPower =
      rally.participants.reduce((a, b) => a + b.power, 0) + swarmBonusPower;
    const totalPower = Math.round(rawPower * (1 + rallyCapLv * 0.08 + siegeLv * 0.12 + lvInfo.powerBonusPct / 100));
    const won = totalPower >= target.requiredPower;

    const lootBonus = rally.lootMultiplier * (1 + siegeLv * 0.1 + lvInfo.levelLootBonusPct / 100);
    const dividendBonusMult = 1 + divLv * 0.15;
    const vaultCornGain = won ? Math.round(target.rewards.vaultCorn * lootBonus) : 450;
    const techGain = won ? Math.round(target.rewards.techPts * lootBonus) : 120;
    const playerCoins = won ? Math.round(target.rewards.coins * lootBonus) : 65;
    const playerStars = won ? target.rewards.stars : 0;
    const playerGold = won ? target.rewards.gold : 0;
    const poolCornGain = won ? Math.round(target.rewards.poolCorn * lootBonus * dividendBonusMult) : 150;
    const poolCoinsGain = won ? Math.round(target.rewards.poolCoins * lootBonus * dividendBonusMult) : 40;
    const poolStarsGain = won ? Math.round(target.rewards.poolStars * dividendBonusMult) : 0;
    const xpGain = won ? target.allianceXpReward : 4500;

    setState((p) => {
      const curLedger = { ...createInitialAllianceLedger(), ...(p.pack.ledger ?? {}) };
      const curPool = { ...createInitialRewardPool(), ...(p.pack.rewardPool ?? {}) };
      const existingOccupied = (p.pack.occupiedSites ?? []).filter((s) => s.targetId !== target.id);
      const nextOccupied =
        won && target.occupyHours > 0
          ? [
              ...existingOccupied,
              {
                targetId: target.id,
                nameAr: target.nameAr,
                coords: target.coords,
                occupiedAt: nowTs,
                expiresAt: nowTs + target.occupyHours * 3600 * 1000,
                hourlyCornVault: Math.round(target.hourlyCornVault * (1 + divLv * 0.08)),
                hourlyTechPts: Math.round(target.hourlyTechPts * (1 + divLv * 0.08)),
                lastHarvestAt: nowTs,
              },
            ]
          : p.pack.occupiedSites ?? [];

      let nextNotifications = p.pack.notifications;
      if (won && target.type === 'PYRAMID') {
        nextNotifications = appendAllianceNotification(nextNotifications, {
          category: 'PYRAMID_CAPTURED',
          titleAr: `سيطر السرب على ${target.nameAr}!`,
          bodyAr: `احتلال ${target.occupyHours} ساعات يدرّ +${Math.round(target.hourlyCornVault * (1 + divLv * 0.08)).toLocaleString()}⚡/س للخزينة ويموّل صندوق التوزيع.`,
          targetSubTab: 'MAP',
          inviteText: `🏛️ تم احتلال "${target.nameAr}" لـ ${target.occupyHours} ساعات! ادخلوا لحصاد الخراج الساعي ورفع جدارة الأرباح.`,
        });
      }

      let nextPack: GameState['pack'] = {
        ...p.pack,
        treasuryCorn: p.pack.treasuryCorn + vaultCornGain,
        allianceCoins: (p.pack.allianceCoins ?? 0) + playerCoins,
        contributionTotal: (p.pack.contributionTotal ?? 0) + playerCoins,
        power: p.pack.power + (won ? 350 : 0),
        activeRally: null,
        occupiedSites: nextOccupied,
        mapCooldowns: {
          ...(p.pack.mapCooldowns ?? {}),
          [target.id]: nowTs + target.cooldownMinutes * 60 * 1000,
        },
        rewardPool: {
          ...curPool,
          corn: curPool.corn + poolCornGain,
          allianceCoins: curPool.allianceCoins + poolCoinsGain,
          stars: curPool.stars + poolStarsGain,
          duckGold: curPool.duckGold + (won ? 1 : 0),
        },
        notifications: nextNotifications,
        ledger: {
          ...curLedger,
          techPointsPool: curLedger.techPointsPool + techGain,
          playerRallyContrib: curLedger.playerRallyContrib + (won ? 1200 : 250),
          ralliesWon: curLedger.ralliesWon + (won ? 1 : 0),
          pyramidsCaptured:
            curLedger.pyramidsCaptured + (won && target.type === 'PYRAMID' ? 1 : 0),
        },
        logs: appendAllianceLog(p.pack.logs, {
          type: 'RALLY',
          actor: p.username,
          message: won
            ? `انتصر حشد السرب (${rally.participants.length} حلفاء) على "${target.nameAr}" بقوة ${totalPower.toLocaleString()}! (+${vaultCornGain.toLocaleString()}⚡ خزينة · +${poolCornGain.toLocaleString()}⚡ لصندوق التوزيع).`
            : `تراجع الحشد أمام "${target.nameAr}" (${totalPower.toLocaleString()} / ${target.requiredPower.toLocaleString()} قوة) — ادعوا حلفاء أكثر في المرة القادمة.`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, xpGain);

      return {
        ...p,
        stars: p.stars + playerStars,
        duckGold: p.duckGold + playerGold,
        eggQueue:
          won && target.rewards.egg ? [...p.eggQueue, target.rewards.egg] : p.eggQueue,
        breedingEggs:
          won && target.rewards.breedingEggs
            ? (p.breedingEggs ?? 0) + target.rewards.breedingEggs
            : p.breedingEggs,
        treasury: playerStars > 0 ? withEarnedStars(p.treasury, playerStars) : p.treasury,
        pack: nextPack,
      };
    });

    if (won) {
      soundFX.playVictory();
      triggerTelegramHaptic('success');
      showToast(
        `🏆 انتصار الحشد على ${target.nameAr}! +${playerCoins}🪙 +${playerStars}★ (+${vaultCornGain.toLocaleString()}⚡ للخزينة و +${poolCornGain.toLocaleString()}⚡ لصندوق التوزيع)!`
      );
    } else {
      soundFX.playError();
      showToast(
        `⚔️ القوة الجماعية (${totalPower.toLocaleString()}) أقل من المطلوب (${target.requiredPower.toLocaleString()})! طوّر أبحاث الحشود.`
      );
    }
  };

  const handleHarvestOccupiedSite = (targetId: string) => {
    const site = (state.pack.occupiedSites ?? []).find((s) => s.targetId === targetId);
    if (!site) return;
    const nowTs = Date.now();
    const elapsedHours = Math.max(0.2, (nowTs - site.lastHarvestAt) / 3600000);
    const vaultGain = Math.max(450, Math.round(site.hourlyCornVault * elapsedHours));
    const techGain = Math.max(140, Math.round(site.hourlyTechPts * elapsedHours));
    const poolShare = Math.round(vaultGain * 0.25);

    setState((p) => {
      const curLedger = { ...createInitialAllianceLedger(), ...(p.pack.ledger ?? {}) };
      const curPool = { ...createInitialRewardPool(), ...(p.pack.rewardPool ?? {}) };
      let nextPack: GameState['pack'] = {
        ...p.pack,
        treasuryCorn: p.pack.treasuryCorn + vaultGain,
        allianceCoins: (p.pack.allianceCoins ?? 0) + 120,
        ledger: {
          ...curLedger,
          techPointsPool: curLedger.techPointsPool + techGain,
          playerRallyContrib: curLedger.playerRallyContrib + 180,
        },
        rewardPool: {
          ...curPool,
          corn: curPool.corn + poolShare,
          allianceCoins: curPool.allianceCoins + 150,
          stars: curPool.stars + 2,
        },
        occupiedSites: (p.pack.occupiedSites ?? []).map((s) =>
          s.targetId === targetId ? { ...s, lastHarvestAt: nowTs } : s
        ),
        logs: appendAllianceLog(p.pack.logs, {
          type: 'RALLY',
          actor: p.username,
          message: `حصد خراج "${site.nameAr}" (+${vaultGain.toLocaleString()}⚡ للخزينة · +${techGain.toLocaleString()} بحث · +${poolShare.toLocaleString()}⚡ لصندوق التوزيع).`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 6500);
      return { ...p, pack: nextPack };
    });
    soundFX.playClaim();
    showToast(`🏛️ حُصد خراج ${site.nameAr}: +${vaultGain.toLocaleString()}⚡ للخزينة · +${techGain.toLocaleString()} بحث · +120🪙!`);
  };

  // === SMART NOTIFICATIONS, QUICK CHAT INVITE & DIVIDEND DISTRIBUTION HANDLERS ===
  const handleMarkNotificationRead = (notifId: string | 'ALL') => {
    setState((p) => ({
      ...p,
      pack: {
        ...p.pack,
        notifications: (p.pack.notifications ?? []).map((n) =>
          notifId === 'ALL' || n.id === notifId ? { ...n, read: true } : n
        ),
      },
    }));
  };

  const handleSendQuickAllianceInvite = (
    text: string,
    actionSubTab: 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'ROSTER' = 'MAP',
    actionLabel = 'مشاركة فورية'
  ) => {
    const clean = text.trim();
    if (!clean) return;
    setState((p) => ({
      ...p,
      pack: {
        ...p.pack,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 2),
        messages: [
          ...p.pack.messages,
          {
            id: `msg_inv_${Date.now()}`,
            sender: p.username,
            text: clean,
            time: new Date().toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isSystemInvite: true,
            actionSubTab,
            actionLabel,
          },
        ],
      },
    }));
    soundFX.playGodConfirm();
    triggerTelegramHaptic('light');
    showToast('📣 أُرسلت الدعوة التفاعلية في شات السرب بنجاح!');
  };

  const handleDistributeAllianceDividends = () => {
    const nowTs = Date.now();
    const lastAt = state.pack.lastDividendAt ?? 0;
    const cdLeft = Math.max(0, lastAt + ALLIANCE_DAILY_LIMITS.DIVIDEND_COOLDOWN_MS - nowTs);
    if (cdLeft > 0) {
      soundFX.playError();
      showToast(`الدورة القادمة لتوزيع مكافآت السرب متاحة بعد ${Math.ceil(cdLeft / 60000)} دقيقة.`);
      return;
    }

    const playerPower = state.ducks.reduce((acc, d) => acc + (d.powerRating ?? 100), 0);
    const breakdown = calculateAllianceDividendBreakdown(state, playerPower);
    const myShare = breakdown.playerShare;

    setState((p) => {
      const energyGrant = withEarnedEnergy(p, myShare.cornShare, true);
      const nextTreasury =
        myShare.starsShare > 0
          ? withEarnedStars(energyGrant.treasury, myShare.starsShare)
          : energyGrant.treasury;
      const curLedger = { ...createInitialAllianceLedger(), ...(p.pack.ledger ?? {}) };
      const curPool = { ...createInitialRewardPool(), ...(p.pack.rewardPool ?? {}) };
      const nextCycle = (curPool.cycleNumber ?? 1) + 1;

      let nextPack: GameState['pack'] = {
        ...p.pack,
        allianceCoins: (p.pack.allianceCoins ?? 0) + myShare.coinsShare,
        lastDividendAt: nowTs,
        rewardPool: {
          corn: 2400,
          allianceCoins: 450,
          stars: 6,
          duckGold: 2,
          cycleNumber: nextCycle,
        },
        ledger: {
          ...curLedger,
          totalDividendsClaimed: (curLedger.totalDividendsClaimed ?? 0) + 1,
        },
        logs: appendAllianceLog(p.pack.logs, {
          type: 'DIVIDEND',
          actor: p.username,
          message: `وزّع أرباح الدورة #${curPool.cycleNumber}: حصتك ${myShare.sharePct}% (+${myShare.cornShare.toLocaleString()}⚡ · +${myShare.coinsShare}🪙 · +${myShare.starsShare}★ · +${myShare.goldShare}💎).`,
        }),
        messages: [
          ...p.pack.messages,
          {
            id: `msg_div_${nowTs}`,
            sender: 'خزينة السرب',
            text: `💰 اكتمل توزيع غنائم الدورة #${curPool.cycleNumber} حسب الجدارة! حصتك: ${myShare.sharePct}% (+${myShare.cornShare.toLocaleString()}⚡ و +${myShare.coinsShare}🪙).`,
            time: new Date(nowTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            isSystemInvite: true,
            actionSubTab: 'ROSTER',
            actionLabel: 'عرض الحصص',
          },
        ],
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 8500);

      return {
        ...p,
        corn: energyGrant.corn,
        stars: p.stars + myShare.starsShare,
        duckGold: p.duckGold + myShare.goldShare,
        treasury: nextTreasury,
        pack: nextPack,
      };
    });

    soundFX.playChestOpen();
    triggerTelegramHaptic('success');
    showToast(
      `💰 استلمت حصتك (${myShare.sharePct}%): +${myShare.cornShare.toLocaleString()}⚡ +${myShare.coinsShare}🪙 +${myShare.starsShare}★ +${myShare.goldShare}💎!`
    );
  };

  const handleHelpAllies = () => {
    const used = state.pack.helpsToday ?? 0;
    if (used >= ALLIANCE_DAILY_LIMITS.MAX_HELPS_PER_DAY) {
      soundFX.playError();
      showToast('اكتملت مساعدات الإخوة لليوم!');
      return;
    }
    setState((p) => {
      const energyGrant = withEarnedEnergy(p, 80);
      let nextPack: GameState['pack'] = {
        ...p.pack,
        allianceCoins: (p.pack.allianceCoins ?? 0) + 60,
        contributionTotal: (p.pack.contributionTotal ?? 0) + 45,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 6),
        helpsToday: (p.pack.helpsToday ?? 0) + 1,
        logs: appendAllianceLog(p.pack.logs, {
          type: 'HELP',
          actor: p.username,
          message: 'ساعد إخوة السرب في تسريع التطوير وتجهيز العش.',
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 1800);
      return {
        ...p,
        corn: energyGrant.corn,
        treasury: energyGrant.treasury,
        pack: nextPack,
      };
    });
    soundFX.playClaim();
    triggerTelegramHaptic('light');
    showToast('ساعدت إخوة السرب (+60 🪙 · +80⚡ · +6 نشاط)!');
  };

  const handleAllianceBreedSpeedup = () => {
    const nowTs = Date.now();
    const lastHelp = state.pack.lastBreedHelpAt ?? 0;
    if (nowTs < lastHelp + ALLIANCE_DAILY_LIMITS.BREEDING_HELP_COOLDOWN_MS) {
      soundFX.playError();
      const mins = Math.ceil(
        (lastHelp + ALLIANCE_DAILY_LIMITS.BREEDING_HELP_COOLDOWN_MS - nowTs) / 60000
      );
      showToast(`مساعدة التزاوج متاحة بعد ${mins} دقيقة.`);
      return;
    }
    const activeCount = state.ducks.filter(
      (d) => d.breedingEndsAt && d.breedingEndsAt > nowTs
    ).length;
    if (activeCount === 0) {
      soundFX.playError();
      showToast('لا يوجد أي تنين في بوابة التزاوج حالياً!');
      return;
    }
    setState((p) => {
      let nextPack: GameState['pack'] = {
        ...p.pack,
        lastBreedHelpAt: nowTs,
        allianceCoins: (p.pack.allianceCoins ?? 0) + 70,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 10),
        logs: appendAllianceLog(p.pack.logs, {
          type: 'HELP',
          actor: p.username,
          message: `حصل على فزعة السرب لتقليص وقت التزاوج -2 ساعة لـ ${activeCount} تنين.`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 2600);
      return {
        ...p,
        ducks: p.ducks.map((d) =>
          d.breedingEndsAt && d.breedingEndsAt > nowTs
            ? {
                ...d,
                breedingEndsAt: Math.max(
                  nowTs,
                  d.breedingEndsAt - ALLIANCE_DAILY_LIMITS.BREEDING_HELP_REDUCTION_MS
                ),
              }
            : d
        ),
        pack: nextPack,
      };
    });
    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    showToast(`أرسل الإخوة دعمهم! تم تقليص وقت التزاوج -2 ساعة لـ ${activeCount} تنين!`);
  };

  const handleAttackAllianceBoss = () => {
    const used = state.pack.bossAttacksToday ?? 0;
    if (used >= ALLIANCE_DAILY_LIMITS.MAX_BOSS_ATTACKS_PER_DAY) {
      soundFX.playError();
      showToast(`استنفدت هجمات الزعيم اليومية (${ALLIANCE_DAILY_LIMITS.MAX_BOSS_ATTACKS_PER_DAY}/${ALLIANCE_DAILY_LIMITS.MAX_BOSS_ATTACKS_PER_DAY})!`);
      return;
    }
    const sdState = state.pack.swarmDragon ?? createInitialSwarmDragonState();
    const swarmDmgBonus = sdState.unlocked
      ? Math.round(computeSwarmDragonTotalStats(sdState).attack * 2.5)
      : 0;
    const totalPower = state.ducks.reduce((acc, d) => acc + (d.powerRating ?? 100), 0);
    if (getVerifiedSessionToken()) {
      void postVerifiedBattleResolve({
        mode: 'ALLIANCE_BOSS',
        rivalPower: state.pack.bossMaxHp ?? 12500,
        dragonIds: state.ducks.map((d) => d.id),
        clientClaimedPower: totalPower,
      });
    }
    const dmg = Math.max(
      420,
      Math.round(totalPower * 0.95 + (state.pack.talents?.fury ?? 0) * 95 + swarmDmgBonus)
    );
    const curHp = state.pack.bossHp ?? state.pack.bossMaxHp ?? 12500;
    const defeated = curHp - dmg <= 0;
    const bossLv = state.pack.bossLevel ?? 4;

    setState((p) => {
      const prevHp = p.pack.bossHp ?? p.pack.bossMaxHp ?? 12500;
      const isKill = prevHp - dmg <= 0;
      const nextLv = isKill ? (p.pack.bossLevel ?? 4) + 1 : p.pack.bossLevel ?? 4;
      const nextMaxHp = isKill ? 12500 + (nextLv - 4) * 4500 : p.pack.bossMaxHp ?? 12500;
      const nextHp = isKill ? nextMaxHp : prevHp - dmg;
      const energyGain = isKill ? 520 : 180;
      const coinGain = isKill ? 280 : 95;
      const starGain = isKill ? 4 : 0;
      const energyGrant = withEarnedEnergy(p, energyGain);
      const nextTreasury =
        starGain > 0 ? withEarnedStars(energyGrant.treasury, starGain) : energyGrant.treasury;
      const curPool = { ...createInitialRewardPool(), ...(p.pack.rewardPool ?? {}) };
      const curLedger = { ...createInitialAllianceLedger(), ...(p.pack.ledger ?? {}) };

      let nextPack: GameState['pack'] = {
        ...p.pack,
        bossLevel: nextLv,
        bossHp: nextHp,
        bossMaxHp: nextMaxHp,
        bossAttacksToday: (p.pack.bossAttacksToday ?? 0) + 1,
        allianceCoins: (p.pack.allianceCoins ?? 0) + coinGain,
        contributionTotal: (p.pack.contributionTotal ?? 0) + coinGain,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + (isKill ? 22 : 15)),
        power: p.pack.power + (isKill ? 120 : 30),
        ledger: {
          ...curLedger,
          playerRallyContrib: curLedger.playerRallyContrib + Math.round(dmg * 0.35),
        },
        rewardPool: {
          ...curPool,
          corn: curPool.corn + (isKill ? 1800 : 350),
          allianceCoins: curPool.allianceCoins + (isKill ? 380 : 80),
          stars: curPool.stars + (isKill ? 5 : 1),
        },
        coopProgress: {
          ...createInitialCoopProgress(),
          ...(p.pack.coopProgress ?? {}),
          coop_boss: (p.pack.coopProgress?.coop_boss ?? 48000) + dmg,
        },
        logs: appendAllianceLog(p.pack.logs, {
          type: 'BOSS',
          actor: p.username,
          message: isKill
            ? `أسقط زعيم السرب [Lv.${bossLv}] بضربة قاضية (${dmg.toLocaleString()} ضرر)!`
            : `هاجم زعيم السرب [Lv.${bossLv}] وألحق ${dmg.toLocaleString()} ضرر!`,
        }),
        messages: isKill
          ? [
              ...p.pack.messages,
              {
                id: `msg_boss_${Date.now()}`,
                sender: p.username,
                text: `🔥 حطّمت زعيم السرب [Lv.${bossLv}] بضربة ${dmg.toLocaleString()}! غنيمة للجميع وإضافة لصندوق الأرباح!`,
                time: new Date().toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              },
            ]
          : p.pack.messages,
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, isKill ? 18000 : 4500);

      return {
        ...p,
        corn: energyGrant.corn,
        stars: p.stars + starGain,
        treasury: nextTreasury,
        pack: nextPack,
      };
    });

    soundFX.playCritHit();
    triggerTelegramHaptic(defeated ? 'success' : 'medium');
    showToast(
      defeated
        ? `🏆 قُضي على زعيم السرب [Lv.${bossLv}]! +280🪙 +520⚡ +4★!`
        : `⚔️ ضربة ${dmg.toLocaleString()} للزعيم! +95🪙 و +180⚡!`
    );
  };

  const handleSupportCoopGoal = (coopId: AllianceCoopMissionMeta['id']) => {
    const goal = ALLIANCE_COOP_MISSIONS_CATALOG.find((g) => g.id === coopId);
    if (!goal) return;
    if (state.corn < goal.supportCostCorn) {
      soundFX.playError();
      showToast(`تحتاج ${goal.supportCostCorn}⚡ للمساهمة ودعم هذا الهدف التعاوني!`);
      return;
    }

    setState((p) => {
      if (p.corn < goal.supportCostCorn) return p;
      const baseCoop = { ...createInitialCoopProgress(), ...(p.pack.coopProgress ?? {}) };
      const curVal =
        coopId === 'coop_treasury'
          ? Math.max(p.pack.treasuryCorn, baseCoop[coopId] ?? goal.initialSeed)
          : baseCoop[coopId] ?? goal.initialSeed;
      const nextVal = curVal + goal.supportBoost;

      let nextPack: GameState['pack'] = {
        ...p.pack,
        treasuryCorn:
          coopId === 'coop_treasury'
            ? p.pack.treasuryCorn + goal.supportBoost
            : p.pack.treasuryCorn,
        allianceCoins: (p.pack.allianceCoins ?? 0) + 30,
        contributionTotal: (p.pack.contributionTotal ?? 0) + 35,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 10),
        coopProgress: {
          ...baseCoop,
          [coopId]: nextVal,
        },
        logs: appendAllianceLog(p.pack.logs, {
          type: 'COOP',
          actor: p.username,
          message: `دعم مهمة "${goal.titleAr}" بإضافة +${goal.supportBoost.toLocaleString()} ${goal.unitAr}!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 2500);

      return {
        ...p,
        corn: p.corn - goal.supportCostCorn,
        treasury: withBurnedEnergy(p.treasury, goal.supportCostCorn),
        pack: nextPack,
      };
    });

    soundFX.playClaim();
    triggerTelegramHaptic('light');
    showToast(`دعمت "${goal.titleAr}" (+${goal.supportBoost.toLocaleString()} ${goal.unitAr} · +30🪙)!`);
  };

  const handleClaimCoopGoal = (coopId: AllianceCoopMissionMeta['id']) => {
    const goal = ALLIANCE_COOP_MISSIONS_CATALOG.find((g) => g.id === coopId);
    if (!goal) return;
    if ((state.pack.claimedCoopGoals ?? []).includes(coopId)) return;

    const rawProg =
      coopId === 'coop_treasury'
        ? Math.max(state.pack.treasuryCorn, state.pack.coopProgress?.[coopId] ?? goal.initialSeed)
        : state.pack.coopProgress?.[coopId] ?? goal.initialSeed;
    if (rawProg < goal.target) {
      soundFX.playError();
      showToast('لم يكتمل الهدف الجماعي للسرب بعد!');
      return;
    }

    setState((p) => {
      if ((p.pack.claimedCoopGoals ?? []).includes(coopId)) return p;
      const energyGrant = withEarnedEnergy(p, goal.rewardCorn);
      const nextTreasury =
        goal.rewardStars > 0
          ? withEarnedStars(energyGrant.treasury, goal.rewardStars)
          : energyGrant.treasury;

      let nextPack: GameState['pack'] = {
        ...p.pack,
        claimedCoopGoals: [...(p.pack.claimedCoopGoals ?? []), coopId],
        allianceCoins: (p.pack.allianceCoins ?? 0) + goal.rewardCoins,
        contributionTotal: (p.pack.contributionTotal ?? 0) + goal.rewardCoins,
        logs: appendAllianceLog(p.pack.logs, {
          type: 'COOP',
          actor: p.username,
          message: `استلم المكافأة الجماعية لإنجاز "${goal.titleAr}" (+${goal.rewardCorn}⚡ · +${goal.rewardCoins}🪙)!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, goal.rewardXp);

      return {
        ...p,
        corn: energyGrant.corn,
        stars: p.stars + goal.rewardStars,
        duckGold: p.duckGold + goal.rewardGold,
        eggQueue: goal.rewardEgg ? [...p.eggQueue, goal.rewardEgg] : p.eggQueue,
        breedingEggs: (p.breedingEggs ?? 0) + (goal.rewardBreedingEggs ?? 0),
        treasury: nextTreasury,
        pack: nextPack,
      };
    });

    soundFX.playChestOpen();
    triggerTelegramHaptic('success');
    showToast(`🏆 أُنجزت المهمة التعاونية "${goal.titleAr}": +${goal.rewardCorn}⚡ +${goal.rewardCoins}🪙!`);
  };

  const handlePromoteDemoteMember = (memberId: string, direction: 'UP' | 'DOWN') => {
    const member = ALLIANCE_ROSTER_MEMBERS.find((m) => m.id === memberId);
    if (!member) return;
    const roleOrder: AllianceMemberRole[] = ['MEMBER', 'ELITE', 'DEPUTY'];
    const currentRole = state.pack.memberRoles?.[memberId] ?? member.role;
    if (currentRole === 'LEADER') return;

    const curIdx = roleOrder.indexOf(currentRole);
    const nextIdx = direction === 'UP' ? curIdx + 1 : curIdx - 1;
    if (nextIdx < 0 || nextIdx >= roleOrder.length) {
      soundFX.playError();
      showToast(direction === 'UP' ? 'وصل العضو لأعلى منصب متاح (نائب القائد)!' : 'العضو عند أدنى رتبة بالفعل!');
      return;
    }
    const nextRole = roleOrder[nextIdx];
    setState((p) => ({
      ...p,
      pack: {
        ...p.pack,
        memberRoles: {
          ...createInitialMemberRoles(),
          ...(p.pack.memberRoles ?? {}),
          [memberId]: nextRole,
        },
        logs: appendAllianceLog(p.pack.logs, {
          type: 'ROLE',
          actor: p.username,
          message: `${direction === 'UP' ? 'رقّى' : 'خفّض'} منصب ${member.name} إلى "${ALLIANCE_ROLE_META[nextRole].labelAr}".`,
        }),
      },
    }));
    soundFX.playGodConfirm();
    triggerTelegramHaptic('light');
    showToast(`${direction === 'UP' ? '⬆️ تمت ترقية' : '⬇️ تم خفض'} ${member.name} إلى ${ALLIANCE_ROLE_META[nextRole].labelAr}!`);
  };

  const handleKickMember = (memberId: string) => {
    const member = ALLIANCE_ROSTER_MEMBERS.find((m) => m.id === memberId);
    if (!member) return;
    const currentRole = state.pack.memberRoles?.[memberId] ?? member.role;
    if (currentRole === 'LEADER') {
      soundFX.playError();
      showToast('لا يمكن طرد قائد السرب!');
      return;
    }
    if ((state.pack.kickedMemberIds ?? []).includes(memberId)) return;

    setState((p) => ({
      ...p,
      pack: {
        ...p.pack,
        members: Math.max(2, p.pack.members - 1),
        power: Math.max(5000, p.pack.power - Math.round(member.power * 0.25)),
        kickedMemberIds: [...(p.pack.kickedMemberIds ?? []), memberId],
        logs: appendAllianceLog(p.pack.logs, {
          type: 'ROLE',
          actor: p.username,
          message: `طرد العضو ${member.name} من صفوف السرب.`,
        }),
      },
    }));
    soundFX.playTabSwitch();
    triggerTelegramHaptic('medium');
    showToast(`تم طرد ${member.name} من السرب.`);
  };

  const handleRecruitAllianceMember = () => {
    const lvInfo = getAllianceLevelInfo(state.pack.xp ?? 12500);
    if (state.pack.members >= lvInfo.maxMembers) {
      soundFX.playError();
      showToast(`وصل السرب للسعة القصوى (${lvInfo.maxMembers})! ارفع مستوى السرب لفتح مقاعد إضافية.`);
      return;
    }
    const kicked = state.pack.kickedMemberIds ?? [];
    setState((p) => {
      const nextKicked = kicked.length > 0 ? kicked.slice(1) : kicked;
      const restoredId = kicked.length > 0 ? kicked[0] : null;
      const restoredName = restoredId
        ? ALLIANCE_ROSTER_MEMBERS.find((m) => m.id === restoredId)?.name ?? 'عضو جديد'
        : `DRAGON_ALLY_${p.pack.members + 1}`;
      let nextPack: GameState['pack'] = {
        ...p.pack,
        members: Math.min(lvInfo.maxMembers, p.pack.members + 1),
        power: p.pack.power + 2400,
        kickedMemberIds: nextKicked,
        logs: appendAllianceLog(p.pack.logs, {
          type: 'JOIN',
          actor: restoredName,
          message: `انضم إلى صفوف السرب (+2,400 قوة جماعية)!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 1800);
      return { ...p, pack: nextPack };
    });
    soundFX.playClaim();
    showToast('🛡️ انضم عضو جديد إلى صفوف السرب (+2,400 قوة)!');
  };

  // === SWARM DRAGON HANDLERS (تنين السرب) ===
  const handleDonateDragonToSwarm = (dragonId: string) => {
    if (state.ducks.length <= 1) {
      soundFX.playError();
      showToast('يجب أن تحتفظ بتنين واحد على الأقل لخوض الحلبة والمهام!');
      return;
    }
    const dragon = state.ducks.find((d) => d.id === dragonId);
    if (!dragon) return;

    const extracted = extractDragonTransferStats(dragon);
    const curSd = state.pack.swarmDragon ?? createInitialSwarmDragonState();
    const wasUnlocked = curSd.unlocked;
    const nextCount = curSd.donatedCount + 1;
    const willUnlock = wasUnlocked || nextCount >= curSd.requiredDragons;

    setState((p) => {
      if (p.ducks.length <= 1) return p;
      const targetDragon = p.ducks.find((d) => d.id === dragonId);
      if (!targetDragon) return p;

      const remainingDucks = normalizeDragonSlots(
        p.ducks.filter((d) => d.id !== dragonId),
        p.unlockedSlots
      );
      const sd = p.pack.swarmDragon ?? createInitialSwarmDragonState();
      const entry = {
        id: `sd_user_${Date.now()}`,
        donorName: p.username,
        dragonName: targetDragon.name,
        skin: targetDragon.skin,
        rarity: targetDragon.rarity,
        level: targetDragon.level,
        customLevel: targetDragon.customLevel ?? 0,
        sizeTier: extracted.sizeTier,
        gear: extracted.gear,
        aura: extracted.aura,
        skillLevel: extracted.skillLevel,
        trainingLevel: extracted.trainingLevel,
        powerAdded: extracted.powerAdded,
        hpAdded: extracted.hpAdded,
        attackAdded: extracted.attackAdded,
        defenseAdded: extracted.defenseAdded,
        speedAdded: extracted.speedAdded,
        donatedAt: Date.now(),
      };

      const nextGearIds =
        extracted.gear !== 'none' && !sd.inheritedGearIds.includes(extracted.gear)
          ? [...sd.inheritedGearIds, extracted.gear]
          : sd.inheritedGearIds;
      const nextAuraIds =
        extracted.aura !== 'auto' && !sd.inheritedAuraIds.includes(extracted.aura)
          ? [...sd.inheritedAuraIds, extracted.aura]
          : sd.inheritedAuraIds;
      const nextSkins = !sd.inheritedSkins.includes(targetDragon.skin)
        ? [...sd.inheritedSkins, targetDragon.skin]
        : sd.inheritedSkins;

      const updatedCount = sd.donatedCount + 1;
      const unlockedNow = sd.unlocked || updatedCount >= sd.requiredDragons;
      const nextSd = {
        ...sd,
        unlocked: unlockedNow,
        donatedCount: updatedCount,
        inheritedPower: sd.inheritedPower + extracted.powerAdded,
        inheritedHp: sd.inheritedHp + extracted.hpAdded,
        inheritedAttack: sd.inheritedAttack + extracted.attackAdded,
        inheritedDefense: sd.inheritedDefense + extracted.defenseAdded,
        inheritedSpeed: sd.inheritedSpeed + extracted.speedAdded,
        inheritedGearIds: nextGearIds,
        inheritedAuraIds: nextAuraIds,
        inheritedSkins: nextSkins,
        donations: [entry, ...sd.donations],
      };

      let nextPack: GameState['pack'] = {
        ...p.pack,
        power: p.pack.power + extracted.powerAdded,
        allianceCoins: (p.pack.allianceCoins ?? 0) + 380,
        contributionTotal: (p.pack.contributionTotal ?? 0) + 450,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 25),
        swarmDragon: nextSd,
        logs: appendAllianceLog(p.pack.logs, {
          type: 'DRAGON',
          actor: p.username,
          message: `تبرّع بتنين "${targetDragon.name}" إلى تنين السرب ونقل جميع خصائصه (+${extracted.powerAdded.toLocaleString()} قوة · +${extracted.hpAdded} HP · +${extracted.attackAdded} ATK)!${
            !sd.unlocked && unlockedNow ? ' 🐉 فُتح تنين السرب رسمياً!' : ''
          }`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 15000);

      return {
        ...p,
        ducks: remainingDucks,
        activeDuckIndex: Math.min(p.activeDuckIndex, Math.max(0, remainingDucks.length - 1)),
        pack: nextPack,
      };
    });

    soundFX.playChestOpen();
    triggerTelegramHaptic('success');
    showToast(
      !wasUnlocked && willUnlock
        ? `🐉 مبروك! تم فتح تنين السرب وانتقلت جميع خصائص "${dragon.name}" إليه (+${extracted.powerAdded.toLocaleString()} قوة)!`
        : `🐉 انتقلت جميع خصائص "${dragon.name}" إلى تنين السرب (+${extracted.powerAdded.toLocaleString()} قوة · +380🪙)!`
    );
  };

  const handleAllyDonateDragonToSwarm = () => {
    const sponsorCostCorn = 450;
    if (state.corn < sponsorCostCorn) {
      soundFX.playError();
      showToast(`تحتاج ${sponsorCostCorn}⚡ لاستقدام تبرع تنين من أحد أعضاء السرب!`);
      return;
    }
    const sd = state.pack.swarmDragon ?? createInitialSwarmDragonState();
    const wasUnlocked = sd.unlocked;
    const allyPool = ALLIANCE_RALLY_REINFORCEMENT_POOL;
    const chosenMember = allyPool[(sd.donatedCount + 1) % allyPool.length];
    const allyDragon = chosenMember.dragons[0];
    const statsFromAlly = {
      powerAdded: Math.round(allyDragon.power * 0.35),
      hpAdded: 950 + allyDragon.level * 180,
      attackAdded: 145 + allyDragon.level * 28,
      defenseAdded: 105 + allyDragon.level * 20,
      speedAdded: 85 + allyDragon.level * 10,
    };

    setState((p) => {
      const curSd = p.pack.swarmDragon ?? createInitialSwarmDragonState();
      const updatedCount = curSd.donatedCount + 1;
      const unlockedNow = curSd.unlocked || updatedCount >= curSd.requiredDragons;
      const entry = {
        id: `sd_ally_${Date.now()}`,
        donorName: chosenMember.name,
        dragonName: allyDragon.name,
        skin: allyDragon.skin,
        rarity: allyDragon.rarity,
        level: allyDragon.level,
        customLevel: 2,
        sizeTier: 'NORMAL' as const,
        gear: 'wings' as DuckGearId,
        aura: 'flame' as DuckAuraId,
        skillLevel: 2,
        trainingLevel: 2,
        powerAdded: statsFromAlly.powerAdded,
        hpAdded: statsFromAlly.hpAdded,
        attackAdded: statsFromAlly.attackAdded,
        defenseAdded: statsFromAlly.defenseAdded,
        speedAdded: statsFromAlly.speedAdded,
        donatedAt: Date.now(),
      };
      const nextSkins = !curSd.inheritedSkins.includes(allyDragon.skin)
        ? [...curSd.inheritedSkins, allyDragon.skin]
        : curSd.inheritedSkins;

      let nextPack: GameState['pack'] = {
        ...p.pack,
        power: p.pack.power + statsFromAlly.powerAdded,
        allianceCoins: (p.pack.allianceCoins ?? 0) + 140,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 12),
        swarmDragon: {
          ...curSd,
          unlocked: unlockedNow,
          donatedCount: updatedCount,
          inheritedPower: curSd.inheritedPower + statsFromAlly.powerAdded,
          inheritedHp: curSd.inheritedHp + statsFromAlly.hpAdded,
          inheritedAttack: curSd.inheritedAttack + statsFromAlly.attackAdded,
          inheritedDefense: curSd.inheritedDefense + statsFromAlly.defenseAdded,
          inheritedSpeed: curSd.inheritedSpeed + statsFromAlly.speedAdded,
          inheritedSkins: nextSkins,
          donations: [entry, ...curSd.donations],
        },
        logs: appendAllianceLog(p.pack.logs, {
          type: 'DRAGON',
          actor: chosenMember.name,
          message: `تبرع بتنين "${allyDragon.name}" لتنين السرب بدعم من ${p.username} (+${statsFromAlly.powerAdded.toLocaleString()} قوة)!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 8500);
      return {
        ...p,
        corn: p.corn - sponsorCostCorn,
        treasury: withBurnedEnergy(p.treasury, sponsorCostCorn),
        pack: nextPack,
      };
    });

    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    showToast(
      !wasUnlocked && sd.donatedCount + 1 >= sd.requiredDragons
        ? `🐉 اكتمل النصاب (${sd.requiredDragons}/${sd.requiredDragons}) وفُتح تنين السرب رسمياً!`
        : `🐉 أضاف ${chosenMember.name} تنين "${allyDragon.name}" إلى تنين السرب!`
    );
  };

  const handleTrainSwarmDragon = () => {
    const sd = state.pack.swarmDragon ?? createInitialSwarmDragonState();
    if (!sd.unlocked) {
      soundFX.playError();
      showToast(`يلزم أولاً إكمال تبرعات التنانين (${sd.donatedCount}/${sd.requiredDragons}) لفتح تنين السرب!`);
      return;
    }
    if (sd.level >= 50) return;
    const cost = getSwarmDragonLevelUpCost(sd.level);
    if (state.corn < cost.energyCost) {
      soundFX.playError();
      showToast(`تحتاج ${cost.energyCost.toLocaleString()}⚡ لرفع مستوى تنين السرب!`);
      return;
    }
    if ((state.pack.allianceCoins ?? 0) < cost.coinsCost) {
      soundFX.playError();
      showToast(`تحتاج ${cost.coinsCost}🪙 عملة سرب لرفع مستوى تنين السرب!`);
      return;
    }

    setState((p) => {
      const curSd = p.pack.swarmDragon ?? createInitialSwarmDragonState();
      if (!curSd.unlocked || curSd.level >= 50) return p;
      const nextLv = curSd.level + 1;
      let nextPack: GameState['pack'] = {
        ...p.pack,
        allianceCoins: Math.max(0, (p.pack.allianceCoins ?? 0) - cost.coinsCost),
        power: p.pack.power + 620,
        contributionTotal: (p.pack.contributionTotal ?? 0) + cost.coinsCost,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 10),
        swarmDragon: {
          ...curSd,
          level: nextLv,
          xp: 0,
        },
        logs: appendAllianceLog(p.pack.logs, {
          type: 'DRAGON',
          actor: p.username,
          message: `رقّى مستوى "${curSd.name}" إلى Lv.${nextLv}!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 5200);
      return {
        ...p,
        corn: p.corn - cost.energyCost,
        treasury: withBurnedEnergy(p.treasury, cost.energyCost),
        pack: nextPack,
      };
    });

    soundFX.playLevelUp();
    triggerTelegramHaptic('success');
    showToast(`⬆️ ارتقى تنين السرب إلى المستوى Lv.${sd.level + 1}!`);
  };

  const handleUpgradeSwarmDragonSkill = (key: SwarmDragonUpgradeKey) => {
    const sd = state.pack.swarmDragon ?? createInitialSwarmDragonState();
    if (!sd.unlocked) {
      soundFX.playError();
      showToast('افتح تنين السرب أولاً عبر التبرع بالتنانين!');
      return;
    }
    const meta = SWARM_DRAGON_UPGRADE_CATALOG.find((u) => u.key === key);
    if (!meta) return;
    const curRank = sd.upgrades?.[key] ?? 0;
    if (curRank >= meta.maxLevel) return;
    const cost = getSwarmDragonUpgradeCost(key, curRank);

    if (state.corn < cost.energyCost || (state.pack.allianceCoins ?? 0) < cost.coinsCost) {
      soundFX.playError();
      showToast(`تحتاج ${cost.energyCost.toLocaleString()}⚡ و ${cost.coinsCost}🪙 للترقية!`);
      return;
    }

    setState((p) => {
      const curSd = p.pack.swarmDragon ?? createInitialSwarmDragonState();
      const nextRank = (curSd.upgrades?.[key] ?? 0) + 1;
      let nextPack: GameState['pack'] = {
        ...p.pack,
        allianceCoins: Math.max(0, (p.pack.allianceCoins ?? 0) - cost.coinsCost),
        power: p.pack.power + 320,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 8),
        swarmDragon: {
          ...curSd,
          upgrades: {
            ...curSd.upgrades,
            [key]: nextRank,
          },
        },
        logs: appendAllianceLog(p.pack.logs, {
          type: 'DRAGON',
          actor: p.username,
          message: `طوّر "${meta.nameAr}" لتنين السرب إلى Lv.${nextRank}!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 3800);
      return {
        ...p,
        corn: p.corn - cost.energyCost,
        treasury: withBurnedEnergy(p.treasury, cost.energyCost),
        pack: nextPack,
      };
    });

    soundFX.playLevelUp();
    showToast(`🔥 تطوّر "${meta.nameAr}" إلى Lv.${curRank + 1}!`);
  };

  const handleUpgradeSwarmDragonGear = (slot: SwarmDragonGearSlot) => {
    const sd = state.pack.swarmDragon ?? createInitialSwarmDragonState();
    if (!sd.unlocked) {
      soundFX.playError();
      showToast('افتح تنين السرب أولاً لصقل العتاد!');
      return;
    }
    const meta = SWARM_DRAGON_GEAR_CATALOG.find((g) => g.slot === slot);
    if (!meta) return;
    const curLv = sd.gearLevels?.[slot] ?? 0;
    if (curLv >= meta.maxLevel) return;
    const cost = getSwarmDragonGearUpgradeCost(slot, curLv);

    if ((state.pack.allianceCoins ?? 0) < cost.coinsCost || state.duckGold < cost.goldCost) {
      soundFX.playError();
      showToast(`تحتاج ${cost.coinsCost}🪙 و ${cost.goldCost}💎 لصقل هذا العتاد!`);
      return;
    }

    setState((p) => {
      const curSd = p.pack.swarmDragon ?? createInitialSwarmDragonState();
      const nextLv = (curSd.gearLevels?.[slot] ?? 0) + 1;
      let nextPack: GameState['pack'] = {
        ...p.pack,
        allianceCoins: Math.max(0, (p.pack.allianceCoins ?? 0) - cost.coinsCost),
        power: p.pack.power + 420,
        activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + 10),
        swarmDragon: {
          ...curSd,
          gearLevels: {
            ...curSd.gearLevels,
            [slot]: nextLv,
          },
        },
        logs: appendAllianceLog(p.pack.logs, {
          type: 'DRAGON',
          actor: p.username,
          message: `صقل عتاد "${meta.nameAr}" لتنين السرب إلى Lv.${nextLv}!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 4800);
      return {
        ...p,
        duckGold: p.duckGold - cost.goldCost,
        pack: nextPack,
      };
    });

    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    showToast(`🛡️ ارتقى عتاد "${meta.nameAr}" إلى +${curLv + 1}!`);
  };

  const handleSelectSwarmDragonSkin = (skin: DuckSkinId) => {
    setState((p) => {
      const curSd = p.pack.swarmDragon ?? createInitialSwarmDragonState();
      return {
        ...p,
        pack: {
          ...p.pack,
          swarmDragon: {
            ...curSd,
            skin,
          },
        },
      };
    });
    soundFX.playTapFeed();
  };

  const handleClaimAllianceQuest = (questId: AllianceQuestMeta['id']) => {
    const quest = ALLIANCE_QUESTS_CATALOG.find((q) => q.id === questId);
    if (!quest) return;
    if ((state.pack.claimedAllianceQuests ?? []).includes(questId)) return;

    setState((p) => {
      if ((p.pack.claimedAllianceQuests ?? []).includes(questId)) return p;
      const energyGrant = withEarnedEnergy(p, quest.corn);
      const nextPack = applyAllianceXpAndLevelNotification(
        {
          ...p.pack,
          claimedAllianceQuests: [...(p.pack.claimedAllianceQuests ?? []), questId],
          allianceCoins: (p.pack.allianceCoins ?? 0) + quest.allianceCoins,
          contributionTotal: (p.pack.contributionTotal ?? 0) + quest.allianceCoins,
          activityPoints: Math.min(100, (p.pack.activityPoints ?? 0) + quest.activityPts),
        },
        quest.xp
      );
      return {
        ...p,
        corn: energyGrant.corn,
        stars: p.stars + quest.stars,
        treasury: withEarnedStars(energyGrant.treasury, quest.stars),
        pack: nextPack,
      };
    });
    soundFX.playClaim();
    triggerTelegramHaptic('success');
    showToast(`أُنجزت مهمة "${quest.titleAr}": +${quest.allianceCoins}🪙 +${quest.corn}⚡ +${quest.stars}★!`);
  };

  const handleClaimActivityChest = (threshold: number) => {
    const chest = ALLIANCE_ACTIVITY_CHESTS.find((c) => c.threshold === threshold);
    if (!chest) return;
    if ((state.pack.activityPoints ?? 0) < threshold) return;
    if ((state.pack.claimedActivityChests ?? []).includes(threshold)) return;

    setState((p) => {
      if ((p.pack.claimedActivityChests ?? []).includes(threshold)) return p;
      const energyGrant = withEarnedEnergy(p, chest.corn);
      const nextPack = applyAllianceXpAndLevelNotification(
        {
          ...p.pack,
          claimedActivityChests: [...(p.pack.claimedActivityChests ?? []), threshold],
          allianceCoins: (p.pack.allianceCoins ?? 0) + chest.allianceCoins,
        },
        3500
      );
      return {
        ...p,
        corn: energyGrant.corn,
        stars: p.stars + chest.stars,
        duckGold: p.duckGold + chest.duckGold,
        treasury: withEarnedStars(energyGrant.treasury, chest.stars),
        pack: nextPack,
      };
    });
    soundFX.playChestOpen();
    triggerTelegramHaptic('success');
    showToast(`تم فتح ${chest.titleAr}: +${chest.corn}⚡ +${chest.allianceCoins}🪙 +${chest.stars}★!`);
  };

  const handleClaimAllianceGift = (giftId: string) => {
    const gift = (state.pack.gifts ?? []).find((g) => g.id === giftId);
    if (!gift || gift.claimed) return;
    setState((p) => {
      const target = (p.pack.gifts ?? []).find((g) => g.id === giftId);
      if (!target || target.claimed) return p;
      const energyGrant = withEarnedEnergy(p, target.corn);
      return {
        ...p,
        corn: energyGrant.corn,
        stars: p.stars + target.stars,
        treasury: withEarnedStars(energyGrant.treasury, target.stars),
        pack: {
          ...p.pack,
          allianceCoins: (p.pack.allianceCoins ?? 0) + target.allianceCoins,
          gifts: (p.pack.gifts ?? []).map((g) =>
            g.id === giftId ? { ...g, claimed: true } : g
          ),
        },
      };
    });
    soundFX.playClaim();
    showToast(`استلمت ${gift.titleAr}: +${gift.corn}⚡ +${gift.allianceCoins}🪙!`);
  };

  const handleClaimAllAllianceGifts = () => {
    const unclaimed = (state.pack.gifts ?? []).filter((g) => !g.claimed);
    if (unclaimed.length === 0) return;
    const sumCorn = unclaimed.reduce((a, g) => a + g.corn, 0);
    const sumStars = unclaimed.reduce((a, g) => a + g.stars, 0);
    const sumCoins = unclaimed.reduce((a, g) => a + g.allianceCoins, 0);

    setState((p) => {
      const energyGrant = withEarnedEnergy(p, sumCorn);
      return {
        ...p,
        corn: energyGrant.corn,
        stars: p.stars + sumStars,
        treasury: withEarnedStars(energyGrant.treasury, sumStars),
        pack: {
          ...p.pack,
          allianceCoins: (p.pack.allianceCoins ?? 0) + sumCoins,
          gifts: (p.pack.gifts ?? []).map((g) => ({ ...g, claimed: true })),
        },
      };
    });
    soundFX.playChestOpen();
    triggerTelegramHaptic('success');
    showToast(`استلمت ${unclaimed.length} هدايا (+${sumCorn}⚡ +${sumCoins}🪙 +${sumStars}★)!`);
  };

  const handleBuyAllianceShopOffer = (offerId: AllianceShopOffer['id']) => {
    const offer = ALLIANCE_SHOP_CATALOG.find((o) => o.id === offerId);
    if (!offer) return;
    const coins = state.pack.allianceCoins ?? 0;
    if (coins < offer.costCoins) {
      soundFX.playError();
      showToast(`تحتاج ${offer.costCoins} عملة سرب للشراء!`);
      return;
    }

    setState((p) => {
      if ((p.pack.allianceCoins ?? 0) < offer.costCoins) return p;
      const nextCoins = (p.pack.allianceCoins ?? 0) - offer.costCoins;
      const nextPack = { ...p.pack, allianceCoins: nextCoins };
      if (offer.id === 'shop_energy') {
        const energyGrant = withEarnedEnergy(p, 650);
        return { ...p, corn: energyGrant.corn, treasury: energyGrant.treasury, pack: nextPack };
      }
      if (offer.id === 'shop_eggs') {
        return { ...p, eggQueue: [...p.eggQueue, 'egg_2', 'egg_2'], pack: nextPack };
      }
      if (offer.id === 'shop_breed_eggs') {
        return { ...p, breedingEggs: (p.breedingEggs ?? 0) + 3, pack: nextPack };
      }
      if (offer.id === 'shop_stars') {
        return {
          ...p,
          stars: p.stars + 6,
          treasury: withEarnedStars(p.treasury, 6),
          pack: nextPack,
        };
      }
      if (offer.id === 'shop_automerge') {
        return {
          ...p,
          stats: { ...p.stats, autoMergeBoosters: p.stats.autoMergeBoosters + 2 },
          pack: nextPack,
        };
      }
      if (offer.id === 'shop_hammer') {
        return {
          ...p,
          stats: { ...p.stats, hammerBoosters: p.stats.hammerBoosters + 2 },
          pack: nextPack,
        };
      }
      return { ...p, duckGold: p.duckGold + 5, pack: nextPack };
    });

    soundFX.playClaim();
    triggerTelegramHaptic('success');
    showToast(`تم شراء "${offer.titleAr}" (${offer.badgeText})!`);
  };

  const handleActivateGod = (godId: string, payWith: 'gold' | 'stars') => {
    const god = state.godCards.find((g) => g.id === godId);
    if (!god || god.owned) return;
    if (payWith === 'gold' && state.duckGold < god.goldCost) {
      soundFX.playError();
      triggerTelegramHaptic('error');
      showToast(`تحتاج ${god.goldCost} من ذهب التنانين 💎 لتفعيل ${god.name}!`);
      return;
    }
    if (payWith === 'stars' && state.stars < god.starCost) {
      soundFX.playError();
      triggerTelegramHaptic('error');
      showToast(`تحتاج ${god.starCost} نجمة ★ لتفعيل ${god.name}!`);
      return;
    }

    setState((prev) => ({
      ...prev,
      duckGold: payWith === 'gold' ? prev.duckGold - god.goldCost : prev.duckGold,
      stars: payWith === 'stars' ? prev.stars - god.starCost : prev.stars,
      treasury: payWith === 'stars' ? withBurnedStars(prev.treasury, god.starCost) : prev.treasury,
      godCards: prev.godCards.map((g) => (g.id === godId ? { ...g, owned: true, active: true } : g)),
    }));
    showToast(`تم تفعيل ${god.name} بشكل دائم!`);
  };

  const handleFlipCoin = (packId: string): DuckSkinId | null => {
    const pack = state.flipCoins.find((p) => p.id === packId);
    if (!pack || pack.count <= 0) return null;
    const pickedSkin = pack.possibleSkins[Math.floor(Math.random() * pack.possibleSkins.length)];

    setState((prev) => {
      const updatedPacks = prev.flipCoins.map((p) => {
        if (p.id !== packId) return p;
        const nextUnlocked = p.unlockedSkins.includes(pickedSkin)
          ? p.unlockedSkins
          : [...p.unlockedSkins, pickedSkin];
        return { ...p, count: p.count - 1, unlockedSkins: nextUnlocked };
      });
      const updatedDucks = prev.ducks.map((d, idx) =>
        idx === prev.activeDuckIndex ? { ...d, skin: pickedSkin, name: SKIN_CATALOG[pickedSkin].name } : d
      );
      const nextSkins = prev.unlockedSkins.includes(pickedSkin)
        ? prev.unlockedSkins
        : [...prev.unlockedSkins, pickedSkin];
      return {
        ...prev,
        flipCoins: updatedPacks,
        ducks: updatedDucks,
        unlockedSkins: nextSkins,
      };
    });
    return pickedSkin;
  };

  const handleSpinWheel = (
    mega: boolean
  ): { segmentIndex: number; label: string; commitReward: () => void } | null => {
    if (mega && state.stars < 100) return null;
    if (!mega && state.stats.medals < 100) return null;

    const segIdx = Math.floor(Math.random() * WHEEL_REWARDS_REGISTRY.length);
    const seg = WHEEL_REWARDS_REGISTRY[segIdx];
    const mult = mega ? 5 : 1;
    const bundle: RewardBundle = {
      corn: seg.reward.corn ? seg.reward.corn * mult : undefined,
      stars: seg.reward.stars ? seg.reward.stars * mult : undefined,
      duckGold: seg.reward.duckGold ? seg.reward.duckGold * mult : undefined,
      medals: seg.reward.medals ? seg.reward.medals * mult : undefined,
      eggs: seg.reward.eggs
        ? Array.from({ length: mega ? 3 : 1 }, () => seg.reward.eggs!).flat()
        : undefined,
    };

    setState((prev) => {
      if (mega && prev.stars < 100) return prev;
      if (!mega && prev.stats.medals < 100) return prev;
      return {
        ...prev,
        stars: mega ? prev.stars - 100 : prev.stars,
        treasury: mega ? withBurnedStars(prev.treasury, 100) : prev.treasury,
        stats: {
          ...prev.stats,
          medals: !mega ? prev.stats.medals - 100 : prev.stats.medals,
          wheelSpins: prev.stats.wheelSpins + 1,
        },
      };
    });

    let committed = false;
    return {
      segmentIndex: segIdx,
      label: mega ? `${seg.label} (×${mult})` : seg.label,
      commitReward: () => {
        if (committed) return;
        committed = true;
        setState((prev) => grantRewardBundle(prev, bundle, { applySoftCap: true }).nextState);
      },
    };
  };

  const handleRedeemPromo = (code: string): { ok: boolean; message: string } => {
    const normalized = code.trim().toUpperCase();
    const match = PROMO_CODES_REGISTRY.find((p) => p.code.toUpperCase() === normalized);
    if (!match) {
      return {
        ok: false,
        message: `الرمز غير صحيح! جرّب ${PROMO_CODES_REGISTRY[0]?.code ?? 'DRAGON'} أو ${PROMO_CODES_REGISTRY[1]?.code ?? 'DMD2025'}`,
      };
    }
    if (state.usedPromoCodes.includes(match.code)) {
      return { ok: false, message: 'تم استخدام هذا الرمز مسبقاً.' };
    }

    setState((prev) => {
      if (prev.usedPromoCodes.includes(match.code)) return prev;
      const granted = grantRewardBundle(prev, match.reward, { applySoftCap: true }).nextState;
      return {
        ...granted,
        usedPromoCodes: [...granted.usedPromoCodes, match.code],
      };
    });
    triggerTelegramHaptic('success');
    return { ok: true, message: `تم التفعيل! حصلت على ${match.labelAr}` };
  };

  const handleBidListing = (listingId: string) => {
    const item = state.marketListings.find((l) => l.id === listingId);
    if (!item || item.soldStatus !== 'ACTIVE') return;
    const bidCost = Math.round(item.cornPrice * 1.12);
    if (state.corn < bidCost) {
      soundFX.playError();
      triggerTelegramHaptic('error');
      showToast(`تحتاج ${bidCost.toLocaleString()} طاقة للمزايدة!`);
      return;
    }

    setState((prev) => ({
      ...prev,
      corn: prev.corn - bidCost,
      treasury: withBurnedEnergy(prev.treasury, bidCost),
      marketListings: prev.marketListings.map((l) => {
        if (l.id !== listingId) return l;
        const nextEndsAt = Math.max(l.endsAt ?? Date.now() + l.timeLeftSec * 1000, Date.now() + 10000);
        return {
          ...l,
          cornPrice: bidCost,
          isUserBid: true,
          rivalSniped: false,
          lastBidder: prev.username,
          endsAt: nextEndsAt,
          timeLeftSec: Math.ceil((nextEndsAt - Date.now()) / 1000),
        };
      }),
    }));
    showToast('تم تسجيل مزايدتك بالطاقة! احذر من كسر الخصوم في الثواني الأخيرة.');
  };

  const handleBuyNowListing = (listingId: string) => {
    const item = state.marketListings.find((l) => l.id === listingId);
    if (!item || item.soldStatus !== 'ACTIVE') return;
    if (state.stars < item.starPrice) {
      soundFX.playError();
      triggerTelegramHaptic('error');
      showToast(`تحتاج ${item.starPrice} نجمة ★ للشراء الفوري!`);
      return;
    }

    const sz = item.xl ? 'XL' : 'NORMAL';
    const reqFeeds = getLevelRequiredFeeds(item.level);
    const wonDragon: Duck = {
      id: `dragon_buy_${Date.now()}`,
      name: item.duckName,
      skin: item.skin,
      rarity: item.rarity,
      level: item.level,
      maxLevel: 5,
      customLevel: 0,
      dmd: 0,
      dmdStored: 0,
      slotIndex: null,
      feedCost: getFeedCost(item.level, item.rarity, getPlayerTier(state), 0, {
        sizeTier: sz,
        xl: Boolean(item.xl),
      }),
      feedsProgress: item.level >= 5 ? reqFeeds : 0,
      feedsRequired: reqFeeds,
      feedClicksSinceReset: 0,
      costResetEndsAt: null,
      levelFeedsCompleted: item.level >= 5,
      breedingEndsAt: null,
      breedingNextLevel: null,
      lastBreedingEggAt: null,
      staked: false,
      stakeRatePerHour: 0,
      xl: item.xl,
      sizeTier: sz,
      skillLevel: 2,
      trainingLevel: 0,
      powerRating: RARITY_STYLE[item.rarity].basePower + item.level * 20,
      unlockedAt: Date.now(),
    };

    const soldNow = Date.now();
    setState((prev) => ({
      ...prev,
      stars: prev.stars - item.starPrice,
      treasury: withBurnedStars(prev.treasury, item.starPrice),
      ducks: normalizeDragonSlots([...prev.ducks, wonDragon], prev.unlockedSlots),
      marketListings: prev.marketListings.map((l) =>
        l.id === listingId ? { ...l, soldStatus: 'SOLD_YOU', soldAt: soldNow, timeLeftSec: 0, endsAt: soldNow } : l
      ),
    }));
    showToast(`تم اقتناء ${item.duckName} بنجاح!`);
  };

  // === LIVE CLOUD AUTH & P2P DRAGON AUCTION HANDLERS ===
  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        showToast(`أهلاً بك ${user.displayName || user.email || ''}! جاري المزامنة السحابية...`);
      }
    } catch {
      soundFX.playError();
      showToast('تعذر إتمام تسجيل الدخول عبر جوجل.');
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutFirebase();
      showToast('تم تسجيل الخروج من الحساب السحابي.');
    } catch {
      soundFX.playError();
    }
  };

  const handleListDragonAuction = async (
    duckId: string,
    startCorn: number,
    buyNowStars: number,
    durationMin: number
  ) => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      soundFX.playError();
      showToast('يجب تسجيل الدخول بحساب جوجل موثّق لطرح تنين في المزاد!');
      return;
    }
    const cur = latestStateRef.current;
    const dragon = cur.ducks.find((d) => d.id === duckId);
    if (!dragon || dragon.breedingEndsAt || cur.ducks.length <= 1) {
      soundFX.playError();
      showToast('التنين غير متاح للمزاد (تأكد من وجود تنين آخر وعدم انشغاله بالتزاوج).');
      return;
    }
    const band = getAuctionPriceBand(dragon.rarity, dragon.level, resolveDragonSize(dragon));
    const safeStart = Math.max(band.minStart, Math.min(band.maxStart, Math.round(startCorn)));
    const safeStars = Math.max(band.minStars, Math.min(band.maxStars, Math.round(buyNowStars)));
    const listingFee = calculateAuctionListingFee(safeStart);
    if (cur.corn < listingFee) {
      soundFX.playError();
      showToast(`تحتاج ${listingFee.toLocaleString()}⚡ لدفع رسوم عرض المزاد (5%)!`);
      return;
    }

    try {
      await createDragonAuction({
        uid: firebaseUser.uid,
        sellerName: cur.username,
        dragon,
        startCornPrice: safeStart,
        buyNowStars: safeStars,
        durationMinutes: durationMin,
      });

      const remainingDucks = normalizeDragonSlots(
        cur.ducks.filter((d) => d.id !== duckId),
        cur.unlockedSlots
      );
      const nextState: GameState = {
        ...cur,
        corn: cur.corn - listingFee,
        treasury: withBurnedEnergy(cur.treasury, listingFee),
        ducks: remainingDucks,
        activeDuckIndex: Math.min(cur.activeDuckIndex, Math.max(0, remainingDucks.length - 1)),
      };
      setState(nextState);
      flushSaveNow(nextState);
      saveCloudGameState(firebaseUser.uid, nextState, tgUserInfo?.id).catch(() => {});
      soundFX.playGodConfirm();
      triggerTelegramHaptic('success');
      showToast(`تم طرح ${dragon.name} في المزاد العلني! (رسوم حرق ${listingFee.toLocaleString()}⚡)`);
    } catch {
      soundFX.playError();
      showToast('فشل نشر المزاد، حاول مجدداً.');
    }
  };

  const handleBidLiveAuction = async (auctionId: string) => {
    if (!firebaseUser?.emailVerified) {
      soundFX.playError();
      showToast('سجّل الدخول بحساب جوجل أولاً للمزايدة!');
      return;
    }
    const auc = liveAuctions.find((a) => a.id === auctionId);
    if (!auc || auc.sellerUid === firebaseUser.uid) return;
    const minBid =
      auc.bidCount === 0
        ? auc.startCornPrice
        : auc.currentCornPrice + Math.max(50, Math.round(auc.currentCornPrice * 0.1));
    if (latestStateRef.current.corn < minBid) {
      soundFX.playError();
      showToast(`تحتاج ${minBid.toLocaleString()}⚡ للمزايدة!`);
      return;
    }

    try {
      const { acceptedPrice } = await bidOnDragonAuction(
        auctionId,
        firebaseUser.uid,
        latestStateRef.current.username,
        minBid
      );
      setState((prev) => ({
        ...prev,
        corn: Math.max(0, prev.corn - acceptedPrice),
        activeEscrowBids: [
          ...(prev.activeEscrowBids ?? []).filter((e) => e.auctionId !== auctionId),
          { auctionId, amount: acceptedPrice, placedAt: Date.now() },
        ],
      }));
      soundFX.playTapFeed();
      triggerTelegramHaptic('medium');
      showToast(`عرضك ${acceptedPrice.toLocaleString()}⚡ أصبح الأعلى الآن!`);
    } catch {
      soundFX.playError();
      showToast('تم تخطي السعر أو انتهى المزاد!');
    }
  };

  const handleBuyNowLiveAuction = async (auctionId: string) => {
    if (!firebaseUser?.emailVerified) {
      soundFX.playError();
      showToast('سجّل الدخول بحساب جوجل أولاً للشراء الفوري!');
      return;
    }
    const auc = liveAuctions.find((a) => a.id === auctionId);
    if (!auc || auc.sellerUid === firebaseUser.uid) return;
    if (latestStateRef.current.stars < auc.buyNowStars) {
      soundFX.playError();
      showToast(`تحتاج ${auc.buyNowStars} ★ للشراء الفوري!`);
      return;
    }
    try {
      await buyNowDragonAuction(auctionId, firebaseUser.uid, latestStateRef.current.username);
      const sz = auc.dragon.sizeTier ?? 'NORMAL';
      const lv = Math.max(1, Math.min(5, auc.dragon.level));
      const reqFeeds = getLevelRequiredFeeds(lv);
      const wonDragon: Duck = {
        id: `dragon_p2p_${Date.now()}`,
        name: auc.dragon.name,
        skin: auc.dragon.skin,
        rarity: auc.rarity,
        level: lv,
        maxLevel: 5,
        customLevel: auc.dragon.customLevel ?? 0,
        dmd: 0,
        dmdStored: 0,
        slotIndex: null,
        feedCost: getFeedCost(lv, auc.rarity, getPlayerTier(latestStateRef.current), 0, {
          sizeTier: sz,
          xl: sz !== 'NORMAL',
        }),
        feedsProgress: lv >= 5 ? reqFeeds : 0,
        feedsRequired: reqFeeds,
        feedClicksSinceReset: 0,
        costResetEndsAt: null,
        levelFeedsCompleted: lv >= 5,
        breedingEndsAt: null,
        breedingNextLevel: null,
        lastBreedingEggAt: null,
        staked: false,
        stakeRatePerHour: 0,
        xl: sz !== 'NORMAL',
        sizeTier: sz,
        gear: auc.dragon.gear,
        aura: auc.dragon.aura,
        skillLevel: auc.dragon.skillLevel ?? 1,
        trainingLevel: auc.dragon.trainingLevel ?? 0,
        powerRating: auc.dragon.powerRating ?? RARITY_STYLE[auc.rarity].basePower + lv * 25,
        unlockedAt: Date.now(),
      };
      setState((prev) => {
        const escrowMatch = (prev.activeEscrowBids ?? []).find((e) => e.auctionId === auctionId);
        const refundAmt = escrowMatch?.amount ?? 0;
        return {
          ...prev,
          corn: prev.corn + refundAmt,
          stars: Math.max(0, prev.stars - auc.buyNowStars),
          treasury: withBurnedStars(prev.treasury, auc.buyNowStars),
          activeEscrowBids: (prev.activeEscrowBids ?? []).filter((e) => e.auctionId !== auctionId),
          ducks: normalizeDragonSlots([...prev.ducks, wonDragon], prev.unlockedSlots),
        };
      });
      soundFX.playVictory();
      triggerTelegramHaptic('success');
      showToast(`مبروك! اشتريت ${auc.dragon.name} فوراً وأُضيف لمجموعتك 🐉`);
    } catch {
      soundFX.playError();
      showToast('لم يعد المزاد متاحاً للشراء.');
    }
  };

  const handleCancelLiveAuction = async (auctionId: string) => {
    if (!firebaseUser?.emailVerified) return;
    const auc = liveAuctions.find((a) => a.id === auctionId);
    if (!auc || auc.sellerUid !== firebaseUser.uid) return;
    try {
      await cancelDragonAuction(auctionId, firebaseUser.uid);
      const sz = auc.dragon.sizeTier ?? 'NORMAL';
      const lv = Math.max(1, Math.min(5, auc.dragon.level));
      const reqFeeds = getLevelRequiredFeeds(lv);
      const returnedDragon: Duck = {
        id: auc.dragon.id || `dragon_ret_${Date.now()}`,
        name: auc.dragon.name,
        skin: auc.dragon.skin,
        rarity: auc.rarity,
        level: lv,
        maxLevel: 5,
        customLevel: auc.dragon.customLevel ?? 0,
        dmd: 0,
        dmdStored: 0,
        slotIndex: null,
        feedCost: getFeedCost(lv, auc.rarity, getPlayerTier(latestStateRef.current), 0, {
          sizeTier: sz,
          xl: sz !== 'NORMAL',
        }),
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
        xl: sz !== 'NORMAL',
        sizeTier: sz,
        gear: auc.dragon.gear,
        aura: auc.dragon.aura,
        skillLevel: auc.dragon.skillLevel ?? 1,
        trainingLevel: auc.dragon.trainingLevel ?? 0,
        powerRating: auc.dragon.powerRating ?? RARITY_STYLE[auc.rarity].basePower + lv * 25,
        unlockedAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        ducks: normalizeDragonSlots([...prev.ducks, returnedDragon], prev.unlockedSlots),
      }));
      soundFX.playTabSwitch();
      showToast(`تم إلغاء المزاد واسترجاع ${auc.dragon.name} إلى قائمتك.`);
    } catch {
      soundFX.playError();
      showToast('لا يمكن إلغاء المزاد بعد وجود مزايدات.');
    }
  };

  const handleClaimBuyerAuction = async (auctionId: string) => {
    if (!firebaseUser?.emailVerified) return;
    const auc = liveAuctions.find((a) => a.id === auctionId);
    if (!auc) return;
    try {
      await claimBuyerAuctionDragon(auctionId, firebaseUser.uid);
      const sz = auc.dragon.sizeTier ?? 'NORMAL';
      const lv = Math.max(1, Math.min(5, auc.dragon.level));
      const reqFeeds = getLevelRequiredFeeds(lv);
      const wonDragon: Duck = {
        id: `dragon_won_p2p_${Date.now()}`,
        name: auc.dragon.name,
        skin: auc.dragon.skin,
        rarity: auc.rarity,
        level: lv,
        maxLevel: 5,
        customLevel: auc.dragon.customLevel ?? 0,
        dmd: 0,
        dmdStored: 0,
        slotIndex: null,
        feedCost: getFeedCost(lv, auc.rarity, getPlayerTier(latestStateRef.current), 0, {
          sizeTier: sz,
          xl: sz !== 'NORMAL',
        }),
        feedsProgress: lv >= 5 ? reqFeeds : 0,
        feedsRequired: reqFeeds,
        feedClicksSinceReset: 0,
        costResetEndsAt: null,
        levelFeedsCompleted: lv >= 5,
        breedingEndsAt: null,
        breedingNextLevel: null,
        lastBreedingEggAt: null,
        staked: false,
        stakeRatePerHour: 0,
        xl: sz !== 'NORMAL',
        sizeTier: sz,
        gear: auc.dragon.gear,
        aura: auc.dragon.aura,
        skillLevel: auc.dragon.skillLevel ?? 1,
        trainingLevel: auc.dragon.trainingLevel ?? 0,
        powerRating: auc.dragon.powerRating ?? RARITY_STYLE[auc.rarity].basePower + lv * 25,
        unlockedAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        activeEscrowBids: (prev.activeEscrowBids ?? []).filter((e) => e.auctionId !== auctionId),
        ducks: normalizeDragonSlots([...prev.ducks, wonDragon], prev.unlockedSlots),
      }));
      soundFX.playVictory();
      showToast(`استلمت ${auc.dragon.name} بنجاح من المزاد! 🐉`);
    } catch {
      soundFX.playError();
      showToast('تعذر استلام التنين الآن.');
    }
  };

  const handleClaimSellerAuction = async (auctionId: string) => {
    if (!firebaseUser?.emailVerified) return;
    try {
      const res = await claimSellerAuctionProceeds(auctionId, firebaseUser.uid);
      if (res.settlementType === 'BUY_NOW') {
        setState((prev) => ({
          ...prev,
          stars: prev.stars + res.grossStars,
          treasury: withEarnedStars(prev.treasury, res.grossStars),
        }));
        soundFX.playChestOpen();
        showToast(`تم تحصيل +${res.grossStars} ★ من بيع تنينك فوراً!`);
      } else {
        const { net, taxBurned } = calculateAuctionNetProceeds(res.grossCorn);
        setState((prev) => {
          const grant = withEarnedEnergy(prev, net, true);
          return {
            ...prev,
            corn: grant.corn,
            treasury: withBurnedEnergy(grant.treasury, taxBurned),
          };
        });
        soundFX.playChestOpen();
        showToast(`تم تحصيل صافي +${net.toLocaleString()}⚡ (حرق ضريبة 8%: ${taxBurned.toLocaleString()}⚡)`);
      }
    } catch {
      soundFX.playError();
      showToast('تعذر تحصيل العوائد حالياً.');
    }
  };

  const handleBattleResult = useCallback(
    (
      won: boolean,
      rewardCorn: number,
      rewardStars: number,
      leaguePts: number,
      xp: number,
      gold: number,
      rewardMedals = 0
    ) => {
      if (getVerifiedSessionToken()) {
        const cur = latestStateRef.current;
        const activeDragon = cur.ducks[cur.activeDuckIndex] ?? cur.ducks[0];
        void postVerifiedBattleResolve({
          mode: 'ARENA',
          rivalPower: Math.max(200, Math.round(rewardCorn * 3)),
          dragonIds: activeDragon ? [activeDragon.id] : [],
          clientClaimedPower: activeDragon?.powerRating ?? 100,
        });
      }
      const plunderMult = activeGodPlunder && won ? 1.35 : 1;

      setState((prev) => {
        const eventMods = resolveEventModifiers(
          LIVE_EVENTS_REGISTRY[prev.weekendEventIndex % LIVE_EVENTS_REGISTRY.length]
        );
        const eventStarMult = won ? eventMods.starBonusMult : 1;
        const activeDragon = prev.ducks[prev.activeDuckIndex] ?? prev.ducks[0];
        const pharaohMult = won && activeDragon?.skin === 'pharaoh' ? 1.2 : 1;
        const royalMult = activeDragon?.skin === 'royal' ? 1.2 : 1;
        const winsUsed = prev.treasury.arenaFullWinsToday ?? 0;
        const capRatio = won && winsUsed >= ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS
          ? ECONOMY_LIMITS.ARENA_AFTER_CAP_RATIO
          : 1;
        const rawCorn = Math.max(
          15,
          Math.round(rewardCorn * plunderMult * pharaohMult * capRatio * eventMods.arenaEnergyMult)
        );
        const finalStars = won
          ? Math.max(1, Math.round(rewardStars * eventStarMult * capRatio))
          : rewardStars;
        const finalGold = gold > 0 ? Math.max(1, Math.round(gold * pharaohMult * capRatio)) : 0;
        const finalMedals =
          won && rewardMedals > 0 ? Math.max(1, Math.round(rewardMedals * capRatio)) : 0;
        const prestigeMult = 1 + (prev.pack.talents?.prestige ?? 0) * 0.03;
        const finalLeaguePts = Math.round(leaguePts * prestigeMult);
        const finalXp = Math.round(xp * royalMult);

        const energyGrant = withEarnedEnergy(prev, rawCorn);
        const nextTreasury = withEarnedStars(energyGrant.treasury, finalStars);

        return {
          ...prev,
          corn: energyGrant.corn,
          stars: prev.stars + finalStars,
          duckGold: prev.duckGold + finalGold,
          battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + finalXp },
          treasury: {
            ...nextTreasury,
            arenaFullWinsToday: won
              ? Math.min(ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS + 99, winsUsed + 1)
              : winsUsed,
          },
          stats:
            finalMedals > 0
              ? { ...prev.stats, medals: prev.stats.medals + finalMedals }
              : prev.stats,
          league: {
            ...prev.league,
            points: prev.league.points + finalLeaguePts,
            wins: won ? prev.league.wins + 1 : prev.league.wins,
            winStreak: won ? prev.league.winStreak + 1 : 0,
          },
          dailyTasks: prev.dailyTasks.map((dt) =>
            dt.id === 'dt_claims' && won ? { ...dt, progress: Math.min(dt.target, dt.progress + 1) } : dt
          ),
        };
      });
    },
    [activeGodPlunder]
  );

  const handleRaceResult = useCallback(
    (place: number, rewardCorn: number, rewardStars: number, leaguePts: number, xp: number) => {
      const cur = latestStateRef.current;
      const eventMods = resolveEventModifiers(
        LIVE_EVENTS_REGISTRY[cur.weekendEventIndex % LIVE_EVENTS_REGISTRY.length]
      );
      const activeDragon = cur.ducks[cur.activeDuckIndex] ?? cur.ducks[0];
      const pharaohMult = place <= 2 && activeDragon?.skin === 'pharaoh' ? 1.2 : 1;
      const royalMult = activeDragon?.skin === 'royal' ? 1.2 : 1;
      const winsUsed = cur.treasury.arenaFullWinsToday ?? 0;
      const isFullWinCounted = place <= 2;
      const capRatio = isFullWinCounted && winsUsed >= ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS
        ? ECONOMY_LIMITS.ARENA_AFTER_CAP_RATIO
        : 1;
      const rawCorn = Math.max(
        20,
        Math.round(rewardCorn * pharaohMult * capRatio * eventMods.arenaEnergyMult)
      );
      const finalStars = rewardStars > 0
        ? Math.max(1, Math.round(rewardStars * eventMods.starBonusMult * capRatio))
        : 0;
      const finalXp = Math.round(xp * royalMult);

      setState((prev) => {
        const energyGrant = withEarnedEnergy(prev, rawCorn);
        const nextTreasury = withEarnedStars(energyGrant.treasury, finalStars);
        const prestigeMult = 1 + (prev.pack.talents?.prestige ?? 0) * 0.03;
        return {
          ...prev,
          corn: energyGrant.corn,
          stars: prev.stars + finalStars,
          battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + finalXp },
          treasury: {
            ...nextTreasury,
            arenaFullWinsToday: isFullWinCounted
              ? Math.min(ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS + 99, (nextTreasury.arenaFullWinsToday ?? 0) + 1)
              : nextTreasury.arenaFullWinsToday ?? 0,
          },
          league: {
            ...prev.league,
            points: prev.league.points + Math.round(leaguePts * prestigeMult),
            racesWon: place === 1 ? prev.league.racesWon + 1 : prev.league.racesWon,
          },
        };
      });
      showToast(
        `أنهيت السباق في المركز #${place}! +${rawCorn.toLocaleString()} طاقة${finalStars > 0 ? ` و +${finalStars} ★` : ''}`
      );
    },
    [showToast]
  );

  const handleClaimDailyLeague = () => {
    if (state.league.dailyClaimed) {
      soundFX.playError();
      triggerTelegramHaptic('error');
      showToast('تم استلام مكافأة الدوري اليومية بالفعل!');
      return;
    }
    const meta = getLeagueMeta(state.league.points);
    setState((p) => {
      const energyGrant = withEarnedEnergy(p, meta.dailyCorn);
      const nextTreasury = withEarnedStars(energyGrant.treasury, meta.dailyStars);
      return {
        ...p,
        corn: energyGrant.corn,
        stars: p.stars + meta.dailyStars,
        duckGold: p.duckGold + meta.dailyGold,
        treasury: nextTreasury,
        league: { ...p.league, dailyClaimed: true },
      };
    });
    showToast(`تم استلام مكافأة ${meta.nameAr}!`);
  };

  const handleClaimBattlePassReward = (level: number, track: 'FREE' | 'PREMIUM') => {
    const meta = BATTLE_PASS_LEVELS.find((l) => l.level === level);
    if (!meta) return;
    setState((prev) => {
      if (track === 'FREE') {
        if (prev.battlePass.claimedFree.includes(level)) return prev;
        const energyGrant =
          meta.freeType === 'corn'
            ? withEarnedEnergy(prev, meta.freeAmount)
            : { corn: prev.corn, finalGain: 0, damped: false, treasury: prev.treasury };
        const nextTreasury =
          meta.freeType === 'stars'
            ? withEarnedStars(energyGrant.treasury, meta.freeAmount)
            : energyGrant.treasury;
        return {
          ...prev,
          corn: energyGrant.corn,
          stars: meta.freeType === 'stars' ? prev.stars + meta.freeAmount : prev.stars,
          treasury: nextTreasury,
          eggQueue:
            meta.freeType === 'eggs'
              ? [...prev.eggQueue, ...Array.from({ length: meta.freeAmount }, () => 'egg_2' as EggItemType)]
              : prev.eggQueue,
          battlePass: { ...prev.battlePass, claimedFree: [...prev.battlePass.claimedFree, level] },
        };
      } else {
        if (!prev.battlePass.premiumUnlocked || prev.battlePass.claimedPremium.includes(level)) return prev;
        let extraDucks = prev.ducks;
        if (meta.premiumType === 'duck') {
          const bpDragon: Duck = {
            id: `dragon_bp_${Date.now()}`,
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
            unlockedAt: Date.now(),
          };
          extraDucks = normalizeDragonSlots([...prev.ducks, bpDragon], prev.unlockedSlots);
        }
        return {
          ...prev,
          stars: meta.premiumType === 'stars' ? prev.stars + meta.premiumAmount : prev.stars,
          duckGold: meta.premiumType === 'gold' ? prev.duckGold + meta.premiumAmount : prev.duckGold,
          treasury:
            meta.premiumType === 'stars' ? withEarnedStars(prev.treasury, meta.premiumAmount) : prev.treasury,
          ducks: extraDucks,
          stats:
            meta.premiumType === 'boost'
              ? {
                  ...prev.stats,
                  autoMergeBoosters: prev.stats.autoMergeBoosters + meta.premiumAmount,
                  hammerBoosters: prev.stats.hammerBoosters + 1,
                }
              : prev.stats,
          battlePass: { ...prev.battlePass, claimedPremium: [...prev.battlePass.claimedPremium, level] },
        };
      }
    });
    showToast(`تم استلام جائزة المستوى ${level} من تذكرة الموسم!`);
  };

  const claimableDailyCount = state.dailyTasks.filter((t) => !t.claimed && t.progress >= t.target).length;

  if (screen === 'TITLE') {
    return (
      <TitleScreen
        username={state.username}
        isTelegramVerified={tgVerified || Boolean(getTelegramUser())}
        isCloudConnected={Boolean(firebaseUser?.emailVerified)}
        cloudUserEmail={firebaseUser?.email ?? null}
        onSignInGoogle={handleGoogleSignIn}
        onSignOutGoogle={handleGoogleSignOut}
        hasSavedProgress={hasSave}
        savedDmd={state.dmdTotal}
        savedDuckCount={state.ducks.length}
        muted={state.muted}
        onToggleMute={() => setState((p) => ({ ...p, muted: !p.muted }))}
        onStart={() => {
          setScreen('PLAYING');
          if (!offlineNoticeShown && initialLoaded.offlineDmdEarned > 0.0005) {
            setOfflineNoticeShown(true);
            showToast(`🐉 تم حفظ +${initialLoaded.offlineDmdEarned.toFixed(2)} DMD في محفظتك بنجاح!`);
          }
        }}
      />
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#0b0d14] text-slate-100 overflow-hidden select-none">
      {/* Persistent Top Bar (Overlap-Free Mobile & Desktop) */}
      <header className="pt-safe shrink-0 min-h-14 px-2 sm:px-5 bg-[#12151f] border-b border-slate-800/90 flex items-center justify-between gap-1.5 z-20">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setModal('PAUSE')}
            title="القائمة والإعدادات"
            className="flex items-center gap-1.5 px-2 h-9 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-amber-400/50 cursor-pointer shrink-0"
          >
            <span className="w-5 h-5 rounded-md bg-amber-400/20 text-amber-400 flex items-center justify-center text-xs font-black">
              🐉
            </span>
            <span className="font-mono-num text-[11px] font-bold text-slate-200 hidden md:inline">
              {state.username}
            </span>
          </button>

          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setGodsInitialSubTab('GODS');
              setActiveTab('GODS');
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 h-9 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-rose-400/60 text-[11px] sm:text-xs font-bold text-slate-100 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>السرب</span>
          </button>

          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setModal('TRADER');
            }}
            title="التاجر المتنقل"
            className="flex items-center gap-1 px-2 sm:px-2.5 h-9 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-amber-400/60 text-[11px] font-extrabold text-amber-300 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Store className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">التاجر</span>
          </button>

          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setModal('WALLET');
            }}
            aria-label="صندوق DMD والمحفظة"
            title="صندوق DMD والمحفظة"
            className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-sky-400/60 flex items-center justify-center text-slate-200 cursor-pointer shrink-0"
          >
            <Wallet className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            title="طاقة الإطعام"
            className="flex items-center gap-1 font-mono-num text-xs sm:text-base font-black text-white whitespace-nowrap"
          >
            <span>{formatCompactNumber(state.corn)}</span>
            <CornIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>

          <div
            title="النجوم (عملة التخصيص والخانات)"
            className="flex items-center gap-1 font-mono-num text-xs sm:text-base font-black text-white whitespace-nowrap"
          >
            <span>{state.stars.toLocaleString()}</span>
            <StarIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>

          <button
            onClick={() => setState((p) => ({ ...p, muted: !p.muted }))}
            aria-label={state.muted ? 'تشغيل الصوت' : 'كتم الصوت'}
            className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            {state.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {activeTab === 'DUCKS' && (
          <DucksTab
            state={state}
            onSelectDuck={(idx) => setState((p) => ({ ...p, activeDuckIndex: idx }))}
            onFeedDuck={handleFeedDuck}
            onStartBreeding={handleStartBreeding}
            onUpgradeXlWithEggs={handleUpgradeXlWithEggs}
            onUpgradeStarCustomization={handleUpgradeStarCustomization}
            onUpgradeDuckSkill={handleUpgradeDuckSkill}
            onTrainDragon={handleTrainDragon}
            onOpenSquadTalents={() => {
              setGodsInitialSubTab('SHOP');
              setActiveTab('GODS');
            }}
            onCustomizeDuck={handleCustomizeDuck}
            onChangeDragonSkin={handleChangeDragonSkin}
            onUnlockSlot={handleUnlockDragonSlot}
            onAssignSlot={handleAssignDragonToSlot}
            onMergeDucks={handleMergeDucks}
            onWatchRewardedAd={handleWatchRewardedAd}
            onOpenDuckerPass={() => setModal('DUCKER_PASS')}
            onOpenDailyPass={() => setModal('DAILY_PASS')}
            onOpenDailyTasks={() => setModal('DAILY_TASKS')}
            onClaimBestTask={() => {
              const readyTask = state.dailyTasks.find((t) => !t.claimed && t.progress >= t.target);
              if (!readyTask) {
                setModal('DAILY_TASKS');
                return;
              }
              soundFX.playClaim();
              setState((p) => {
                const energyGrant = withEarnedEnergy(p, readyTask.rewardEnergy);
                return {
                  ...p,
                  corn: energyGrant.corn,
                  stars: p.stars + readyTask.rewardStars,
                  treasury: withEarnedStars(energyGrant.treasury, readyTask.rewardStars),
                  battlePass: { ...p.battlePass, xp: p.battlePass.xp + 30 },
                  dailyTasks: p.dailyTasks.map((t) =>
                    t.id === readyTask.id ? { ...t, claimed: true } : t
                  ),
                  stats: { ...p.stats, totalTasksClaimed: p.stats.totalTasksClaimed + 1 },
                };
              });
              showToast(`تم استلام مكافأة المهمة (+${readyTask.rewardStars} ★ و +${readyTask.rewardEnergy} طاقة)!`);
            }}
            onOpenTreasures={() => {
              setGodsInitialSubTab('TREASURES');
              setActiveTab('GODS');
            }}
            onGoToArena={() => setActiveTab('ARENA')}
            onGoToEggs={() => setActiveTab('EGGS')}
            onClaimTimedBonus={() => {
              setTimedBonusReadyAt(Date.now() + ECONOMY_LIMITS.TIMED_BONUS_COOLDOWN_SEC * 1000);
              setState((p) => {
                const energyGrant = withEarnedEnergy(p, ECONOMY_LIMITS.TIMED_BONUS_ENERGY);
                return {
                  ...p,
                  corn: energyGrant.corn,
                  treasury: energyGrant.treasury,
                  eggQueue: [...p.eggQueue, 'egg_1'],
                };
              });
              showToast(`تم استلام الإمداد المؤقت (+${ECONOMY_LIMITS.TIMED_BONUS_ENERGY} طاقة و +1 بيضة تنين)!`);
            }}
            timedBonusReadyIn={timedBonusReadyIn}
          />
        )}

        {activeTab === 'EGGS' && (
          <EggsTab
            state={state}
            blitzSecLeft={blitzSecLeft}
            onStartBlitz={handleStartBlitz}
            onAutoMergeBoard={handleAutoMergeBoard}
            onUseHammerOnCell={handleUseHammerOnCell}
            onMergeCells={handleMergeCells}
            onPlaceQueuedEgg={handlePlaceQueuedEgg}
            onPlaceAllQueuedEggs={handlePlaceAllQueuedEggs}
            onSellGridItem={handleSellGridItem}
            onSellQueuedEgg={handleSellQueuedEgg}
            onDeliverToGod={handleDeliverToGod}
            onOpenSnackChest={handleOpenSnackChest}
            onUnlockGridSlot={handleUnlockGridSlot}
            onOpenTournament={() => setModal('TOURNAMENT')}
          />
        )}

        {activeTab === 'ARENA' && (
          <ArenaTab
            state={state}
            leaderboardPlayers={leaderboardPlayers}
            currentUid={firebaseUser?.uid ?? null}
            onSpendArenaEntry={handleSpendArenaEntry}
            onRefundArenaEntry={handleRefundArenaEntry}
            onBattleResult={handleBattleResult}
            onRaceResult={handleRaceResult}
            onClaimDailyLeague={handleClaimDailyLeague}
            onRotateWeekendEvent={() =>
              setState((p) => ({ ...p, weekendEventIndex: (p.weekendEventIndex + 1) % WEEKEND_EVENTS.length }))
            }
          />
        )}

        {activeTab === 'GODS' && (
          <GodsTab
            state={state}
            initialSubTab={godsInitialSubTab}
            onJoinPack={handleJoinPack}
            onLeavePack={handleLeavePack}
            onUpdateJoinConditions={handleUpdateJoinConditions}
            onDonatePack={handleDonateAlliance}
            onHelpAllies={handleHelpAllies}
            onAllianceBreedSpeedup={handleAllianceBreedSpeedup}
            onAttackAllianceBoss={handleAttackAllianceBoss}
            onSendPackMessage={(text) => {
              if (firebaseUser?.emailVerified) {
                sendGlobalAllianceMessage(
                  'global_swarm_alpha',
                  firebaseUser.uid,
                  latestStateRef.current.username,
                  text
                ).catch(() => {});
              }
              setState((p) => ({
                ...p,
                pack: {
                  ...p.pack,
                  messages: [
                    ...p.pack.messages,
                    {
                      id: `msg_${Date.now()}`,
                      sender: p.username,
                      text,
                      time: new Date().toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    },
                  ].slice(-35),
                },
              }));
            }}
            onClaimAllianceQuest={handleClaimAllianceQuest}
            onClaimActivityChest={handleClaimActivityChest}
            onClaimAllianceGift={handleClaimAllianceGift}
            onClaimAllAllianceGifts={handleClaimAllAllianceGifts}
            onSupportCoopGoal={handleSupportCoopGoal}
            onClaimCoopGoal={handleClaimCoopGoal}
            onPromoteDemoteMember={handlePromoteDemoteMember}
            onKickMember={handleKickMember}
            onRecruitAllianceMember={handleRecruitAllianceMember}
            onUpdateAllianceIdentity={handleUpdateAllianceIdentity}
            onFundAllianceTech={handleFundAllianceTech}
            onConvertBlessingToResearch={handleConvertBlessingToResearch}
            onStartAllianceResearch={handleStartAllianceResearch}
            onSpeedupAllianceResearch={handleSpeedupAllianceResearch}
            onStartAllianceRally={handleStartAllianceRally}
            onDispatchDragonToRally={handleDispatchDragonToRally}
            onReinforceRally={handleReinforceRally}
            onSpeedupRally={handleSpeedupRally}
            onResolveAllianceRally={handleResolveAllianceRally}
            onHarvestOccupiedSite={handleHarvestOccupiedSite}
            onMarkNotificationRead={handleMarkNotificationRead}
            onSendQuickAllianceInvite={handleSendQuickAllianceInvite}
            onDistributeAllianceDividends={handleDistributeAllianceDividends}
            onDonateDragonToSwarm={handleDonateDragonToSwarm}
            onAllyDonateDragonToSwarm={handleAllyDonateDragonToSwarm}
            onTrainSwarmDragon={handleTrainSwarmDragon}
            onUpgradeSwarmDragonSkill={handleUpgradeSwarmDragonSkill}
            onUpgradeSwarmDragonGear={handleUpgradeSwarmDragonGear}
            onSelectSwarmDragonSkin={handleSelectSwarmDragonSkin}
            onBuyAllianceShopOffer={handleBuyAllianceShopOffer}
            onUpgradeSquadTalent={handleUpgradeSquadTalent}
            onForgeRelic={handleForgeRelic}
            onActivateGod={handleActivateGod}
            onClaimTreasureStep={(threshold, stepNumber) => {
              const step = TREASURE_RACE_STEPS.find((s) => s.step === stepNumber);
              if (!step) return;
              setState((p) => {
                if (p.claimedTreasureSteps.includes(threshold)) return p;
                const granted = grantRewardBundle(p, step.reward, { applySoftCap: true }).nextState;
                return {
                  ...granted,
                  claimedTreasureSteps: [...granted.claimedTreasureSteps, threshold],
                };
              });
              triggerTelegramHaptic('success');
              showToast(`تم استلام مكافأة ${step.titleAr} (${step.rewardLabelAr})!`);
            }}
            onOpenExchangeGold={() => setModal('WALLET')}
          />
        )}

        {activeTab === 'TASKS' && (
          <TasksTab
            state={state}
            onSwitchTab={(t) => setActiveTab(t)}
            onOpenDailyTasks={() => setModal('DAILY_TASKS')}
            onOpenTrader={() => setModal('TRADER')}
            onFlipCoin={handleFlipCoin}
            onClaimHonorPack={(packId) => {
              const pack = HONOR_PACKS_REGISTRY.find((h) => h.id === packId);
              if (!pack) return;
              if (state.stats.honorLetters < pack.costLetters) {
                soundFX.playError();
                showToast('رسائل الشرف غير كافية!');
                return;
              }
              setState((p) => {
                if (p.claimedHonorPacks.includes(packId) || p.stats.honorLetters < pack.costLetters) return p;
                const deducted: GameState = {
                  ...p,
                  stats: { ...p.stats, honorLetters: p.stats.honorLetters - pack.costLetters },
                  claimedHonorPacks: [...p.claimedHonorPacks, packId],
                };
                return grantRewardBundle(deducted, pack.reward, { applySoftCap: true }).nextState;
              });
              showToast(`تم استلام ${pack.titleAr} (${pack.rewardDescAr})!`);
            }}
            onClaimWatchBonus={() => handleWatchRewardedAd('energy')}
            onClaimAchievement={(id) => {
              const ach = ACHIEVEMENTS_REGISTRY.find((a) => a.id === id);
              if (!ach) return;
              setState((p) => {
                if (p.claimedAchievements.includes(id)) return p;
                const granted = grantRewardBundle(p, ach.reward, { applySoftCap: true }).nextState;
                return {
                  ...granted,
                  claimedAchievements: [...granted.claimedAchievements, id],
                };
              });
              showToast(`تم استلام إنجاز "${ach.titleAr}" (${ach.rewardLabelAr})!`);
            }}
            onClaimHeartMilestone={(threshold) => {
              const milestone = HEART_MILESTONES_REGISTRY.find((m) => m.targetHearts === threshold);
              if (!milestone) return;
              setState((p) => {
                if (p.claimedHeartMilestones.includes(threshold)) return p;
                const granted = grantRewardBundle(p, milestone.reward, { applySoftCap: true }).nextState;
                return {
                  ...granted,
                  claimedHeartMilestones: [...granted.claimedHeartMilestones, threshold],
                };
              });
              showToast(`تم استلام مكافأة القلوب (${milestone.rewardLabelAr})!`);
            }}
            onClaimSocial={(id) => {
              const soc = SOCIAL_TASKS_REGISTRY.find((s) => s.id === id);
              if (!soc) return;
              setState((p) => {
                if (p.claimedSocials.includes(id)) return p;
                const granted = grantRewardBundle(p, soc.reward, { applySoftCap: true }).nextState;
                return {
                  ...granted,
                  claimedSocials: [...granted.claimedSocials, id],
                };
              });
              showToast(`تم التحقق! ${soc.rewardDescAr}`);
            }}
            onRedeemPromo={handleRedeemPromo}
            onSpinWheel={handleSpinWheel}
            onInviteFriendSim={(premium) => {
              const usedInvites = state.treasury.invitesClaimedToday ?? 0;
              if (usedInvites >= ECONOMY_LIMITS.MAX_DAILY_INVITE_CLAIMS) {
                soundFX.playError();
                showToast(`وصلت للحد اليومي لدعوات الأصدقاء (${ECONOMY_LIMITS.MAX_DAILY_INVITE_CLAIMS}/${ECONOMY_LIMITS.MAX_DAILY_INVITE_CLAIMS})!`);
                return;
              }
              const rawCorn = premium ? 320 : 120;
              const starBonus = premium ? 3 : 0;
              setState((p) => {
                const energyGrant = withEarnedEnergy(p, rawCorn);
                const nextTreasury = withEarnedStars(energyGrant.treasury, starBonus);
                return {
                  ...p,
                  corn: energyGrant.corn,
                  stars: p.stars + starBonus,
                  treasury: {
                    ...nextTreasury,
                    invitesClaimedToday: (nextTreasury.invitesClaimedToday ?? 0) + 1,
                  },
                };
              });
              showToast(premium ? `+${rawCorn} طاقة و +${starBonus} ★ من صديق مميز!` : `+${rawCorn} طاقة من دعوة صديق!`);
            }}
            onInstantMerge={(rarity) => {
              const cost = getInstantSummonStarCost(rarity, getPlayerTier(state));
              if (state.stars < cost) {
                soundFX.playError();
                showToast(`تحتاج ${cost} ★ للاستدعاء الفوري!`);
                return;
              }
              const newDragon: Duck = {
                id: `dragon_inst_${Date.now()}`,
                name: rarity === 'RARE' ? 'تنين الرمال الفرعوني' : 'تنين الجحيم اليقطيني',
                skin: rarity === 'RARE' ? 'pharaoh' : 'pumpkin',
                rarity,
                level: 1,
                maxLevel: 5,
                customLevel: 0,
                dmd: 0,
                dmdStored: 0,
                slotIndex: null,
                feedCost: getFeedCost(1, rarity, getPlayerTier(state), 0),
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
                powerRating: RARITY_STYLE[rarity].basePower + 25,
                unlockedAt: Date.now(),
              };
              setState((p) => {
                const normalized = normalizeDragonSlots([...p.ducks, newDragon], p.unlockedSlots);
                const newIdx = Math.max(0, normalized.findIndex((d) => d.id === newDragon.id));
                return {
                  ...p,
                  stars: p.stars - cost,
                  treasury: withBurnedStars(p.treasury, cost),
                  ducks: normalized,
                  activeDuckIndex: newIdx,
                };
              });
              showToast(`تم استدعاء تنين ${RARITY_STYLE[rarity].labelAr} فوري!`);
            }}
          />
        )}

        {activeTab === 'MARKET' && (
          <MarketTab
            state={state}
            liveAuctions={liveAuctions}
            currentUid={firebaseUser?.uid ?? null}
            isSignedIn={Boolean(firebaseUser?.emailVerified)}
            onBidListing={handleBidListing}
            onBuyNowListing={handleBuyNowListing}
            onListDragonAuction={handleListDragonAuction}
            onBidLiveAuction={handleBidLiveAuction}
            onBuyNowLiveAuction={handleBuyNowLiveAuction}
            onCancelLiveAuction={handleCancelLiveAuction}
            onClaimBuyerAuction={handleClaimBuyerAuction}
            onClaimSellerAuction={handleClaimSellerAuction}
            onSignInGoogle={handleGoogleSignIn}
            onSellOwnDuck={(duckId, cornPrice) => {
              setState((p) => {
                const soldDragon = p.ducks.find((d) => d.id === duckId);
                if (!soldDragon || p.ducks.length <= 1) return p;
                const remaining = normalizeDragonSlots(
                  p.ducks.filter((d) => d.id !== duckId),
                  p.unlockedSlots
                );
                const energyGrant = withEarnedEnergy(p, cornPrice);
                return {
                  ...p,
                  corn: energyGrant.corn,
                  treasury: energyGrant.treasury,
                  ducks: remaining,
                  activeDuckIndex: Math.min(p.activeDuckIndex, Math.max(0, remaining.length - 1)),
                };
              });
              showToast(`تم بيع التنين مقابل ${formatCompactNumber(cornPrice)} طاقة!`);
            }}
            onBuyMarketGod={(godId) => handleActivateGod(godId, 'stars')}
            onBuyStorePackage={handleBuyStorePackage}
            onWatchRewardedAd={handleWatchRewardedAd}
            onBarterTrade={(tradeType) => {
              const tier = getPlayerTier(state);
              const energyCost = getBarterEnergyForStarsCost(tier);
              const energyPayout = getBarterStarsToEnergyPayout(tier);
              const usedToday = state.treasury.barterStarsToday ?? 0;

              if (tradeType === 'CORN_TO_STARS') {
                if (usedToday >= ECONOMY_LIMITS.MAX_DAILY_BARTER_STARS) {
                  soundFX.playError();
                  showToast(`وصلت للحد اليومي (${ECONOMY_LIMITS.MAX_DAILY_BARTER_STARS}/${ECONOMY_LIMITS.MAX_DAILY_BARTER_STARS}) لمقايضة النجوم!`);
                  return;
                }
                if (state.corn >= energyCost) {
                  soundFX.playClaim();
                  setState((p) => {
                    let nextTreasury = withBurnedEnergy(p.treasury, energyCost);
                    nextTreasury = withEarnedStars(nextTreasury, 10);
                    return {
                      ...p,
                      corn: p.corn - energyCost,
                      stars: p.stars + 10,
                      treasury: {
                        ...nextTreasury,
                        barterStarsToday: (nextTreasury.barterStarsToday ?? 0) + 1,
                      },
                    };
                  });
                  showToast(`تمت المقايضة: +10 ★ مقابل ${energyCost.toLocaleString()} طاقة!`);
                  return;
                }
              } else if (tradeType === 'STARS_TO_CORN' && state.stars >= 10) {
                soundFX.playClaim();
                setState((p) => {
                  const energyGrant = withEarnedEnergy(p, energyPayout);
                  return {
                    ...p,
                    stars: p.stars - 10,
                    corn: energyGrant.corn,
                    treasury: withBurnedStars(energyGrant.treasury, 10),
                  };
                });
                showToast(`تمت المقايضة: +${energyPayout.toLocaleString()} طاقة مقابل 10 ★!`);
                return;
              }
              soundFX.playError();
              showToast('الرصيد غير كافٍ لإتمام المقايضة.');
            }}
          />
        )}

        {toast && (
          <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/95 border border-amber-400/60 text-amber-200 text-xs font-extrabold shadow-2xl text-center max-w-[90vw]">
            {toast}
          </div>
        )}
      </main>

      {/* Persistent 6-Tab Bottom Navigation Bar */}
      <nav className="pb-safe shrink-0 min-h-16 bg-[#12151f] border-t border-slate-800/90 px-1 flex items-center justify-around z-20">
        {[
          { id: 'MARKET' as MainTab, label: 'المتجر', icon: TrendingUp, badge: 0 },
          { id: 'EGGS' as MainTab, label: 'البيض', icon: Egg, badge: state.eggQueue.length },
          { id: 'DUCKS' as MainTab, label: 'التنانين', icon: Crown, badge: 0 },
          { id: 'ARENA' as MainTab, label: 'الحلبة', icon: Swords, badge: state.league.dailyClaimed ? 0 : 1 },
          {
            id: 'GODS' as MainTab,
            label: 'السرب',
            icon: Shield,
            badge:
              (state.pack.gifts ?? []).filter((g) => !g.claimed).length +
              (state.pack.notifications ?? []).filter((n) => !n.read).length +
              (state.pack.activeRally?.status === 'READY' ? 1 : 0),
          },
          { id: 'TASKS' as MainTab, label: 'المهام', icon: CheckSquare, badge: claimableDailyCount },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundFX.playTabSwitch();
                triggerTelegramHaptic('light');
                if (item.id === 'GODS') {
                  setGodsInitialSubTab('GODS');
                }
                setActiveTab(item.id);
              }}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all cursor-pointer min-w-[50px] min-h-[48px] ${
                active ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'scale-110 transition-transform' : ''}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[15px] px-1 rounded-full bg-rose-500 text-white font-mono-num text-[9px] font-black flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-extrabold whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <GameModals
        modal={modal}
        state={state}
        packInitialSubTab={packInitialSubTab}
        onClose={() => setModal(null)}
        onSwitchTab={(t) => setActiveTab(t)}
        onUpgradeSquadTalent={handleUpgradeSquadTalent}
        onForgeRelic={handleForgeRelic}
        onClaimTournamentMilestone={(scoreThreshold) => {
          const milestone = TOURNAMENT_MILESTONES.find((m) => m.score === scoreThreshold);
          if (!milestone) return;
          setState((p) => {
            if (p.tournament.score < milestone.score || p.tournament.claimedMilestones.includes(scoreThreshold)) {
              return p;
            }
            const granted = grantRewardBundle(p, milestone.reward, { applySoftCap: true }).nextState;
            return {
              ...granted,
              tournament: {
                ...granted.tournament,
                claimedMilestones: [...granted.tournament.claimedMilestones, scoreThreshold],
              },
            };
          });
          triggerTelegramHaptic('success');
          showToast(`تم استلام جائزة البطولة الكبرى (${milestone.labelAr})!`);
        }}
        onBuyTraderDeal={() => {
          const dealCost = getTraderDealStarCost(getPlayerTier(state));
          if (state.stars < dealCost) {
            soundFX.playError();
            showToast(`تحتاج ${dealCost} ★ لإتمام صفقة التاجر!`);
            return;
          }
          setState((p) => ({
            ...p,
            stars: p.stars - dealCost,
            treasury: withBurnedStars(p.treasury, dealCost),
            eggQueue: ['cornucopia', 'chalice', 'egg_3', 'egg_2', ...p.eggQueue],
            stats: { ...p.stats, traderDeals: p.stats.traderDeals + 1 },
          }));
          setModal(null);
          showToast('تمت الصفقة! وصل قرن الوفرة والكأس وبيضتان إلى قائمة انتظار البيض.');
        }}
        onClaimDailyTask={(taskId) => {
          const task = state.dailyTasks.find((t) => t.id === taskId);
          if (!task || task.claimed) return;
          setState((p) => {
            const energyGrant = withEarnedEnergy(p, task.rewardEnergy);
            return {
              ...p,
              corn: energyGrant.corn,
              stars: p.stars + task.rewardStars,
              treasury: withEarnedStars(energyGrant.treasury, task.rewardStars),
              battlePass: { ...p.battlePass, xp: p.battlePass.xp + 30 },
              dailyTasks: p.dailyTasks.map((t) => (t.id === taskId ? { ...t, claimed: true } : t)),
              stats: { ...p.stats, totalTasksClaimed: p.stats.totalTasksClaimed + 1 },
            };
          });
          showToast(`تم استلام مكافأة المهمة (+${task.rewardStars} ★ و +${task.rewardEnergy} طاقة)!`);
        }}
        onClaimDailyLevelReward={(rewardId, cornReward, eggsReward) => {
          const completedTasksCount = state.dailyTasks.filter((t) => t.claimed).length;
          const curTier = getPlayerTier(state);
          const unlocked =
            rewardId === 1
              ? completedTasksCount >= 2
              : state.dmdTotal >= 0.5 || curTier >= 3;
          if (!unlocked) {
            soundFX.playError();
            showToast(
              rewardId === 1
                ? 'أكمل واستلم مهمتين يوميتين أولاً لفتح هذه الجائزة!'
                : 'اجمع 0.50 DMD أو بلُغ الرتبة 3 لفتح هذه الجائزة!'
            );
            return;
          }
          setState((p) => {
            if (p.claimedDailyLevelRewards.includes(rewardId)) return p;
            const energyGrant = withEarnedEnergy(p, cornReward);
            return {
              ...p,
              corn: energyGrant.corn,
              treasury: energyGrant.treasury,
              eggQueue:
                eggsReward > 0
                  ? [...p.eggQueue, ...Array.from({ length: eggsReward }, () => 'egg_1' as EggItemType)]
                  : p.eggQueue,
              claimedDailyLevelRewards: [...p.claimedDailyLevelRewards, rewardId],
            };
          });
          showToast('تم استلام مكافأة المرحلة!');
        }}
        onClaimDailyPassDay={() => {
          if (state.stats.dailyPassClaimedToday) {
            soundFX.playError();
            showToast('تم استلام مكافأة اليوم بالفعل!');
            return;
          }
          const currentDay = Math.min(7, Math.max(1, state.stats.dailyPassDay || 1));
          const dayConfig = DAILY_PASS_REWARDS[currentDay - 1] ?? DAILY_PASS_REWARDS[0];
          setState((p) => {
            if (p.stats.dailyPassClaimedToday) return p;
            const granted = grantRewardBundle(p, dayConfig.reward, { applySoftCap: true }).nextState;
            return {
              ...granted,
              stats: {
                ...granted.stats,
                dailyPassClaimedToday: true,
              },
            };
          });
          triggerTelegramHaptic('success');
          showToast(
            `تم استلام ${dayConfig.titleAr} (+${dayConfig.reward.corn ?? 0}⚡ و +${dayConfig.reward.stars ?? 0}★)!`
          );
        }}
        onUnlockBattlePassPremium={() => {
          const cost = ACTIVE_SEASON.premiumFallbackStarsCost;
          if (state.battlePass.premiumUnlocked) return;
          if (state.stars < cost) {
            soundFX.playError();
            triggerTelegramHaptic('error');
            showToast(`تحتاج ${cost} ★ لتفعيل المسار الملكي!`);
            return;
          }
          setState((p) => ({
            ...p,
            stars: p.stars - cost,
            treasury: withBurnedStars(p.treasury, cost),
            battlePass: { ...p.battlePass, premiumUnlocked: true },
          }));
          triggerTelegramHaptic('success');
          showToast(`👑 تم تفعيل المسار الملكي لـ ${ACTIVE_SEASON.nameAr}!`);
        }}
        onClaimBattlePassReward={handleClaimBattlePassReward}
        onJoinPack={handleJoinPack}
        onContributePack={(amount) => {
          if (state.corn < amount) {
            soundFX.playError();
            triggerTelegramHaptic('error');
            showToast(`تحتاج ${amount.toLocaleString()} طاقة للتبرع للسرب!`);
            return;
          }
          setState((p) => {
            let nextTreasury = withBurnedEnergy(p.treasury, amount);
            nextTreasury = withEarnedStars(nextTreasury, 2);
            return {
              ...p,
              corn: p.corn - amount,
              stars: p.stars + 2,
              treasury: nextTreasury,
              pack: {
                ...p.pack,
                power: p.pack.power + 8,
                treasuryCorn: p.pack.treasuryCorn + amount,
              },
            };
          });
          showToast('تم دعم السرب (-500 طاقة · +8 قوة للسرب و +2 ★)!');
        }}
        onSendPackMessage={(text) => {
          if (firebaseUser?.emailVerified) {
            sendGlobalAllianceMessage(
              'global_swarm_alpha',
              firebaseUser.uid,
              latestStateRef.current.username,
              text
            ).catch(() => {});
          }
          setState((p) => ({
            ...p,
            pack: {
              ...p.pack,
              messages: [
                ...p.pack.messages,
                {
                  id: `msg_${Date.now()}`,
                  sender: p.username,
                  text,
                  time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                },
              ].slice(-35),
            },
          }));
        }}
        onToggleWalletConnect={() => {
          setState((p) => ({
            ...p,
            wallet: { ...p.wallet, connected: !p.wallet.connected },
          }));
        }}
        onSwapWallet={(direction) => {
          const tier = getPlayerTier(state);
          const starsEnergyCost = getBarterEnergyForStarsCost(tier);
          const goldEnergyCost = getBarterEnergyForGoldCost(tier);

          if (direction === 'CORN_TO_STARS') {
            if ((state.treasury.barterStarsToday ?? 0) >= ECONOMY_LIMITS.MAX_DAILY_BARTER_STARS) {
              soundFX.playError();
              showToast('اكتمل الحد اليومي لمقايضة النجوم!');
              return;
            }
            if (state.corn < starsEnergyCost) {
              soundFX.playError();
              showToast(`تحتاج ${starsEnergyCost.toLocaleString()} طاقة!`);
              return;
            }
            setState((p) => {
              let nextTreasury = withBurnedEnergy(p.treasury, starsEnergyCost);
              nextTreasury = withEarnedStars(nextTreasury, 10);
              return {
                ...p,
                corn: p.corn - starsEnergyCost,
                stars: p.stars + 10,
                treasury: { ...nextTreasury, barterStarsToday: (nextTreasury.barterStarsToday ?? 0) + 1 },
              };
            });
            showToast(`تمت المقايضة: +10 ★ مقابل ${starsEnergyCost.toLocaleString()} طاقة!`);
          } else if (direction === 'CORN_TO_GOLD') {
            if ((state.treasury.barterGoldToday ?? 0) >= ECONOMY_LIMITS.MAX_DAILY_BARTER_GOLD) {
              soundFX.playError();
              showToast('اكتمل الحد اليومي لمقايضة الذهب!');
              return;
            }
            if (state.corn < goldEnergyCost) {
              soundFX.playError();
              showToast(`تحتاج ${goldEnergyCost.toLocaleString()} طاقة!`);
              return;
            }
            setState((p) => {
              const nextTreasury = withBurnedEnergy(p.treasury, goldEnergyCost);
              return {
                ...p,
                corn: p.corn - goldEnergyCost,
                duckGold: p.duckGold + 12,
                treasury: { ...nextTreasury, barterGoldToday: (nextTreasury.barterGoldToday ?? 0) + 1 },
              };
            });
            showToast(`تمت المقايضة: +12 ذهب 💎 مقابل ${goldEnergyCost.toLocaleString()} طاقة!`);
          }
        }}
        onToggleMute={() => setState((p) => ({ ...p, muted: !p.muted }))}
        onToggleHaptics={() =>
          setState((p) => {
            const next = !(p.hapticsEnabled ?? true);
            setTelegramHapticsEnabled(next);
            if (next) triggerTelegramHaptic('light');
            return { ...p, hapticsEnabled: next };
          })
        }
        onToggleDragonMotion={() =>
          setState((p) => ({
            ...p,
            dragonMotionEnabled: !(p.dragonMotionEnabled ?? true),
          }))
        }
        onBackToTitle={() => {
          setModal(null);
          setScreen('TITLE');
        }}
        isTelegramVerified={tgVerified || Boolean(getTelegramUser())}
        isCloudConnected={Boolean(firebaseUser?.emailVerified)}
        cloudUserEmail={firebaseUser?.email ?? null}
        onSignInGoogle={handleGoogleSignIn}
        onSignOutGoogle={handleGoogleSignOut}
      />
    </div>
  );
}
