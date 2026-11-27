import React, { useEffect, useState } from 'react';
import {
  Crown,
  Gift,
  Lock,
  LogOut,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import { CompetitionParticipantEntry, GameState } from '../../types/game';
import {
  ACTIVE_SEASON,
  BATTLE_PASS_LEVELS,
  DAILY_PASS_REWARDS,
  TOURNAMENT_MILESTONES,
  formatTimer,
} from '../../data/gameData';
import {
  CornIcon,
  GodIllustration,
  GoldIcon,
  ItemIcon,
  StarIcon,
} from '../art/DuckArt';
import { soundFX } from '../../utils/sound';
import {
  ECONOMY_LIMITS,
  getBarterEnergyForGoldCost,
  getDailyBurnRatio,
  getPlayerTier,
} from '../../utils/economyEngine';
import { SectionCard } from '../ui/SectionCard';

export type ActiveModal =
  | null
  | 'TOURNAMENT'
  | 'PASS'
  | 'WALLET'
  | 'RANKINGS'
  | 'PAUSE';

interface GameModalsProps {
  modal: ActiveModal;
  passInitialTab?: 'SEASON' | 'DAILY';
  state: GameState;
  competitionParticipants?: CompetitionParticipantEntry[];
  currentUid?: string | null;
  onClose: () => void;
  onClaimTournamentMilestone: (scoreThreshold: number) => void;
  onClaimDailyPassDay: () => void;
  onUnlockBattlePassPremium: () => void;
  onClaimBattlePassReward: (level: number, track: 'FREE' | 'PREMIUM') => void;
  onToggleWalletConnect: () => void;
  onSwapWallet: (direction: 'CORN_TO_STARS' | 'CORN_TO_GOLD') => void;
  onToggleMute: () => void;
  onToggleHaptics: () => void;
  onToggleDragonMotion?: () => void;
  onBackToTitle: () => void;
  isTelegramVerified?: boolean;
}

export const GameModals: React.FC<GameModalsProps> = ({
  modal,
  passInitialTab = 'SEASON',
  state,
  competitionParticipants = [],
  currentUid = null,
  onClose,
  onClaimTournamentMilestone,
  onClaimDailyPassDay,
  onUnlockBattlePassPremium,
  onClaimBattlePassReward,
  onToggleWalletConnect,
  onSwapWallet,
  onToggleMute,
  onToggleHaptics,
  onBackToTitle,
  isTelegramVerified = false,
}) => {
  const [passTab, setPassTab] = useState<'SEASON' | 'DAILY'>(passInitialTab);
  const [walletTab, setWalletTab] = useState<'AMF' | 'GOLD'>('AMF');

  useEffect(() => {
    if (modal === 'PASS') {
      setPassTab(passInitialTab);
    }
  }, [modal, passInitialTab]);

  if (!modal || modal === 'RANKINGS') return null;

  const playerTier = getPlayerTier(state);
  const walletGoldCost = getBarterEnergyForGoldCost(playerTier);
  const barterGoldUsed = state.treasury.barterGoldToday ?? 0;
  const dailyBurnRatio = getDailyBurnRatio(state.treasury);
  const nowTs = Date.now();
  const currentPassLevel = Math.min(ACTIVE_SEASON.passLevels, Math.floor(state.battlePass.xp / 100) + 1);
  const currentPassProgress = state.battlePass.xp % 100;
  const currentDay = Math.min(7, Math.max(1, state.stats.dailyPassDay || 1));
  const dayReward = DAILY_PASS_REWARDS[currentDay - 1] ?? DAILY_PASS_REWARDS[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 1. DIVINE TOURNAMENT MODAL */}
      {modal === 'TOURNAMENT' && (
        <div className="w-full max-w-md bg-[#161923] border border-amber-400/40 rounded-3xl overflow-hidden shadow-2xl max-h-[88vh] flex flex-col">
          <div className="relative bg-gradient-to-b from-purple-900/60 to-[#161923] p-5 text-center border-b border-slate-800">
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/70 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center gap-2 mb-2">
              <GodIllustration godId="bastet" className="w-14 h-14" />
              <GodIllustration godId="dionysus" className="w-16 h-16 -mx-2 z-10" />
              <GodIllustration godId="anubis" className="w-14 h-14" />
            </div>
            <h3 className="font-display text-xl font-black tracking-wide text-white">
              البطولة الكبرى {state.tournament.cycleNumber ? `· الدورة #${state.tournament.cycleNumber}` : ''}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 font-mono-num">
              نقاطك: <strong className="text-amber-300">{state.tournament.score}</strong> · تتجدد خلال{' '}
              {formatTimer(
                state.tournament.resetAt
                  ? Math.max(0, Math.floor((state.tournament.resetAt - nowTs) / 1000))
                  : state.tournament.resetSeconds
              )}
            </p>
          </div>

          <div className="p-4 overflow-y-auto space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {TOURNAMENT_MILESTONES.map((m) => {
                const reached = state.tournament.score >= m.score;
                const claimed = state.tournament.claimedMilestones.includes(m.score);
                return (
                  <div
                    key={m.score}
                    className={`rounded-2xl p-2 border text-center flex flex-col justify-between ${
                      claimed
                        ? 'bg-slate-900/60 border-slate-800 opacity-70'
                        : reached
                          ? 'bg-amber-400/15 border-amber-400'
                          : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-slate-200">{m.labelAr}</div>
                    <div className="font-mono-num text-[11px] font-black text-emerald-400 my-1">{m.score} 🏆</div>
                    <button
                      disabled={!reached || claimed}
                      onClick={() => {
                        soundFX.playChestOpen();
                        onClaimTournamentMilestone(m.score);
                      }}
                      className={`w-full py-1 rounded-lg text-[10px] font-black ${
                        claimed
                          ? 'bg-slate-800 text-slate-500'
                          : reached
                            ? 'bg-amber-400 text-slate-950 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? 'تم الاستلام' : reached ? 'استلام' : 'مقفل'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5">
              {(() => {
                const prizeForRank = (r: number) =>
                  r === 1 ? '600⚡ · 300★' : r === 2 ? '450⚡ · 200★' : r === 3 ? '300⚡ · 150★' : '150⚡ · 80★';
                const rows = competitionParticipants.map((p) => ({
                  id: p.publicId,
                  name: p.name,
                  score: p.score,
                  isYou: Boolean(currentUid && p.publicId === currentUid),
                }));
                if (!rows.some((r) => r.isYou)) {
                  rows.push({
                    id: currentUid || 'self',
                    name: state.username,
                    score: state.tournament.score,
                    isYou: true,
                  });
                }
                const sorted = rows.sort((a, b) => b.score - a.score);
                return (
                  <>
                    {sorted.map((row, idx) => (
                      <div
                        key={row.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
                          row.isYou
                            ? 'bg-amber-400/20 border-amber-400 text-white font-black'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono-num text-amber-400 font-black w-7 shrink-0">#{idx + 1}</span>
                          <span className="truncate">{row.name}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono-num shrink-0">
                          <span className="text-[11px] text-slate-400">{prizeForRank(idx + 1)}</span>
                          <span className="text-emerald-400 font-bold">{row.score}</span>
                        </div>
                      </div>
                    ))}
                    {sorted.length <= 1 && (
                      <div className="text-[11px] text-slate-400 text-center pt-1">
                        الترتيب يعرض اللاعبين الحقيقيين المشاركين في الدورة الحالية فقط.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 2. UNIFIED PASS MODAL (SEASON + DAILY GIFT) */}
      {modal === 'PASS' && (
        <div className="w-full max-w-lg bg-[#161923] border border-amber-400/40 rounded-3xl overflow-hidden shadow-2xl max-h-[88vh] flex flex-col">
          <div className="p-4 bg-gradient-to-b from-amber-500/20 to-[#161923] border-b border-slate-800 relative space-y-3">
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/70 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => {
                  soundFX.playTabSwitch();
                  setPassTab('SEASON');
                }}
                className={`py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${
                  passTab === 'SEASON'
                    ? 'bg-slate-800 text-amber-300 border border-amber-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>تذكرة الموسم</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playTabSwitch();
                  setPassTab('DAILY');
                }}
                className={`py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${
                  passTab === 'DAILY'
                    ? 'bg-slate-800 text-emerald-300 border border-emerald-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>هدية اليوم</span>
              </button>
            </div>

            {passTab === 'SEASON' ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
                    <Crown className="w-7 h-7 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-black text-white">{ACTIVE_SEASON.passTitleAr}</h3>
                    <div className="flex items-center gap-2 text-xs text-amber-300 font-mono-num">
                      <span>المستوى {currentPassLevel} / {ACTIVE_SEASON.passLevels}</span>
                      <span>·</span>
                      <span>{currentPassProgress}/100 XP</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900 mt-1.5 overflow-hidden border border-slate-800">
                      <div className="h-full bg-amber-400" style={{ width: `${currentPassProgress}%` }} />
                    </div>
                  </div>
                </div>

                {!state.battlePass.premiumUnlocked && (
                  <button
                    disabled={state.stars < ACTIVE_SEASON.premiumFallbackStarsCost}
                    onClick={() => {
                      soundFX.playChestOpen();
                      onUnlockBattlePassPremium();
                    }}
                    className={`w-full min-h-[44px] py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 ${
                      state.stars >= ACTIVE_SEASON.premiumFallbackStarsCost
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 cursor-pointer'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    <span>تفعيل الجوائز الملكية بنجوم تيليجرام ({ACTIVE_SEASON.premiumFallbackStarsCost} ★)</span>
                  </button>
                )}
              </>
            ) : (
              <div className="text-center">
                <Gift className="w-9 h-9 text-emerald-400 mx-auto mb-1" />
                <h3 className="font-display text-lg font-black text-white">تذكرة الهدايا اليومية</h3>
                <p className="text-xs text-emerald-300 font-bold mt-0.5">{dayReward.titleAr}</p>
              </div>
            )}
          </div>

          {passTab === 'SEASON' ? (
            <>
              <div className="px-4 pt-3 pb-1 grid grid-cols-12 gap-2 text-center text-[10px] font-black border-b border-slate-800/80 bg-slate-950/60">
                <div className="col-span-2 text-slate-400 py-1.5">المستوى</div>
                <div className="col-span-5 text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg py-1.5">
                  الجوائز المجانية (للجميع)
                </div>
                <div className="col-span-5 text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded-lg py-1.5">
                  الجوائز الملكية (نجوم تيليجرام)
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-2">
                {BATTLE_PASS_LEVELS.map((lv) => {
                  const unlocked = currentPassLevel >= lv.level;
                  const freeClaimed = state.battlePass.claimedFree.includes(lv.level);
                  const premClaimed = state.battlePass.claimedPremium.includes(lv.level);

                  return (
                    <div
                      key={lv.level}
                      className={`rounded-2xl p-2.5 border grid grid-cols-12 items-center gap-2 ${
                        unlocked ? 'bg-slate-900/90 border-slate-700' : 'bg-slate-950/60 border-slate-800/60 opacity-70'
                      }`}
                    >
                      <div className="col-span-2 text-center font-mono-num font-black text-xs text-amber-400">
                        LV {lv.level}
                      </div>

                      <button
                        disabled={!unlocked || freeClaimed}
                        onClick={() => {
                          soundFX.playClaim();
                          onClaimBattlePassReward(lv.level, 'FREE');
                        }}
                        className={`col-span-5 py-2 px-2 rounded-xl text-[11px] font-extrabold border ${
                          freeClaimed
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : unlocked
                              ? 'bg-slate-800 border-amber-400/50 text-white hover:bg-slate-700 cursor-pointer'
                              : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {freeClaimed ? '✓ مجاني' : lv.freeLabel}
                      </button>

                      <button
                        disabled={!unlocked || !state.battlePass.premiumUnlocked || premClaimed}
                        onClick={() => {
                          soundFX.playChestOpen();
                          onClaimBattlePassReward(lv.level, 'PREMIUM');
                        }}
                        className={`col-span-5 py-2 px-2 rounded-xl text-[11px] font-extrabold border flex items-center justify-center gap-1 ${
                          premClaimed
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : unlocked && state.battlePass.premiumUnlocked
                              ? 'bg-amber-400 text-slate-950 border-amber-300 cursor-pointer'
                              : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {!state.battlePass.premiumUnlocked && <Lock className="w-3 h-3" />}
                        <span>{premClaimed ? '✓ ملكي' : lv.premiumLabel}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-7 gap-1 font-mono-num">
                {DAILY_PASS_REWARDS.map((d) => {
                  const isToday = d.day === currentDay;
                  const isPast = d.day < currentDay || (isToday && state.stats.dailyPassClaimedToday);
                  return (
                    <div
                      key={d.day}
                      className={`rounded-xl py-1.5 text-center border text-[10px] font-black ${
                        isToday
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : isPast
                            ? 'bg-slate-900 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>ي{d.day}</div>
                      <div className="text-[9px]">
                        {isPast ? '✓' : `${d.reward.corn ?? 0}🍖`}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 text-center">
                  <ItemIcon item={dayReward.primaryItem} className="w-12 h-12 mx-auto" />
                  <div className="text-xs font-bold text-white mt-1">{dayReward.primaryLabelAr}</div>
                </div>
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 text-center">
                  <ItemIcon item={dayReward.secondaryItem} className="w-12 h-12 mx-auto" />
                  <div className="text-xs font-bold text-white mt-1">
                    {dayReward.reward.corn ?? 0} طعام تنين · {dayReward.reward.duckGold ?? 0}💎
                  </div>
                  <div className="text-[10px] text-slate-400">{dayReward.secondaryLabelAr}</div>
                </div>
              </div>

              <button
                disabled={state.stats.dailyPassClaimedToday}
                onClick={() => {
                  soundFX.playChestOpen();
                  onClaimDailyPassDay();
                }}
                className={`w-full min-h-[46px] py-3.5 rounded-2xl font-black text-sm ${
                  state.stats.dailyPassClaimedToday
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-emerald-400 text-slate-950 hover:brightness-105 cursor-pointer'
                }`}
              >
                {state.stats.dailyPassClaimedToday
                  ? `تم استلام مكافأة اليوم ${currentDay} ✓`
                  : `استلام حزمة اليوم ${currentDay}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. WALLET */}
      {modal === 'WALLET' && (
        <div className="w-full max-w-md bg-[#161923] border border-slate-700 rounded-3xl p-5 space-y-4 relative">
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/70 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-center text-lg font-black text-white">صندوق AMF والمحفظة</h3>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {(['AMF', 'GOLD'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  soundFX.playTabSwitch();
                  setWalletTab(t);
                }}
                className={`min-h-[40px] py-1.5 rounded-lg font-display text-xs font-black cursor-pointer ${
                  walletTab === t ? 'bg-slate-800 text-amber-300' : 'text-slate-300'
                }`}
              >
                {t === 'AMF' ? 'رصيد AMF' : 'ذهب التنانين'}
              </button>
            ))}
          </div>

          <div className="text-center py-2">
            <div className="font-mono-num text-3xl font-black text-white">
              {walletTab === 'AMF' ? state.dmdTotal.toFixed(2) : state.duckGold.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono-num">
              {walletTab === 'AMF'
                ? `خزانة التبديل: ${state.customizedVault?.length ?? 0} تنين ★10`
                : 'ذهب التنانين للبركات ومواهب السرب'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center font-mono-num">
            <div className="rounded-xl bg-slate-900 border border-emerald-500/30 p-2">
              <div className="text-[10px] text-slate-400">خزانة المجتمع (50%)</div>
              <div className="text-sm font-black text-emerald-400">${state.treasury.reserveUsd.toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-2">
              <div className="text-[10px] text-slate-400">التشغيل (50%)</div>
              <div className="text-sm font-black text-sky-300">${state.treasury.opsUsd.toFixed(2)}</div>
            </div>
          </div>

          <SectionCard compact className="space-y-1.5 font-mono-num bg-slate-900/90">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-300">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>توازن طعام التنين اليومي</span>
              </span>
              <span>الحرق: {dailyBurnRatio}%</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="rounded-lg bg-slate-950 p-1.5 border border-slate-800">
                <div className="text-slate-400">المكتسب</div>
                <div className="font-black text-emerald-400">
                  +{(state.treasury.energyEarnedToday ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg bg-slate-950 p-1.5 border border-slate-800">
                <div className="text-slate-400">المستهلك</div>
                <div className="font-black text-rose-400">
                  -{(state.treasury.energyBurnedToday ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg bg-slate-950 p-1.5 border border-slate-800">
                <div className="text-slate-400">سعة الخزانة</div>
                <div className="font-black text-emerald-300">مفتوحة</div>
              </div>
            </div>
          </SectionCard>

          <button
            onClick={() => {
              soundFX.playTabSwitch();
              onToggleWalletConnect();
            }}
            className={`w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer ${
              state.wallet.connected
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                : 'bg-slate-100 text-slate-950'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="font-mono-num">
              {state.wallet.connected ? `متصل: ${state.wallet.address}` : 'ربط المحفظة'}
            </span>
          </button>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>مقايضة طعام التنين (الرتبة {playerTier}):</span>
              <span className="font-mono-num text-[11px] text-amber-300">النجوم للشحن والأحداث</span>
            </div>

            <button
              disabled={barterGoldUsed >= ECONOMY_LIMITS.MAX_DAILY_BARTER_GOLD || state.corn < walletGoldCost}
              onClick={() => {
                soundFX.playClaim();
                onSwapWallet('CORN_TO_GOLD');
              }}
              className={`w-full min-h-[44px] py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold border ${
                barterGoldUsed < ECONOMY_LIMITS.MAX_DAILY_BARTER_GOLD && state.corn >= walletGoldCost
                  ? 'bg-slate-900 border-slate-700 hover:border-amber-400 text-white cursor-pointer'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono-num">
                <CornIcon className="w-4 h-4" /> {walletGoldCost.toLocaleString()} طعام تنين
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-mono-num">
                <span>
                  {barterGoldUsed >= ECONOMY_LIMITS.MAX_DAILY_BARTER_GOLD
                    ? 'اكتمل'
                    : `← 12 ذهب (${barterGoldUsed}/${ECONOMY_LIMITS.MAX_DAILY_BARTER_GOLD})`}
                </span>
                <GoldIcon className="w-4 h-4" />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 4. PAUSE / SETTINGS MODAL */}
      {modal === 'PAUSE' && (() => {
        const soundOn = !state.muted;
        const hapticsOn = state.hapticsEnabled ?? true;
        return (
          <div className="w-full max-w-sm bg-[#161923] border border-slate-700 rounded-3xl p-5 sm:p-6 space-y-4 text-center relative">
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="absolute top-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/70 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <Sparkles className="w-9 h-9 text-amber-400 mx-auto" />
            <h3 className="font-display text-xl font-black text-white">الإعدادات والأداء</h3>
            <div className="space-y-2.5 text-right">
              <button
                type="button"
                onClick={onToggleMute}
                className="w-full px-3.5 py-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-amber-400 flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {soundOn ? (
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white">المؤثرات الصوتية</div>
                    <div className="text-[10px] text-slate-400">زئير التنين وأصوات النقر والمكافآت</div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 ${
                    soundOn ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {soundOn ? 'مُفعّل' : 'مُتوقف'}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleHaptics}
                className="w-full px-3.5 py-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-amber-400 flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Smartphone className={`w-4 h-4 shrink-0 ${hapticsOn ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white">الاهتزاز</div>
                    <div className="text-[10px] text-slate-400">اهتزاز تفاعلي عند الإطعام والانتصارات</div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 ${
                    hapticsOn ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {hapticsOn ? 'مُفعّل' : 'مُتوقف'}
                </span>
              </button>

              <div className="rounded-2xl bg-slate-900 border border-sky-500/30 p-3 flex items-center justify-between text-xs">
                <span className="font-black text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>حالة الحساب والربط</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                    isTelegramVerified
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {isTelegramVerified ? 'تيليجرام موثق ✓' : 'جلسة محلية'}
                </span>
              </div>

              <button
                onClick={onBackToTitle}
                className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 hover:border-slate-500 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>العودة لشاشة البداية</span>
              </button>
              <div className="w-full py-2.5 px-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>بياناتك وتقدمك محفوظة تلقائياً ✓</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
