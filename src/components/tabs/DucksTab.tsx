import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Clock,
  Crown,
  Egg as EggIcon,
  Flame,
  Gavel,
  Gift,
  Heart,
  Lock,
  PlayCircle,
  Plus,
  Sparkles,
  Star,
  TimerReset,
} from 'lucide-react';
import { Duck, GameState, Rarity } from '../../types/game';
import {
  ACTIVE_SEASON,
  BATTLE_PASS_LEVELS,
  DUCK_SKILLS,
  RARITY_STYLE,
  checkSlotUnlockEligibility,
  formatTimer,
  getCustomUpgradeCost,
  getDragonElement,
  getDragonSlotMeta,
  getDragonVaultDmdPrice,
  getDuckCombatStats,
  getFeedCost,
  getSlotEfficiency,
} from '../../data/gameData';
import {
  ECONOMY_LIMITS,
  clampCustomLevel,
  getCumulativeDmdAtCustomLevel,
  getDragonTrainingCost,
  getNextCustomDmdGain,
  getPlayerTier,
  getSkillUpgradeCost,
  getStarTierMeta,
  getXlEggUpgradeCost,
  isDragonSlotLocked,
  resolveDragonSize,
} from '../../utils/economyEngine';
import { CornIcon, DmdIcon, DragonIllustration, StarIcon } from '../art/DuckArt';
import { SanctuaryBackdrop } from '../art/SceneBackdrops';
import { soundFX } from '../../utils/sound';

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  text: string;
  isCrit?: boolean;
}

interface DucksTabProps {
  state: GameState;
  onSelectDuck: (index: number) => void;
  onFeedDuck: (
    duckId: string,
    comboMultiplier: number,
    isCrit: boolean
  ) => { burnedEnergy: number; tapSteps: number; leveledUp: boolean } | null;
  onStartBreeding: (duckId: string) => void;
  onUpgradeXlWithEggs: (duckId: string) => void;
  onTrainDragon: (duckId: string) => void;
  onUpgradeStarCustomization: (duckId: string, steps?: number) => void;
  onUpgradeDuckSkill: (duckId: string) => void;
  onUnlockSlot: (slotIndex: number) => void;
  onMergeDucks: (duckIds: string[]) => void;
  onWatchRewardedAd: (kind: 'energy' | 'stars' | 'eggs') => void;
  onOpenPass: (tab: 'SEASON' | 'DAILY') => void;
  onOpenTasksTab: () => void;
  onOpenDragonAuction: (duckId: string) => void;
  onClaimTimedBonus: () => void;
  timedBonusReadyIn: number;
  onClaimExtraChest: () => void;
  extraChestReadyIn: number;
}

function formatHms(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const LiveRemainingHms: React.FC<{
  targetMs: number;
  prefix?: string;
  sliceFrom?: number;
}> = ({ targetMs, prefix = '', sliceFrom = 0 }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  const text = formatHms(Math.max(0, targetMs - now));
  return <>{prefix}{sliceFrom > 0 ? text.slice(sliceFrom) : text}</>;
};

const LiveBreedingProgressBar: React.FC<{ breedingEndsAt: number }> = ({ breedingEndsAt }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [breedingEndsAt]);
  const rem = Math.max(0, breedingEndsAt - now);
  const pct = Math.min(100, Math.max(2, ((ECONOMY_LIMITS.BREEDING_DURATION_MS - rem) / ECONOMY_LIMITS.BREEDING_DURATION_MS) * 100));
  return (
    <div
      className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-300"
      style={{ width: `${pct}%` }}
    />
  );
};

const LiveEggCycleCountdown: React.FC<{ lastBreedingEggAt: number }> = ({ lastBreedingEggAt }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lastBreedingEggAt]);
  const rem = Math.max(
    0,
    ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS -
      ((now - lastBreedingEggAt) % ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS)
  );
  return <>{formatHms(rem).slice(3)}</>;
};

