import React, { useEffect, useState, useCallback } from 'react';
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
  SquadTalentKey,
} from './types/game';
import {
  BATTLE_PASS_LEVELS,
  DRAGON_SLOTS,
  DUCK_EVOLUTION_LEVELS,
  EGG_ITEM_META,
  RARITY_ORDER,
  RARITY_STYLE,
  SKIN_CATALOG,
  STORE_PACKAGES,
  WEEKEND_EVENTS,
  checkSlotUnlockEligibility,
  createInitialGameState,
  createInitialMarketListings,
  createRandomGodOrder,
  formatCompactNumber,
  getCustomUpgradeCost,
  getDragonDmdPerHour,
  getDragonMaxCapDmd,
  getFeedCost,
  getLeagueMeta,
} from './data/gameData';
import { soundFX } from './utils/sound';
import {
  ECONOMY_LIMITS,
  RELIC_FORGE_CATALOG,
  RelicForgeOffer,
  SQUAD_TALENT_CATALOG,
  applySoftCapDamping,
  getBarterEnergyForGoldCost,
  getBarterEnergyForStarsCost,
  getBarterStarsToEnergyPayout,
  getDragonTrainingCost,
  getEnergySoftCap,
  getInstantSummonStarCost,
  getMarketListingScaledCornFloor,
  getPlayerTier,
  getSkillUpgradeCost,
  getSquadTalentCost,
  getTraderDealStarCost,
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

function loadSavedState(): { state: GameState; hasSave: boolean; offlineDmdEarned: number } {
  const defaults = createInitialGameState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameState>;
      if (parsed && Array.isArray(parsed.ducks) && Array.isArray(parsed.grid)) {
        const unlockedSlots = parsed.unlockedSlots ?? 3;
        const tier = getPlayerTier({
          ducks: parsed.ducks,
          unlockedSlots,
        });
        const elapsedHours = parsed.lastSavedAt
          ? Math.max(0, (Date.now() - parsed.lastSavedAt) / 3_600_000)
          : 0;
        let offlineDmdEarned = 0;

        const mergedDragons = parsed.ducks.map((d, idx) => {
          const slotIndex =
            d.slotIndex !== undefined ? d.slotIndex : idx < unlockedSlots ? idx : null;
          const activeSlot = slotIndex !== null && slotIndex < unlockedSlots ? slotIndex : null;
          const baseDragon: Duck = {
            ...d,
            customLevel: d.customLevel ?? 0,
            dmdStored: d.dmdStored ?? 0,
            slotIndex: activeSlot,
            feedCost: getFeedCost(d.level ?? 1, d.rarity ?? 'COMMON', tier),
            skillLevel: d.skillLevel ?? 1,
            trainingLevel: d.trainingLevel ?? 0,
            powerRating: d.powerRating ?? RARITY_STYLE[d.rarity].basePower + (d.level ?? 1) * 20,
          };
          const rate = getDragonDmdPerHour(baseDragon);
          const maxCap = getDragonMaxCapDmd(baseDragon);
          let nextStored = baseDragon.dmdStored;
          if (rate > 0 && elapsedHours > 0) {
            nextStored = Math.min(maxCap, baseDragon.dmdStored + rate * elapsedHours);
            offlineDmdEarned += Math.max(0, nextStored - baseDragon.dmdStored);
          }
          return {
            ...baseDragon,
            staked: rate > 0,
            stakeRatePerHour: rate,
            dmdStored: nextStored,
          };
        });
        const syncedGodCards = (parsed.godCards ?? defaults.godCards).map((g) =>
          g.godKey === 'harvest'
            ? {
                ...g,
                subtitle: 'توفير 20% طاقة إطعام',
                bonusDesc: 'يخفض تكلفة الإطعام بنسبة 20% مع ضمان حرق صافي لا يقل عن 80% في كل نقرة.',
              }
            : g
        );
        return {
          state: syncDailyEconomyState({
            ...defaults,
            ...parsed,
            ducks: mergedDragons,
            godCards: syncedGodCards,
            unlockedSlots,
            activeDuckIndex: Math.min(parsed.activeDuckIndex ?? 0, Math.max(0, mergedDragons.length - 1)),
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
          offlineDmdEarned,
        };
      }
    }
  } catch {
    // ignore corrupted save
  }
  return { state: defaults, hasSave: false, offlineDmdEarned: 0 };
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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastSavedAt: Date.now() }));
      setHasSave(true);
    } catch {
      // ignore storage quota
    }
  }, [state]);

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

  // 1-second simulation loop: DMD generation (ONLY LVL 5 + Custom_LVL >= 1 + Slot Efficiency + Max Cap), Market Auctions & Tournament timer
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const interval = setInterval(() => {
      setTimedBonusReadyIn((sec) => Math.max(0, sec - 1));
      setBlitzSecLeft((sec) => Math.max(0, sec - 1));

      setState((prevRaw) => {
        const prev = syncDailyEconomyState(prevRaw);
        let updatedDucks = prev.ducks.map((d) => {
          if (d.slotIndex === null || d.slotIndex >= prev.unlockedSlots) return d;
          const ratePerHour = getDragonDmdPerHour(d);
          if (ratePerHour <= 0) return d;
          const maxCap = getDragonMaxCapDmd(d);
          const nextStored = Math.min(maxCap, (d.dmdStored ?? 0) + ratePerHour / 3600);
          return {
            ...d,
            staked: true,
            stakeRatePerHour: ratePerHour,
            dmdStored: nextStored,
          };
        });

        let snipeOccurred = false;
        let wonAuction = false;

        const updatedListings = prev.marketListings.map((item) => {
          if (item.soldStatus !== 'ACTIVE') return item;

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
            const freeSlot = Array.from({ length: prev.unlockedSlots }, (_, i) => i).find(
              (sIdx) => !updatedDucks.some((dr) => dr.slotIndex === sIdx)
            );
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
              slotIndex: freeSlot ?? null,
              feedCost: getFeedCost(item.level, item.rarity, getPlayerTier(prev)),
              feedsProgress: item.level >= 5 ? 12 : 0,
              feedsRequired: DUCK_EVOLUTION_LEVELS[Math.max(0, Math.min(4, item.level - 1))].feedsRequired,
              staked: false,
              stakeRatePerHour: 0,
              xl: item.xl,
              skillLevel: 1,
              trainingLevel: 0,
              powerRating: RARITY_STYLE[item.rarity].basePower + item.level * 20,
              unlockedAt: Date.now(),
            };
            updatedDucks = [...updatedDucks, wonDragon];
            wonAuction = true;
            return { ...item, timeLeftSec: 0, soldStatus: 'SOLD_YOU' as const, rivalSniped: false };
          }
          return { ...item, timeLeftSec: 0, soldStatus: 'SOLD_OTHER' as const, rivalSniped: false };
        });

        if (snipeOccurred) soundFX.playAuctionAlert();
        if (wonAuction) soundFX.playVictory();

        const playerTier = getPlayerTier(prev);
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
            return freshPool
              .filter((l) => l.rarity === rar)
              .map((l) => ({ ...l, id: `${l.id}_${Date.now().toString().slice(-4)}` }));
          });
        }

        const tournamentEnding = prev.tournament.resetSeconds <= 1;
        const cycleBonusMedals =
          tournamentEnding && prev.tournament.score >= 25
            ? Math.min(30, Math.floor(prev.tournament.score / 25))
            : 0;

        return {
          ...prev,
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
  const currentWeekendEvent = WEEKEND_EVENTS[state.weekendEventIndex % WEEKEND_EVENTS.length];

  // === FEEDING HANDLER (Strictly NET Energy Burn; Combo accelerates evolution progress, NEVER refunds energy!) ===
  const handleFeedDuck = (
    duckId: string,
    comboMultiplier = 1,
    isCrit = false
  ): { burnedEnergy: number; tapSteps: number; leveledUp: boolean } | null => {
    const target = state.ducks.find((d) => d.id === duckId);
    if (!target || target.level >= target.maxLevel) return null;
    const playerTier = getPlayerTier(state);
    const baseFeedCost = getFeedCost(target.level, target.rarity, playerTier);
    // Harvest blessing is strictly capped at 20% reduction -> minimum 80% net Energy deduction every tap
    const effectiveCost = activeGodHarvest ? Math.ceil(baseFeedCost * 0.8) : baseFeedCost;
    if (state.corn < effectiveCost) {
      showToast(`طاقة الإطعام غير كافية (${effectiveCost}⚡ مطلوبة)! اجمع الطاقة من البيض أو الحلبة.`);
      return null;
    }

    const comboStepBonus = comboMultiplier >= 5 ? 1 : 0;
    const tapSteps = (isCrit ? 2 : 1) + comboStepBonus;
    const nextProgress = target.feedsProgress + tapSteps;
    const leveledUp = nextProgress >= target.feedsRequired;
    const nextLv = Math.min(target.maxLevel, target.level + 1);
    const nextEvoStage = DUCK_EVOLUTION_LEVELS[Math.max(0, Math.min(4, nextLv - 1))];
    const levelPowerGain = 30 + nextEvoStage.level * 15;

    setState((prev) => {
      const nextTier = getPlayerTier(prev);
      return {
        ...prev,
        corn: prev.corn - effectiveCost,
        treasury: withBurnedEnergy(prev.treasury, effectiveCost),
        battlePass: {
          ...prev.battlePass,
          xp: prev.battlePass.xp + (isCrit ? 6 : 3) + (leveledUp ? 30 : 0),
        },
        ducks: prev.ducks.map((d) => {
          if (d.id !== duckId) return d;
          if (leveledUp) {
            return {
              ...d,
              level: nextLv,
              feedCost: getFeedCost(nextLv, d.rarity, nextTier),
              powerRating: d.powerRating + levelPowerGain,
              feedsProgress: nextLv >= d.maxLevel ? nextEvoStage.feedsRequired : 0,
              feedsRequired: nextEvoStage.feedsRequired,
            };
          }
          return {
            ...d,
            feedsProgress: nextProgress,
          };
        }),
        eggQueue: (prev.stats.totalFeeds + 1) % 12 === 0 ? [...prev.eggQueue, 'egg_1'] : prev.eggQueue,
        stats: {
          ...prev.stats,
          totalFeeds: prev.stats.totalFeeds + 1,
          hearts: prev.stats.hearts + (target.skin === 'cupid' ? 14 : 8),
        },
        dailyTasks: prev.dailyTasks.map((dt) =>
          dt.id === 'dt_feed' ? { ...dt, progress: Math.min(dt.target, dt.progress + 1) } : dt
        ),
      };
    });

    if (leveledUp) {
      if (nextLv >= 5) {
        showToast('🔥 بلغ التنين المرحلة 5! خصّصه الآن بالنجوم لبدء توليد DMD!');
      } else {
        showToast(`ترقى التنين إلى ${nextEvoStage.titleAr}! (+${levelPowerGain} قوة ⚡)`);
      }
    }
    return { burnedEnergy: effectiveCost, tapSteps, leveledUp };
  };

  // === STAR CUSTOMIZATION UPGRADE (Custom_LVL 0 -> 10; Unlocks DMD generation at LVL 5!) ===
  const handleUpgradeStarCustomization = (duckId: string) => {
    const target = state.ducks.find((d) => d.id === duckId);
    if (!target) return;
    if (target.level < 5) {
      soundFX.playError();
      showToast('يجب وصول التنين إلى المرحلة 5 أولاً قبل التخصيص بالنجوم!');
      return;
    }
    if (target.customLevel >= 10) {
      soundFX.playError();
      showToast('وصل التنين إلى أقصى مستوى تخصيص بالنجوم (10/10)!');
      return;
    }

    const starCost = getCustomUpgradeCost(target.customLevel);
    if (state.stars < starCost) {
      soundFX.playError();
      showToast(`تحتاج ${starCost} نجمة ★ للترقية إلى التخصيص ${target.customLevel + 1}!`);
      return;
    }

    soundFX.playGodConfirm();
    setState((prev) => {
      const nextCustom = target.customLevel + 1;
      const updatedDucks = prev.ducks.map((d) => {
        if (d.id !== duckId) return d;
        const updated: Duck = {
          ...d,
          customLevel: nextCustom,
          staked: d.slotIndex !== null && d.slotIndex < prev.unlockedSlots,
          powerRating: d.powerRating + 45,
        };
        return {
          ...updated,
          stakeRatePerHour: getDragonDmdPerHour(updated),
        };
      });

      return {
        ...prev,
        stars: prev.stars - starCost,
        treasury: withBurnedStars(prev.treasury, starCost),
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 35 },
        ducks: updatedDucks,
      };
    });
    showToast(`⭐ تمت ترقية التخصيص إلى ★${target.customLevel + 1}! بدأ توليد DMD بنسبة +12%!`);
  };

  const handleCollectDragonDmd = (duckId: string) => {
    const target = state.ducks.find((d) => d.id === duckId);
    if (!target || target.dmdStored <= 0) {
      soundFX.playError();
      showToast('لا يوجد رصيد DMD متراكم للجمع حالياً.');
      return;
    }

    const collected = target.dmdStored;
    soundFX.playClaim();
    setState((prev) => ({
      ...prev,
      dmdTotal: prev.dmdTotal + collected,
      ducks: prev.ducks.map((d) =>
        d.id === duckId ? { ...d, dmd: d.dmd + collected, dmdStored: 0 } : d
      ),
    }));
    showToast(`تم جمع +${collected.toFixed(3)} DMD إلى رصيدك المستقبلي!`);
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
      const reserveDragon = prev.ducks.find((d) => d.slotIndex === null);
      let nextDucks = prev.ducks;
      let targetIdx = prev.activeDuckIndex;

      if (reserveDragon) {
        nextDucks = prev.ducks.map((d, idx) => {
          if (d.id !== reserveDragon.id) return d;
          targetIdx = idx;
          const updated = { ...d, slotIndex };
          const rate = getDragonDmdPerHour(updated);
          return { ...updated, staked: rate > 0, stakeRatePerHour: rate };
        });
      } else {
        const rarity = slotIndex >= 5 ? 'RARE' : 'UNCOMMON';
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
          slotIndex,
          feedCost: getFeedCost(1, rarity, getPlayerTier(prev)),
          feedsProgress: 0,
          feedsRequired: 5,
          staked: false,
          stakeRatePerHour: 0,
          skillLevel: 1,
          trainingLevel: 0,
          powerRating: slotIndex >= 5 ? 290 : 185,
          unlockedAt: Date.now(),
        };
        nextDucks = [...prev.ducks, newDragon];
        targetIdx = nextDucks.length - 1;
      }

      return {
        ...prev,
        stars: prev.stars - meta.starCost,
        treasury: withBurnedStars(prev.treasury, meta.starCost),
        unlockedSlots: slotIndex + 1,
        ducks: nextDucks,
        activeDuckIndex: targetIdx,
      };
    });

    showToast(`تم فتح ${meta.label} (كفاءة ${meta.efficiencyPct}%) بنجاح!`);
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
        if (d.id === duckId) {
          const next = { ...d, slotIndex };
          const rate = getDragonDmdPerHour(next);
          return { ...next, staked: rate > 0, stakeRatePerHour: rate };
        }
        if (currentOccupant && d.id === currentOccupant.id) {
          const next = { ...d, slotIndex: oldSlot };
          const rate = getDragonDmdPerHour(next);
          return { ...next, staked: rate > 0, stakeRatePerHour: rate };
        }
        return d;
      });
      return { ...prev, ducks: updatedDucks };
    });
    showToast(`تم نقل التنين إلى الخانة ${slotIndex + 1}!`);
  };

  const handleMergeDucks = (duckIds: string[]) => {
    const picked = state.ducks.filter((d) => duckIds.includes(d.id));
    if (picked.length !== 4) return;
    const curRarityIdx = RARITY_ORDER.indexOf(picked[0].rarity);
    const nextRarity: Rarity = RARITY_ORDER[Math.min(curRarityIdx + 1, RARITY_ORDER.length - 1)];
    const skins: DuckSkinId[] = ['gamer', 'pumpkin', 'pharaoh', 'royal', 'cool'];
    const newSkin = skins[(curRarityIdx + state.stats.totalDucksMerged) % skins.length];
    const freedSlot = picked.find((d) => d.slotIndex !== null)?.slotIndex ?? null;
    const autoCollectedDmd = picked.reduce((acc, d) => acc + (d.dmdStored ?? 0), 0);

    const mergedDragon: Duck = {
      id: `dragon_merged_${Date.now()}`,
      name: SKIN_CATALOG[newSkin].name,
      skin: newSkin,
      rarity: nextRarity,
      level: 1,
      maxLevel: 5,
      customLevel: 0,
      dmd: 0,
      dmdStored: 0,
      slotIndex: freedSlot,
      feedCost: getFeedCost(1, nextRarity, getPlayerTier(state)),
      feedsProgress: 0,
      feedsRequired: 5,
      staked: false,
      stakeRatePerHour: 0,
      skillLevel: 2,
      trainingLevel: 0,
      powerRating: RARITY_STYLE[nextRarity].basePower + 55,
      unlockedAt: Date.now(),
    };

    setState((prev) => {
      const remaining = prev.ducks.filter((d) => !duckIds.includes(d.id));
      return {
        ...prev,
        dmdTotal: prev.dmdTotal + autoCollectedDmd,
        ducks: [mergedDragon, ...remaining],
        activeDuckIndex: 0,
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 75 },
        stats: {
          ...prev.stats,
          totalDucksMerged: prev.stats.totalDucksMerged + 1,
        },
      };
    });
    showToast(
      autoCollectedDmd > 0.0005
        ? `نجح دمج التنانين! حصلت على تنين ${RARITY_STYLE[nextRarity].labelAr} وتم جمع +${autoCollectedDmd.toFixed(3)} DMD تلقائياً!`
        : `نجح دمج التنانين! حصلت على تنين ${RARITY_STYLE[nextRarity].labelAr}!`
    );
  };

  const handleCustomizeDuck = (duckId: string, gear: DuckGearId, aura: DuckAuraId) => {
    setState((prev) => ({
      ...prev,
      ducks: prev.ducks.map((d) => (d.id === duckId ? { ...d, gear, aura } : d)),
    }));
    showToast('تم حفظ مظهر التنين وتجهيزه بنجاح!');
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
      if (pkg.legendaryDragon) {
        const freeSlot = Array.from({ length: prev.unlockedSlots }, (_, i) => i).find(
          (sIdx) => !prev.ducks.some((dr) => dr.slotIndex === sIdx)
        );
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
          slotIndex: freeSlot ?? null,
          feedCost: getFeedCost(3, pkg.legendaryDragon.rarity, tier),
          feedsProgress: 0,
          feedsRequired: 9,
          staked: false,
          stakeRatePerHour: 0,
          gear: pkg.legendaryDragon.gear,
          aura: pkg.legendaryDragon.aura,
          skillLevel: 3,
          trainingLevel: 0,
          powerRating: RARITY_STYLE.LEGENDARY.basePower + 80,
          unlockedAt: Date.now(),
        };
        extraDucks = [leg, ...prev.ducks];
      }

      const energyGrant = withEarnedEnergy(prev, pkg.energyReward, true);
      const nextTreasury = withEarnedStars(energyGrant.treasury, pkg.starsReward);

      return {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + pkg.starsReward,
        ducks: extraDucks,
        activeDuckIndex: pkg.legendaryDragon ? 0 : prev.activeDuckIndex,
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

    const blitzMult = blitzSecLeft > 0 ? 2 : 1;
    const incubationMult = 1 + (state.pack.talents?.incubation ?? 0) * 0.03;
    const surgeMult = (state.activeBuffs?.eggSurgeUntil ?? 0) > Date.now() ? 1.2 : 1;
    const rawOrderCorn = Math.round(order.cornReward * blitzMult * incubationMult * surgeMult);
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
    if (payWith === 'gold' && state.duckGold < god.goldCost) return;
    if (payWith === 'stars' && state.stars < god.starCost) return;

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

  const handleSpinWheel = (mega: boolean) => {
    if (mega && state.stars < 100) return null;
    if (!mega && state.stats.medals < 100) return null;

    const outcomes = [
      { label: mega ? '2,100 طاقة ⚡' : '420 طاقة ⚡', type: 'corn' as const, amount: mega ? 2100 : 420 },
      { label: mega ? '28 نجوم ★' : '5 نجوم ★', type: 'stars' as const, amount: mega ? 28 : 5 },
      { label: mega ? '22 ذهب 💎' : '5 ذهب 💎', type: 'gold' as const, amount: mega ? 22 : 5 },
      { label: 'تنين نادر 🐉', type: 'duck' as const, amount: 1 },
      { label: mega ? '110 ميدالية 🏅' : '45 ميدالية 🏅', type: 'medals' as const, amount: mega ? 110 : 45 },
    ];
    const pick = outcomes[Math.floor(Math.random() * outcomes.length)];

    setState((prev) => {
      let extraDucks = prev.ducks;
      if (pick.type === 'duck') {
        const freeSlot = Array.from({ length: prev.unlockedSlots }, (_, i) => i).find(
          (sIdx) => !prev.ducks.some((dr) => dr.slotIndex === sIdx)
        );
        const newDragon: Duck = {
          id: `dragon_wheel_${Date.now()}`,
          name: 'التنين الإمبراطوري الملكي',
          skin: 'royal',
          rarity: 'RARE',
          level: 1,
          maxLevel: 5,
          customLevel: 0,
          dmd: 0,
          dmdStored: 0,
          slotIndex: freeSlot ?? null,
          feedCost: getFeedCost(1, 'RARE', getPlayerTier(prev)),
          feedsProgress: 0,
          feedsRequired: 5,
          staked: false,
          stakeRatePerHour: 0,
          skillLevel: 2,
          trainingLevel: 0,
          powerRating: 315,
          unlockedAt: Date.now(),
        };
        extraDucks = [...prev.ducks, newDragon];
      }
      const energyGrant =
        pick.type === 'corn'
          ? withEarnedEnergy(prev, pick.amount)
          : { corn: prev.corn, finalGain: 0, damped: false, treasury: prev.treasury };
      let nextTreasury = mega ? withBurnedStars(energyGrant.treasury, 100) : energyGrant.treasury;
      if (pick.type === 'stars') nextTreasury = withEarnedStars(nextTreasury, pick.amount);
      return {
        ...prev,
        corn: energyGrant.corn,
        stars: (mega ? prev.stars - 100 : prev.stars) + (pick.type === 'stars' ? pick.amount : 0),
        duckGold: pick.type === 'gold' ? prev.duckGold + pick.amount : prev.duckGold,
        treasury: nextTreasury,
        ducks: extraDucks,
        stats: {
          ...prev.stats,
          medals: (!mega ? prev.stats.medals - 100 : prev.stats.medals) + (pick.type === 'medals' ? pick.amount : 0),
          wheelSpins: prev.stats.wheelSpins + 1,
        },
      };
    });

    return pick;
  };

  const handleRedeemPromo = (code: string): { ok: boolean; message: string } => {
    const valid: Record<string, { corn: number; stars: number; gold: number; label: string }> = {
      DRAGON2026: { corn: 400, stars: 6, gold: 0, label: '+400 طاقة و +6 ★' },
      GOLD100: { corn: 0, stars: 0, gold: 8, label: '+8 ذهب تنانين' },
      DRACO50: { corn: 260, stars: 4, gold: 0, label: '+260 طاقة و +4 ★' },
    };
    const match = valid[code];
    if (!match) return { ok: false, message: 'الرمز غير صحيح! جرّب DRAGON2026 أو GOLD100' };
    if (state.usedPromoCodes.includes(code)) return { ok: false, message: 'تم استخدام هذا الرمز مسبقاً.' };

    setState((prev) => {
      const energyGrant = withEarnedEnergy(prev, match.corn);
      return {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + match.stars,
        duckGold: prev.duckGold + match.gold,
        treasury: withEarnedStars(energyGrant.treasury, match.stars),
        usedPromoCodes: [...prev.usedPromoCodes, code],
      };
    });
    return { ok: true, message: `تم التفعيل! حصلت على ${match.label}` };
  };

  const handleBidListing = (listingId: string) => {
    const item = state.marketListings.find((l) => l.id === listingId);
    if (!item || item.soldStatus !== 'ACTIVE') return;
    const bidCost = Math.round(item.cornPrice * 1.12);
    if (state.corn < bidCost) return;

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
    if (!item || item.soldStatus !== 'ACTIVE' || state.stars < item.starPrice) return;

    const freeSlot = Array.from({ length: state.unlockedSlots }, (_, i) => i).find(
      (sIdx) => !state.ducks.some((dr) => dr.slotIndex === sIdx)
    );
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
      slotIndex: freeSlot ?? null,
      feedCost: getFeedCost(item.level, item.rarity, getPlayerTier(state)),
      feedsProgress: item.level >= 5 ? 12 : 0,
      feedsRequired: DUCK_EVOLUTION_LEVELS[Math.max(0, Math.min(4, item.level - 1))].feedsRequired,
      staked: false,
      stakeRatePerHour: 0,
      xl: item.xl,
      skillLevel: 2,
      trainingLevel: 0,
      powerRating: RARITY_STYLE[item.rarity].basePower + item.level * 20,
      unlockedAt: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      stars: prev.stars - item.starPrice,
      treasury: withBurnedStars(prev.treasury, item.starPrice),
      ducks: [...prev.ducks, wonDragon],
      marketListings: prev.marketListings.map((l) =>
        l.id === listingId ? { ...l, soldStatus: 'SOLD_YOU', timeLeftSec: 0 } : l
      ),
    }));
    showToast(`تم اقتناء ${item.duckName} بنجاح!`);
  };

  const handleBattleResult = useCallback(
    (won: boolean, rewardCorn: number, rewardStars: number, leaguePts: number, xp: number, gold: number) => {
      const eventStarMult = won ? currentWeekendEvent.starBonusMult : 1;
      const plunderMult = activeGodPlunder && won ? 1.35 : 1;

      setState((prev) => {
        const activeDragon = prev.ducks[prev.activeDuckIndex] ?? prev.ducks[0];
        const pharaohMult = won && activeDragon?.skin === 'pharaoh' ? 1.2 : 1;
        const royalMult = activeDragon?.skin === 'royal' ? 1.2 : 1;
        const winsUsed = prev.treasury.arenaFullWinsToday ?? 0;
        const capRatio = won && winsUsed >= ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS
          ? ECONOMY_LIMITS.ARENA_AFTER_CAP_RATIO
          : 1;
        const rawCorn = Math.max(15, Math.round(rewardCorn * plunderMult * pharaohMult * capRatio));
        const finalStars = won
          ? Math.max(1, Math.round(rewardStars * eventStarMult * capRatio))
          : rewardStars;
        const finalGold = gold > 0 ? Math.max(1, Math.round(gold * pharaohMult * capRatio)) : 0;
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
    [activeGodPlunder, currentWeekendEvent.starBonusMult]
  );

  const handleRaceResult = useCallback(
    (place: number, rewardCorn: number, rewardStars: number, leaguePts: number, xp: number) => {
      const activeDragon = state.ducks[state.activeDuckIndex] ?? state.ducks[0];
      const pharaohMult = place <= 2 && activeDragon?.skin === 'pharaoh' ? 1.2 : 1;
      const royalMult = activeDragon?.skin === 'royal' ? 1.2 : 1;
      const winsUsed = state.treasury.arenaFullWinsToday ?? 0;
      const isFullWinCounted = place <= 2;
      const capRatio = isFullWinCounted && winsUsed >= ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS
        ? ECONOMY_LIMITS.ARENA_AFTER_CAP_RATIO
        : 1;
      const rawCorn = Math.max(20, Math.round(rewardCorn * pharaohMult * capRatio));
      const finalStars = rewardStars > 0
        ? Math.max(1, Math.round(rewardStars * currentWeekendEvent.starBonusMult * capRatio))
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
              ? (nextTreasury.arenaFullWinsToday ?? 0) + 1
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
    [currentWeekendEvent.starBonusMult, showToast, state.activeDuckIndex, state.ducks, state.treasury.arenaFullWinsToday]
  );

  const handleClaimDailyLeague = () => {
    if (state.league.dailyClaimed) return;
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
          const freeSlot = Array.from({ length: prev.unlockedSlots }, (_, i) => i).find(
            (sIdx) => !prev.ducks.some((dr) => dr.slotIndex === sIdx)
          );
          extraDucks = [
            {
              id: `dragon_bp_${Date.now()}`,
              name: 'التنين الإمبراطوري الأسطوري',
              skin: 'royal',
              rarity: 'LEGENDARY',
              level: 1,
              maxLevel: 5,
              customLevel: 0,
              dmd: 0,
              dmdStored: 0,
              slotIndex: freeSlot ?? null,
              feedCost: getFeedCost(1, 'LEGENDARY', getPlayerTier(prev)),
              feedsProgress: 0,
              feedsRequired: 5,
              staked: false,
              stakeRatePerHour: 0,
              skillLevel: 3,
              trainingLevel: 0,
              powerRating: 750,
              unlockedAt: Date.now(),
            },
            ...prev.ducks,
          ];
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
        hasSavedProgress={hasSave}
        savedDmd={state.dmdTotal}
        savedDuckCount={state.ducks.length}
        muted={state.muted}
        onToggleMute={() => setState((p) => ({ ...p, muted: !p.muted }))}
        onStart={() => {
          setScreen('PLAYING');
          if (!offlineNoticeShown && initialLoaded.offlineDmdEarned > 0.0005) {
            setOfflineNoticeShown(true);
            showToast(`🐉 ولّدت تنانينك +${initialLoaded.offlineDmdEarned.toFixed(3)} DMD أثناء غيابك!`);
          }
        }}
        onResetNewGame={() => {
          const fresh = createInitialGameState();
          setState(fresh);
          setOfflineNoticeShown(true);
          setScreen('PLAYING');
        }}
      />
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#0b0d14] text-slate-100 overflow-hidden select-none">
      {/* Persistent Top Bar (Overlap-Free Mobile & Desktop) */}
      <header className="shrink-0 h-14 px-2 sm:px-5 bg-[#12151f] border-b border-slate-800/90 flex items-center justify-between gap-1.5 z-20">
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
            onUpgradeStarCustomization={handleUpgradeStarCustomization}
            onCollectDragonDmd={handleCollectDragonDmd}
            onUpgradeDuckSkill={handleUpgradeDuckSkill}
            onTrainDragon={handleTrainDragon}
            onOpenSquadTalents={() => {
              setPackInitialSubTab('TALENTS');
              setModal('PACK');
            }}
            onCustomizeDuck={handleCustomizeDuck}
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
            onClaimTreasureStep={(threshold, cornReward, starReward) => {
              setState((p) => {
                const energyGrant = withEarnedEnergy(p, cornReward);
                return {
                  ...p,
                  corn: energyGrant.corn,
                  stars: p.stars + starReward,
                  treasury: withEarnedStars(energyGrant.treasury, starReward),
                  claimedTreasureSteps: [...p.claimedTreasureSteps, threshold],
                };
              });
              showToast(`تم استلام مكافأة الكنز (+${cornReward.toLocaleString()} طاقة و +${starReward} ★)!`);
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
            onClaimHonorPack={(id, cost, cornReward, starReward) => {
              setState((p) => {
                const energyGrant = withEarnedEnergy(p, cornReward);
                return {
                  ...p,
                  corn: energyGrant.corn,
                  stars: p.stars + starReward,
                  treasury: withEarnedStars(energyGrant.treasury, starReward),
                  claimedHonorPacks: [...p.claimedHonorPacks, id],
                  stats: { ...p.stats, honorLetters: p.stats.honorLetters - cost },
                };
              });
              showToast(`تم استلام حزمة الشرف (+${cornReward.toLocaleString()} طاقة و +${starReward} ★)!`);
            }}
            onClaimWatchBonus={() => handleWatchRewardedAd('energy')}
            onClaimAchievement={(id, rewardCorn, rewardStars) => {
              setState((p) => {
                const energyGrant = withEarnedEnergy(p, rewardCorn);
                return {
                  ...p,
                  corn: energyGrant.corn,
                  stars: p.stars + rewardStars,
                  treasury: withEarnedStars(energyGrant.treasury, rewardStars),
                  claimedAchievements: [...p.claimedAchievements, id],
                };
              });
              showToast('تم استلام مكافأة الإنجاز!');
            }}
            onClaimHeartMilestone={(threshold, rewardType) => {
              setState((p) => {
                let extraDucks = p.ducks;
                if (rewardType === 'duck') {
                  const freeSlot = Array.from({ length: p.unlockedSlots }, (_, i) => i).find(
                    (sIdx) => !p.ducks.some((dr) => dr.slotIndex === sIdx)
                  );
                  extraDucks = [
                    ...p.ducks,
                    {
                      id: `dragon_heart_${Date.now()}`,
                      name: 'تنين القلوب الوردية',
                      skin: 'cupid',
                      rarity: 'RARE',
                      level: 1,
                      maxLevel: 5,
                      customLevel: 0,
                      dmd: 0,
                      dmdStored: 0,
                      slotIndex: freeSlot ?? null,
                      feedCost: getFeedCost(1, 'RARE', getPlayerTier(p)),
                      feedsProgress: 0,
                      feedsRequired: 5,
                      staked: false,
                      stakeRatePerHour: 0,
                      skillLevel: 2,
                      trainingLevel: 0,
                      powerRating: 310,
                      unlockedAt: Date.now(),
                    },
                  ];
                }
                const energyGrant =
                  rewardType === 'corn'
                    ? withEarnedEnergy(p, 380)
                    : { corn: p.corn, finalGain: 0, damped: false, treasury: p.treasury };
                const nextTreasury =
                  rewardType === 'stars' ? withEarnedStars(energyGrant.treasury, 4) : energyGrant.treasury;
                return {
                  ...p,
                  stars: rewardType === 'stars' ? p.stars + 4 : p.stars,
                  corn: energyGrant.corn,
                  treasury: nextTreasury,
                  ducks: extraDucks,
                  claimedHeartMilestones: [...p.claimedHeartMilestones, threshold],
                };
              });
              showToast('تم استلام مكافأة القلوب!');
            }}
            onClaimSocial={(id, rewardCorn) => {
              setState((p) => {
                const energyGrant = withEarnedEnergy(p, rewardCorn);
                return {
                  ...p,
                  corn: energyGrant.corn,
                  treasury: energyGrant.treasury,
                  claimedSocials: [...p.claimedSocials, id],
                };
              });
              showToast(`+${rewardCorn} طاقة من المهام الاجتماعية!`);
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
              const freeSlot = Array.from({ length: state.unlockedSlots }, (_, i) => i).find(
                (sIdx) => !state.ducks.some((dr) => dr.slotIndex === sIdx)
              );
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
                slotIndex: freeSlot ?? null,
                feedCost: getFeedCost(1, rarity, getPlayerTier(state)),
                feedsProgress: 0,
                feedsRequired: 5,
                staked: false,
                stakeRatePerHour: 0,
                skillLevel: 2,
                trainingLevel: 0,
                powerRating: RARITY_STYLE[rarity].basePower + 25,
                unlockedAt: Date.now(),
              };
              setState((p) => ({
                ...p,
                stars: p.stars - cost,
                treasury: withBurnedStars(p.treasury, cost),
                ducks: [newDragon, ...p.ducks],
                activeDuckIndex: 0,
              }));
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
                const remaining = p.ducks.filter((d) => d.id !== duckId);
                const energyGrant = withEarnedEnergy(p, cornPrice);
                return {
                  ...p,
                  dmdTotal: p.dmdTotal + (soldDragon.dmdStored ?? 0),
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
      <nav className="shrink-0 h-16 bg-[#12151f] border-t border-slate-800/90 px-1 flex items-center justify-around z-20">
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
                if (item.id === 'GODS') {
                  setGodsInitialSubTab('GODS');
                }
                setActiveTab(item.id);
              }}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all cursor-pointer min-w-[50px] ${
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
        onClaimTournamentMilestone={(threshold, type, amount) => {
          setState((p) => ({
            ...p,
            duckGold: type === 'gold' ? p.duckGold + amount : p.duckGold,
            eggQueue:
              type === 'eggs'
                ? [...p.eggQueue, ...Array.from({ length: amount }, () => 'egg_1' as EggItemType)]
                : p.eggQueue,
            stats: {
              ...p.stats,
              medals: type === 'medals' ? p.stats.medals + amount : p.stats.medals,
            },
            tournament: {
              ...p.tournament,
              claimedMilestones: [...p.tournament.claimedMilestones, threshold],
            },
          }));
          showToast('تم استلام جائزة البطولة الكبرى!');
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
          setState((p) => {
            const energyGrant = withEarnedEnergy(p, 320);
            return {
              ...p,
              corn: energyGrant.corn,
              stars: p.stars + 3,
              treasury: withEarnedStars(energyGrant.treasury, 3),
              eggQueue: ['egg_2', 'egg_2', ...p.eggQueue],
              stats: {
                ...p.stats,
                dailyPassClaimedToday: true,
                autoMergeBoosters: p.stats.autoMergeBoosters + 1,
              },
            };
          });
          showToast('تم استلام هدية اليوم (+320 طاقة و +3 ★)!');
        }}
        onUnlockBattlePassPremium={() => {
          if (state.stars < 60 || state.battlePass.premiumUnlocked) return;
          setState((p) => ({
            ...p,
            stars: p.stars - 60,
            treasury: withBurnedStars(p.treasury, 60),
            battlePass: { ...p.battlePass, premiumUnlocked: true },
          }));
          showToast('👑 تم تفعيل المسار الملكي لتذكرة الموسم!');
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
          if (state.corn < amount) return;
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
        onResetGame={() => {
          const fresh = createInitialGameState();
          setState(fresh);
          setModal(null);
          showToast('تم بدء رحلة جديدة في عالم التنانين!');
        }}
      />
    </div>
  );
}
