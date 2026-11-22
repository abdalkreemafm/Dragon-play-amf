import React, { useState } from 'react';
import { Flame, PlayCircle, RefreshCw, ShieldCheck, ShoppingBag, TrendingUp } from 'lucide-react';
import { GameState, Rarity } from '../../types/game';
import { RARITY_STYLE, STORE_PACKAGES, formatCompactNumber } from '../../data/gameData';
import { CornIcon, DmdIcon, DragonIllustration, GodIllustration, StarIcon } from '../art/DuckArt';
import { soundFX } from '../../utils/sound';
import {
  ECONOMY_LIMITS,
  getBarterEnergyForStarsCost,
  getBarterStarsToEnergyPayout,
  getDragonSellCornPrice,
  getPlayerTier,
  resolveDragonSize,
} from '../../utils/economyEngine';

interface MarketTabProps {
  state: GameState;
  onBidListing: (listingId: string) => void;
  onBuyNowListing: (listingId: string) => void;
  onSellOwnDuck: (duckId: string, cornPrice: number) => void;
  onBuyMarketGod: (godId: string) => void;
  onBuyStorePackage: (packageId: string) => void;
  onWatchRewardedAd: (kind: 'energy' | 'stars' | 'eggs') => void;
  onBarterTrade: (tradeType: 'CORN_TO_STARS' | 'STARS_TO_CORN') => void;
}

const RARITY_CHART_MULT: Record<Rarity, { mult: number; baseStars: number }> = {
  COMMON: { mult: 0.45, baseStars: 22 },
  UNCOMMON: { mult: 1.0, baseStars: 48 },
  RARE: { mult: 2.35, baseStars: 112 },
  EPIC: { mult: 4.8, baseStars: 215 },
  LEGENDARY: { mult: 9.5, baseStars: 430 },
};

const CHART_SERIES: Record<string, number[]> = {
  '1ي': [6.42, 6.45, 6.49, 6.48, 6.53, 6.56, 6.597],
  '1س': [6.55, 6.56, 6.54, 6.58, 6.57, 6.59, 6.597],
  '1د': [5.9, 6.05, 6.18, 6.24, 6.38, 6.49, 6.597],
  '5د': [5.2, 5.45, 5.7, 5.88, 6.12, 6.35, 6.597],
  '10د': [4.6, 4.9, 5.3, 5.65, 5.95, 6.3, 6.597],
};