export const DucksTab: React.FC<DucksTabProps> = ({
  state,
  onSelectDuck,
  onFeedDuck,
  onStartBreeding,
  onUpgradeXlWithEggs,
  onTrainDragon,
  onUpgradeStarCustomization,
  onUpgradeDuckSkill,
  onUnlockSlot,
  onMergeDucks,
  onWatchRewardedAd,
  onOpenPass,
  onOpenTasksTab,
  onOpenDragonAuction,
  onClaimTimedBonus,
  timedBonusReadyIn,
  onClaimExtraChest,
  extraChestReadyIn,
}) => {
  const [subView, setSubView] = useState<'MAIN' | 'CUSTOM' | 'MERGE' | 'VAULT'>('MAIN');
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [comboCount, setComboCount] = useState(0);
  const [feverSecLeft, setFeverSecLeft] = useState(0);
  const [evolvedBurst, setEvolvedBurst] = useState(false);
  const [mergeMode, setMergeMode] = useState<'TO_XL' | 'TO_XXL'>('TO_XL');
  const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>([]);
  const [selectedLockedSlot, setSelectedLockedSlot] = useState<number | null>(null);

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const particleIdRef = useRef(0);
  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDuckRaw: Duck | undefined = state.ducks[state.activeDuckIndex] ?? state.ducks[0];
  const activeDuck: Duck | undefined = useMemo(() => {
    if (!activeDuckRaw || !isDragonSlotLocked(activeDuckRaw, state.unlockedSlots)) {
      return activeDuckRaw;
    }
    return state.ducks.find((d, i) => (d.slotIndex ?? i) < state.unlockedSlots) ?? activeDuckRaw;
  }, [activeDuckRaw, state.ducks, state.unlockedSlots]);

  const orderedSlots = useMemo(
    () =>
      state.ducks
        .map((dragon, arrayIdx) => ({
          dragon,
          arrayIdx,
          slotIndex: dragon.slotIndex ?? arrayIdx,
        }))
        .sort((a, b) => a.slotIndex - b.slotIndex),
    [state.ducks]
  );

  const rarityStyle = activeDuck ? RARITY_STYLE[activeDuck.rarity] : RARITY_STYLE.COMMON;
  const activeSize = resolveDragonSize(activeDuck);
  const isMaxLevel = activeDuck ? activeDuck.level >= activeDuck.maxLevel : false;
  const duckSkill = activeDuck ? DUCK_SKILLS[activeDuck.skin] : DUCK_SKILLS.aqua;
  const playerTier = getPlayerTier(state);

  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (feverSecLeft <= 0) return;
    const timer = setInterval(() => {
      setFeverSecLeft((s) => (s <= 0.5 ? 0 : s - 0.5));
    }, 500);
    return () => clearInterval(timer);
  }, [feverSecLeft > 0]);

  const isFever = feverSecLeft > 0;
  const comboMultiplier = isFever ? 5 : comboCount >= 10 ? 3 : comboCount >= 5 ? 2 : 1;

  const passLevel = Math.min(ACTIVE_SEASON.passLevels, Math.floor(state.battlePass.xp / 100) + 1);
  const hasClaimablePass = BATTLE_PASS_LEVELS.some(
    (lv) =>
      passLevel >= lv.level &&
      (!state.battlePass.claimedFree.includes(lv.level) ||
        (state.battlePass.premiumUnlocked && !state.battlePass.claimedPremium.includes(lv.level)))
  );
  const hasClaimableDailyPass = !state.stats.dailyPassClaimedToday;
  const claimableTasksCount = state.dailyTasks.filter((t) => !t.claimed && t.progress >= t.target).length;
  const drawerBadgeCount =
    (hasClaimablePass ? 1 : 0) +
    (hasClaimableDailyPass ? 1 : 0) +
    (timedBonusReadyIn === 0 ? 1 : 0) +
    (extraChestReadyIn === 0 ? 1 : 0) +
    (claimableTasksCount > 0 ? 1 : 0);

  const spawnFloatingParticle = (clientX: number, clientY: number, text: string, isCrit: boolean) => {
    const container = stageContainerRef.current;
    const rect = container?.getBoundingClientRect();
    const x =
      rect && clientX > 0 ? Math.max(36, Math.min(rect.width - 36, clientX - rect.left)) : (rect?.width ?? 240) / 2;
    const y =
      rect && clientY > 0 ? Math.max(32, Math.min(rect.height - 40, clientY - rect.top)) : (rect?.height ?? 200) / 2;
    const id = ++particleIdRef.current;
    const newParticle: FloatingParticle = { id, x, y, text, isCrit };
    setParticles((prev) => [...prev.slice(-12), newParticle]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, 800);
  };

  const triggerFeedAction = (clientX = 0, clientY = 0) => {
    if (!activeDuck) return;
    if (activeDuck.breedingEndsAt && activeDuck.breedingEndsAt > Date.now()) {
      const sz = resolveDragonSize(activeDuck);
      const eggCost = getXlEggUpgradeCost(activeDuck.level, sz);
      if (sz !== 'NORMAL' && activeDuck.level < 5 && (state.breedingEggs ?? 0) >= eggCost) {
        onUpgradeXlWithEggs(activeDuck.id);
      } else {
        soundFX.playTapFeed();
      }
      return;
    }

    if (activeDuck.feedsProgress >= activeDuck.feedsRequired) {
      if (activeDuck.level < 5) {
        onStartBreeding(activeDuck.id);
      } else {
        const starStepCost = getCustomUpgradeCost(activeDuck.customLevel);
        if (
          clampCustomLevel(activeDuck.customLevel) < ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL &&
          state.stars >= starStepCost
        ) {
          onUpgradeStarCustomization(activeDuck.id, 1);
        } else {
          soundFX.playTapFeed();
        }
      }
      return;
    }

    const critRate =
      activeDuck.skin === 'gamer' || activeDuck.skin === 'ninja'
        ? 0.28
        : activeDuck.skin === 'aqua'
          ? 0.22
          : activeDuck.skin === 'lilac'
            ? 0.21
            : 0.14;
    const isCrit = Math.random() < critRate;

    const res = onFeedDuck(activeDuck.id, comboMultiplier, isCrit);
    if (!res) {
      soundFX.playError();
      return;
    }

    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => {
      setComboCount(0);
    }, 1850);
    const nextCombo = comboCount + 1;
    setComboCount(nextCombo);

    const feverThreshold = activeDuck.skin === 'classic' ? 12 : 14;
    if (nextCombo === feverThreshold && feverSecLeft <= 0) {
      const feverDuration = activeDuck.skin === 'dj' ? 7.5 : 6.5;
      setFeverSecLeft(feverDuration);
      soundFX.playFeverStart();
    }

    if (res.leveledUp) {
      soundFX.playLevelUp();
      setEvolvedBurst(true);
      setTimeout(() => setEvolvedBurst(false), 1200);
    } else if (isCrit) {
      soundFX.playCritHit();
    } else {
      soundFX.playComboTap(nextCombo);
    }

    const bonusText =
      res.tapSteps > 1 ? `-${res.burnedEnergy}⚡ · +${res.tapSteps}` : `-${res.burnedEnergy}⚡`;
    spawnFloatingParticle(
      clientX,
      clientY,
      res.leveledUp ? 'اكتمل الإطعام! 🔥' : bonusText,
      isCrit || isFever
    );
  };

  const vaultDragons = state.customizedVault ?? [];
  const combatPreview = useMemo(
    () =>
      activeDuck
        ? getDuckCombatStats(
            activeDuck,
            state.dmdTotal,
            state.pack.joined,
            state.pack.power,
            state.pack.talents,
            state.activeBuffs
          )
        : { maxHp: 0, attack: 0, critChance: 0, speed: 0, totalPowerScore: 0, dmdSynergyPct: 0, packSynergyPct: 0 },
    [activeDuck, state.dmdTotal, state.pack.joined, state.pack.power, state.pack.talents, state.activeBuffs]
  );

  const totalVaultDmd = useMemo(
    () => vaultDragons.reduce((sum, d) => sum + getDragonVaultDmdPrice(d), 0),
    [vaultDragons]
  );

  if (!activeDuck) return null;

  const skillUpgradeCost = getSkillUpgradeCost(activeDuck.skillLevel, playerTier);
  const currentTrainingRank = activeDuck.trainingLevel ?? 0;
  const trainingCost = getDragonTrainingCost(currentTrainingRank, playerTier);
  const clicksSinceReset = activeDuck.feedClicksSinceReset ?? 0;
  const currentFeedCost = getFeedCost(
    activeDuck.level,
    activeDuck.rarity,
    playerTier,
    clicksSinceReset,
    activeDuck
  );
  const effectiveFeedCost = state.godCards.some((g) => g.godKey === 'harvest' && g.owned)
    ? Math.max(1, Math.ceil(currentFeedCost * 0.8))
    : currentFeedCost;
  const nextCustomCost = getCustomUpgradeCost(activeDuck.customLevel);

  const renderNow = Date.now();
  const hasCostResetTimer = Boolean(activeDuck.costResetEndsAt && activeDuck.costResetEndsAt > renderNow);
  const isBreedingActive = Boolean(activeDuck.breedingEndsAt && activeDuck.breedingEndsAt > renderNow);
  const levelFeedsDone = activeDuck.feedsProgress >= activeDuck.feedsRequired;
  const readyForBreedingGate = !isMaxLevel && levelFeedsDone && !isBreedingActive;
  const xlEggUpgradeCost = getXlEggUpgradeCost(activeDuck.level, activeSize);
  const canUpgradeXlWithEggs =
    activeSize !== 'NORMAL' &&
    activeDuck.level < 5 &&
    !isBreedingActive &&
    (state.breedingEggs ?? 0) >= xlEggUpgradeCost;

  const dragonMaxDmdPrice = getDragonVaultDmdPrice(activeDuck);
  const dragonUnlockedDmd = getCumulativeDmdAtCustomLevel(activeDuck.rarity, activeSize, activeDuck.customLevel);

  const clampedMainStar = clampCustomLevel(activeDuck.customLevel);
  const mainStarMeta = getStarTierMeta(clampedMainStar);
  const dragonElement = getDragonElement(activeDuck.skin);
  const canCustomAtLv5 =
    isMaxLevel &&
    clampedMainStar < ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL &&
    state.stars >= nextCustomCost;

  const unlockedDucksCount = orderedSlots.filter((s) => s.slotIndex < state.unlockedSlots).length;
  const canListInAuction =
    !isDragonSlotLocked(activeDuck, state.unlockedSlots) &&
    !isBreedingActive &&
    unlockedDucksCount > 1;
  const levelProgressPct = Math.min(
    100,
    Math.round((activeDuck.feedsProgress / Math.max(1, activeDuck.feedsRequired)) * 100)
  );

  const showTopShowcase = subView === 'MAIN' || subView === 'CUSTOM';

  return (
    <div className="relative w-full h-full overflow-y-auto">
      <SanctuaryBackdrop
        variant="stage"
        evolutionLevel={activeDuck.level}
        customLevel={clampedMainStar}
        element={dragonElement}
        isFever={isFever}
        className="opacity-70"
      />

      <div className="relative z-10 min-h-full flex flex-col max-w-5xl mx-auto px-3 sm:px-6 pt-1.5 pb-4 gap-2">
        {/* ZONE 1: Compact Wallet + Active Dragon Summary + Clean 4-Tab Nav */}
        <div className="relative z-20 flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-full max-w-lg flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5">
              <DmdIcon className="w-5 h-5" />
              <span className="font-mono-num text-lg sm:text-2xl font-black tracking-tight text-white">
                {state.dmdTotal.toFixed(2)}
              </span>
              <span className="text-[10px] font-black text-amber-300">AMF</span>
            </div>

            <div className="flex items-center gap-1.5 text-[10.5px] font-mono-num font-bold">
              <span className={rarityStyle.color}>{rarityStyle.labelAr}</span>
              {activeSize !== 'NORMAL' && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black">
                  {activeSize}
                </span>
              )}
              <span className="text-slate-600">·</span>
              <span className="text-slate-200">LVL {activeDuck.level}/5</span>
              <span className="text-slate-600">·</span>
              <span className={`px-1.5 py-0.5 rounded border text-[10px] ${mainStarMeta.badgeClass}`}>
                ★{clampedMainStar}/10
              </span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-rose-400 hidden sm:inline">قوة {combatPreview.totalPowerScore} ⚡</span>
            </div>
          </div>

          {/* 4-Tab Mobile Sub-Navigation */}
          <div className="w-full max-w-lg grid grid-cols-4 gap-1 p-1 rounded-2xl bg-[#131722]/95 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                soundFX.playTabSwitch();
                setSubView('MAIN');
              }}
              className={`min-h-[38px] rounded-xl text-[11px] font-black transition-colors cursor-pointer ${
                subView === 'MAIN'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              التطوير
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playTabSwitch();
                setSubView('CUSTOM');
              }}
              className={`relative min-h-[38px] rounded-xl text-[11px] font-black transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                subView === 'CUSTOM'
                  ? 'bg-sky-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5 shrink-0" />
              <span>النجوم ★</span>
              {drawerBadgeCount > 0 && (
                <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-emerald-500 text-slate-950 font-mono-num text-[9px] font-black flex items-center justify-center">
                  {drawerBadgeCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playTabSwitch();
                setSubView('MERGE');
              }}
              className={`min-h-[38px] rounded-xl text-[11px] font-black transition-colors cursor-pointer ${
                subView === 'MERGE'
                  ? 'bg-purple-500 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              دمج XL
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playTabSwitch();
                setSubView('VAULT');
              }}
              className={`min-h-[38px] rounded-xl text-[11px] font-black transition-colors cursor-pointer font-mono-num ${
                subView === 'VAULT'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              الخزانة ({vaultDragons.length})
            </button>
          </div>
        </div>

        {/* ZONE 2: FRAMELESS TOP 2D DRAGON STAGE */}
        {showTopShowcase && (
          <div className="relative z-10 flex flex-col items-center shrink-0">
            <div
              ref={stageContainerRef}
              className={`relative w-full max-w-[380px] ${
                subView === 'CUSTOM' ? 'h-[215px] sm:h-[250px]' : 'h-[245px] sm:h-[295px]'
              } flex flex-col items-center justify-between pt-6 pb-1`}
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-4 rounded-full bg-gradient-to-b ${
                  isFever ? 'from-rose-500/20 via-amber-500/10 to-transparent' : rarityStyle.glow
                } blur-xl`}
              />

              {/* Top Overlay Bar: Dragon Name & Level */}
              <div className="pointer-events-none absolute top-1 inset-x-2 z-20 flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-1.5">
                  <span className="text-[11px] font-black text-white truncate max-w-[160px] sm:max-w-[200px] drop-shadow">
                    {activeDuck.name}
                  </span>
                  {isBreedingActive && activeDuck.breedingEndsAt && (
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-500/25 text-[10px] font-mono-num font-black text-rose-200 shrink-0">
                      <LiveRemainingHms targetMs={activeDuck.breedingEndsAt} prefix="تزاوج " />
                    </span>
                  )}
                </div>

                <span className="px-2 py-0.5 rounded-lg bg-slate-900/70 text-[10px] font-mono-num font-black text-amber-300 shrink-0">
                  LVL {activeDuck.level}
                </span>
              </div>

              {/* Frameless Static 2D Stage (Tap Dragon to Feed / Breed / Upgrade) */}
              <button
                type="button"
                onClick={(e) => triggerFeedAction(e.clientX, e.clientY)}
                aria-label="النقر على التنين للإطعام أو الترقية"
                className="relative z-10 w-full flex-1 min-h-0 flex items-center justify-center cursor-pointer select-none focus:outline-none touch-manipulation active:scale-[0.98] transition-transform"
              >
                <DragonIllustration
                  skin={activeDuck.skin}
                  rarity={activeDuck.rarity}
                  level={activeDuck.level}
                  customLevel={activeDuck.customLevel}
                  showEvolutionEffects={true}
                  mood={isFever ? 'fever' : 'idle'}
                  className={
                    activeSize === 'XXL'
                      ? 'w-44 h-44 sm:w-56 sm:h-56'
                      : activeSize === 'XL'
                        ? 'w-40 h-40 sm:w-52 sm:h-52'
                        : 'w-40 h-40 sm:w-48 sm:h-48'
                  }
                />
              </button>

              {/* Progress Bar Inside Big Dragon Screen */}
              <div className="pointer-events-none relative z-20 w-full px-2 space-y-1">
                {isBreedingActive && activeDuck.breedingEndsAt ? (
                  <>
                    <div className="flex items-center justify-between text-[10px] font-mono-num font-bold drop-shadow">
                      <span className="text-rose-300 font-black flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                        <span>تزاوج LVL {activeDuck.level} ← {activeDuck.level + 1}</span>
                      </span>
                      <span className="text-amber-300">
                        <LiveRemainingHms targetMs={activeDuck.breedingEndsAt} /> · 🥚 {state.breedingEggs ?? 0}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-900/90 overflow-hidden border border-slate-700/80">
                      <LiveBreedingProgressBar breedingEndsAt={activeDuck.breedingEndsAt} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[10px] font-mono-num font-bold drop-shadow">
                      <span className={readyForBreedingGate ? 'text-amber-300 font-black' : 'text-slate-200'}>
                        {readyForBreedingGate
                          ? `جاهز للتزاوج ← LVL ${activeDuck.level + 1}`
                          : isMaxLevel
                            ? `LVL ${activeDuck.level}/5 · مكتمل`
                            : `LVL ${activeDuck.level}/5 · ${levelProgressPct}%`}
                      </span>
                      <span className="text-emerald-300">
                        {dragonUnlockedDmd}/{dragonMaxDmdPrice} AMF · 🥚 {state.breedingEggs ?? 0}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-900/90 overflow-hidden border border-slate-700/80">
                      <div
                        className={`h-full transition-all duration-150 ${
                          readyForBreedingGate
                            ? 'bg-gradient-to-r from-rose-500 to-amber-400'
                            : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-300'
                        }`}
                        style={{ width: `${levelProgressPct}%` }}
                      />
                    </div>
                  </>
                )}
              </div>

              {evolvedBurst && (
                <div className="pointer-events-none absolute top-10 z-30 px-3 py-1 rounded-xl bg-amber-400 text-slate-950 text-xs font-black shadow-xl animate-merge-pop">
                  ✨ {activeDuck.level < 5 ? 'اكتمل الإطعام! بوابة التزاوج جاهزة' : 'اكتمل المستوى الخامس!'}
                </div>
              )}

              {particles.map((p) => (
                <div
                  key={p.id}
                  style={{ left: p.x, top: p.y }}
                  className={`pointer-events-none absolute z-30 flex items-center gap-1 font-mono-num font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] ${
                    p.isCrit ? 'animate-crit-pop text-base text-rose-400' : 'animate-float-up text-sm text-amber-300'
                  }`}
                >
                  <CornIcon className="w-4 h-4" />
                  <span>{p.text}</span>
                </div>
              ))}
            </div>

            {/* Cost-Reset Countdown & Tap Prompt Directly Under Big Dragon */}
            <div className="mt-1 w-full max-w-[380px] px-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10.5px] font-mono-num font-bold text-slate-300">
              <span className="flex items-center gap-1 text-sky-300">
                <TimerReset className="w-3.5 h-3.5 shrink-0" />
                {hasCostResetTimer && activeDuck.costResetEndsAt ? (
                  <LiveRemainingHms
                    targetMs={activeDuck.costResetEndsAt}
                    prefix={`إعادة تعيين التكلفة: `}
                  />
                ) : (
                  <span>إعادة التكلفة: جاهز</span>
                )}
              </span>
              <span className="text-slate-600">·</span>
              {isBreedingActive && activeDuck.lastBreedingEggAt ? (
                <span className="text-emerald-300">
                  🥚 بيضة قادمة: <LiveEggCycleCountdown lastBreedingEggAt={activeDuck.lastBreedingEggAt} />
                </span>
              ) : (
                <span className="text-emerald-300">
                  {readyForBreedingGate
                    ? 'انقر على التنين لبدء التزاوج'
                    : isMaxLevel && canCustomAtLv5
                      ? `انقر للترقية ★ (${nextCustomCost}★)`
                      : isMaxLevel
                        ? 'مكتمل LVL 5 · طوّر النجوم ★'
                        : `انقر على التنين للإطعام (${effectiveFeedCost}⚡)`}
                </span>
              )}
            </div>

            {(comboCount > 1 || isFever) && (
              <div className="mt-0.5 flex items-center gap-2 text-xs font-black">
                {isFever ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
                    وضع الحماس ×5! ({feverSecLeft.toFixed(1)}ث)
                  </span>
                ) : (
                  <span className="text-amber-400 font-mono-num">
                    كومبو ×{comboMultiplier} ({comboCount} نقرة)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== SUB-VIEW: MAIN (العمليات الأساسية) ==================== */}
        {subView === 'MAIN' && (
          <div className="relative z-10 w-full max-w-lg mx-auto space-y-2.5 pb-2">

            {/* Infinite Horizontal-Scrollable Acquisition Dragon Slots (Frameless) */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1.5 px-1 snap-x">
              {orderedSlots.map(({ dragon, arrayIdx, slotIndex }) => {
                const locked = slotIndex >= state.unlockedSlots;
                const isSelected = !locked && arrayIdx === state.activeDuckIndex;
                const isLockedPanelOpen = locked && selectedLockedSlot === slotIndex;
                const slotMeta = locked ? getDragonSlotMeta(slotIndex) : null;
                const eligibility = locked ? checkSlotUnlockEligibility(slotIndex, state) : null;

                return (
                  <button
                    type="button"
                    key={dragon.id}
                    onClick={() => {
                      soundFX.playTabSwitch();
                      if (locked) {
                        setSelectedLockedSlot(isLockedPanelOpen ? null : slotIndex);
                      } else {
                        setSelectedLockedSlot(null);
                        onSelectDuck(arrayIdx);
                      }
                    }}
                    title={
                      locked && slotMeta
                        ? `${dragon.name} (خانة ${slotIndex + 1} مقفلة · ${slotMeta.starCost}★)`
                        : `${dragon.name} (LVL ${dragon.level})`
                    }
                    className={`relative snap-start shrink-0 min-w-[54px] pt-1 pb-1.5 px-1 flex flex-col items-center justify-center transition-transform cursor-pointer focus:outline-none ${
                      isSelected ? 'scale-105' : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className={`relative ${locked ? 'opacity-50 grayscale-[35%]' : ''}`}>
                      <DragonIllustration
                        skin={dragon.skin}
                        rarity={dragon.rarity}
                        level={dragon.level}
                        customLevel={dragon.customLevel}
                        className="w-11 h-11"
                      />
                    </div>

                    {locked && slotMeta ? (
                      <span
                        className={`mt-0.5 flex items-center gap-0.5 font-mono-num text-[9px] font-black ${
                          eligibility?.canUnlock ? 'text-amber-300' : 'text-slate-400'
                        }`}
                      >
                        <Lock className="w-2.5 h-2.5 shrink-0" />
                        <span>{slotMeta.starCost}★</span>
                      </span>
                    ) : (
                      <span
                        className={`mt-0.5 font-mono-num text-[9.5px] font-black ${
                          isSelected ? 'text-amber-300' : 'text-slate-400'
                        }`}
                      >
                        L{dragon.level}
                      </span>
                    )}

                    {dragon.breedingEndsAt && dragon.breedingEndsAt > renderNow && (
                      <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 flex items-center justify-center">
                        <Heart className="w-2.5 h-2.5 text-white fill-white" />
                      </span>
                    )}

                    {(isSelected || isLockedPanelOpen) && (
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 w-6 h-0.5 rounded-full ${
                          isLockedPanelOpen ? 'bg-sky-400' : 'bg-amber-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Locked Dragon Slot Unlock Details */}
            {selectedLockedSlot !== null &&
              selectedLockedSlot >= state.unlockedSlots &&
              selectedLockedSlot < state.ducks.length && (
                <div className="bg-[#161b28] border border-amber-400/50 rounded-2xl p-3 flex items-center justify-between gap-3">
                  {(() => {
                    const meta = getDragonSlotMeta(selectedLockedSlot);
                    const check = checkSlotUnlockEligibility(selectedLockedSlot, state);
                    const lockedOccupant = orderedSlots.find((s) => s.slotIndex === selectedLockedSlot)?.dragon;
                    return (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-white truncate">
                            {meta.label} · {lockedOccupant ? `${lockedOccupant.name} (مقفل)` : 'خانة مقفلة'}
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5">
                            الشرط:{' '}
                            <span className={check.metCondition ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                              {meta.requirementText}
                            </span>
                          </div>
                          {!check.canUnlock && check.reason && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{check.reason}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={!check.canUnlock}
                          onClick={() => {
                            onUnlockSlot(selectedLockedSlot);
                            setSelectedLockedSlot(null);
                          }}
                          className={`min-h-[42px] px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1 shrink-0 ${
                            check.canUnlock
                              ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                              : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <StarIcon className="w-3.5 h-3.5" />
                          <span className="font-mono-num">فتح {meta.starCost}</span>
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

            {/* Optional Instant XL/XXL Egg Upgrade + Auction Sell Option */}
            <div className="flex flex-wrap items-center gap-2">
              {canUpgradeXlWithEggs && (
                <button
                  type="button"
                  onClick={() => onUpgradeXlWithEggs(activeDuck.id)}
                  className="flex-1 min-h-[46px] px-3 py-2.5 rounded-2xl bg-gradient-to-b from-purple-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg hover:brightness-105"
                >
                  <EggIcon className="w-4 h-4 shrink-0" />
                  <span className="font-mono-num whitespace-nowrap">
                    ترقية {activeSize} بالبيض ({xlEggUpgradeCost}🥚)
                  </span>
                </button>
              )}

              <button
                type="button"
                disabled={!canListInAuction}
                onClick={() => onOpenDragonAuction(activeDuck.id)}
                className={`flex-1 min-h-[46px] px-4 py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                  canListInAuction
                    ? 'bg-[#1a1f2e] border border-amber-400/50 text-amber-300 hover:bg-amber-400 hover:text-slate-950 cursor-pointer shadow'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Gavel className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">
                  {canListInAuction
                    ? 'بيع التنين في مزاد التنانين'
                    : isBreedingActive
                      ? 'بيع بالمزاد (التنين يتزاوج)'
                      : 'بيع بالمزاد (يتطلب تنينين مفتوحين)'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== SUB-VIEW: CUSTOM (النجوم ★ والتخصيص) ==================== */}
        {subView === 'CUSTOM' && (() => {
          const clampedStar = clampCustomLevel(activeDuck.customLevel);
          const maxStars = ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL;
          const customCost = getCustomUpgradeCost(clampedStar);
          const dragonEarnedDmd = getCumulativeDmdAtCustomLevel(activeDuck.rarity, activeSize, clampedStar);
          const nextDmdGain = getNextCustomDmdGain(activeDuck);
          const canUpgradeCustom =
            activeDuck.level >= 5 && clampedStar < maxStars && state.stars >= customCost;
          const isFinalVaultStep = clampedStar === maxStars - 1;
          const effPct =
            activeDuck.slotIndex !== null ? Math.round(getSlotEfficiency(activeDuck.slotIndex) * 100) : 0;

          return (
            <div className="relative z-10 w-full max-w-lg mx-auto space-y-2.5 pb-4">
              {/* Star Customization ★1..10 */}
              <div className="rounded-2xl bg-[#161923]/95 border border-amber-400/30 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>تخصيص النجوم ★1–★10 ({dragonEarnedDmd.toFixed(1)}/{dragonMaxDmdPrice} AMF)</span>
                  </div>
                  <span className="font-mono-num text-[11px] font-black text-emerald-400 shrink-0">
                    ★{clampedStar}/{maxStars} · {activeDuck.slotIndex !== null ? `#${activeDuck.slotIndex + 1} (${effPct}%)` : '#1'}
                  </span>
                </div>

                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }, (_, idx) => (
                    <div
                      key={idx + 1}
                      className={`h-2 rounded-full ${
                        clampedStar >= idx + 1
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                          : 'bg-slate-900 border border-slate-800'
                      }`}
                    />
                  ))}
                </div>

                {activeDuck.level < 5 ? (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-center text-[11px] font-bold text-rose-300">
                    يجب وصول التنين إلى LVL 5 أولاً ({activeDuck.level}/5) قبل فتح تخصيص النجوم.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {isFinalVaultStep && (
                      <div className="rounded-xl bg-amber-500/15 border border-amber-400/50 px-2.5 py-1.5 text-[10.5px] font-bold text-amber-200">
                        ⚠️ الترقية العاشرة (★10) تنقل التنين نهائياً إلى الخزانة وتثبت قيمته بعملة AMF.
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={!canUpgradeCustom}
                      onClick={() => onUpgradeStarCustomization(activeDuck.id, 1)}
                      className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                        canUpgradeCustom
                          ? 'bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 hover:brightness-105 cursor-pointer'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <StarIcon className="w-4 h-4 shrink-0" />
                      <span className="font-mono-num">
                        {isFinalVaultStep
                          ? `ختم ★10 ونقل للخزانة (+${nextDmdGain} AMF) · ${customCost}★`
                          : `ترقية إلى ★${clampedStar + 1} (+${nextDmdGain} AMF) · ${customCost}★`}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Skill & Combat Training Quick Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-2xl bg-[#161923]/95 border border-slate-800 p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-indigo-300 truncate">
                      ⚡ {duckSkill.name} (م{activeDuck.skillLevel}/5)
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{duckSkill.passiveBonus}</div>
                  </div>
                  <button
                    type="button"
                    disabled={state.corn < skillUpgradeCost || activeDuck.skillLevel >= 5}
                    onClick={() => {
                      soundFX.playLevelUp();
                      onUpgradeDuckSkill(activeDuck.id);
                    }}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-[11px] font-black shrink-0 font-mono-num ${
                      activeDuck.skillLevel >= 5
                        ? 'bg-slate-800 text-emerald-400'
                        : state.corn >= skillUpgradeCost
                          ? 'bg-indigo-500 text-white hover:bg-indigo-400 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {activeDuck.skillLevel >= 5 ? 'مكتمل' : `${skillUpgradeCost.toLocaleString()}🍖`}
                  </button>
                </div>

                <div className="rounded-2xl bg-[#161923]/95 border border-rose-500/30 p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-rose-300 truncate">
                      ⚔️ تدريب القوة (رتبة {currentTrainingRank})
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono-num truncate">
                      +{currentTrainingRank * 14} HP · +{currentTrainingRank * 2} ATK
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={state.corn < trainingCost}
                    onClick={() => onTrainDragon(activeDuck.id)}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-[11px] font-black shrink-0 font-mono-num ${
                      state.corn >= trainingCost
                        ? 'bg-rose-500 text-white hover:bg-rose-400 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {trainingCost.toLocaleString()}🍖
                  </button>
                </div>
              </div>

              {/* Services & Rewards (Moved into Stars ★ Tab) */}
              <div className="rounded-2xl bg-[#161923]/95 border border-slate-800 p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>الخدمات والمكافآت</span>
                  </span>
                  <button
                    type="button"
                    disabled={!canListInAuction}
                    onClick={() => onOpenDragonAuction(activeDuck.id)}
                    className={`min-h-[34px] px-2.5 py-1 rounded-xl text-[10.5px] font-black flex items-center gap-1 cursor-pointer ${
                      canListInAuction
                        ? 'bg-amber-400/15 border border-amber-400/50 text-amber-300 hover:bg-amber-400 hover:text-slate-950'
                        : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Gavel className="w-3.5 h-3.5" />
                    <span>بيع بالمزاد</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onWatchRewardedAd('energy')}
                  disabled={state.treasury.adsWatchedToday >= state.treasury.maxAdsPerDay}
                  className={`w-full min-h-[44px] p-2.5 rounded-2xl border font-black text-xs flex items-center justify-center gap-1.5 ${
                    state.treasury.adsWatchedToday >= state.treasury.maxAdsPerDay
                      ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25 cursor-pointer'
                  }`}
                >
                  <PlayCircle className="w-4 h-4 shrink-0" />
                  <span className="font-mono-num">
                    إمداد طاقة +{ECONOMY_LIMITS.AD_ENERGY_REWARD}⚡ ({state.treasury.adsWatchedToday}/
                    {state.treasury.maxAdsPerDay})
                  </span>
                </button>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playTabSwitch();
                      onOpenPass('SEASON');
                    }}
                    className="relative min-h-[48px] flex flex-col items-center justify-center py-2 px-2 rounded-2xl bg-slate-900 border border-amber-400/30 hover:border-amber-400 cursor-pointer"
                  >
                    {hasClaimablePass && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                    <Crown className="w-4 h-4 text-amber-400 mb-1" />
                    <span className="text-[10.5px] font-extrabold text-amber-200 font-mono-num">
                      موسم {ACTIVE_SEASON.seasonNumber} · م{passLevel}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playTabSwitch();
                      onOpenPass('DAILY');
                    }}
                    className="relative min-h-[48px] flex flex-col items-center justify-center py-2 px-2 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-400/60 cursor-pointer"
                  >
                    {hasClaimableDailyPass && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                    <Gift className="w-4 h-4 text-emerald-400 mb-1" />
                    <span className="text-[10.5px] font-extrabold text-emerald-300">هدية اليوم</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (timedBonusReadyIn === 0) {
                        soundFX.playChestOpen();
                        onClaimTimedBonus();
                      } else {
                        soundFX.playTabSwitch();
                        onOpenTasksTab();
                      }
                    }}
                    className={`min-h-[48px] flex flex-col items-center justify-center py-2 px-2 rounded-2xl border cursor-pointer ${
                      timedBonusReadyIn === 0
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-sky-400/60'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-sky-400 mb-1" />
                    <span className="font-mono-num text-[10.5px] font-bold">
                      {timedBonusReadyIn === 0
                        ? `جاهز +${ECONOMY_LIMITS.TIMED_BONUS_ENERGY}`
                        : `مهام · ${formatTimer(timedBonusReadyIn)}`}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={extraChestReadyIn > 0}
                    onClick={() => {
                      soundFX.playChestOpen();
                      onClaimExtraChest();
                    }}
                    className={`min-h-[48px] flex flex-col items-center justify-center py-2 px-2 rounded-2xl border transition-colors ${
                      extraChestReadyIn === 0
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 cursor-pointer'
                        : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 mb-1" />
                    <span className="font-mono-num text-[10px] font-bold">
                      {extraChestReadyIn === 0 ? 'صندوق إضافي (جاهز)' : formatTimer(extraChestReadyIn)}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ==================== SUB-VIEW: MERGE (دمج XL و XXL) ==================== */}
        {subView === 'MERGE' && (() => {
          const mergeEligibleRarities: Rarity[] = ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
          const requiredSourceSize = mergeMode === 'TO_XL' ? 'NORMAL' : 'XL';
          const resultSizeLabel = mergeMode === 'TO_XL' ? 'XL' : 'XXL';

          const selectedRarity: Rarity | null =
            mergeSelectedIds.length > 0
              ? state.ducks.find((d) => d.id === mergeSelectedIds[0])?.rarity ?? null
              : null;

          const eligibleDragons = state.ducks.filter((d) => {
            if (isDragonSlotLocked(d, state.unlockedSlots)) return false;
            if (!mergeEligibleRarities.includes(d.rarity)) return false;
            if (d.level < 5 || d.feedsProgress < 500) return false;
            if (resolveDragonSize(d) !== requiredSourceSize) return false;
            if (selectedRarity && d.rarity !== selectedRarity) return false;
            return true;
          });

          const targetRarityForPreview =
            selectedRarity ?? (mergeEligibleRarities.includes(activeDuck.rarity) ? activeDuck.rarity : 'UNCOMMON');
          const previewDmdPrice = getDragonVaultDmdPrice({
            rarity: targetRarityForPreview,
            sizeTier: resultSizeLabel,
            xl: true,
          });

          const toggleMergePick = (id: string) => {
            soundFX.playTabSwitch();
            setMergeSelectedIds((prev) => {
              if (prev.includes(id)) return prev.filter((x) => x !== id);
              if (prev.length >= 4) return prev;
              return [...prev, id];
            });
          };

          return (
            <div className="relative z-10 w-full max-w-lg mx-auto space-y-3 pb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-white">دمج 4 تنانين مكتملة (LVL 5)</span>
                <span className="font-mono-num font-black text-amber-300">
                  قيمة ★10: {previewDmdPrice.toLocaleString()} AMF
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#181b24] border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playTabSwitch();
                    setMergeMode('TO_XL');
                    setMergeSelectedIds([]);
                  }}
                  className={`min-h-[40px] rounded-xl text-xs font-black transition-all cursor-pointer ${
                    mergeMode === 'TO_XL' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  4× عادي ← XL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playTabSwitch();
                    setMergeMode('TO_XXL');
                    setMergeSelectedIds([]);
                  }}
                  className={`min-h-[40px] rounded-xl text-xs font-black transition-all cursor-pointer ${
                    mergeMode === 'TO_XXL' ? 'bg-purple-500 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  4× XL ← XXL
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((slotIdx) => {
                  const dragonId = mergeSelectedIds[slotIdx];
                  const dragon = state.ducks.find((d) => d.id === dragonId);
                  return (
                    <button
                      type="button"
                      key={slotIdx}
                      onClick={() => dragon && toggleMergePick(dragon.id)}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-1.5 transition-all cursor-pointer ${
                        dragon
                          ? 'bg-amber-400/10'
                          : 'bg-slate-900/40 border border-dashed border-slate-700/70 hover:border-slate-500'
                      }`}
                    >
                      {dragon ? (
                        <>
                          <DragonIllustration
                            skin={dragon.skin}
                            rarity={dragon.rarity}
                            level={dragon.level}
                            customLevel={dragon.customLevel}
                            className="w-12 h-12"
                          />
                          <span className="font-mono-num text-[9.5px] font-bold text-amber-300 truncate max-w-full">
                            {RARITY_STYLE[dragon.rarity].labelAr}
                          </span>
                        </>
                      ) : (
                        <Plus className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {eligibleDragons.length === 0 ? (
                <div className="rounded-2xl bg-[#181b24] border border-slate-800 p-5 text-center text-xs text-slate-400">
                  لا توجد تنانين مؤهلة حالياً ({mergeMode === 'TO_XL' ? 'عادي الحجم' : 'XL'} من فئة نادر فأعلى ومكتمل LVL 5 — 500/500).
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {eligibleDragons.map((d) => {
                    const selected = mergeSelectedIds.includes(d.id);
                    const st = RARITY_STYLE[d.rarity];
                    const sz = resolveDragonSize(d);
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => toggleMergePick(d.id)}
                        className={`rounded-2xl p-2 text-center transition-all cursor-pointer flex flex-col items-center ${
                          selected ? 'bg-amber-500/15 scale-[0.97]' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <DragonIllustration
                          skin={d.skin}
                          rarity={d.rarity}
                          level={d.level}
                          customLevel={d.customLevel}
                          className="w-14 h-14 mb-1"
                        />
                        <span className={`text-[10px] font-bold ${st.color}`}>
                          {st.labelAr} {sz !== 'NORMAL' ? `· ${sz}` : ''}
                        </span>
                        <span className="text-[9.5px] text-emerald-400 font-mono-num">
                          LVL 5 ✓ · ★{d.customLevel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                disabled={mergeSelectedIds.length !== 4}
                onClick={() => {
                  soundFX.playGodConfirm();
                  onMergeDucks(mergeSelectedIds);
                  setMergeSelectedIds([]);
                  setSubView('MAIN');
                }}
                className={`w-full min-h-[48px] py-3 rounded-2xl font-extrabold text-sm transition-all ${
                  mergeSelectedIds.length === 4
                    ? 'bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 shadow-lg hover:brightness-105 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {mergeSelectedIds.length === 4
                  ? `دمج 4 تنانين ← ${RARITY_STYLE[targetRarityForPreview].labelAr} ${resultSizeLabel}`
                  : `اختر ${4 - mergeSelectedIds.length} تنانين مكتملة إضافية`}
              </button>
            </div>
          );
        })()}

        {/* ==================== SUB-VIEW: VAULT (خزانة التنانين المخصصة ★10) ==================== */}
        {subView === 'VAULT' && (
          <div className="relative z-10 w-full max-w-lg mx-auto space-y-3 pb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-white">خزانة التنانين المختومة (★10)</span>
              <span className="font-mono-num font-black text-amber-300">
                {totalVaultDmd.toLocaleString()} AMF
              </span>
            </div>

            {vaultDragons.length === 0 ? (
              <div className="rounded-3xl bg-[#181b24] border border-slate-800 p-7 text-center space-y-2">
                <Archive className="w-10 h-10 text-slate-500 mx-auto" />
                <div className="text-sm font-black text-slate-300">الخزانة فارغة حالياً</div>
                <p className="text-xs text-slate-400">
                  طوّر أي تنين إلى <strong className="text-white">LVL 5</strong> ثم خصّصه عبر{' '}
                  <strong className="text-amber-300">10 مراحل ★</strong> لنقله إلى الخزانة.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {vaultDragons.map((vd) => {
                  const st = RARITY_STYLE[vd.rarity];
                  const sz = resolveDragonSize(vd);
                  const price = getDragonVaultDmdPrice(vd);
                  return (
                    <div
                      key={vd.id}
                      className="rounded-2xl bg-[#181b24]/90 p-3 flex items-center gap-3"
                    >
                      <DragonIllustration
                        skin={vd.skin}
                        rarity={vd.rarity}
                        level={vd.level}
                        customLevel={10}
                        showEvolutionEffects={true}
                        className="w-16 h-16 shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs font-black text-white truncate">{vd.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono-num">
                          <span className={`font-bold ${st.color}`}>{st.labelAr}</span>
                          {sz !== 'NORMAL' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-black">
                              {sz}
                            </span>
                          )}
                          <span className="text-amber-300 font-black">★10/10</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-mono-num font-black text-emerald-400">
                          <DmdIcon className="w-3.5 h-3.5" />
                          <span>{price.toLocaleString()} AMF</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
