import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  CheckSquare,
  Crown,
  Egg,
  Flame,
  Sparkles,
  Store,
  Swords,
  TrendingUp,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';
import {
  AppScreen,
  Duck,
  DuckAuraId,
  DuckGearId,
  DuckSkinId,
  EggItemType,
  GameState,
  MainTab,
  Rarity,
  RewardBundle,
  SquadTalentKey,
} from './types/game';
import {
  ACHIEVEMENTS_REGISTRY,
  ACTIVE_SEASON,
  BATTLE_PASS_LEVELS,
  DAILY_PASS_REWARDS,
  DRAGON_SLOTS,
  DUCK_EVOLUTION_LEVELS,
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
  triggerTelegramHaptic,
} from './utils/telegram';
import {
  ECONOMY_LIMITS,
  RELIC_FORGE_CATALOG,
  RelicForgeOffer,
  SQUAD_TALENT_CATALOG,
  applySoftCapDamping,
  calculateCustomUpgradeCost,
  clampCustomLevel,
  getBarterEnergyForGoldCost,
  getBarterEnergyForStarsCost,
  getBarterStarsToEnergyPayout,
  getCumulativeDmdAtCustomLevel,
  getDragonTrainingCost,
  getEnergySoftCap,
  getInstantSummonStarCost,
  getLevelRequiredFeeds,
  getMarketListingScaledCornFloor,
  getPlayerTier,
  getSkillUpgradeCost,
  getSquadTalentCost,
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
  const res = bypassSoftCap
    ? { finalGain: Math.round(rawGain), damped: false, multiplier: 1 }
    : applySoftCapDamping(rawGain, prev.corn, softCap);
  return {
    corn: prev.corn + res.finalGain,
    finalGain: res.finalGain,
    damped: res.damped,
    treasury: {
      ...prev.treasury,
      energyEarnedToday: (prev.treasury.energyEarnedToday ?? 0) + res.finalGain,
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

        return {
          state: syncDailyEconomyState({
            ...defaults,
            ...parsed,
            schemaVersion: 3,
            username: resolvedUsername,
            dmdTotal: (parsed.dmdTotal ?? 0) + legacyDmdFolded,
            breedingEggs: (parsed.breedingEggs ?? 0) + offlineBreedingEggs,
            customizedVault: parsed.customizedVault ?? [],
            ducks: normalizedDragons,
            godCards: syncedGodCards,
            unlockedSlots,
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
              talents: {
                ...(defaults.pack.talents ?? { fury: 0, carapace: 0, incubation: 0, prestige: 0 }),
                ...(parsed.pack?.talents ?? {}),
              },
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
  return {
    state: {
      ...defaults,
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
  const [godsInitialSubTab, setGodsInitialSubTab] = useState<'TREASURES' | 'TASKS' | 'GODS'>('GODS');
  const [packInitialSubTab, setPackInitialSubTab] = useState<'CHAT' | 'TALENTS' | 'FORGE'>('CHAT');
  const [modal, setModal] = useState<ActiveModal>(null);
  const [state, setState] = useState<GameState>(initialLoaded.state);
  const [hasSave, setHasSave] = useState<boolean>(initialLoaded.hasSave);
  const [offlineNoticeShown, setOfflineNoticeShown] = useState(false);
  const [timedBonusReadyIn, setTimedBonusReadyIn] = useState<number>(0);
  const [blitzSecLeft, setBlitzSecLeft] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);

  const latestStateRef = useRef<GameState>(state);
  latestStateRef.current = state;
  const dirtySaveRef = useRef<boolean>(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const flushSaveNow = useCallback((stateToSave?: GameState) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...(stateToSave ?? latestStateRef.current), lastSavedAt: Date.now() })
      );
      dirtySaveRef.current = false;
      setHasSave(true);
    } catch {
      // ignore storage quota
    }
  }, []);

  useEffect(() => {
    return initTelegramWebApp();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    soundFX.muted = state.muted;
  }, [state.muted]);

  useEffect(() => {
    dirtySaveRef.current = true;
    if (!saveTimerRef.current) {
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        if (dirtySaveRef.current) {
          flushSaveNow();
        }
      }, 2500);
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

  // 1-second simulation loop: 8h Cost Reset Timer, 24h Breeding Gate + 15m Eggs, Market Auctions & Tournament timer
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const interval = setInterval(() => {
      setTimedBonusReadyIn((sec) => Math.max(0, sec - 1));
      setBlitzSecLeft((sec) => Math.max(0, sec - 1));

      setState((prevRaw) => {
        const prev = syncDailyEconomyState(prevRaw);
        const nowTs = Date.now();
        const playerTier = getPlayerTier(prev);
        let eggsGainedThisTick = 0;

        let updatedDucks = prev.ducks.map((d) => {
          let changed = false;
          let next = d;

          // 1. 8-hour Feed Cost Reset Timer
          if (d.costResetEndsAt && nowTs >= d.costResetEndsAt) {
            changed = true;
            next = {
              ...next,
              costResetEndsAt: null,
              feedClicksSinceReset: 0,
              feedCost: getFeedCost(d.level, d.rarity, playerTier, 0, d),
            };
          }

          // 2. 24-hour Breeding Gate + 15-minute Breeding Egg generator
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
        });

        let snipeOccurred = false;
        let wonAuction = false;

        const updatedListings = prev.marketListings
          .filter((item) => item.soldStatus === 'ACTIVE' || !item.soldAt || nowTs - item.soldAt <= 6000)
          .map((item) => {
            if (item.soldStatus !== 'ACTIVE') {
              return item.soldAt ? item : { ...item, soldAt: nowTs };
            }

            if (item.isUserBid && item.timeLeftSec <= 5 && item.timeLeftSec >= 2 && Math.random() < 0.42) {
              const rivalName = AUCTION_RIVALS[Math.floor(Math.random() * AUCTION_RIVALS.length)];
              snipeOccurred = true;
              return {
                ...item,
                cornPrice: Math.round(item.cornPrice * 1.1),
                isUserBid: false,
                rivalSniped: true,
                lastBidder: rivalName,
                timeLeftSec: item.timeLeftSec + 6,
              };
            }

            if (item.timeLeftSec > 1) {
              return { ...item, timeLeftSec: item.timeLeftSec - 1 };
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
              return { ...item, timeLeftSec: 0, soldStatus: 'SOLD_YOU' as const, soldAt: nowTs, rivalSniped: false };
            }
            return { ...item, timeLeftSec: 0, soldStatus: 'SOLD_OTHER' as const, soldAt: nowTs, rivalSniped: false };
          });

        if (snipeOccurred) soundFX.playAuctionAlert();
        if (wonAuction) soundFX.playVictory();

        const marketRarities: Rarity[] = ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
        const missingRarity = marketRarities.some(
          (rar) => !updatedListings.some((l) => l.rarity === rar && l.soldStatus === 'ACTIVE')
        );
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

        const tournamentEnding = prev.tournament.resetSeconds <= 1;
        const cycleBonusMedals =
          tournamentEnding && prev.tournament.score >= 25
            ? Math.min(30, Math.floor(prev.tournament.score / 25))
            : 0;

        return {
          ...prev,
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
              }
            : {
                ...prev.tournament,
                resetSeconds: prev.tournament.resetSeconds - 1,
              },
        };
      });
    }, 1000);

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
    setBlitzSecLeft(30);
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
    if (state.stars < 10) return;
    setState((prev) => ({
      ...prev,
      stars: prev.stars - 10,
      treasury: withBurnedStars(prev.treasury, 10),
      grid: prev.grid.map((c) => (c.index === cellIndex ? { ...c, locked: false } : c)),
    }));
    showToast('تم فتح خانة جديدة في حقل البيض!');
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
      marketListings: prev.marketListings.map((l) =>
        l.id === listingId
          ? {
              ...l,
              cornPrice: bidCost,
              isUserBid: true,
              rivalSniped: false,
              lastBidder: prev.username,
              timeLeftSec: Math.max(l.timeLeftSec, 8),
            }
          : l
      ),
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
        l.id === listingId ? { ...l, soldStatus: 'SOLD_YOU', soldAt: soldNow, timeLeftSec: 0 } : l
      ),
    }));
    showToast(`تم اقتناء ${item.duckName} بنجاح!`);
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
        isTelegramVerified={Boolean(getTelegramUser())}
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
              setPackInitialSubTab('CHAT');
              setModal('PACK');
            }}
            className="flex items-center gap-1 px-2 sm:px-2.5 h-9 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-rose-400/60 text-[11px] sm:text-xs font-bold text-slate-100 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
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
      <main className="flex-1 overflow-hidden relative">
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
              setPackInitialSubTab('TALENTS');
              setModal('PACK');
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
              setTimedBonusReadyIn(ECONOMY_LIMITS.TIMED_BONUS_COOLDOWN_SEC);
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
            onDeliverToGod={handleDeliverToGod}
            onOpenSnackChest={handleOpenSnackChest}
            onUnlockGridSlot={handleUnlockGridSlot}
            onOpenTournament={() => setModal('TOURNAMENT')}
          />
        )}

        {activeTab === 'ARENA' && (
          <ArenaTab
            state={state}
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
            onBidListing={handleBidListing}
            onBuyNowListing={handleBuyNowListing}
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
          { id: 'GODS' as MainTab, label: 'البركات', icon: Sparkles, badge: 0 },
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
        onJoinPack={() => {
          setState((p) => {
            const energyGrant = withEarnedEnergy(p, 240);
            return {
              ...p,
              corn: energyGrant.corn,
              stars: p.stars + 3,
              treasury: withEarnedStars(energyGrant.treasury, 3),
              pack: { ...p.pack, joined: true, members: p.pack.members + 1 },
            };
          });
          showToast('انضممت إلى عش التنانين (+240 طاقة و +3 ★)!');
        }}
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
              ],
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
        onBackToTitle={() => {
          setModal(null);
          setScreen('TITLE');
        }}
      />
    </div>
  );
}