export const MarketTab: React.FC<MarketTabProps> = ({
  state,
  onBidListing,
  onBuyNowListing,
  onSellOwnDuck,
  onBuyMarketGod,
  onBuyStorePackage,
  onWatchRewardedAd,
  onBarterTrade,
}) => {
  const [section, setSection] = useState<'STORE' | 'DUCKS' | 'GODS'>('STORE');
  const [rarityTab, setRarityTab] = useState<Rarity | 'MY_MARKET'>('UNCOMMON');
  const [timeframe, setTimeframe] = useState<string>('1ي');
  const [hoverPointIdx, setHoverPointIdx] = useState<number | null>(null);
  const [confirmSellId, setConfirmSellId] = useState<string | null>(null);

  const playerTier = getPlayerTier(state);
  const barterEnergyCost = getBarterEnergyForStarsCost(playerTier);
  const barterStarsPayout = getBarterStarsToEnergyPayout(playerTier);
  const barterStarsToday = state.treasury.barterStarsToday ?? 0;
  const barterCapReached = barterStarsToday >= ECONOMY_LIMITS.MAX_DAILY_BARTER_STARS;

  const filteredListings =
    rarityTab === 'MY_MARKET' ? [] : state.marketListings.filter((l) => l.rarity === rarityTab);

  const chartMeta = rarityTab === 'MY_MARKET' ? RARITY_CHART_MULT.UNCOMMON : RARITY_CHART_MULT[rarityTab];
  const baseSeries = CHART_SERIES[timeframe] ?? CHART_SERIES['1ي'];
  const scaledPoints = baseSeries.map((v) => Number((v * chartMeta.mult).toFixed(2)));
  const minVal = Math.min(...scaledPoints) - 0.1 * chartMeta.mult;
  const maxVal = Math.max(...scaledPoints) + 0.08 * chartMeta.mult;

  const svgPoints = scaledPoints.map((val, idx) => {
    const x = 18 + (idx / (scaledPoints.length - 1)) * 284;
    const y = 92 - ((val - minVal) / Math.max(0.01, maxVal - minVal)) * 74;
    return { x, y, val };
  });
  const polylineStr = svgPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const latestChartK = `${Math.round(scaledPoints[scaledPoints.length - 1] * 1000).toLocaleString()}⚡`;
  const latestChartStars = `${chartMeta.baseStars.toLocaleString()}`;

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto px-3 sm:px-5 py-3 overflow-y-auto">
      <div className="flex items-center justify-center gap-3 sm:gap-6 mb-3 shrink-0">
        <button
          onClick={() => {
            soundFX.playTabSwitch();
            setSection('STORE');
          }}
          className={`min-h-[40px] px-2 font-display text-sm sm:text-xl font-black tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
            section === 'STORE' ? 'text-amber-300 border-b-2 border-amber-400' : 'text-slate-300 hover:text-white'
          }`}
        >
          المتجر والصندوق
        </button>
        <button
          onClick={() => {
            soundFX.playTabSwitch();
            setSection('DUCKS');
          }}
          className={`min-h-[40px] px-2 font-display text-sm sm:text-xl font-black tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
            section === 'DUCKS' ? 'text-amber-300 border-b-2 border-amber-400' : 'text-slate-300 hover:text-white'
          }`}
        >
          مزادات التنانين
        </button>
        <button
          onClick={() => {
            soundFX.playTabSwitch();
            setSection('GODS');
          }}
          className={`min-h-[40px] px-2 font-display text-sm sm:text-xl font-black tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
            section === 'GODS' ? 'text-amber-300 border-b-2 border-amber-400' : 'text-slate-300 hover:text-white'
          }`}
        >
          بطاقات البركات
        </button>
      </div>

      {section === 'STORE' ? (
        <div className="space-y-4 pb-6">
          {/* DMD Reserve Treasury (50% Reserve / 50% Ops) */}
          <div className="realistic-card border border-amber-400/40 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <DmdIcon className="w-6 h-6" />
                <div>
                  <h3 className="text-sm font-black text-white">صندوق دعم عملة DMD المستقبلية</h3>
                  <p className="text-[11px] text-slate-400">
                    شفافية مالية كاملة: 50% لاحتياطي دعم DMD و 50% للتطوير والتشغيل
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-black text-emerald-300 flex items-center gap-1 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>DMD غير مباعة</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono-num">
              <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-2.5">
                <div className="text-[10px] text-slate-400">احتياطي DMD (50%)</div>
                <div className="text-base font-black text-emerald-400 mt-0.5">
                  ${state.treasury.reserveUsd.toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-2.5">
                <div className="text-[10px] text-slate-400">التشغيل والتطوير (50%)</div>
                <div className="text-base font-black text-sky-300 mt-0.5">
                  ${state.treasury.opsUsd.toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900/90 border border-amber-400/30 p-2.5">
                <div className="text-[10px] text-slate-400">رصيد محفظتك</div>
                <div className="text-base font-black text-amber-300 mt-0.5">
                  {state.dmdTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2 text-[11px] text-slate-300 leading-relaxed">
              🔒 <strong className="text-white">سياسة العملة الرقمية:</strong> عملة <strong className="text-amber-300">DMD</strong> لا تُعدَّن ولا تُباع في المتجر؛ بل هي رصيد في المحفظة يُكتسب حصراً عبر تخصيص التنانين (★1 ← ★10) وتُستبدل عند الإطلاق الرسمي في المنصات.
            </div>
          </div>

          {/* Store Packages */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>حزم المتجر الرسمية (50% تدعم صندوق DMD)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {STORE_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-[#181b24] border border-slate-800 hover:border-amber-400/50 rounded-3xl p-4 flex flex-col justify-between gap-3 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px] font-black">
                        {pkg.tag}
                      </span>
                      <span className="font-mono-num text-xs font-bold text-emerald-400">
                        +${(pkg.priceUsd * 0.5).toFixed(2)} للصندوق
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white">{pkg.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{pkg.desc}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] font-mono-num font-bold">
                      <span className="text-indigo-300 flex items-center gap-1">
                        <StarIcon className="w-3.5 h-3.5" /> +{pkg.starsReward}
                      </span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CornIcon className="w-3.5 h-3.5" /> +{pkg.energyReward.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onBuyStorePackage(pkg.id)}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 font-black text-xs hover:brightness-105 cursor-pointer font-mono-num"
                  >
                    اقتناء · ${pkg.priceUsd.toFixed(2)}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Rewarded Ads (Max 4/day) */}
          <div className="bg-[#181b24] border border-emerald-500/30 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <PlayCircle className="w-4 h-4 text-emerald-400" />
                  <span>إعلانات المكافآت الاختيارية</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  بإرادتك بالكامل — تدعم صندوق DMD بنسبة 50% من عائد الإعلان (بدون إعلانات إجبارية).
                </p>
              </div>
              <span className="font-mono-num text-xs font-black text-amber-300 shrink-0">
                {state.treasury.adsWatchedToday} / {state.treasury.maxAdsPerDay} اليوم
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { kind: 'energy' as const, title: `+${ECONOMY_LIMITS.AD_ENERGY_REWARD} طاقة ⚡`, sub: 'إطعام سريع' },
                { kind: 'stars' as const, title: `+${ECONOMY_LIMITS.AD_STARS_REWARD} نجوم ★`, sub: 'تخصيص وخانات' },
                { kind: 'eggs' as const, title: `+${ECONOMY_LIMITS.AD_EGGS_REWARD} بيضة 🥚`, sub: 'ساحة الدمج' },
              ].map((adOpt) => {
                const limitReached = state.treasury.adsWatchedToday >= state.treasury.maxAdsPerDay;
                return (
                  <button
                    key={adOpt.kind}
                    disabled={limitReached}
                    onClick={() => onWatchRewardedAd(adOpt.kind)}
                    className={`min-h-[48px] rounded-2xl p-2.5 border text-center transition-all ${
                      limitReached
                        ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-500/10 border-emerald-500/40 text-white hover:bg-emerald-500/20 cursor-pointer'
                    }`}
                  >
                    <div className="text-xs font-black text-emerald-300">{adOpt.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{adOpt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : section === 'GODS' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-6">
          {state.godCards.map((god) => (
            <div
              key={god.id}
              className="bg-[#181b24] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <GodIllustration godId={god.godKey} className="w-16 h-16 shrink-0" />
                <div>
                  <div className="font-display text-sm font-black text-white">{god.name}</div>
                  <div className="text-xs text-slate-400">{god.subtitle}</div>
                </div>
              </div>
              {god.owned ? (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-extrabold">
                  مفعّلة
                </span>
              ) : (
                <button
                  disabled={state.stars < god.starCost}
                  onClick={() => {
                    soundFX.playGodConfirm();
                    onBuyMarketGod(god.id);
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1 shrink-0 ${
                    state.stars >= god.starCost
                      ? 'bg-indigo-500 text-white hover:bg-indigo-400 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <StarIcon className="w-3.5 h-3.5" />
                  <span className="font-mono-num">{god.starCost}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap sm:items-center gap-1.5 pb-2.5 mb-3 border-b border-slate-800 shrink-0">
            {(['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MY_MARKET'] as const).map((tab) => {
              const active = rarityTab === tab;
              const label = tab === 'MY_MARKET' ? 'سوقي والمقايضة' : RARITY_STYLE[tab].labelAr;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    soundFX.playTabSwitch();
                    setRarityTab(tab);
                  }}
                  className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                    tab === 'MY_MARKET' ? 'col-span-2 sm:col-span-1' : ''
                  } ${
                    active
                      ? 'bg-slate-800 text-amber-300 border border-amber-400/40'
                      : 'bg-slate-900/60 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {rarityTab === 'MY_MARKET' ? (
            <div className="space-y-4 pb-6">
              {/* Quick Resource Barter Exchange */}
              <div className="bg-[#181b24] border border-amber-400/30 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-amber-300">مقايضة الطاقة والنجوم (الرتبة {playerTier})</h3>
                  <span className="font-mono-num text-[11px] font-bold text-slate-300">
                    سقف النجوم: {barterStarsToday}/{ECONOMY_LIMITS.MAX_DAILY_BARTER_STARS} اليوم
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  تسعير تصاعدي متوازن مع رتبك لحماية الاقتصاد ومنع التضخم.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    disabled={barterCapReached || state.corn < barterEnergyCost}
                    onClick={() => onBarterTrade('CORN_TO_STARS')}
                    className={`min-h-[44px] py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-between border ${
                      !barterCapReached && state.corn >= barterEnergyCost
                        ? 'bg-slate-900 border-slate-700 hover:border-amber-400 text-white cursor-pointer'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span className="flex items-center gap-1 font-mono-num">
                      <CornIcon className="w-3.5 h-3.5" /> {barterEnergyCost.toLocaleString()} طاقة
                    </span>
                    <span className="flex items-center gap-1 text-indigo-300 font-mono-num">
                      {barterCapReached ? 'اكتمل اليوم' : '← +10'} <StarIcon className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  <button
                    disabled={state.stars < 10}
                    onClick={() => onBarterTrade('STARS_TO_CORN')}
                    className={`min-h-[44px] py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-between border ${
                      state.stars >= 10
                        ? 'bg-slate-900 border-slate-700 hover:border-emerald-400 text-white cursor-pointer'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span className="flex items-center gap-1 font-mono-num">
                      <StarIcon className="w-3.5 h-3.5" /> 10 نجوم
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-mono-num">
                      ← +{formatCompactNumber(barterStarsPayout)} <CornIcon className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>
              </div>

              <div className="bg-[#181b24] border border-slate-800 rounded-2xl p-4">
                <h3 className="text-sm font-black text-white mb-1">تنانيني المتاحة للبيع</h3>
                <p className="text-xs text-slate-400 mb-3">
                  اعرض أي تنين غير مشغول بالتزاوج حالياً واحصل على الطاقة فوراً!
                </p>
                <div className="space-y-2.5">
                  {state.ducks
                    .filter((d) => !d.breedingEndsAt && state.ducks.length > 1)
                    .map((d) => {
                      const sellPrice = getDragonSellCornPrice(d, playerTier);
                      const dSize = resolveDragonSize(d);
                      return (
                        <div
                          key={d.id}
                          className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <DragonIllustration
                              skin={d.skin}
                              level={d.level}
                              customLevel={d.customLevel}
                              gear={d.gear}
                              aura={d.aura}
                              showEvolutionEffects={true}
                              className="w-12 h-12"
                            />
                            <div>
                              <div className="text-xs font-extrabold text-white flex items-center gap-1">
                                <span>{d.name}</span>
                                {dSize !== 'NORMAL' && (
                                  <span className="px-1 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono-num text-[9px] font-black">
                                    {dSize}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono-num text-amber-300">
                                {RARITY_STYLE[d.rarity].labelAr} · LVL {d.level} · ★{d.customLevel}
                              </div>
                            </div>
                          </div>
                          {confirmSellId === d.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  soundFX.playClaim();
                                  onSellOwnDuck(d.id, sellPrice);
                                  setConfirmSellId(null);
                                }}
                                className="min-h-[44px] px-3 py-2 rounded-xl bg-rose-500 text-white font-black text-xs hover:bg-rose-400 cursor-pointer flex items-center gap-1"
                              >
                                <CornIcon className="w-3.5 h-3.5" />
                                <span className="font-mono-num">تأكيد ({formatCompactNumber(sellPrice)})</span>
                              </button>
                              <button
                                onClick={() => {
                                  soundFX.playTabSwitch();
                                  setConfirmSellId(null);
                                }}
                                className="min-h-[44px] px-2.5 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:text-white cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                soundFX.playTabSwitch();
                                setConfirmSellId(d.id);
                              }}
                              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 cursor-pointer flex items-center gap-1"
                            >
                              <CornIcon className="w-3.5 h-3.5" />
                              <span className="font-mono-num">بيع {formatCompactNumber(sellPrice)}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {filteredListings.map((item) => {
                const st = RARITY_STYLE[item.rarity];
                const nextBidCorn = Math.round(item.cornPrice * 1.12);
                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl border realistic-card ${
                      item.rivalSniped ? 'border-rose-500 animate-hit-shake' : st.border
                    } p-4 space-y-3`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-num text-xs font-bold text-slate-300">
                            LVL {item.level} {item.xl ? 'XL' : ''}
                          </span>
                          <span className={`text-[11px] font-extrabold ${st.color}`}>{st.labelAr}</span>
                        </div>
                        <div className="text-sm font-black text-white">{item.duckName}</div>
                        <div className="text-[11px] text-slate-400 font-mono-num">
                          البائع: {item.seller}
                          {item.lastBidder ? ` · أعلى مزايد: ${item.lastBidder}` : ''}
                        </div>
                      </div>
                      <DragonIllustration
                        skin={item.skin}
                        level={item.level}
                        showEvolutionEffects={true}
                        className="w-24 h-24 shrink-0 drop-shadow-[0_10px_14px_rgba(0,0,0,0.75)]"
                      />
                    </div>

                    {item.rivalSniped && item.soldStatus === 'ACTIVE' && (
                      <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-black flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-rose-400" />
                        <span>كسر {item.lastBidder} عرضك في الثواني الأخيرة! زايد الآن (+6s)!</span>
                      </div>
                    )}

                    {item.soldStatus === 'SOLD_OTHER' ? (
                      <div className="rounded-xl bg-slate-900 border border-slate-800 py-3 px-4 text-center">
                        <div className="text-xs text-slate-400">
                          تم البيع للمنافس {item.lastBidder ?? 'مروض آخر'}
                        </div>
                        <div className="font-mono-num text-base font-black text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                          <CornIcon className="w-4 h-4" />
                          <span>{item.cornPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : item.soldStatus === 'SOLD_YOU' ? (
                      <div className="rounded-xl bg-emerald-500/20 border border-emerald-400 py-3 px-4 text-center text-xs font-extrabold text-emerald-300">
                        فزت بالمزاد! تمت إضافة التنين إلى قائمتك 🐉
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs px-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono-num text-lg font-black ${
                                item.timeLeftSec <= 5 ? 'text-rose-400' : 'text-white'
                              }`}
                            >
                              {String(item.timeLeftSec).padStart(2, '0')}s
                            </span>
                            {item.isUserBid ? (
                              <span className="text-emerald-400 font-bold">· عرضك متصدر!</span>
                            ) : (
                              <span className="text-slate-400">· المزاد مشتعل</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 font-mono-num font-bold">
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CornIcon className="w-3.5 h-3.5" />
                              {formatCompactNumber(item.cornPrice)}
                            </span>
                            <span className="text-indigo-400 flex items-center gap-1">
                              <StarIcon className="w-3.5 h-3.5" />
                              {item.starPrice}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            disabled={state.corn < nextBidCorn}
                            onClick={() => {
                              soundFX.playTapFeed();
                              onBidListing(item.id);
                            }}
                            className={`min-h-[44px] py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                              state.corn >= nextBidCorn
                                ? 'bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 hover:brightness-105 cursor-pointer'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <CornIcon className="w-3.5 h-3.5" />
                            <span className="font-mono-num">{formatCompactNumber(nextBidCorn)}</span>
                          </button>

                          <button
                            disabled={state.stars < item.starPrice}
                            onClick={() => {
                              soundFX.playGodConfirm();
                              onBuyNowListing(item.id);
                            }}
                            className={`min-h-[44px] py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                              state.stars >= item.starPrice
                                ? 'bg-indigo-500 text-white hover:bg-indigo-400 cursor-pointer'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <StarIcon className="w-3.5 h-3.5" />
                            <span className="font-mono-num">شراء فوري {item.starPrice}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* SVG Market Activity Chart */}
              <div className="bg-[#181b24] border border-slate-800 rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-black text-white">مؤشر أسعار التنانين · {RARITY_STYLE[rarityTab].labelAr}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {Object.keys(CHART_SERIES).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => {
                          soundFX.playTabSwitch();
                          setTimeframe(tf);
                        }}
                        className={`min-h-[36px] min-w-[36px] px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          timeframe === tf ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative bg-slate-900/80 border border-slate-800 rounded-2xl p-2">
                  <svg viewBox="0 0 320 110" className="w-full h-32 overflow-visible">
                    <line x1="18" y1="22" x2="302" y2="22" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="18" y1="57" x2="302" y2="57" stroke="#1e293b" strokeDasharray="3 3" />
                    <line x1="18" y1="92" x2="302" y2="92" stroke="#1e293b" strokeDasharray="3 3" />
                    <polyline
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylineStr}
                    />
                    {svgPoints.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoverPointIdx === idx ? 5.5 : 3.5}
                        fill="#4ade80"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoverPointIdx(idx)}
                        onMouseLeave={() => setHoverPointIdx(null)}
                      />
                    ))}
                  </svg>
                  {hoverPointIdx !== null && svgPoints[hoverPointIdx] && (
                    <div className="absolute top-2 left-3 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-mono-num text-emerald-300">
                      {Math.round(svgPoints[hoverPointIdx].val * 1000).toLocaleString()} طاقة
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-mono-num">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CornIcon className="w-3.5 h-3.5" />
                    {latestChartK} (+2.4%)
                  </span>
                  <span className="text-indigo-400 font-bold flex items-center gap-1">
                    <StarIcon className="w-3.5 h-3.5" />
                    {latestChartStars} (+1.8%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
