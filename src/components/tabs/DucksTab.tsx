import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Check,
  Clock,
  Crown,
  Egg as EggIcon,
  Flame,
  Gem,
  Gift,
  Heart,
  HelpCircle,
  Layers,
  Lock,
  Palette,
  PlayCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  TimerReset,
  X,
  Zap,
} from 'lucide-react';
import { Duck, DuckAuraId, DuckGearId, DuckSkinId, GameState, Rarity } from '../../types/game';
import {
  ACTIVE_SEASON,
  BATTLE_PASS_LEVELS,
  DRAGON_SLOTS,
  DUCK_AURA_CATALOG,
  DUCK_EVOLUTION_LEVELS,
  DUCK_GEAR_CATALOG,
  DUCK_SKILLS,
  RARITY_STYLE,
  SKIN_CATALOG,
  checkSlotUnlockEligibility,
  formatTimer,
  getCustomUpgradeCost,
  getDragonElement,
  getDragonVaultDmdPrice,
  getDuckCombatStats,
  getFeedCost,
  getSlotEfficiency,
} from '../../data/gameData';
import {
  ECONOMY_LIMITS,
  clampCustomLevel,
  evaluateNextStepAdvice,
  getCumulativeDmdAtCustomLevel,
  getDragonTrainingCost,
  getEnergySoftCap,
  getNextCustomDmdGain,
  getPlayerTier,
  getSkillUpgradeCost,
  getStarTierMeta,
  getXlEggUpgradeCost,
  resolveDragonSize,
} from '../../utils/economyEngine';
import { CornIcon, DmdIcon, DragonIllustration, GearIcon, StarIcon } from '../art/DuckArt';
import { Dragon3DStage } from '../art/Dragon3DStage';
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
  onOpenSquadTalents: () => void;
  onUpgradeStarCustomization: (duckId: string, steps?: number) => void;
  onUpgradeDuckSkill: (duckId: string) => void;
  onCustomizeDuck: (duckId: string, gear: DuckGearId, aura: DuckAuraId) => void;
  onChangeDragonSkin: (duckId: string, skin: DuckSkinId) => void;
  onUnlockSlot: (slotIndex: number) => void;
  onAssignSlot: (duckId: string, slotIndex: number) => void;
  onMergeDucks: (duckIds: string[]) => void;
  onWatchRewardedAd: (kind: 'energy' | 'stars' | 'eggs') => void;
  onOpenDuckerPass: () => void;
  onOpenDailyPass: () => void;
  onOpenDailyTasks: () => void;
  onClaimBestTask: () => void;
  onOpenTreasures: () => void;
  onGoToArena: () => void;
  onGoToEggs: () => void;
  onClaimTimedBonus: () => void;
  timedBonusReadyIn: number;
}

