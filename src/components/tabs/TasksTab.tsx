import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Heart,
  Share2,
  Ticket,
  Trophy,
  X,
} from 'lucide-react';
import { AchievementRegistryItem, DuckSkinId, GameState, MainTab } from '../../types/game';
import {
  ACHIEVEMENTS_REGISTRY,
  HEART_MILESTONES_REGISTRY,
  HONOR_PACKS_REGISTRY,
  PROMO_CODES_REGISTRY,
  SKIN_CATALOG,
  SOCIAL_TASKS_REGISTRY,
  WHEEL_REWARDS_REGISTRY,
} from '../../data/gameData';
import { DuckIllustration } from '../art/DuckArt';
import { soundFX } from '../../utils/sound';
import {
  ECONOMY_LIMITS,
  getInstantSummonStarCost,
  getPlayerTier,
} from '../../utils/economyEngine';
import { openExternalLink, shareViaTelegram, triggerTelegramHaptic } from '../../utils/telegram';

interface TasksTabProps {
  state: GameState;
  onSwitchTab: (tab: MainTab) => void;
  onOpenDailyTasks: () => void;
  onOpenTrader: () => void;
  onFlipCoin: (packId: string) => DuckSkinId | null;
  onClaimHonorPack: (packId: string) => void;
  onClaimWatchBonus: () => void;
  onClaimAchievement: (id: string) => void;
  onClaimHeartMilestone: (threshold: number) => void;
  onClaimSocial: (id: string) => void;
  onRedeemPromo: (code: string) => { ok: boolean; message: string };
  onSpinWheel: (mega: boolean) => { segmentIndex: number; label: string; commitReward: () => void } | null;
  onInviteFriendSim: (premium: boolean) => void;
  onInstantMerge: (rarity: 'UNCOMMON' | 'RARE') => void;
}

function getAchievementProgress(metric: AchievementRegistryItem['metric'], state: GameState): number {
  switch (metric) {
    case 'feeds':
      return state.stats.totalFeeds;
    case 'merges':
      return state.stats.totalMerges;
    case 'errands':
      return state.stats.totalErrands;
    case 'tasks':
      return state.stats.totalTasksClaimed;
    case 'wins':
      return state.league.wins;
    case 'ducks':
      return state.ducks.length + (state.customizedVault?.length ?? 0);
    case 'maxCustom':
      return Math.max(
        0,
        ...state.ducks.map((d) => d.customLevel ?? 0),
        ...(state.customizedVault ?? []).map((d) => d.customLevel ?? 0)
      );
  }
}

