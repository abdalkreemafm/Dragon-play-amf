import React, { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { GameState } from '../../types/game';
import { GodIllustration, GoldIcon, ItemIcon, StarIcon } from '../art/DuckArt';
import { TempleAltarBackdrop } from '../art/SceneBackdrops';
import { soundFX } from '../../utils/sound';

interface GodsTabProps {
  state: GameState;
  initialSubTab?: 'TREASURES' | 'TASKS' | 'GODS';
  onActivateGod: (godId: string, payWith: 'gold' | 'stars') => void;
  onClaimTreasureStep: (stepThreshold: number, cornReward: number, starReward: number) => void;
  onOpenExchangeGold: () => void;
}

const RACE_STEPS = [
  { threshold: 20, label: '20+ للجميع', rewardText: '250', corn: 250, stars: 3 },
  { threshold: 50, label: '50+ للجميع', rewardText: '450', corn: 450, stars: 4 },
  { threshold: 100, label: '100+ للجميع', rewardText: '700', corn: 700, stars: 6 },
  { threshold: 280, label: '280+ نقطة كنز', rewardText: '1,000', corn: 1000, stars: 8 },
  { threshold: 550, label: '550+ نقطة كنز', rewardText: '1,300', corn: 1300, stars: 9 },
  { threshold: 1100, label: '1100+ نقطة كنز · الصدارة', rewardText: '1,900', corn: 1900, stars: 12 },
];

export const GodsTab: React.FC<GodsTabProps> = ({
  state,
  initialSubTab = 'GODS',
  onActivateGod,
  onClaimTreasureStep,
  onOpenExchangeGold,
}) => {
  const [subTab, setSubTab] = useState<'TREASURES' | 'TASKS' | 'GODS'>(initialSubTab);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const currentGod = state.godCards[carouselIdx] ?? state.godCards[0];
  const treasurePoints = state.tournament.score + state.stats.totalErrands * 5;

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto px-4 py-3 overflow-y-auto">
      {/* Sub-navigation bar */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#181b24] border border-slate-800 mb-4 shrink-0">
        {([
          { id: 'TREASURES', label: 'الخزينة' },
          { id: 'TASKS', label: 'سباق الكنوز' },
          { id: 'GODS', label: 'البركات' },
        ] as const).map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                soundFX.playTabSwitch();
                setSubTab(tab.id);
              }}
              className={`py-2 rounded-xl font-display text-xs font-extrabold tracking-wider transition-all cursor-pointer ${
                active
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Season & Dragon Gold Counter */}
      <div className="flex items-center justify-between text-xs text-slate-300 mb-4 px-1">
        <span>
          الموسم الأول · <strong className="text-emerald-300 font-mono-num">{treasurePoints} نقطة كنز</strong>
        </span>
        <div className="flex items-center gap-1.5 font-mono-num font-bold text-amber-300">
          <GoldIcon className="w-4 h-4" />
          <span>{state.duckGold} ذهب التنانين</span>
        </div>
      </div>

      {/* 1. TREASURES */}
      {subTab === 'TREASURES' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-5">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-b from-amber-500/20 to-slate-900 border border-amber-400/40 flex items-center justify-center shadow-2xl">
            <ItemIcon item="egg_7" className="w-20 h-20" />
          </div>
          <div>
            <h3 className="font-display text-xl font-black text-white mb-1">خزينة التنانين الموسمية</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              اجمع نقاط الكنز عبر تسليم بيض التنانين في المعبد وفتح الصناديق لتحصل على قطع ذهب التنانين والنجوم!
            </p>
          </div>
          <div className="w-full max-w-sm bg-[#181b24] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">نقاط الكنز الحالية</span>
              <span className="font-mono-num font-bold text-amber-300">{treasurePoints} نقطة</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">الآلهة المفعّلة</span>
              <span className="font-mono-num font-bold text-emerald-400">
                {state.godCards.filter((g) => g.owned).length} / {state.godCards.length}
              </span>
            </div>
            <button
              onClick={() => {
                soundFX.playTabSwitch();
                setSubTab('TASKS');
              }}
              className="w-full py-2.5 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs hover:brightness-105 cursor-pointer"
            >
              عرض مسار سباق الكنوز
            </button>
          </div>
        </div>
      )}

      {/* 2. TASKS (TREASURE HUNTERS' RACE) */}
      {subTab === 'TASKS' && (
        <div className="space-y-4 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-black text-white tracking-wide">
              سباق صائدي الكنوز
            </h3>
            <span className="font-mono-num text-xs font-bold text-amber-300">
              نقاطك: {treasurePoints}
            </span>
          </div>

          {/* Winding Path Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RACE_STEPS.map((step, i) => {
              const reached = treasurePoints >= step.threshold;
              const claimed = state.claimedTreasureSteps.includes(step.threshold);
              return (
                <div
                  key={step.threshold}
                  className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 transition-all ${
                    claimed
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : reached
                        ? 'bg-amber-500/15 border-amber-400/70'
                        : 'bg-[#181b24] border-slate-800'
                  }`}
                >
                  <div>
                    <div className="text-[11px] font-bold text-slate-400">المرحلة {i + 1}</div>
                    <div className="font-display text-sm font-black text-white">{step.label}</div>
                    <div className="text-xs text-emerald-400 font-mono-num font-bold mt-0.5">
                      +{step.corn.toLocaleString()} طاقة · +{step.stars} ★
                    </div>
                  </div>
                  {claimed ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      تم
                    </span>
                  ) : (
                    <button
                      disabled={!reached}
                      onClick={() => {
                        soundFX.playClaim();
                        onClaimTreasureStep(step.threshold, step.corn, step.stars);
                      }}
                      className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all ${
                        reached
                          ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {reached ? 'استلام' : `${step.threshold}+`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. GODS CAROUSEL */}
      {subTab === 'GODS' && currentGod && (
        <div className="flex-1 flex flex-col items-center justify-between pb-2">
          <div className="text-center mb-2">
            <h2 className="font-display text-2xl font-black tracking-wide text-white">
              {currentGod.name}
            </h2>
            <p className="text-xs text-slate-400">{currentGod.subtitle}</p>
          </div>

          {/* Carousel Card */}
          <div className="relative w-full max-w-sm flex items-center justify-center gap-3 my-2">
            <button
              onClick={() => {
                soundFX.playTabSwitch();
                setCarouselIdx((i) => (i - 1 + state.godCards.length) % state.godCards.length);
              }}
              aria-label="الإله السابق"
              className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-200 hover:border-amber-400 cursor-pointer shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="relative flex-1 realistic-card border-2 border-amber-400/25 rounded-3xl p-5 flex flex-col items-center overflow-hidden">
              <TempleAltarBackdrop className="opacity-55" />
              <GodIllustration godId={currentGod.godKey} className="relative z-10 w-40 h-40 mb-3 drop-shadow-[0_14px_20px_rgba(0,0,0,0.8)]" />

              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setInfoModalOpen(true);
                }}
                className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200 hover:border-amber-400 cursor-pointer mb-2"
              >
                دليل التفعيل
              </button>

              <p className="text-xs text-center text-slate-300 leading-relaxed min-h-[34px]">
                {currentGod.bonusDesc}
              </p>

              {currentGod.owned ? (
                <div className="mt-3 w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold text-center flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>مفعّل الآن في حسابك</span>
                </div>
              ) : (
                <div className="mt-3 w-full grid grid-cols-2 gap-2">
                  <button
                    disabled={state.duckGold < currentGod.goldCost}
                    onClick={() => {
                      soundFX.playGodConfirm();
                      onActivateGod(currentGod.id, 'gold');
                    }}
                    className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1 transition-all ${
                      state.duckGold >= currentGod.goldCost
                        ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <GoldIcon className="w-3.5 h-3.5" />
                    <span className="font-mono-num">{currentGod.goldCost}</span>
                  </button>
                  <button
                    disabled={state.stars < currentGod.starCost}
                    onClick={() => {
                      soundFX.playGodConfirm();
                      onActivateGod(currentGod.id, 'stars');
                    }}
                    className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1 transition-all ${
                      state.stars >= currentGod.starCost
                        ? 'bg-indigo-500 text-white hover:bg-indigo-400 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <StarIcon className="w-3.5 h-3.5" />
                    <span className="font-mono-num">{currentGod.starCost}</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                soundFX.playTabSwitch();
                setCarouselIdx((i) => (i + 1) % state.godCards.length);
              }}
              aria-label="الإله التالي"
              className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-200 hover:border-amber-400 cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Dots */}
          <div className="flex items-center gap-1.5 my-2">
            {state.godCards.map((g, idx) => (
              <button
                key={g.id}
                onClick={() => setCarouselIdx(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === carouselIdx ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700'
                }`}
                aria-label={g.name}
              />
            ))}
          </div>

          <button
            onClick={() => {
              soundFX.playTabSwitch();
              onOpenExchangeGold();
            }}
            className="w-full max-w-sm py-3 rounded-2xl bg-slate-100 text-slate-950 font-black text-sm hover:bg-white transition-all cursor-pointer"
          >
            الحصول على الذهب
          </button>
        </div>
      )}

      {/* MINT GOD Guide Modal (matches video 01:23) */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#181b24] border border-slate-700 rounded-3xl p-6 text-center space-y-4">
            <h3 className="font-display text-lg font-black text-white">كيف تحصل على بطاقة البركة؟</h3>
            <div className="space-y-3 text-sm font-bold text-slate-200">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                1. اربح <span className="text-amber-400">ذهب التنانين</span> داخل اللعبة من التحديات والمعبد
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                2. فعّل بطاقة <span className="text-purple-400">البركة</span> بالذهب أو النجوم ★
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                3. احصل على توفير طاقة ومضاعفات دائمة لتطوير تنانينك!
              </div>
            </div>
            <button
              onClick={() => setInfoModalOpen(false)}
              className="w-full py-3 rounded-2xl bg-amber-400 text-slate-950 font-black text-sm cursor-pointer"
            >
              حسناً
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