function formatHms(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const DucksTab: React.FC<DucksTabProps> = ({
  state,
  onSelectDuck,
  onFeedDuck,
  onStartBreeding,
  onUpgradeXlWithEggs,
  onTrainDragon,
  onOpenSquadTalents,
  onUpgradeStarCustomization,
  onUpgradeDuckSkill,
  onCustomizeDuck,
  onChangeDragonSkin,
  onUnlockSlot,
  onAssignSlot,
  onMergeDucks,
  onWatchRewardedAd,
  onOpenDuckerPass,
  onOpenDailyPass,
  onOpenDailyTasks,
  onClaimBestTask,
  onOpenTreasures,
  onGoToArena,
  onGoToEggs,
  onClaimTimedBonus,
  timedBonusReadyIn,
}) => {
  const [subView, setSubView] = useState<'MAIN' | 'CUSTOM' | 'MERGE' | 'VAULT'>('MAIN');
  const [servicesDrawerOpen, setServicesDrawerOpen] = useState(false);
  const [showDmdGuide, setShowDmdGuide] = useState(false);
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [cardShake, setCardShake] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [feverSecLeft, setFeverSecLeft] = useState(0);
  const [evolvedBurst, setEvolvedBurst] = useState(false);
  const [feedPulseNonce, setFeedPulseNonce] = useState(0);
  const [levelBurstNonce, setLevelBurstNonce] = useState(0);
  const [mergeMode, setMergeMode] = useState<'TO_XL' | 'TO_XXL'>('TO_XL');
  const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>([]);
  const [selectedLockedSlot, setSelectedLockedSlot] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const particleIdRef = useRef(0);
  const lastTapRef = useRef(0);

  const activeDuck: Duck | undefined = state.ducks[state.activeDuckIndex] ?? state.ducks[0];
  const rarityStyle = activeDuck ? RARITY_STYLE[activeDuck.rarity] : RARITY_STYLE.COMMON;
  const activeSize = resolveDragonSize(activeDuck);
  const isMaxLevel = activeDuck ? activeDuck.level >= activeDuck.maxLevel : false;
  const duckSkill = activeDuck ? DUCK_SKILLS[activeDuck.skin] : DUCK_SKILLS.aqua;
  const currentEvo = activeDuck
    ? DUCK_EVOLUTION_LEVELS[Math.max(0, Math.min(4, activeDuck.level - 1))]
    : DUCK_EVOLUTION_LEVELS[0];
  const playerTier = getPlayerTier(state);

  const [draftGear, setDraftGear] = useState<DuckGearId>(activeDuck?.gear ?? 'none');
  const [draftAura, setDraftAura] = useState<DuckAuraId>(activeDuck?.aura ?? 'auto');

  // IMPORTANT: Sync ONLY on dragon ID or persisted gear/aura changes (never on 1-second state clone!)
  useEffect(() => {
    if (activeDuck) {
      setDraftGear(activeDuck.gear ?? 'none');
      setDraftAura(activeDuck.aura ?? 'auto');
    }
  }, [activeDuck?.id, activeDuck?.gear, activeDuck?.aura]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTs(Date.now());
      if (Date.now() - lastTapRef.current > 1800 && comboCount > 0) {
        setComboCount(0);
      }
      setFeverSecLeft((s) => Math.max(0, s - 0.25));
    }, 250);
    return () => clearInterval(timer);
  }, [comboCount]);

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
    (claimableTasksCount > 0 ? 1 : 0);

  const spawnFloatingParticle = (clientX: number, clientY: number, text: string, isCrit: boolean) => {
    const container = stageContainerRef.current;
    const rect = container?.getBoundingClientRect();
    const x = rect && clientX > 0 ? Math.max(36, Math.min(rect.width - 36, clientX - rect.left)) : (rect?.width ?? 240) / 2;
    const y = rect && clientY > 0 ? Math.max(32, Math.min(rect.height - 40, clientY - rect.top)) : (rect?.height ?? 240) / 2;
    const id = ++particleIdRef.current;
    const newParticle: FloatingParticle = { id, x, y, text, isCrit };
    setParticles((prev) => [...prev.slice(-14), newParticle]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, 850);
  };

  const triggerFeedAction = (clientX = 0, clientY = 0) => {
    if (!activeDuck) return;
    if (activeDuck.breedingEndsAt && activeDuck.breedingEndsAt > Date.now()) {
      soundFX.playTapFeed();
      setFeedPulseNonce((n) => n + 1);
      return;
    }

    if (activeDuck.feedsProgress >= activeDuck.feedsRequired) {
      if (activeDuck.level < 5) {
        onStartBreeding(activeDuck.id);
      } else {
        soundFX.playTapFeed();
      }
      setFeedPulseNonce((n) => n + 1);
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

    lastTapRef.current = Date.now();
    const nextCombo = comboCount + 1;
    setComboCount(nextCombo);

    const feverThreshold = activeDuck.skin === 'classic' ? 12 : 14;
    if (nextCombo === feverThreshold && feverSecLeft <= 0) {
      const feverDuration = activeDuck.skin === 'dj' ? 7.5 : 6.5;
      setFeverSecLeft(feverDuration);
      soundFX.playFeverStart();
    }

    setFeedPulseNonce((n) => n + 1);

    if (res.leveledUp) {
      soundFX.playLevelUp();
      setLevelBurstNonce((n) => n + 1);
      setEvolvedBurst(true);
      setTimeout(() => setEvolvedBurst(false), 1200);
    } else if (isCrit) {
      soundFX.playCritHit();
      setCardShake(true);
      setTimeout(() => setCardShake(false), 180);
    } else {
      soundFX.playComboTap(nextCombo);
    }

    const bonusText =
      res.tapSteps > 1
        ? `-${res.burnedEnergy}⚡ · +${res.tapSteps}`
        : `-${res.burnedEnergy}⚡`;
    spawnFloatingParticle(
      clientX,
      clientY,
      res.leveledUp ? 'اكتمل الإطعام! 🔥' : bonusText,
      isCrit || isFever
    );
  };

  // --- SUB-VIEW: VAULT (خزانة التنانين المخصصة ★10) ---
  if (subView === 'VAULT') {
    const vaultDragons = state.customizedVault ?? [];
    const totalVaultDmd = vaultDragons.reduce((sum, d) => sum + getDragonVaultDmdPrice(d), 0);

    return (
      <div className="h-full flex flex-col max-w-2xl mx-auto px-4 py-3 overflow-y-auto space-y-3 pb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setSubView('MAIN');
            }}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-300 hover:text-white cursor-pointer min-h-[44px]"
          >
            <ArrowRight className="w-5 h-5" />
            <span>خزانة التنانين المخصصة</span>
          </button>
          <span className="font-mono-num text-xs font-black text-amber-300">
            {totalVaultDmd.toLocaleString()} DMD
          </span>
        </div>

        <div className="rounded-2xl bg-[#161b28] border border-amber-400/40 p-3.5 text-xs text-slate-300 leading-relaxed">
          <div className="font-black text-amber-300 mb-1 flex items-center gap-1.5">
            <Archive className="w-4 h-4" />
            <span>محفظة التبديل عند الإطلاق الرسمي لعملة DMD</span>
          </div>
          كل تنين يصل إلى <strong className="text-white">التخصيص ★10</strong> يُنقل تلقائياً إلى هذه الخزانة ولا يُستخدم في اللعب مرة أخرى، ويُحفظ بكامل قيمته لاستبداله بعملة <strong className="text-amber-300">DMD</strong> فور فتح حدث بيع العملة على المنصات.
        </div>

        {vaultDragons.length === 0 ? (
          <div className="rounded-3xl bg-[#181b24] border border-slate-800 p-8 text-center space-y-2">
            <Archive className="w-10 h-10 text-slate-500 mx-auto" />
            <div className="text-sm font-black text-slate-300">الخزانة فارغة حالياً</div>
            <p className="text-xs text-slate-400">
              طوّر أي تنين إلى <strong className="text-white">LVL 5</strong> ثم خصّصه عبر <strong className="text-amber-300">10 مراحل ★</strong> لنقله إلى الخزانة.
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
                  className="rounded-2xl bg-[#181b24] border border-amber-400/30 p-3 flex items-center gap-3"
                >
                  <DragonIllustration
                    skin={vd.skin}
                    level={vd.level}
                    customLevel={10}
                    gear={vd.gear}
                    aura={vd.aura}
                    staked={true}
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
                      <span>{price.toLocaleString()} DMD جاهز للتبديل</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- SUB-VIEW: MERGE (دمج XL و XXL من التصنيفات نادر..خرافي بعد إكمال LVL 5) ---
  if (subView === 'MERGE' && activeDuck) {
    const mergeEligibleRarities: Rarity[] = ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
    const requiredSourceSize = mergeMode === 'TO_XL' ? 'NORMAL' : 'XL';
    const resultSizeLabel = mergeMode === 'TO_XL' ? 'XL' : 'XXL';

    const selectedRarity: Rarity | null =
      mergeSelectedIds.length > 0
        ? state.ducks.find((d) => d.id === mergeSelectedIds[0])?.rarity ?? null
        : null;

    const eligibleDragons = state.ducks.filter((d) => {
      if (!mergeEligibleRarities.includes(d.rarity)) return false;
      if (d.level < 5 || d.feedsProgress < 500) return false;
      if (resolveDragonSize(d) !== requiredSourceSize) return false;
      if (selectedRarity && d.rarity !== selectedRarity) return false;
      return true;
    });

    const targetRarityForPreview = selectedRarity ?? (mergeEligibleRarities.includes(activeDuck.rarity) ? activeDuck.rarity : 'UNCOMMON');
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
      <div className="h-full flex flex-col max-w-2xl mx-auto px-4 py-3 overflow-y-auto pb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setMergeSelectedIds([]);
              setSubView('MAIN');
            }}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-300 hover:text-white cursor-pointer min-h-[44px]"
          >
            <ArrowRight className="w-5 h-5" />
            <span>دمج التنانين (XL / XXL)</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-mono-num">
            <span className="text-slate-400">السعر عند ★10:</span>
            <span className="font-black text-amber-300">{previewDmdPrice.toLocaleString()} DMD</span>
          </div>
        </div>

        {/* Mode Switcher: 4x NORMAL -> XL OR 4x XL -> XXL */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#181b24] border border-slate-800 mb-3">
          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setMergeMode('TO_XL');
              setMergeSelectedIds([]);
            }}
            className={`min-h-[42px] rounded-xl text-xs font-black transition-all cursor-pointer ${
              mergeMode === 'TO_XL'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            4× تنين مكتمل ← تنين XL
          </button>
          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setMergeMode('TO_XXL');
              setMergeSelectedIds([]);
            }}
            className={`min-h-[42px] rounded-xl text-xs font-black transition-all cursor-pointer ${
              mergeMode === 'TO_XXL'
                ? 'bg-purple-500 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            4× تنين XL مكتمل ← تنين XXL
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2.5 mb-3">
          {[0, 1, 2, 3].map((slotIdx) => {
            const dragonId = mergeSelectedIds[slotIdx];
            const dragon = state.ducks.find((d) => d.id === dragonId);
            return (
              <button
                key={slotIdx}
                onClick={() => dragon && toggleMergePick(dragon.id)}
                className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-2 transition-all cursor-pointer ${
                  dragon
                    ? 'bg-slate-800/90 border-amber-400 shadow-[0_0_16px_rgba(250,204,21,0.2)]'
                    : 'bg-slate-900/60 border-dashed border-slate-700 hover:border-slate-500'
                }`}
              >
                {dragon ? (
                  <>
                    <DragonIllustration
                      skin={dragon.skin}
                      level={dragon.level}
                      customLevel={dragon.customLevel}
                      gear={dragon.gear}
                      aura={dragon.aura}
                      showEvolutionEffects={true}
                      className="w-12 h-12"
                    />
                    <span className="font-mono-num text-[10px] font-bold text-amber-300">
                      {RARITY_STYLE[dragon.rarity].labelAr} {resolveDragonSize(dragon) !== 'NORMAL' ? resolveDragonSize(dragon) : ''}
                    </span>
                  </>
                ) : (
                  <Plus className="w-6 h-6 text-slate-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 px-3 py-2.5 text-[11px] text-slate-300 mb-3 text-center leading-relaxed">
          يدمج التصنيفات <strong className="text-emerald-300">نادر، ملحمي، أسطوري، خرافي</strong> فقط بعد إكمال{' '}
          <strong className="text-white">المستوى الخامس (500/500 ضغطة)</strong>. التنين الناتج{' '}
          <strong className="text-amber-300">{resultSizeLabel}</strong> يبدأ من{' '}
          <strong className="text-white">المستوى 1</strong> بنفس التصنيف وبسعر DMD مضاعف!
        </div>

        {eligibleDragons.length === 0 ? (
          <div className="rounded-2xl bg-[#181b24] border border-slate-800 p-6 text-center text-xs text-slate-400 mb-4">
            لا توجد تنانين مؤهلة حالياً ({mergeMode === 'TO_XL' ? 'عادي الحجم' : 'XL'} من فئة نادر فأعلى ومكتمل LVL 5 — 500/500).
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-5">
            {eligibleDragons.map((d) => {
              const selected = mergeSelectedIds.includes(d.id);
              const st = RARITY_STYLE[d.rarity];
              const sz = resolveDragonSize(d);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleMergePick(d.id)}
                  className={`rounded-2xl p-2.5 border text-center transition-all cursor-pointer flex flex-col items-center ${
                    selected
                      ? 'bg-amber-500/15 border-amber-400 scale-[0.98]'
                      : 'bg-[#181b24] border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <DragonIllustration
                    skin={d.skin}
                    level={d.level}
                    customLevel={d.customLevel}
                    gear={d.gear}
                    aura={d.aura}
                    showEvolutionEffects={true}
                    className="w-16 h-16 mb-1"
                  />
                  <span className={`text-[10px] font-bold ${st.color}`}>
                    {st.labelAr} {sz !== 'NORMAL' ? `· ${sz}` : ''}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono-num mt-0.5">
                    LVL 5 ✓ · ★{d.customLevel}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button
          disabled={mergeSelectedIds.length !== 4}
          onClick={() => {
            soundFX.playGodConfirm();
            onMergeDucks(mergeSelectedIds);
            setMergeSelectedIds([]);
            setSubView('MAIN');
          }}
          className={`w-full min-h-[48px] py-3.5 rounded-2xl font-extrabold text-base transition-all mt-auto ${
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
  }

  // --- SUB-VIEW: CUSTOMIZATION & ★1..10 STAR UPGRADE ---
  if (subView === 'CUSTOM' && activeDuck) {
    const clampedStar = clampCustomLevel(activeDuck.customLevel);
    const maxStars = ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL; // 10
    const starMeta = getStarTierMeta(clampedStar);
    const customCost = getCustomUpgradeCost(clampedStar); // 10★..100★
    const dragonMaxPrice = getDragonVaultDmdPrice(activeDuck);
    const dragonEarnedDmd = getCumulativeDmdAtCustomLevel(activeDuck.rarity, activeSize, clampedStar);
    const nextDmdGain = getNextCustomDmdGain(activeDuck);
    const canUpgradeCustom =
      activeDuck.level >= 5 && clampedStar < maxStars && state.stars >= customCost;
    const isFinalVaultStep = clampedStar === maxStars - 1;
    const effPct =
      activeDuck.slotIndex !== null ? Math.round(getSlotEfficiency(activeDuck.slotIndex) * 100) : 0;

    return (
      <div className="h-full flex flex-col max-w-2xl mx-auto px-4 py-3 overflow-y-auto space-y-3 pb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setSubView('MAIN');
            }}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-300 hover:text-white cursor-pointer min-h-[44px]"
          >
            <ArrowRight className="w-5 h-5" />
            <span>العتاد والتخصيص بالنجوم</span>
          </button>
          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setSubView('VAULT');
            }}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 font-black text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>الخزانة ({state.customizedVault?.length ?? 0})</span>
          </button>
        </div>

        {/* Section 1: Gear, Aura & Skins (Applies immediately on tap — zero reset bug) */}
        <div className="realistic-card border border-amber-400/30 rounded-3xl p-4 space-y-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-white">{activeDuck.name}</span>
                {activeSize !== 'NORMAL' && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono-num text-[10px] font-black">
                    {activeSize}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-num">
                <span className={rarityStyle.color}>{rarityStyle.labelAr}</span>
                <span className="text-slate-400">· LVL {activeDuck.level}/5</span>
                <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${starMeta.badgeClass}`}>
                  ★{clampedStar}/{maxStars} · {starMeta.nameAr}
                </span>
              </div>
              <div className="text-[11px] text-emerald-400 font-bold font-mono-num">
                قيمة DMD المحصلة: {dragonEarnedDmd.toFixed(2)} / {dragonMaxPrice.toLocaleString()} DMD
              </div>
            </div>
            <div className="w-28 h-28 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-center shrink-0">
              <DragonIllustration
                skin={activeDuck.skin}
                level={activeDuck.level}
                customLevel={activeDuck.customLevel}
                gear={draftGear}
                aura={draftAura}
                showEvolutionEffects={true}
                className="w-24 h-24"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold text-amber-300">العتاد القتالي (تجهيز فوري):</span>
              <span className="text-[11px] text-emerald-400 font-bold">
                {DUCK_GEAR_CATALOG.find((g) => g.id === draftGear)?.bonusDesc}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {DUCK_GEAR_CATALOG.map((g) => {
                const selected = draftGear === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      soundFX.playGodConfirm();
                      setDraftGear(g.id);
                      onCustomizeDuck(activeDuck.id, g.id, draftAura);
                    }}
                    className={`rounded-xl p-2 border text-center transition-all cursor-pointer min-h-[58px] flex flex-col items-center justify-center gap-1 ${
                      selected
                        ? 'bg-amber-400/20 border-amber-400 text-white shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <GearIcon gear={g.id} className="w-7 h-7" />
                    <div className="text-[10px] font-bold leading-tight">{g.nameAr}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-extrabold text-sky-300 mb-1.5">هالة التنين (تجهيز فوري):</div>
            <div className="grid grid-cols-4 gap-1.5">
              {DUCK_AURA_CATALOG.map((a) => {
                const selected = draftAura === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      soundFX.playGodConfirm();
                      setDraftAura(a.id);
                      onCustomizeDuck(activeDuck.id, draftGear, a.id);
                    }}
                    className={`rounded-xl p-2 border flex flex-col items-center gap-1 transition-all cursor-pointer min-h-[48px] ${
                      selected
                        ? 'bg-sky-500/20 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                        : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${a.swatch}`} />
                    <span className="text-[10px] font-bold truncate">{a.nameAr}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {state.unlockedSkins.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <div className="text-xs font-extrabold text-amber-300 mb-1.5">
                المظاهر المفتوحة ({state.unlockedSkins.length}):
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {state.unlockedSkins.map((skinId) => {
                  const isCurrentSkin = activeDuck.skin === skinId;
                  return (
                    <button
                      key={skinId}
                      onClick={() => {
                        if (isCurrentSkin) return;
                        soundFX.playGodConfirm();
                        onChangeDragonSkin(activeDuck.id, skinId);
                      }}
                      className={`rounded-xl p-2 border flex flex-col items-center gap-1 transition-all cursor-pointer min-h-[60px] ${
                        isCurrentSkin
                          ? 'bg-amber-400/20 border-amber-400 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <DragonIllustration
                        skin={skinId}
                        level={activeDuck.level}
                        customLevel={activeDuck.customLevel}
                        className="w-9 h-9"
                      />
                      <span className="text-[10px] font-bold truncate w-full text-center">
                        {SKIN_CATALOG[skinId]?.name ?? skinId}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: ★1..10 Instant Star Customization & Vault Transfer */}
        <div className="bg-[#181b24] border border-amber-400/30 rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>تخصيص النجوم الفوري (★1 ← ★10)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                10 ترقيات فورية (10★ إلى 100★) تمنحك حصة من سعر التنين (<strong className="text-amber-300">{dragonMaxPrice} DMD</strong>) في محفظتك.
              </p>
            </div>
            <div className="text-left font-mono-num shrink-0">
              <div className="text-xs font-black text-amber-300">★{clampedStar}/{maxStars}</div>
              <div className="text-[10px] text-emerald-400">
                الخانة: {activeDuck.slotIndex !== null ? `#${activeDuck.slotIndex + 1} (${effPct}%)` : 'احتياط'}
              </div>
            </div>
          </div>

          {/* 10-step progress blocks */}
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, idx) => {
              const step = idx + 1;
              const filled = clampedStar >= step;
              return (
                <div
                  key={step}
                  className={`h-2.5 rounded-full transition-all ${
                    filled
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                />
              );
            })}
          </div>

          {activeDuck.level < 5 ? (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3 text-center text-xs font-bold text-rose-300">
              يجب وصول التنين إلى المستوى 5 أولاً ({activeDuck.level}/5) قبل فتح تخصيص النجوم.
            </div>
          ) : (
            <div className="space-y-2">
              {isFinalVaultStep && (
                <div className="rounded-xl bg-amber-500/15 border border-amber-400/50 px-3 py-2 text-[11px] font-bold text-amber-200 leading-relaxed">
                  ⚠️ تنبيه الختم النهائي (★10): عند تنفيذ الترقية العاشرة، يُنقل التنين إلى{' '}
                  <strong className="text-white">خزانة التنانين المخصصة</strong> ولن يُستخدم في اللعب مرة أخرى، وسيُستبدل بعملة DMD عند الإطلاق الرسمي.
                </div>
              )}
              <button
                disabled={!canUpgradeCustom}
                onClick={() => onUpgradeStarCustomization(activeDuck.id, 1)}
                className={`w-full min-h-[48px] py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                  canUpgradeCustom
                    ? isFinalVaultStep
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 text-slate-950 hover:brightness-105 cursor-pointer shadow-lg'
                      : 'bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 hover:brightness-105 cursor-pointer'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <StarIcon className="w-4 h-4 shrink-0" />
                <span className="font-mono-num">
                  {isFinalVaultStep
                    ? `ختم ★10 ونقل للخزانة (+${nextDmdGain} DMD) · ${customCost}★`
                    : `ترقية فورية إلى ★${clampedStar + 1} (+${nextDmdGain} DMD) · ${customCost}★`}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Section 3: Combat Training */}
        {(() => {
          const stakeTrainingRank = activeDuck.trainingLevel ?? 0;
          const stakeTrainingCost = getDragonTrainingCost(stakeTrainingRank, playerTier);
          return (
            <div className="bg-[#181b24] border border-rose-500/30 rounded-3xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                  <Swords className="w-4 h-4 shrink-0" />
                  <span>تدريب القوة المتقدم · رتبة {stakeTrainingRank}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono-num">
                  +14 HP و +2 هجوم دائم في الحلبة لكل رتبة (حالي: +{stakeTrainingRank * 14} HP / +{stakeTrainingRank * 2} ATK)
                </p>
              </div>
              <button
                disabled={state.corn < stakeTrainingCost}
                onClick={() => onTrainDragon(activeDuck.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 shrink-0 font-mono-num ${
                  state.corn >= stakeTrainingCost
                    ? 'bg-rose-500 text-white hover:bg-rose-400 cursor-pointer'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CornIcon className="w-3.5 h-3.5" />
                <span>تدريب {stakeTrainingCost.toLocaleString()}</span>
              </button>
            </div>
          );
        })()}
      </div>
    );
  }

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
  const energySoftCap = getEnergySoftCap(playerTier);
  const isSoftCapped = state.corn >= energySoftCap;
  const nextCustomCost = getCustomUpgradeCost(activeDuck.customLevel);
  const combatPreview = getDuckCombatStats(
    activeDuck,
    state.dmdTotal,
    state.pack.joined,
    state.pack.power,
    state.pack.talents,
    state.activeBuffs
  );
  const reserveDragons = state.ducks.filter(
    (d) => d.slotIndex === null || d.slotIndex >= state.unlockedSlots
  );

  // Timers for 8h Cost Reset & 24h Breeding Gate + 15m Egg
  const costResetRemainingMs =
    activeDuck.costResetEndsAt && activeDuck.costResetEndsAt > nowTs
      ? activeDuck.costResetEndsAt - nowTs
      : 0;
  const isBreedingActive = Boolean(activeDuck.breedingEndsAt && activeDuck.breedingEndsAt > nowTs);
  const breedingRemainingMs = isBreedingActive && activeDuck.breedingEndsAt ? activeDuck.breedingEndsAt - nowTs : 0;
  const nextEggRemainingMs =
    isBreedingActive && activeDuck.lastBreedingEggAt
      ? Math.max(
          0,
          ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS -
            ((nowTs - activeDuck.lastBreedingEggAt) % ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS)
        )
      : 0;
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

  const advice = evaluateNextStepAdvice(
    state,
    timedBonusReadyIn,
    () => 0,
    () => 0,
    checkSlotUnlockEligibility,
    getFeedCost
  );

  const handleAdvisorClick = () => {
    switch (advice.action) {
      case 'START_BREEDING': {
        const idx = advice.targetDuckIndex ?? state.activeDuckIndex;
        const target = state.ducks[idx];
        if (target) {
          onSelectDuck(idx);
          onStartBreeding(target.id);
        }
        break;
      }
      case 'UPGRADE_XL_EGG': {
        const idx = advice.targetDuckIndex ?? state.activeDuckIndex;
        const target = state.ducks[idx];
        if (target) {
          onSelectDuck(idx);
          onUpgradeXlWithEggs(target.id);
        }
        break;
      }
      case 'UNLOCK_SLOT': {
        if (advice.targetSlotIndex !== undefined) {
          onUnlockSlot(advice.targetSlotIndex);
        }
        break;
      }
      case 'CUSTOMIZE_STAR': {
        const idx = advice.targetDuckIndex ?? state.activeDuckIndex;
        const target = state.ducks[idx];
        if (target) {
          onSelectDuck(idx);
          onUpgradeStarCustomization(target.id);
        }
        break;
      }
      case 'TRAIN_DRAGON': {
        onTrainDragon(activeDuck.id);
        break;
      }
      case 'UPGRADE_TALENT': {
        soundFX.playTabSwitch();
        onOpenSquadTalents();
        break;
      }
      case 'CLAIM_TASK': {
        onClaimBestTask();
        break;
      }
      case 'CLAIM_LEAGUE':
      case 'GO_ARENA': {
        soundFX.playTabSwitch();
        onGoToArena();
        break;
      }
      case 'CLAIM_TIMED': {
        soundFX.playChestOpen();
        onClaimTimedBonus();
        break;
      }
      case 'FEED_DRAGON': {
        triggerFeedAction();
        break;
      }
      case 'GO_EGGS': {
        soundFX.playTabSwitch();
        onGoToEggs();
        break;
      }
    }
  };

  const clampedMainStar = clampCustomLevel(activeDuck.customLevel);
  const mainStarMeta = getStarTierMeta(clampedMainStar);
  const dragonElement = getDragonElement(activeDuck.skin);
  const canCustomAtLv5 =
    isMaxLevel &&
    clampedMainStar < ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL &&
    state.stars >= nextCustomCost;

  // Primary Bottom Action State
  const primaryDisabled = isBreedingActive
    ? !canUpgradeXlWithEggs
    : readyForBreedingGate
      ? false
      : !levelFeedsDone
        ? state.corn < effectiveFeedCost
        : !canCustomAtLv5;

  return (
    <div className="relative w-full h-full overflow-y-auto">
      <SanctuaryBackdrop
        variant="stage"
        evolutionLevel={activeDuck.level}
        customLevel={clampedMainStar}
        element={dragonElement}
        isFever={isFever}
        className="opacity-75"
      />
      <div className="relative z-10 min-h-full flex flex-col justify-between max-w-5xl mx-auto px-3 sm:px-6 py-2">
        {/* ZONE 1: Wallet DMD Balance + Dragon Specs + Quick Sub-Nav */}
        <div className="relative z-20 flex flex-col items-center shrink-0">
          <div className="flex items-center gap-2">
            <DmdIcon className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="font-mono-num text-2xl sm:text-4xl font-black tracking-tight text-white">
              {state.dmdTotal.toFixed(2)}
            </span>
            <span className="text-[11px] font-black text-amber-300">DMD (المحفظة)</span>
            <button
              type="button"
              onClick={() => {
                soundFX.playTabSwitch();
                setShowDmdGuide((v) => !v);
              }}
              aria-label="شرح اقتصاد التنانين وعملة DMD"
              className="w-8 h-8 rounded-full bg-slate-800/90 border border-slate-700 hover:border-amber-400 text-slate-300 hover:text-amber-300 flex items-center justify-center cursor-pointer transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1 text-[11px] sm:text-xs font-bold">
            <span className={rarityStyle.color}>{rarityStyle.labelAr}</span>
            {activeSize !== 'NORMAL' && (
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono-num text-[10px] font-black">
                {activeSize}
              </span>
            )}
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono-num text-slate-200">LVL {activeDuck.level}/5</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-mono-num ${mainStarMeta.badgeClass}`}>
              ★{clampedMainStar}/10
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono-num text-emerald-400">
              {dragonUnlockedDmd}/{dragonMaxDmdPrice} DMD
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono-num text-amber-200 flex items-center gap-0.5">
              🥚 {state.breedingEggs ?? 0}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono-num text-rose-400">قوة {combatPreview.totalPowerScore} ⚡</span>
          </div>

          {showDmdGuide && (
            <div className="mt-2 w-full max-w-lg rounded-2xl bg-[#161b28] border border-amber-400/50 p-3.5 text-right shadow-2xl relative z-30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  نظام عملة DMD والتطور والتزاوج
                </span>
                <button
                  onClick={() => setShowDmdGuide(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed space-y-1">
                • <strong className="text-amber-300">عملة المحفظة:</strong> لا يتم تعدين DMD. تُضاف لمحفظتك عبر تخصيص التنين بالنجوم (★1 ← ★10) وتُستبدل عند الإطلاق الرسمي (عادي 15 · نادر 45 · ملحمي 120 · أسطوري 350 · خرافي 1000).
                <br />• <strong className="text-white">عداد تعيين التكلفة (8س):</strong> يبدأ مع أول ضغطة إطعام، وبعد 8 ساعات يعيد تكلفة الإطعام لنقطة البداية الخاصة بالمستوى.
                <br />• <strong className="text-sky-300">بوابة التزاوج (24س):</strong> بعد إتمام ضغطات المستوى (100/200/300/400)، يفتح تزاوج 24 ساعة للانتقال للمستوى التالي، ويعطيك بيضة تزاوج كل 15 دقيقة لترقية تنانين XL و XXL.
              </p>
            </div>
          )}

          {/* ZONE 2: Smart Next-Step Advisor Compact Bar */}
          <div className="w-full max-w-lg mx-auto mt-1.5">
            <div
              className={`rounded-2xl border px-3 py-2 flex items-center justify-between gap-2.5 ${
                advice.priority === 'URGENT'
                  ? 'bg-amber-500/12 border-amber-400/60'
                  : advice.priority === 'HIGH'
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-[#161a25]/95 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Sparkles
                  className={`w-4 h-4 shrink-0 ${
                    advice.priority === 'URGENT'
                      ? 'text-amber-400'
                      : advice.priority === 'HIGH'
                        ? 'text-emerald-400'
                        : 'text-sky-400'
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-black text-white truncate">{advice.title}</div>
                  <div className="text-[10px] text-slate-300 truncate">{advice.reason}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAdvisorClick}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-[11px] hover:brightness-105 cursor-pointer shrink-0 whitespace-nowrap"
              >
                {advice.ctaLabel}
              </button>
            </div>
          </div>

          {isSoftCapped && (
            <div className="w-full max-w-lg mx-auto mt-1.5 rounded-xl bg-amber-500/15 border border-amber-400/50 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] font-bold text-amber-200">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">
                  تجاوزت سقف الخزانة ({energySoftCap.toLocaleString()}⚡): استثمر بالتدريب أو مواهب السرب.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onTrainDragon(activeDuck.id)}
                disabled={state.corn < trainingCost}
                className="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] shrink-0 cursor-pointer"
              >
                تدريب
              </button>
            </div>
          )}

          {(comboCount > 1 || isFever) && (
            <div className="mt-1 flex items-center gap-2 text-xs font-black">
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

        {/* ZONE 3: Vivid Opaque 3D Dragon Stage */}
        <div className="relative z-10 flex-1 flex items-center justify-center my-1 min-h-[235px]">
          <div
            ref={stageContainerRef}
            className={`relative w-full max-w-[340px] h-full min-h-[235px] max-h-[340px] rounded-[28px] border-2 bg-[#0b0e17] ${
              isFever ? 'border-amber-400 animate-fever-glow' : rarityStyle.border
            } overflow-hidden flex flex-col items-center justify-center ${cardShake ? 'animate-hit-shake' : ''}`}
          >
            <div
              aria-hidden="true"
              className={`absolute inset-0 bg-gradient-to-b ${
                isFever ? 'from-rose-500/25 via-amber-500/10 to-transparent' : rarityStyle.glow
              } pointer-events-none`}
            />

            <div className="pointer-events-none absolute top-2.5 inset-x-3 z-20 flex items-center justify-between text-[11px] font-mono-num font-bold text-slate-200">
              <span className="truncate">
                {activeDuck.name} {activeSize !== 'NORMAL' ? `(${activeSize})` : ''}
              </span>
              <span className="text-amber-300 shrink-0">
                {isBreedingActive
                  ? `تزاوج ${formatHms(breedingRemainingMs)}`
                  : 'اسحب للتدوير · انقر للإطعام'}
              </span>
            </div>

            <div className="relative z-10 w-full h-full">
              <Dragon3DStage
                skin={activeDuck.skin}
                rarity={activeDuck.rarity}
                level={activeDuck.level}
                customLevel={activeDuck.customLevel}
                sizeTier={activeSize}
                gear={activeDuck.gear}
                aura={activeDuck.aura}
                isFever={isFever}
                feedPulseNonce={feedPulseNonce}
                levelBurstNonce={levelBurstNonce}
                onTapStage={(cx, cy) => triggerFeedAction(cx, cy)}
              />
            </div>

            {evolvedBurst && (
              <div className="pointer-events-none absolute top-10 z-30 px-3 py-1 rounded-xl bg-amber-400 text-slate-950 text-xs font-black shadow-xl animate-bounce">
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
        </div>

        {/* ZONE 4: 8 Chronological Slots + 8h Cost Reset / 24h Breeding Card + Primary CTA + Quick Services */}
        <div className="relative z-10 w-full max-w-lg mx-auto space-y-2 pb-1 shrink-0">
          {/* 8-Slot Dragon Strip (Chronologically assigned by unlockedAt ascending) */}
          <div className="grid grid-cols-4 sm:flex sm:items-center sm:justify-center gap-1.5 py-0.5">
            {DRAGON_SLOTS.map((slot) => {
              const unlocked = slot.slotIndex < state.unlockedSlots;
              const occupantIdx = state.ducks.findIndex((d) => d.slotIndex === slot.slotIndex);
              const occupant = occupantIdx >= 0 ? state.ducks[occupantIdx] : null;
              const isSelected = occupantIdx >= 0 && occupantIdx === state.activeDuckIndex;
              const eligibility = !unlocked ? checkSlotUnlockEligibility(slot.slotIndex, state) : null;

              if (!unlocked) {
                return (
                  <button
                    key={slot.slotIndex}
                    onClick={() => {
                      soundFX.playTabSwitch();
                      setSelectedLockedSlot(selectedLockedSlot === slot.slotIndex ? null : slot.slotIndex);
                    }}
                    title={`${slot.label} · ${slot.starCost} ★ (${slot.requirementText})`}
                    className={`relative w-full sm:w-11 min-h-[44px] sm:h-11 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      eligibility?.canUnlock
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span className="font-mono-num text-[9px] font-bold mt-0.5">{slot.starCost}★</span>
                  </button>
                );
              }

              return (
                <button
                  key={slot.slotIndex}
                  onClick={() => {
                    soundFX.playTabSwitch();
                    setSelectedLockedSlot(null);
                    if (occupantIdx >= 0) {
                      onSelectDuck(occupantIdx);
                    } else if (activeDuck) {
                      onAssignSlot(activeDuck.id, slot.slotIndex);
                    }
                  }}
                  title={occupant ? `${occupant.name} (LVL ${occupant.level})` : `نقل إلى ${slot.label}`}
                  className={`relative w-full sm:w-11 min-h-[44px] sm:h-11 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400/20 border-amber-400 scale-[1.03] shadow-md'
                      : 'bg-[#181b24] border-slate-800 hover:border-slate-600 opacity-90 hover:opacity-100'
                  }`}
                >
                  {occupant ? (
                    <>
                      <DragonIllustration
                        skin={occupant.skin}
                        level={occupant.level}
                        customLevel={occupant.customLevel}
                        gear={occupant.gear}
                        aura={occupant.aura}
                        className="w-8 h-8"
                      />
                      <span className="absolute -bottom-1 px-1 rounded bg-slate-950/90 border border-slate-700 font-mono-num text-[8px] font-black text-amber-300">
                        L{occupant.level}
                      </span>
                      {occupant.breedingEndsAt && occupant.breedingEndsAt > nowTs && (
                        <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 flex items-center justify-center">
                          <Heart className="w-2.5 h-2.5 text-white fill-white" />
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono-num text-[8px] text-slate-400">خ{slot.slotIndex + 1}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {selectedLockedSlot !== null && selectedLockedSlot >= state.unlockedSlots && (
            <div className="bg-[#161b28] border border-amber-400/50 rounded-2xl p-3 flex items-center justify-between gap-3">
              {(() => {
                const meta = DRAGON_SLOTS[selectedLockedSlot];
                const check = checkSlotUnlockEligibility(selectedLockedSlot, state);
                return (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-white">
                        {meta.label} · توسيع السرب
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        الشرط:{' '}
                        <span className={check.metCondition ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                          {meta.requirementText}
                        </span>
                      </div>
                    </div>
                    <button
                      disabled={!check.canUnlock}
                      onClick={() => {
                        onUnlockSlot(selectedLockedSlot);
                        setSelectedLockedSlot(null);
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1 shrink-0 ${
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

          {/* 8h Cost Reset Counter + Breeding Gate + Level Feeding Progress */}
          <div className="bg-[#161923] border border-slate-800 rounded-2xl px-3.5 py-2.5 space-y-1.5">
            {isBreedingActive ? (
              <>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-rose-300 font-black flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                    <span>تزاوج المستوى {activeDuck.level} ← {activeDuck.level + 1}</span>
                  </span>
                  <span className="font-mono-num text-amber-300 font-black">
                    {formatHms(breedingRemainingMs)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(2, ((ECONOMY_LIMITS.BREEDING_DURATION_MS - breedingRemainingMs) / ECONOMY_LIMITS.BREEDING_DURATION_MS) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-300">
                  <span>🥚 بيضة تزاوج قادمة خلال: {formatHms(nextEggRemainingMs).slice(3)}</span>
                  <span className="text-emerald-400 font-bold">رصيد البيض: {state.breedingEggs ?? 0}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-200 font-bold flex items-center gap-1.5">
                    <TimerReset className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      {isMaxLevel
                        ? `إكمال المستوى 5 (${activeDuck.feedsProgress}/${activeDuck.feedsRequired})`
                        : `ضغطات LVL ${activeDuck.level} (${activeDuck.feedsProgress}/${activeDuck.feedsRequired})`}
                    </span>
                  </span>
                  <span className="font-mono-num text-[10px] font-black text-sky-300">
                    {costResetRemainingMs > 0
                      ? `إعادة التكلفة: ${formatHms(costResetRemainingMs)}`
                      : `التكلفة عند البداية (${effectiveFeedCost}⚡)`}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-300 transition-all duration-150"
                    style={{
                      width: `${Math.min(100, (activeDuck.feedsProgress / activeDuck.feedsRequired) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-num">
                  <span>عداد الـ 8 ساعات يعيد تكلفة الإطعام إلى بداية المستوى</span>
                  {readyForBreedingGate ? (
                    <span className="text-amber-300 font-black">جاهز لبوابة التزاوج 24س!</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">التكلفة الحالية: {effectiveFeedCost}⚡</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Primary Action CTA + XL/XXL Egg Upgrade (when applicable) + Quick Services */}
          <div className="flex items-center gap-2">
            {canUpgradeXlWithEggs && !isBreedingActive ? (
              <button
                type="button"
                onClick={() => onUpgradeXlWithEggs(activeDuck.id)}
                className="min-h-[48px] px-3 py-3 rounded-2xl bg-gradient-to-b from-purple-500 to-indigo-600 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0 shadow-lg"
              >
                <EggIcon className="w-4 h-4" />
                <span className="font-mono-num whitespace-nowrap">
                  ترقية {activeSize} ({xlEggUpgradeCost}🥚)
                </span>
              </button>
            ) : null}

            <button
              type="button"
              disabled={primaryDisabled}
              onClick={() => {
                if (canUpgradeXlWithEggs && isBreedingActive) {
                  onUpgradeXlWithEggs(activeDuck.id);
                } else if (readyForBreedingGate) {
                  onStartBreeding(activeDuck.id);
                } else if (!levelFeedsDone && !isBreedingActive) {
                  triggerFeedAction();
                } else if (isMaxLevel) {
                  onUpgradeStarCustomization(activeDuck.id, 1);
                }
              }}
              className={`flex-1 min-h-[48px] py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                primaryDisabled
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : readyForBreedingGate
                    ? 'bg-gradient-to-b from-rose-500 to-pink-600 text-white hover:brightness-105 cursor-pointer shadow-lg'
                    : !levelFeedsDone
                      ? 'bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 hover:brightness-105 cursor-pointer shadow-lg'
                      : 'bg-indigo-500 text-white hover:bg-indigo-400 cursor-pointer shadow-lg'
              }`}
            >
              {isBreedingActive ? (
                canUpgradeXlWithEggs ? (
                  <>
                    <EggIcon className="w-5 h-5 shrink-0" />
                    <span className="font-mono-num whitespace-nowrap">
                      ترقية فورية ببيض التزاوج ({xlEggUpgradeCost}🥚)
                    </span>
                  </>
                ) : (
                  <>
                    <Heart className="w-5 h-5 shrink-0 text-rose-400" />
                    <span className="font-mono-num whitespace-nowrap">
                      التزاوج جارٍ ({formatHms(breedingRemainingMs)})
                    </span>
                  </>
                )
              ) : readyForBreedingGate ? (
                <>
                  <Heart className="w-5 h-5 shrink-0 fill-white" />
                  <span className="whitespace-nowrap">بدء التزاوج (24 ساعة ← LVL {activeDuck.level + 1})</span>
                </>
              ) : !levelFeedsDone ? (
                <>
                  <CornIcon className="w-5 h-5 shrink-0" />
                  <span className="font-mono-num whitespace-nowrap">إطعام التنين ({effectiveFeedCost}⚡)</span>
                </>
              ) : (
                <>
                  <StarIcon className="w-5 h-5 shrink-0" />
                  <span className="font-mono-num whitespace-nowrap">
                    تخصيص ★{clampedMainStar + 1} ({nextCustomCost}★)
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playTabSwitch();
                setServicesDrawerOpen(true);
              }}
              className="relative min-h-[48px] px-3.5 py-3 rounded-2xl bg-[#1a1f2e] border border-slate-700 hover:border-amber-400/60 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>الخدمات السريعة</span>
              {drawerBadgeCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-slate-950 font-mono-num text-[10px] font-black flex items-center justify-center">
                  {drawerBadgeCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* UNIFIED QUICK SERVICES SLIDE-UP DRAWER */}
      {servicesDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setServicesDrawerOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-[#161923] border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 max-h-[85vh] overflow-y-auto space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>الخدمات السريعة والتطوير</span>
              </h3>
              <button
                onClick={() => setServicesDrawerOpen(false)}
                aria-label="إغلاق الخدمات السريعة"
                className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Primary Dragon Management Grid (Custom, Merge XL/XXL, Vault, Arena) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setServicesDrawerOpen(false);
                  setSubView('CUSTOM');
                }}
                className="min-h-[44px] p-3 rounded-2xl bg-sky-500/15 border border-sky-400/40 text-sky-200 hover:bg-sky-500/25 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Palette className="w-4 h-4 text-sky-400" />
                <span>العتاد وتخصيص ★</span>
              </button>

              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setServicesDrawerOpen(false);
                  setSubView('MERGE');
                }}
                className="min-h-[44px] p-3 rounded-2xl bg-purple-500/15 border border-purple-400/40 text-purple-200 hover:bg-purple-500/25 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-300" />
                <span>دمج XL / XXL</span>
              </button>

              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setServicesDrawerOpen(false);
                  setSubView('VAULT');
                }}
                className="min-h-[44px] p-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-200 hover:bg-amber-500/25 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Archive className="w-4 h-4 text-amber-300" />
                <span>خزانة DMD ({state.customizedVault?.length ?? 0})</span>
              </button>

              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setServicesDrawerOpen(false);
                  onGoToArena();
                }}
                className="min-h-[44px] p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 hover:bg-rose-500/25 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Swords className="w-4 h-4 text-rose-400" />
                <span>دخول الحلبة</span>
              </button>
            </div>

            {/* Active Dragon Skill Upgrade */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{duckSkill.name}</span>
                  <span className="font-mono-num text-[10px] text-slate-400 shrink-0">
                    م{activeDuck.skillLevel}/5
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{duckSkill.passiveBonus}</div>
              </div>
              <button
                disabled={state.corn < skillUpgradeCost || activeDuck.skillLevel >= 5}
                onClick={() => {
                  soundFX.playLevelUp();
                  onUpgradeDuckSkill(activeDuck.id);
                }}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1 shrink-0 ${
                  activeDuck.skillLevel >= 5
                    ? 'bg-slate-800 text-emerald-400'
                    : state.corn >= skillUpgradeCost
                      ? 'bg-indigo-500 text-white hover:bg-indigo-400 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CornIcon className="w-3.5 h-3.5" />
                <span className="font-mono-num">
                  {activeDuck.skillLevel >= 5 ? 'مكتمل' : `ترقية ${skillUpgradeCost.toLocaleString()}`}
                </span>
              </button>
            </div>

            {/* Continuous Dragon Intensive Combat Training Sink */}
            <div className="rounded-2xl bg-slate-900/90 border border-rose-500/30 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-rose-300">
                  <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">تدريب القوة المتقدم</span>
                  <span className="font-mono-num text-[10px] text-slate-400 shrink-0">
                    رتبة {currentTrainingRank}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono-num">
                  +14 HP · +2 ATK لكل رتبة (إجمالي +{currentTrainingRank * 14} HP)
                </div>
              </div>
              <button
                disabled={state.corn < trainingCost}
                onClick={() => onTrainDragon(activeDuck.id)}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1 shrink-0 font-mono-num ${
                  state.corn >= trainingCost
                    ? 'bg-rose-500 text-white hover:bg-rose-400 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CornIcon className="w-3.5 h-3.5" />
                <span>تدريب {trainingCost.toLocaleString()}</span>
              </button>
            </div>

            {/* Squad Talents & Rewarded Ad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setServicesDrawerOpen(false);
                  onOpenSquadTalents();
                }}
                className="min-h-[44px] px-3 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-200 hover:bg-amber-500/25 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>مواهب السرب وصقل التعاويذ</span>
              </button>

              <button
                onClick={() => onWatchRewardedAd('energy')}
                disabled={state.treasury.adsWatchedToday >= state.treasury.maxAdsPerDay}
                className={`min-h-[44px] p-2.5 rounded-2xl border font-black text-xs flex items-center justify-center gap-1.5 ${
                  state.treasury.adsWatchedToday >= state.treasury.maxAdsPerDay
                    ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25 cursor-pointer'
                }`}
              >
                <PlayCircle className="w-4 h-4 shrink-0" />
                <span className="font-mono-num">
                  +{ECONOMY_LIMITS.AD_ENERGY_REWARD}⚡ ({state.treasury.adsWatchedToday}/
                  {state.treasury.maxAdsPerDay})
                </span>
              </button>
            </div>

            {/* Season, Daily Pass, Treasures, Timed Supply */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setServicesDrawerOpen(false);
                  onOpenDuckerPass();
                }}
                className="relative min-h-[48px] flex flex-col items-center justify-center py-2 px-2 rounded-2xl bg-slate-900 border border-amber-400/30 hover:border-amber-400 cursor-pointer"
              >
                {hasClaimablePass && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                )}
                <Crown className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-[11px] font-extrabold text-amber-200 font-mono-num">
                  موسم {ACTIVE_SEASON.seasonNumber} · م{passLevel}
                </span>
              </button>

              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setServicesDrawerOpen(false);
                  onOpenDailyPass();
                }}
                className="relative min-h-[48px] flex flex-col items-center justify-center py-2 px-2 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-400/60 cursor-pointer"
              >
                {hasClaimableDailyPass && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                )}
                <Gift className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-[11px] font-extrabold text-emerald-300">هدية اليوم</span>
              </button>

              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setServicesDrawerOpen(false);
                  onOpenTreasures();
                }}
                className="min-h-[48px] flex flex-col items-center justify-center py-2 px-2 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-400/60 cursor-pointer"
              >
                <Gem className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-[11px] font-extrabold text-slate-200">كنوز التنانين</span>
              </button>

              <button
                onClick={() => {
                  if (timedBonusReadyIn === 0) {
                    soundFX.playChestOpen();
                    onClaimTimedBonus();
                  } else {
                    soundFX.playTabSwitch();
                    onOpenDailyTasks();
                  }
                  setServicesDrawerOpen(false);
                }}
                className={`min-h-[48px] flex flex-col items-center justify-center py-2 px-2 rounded-2xl border cursor-pointer ${
                  timedBonusReadyIn === 0
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-sky-400/60'
                }`}
              >
                <Clock className="w-4 h-4 text-sky-400 mb-1" />
                <span className="font-mono-num text-[11px] font-bold">
                  {timedBonusReadyIn === 0
                    ? `جاهز +${ECONOMY_LIMITS.TIMED_BONUS_ENERGY}`
                    : formatTimer(timedBonusReadyIn)}
                </span>
              </button>
            </div>

            {/* Reserve Dragons Thumbnails (Visual Art Cards instead of text-only!) */}
            {reserveDragons.length > 0 && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3 space-y-2">
                <div className="text-xs font-extrabold text-slate-300">
                  تنانين الاحتياط ({reserveDragons.length}):
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {reserveDragons.map((rd) => {
                    const idx = state.ducks.findIndex((d) => d.id === rd.id);
                    const isSelected = idx === state.activeDuckIndex;
                    const rdRarity = RARITY_STYLE[rd.rarity];
                    const rdSize = resolveDragonSize(rd);
                    return (
                      <button
                        key={rd.id}
                        onClick={() => {
                          soundFX.playTabSwitch();
                          onSelectDuck(idx);
                          setServicesDrawerOpen(false);
                        }}
                        className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <DragonIllustration
                          skin={rd.skin}
                          level={rd.level}
                          customLevel={rd.customLevel}
                          gear={rd.gear}
                          aura={rd.aura}
                          showEvolutionEffects={true}
                          className="w-12 h-12"
                        />
                        <span className={`text-[10px] font-bold truncate w-full ${rdRarity.color}`}>
                          {rdRarity.labelAr} {rdSize !== 'NORMAL' ? rdSize : ''}
                        </span>
                        <span className="font-mono-num text-[10px] text-amber-300 font-black">
                          LVL {rd.level} · ★{rd.customLevel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