export const TasksTab: React.FC<TasksTabProps> = ({
  state,
  onSwitchTab,
  onOpenDailyTasks,
  onOpenTrader,
  onFlipCoin,
  onClaimHonorPack,
  onClaimWatchBonus,
  onClaimAchievement,
  onClaimHeartMilestone,
  onClaimSocial,
  onRedeemPromo,
  onSpinWheel,
  onInviteFriendSim,
  onInstantMerge,
}) => {
  const [subTab, setSubTab] = useState<'QUESTS' | 'CHALLENGES' | 'FRIENDS'>('QUESTS');
  const [itemsDrawerOpen, setItemsDrawerOpen] = useState(false);
  const [activeFlipPackId, setActiveFlipPackId] = useState<string | null>(null);
  const [lastFlippedSkin, setLastFlippedSkin] = useState<DuckSkinId | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const wheelTickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wheelEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWheelCommitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (wheelTickTimerRef.current) clearInterval(wheelTickTimerRef.current);
      if (wheelEndTimerRef.current) clearTimeout(wheelEndTimerRef.current);
      if (pendingWheelCommitRef.current) {
        pendingWheelCommitRef.current();
        pendingWheelCommitRef.current = null;
      }
    };
  }, []);

  const playerTier = getPlayerTier(state);
  const summonUncommonCost = getInstantSummonStarCost('UNCOMMON', playerTier);
  const summonRareCost = getInstantSummonStarCost('RARE', playerTier);
  const invitesUsedToday = state.treasury.invitesClaimedToday ?? 0;
  const invitesCapReached = invitesUsedToday >= ECONOMY_LIMITS.MAX_DAILY_INVITE_CLAIMS;

  const activeFlipPack = state.flipCoins.find((f) => f.id === activeFlipPackId) ?? null;

  const triggerWheelSpin = (mega: boolean) => {
    if (wheelSpinning) return;
    const outcome = onSpinWheel(mega);
    if (!outcome) {
      soundFX.playError();
      triggerTelegramHaptic('error');
      setWheelResult(mega ? 'تحتاج 100 ★ نجمة!' : 'تحتاج 100 ميدالية!');
      return;
    }
    triggerTelegramHaptic('medium');
    setWheelSpinning(true);
    setWheelResult(null);
    pendingWheelCommitRef.current = outcome.commitReward;

    const segCount = WHEEL_REWARDS_REGISTRY.length;
    const segAngle = 360 / segCount;
    const currentMod = ((wheelAngle % 360) + 360) % 360;
    const targetMod = (360 - (outcome.segmentIndex * segAngle + segAngle / 2)) % 360;
    const delta = (targetMod - currentMod + 360) % 360;
    setWheelAngle((prev) => prev + 5 * 360 + delta);

    let ticks = 0;
    if (wheelTickTimerRef.current) clearInterval(wheelTickTimerRef.current);
    if (wheelEndTimerRef.current) clearTimeout(wheelEndTimerRef.current);

    wheelTickTimerRef.current = setInterval(() => {
      ticks++;
      soundFX.playWheelTick();
      if (ticks > 12 && wheelTickTimerRef.current) {
        clearInterval(wheelTickTimerRef.current);
        wheelTickTimerRef.current = null;
      }
    }, 110);

    wheelEndTimerRef.current = setTimeout(() => {
      if (pendingWheelCommitRef.current) {
        pendingWheelCommitRef.current();
        pendingWheelCommitRef.current = null;
      }
      setWheelSpinning(false);
      soundFX.playChestOpen();
      triggerTelegramHaptic('success');
      setWheelResult(`مبروك! ربحت ${outcome.label}`);
    }, 1600);
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto px-3 sm:px-5 py-3 overflow-y-auto">
      {/* Top 3 Main Sub-Tabs matching 01:33 */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#181b24] border border-slate-800 mb-4 shrink-0">
        <button
          onClick={() => {
            soundFX.playTabSwitch();
            setSubTab('QUESTS');
          }}
          className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            subTab === 'QUESTS'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          المهام والعناصر
        </button>
        <button
          onClick={() => {
            soundFX.playTabSwitch();
            setSubTab('CHALLENGES');
          }}
          className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            subTab === 'CHALLENGES'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          التحديات
        </button>
        <button
          onClick={() => {
            soundFX.playTabSwitch();
            setSubTab('FRIENDS');
          }}
          className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            subTab === 'FRIENDS'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          الأصدقاء
        </button>
      </div>

      {/* === SUBTAB 1: QUESTS & ITEMS === */}
      {subTab === 'QUESTS' && (
        <div className="space-y-4 pb-6">
          {/* Daily Tasks Banner */}
          <div className="bg-gradient-to-l from-sky-500/15 via-[#181b24] to-[#181b24] border border-sky-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-sm font-black text-white">المهام اليومية · التحدي اليومي</div>
              <p className="text-xs text-slate-300 mt-0.5">
                أكمل المهام اليومية لكسب النجوم ★ والطاقة وفتح جوائز التحدي
              </p>
            </div>
            <button
              onClick={() => {
                soundFX.playTabSwitch();
                onOpenDailyTasks();
              }}
              className="px-4 py-2 rounded-xl bg-sky-400 text-slate-950 font-black text-xs hover:brightness-105 cursor-pointer shrink-0"
            >
              فتح المهام
            </button>
          </div>

          {/* My Items / عناصري */}
          <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-white">
                عناصري ({state.flipCoins.reduce((s, f) => s + f.count, 0)})
              </h3>
              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setItemsDrawerOpen(true);
                }}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                عرض البطاقات (عملة المظهر)
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {state.flipCoins.map((fc) => (
                <button
                  key={fc.id}
                  onClick={() => {
                    soundFX.playTabSwitch();
                    setActiveFlipPackId(fc.id);
                    setLastFlippedSkin(null);
                  }}
                  className="rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/60 p-2 flex flex-col items-center cursor-pointer transition-colors"
                >
                  <DuckIllustration skin={fc.possibleSkins[0]} className="w-10 h-10" />
                  <span className="font-mono-num text-xs font-black text-amber-300 mt-1">
                    ×{fc.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* HONOR REWARDS */}
          <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-sm font-black text-white">مكافآت الشرف</h3>
              <span className="font-mono-num text-xs font-bold text-amber-300">
                رسائل الشرف: {state.stats.honorLetters}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              استبدل رسائل الشرف بحزم التنانين للحصول على طاقة إطعام ونجوم إضافية.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {HONOR_PACKS_REGISTRY.map((pack) => {
                const claimed = state.claimedHonorPacks.includes(pack.id);
                const canAfford = state.stats.honorLetters >= pack.costLetters;
                return (
                  <div
                    key={pack.id}
                    className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5 text-center flex flex-col justify-between"
                  >
                    <div className="text-[11px] font-bold text-slate-200 mb-1">{pack.titleAr}</div>
                    <div className="text-[10px] text-emerald-400 font-mono-num mb-2">
                      {pack.rewardDescAr}
                    </div>
                    <button
                      disabled={claimed || !canAfford}
                      onClick={() => {
                        soundFX.playClaim();
                        triggerTelegramHaptic('success');
                        onClaimHonorPack(pack.id);
                      }}
                      className={`w-full min-h-[40px] py-1.5 rounded-lg font-extrabold text-[11px] ${
                        claimed
                          ? 'bg-slate-800 text-slate-500'
                          : canAfford
                            ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? 'تم الاستلام' : pack.costLetters === 0 ? 'مجانا' : `${pack.costLetters} ✉️`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TRADER & OPTIONAL REWARDED ADS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-display text-sm font-black text-white">التاجر المتنقل</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  عروض التاجر الخاصة: خصم 25% على كنوز التنانين!
                </p>
              </div>
              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  onOpenTrader();
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shrink-0"
              >
                اقتناء
              </button>
            </div>

            <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-white">
                  شاهد إعلان اختياري ({state.treasury.adsWatchedToday}/{state.treasury.maxAdsPerDay})
                </h4>
                <p className="text-xs text-emerald-400 font-mono-num font-bold mt-0.5">
                  +{ECONOMY_LIMITS.AD_ENERGY_REWARD} طاقة فورية · دعم 50% لصندوق DMD
                </p>
              </div>
              <button
                disabled={state.treasury.adsWatchedToday >= state.treasury.maxAdsPerDay}
                onClick={() => {
                  soundFX.playClaim();
                  onClaimWatchBonus();
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs shrink-0 ${
                  state.treasury.adsWatchedToday >= state.treasury.maxAdsPerDay
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer'
                }`}
              >
                {state.treasury.adsWatchedToday >= state.treasury.maxAdsPerDay ? 'اكتمل اليوم' : 'مشاهدة'}
              </button>
            </div>
          </div>

          {/* COLLECT HEARTS (02:54-02:56) */}
          <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <h3 className="text-sm font-black text-white">اجمع القلوب</h3>
              </div>
              <span className="font-mono-num text-xs font-bold text-rose-400">
                لديك {state.stats.hearts.toLocaleString()} ❤️
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              احصل على القلوب عند دمج بيض الحب وإطعام التنانين لفتح مكافآت وبيضة الياقوت [6]!
            </p>
            <div className="grid grid-cols-3 gap-2">
              {HEART_MILESTONES_REGISTRY.map((m) => {
                const reached = state.stats.hearts >= m.targetHearts;
                const claimed = state.claimedHeartMilestones.includes(m.targetHearts);
                return (
                  <button
                    key={m.targetHearts}
                    disabled={!reached || claimed}
                    onClick={() => {
                      soundFX.playChestOpen();
                      triggerTelegramHaptic('success');
                      onClaimHeartMilestone(m.targetHearts);
                    }}
                    className={`min-h-[56px] rounded-xl p-2.5 border text-center transition-all ${
                      claimed
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : reached
                          ? 'bg-rose-500/20 border-rose-400 text-white hover:brightness-110 cursor-pointer'
                          : 'bg-slate-900/70 border-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{m.rewardLabelAr}</div>
                    <div className="font-mono-num text-[10px] mt-1">
                      {claimed ? '✓ تم الاستلام' : `${m.targetHearts.toLocaleString()} ❤️`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* GAME ACHIEVEMENTS */}
          <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <h3 className="text-sm font-black text-white">إنجازات عالم التنانين</h3>
            {ACHIEVEMENTS_REGISTRY.map((ach) => {
              const prog = getAchievementProgress(ach.metric, state);
              const done = prog >= ach.target;
              const claimed = state.claimedAchievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{ach.titleAr}</div>
                    <div className="text-[10px] text-slate-400 truncate">{ach.descAr}</div>
                    <div className="font-mono-num text-[11px] text-amber-300 mt-0.5">
                      {Math.min(prog, ach.target)}/{ach.target} · {ach.rewardLabelAr}
                    </div>
                  </div>
                  <button
                    disabled={!done || claimed}
                    onClick={() => {
                      soundFX.playClaim();
                      triggerTelegramHaptic('success');
                      onClaimAchievement(ach.id);
                    }}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl font-extrabold text-xs shrink-0 ${
                      claimed
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : done
                          ? 'bg-amber-400 text-slate-950 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {claimed ? 'مكتمل' : done ? 'استلام' : 'قيد التقدم'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* INSTANT MERGE & PROMO CODE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white">استدعاء تنين فوري</h3>
                <span className="font-mono-num text-[10px] text-amber-300 font-bold">الرتبة {playerTier}</span>
              </div>
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-emerald-400 font-bold">غير شائع مضمون</span>
                <button
                  disabled={state.stars < summonUncommonCost}
                  onClick={() => {
                    soundFX.playGodConfirm();
                    triggerTelegramHaptic('medium');
                    onInstantMerge('UNCOMMON');
                  }}
                  className={`min-h-[44px] px-3 py-1.5 rounded-lg border font-bold font-mono-num ${
                    state.stars >= summonUncommonCost
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer'
                      : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  استدعاء ({summonUncommonCost} ★)
                </button>
              </div>
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-sky-400 font-bold">نادر RARE مضمون</span>
                <button
                  disabled={state.stars < summonRareCost}
                  onClick={() => {
                    soundFX.playGodConfirm();
                    triggerTelegramHaptic('medium');
                    onInstantMerge('RARE');
                  }}
                  className={`min-h-[44px] px-3 py-1.5 rounded-lg border font-bold font-mono-num ${
                    state.stars >= summonRareCost
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 hover:bg-sky-500/30 cursor-pointer'
                      : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  استدعاء ({summonRareCost} ★)
                </button>
              </div>
            </div>

            <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>أدخل رمز ترويجي (Promo Code)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  جرّب: <span className="font-mono-num text-amber-300">{PROMO_CODES_REGISTRY[0]?.code ?? 'DRAGON'}</span> أو{' '}
                  <span className="font-mono-num text-amber-300">{PROMO_CODES_REGISTRY[1]?.code ?? 'DMD2025'}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setPromoFeedback(null);
                  setPromoOpen(true);
                }}
                className="mt-3 w-full min-h-[44px] py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:brightness-105 cursor-pointer"
              >
                إدخال الرمز
              </button>
            </div>
          </div>

          {/* SOCIALS */}
          <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 className="text-sm font-black text-white">منصاتنا الاجتماعية</h3>
            {SOCIAL_TASKS_REGISTRY.map((s) => {
              const claimed = state.claimedSocials.includes(s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-2 border-b border-slate-800/80 last:border-0 gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200">{s.titleAr}</div>
                    <div className="text-[11px] text-emerald-400 font-mono-num">{s.rewardDescAr}</div>
                  </div>
                  <button
                    disabled={claimed}
                    onClick={() => {
                      if (s.url) openExternalLink(s.url);
                      soundFX.playClaim();
                      triggerTelegramHaptic('success');
                      onClaimSocial(s.id);
                    }}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
                      claimed
                        ? 'bg-slate-800 text-emerald-400'
                        : 'bg-sky-500 text-slate-950 hover:bg-sky-400 cursor-pointer'
                    }`}
                  >
                    {claimed ? '✓ تم' : 'تحقق'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === SUBTAB 2: CHALLENGES & DRAGON WHEEL === */}
      {subTab === 'CHALLENGES' && (
        <div className="space-y-4 pb-6">
          <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-black text-white">تحديات إطعام التنانين</h3>
              <span className="font-mono-num text-xs text-amber-300 font-bold">
                ميدالياتك: {state.stats.medals} 🏅
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              تحدَّ المروّضين في إطعام التنانين ودوّر <span className="text-amber-300 font-bold">عجلة التنانين</span> لربح طاقة وذهب التنانين وبيضة الزمرد [4]!
            </p>

            {/* Leaderboard */}
            <div className="space-y-2 mb-4">
              {[
                { rank: 1, name: 'solafeifei', reward: '2000 🏅', score: '6.7M' },
                { rank: 2, name: 'NububiicA', reward: '1500 🏅', score: '2.5M' },
                { rank: 3, name: 'ZloyPhilipp', reward: '1250 🏅', score: '2.2M' },
                { rank: 4, name: 'neoltd', reward: '1000 🏅', score: '2.1M' },
                {
                  rank: Math.max(5, 99 - Math.floor(state.stats.totalFeeds / 2)),
                  name: state.username,
                  reward: '10 🏅',
                  score: `${state.stats.totalFeeds * 25}`,
                  isYou: true,
                },
              ].map((row) => (
                <div
                  key={row.name}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs ${
                    row.isYou
                      ? 'bg-amber-400/15 border-amber-400/60 text-white font-bold'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-num font-black text-amber-400 w-6">#{row.rank}</span>
                    <span>{row.name}</span>
                  </div>
                  <div className="flex items-center gap-4 font-mono-num">
                    <span className="text-amber-300">{row.reward}</span>
                    <span className="text-emerald-400">{row.score}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                soundFX.playTabSwitch();
                setWheelResult(null);
                setWheelOpen(true);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 font-black text-sm hover:brightness-105 cursor-pointer flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span>عجلة التنانين ({state.stats.medals} ميدالية)</span>
            </button>
          </div>
        </div>
      )}

      {/* === SUBTAB 3: FRIENDS === */}
      {subTab === 'FRIENDS' && (
        <div className="space-y-4 pb-6">
          <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-black text-white">الأرباح من الأصدقاء</h3>
              <span className="font-mono-num text-xs font-bold text-amber-300">
                ({invitesUsedToday}/{ECONOMY_LIMITS.MAX_DAILY_INVITE_CLAIMS} اليوم)
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              احصل على مكافآت فورية عن كل صديق تدعوه (حتى {ECONOMY_LIMITS.MAX_DAILY_INVITE_CLAIMS} دعوات يومياً)، بالإضافة إلى <span className="text-emerald-400 font-bold">10%</span> من طاقة البيض!
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                disabled={invitesCapReached}
                onClick={() => {
                  soundFX.playClaim();
                  onInviteFriendSim(false);
                }}
                className={`p-3 rounded-xl border text-center transition-colors ${
                  invitesCapReached
                    ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-slate-900 border-slate-700 hover:border-emerald-400 cursor-pointer'
                }`}
              >
                <div className="text-emerald-400 font-mono-num font-black text-base">+120 ⚡</div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {invitesCapReached ? 'اكتمل الحد اليومي' : 'دعوة صديق عادي'}
                </div>
              </button>
              <button
                disabled={invitesCapReached}
                onClick={() => {
                  soundFX.playClaim();
                  onInviteFriendSim(true);
                }}
                className={`p-3 rounded-xl border text-center transition-colors ${
                  invitesCapReached
                    ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-slate-900 border-slate-700 hover:border-amber-400 cursor-pointer'
                }`}
              >
                <div className="text-amber-400 font-mono-num font-black text-base">+320 ⚡ · +3 ★</div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {invitesCapReached ? 'اكتمل الحد اليومي' : 'صديق باشتراك مميز'}
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const refUrl = `https://t.me/dragon_dmd_bot?start=${encodeURIComponent(state.username)}`;
                  shareViaTelegram('انضم معي في DRAGON × DMD وابدأ تربية التنانين الأسطورية!', refUrl);
                  soundFX.playTabSwitch();
                  triggerTelegramHaptic('light');
                }}
                className="w-full min-h-[44px] py-3 rounded-xl bg-sky-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-sky-400"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة عبر تيليجرام</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`https://t.me/dragon_dmd_bot?start=${encodeURIComponent(state.username)}`).catch(() => {});
                  soundFX.playTabSwitch();
                  triggerTelegramHaptic('light');
                  setCopiedInvite(true);
                  setTimeout(() => setCopiedInvite(false), 1800);
                }}
                className="w-full min-h-[44px] py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedInvite ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedInvite ? 'تم نسخ رابط الدعوة!' : 'نسخ رابط الدعوة'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === ITEMS DRAWER (بطاقات المظهر) === */}
      {itemsDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#181b24] border border-slate-700 rounded-3xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-black text-white">بطاقات المظهر</h3>
              <button
                onClick={() => setItemsDrawerOpen(false)}
                aria-label="إغلاق"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {state.flipCoins.map((fc) => (
                <div
                  key={fc.id}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 p-2.5 flex flex-col items-center"
                >
                  <DuckIllustration skin={fc.possibleSkins[0]} className="w-16 h-16" />
                  <div className="text-[10px] font-bold text-slate-300 mt-1 text-center truncate w-full">
                    {fc.collectionName}
                  </div>
                  <div className="font-mono-num text-xs font-black text-white my-1">{fc.count}</div>
                  <button
                    disabled={fc.count <= 0}
                    onClick={() => {
                      soundFX.playTabSwitch();
                      setItemsDrawerOpen(false);
                      setActiveFlipPackId(fc.id);
                      setLastFlippedSkin(null);
                    }}
                    className={`w-full py-1.5 rounded-lg font-black text-[11px] ${
                      fc.count > 0
                        ? 'bg-amber-400 text-slate-950 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    تبديل
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === FLIPCOIN MODAL === */}
      {activeFlipPack && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#181b24] border border-amber-400/40 rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-lg font-black text-white">عملة المظهر</h3>
                <p className="text-xs text-slate-400">اقلب العملة لمنح تنينك مظهراً أسطورياً جديداً!</p>
              </div>
              <button
                onClick={() => setActiveFlipPackId(null)}
                aria-label="إغلاق"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs bg-slate-900 rounded-xl px-3 py-2 mb-3 border border-slate-800">
              <span className="font-bold text-amber-300">{activeFlipPack.name}</span>
              <span className="font-mono-num text-slate-300">
                جمعت {activeFlipPack.unlockedSkins.length} من {activeFlipPack.totalSkins}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center mb-4">
              <DuckIllustration
                skin={lastFlippedSkin ?? activeFlipPack.possibleSkins[0]}
                level={5}
                showEvolutionEffects={true}
                className="w-36 h-36"
              />
              <div className="mt-2 px-3 py-1 rounded-lg bg-slate-800 text-xs font-extrabold text-amber-300">
                {lastFlippedSkin
                  ? `تم فتح: ${SKIN_CATALOG[lastFlippedSkin].name}!`
                  : 'جرّب مظهراً جديداً لتنينك!'}
              </div>
            </div>

            <button
              disabled={activeFlipPack.count <= 0}
              onClick={() => {
                const skin = onFlipCoin(activeFlipPack.id);
                if (skin) {
                  soundFX.playFlip();
                  setLastFlippedSkin(skin);
                } else {
                  soundFX.playError();
                }
              }}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 ${
                activeFlipPack.count > 0
                  ? 'bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 hover:brightness-105 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>اقلب العملة</span>
              <span className="font-mono-num">(متبقي {activeFlipPack.count})</span>
            </button>
          </div>
        </div>
      )}

      {/* === DUCK WHEEL MODAL (01:42-01:46) === */}
      {wheelOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#181b24] border border-amber-400/40 rounded-3xl p-5 text-center relative">
            <button
              disabled={wheelSpinning}
              onClick={() => setWheelOpen(false)}
              aria-label="إغلاق"
              className={`absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center ${
                wheelSpinning ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white cursor-pointer'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display text-lg font-black text-white mb-1">عجلة التنانين</h3>
            <p className="text-xs text-slate-400 mb-4 font-mono-num">
              ميدالياتك: {state.stats.medals} 🏅 · نجومك: {state.stars} ★
            </p>

            {/* Pointer */}
            <div className="relative w-60 h-60 mx-auto mb-4">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow" />
              <div
                className="w-full h-full rounded-full border-4 border-amber-400 overflow-hidden shadow-2xl transition-transform duration-[1550ms] ease-out relative"
                style={{ transform: `rotate(${wheelAngle}deg)` }}
              >
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {WHEEL_REWARDS_REGISTRY.map((seg, i) => {
                    const startAngle = (i * 360) / WHEEL_REWARDS_REGISTRY.length;
                    const endAngle = ((i + 1) * 360) / WHEEL_REWARDS_REGISTRY.length;
                    const midAngle = (startAngle + endAngle) / 2;
                    const textRot = midAngle > 90 && midAngle < 270 ? midAngle + 180 : midAngle;
                    const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
                    const x1 = 100 + 100 * Math.cos(rad(startAngle));
                    const y1 = 100 + 100 * Math.sin(rad(startAngle));
                    const x2 = 100 + 100 * Math.cos(rad(endAngle));
                    const y2 = 100 + 100 * Math.sin(rad(endAngle));
                    const tx = 100 + 62 * Math.cos(rad(midAngle));
                    const ty = 100 + 62 * Math.sin(rad(midAngle));
                    return (
                      <g key={seg.id}>
                        <path
                          d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`}
                          fill={seg.color}
                          stroke="#0f172a"
                          strokeWidth="2"
                        />
                        <text
                          x={tx}
                          y={ty}
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="800"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textRot}, ${tx}, ${ty})`}
                        >
                          {seg.shortLabel}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx="100" cy="100" r="18" fill="#181b24" stroke="#facc15" strokeWidth="4" />
                </svg>
              </div>
            </div>

            {wheelResult && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold">
                {wheelResult}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                disabled={wheelSpinning}
                onClick={() => triggerWheelSpin(false)}
                className="py-3 rounded-2xl bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 font-black text-xs hover:brightness-105 cursor-pointer"
              >
                تدوير (100 🏅)
              </button>
              <button
                disabled={wheelSpinning}
                onClick={() => triggerWheelSpin(true)}
                className="py-3 rounded-2xl bg-indigo-500 text-white font-black text-xs hover:bg-indigo-400 cursor-pointer"
              >
                عملاقة X10 (100 ★)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === PROMO CODE MODAL (03:03) === */}
      {promoOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#181b24] border border-slate-700 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">تفعيل رمز ترويجي</h3>
              <button
                onClick={() => setPromoOpen(false)}
                aria-label="إغلاق"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder={`مثال: ${PROMO_CODES_REGISTRY[0]?.code ?? 'DRAGON'}`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono-num text-sm focus:outline-none focus:border-amber-400"
            />
            {promoFeedback && (
              <div className="text-xs font-bold text-amber-300">{promoFeedback}</div>
            )}
            <button
              onClick={() => {
                const res = onRedeemPromo(promoInput.trim());
                if (res.ok) soundFX.playChestOpen();
                else soundFX.playError();
                setPromoFeedback(res.message);
              }}
              className="w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-sm cursor-pointer"
            >
              تفعيل الرمز
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
