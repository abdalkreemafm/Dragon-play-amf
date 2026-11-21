import React, { useEffect, useState } from 'react';
import {
  Check,
  Crown,
  Flame,
  Gift,
  Hammer,
  Lock,
  LogOut,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  TrendingUp,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import { GameState, MainTab, SquadTalentKey } from '../../types/game';
import { BATTLE_PASS_LEVELS, formatTimer } from '../../data/gameData';
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
  RELIC_FORGE_CATALOG,
  RelicForgeOffer,
  SQUAD_TALENT_CATALOG,
  getBarterEnergyForGoldCost,
  getBarterEnergyForStarsCost,
  getDailyBurnRatio,
  getEnergySoftCap,
  getPlayerTier,
  getSquadTalentCost,
  getTraderDealStarCost,
} from '../../utils/economyEngine';

export type ActiveModal =
  | null
  | 'TOURNAMENT'
  | 'TRADER'
  | 'DAILY_TASKS'
  | 'DAILY_PASS'
  | 'DUCKER_PASS'
  | 'PACK'
  | 'WALLET'
  | 'PAUSE';

interface GameModalsProps {
  modal: ActiveModal;
  packInitialSubTab?: 'CHAT' | 'TALENTS' | 'FORGE';
  state: GameState;
  onClose: () => void;
  onSwitchTab: (tab: MainTab) => void;
  onClaimTournamentMilestone: (milestone: number, rewardType: 'eggs' | 'medals' | 'gold', amount: number) => void;
  onBuyTraderDeal: () => void;
  onClaimDailyTask: (taskId: string) => void;
  onClaimDailyLevelReward: (rewardId: number, corn: number, eggs: number) => void;
  onClaimDailyPassDay: () => void;
  onUnlockBattlePassPremium: () => void;
  onClaimBattlePassReward: (level: number, track: 'FREE' | 'PREMIUM') => void;
  onJoinPack: () => void;
  onContributePack: (amount: number) => void;
  onSendPackMessage: (text: string) => void;
  onUpgradeSquadTalent: (talentKey: SquadTalentKey) => void;
  onForgeRelic: (offerId: RelicForgeOffer['id']) => void;
  onToggleWalletConnect: () => void;
  onSwapWallet: (direction: 'CORN_TO_STARS' | 'CORN_TO_GOLD') => void;
  onToggleMute: () => void;
  onBackToTitle: () => void;
  onResetGame: () => void;
}

const TOURNAMENT_MILESTONES = [
  { threshold: 40, label: '3 بيضات', type: 'eggs' as const, amount: 3 },
  { threshold: 100, label: '18 ميدالية', type: 'medals' as const, amount: 18 },
  { threshold: 250, label: '8 ذهب', type: 'gold' as const, amount: 8 },
  { threshold: 400, label: '32 ميدالية', type: 'medals' as const, amount: 32 },
];

export const GameModals: React.FC<GameModalsProps> = ({
  modal,
  packInitialSubTab = 'CHAT',
  state,
  onClose,
  onSwitchTab,
  onClaimTournamentMilestone,
  onBuyTraderDeal,
  onClaimDailyTask,
  onClaimDailyLevelReward,
  onClaimDailyPassDay,
  onUnlockBattlePassPremium,
  onClaimBattlePassReward,
  onJoinPack,
  onContributePack,
  onSendPackMessage,
  onUpgradeSquadTalent,
  onForgeRelic,
  onToggleWalletConnect,
  onSwapWallet,
  onToggleMute,
  onBackToTitle,
  onResetGame,
}) => {
  const [packMsgInput, setPackMsgInput] = useState('');
  const [packSubTab, setPackSubTab] = useState<'CHAT' | 'TALENTS' | 'FORGE'>(packInitialSubTab);
  const [walletTab, setWalletTab] = useState<'DMD' | 'GOLD'>('DMD');

  useEffect(() => {
    if (modal === 'PACK') {
      setPackSubTab(packInitialSubTab);
    }
  }, [modal, packInitialSubTab]);

  if (!modal) return null;

  const playerTier = getPlayerTier(state);
  const traderStarCost = getTraderDealStarCost(playerTier);
  const walletStarsCost = getBarterEnergyForStarsCost(playerTier);
  const walletGoldCost = getBarterEnergyForGoldCost(playerTier);
  const barterStarsUsed = state.treasury.barterStarsToday ?? 0;
  const barterGoldUsed = state.treasury.barterGoldToday ?? 0;
  const softCap = getEnergySoftCap(playerTier);
  const dailyBurnRatio = getDailyBurnRatio(state.treasury);
  const talents = state.pack.talents ?? { fury: 0, carapace: 0, incubation: 0, prestige: 0 };
  const buffs = state.activeBuffs ?? { duelFuryUntil: 0, critEdgeUntil: 0, eggSurgeUntil: 0 };
  const nowTs = Date.now();
  const currentPassLevel = Math.min(15, Math.floor(state.battlePass.xp / 100) + 1);
  const currentPassProgress = state.battlePass.xp % 100;

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
            <button onClick={onClose} className="absolute top-4 left-4 text-slate-300 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-center gap-2 mb-2">
              <GodIllustration godId="bastet" className="w-14 h-14" />
              <GodIllustration godId="dionysus" className="w-16 h-16 -mx-2 z-10" />
              <GodIllustration godId="anubis" className="w-14 h-14" />
            </div>
            <h3 className="font-display text-xl font-black tracking-wide text-white">البطولة الكبرى</h3>
            <p className="text-xs text-slate-300 mt-0.5 font-mono-num">
              نقاطك: <strong className="text-amber-300">{state.tournament.score}</strong> · ينتهي خلال{' '}
              {formatTimer(state.tournament.resetSeconds)}
            </p>
          </div>

          <div className="p-4 overflow-y-auto space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {TOURNAMENT_MILESTONES.map((m) => {
                const reached = state.tournament.score >= m.threshold;
                const claimed = state.tournament.claimedMilestones.includes(m.threshold);
                return (
                  <div
                    key={m.threshold}
                    className={`rounded-2xl p-2 border text-center flex flex-col justify-between ${
                      claimed
                        ? 'bg-slate-900/60 border-slate-800 opacity-70'
                        : reached
                          ? 'bg-amber-400/15 border-amber-400'
                          : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-slate-200">{m.label}</div>
                    <div className="font-mono-num text-[11px] font-black text-emerald-400 my-1">{m.threshold} 🏆</div>
                    <button
                      disabled={!reached || claimed}
                      onClick={() => {
                        soundFX.playChestOpen();
                        onClaimTournamentMilestone(m.threshold, m.type, m.amount);
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
              {[
                { rank: 1, name: 'PLAYER6379241', score: 1360, prize: '600⚡ · 300★' },
                { rank: 2, name: 'PLAYER_MAXIM', score: 1090, prize: '450⚡ · 200★' },
                { rank: 3, name: 'PLAYER6642278', score: 820, prize: '300⚡ · 150★' },
                { rank: 4, name: 'DARK_DRAGON', score: 631, prize: '200⚡ · 120★' },
                { rank: 5, name: 'IGNIS_TAMER', score: 565, prize: '150⚡ · 100★' },
                {
                  rank: Math.max(6, 55 - Math.floor(state.tournament.score / 10)),
                  name: state.username,
                  score: state.tournament.score,
                  prize: 'مكافأتك الحالية',
                  isYou: true,
                },
              ].map((row) => (
                <div
                  key={row.name}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
                    row.isYou
                      ? 'bg-amber-400/20 border-amber-400 text-white font-black'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num text-amber-400 font-black w-7">#{row.rank}</span>
                    <span>{row.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono-num">
                    <span className="text-[11px] text-slate-400">{row.prize}</span>
                    <span className="text-emerald-400 font-bold">{row.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. TRADER MODAL */}
      {modal === 'TRADER' && (
        <div className="w-full max-w-md bg-[#161923] border border-amber-400/40 rounded-3xl overflow-hidden shadow-2xl">
          <div className="relative bg-gradient-to-b from-indigo-950 via-purple-950/60 to-[#161923] p-5 text-center border-b border-slate-800">
            <button onClick={onClose} className="absolute top-4 left-4 text-slate-300 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display text-2xl font-black text-white">التاجر المتنقل</h3>
            <p className="text-xs text-slate-300 mb-3">تاجر ما لا تحتاجه بما تحتاجه</p>
            <div className="flex justify-center">
              <GodIllustration godId="trader" className="w-24 h-24" />
            </div>
          </div>

          <div className="p-5 space-y-4 text-center">
            <div className="text-xs font-bold text-slate-400 font-mono-num">صفقة {state.stats.traderDeals}/100</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 flex flex-col items-center">
                <ItemIcon item="cornucopia" className="w-10 h-10" />
                <span className="text-[11px] font-bold text-slate-200 mt-1">سلة الخيرات</span>
              </div>
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 flex flex-col items-center">
                <ItemIcon item="chalice" className="w-10 h-10" />
                <span className="text-[11px] font-bold text-slate-200 mt-1">الكأس الذهبي</span>
              </div>
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 flex flex-col items-center">
                <ItemIcon item="egg_3" className="w-10 h-10" />
                <span className="text-[11px] font-bold text-slate-200 mt-1">بيضتان [3] و [2]</span>
              </div>
            </div>

            <div>
              <span className="inline-block mb-1.5 px-2.5 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-black">
                تسعير الرتبة {playerTier} · وفر 25%
              </span>
              <button
                disabled={state.stars < traderStarCost}
                onClick={() => {
                  soundFX.playChestOpen();
                  onBuyTraderDeal();
                }}
                className={`w-full min-h-[48px] py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 ${
                  state.stars >= traderStarCost
                    ? 'bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 hover:brightness-105 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <StarIcon className="w-5 h-5" />
                <span className="font-mono-num">
                  {traderStarCost} ★ (بدلاً من {Math.round(traderStarCost * 1.35)})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DAILY TASKS & LEVEL 8 DRAWER */}
      {modal === 'DAILY_TASKS' && (
        <div className="w-full max-w-md bg-[#161923] border border-sky-500/30 rounded-3xl overflow-hidden shadow-2xl max-h-[88vh] flex flex-col">
          <div className="p-5 bg-gradient-to-b from-sky-900/30 to-[#161923] border-b border-slate-800 text-center relative">
            <button onClick={onClose} className="absolute top-4 left-4 text-slate-300 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display text-xl font-black text-white">المهام اليومية</h3>
            <p className="text-xs text-slate-400">أكمل المهام لكسب النجوم ★ وطاقة إطعام التنانين ⚡</p>
          </div>

          <div className="p-4 overflow-y-auto space-y-3">
            {state.dailyTasks.map((t) => {
              const done = t.progress >= t.target;
              return (
                <div
                  key={t.id}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold text-white truncate">{t.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-rose-500"
                          style={{ width: `${Math.min(100, (t.progress / t.target) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono-num text-[10px] text-amber-300 font-bold">
                        +{t.rewardStars} ★ · +{t.rewardEnergy} ⚡
                      </span>
                    </div>
                  </div>
                  {t.claimed ? (
                    <span className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                      <Check className="w-5 h-5" />
                    </span>
                  ) : done ? (
                    <button
                      onClick={() => {
                        soundFX.playClaim();
                        onClaimDailyTask(t.id);
                      }}
                      className="px-3 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer shrink-0"
                    >
                      استلام
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (t.actionTab) onSwitchTab(t.actionTab);
                        onClose();
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold text-[11px] hover:bg-slate-700 cursor-pointer shrink-0"
                    >
                      {t.actionLabel}
                    </button>
                  )}
                </div>
              );
            })}

            {(() => {
              const completedTasksCount = state.dailyTasks.filter((t) => t.claimed).length;
              return (
                <div className="rounded-2xl bg-[#1a1f2e] border border-amber-400/30 p-4 text-center space-y-2.5">
                  <div className="font-display text-sm font-black text-amber-300 font-mono-num">
                    الرتبة {playerTier} · المهام المنجزة اليوم: {completedTasksCount}/5
                  </div>
                  <div className="text-[11px] font-mono-num text-slate-300">
                    رصيد DMD: {state.dmdTotal.toFixed(3)} · أكمل مهمتين أو بلُغ 0.50 DMD لفتح المكافآت
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      {
                        id: 1,
                        title: '2 بيضات تنين',
                        corn: 0,
                        eggs: 2,
                        unlocked: completedTasksCount >= 2,
                        lockLabel: 'أكمل مهمتين',
                      },
                      {
                        id: 2,
                        title: '280 طاقة ⚡',
                        corn: 280,
                        eggs: 0,
                        unlocked: state.dmdTotal >= 0.5 || playerTier >= 3,
                        lockLabel: '0.50 DMD أو رتبة 3',
                      },
                    ].map((rw) => {
                      const claimed = state.claimedDailyLevelRewards.includes(rw.id);
                      return (
                        <button
                          key={rw.id}
                          disabled={claimed || !rw.unlocked}
                          onClick={() => {
                            soundFX.playChestOpen();
                            onClaimDailyLevelReward(rw.id, rw.corn, rw.eggs);
                          }}
                          className={`min-h-[44px] py-2.5 px-2 rounded-xl font-black text-xs ${
                            claimed
                              ? 'bg-slate-800 text-emerald-400'
                              : rw.unlocked
                                ? 'bg-amber-400 text-slate-950 cursor-pointer hover:brightness-105'
                                : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {claimed ? 'تم الاستلام ✓' : rw.unlocked ? `استلام ${rw.title}` : rw.lockLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 4. DAILY PASS */}
      {modal === 'DAILY_PASS' && (
        <div className="w-full max-w-md bg-[#161923] border border-emerald-500/40 rounded-3xl p-5 space-y-4 relative">
          <button onClick={onClose} className="absolute top-4 left-4 text-slate-300 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <Gift className="w-10 h-10 text-emerald-400 mx-auto mb-1" />
            <h3 className="font-display text-xl font-black text-white">تذكرة الهدايا اليومية</h3>
            <p className="text-xs text-slate-400">مكافآت 7 أيام متتالية + معززات دمج</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 text-center">
              <ItemIcon item="cornucopia" className="w-12 h-12 mx-auto" />
              <div className="text-xs font-bold text-white mt-1">سلة الخيرات + معززات</div>
            </div>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 text-center">
              <ItemIcon item="egg_4" className="w-12 h-12 mx-auto" />
              <div className="text-xs font-bold text-white mt-1">320 طاقة + 3 ★</div>
            </div>
          </div>
          <button
            disabled={state.stats.dailyPassClaimedToday}
            onClick={() => {
              soundFX.playChestOpen();
              onClaimDailyPassDay();
            }}
            className={`w-full py-3.5 rounded-2xl font-black text-sm ${
              state.stats.dailyPassClaimedToday
                ? 'bg-slate-800 text-slate-400'
                : 'bg-emerald-400 text-slate-950 hover:brightness-105 cursor-pointer'
            }`}
          >
            {state.stats.dailyPassClaimedToday
              ? `تم استلام مكافأة اليوم ${state.stats.dailyPassDay}`
              : `استلام حزمة اليوم ${state.stats.dailyPassDay}`}
          </button>
        </div>
      )}

      {/* 5. 15-LEVEL DUCKER BATTLE PASS */}
      {modal === 'DUCKER_PASS' && (
        <div className="w-full max-w-lg bg-[#161923] border border-amber-400/40 rounded-3xl overflow-hidden shadow-2xl max-h-[88vh] flex flex-col">
          <div className="p-4 bg-gradient-to-b from-amber-500/20 to-[#161923] border-b border-slate-800 relative">
            <button onClick={onClose} className="absolute top-4 left-4 text-slate-300 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
                <Crown className="w-7 h-7 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-black text-white">تذكرة الموسم · الموسم 1</h3>
                <div className="flex items-center gap-2 text-xs text-amber-300 font-mono-num">
                  <span>المستوى {currentPassLevel} / 15</span>
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
                disabled={state.stars < 60}
                onClick={() => {
                  soundFX.playChestOpen();
                  onUnlockBattlePassPremium();
                }}
                className={`mt-3 w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 ${
                  state.stars >= 60
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 cursor-pointer'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>تفعيل المسار الملكي PREMIUM (60 ★)</span>
              </button>
            )}
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

                  {/* Free Track */}
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

                  {/* Premium Track */}
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
        </div>
      )}

      {/* 6. PACK / السرب ومواهب الترقية وصقل التعاويذ */}
      {modal === 'PACK' && (
        <div className="w-full max-w-lg bg-[#161923] border border-slate-700 rounded-3xl p-5 max-h-[88vh] overflow-y-auto space-y-4 relative">
          <button onClick={onClose} className="absolute top-4 left-4 text-slate-300 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <div className="text-center pt-1">
            <div className="inline-flex items-center gap-2 font-display text-xl font-black text-white">
              <Shield className="w-6 h-6 text-rose-400" />
              <span>{state.pack.packName}</span>
            </div>
            <div className="text-xs text-slate-300 font-mono-num mt-1">
              القوة: {state.pack.power} · الأعضاء: {state.pack.members} · الخزينة: {state.pack.treasuryCorn.toLocaleString()} طاقة
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800">
            {([
              { id: 'CHAT', label: 'السرب والدردشة' },
              { id: 'TALENTS', label: 'مواهب السرب' },
              { id: 'FORGE', label: 'صقل التعاويذ' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  soundFX.playTabSwitch();
                  setPackSubTab(tab.id);
                }}
                className={`min-h-[40px] py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  packSubTab === tab.id ? 'bg-slate-800 text-amber-300 border border-slate-700' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {packSubTab === 'CHAT' && (
            !state.pack.joined ? (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    soundFX.playGodConfirm();
                    onJoinPack();
                  }}
                  className="w-full min-h-[48px] py-3.5 rounded-2xl bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 font-black text-sm cursor-pointer font-mono-num"
                >
                  الانضمام إلى {state.pack.packName} (+240 طاقة و +3 ★)
                </button>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">• نشاط السرب يمنحك طاقة ومكافآت يومية</div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">• مواهب السرب تفتح ترقيات دائمة لكل التنانين</div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">• دردشة خاصة للتنسيق بين مروّضي التنانين</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  disabled={state.corn < 500}
                  onClick={() => {
                    soundFX.playClaim();
                    onContributePack(500);
                  }}
                  className={`w-full min-h-[44px] py-2.5 rounded-xl font-black text-xs font-mono-num ${
                    state.corn >= 500 ? 'bg-emerald-500 text-slate-950 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  تبرع بـ 500 طاقة لرفع قوة السرب (+8 قوة و +2 ★)
                </button>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2 max-h-44 overflow-y-auto">
                  {state.pack.messages.map((m) => (
                    <div key={m.id} className="text-xs">
                      <span className="font-bold text-amber-400">{m.sender}: </span>
                      <span className="text-slate-200">{m.text}</span>
                      <span className="text-[10px] text-slate-500 mr-2 font-mono-num">{m.time}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={packMsgInput}
                    onChange={(e) => setPackMsgInput(e.target.value)}
                    placeholder="اكتب رسالة للسرب..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => {
                      if (!packMsgInput.trim()) return;
                      soundFX.playTapFeed();
                      onSendPackMessage(packMsgInput.trim());
                      setPackMsgInput('');
                    }}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-amber-400 text-slate-950 cursor-pointer flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          )}

          {packSubTab === 'TALENTS' && (
            <div className="space-y-2.5">
              <div className="text-[11px] text-slate-300 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
                ترقيات دائمة تشمل كل تنانين السرب وتستهلك الطاقة والنجوم والذهب والميداليات لمنع تكدس الموارد.
              </div>
              {SQUAD_TALENT_CATALOG.map((meta) => {
                const rank = talents[meta.key] ?? 0;
                const maxed = rank >= ECONOMY_LIMITS.MAX_TALENT_RANK;
                const cost = getSquadTalentCost(meta.key, rank, playerTier);
                const canAfford =
                  !maxed &&
                  state.corn >= cost.corn &&
                  state.stars >= cost.stars &&
                  state.duckGold >= cost.gold &&
                  state.stats.medals >= cost.medals;

                return (
                  <div
                    key={meta.key}
                    className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 text-xs font-black text-white">
                        <span>{meta.nameAr}</span>
                        <span className="font-mono-num text-[11px] text-amber-300">
                          {rank}/{ECONOMY_LIMITS.MAX_TALENT_RANK}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-bold">{meta.effectPerRankAr}</div>
                      <div className="text-[10px] text-slate-400">{meta.descAr}</div>
                      {!maxed && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono-num text-[10px] font-bold">
                          {cost.corn > 0 && (
                            <span className={state.corn >= cost.corn ? 'text-amber-300' : 'text-rose-400'}>
                              {cost.corn.toLocaleString()}⚡
                            </span>
                          )}
                          {cost.stars > 0 && (
                            <span className={state.stars >= cost.stars ? 'text-indigo-300' : 'text-rose-400'}>
                              {cost.stars}★
                            </span>
                          )}
                          {cost.gold > 0 && (
                            <span className={state.duckGold >= cost.gold ? 'text-amber-200' : 'text-rose-400'}>
                              {cost.gold} ذهب
                            </span>
                          )}
                          {cost.medals > 0 && (
                            <span className={state.stats.medals >= cost.medals ? 'text-emerald-300' : 'text-rose-400'}>
                              {cost.medals} ميدالية
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() => onUpgradeSquadTalent(meta.key)}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black shrink-0 ${
                        maxed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : canAfford
                            ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {maxed ? 'مكتمل ✓' : 'ترقية'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {packSubTab === 'FORGE' && (
            <div className="space-y-2.5">
              <div className="text-[11px] text-slate-300 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span>اصهر الذهب والميداليات والطاقة لصنع تعاويذ مؤقتة (24س) ومعززات دمج للمغامرات.</span>
              </div>
              {RELIC_FORGE_CATALOG.map((offer) => {
                const until =
                  offer.id === 'duel_fury'
                    ? buffs.duelFuryUntil
                    : offer.id === 'crit_edge'
                      ? buffs.critEdgeUntil
                      : offer.id === 'egg_surge'
                        ? buffs.eggSurgeUntil
                        : 0;
                const hoursLeft = until > nowTs ? Math.ceil((until - nowTs) / 3600000) : 0;
                const canAfford =
                  state.corn >= offer.cornCost &&
                  state.duckGold >= offer.goldCost &&
                  state.stats.medals >= offer.medalsCost &&
                  state.stars >= offer.starsCost;

                return (
                  <div
                    key={offer.id}
                    className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 text-xs font-black text-white">
                        <Hammer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{offer.nameAr}</span>
                        <span className="font-mono-num text-[10px] text-sky-300 shrink-0">
                          {hoursLeft > 0 ? `نشط (${hoursLeft}س)` : offer.durationLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{offer.descAr}</div>
                      <div className="flex flex-wrap items-center gap-2 pt-1 font-mono-num text-[10px] font-bold">
                        {offer.cornCost > 0 && (
                          <span className={state.corn >= offer.cornCost ? 'text-amber-300' : 'text-rose-400'}>
                            {offer.cornCost}⚡
                          </span>
                        )}
                        {offer.goldCost > 0 && (
                          <span className={state.duckGold >= offer.goldCost ? 'text-amber-200' : 'text-rose-400'}>
                            {offer.goldCost} ذهب
                          </span>
                        )}
                        {offer.medalsCost > 0 && (
                          <span className={state.stats.medals >= offer.medalsCost ? 'text-emerald-300' : 'text-rose-400'}>
                            {offer.medalsCost} ميدالية
                          </span>
                        )}
                        {offer.starsCost > 0 && (
                          <span className={state.stars >= offer.starsCost ? 'text-indigo-300' : 'text-rose-400'}>
                            {offer.starsCost}★
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() => onForgeRelic(offer.id)}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black shrink-0 ${
                        canAfford
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      صقل
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. WALLET */}
      {modal === 'WALLET' && (
        <div className="w-full max-w-md bg-[#161923] border border-slate-700 rounded-3xl p-5 space-y-4 relative">
          <button onClick={onClose} className="absolute top-4 left-4 text-slate-300 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-center text-lg font-black text-white">صندوق DMD والمحفظة</h3>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {(['DMD', 'GOLD'] as const).map((t) => (
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
                {t === 'DMD' ? 'رصيد DMD' : 'ذهب التنانين'}
              </button>
            ))}
          </div>

          <div className="text-center py-2">
            <div className="font-mono-num text-3xl font-black text-white">
              {walletTab === 'DMD' ? state.dmdTotal.toFixed(3) : state.duckGold.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {walletTab === 'DMD'
                ? 'إجمالي عملة DMD المكتسبة من تنانين LVL 5 + ★'
                : 'رصيد ذهب التنانين لتفعيل البركات ومواهب السرب'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center font-mono-num">
            <div className="rounded-xl bg-slate-900 border border-emerald-500/30 p-2">
              <div className="text-[10px] text-slate-400">صندوق دعم DMD (50%)</div>
              <div className="text-sm font-black text-emerald-400">${state.treasury.reserveUsd.toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-2">
              <div className="text-[10px] text-slate-400">التشغيل والتطوير (50%)</div>
              <div className="text-sm font-black text-sky-300">${state.treasury.opsUsd.toFixed(2)}</div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 space-y-1.5 font-mono-num">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-300">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>مؤشر التوازن الاقتصادي اليومي</span>
              </span>
              <span>نسبة الحرق: {dailyBurnRatio}%</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              <div className="rounded-lg bg-slate-950 p-1.5 border border-slate-800">
                <div className="text-slate-400">المكتسب اليوم</div>
                <div className="font-black text-emerald-400">
                  +{(state.treasury.energyEarnedToday ?? 0).toLocaleString()}⚡
                </div>
              </div>
              <div className="rounded-lg bg-slate-950 p-1.5 border border-slate-800">
                <div className="text-slate-400">المستهلك اليوم</div>
                <div className="font-black text-rose-400">
                  -{(state.treasury.energyBurnedToday ?? 0).toLocaleString()}⚡
                </div>
              </div>
              <div className="rounded-lg bg-slate-950 p-1.5 border border-slate-800">
                <div className="text-slate-400">سقف الخزانة</div>
                <div className="font-black text-amber-300">{softCap.toLocaleString()}⚡</div>
              </div>
            </div>
          </div>

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
              <span>تحويل موارد اللعب (الرتبة {playerTier}):</span>
              <span className="font-mono-num text-[11px] text-amber-300">لا يشمل DMD</span>
            </div>
            <button
              disabled={barterStarsUsed >= ECONOMY_LIMITS.MAX_DAILY_BARTER_STARS || state.corn < walletStarsCost}
              onClick={() => {
                soundFX.playClaim();
                onSwapWallet('CORN_TO_STARS');
              }}
              className={`w-full min-h-[44px] py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold border ${
                barterStarsUsed < ECONOMY_LIMITS.MAX_DAILY_BARTER_STARS && state.corn >= walletStarsCost
                  ? 'bg-slate-900 border-slate-700 hover:border-amber-400 text-white cursor-pointer'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono-num">
                <CornIcon className="w-4 h-4" /> {walletStarsCost.toLocaleString()} طاقة
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400 font-mono-num">
                <span>
                  {barterStarsUsed >= ECONOMY_LIMITS.MAX_DAILY_BARTER_STARS
                    ? 'اكتمل'
                    : `← 10 ★ (${barterStarsUsed}/${ECONOMY_LIMITS.MAX_DAILY_BARTER_STARS})`}
                </span>
                <StarIcon className="w-4 h-4" />
              </span>
            </button>

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
                <CornIcon className="w-4 h-4" /> {walletGoldCost.toLocaleString()} طاقة
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

      {/* 8. PAUSE / SETTINGS MODAL */}
      {modal === 'PAUSE' && (
        <div className="w-full max-w-sm bg-[#161923] border border-slate-700 rounded-3xl p-6 space-y-4 text-center relative">
          <button onClick={onClose} className="absolute top-4 left-4 text-slate-300 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="font-display text-xl font-black text-white">إيقاف مؤقت · الإعدادات</h3>
          <div className="space-y-2.5">
            <button
              onClick={onToggleMute}
              className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 hover:border-amber-400 cursor-pointer"
            >
              {state.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{state.muted ? 'تشغيل المؤثرات الصوتية' : 'كتم المؤثرات الصوتية'}</span>
            </button>
            <button
              onClick={onBackToTitle}
              className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 hover:border-slate-500 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>العودة لشاشة البداية</span>
            </button>
            <button
              onClick={onResetGame}
              className="w-full py-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-500/25 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة ضبط التقدم (حفظ جديد)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
