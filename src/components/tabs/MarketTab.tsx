import React, { useEffect, useState } from 'react';
import {
  Flame,
  Gavel,
  LogIn,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { DragonAuctionRecord, GameState, Rarity } from '../../types/game';
import { RARITY_STYLE, STORE_PACKAGES, formatCompactNumber } from '../../data/gameData';
import { CornIcon, DmdIcon, DragonIllustration, GodIllustration, StarIcon } from '../art/DuckArt';
import { soundFX } from '../../utils/sound';
import {
  ECONOMY_LIMITS,
  calculateAuctionListingFee,
  calculateAuctionNetProceeds,
  getAuctionPriceBand,
  getBarterEnergyForStarsCost,
  getBarterStarsToEnergyPayout,
  getDragonSellCornPrice,
  getEnergyHardCap,
  getEnergySoftCap,
  getPlayerTier,
  resolveDragonSize,
} from '../../utils/economyEngine';

interface MarketTabProps {
  state: GameState;
  liveAuctions?: DragonAuctionRecord[];
  currentUid?: string | null;
  isSignedIn?: boolean;
  onBidListing: (listingId: string) => void;
  onBuyNowListing: (listingId: string) => void;
  onSellOwnDuck: (duckId: string, cornPrice: number) => void;
  onListDragonAuction?: (
    duckId: string,
    startCorn: number,
    buyNowStars: number,
    durationMin: number
  ) => Promise<void> | void;
  onBidLiveAuction?: (auctionId: string) => Promise<void> | void;
  onBuyNowLiveAuction?: (auctionId: string) => Promise<void> | void;
  onCancelLiveAuction?: (auctionId: string) => Promise<void> | void;
  onClaimBuyerAuction?: (auctionId: string) => Promise<void> | void;
  onClaimSellerAuction?: (auctionId: string) => Promise<void> | void;
  onSignInGoogle?: () => void;
  onBuyMarketGod: (godId: string) => void;
  onBuyStorePackage: (packageId: string) => void;
  onWatchRewardedAd: (kind: 'energy' | 'stars' | 'eggs') => void;
  onBarterTrade: (tradeType: 'CORN_TO_STARS' | 'STARS_TO_CORN') => void;
}

const AuctionCountdown: React.FC<{ endsAtMs: number; compact?: boolean }> = React.memo(
  ({ endsAtMs, compact = false }) => {
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => {
      const id = window.setInterval(() => setNowMs(Date.now()), 1000);
      return () => window.clearInterval(id);
    }, []);
    const remSec = Math.max(0, Math.floor((endsAtMs - nowMs) / 1000));
    if (remSec <= 0) {
      return <span className="font-mono-num text-xs font-black text-amber-300">انتهى</span>;
    }
    const hrs = Math.floor(remSec / 3600);
    const mins = Math.floor((remSec % 3600) / 60);
    const secs = remSec % 60;
    const text =
      hrs > 0
        ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : mins > 0
          ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
          : `${String(secs).padStart(2, '0')}s`;
    return (
      <span
        className={`font-mono-num ${compact ? 'text-xs' : 'text-lg'} font-black ${
          remSec <= 10 ? 'text-rose-400' : 'text-white'
        }`}
      >
        {text}
      </span>
    );
  }
);
AuctionCountdown.displayName = 'AuctionCountdown';

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
  liveAuctions = [],
  currentUid = null,
  isSignedIn = false,
  onBidListing,
  onBuyNowListing,
  onSellOwnDuck,
  onListDragonAuction,
  onBidLiveAuction,
  onBuyNowLiveAuction,
  onCancelLiveAuction,
  onClaimBuyerAuction,
  onClaimSellerAuction,
  onSignInGoogle,
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

  // Live P2P Auction Composer State
  const eligibleDragons = state.ducks.filter((d) => !d.breedingEndsAt && state.ducks.length > 1);
  const [showListComposer, setShowListComposer] = useState(false);
  const [selectedDuckId, setSelectedDuckId] = useState<string>('');
  const [startPriceInput, setStartPriceInput] = useState<number>(800);
  const [buyNowStarsInput, setBuyNowStarsInput] = useState<number>(25);
  const [durationMin, setDurationMin] = useState<number>(60);
  const [busyAuctionId, setBusyAuctionId] = useState<string | null>(null);

  const activeDraftDragon =
    eligibleDragons.find((d) => d.id === selectedDuckId) ?? eligibleDragons[0] ?? null;

  useEffect(() => {
    if (!activeDraftDragon) return;
    if (activeDraftDragon.id !== selectedDuckId) {
      setSelectedDuckId(activeDraftDragon.id);
    }
    const band = getAuctionPriceBand(
      activeDraftDragon.rarity,
      activeDraftDragon.level,
      resolveDragonSize(activeDraftDragon)
    );
    setStartPriceInput(band.suggestedStart);
    setBuyNowStarsInput(band.suggestedStars);
  }, [activeDraftDragon?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const playerTier = getPlayerTier(state);
  const softCap = getEnergySoftCap(playerTier);
  const hardCap = getEnergyHardCap(playerTier);
  const hardCapPct = Math.min(100, Math.round((state.corn / Math.max(1, hardCap)) * 100));
  const barterEnergyCost = getBarterEnergyForStarsCost(playerTier);
  const barterStarsPayout = getBarterStarsToEnergyPayout(playerTier);
  const barterStarsToday = state.treasury.barterStarsToday ?? 0;
  const barterCapReached = barterStarsToday >= ECONOMY_LIMITS.MAX_DAILY_BARTER_STARS;

  const filteredListings =
    rarityTab === 'MY_MARKET' ? [] : state.marketListings.filter((l) => l.rarity === rarityTab);

  const visibleLiveAuctions = liveAuctions.filter((a) => {
    if (rarityTab === 'MY_MARKET') {
      return Boolean(
        currentUid &&
          (a.sellerUid === currentUid || a.highestBidderUid === currentUid || a.winnerUid === currentUid)
      );
    }
    return a.rarity === rarityTab && a.status === 'ACTIVE';
  });

  const chartMeta =
    rarityTab === 'MY_MARKET' ? RARITY_CHART_MULT.UNCOMMON : RARITY_CHART_MULT[rarityTab];
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

  const renderAuctionComposer = () => {
    const band = activeDraftDragon
      ? getAuctionPriceBand(
          activeDraftDragon.rarity,
          activeDraftDragon.level,
          resolveDragonSize(activeDraftDragon)
        )
      : null;
    const clampedStart = band
      ? Math.max(band.minStart, Math.min(band.maxStart, Math.round(startPriceInput || band.minStart)))
      : 500;
    const clampedStars = band
      ? Math.max(band.minStars, Math.min(band.maxStars, Math.round(buyNowStarsInput || band.minStars)))
      : 20;
    const listingFee = calculateAuctionListingFee(clampedStart);
    const netEstimate = calculateAuctionNetProceeds(clampedStart);

    return (
      <div className="bg-[#181b24] border border-amber-400/35 rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <Gavel className="w-4 h-4 text-amber-400" />
              <span>بيع تنينك في مزاد اللاعبين (P2P)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ضريبة بيع {Math.round(ECONOMY_LIMITS.AUCTION_SALE_TAX_RATE * 100)}% ورسوم عرض{' '}
              {Math.round(ECONOMY_LIMITS.AUCTION_LISTING_FEE_RATE * 100)}% تحرق الفائض وتمنع التضخم.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.playTabSwitch();
              setShowListComposer((v) => !v);
            }}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{showListComposer ? 'إخفاء' : 'اعرض تنين'}</span>
          </button>
        </div>

        {showListComposer && (
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-3">
            {!isSignedIn ? (
              <div className="text-center space-y-2.5 py-2">
                <p className="text-xs text-slate-300">
                  سجّل الدخول بحساب جوجل المربوط لتوثيق مزاداتك وحفظ التنانين بأمان في قاعدة البيانات السحابية.
                </p>
                {onSignInGoogle && (
                  <button
                    type="button"
                    onClick={onSignInGoogle}
                    className="min-h-[42px] px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>ربط حساب جوجل للمزاد</span>
                  </button>
                )}
              </div>
            ) : eligibleDragons.length === 0 ? (
              <p className="text-xs text-amber-300 text-center py-2">
                يجب أن تمتلك تنينين على الأقل (وغير مشغولين بالتزاوج) لعرض أحدهم في المزاد.
              </p>
            ) : (
              <>
                <div>
                  <div className="text-[11px] font-bold text-slate-300 mb-1.5">اختر التنين:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {eligibleDragons.map((d) => {
                      const selected = activeDraftDragon?.id === d.id;
                      const dSize = resolveDragonSize(d);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            soundFX.playTabSwitch();
                            setSelectedDuckId(d.id);
                          }}
                          className={`p-2 rounded-xl border text-right flex items-center gap-2 cursor-pointer ${
                            selected
                              ? 'bg-amber-400/15 border-amber-400'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <DragonIllustration
                            skin={d.skin}
                            level={d.level}
                            customLevel={d.customLevel}
                            gear={d.gear}
                            aura={d.aura}
                            showEvolutionEffects={true}
                            className="w-10 h-10 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white truncate">
                              {d.name} {dSize !== 'NORMAL' ? `(${dSize})` : ''}
                            </div>
                            <div className="text-[10px] font-mono-num text-amber-300">
                              {RARITY_STYLE[d.rarity].labelAr} · L{d.level} · ★{d.customLevel}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {band && activeDraftDragon && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold text-slate-300">
                        سعر بداية المزاد (⚡ {band.minStart.toLocaleString()} - {band.maxStart.toLocaleString()})
                      </span>
                      <input
                        type="number"
                        min={band.minStart}
                        max={band.maxStart}
                        step={50}
                        value={startPriceInput}
                        onChange={(e) => setStartPriceInput(Number(e.target.value))}
                        className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold text-slate-300">
                        الشراء الفوري (★ {band.minStars} - {band.maxStars})
                      </span>
                      <input
                        type="number"
                        min={band.minStars}
                        max={band.maxStars}
                        step={1}
                        value={buyNowStarsInput}
                        onChange={(e) => setBuyNowStarsInput(Number(e.target.value))}
                        className="w-full min-h-[40px] px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono-num text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </label>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-300 block">مدة المزاد</span>
                      <div className="grid grid-cols-3 gap-1">
                        {[15, 60, 180].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDurationMin(m)}
                            className={`min-h-[40px] rounded-xl font-mono-num text-[11px] font-black border cursor-pointer ${
                              durationMin === m
                                ? 'bg-amber-400 text-slate-950 border-amber-300'
                                : 'bg-slate-950 text-slate-300 border-slate-800'
                            }`}
                          >
                            {m < 60 ? `${m}د` : `${m / 60}س`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-[11px] font-mono-num">
                  <span className="text-rose-300">رسوم الإدراج (5%): -{listingFee.toLocaleString()} ⚡</span>
                  <span className="text-emerald-400">
                    صافي أقل بيع (-8% ضريبة): +{netEstimate.net.toLocaleString()} ⚡
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!activeDraftDragon || state.corn < listingFee || busyAuctionId === 'CREATE'}
                  onClick={async () => {
                    if (!activeDraftDragon || !onListDragonAuction) return;
                    setBusyAuctionId('CREATE');
                    try {
                      await onListDragonAuction(activeDraftDragon.id, clampedStart, clampedStars, durationMin);
                      setShowListComposer(false);
                    } finally {
                      setBusyAuctionId(null);
                    }
                  }}
                  className={`w-full min-h-[44px] py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 ${
                    activeDraftDragon && state.corn >= listingFee && busyAuctionId !== 'CREATE'
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Gavel className="w-4 h-4" />
                  <span>
                    {busyAuctionId === 'CREATE'
                      ? 'جارٍ النشر في المزاد...'
                      : `نشر التنين في المزاد العالمي (رسوم ${listingFee.toLocaleString()} ⚡)`}
                  </span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderLiveAuctionCard = (a: DragonAuctionRecord) => {
    const st = RARITY_STYLE[a.rarity];
    const nowMs = Date.now();
    const expired = nowMs >= a.endsAtMs;
    const isSeller = Boolean(currentUid && a.sellerUid === currentUid);
    const isHighestBidder = Boolean(currentUid && a.highestBidderUid === currentUid);
    const minNextBid =
      a.bidCount === 0
        ? a.startCornPrice
        : a.currentCornPrice + Math.max(50, Math.round(a.currentCornPrice * 0.1));
    const canCancel = isSeller && a.status === 'ACTIVE' && a.bidCount === 0;
    const canBuyerClaim =
      !a.buyerClaimed &&
      isHighestBidder &&
      a.bidCount > 0 &&
      (a.status === 'SOLD' || (a.status === 'ACTIVE' && expired));
    const canSellerClaim =
      isSeller &&
      !a.sellerClaimed &&
      (a.status === 'SOLD' || (a.status === 'ACTIVE' && expired && a.bidCount > 0));
    const dSize = a.dragon.sizeTier ?? 'NORMAL';
    const busy = busyAuctionId === a.id;

    return (
      <div key={a.id} className={`rounded-3xl border realistic-card ${st.border} p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-black text-emerald-300">
                مزاد لاعب حقيقي
              </span>
              <span className="font-mono-num text-xs font-bold text-slate-300">
                LVL {a.dragon.level} {dSize !== 'NORMAL' ? dSize : ''} ★{a.dragon.customLevel ?? 0}
              </span>
              <span className={`text-[11px] font-extrabold ${st.color}`}>{st.labelAr}</span>
            </div>
            <div className="text-sm font-black text-white">{a.dragon.name}</div>
            <div className="text-[11px] text-slate-400 font-mono-num">
              البائع: {a.sellerName}
              {a.highestBidderName ? ` · أعلى مزايد: ${a.highestBidderName}` : ' · بدون مزايدات بعد'}
            </div>
          </div>
          <DragonIllustration
            skin={a.dragon.skin}
            level={a.dragon.level}
            customLevel={a.dragon.customLevel ?? 0}
            gear={a.dragon.gear}
            aura={a.dragon.aura}
            showEvolutionEffects={true}
            className="w-20 h-20 shrink-0"
          />
        </div>

        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <AuctionCountdown endsAtMs={a.endsAtMs} />
            {isHighestBidder && <span className="text-emerald-400 font-bold">· عرضك متصدر!</span>}
            {isSeller && <span className="text-amber-300 font-bold">· مزادك</span>}
          </div>
          <div className="flex items-center gap-3 font-mono-num font-bold">
            <span className="text-emerald-400 flex items-center gap-1">
              <CornIcon className="w-3.5 h-3.5" />
              {formatCompactNumber(a.currentCornPrice)}
            </span>
            <span className="text-indigo-400 flex items-center gap-1">
              <StarIcon className="w-3.5 h-3.5" />
              {a.buyNowStars}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isSeller && a.status === 'ACTIVE' && !expired && (
            <>
              <button
                type="button"
                disabled={!isSignedIn || isHighestBidder || state.corn < minNextBid || busy}
                onClick={async () => {
                  if (!onBidLiveAuction) return;
                  setBusyAuctionId(a.id);
                  try {
                    await onBidLiveAuction(a.id);
                  } finally {
                    setBusyAuctionId(null);
                  }
                }}
                className={`flex-1 min-h-[42px] py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 ${
                  isSignedIn && !isHighestBidder && state.corn >= minNextBid && !busy
                    ? 'bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Gavel className="w-3.5 h-3.5" />
                <span className="font-mono-num">
                  {isHighestBidder ? 'عرضك الأعلى' : `زايد ${formatCompactNumber(minNextBid)}⚡`}
                </span>
              </button>

              <button
                type="button"
                disabled={!isSignedIn || state.stars < a.buyNowStars || busy}
                onClick={async () => {
                  if (!onBuyNowLiveAuction) return;
                  setBusyAuctionId(a.id);
                  try {
                    await onBuyNowLiveAuction(a.id);
                  } finally {
                    setBusyAuctionId(null);
                  }
                }}
                className={`flex-1 min-h-[42px] py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 ${
                  isSignedIn && state.stars >= a.buyNowStars && !busy
                    ? 'bg-indigo-500 text-white hover:bg-indigo-400 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <StarIcon className="w-3.5 h-3.5" />
                <span className="font-mono-num">شراء فوري {a.buyNowStars}</span>
              </button>
            </>
          )}

          {canBuyerClaim && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!onClaimBuyerAuction) return;
                setBusyAuctionId(a.id);
                try {
                  await onClaimBuyerAuction(a.id);
                } finally {
                  setBusyAuctionId(null);
                }
              }}
              className="w-full min-h-[42px] py-2 px-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs cursor-pointer"
            >
              فزت بالمزاد! استلم التنين الآن 🐉
            </button>
          )}

          {canSellerClaim && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!onClaimSellerAuction) return;
                setBusyAuctionId(a.id);
                try {
                  await onClaimSellerAuction(a.id);
                } finally {
                  setBusyAuctionId(null);
                }
              }}
              className="w-full min-h-[42px] py-2 px-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              تحصيل عوائد البيع (صافي بعد ضريبة 8%) 💰
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!onCancelLiveAuction) return;
                setBusyAuctionId(a.id);
                try {
                  await onCancelLiveAuction(a.id);
                } finally {
                  setBusyAuctionId(null);
                }
              }}
              className="w-full min-h-[40px] py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-rose-400 text-slate-200 font-bold text-xs cursor-pointer"
            >
              {expired ? 'انتهى بدون عروض · استرداد التنين' : 'إلغاء العرض واسترداد التنين'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto px-3 sm:px-5 py-3 overflow-y-auto">
      <div className="flex items-center justify-center gap-3 sm:gap-6 mb-3 shrink-0">
        <button
          onClick={() => {
            soundFX.playTabSwitch();
            setSection('STORE');
          }}
          className={`min-h-[40px] px-2 font-display text-sm sm:text-xl font-black tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
            section === 'STORE'
              ? 'text-amber-300 border-b-2 border-amber-400'
              : 'text-slate-300 hover:text-white'
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
            section === 'DUCKS'
              ? 'text-amber-300 border-b-2 border-amber-400'
              : 'text-slate-300 hover:text-white'
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
            section === 'GODS'
              ? 'text-amber-300 border-b-2 border-amber-400'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          بطاقات البركات
        </button>
      </div>

      {section === 'STORE' ? (
        <div className="space-y-4 pb-6">
          {/* Anti-Inflation Hard Cap Status Bar */}
          <div className="bg-[#181b24] border border-sky-500/30 rounded-3xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-white">سقف خزانة الطاقة (حماية الاقتصاد · الرتبة {playerTier})</span>
              <span className="font-mono-num text-emerald-400 font-black">
                {formatCompactNumber(state.corn)} / {formatCompactNumber(hardCap)} ⚡
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all ${
                  hardCapPct >= 90 ? 'bg-rose-500' : hardCapPct >= 65 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${hardCapPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-num">
              <span>حد التهدئة: {formatCompactNumber(softCap)}⚡</span>
              <span>السقف الأقصى: {formatCompactNumber(hardCap)}⚡</span>
            </div>
          </div>

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
              const label = tab === 'MY_MARKET' ? 'سوقي ومزادي' : RARITY_STYLE[tab].labelAr;
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

          <div className="mb-4">{renderAuctionComposer()}</div>

          {rarityTab === 'MY_MARKET' ? (
            <div className="space-y-4 pb-6">
              {visibleLiveAuctions.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-sm font-black text-amber-300 px-1">مزاداتي ومزايداتي الجارية</h3>
                  {visibleLiveAuctions.map(renderLiveAuctionCard)}
                </div>
              )}

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
                <h3 className="text-sm font-black text-white mb-1">البيع الفوري للخزينة (سريع)</h3>
                <p className="text-xs text-slate-400 mb-3">
                  بيع فوري مقابل الطاقة أو استخدم نموذج المزاد بالأعلى للبيع للاعبين الآخرين.
                </p>
                <div className="space-y-2.5">
                  {eligibleDragons.map((d) => {
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
              {visibleLiveAuctions.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-black text-emerald-300 px-1">مزادات اللاعبين الحية (متزامنة):</div>
                  {visibleLiveAuctions.map(renderLiveAuctionCard)}
                </div>
              )}

              {filteredListings.map((item) => {
                const st = RARITY_STYLE[item.rarity];
                const nextBidCorn = Math.round(item.cornPrice * 1.12);
                const endsAtMs = item.endsAt ?? Date.now() + item.timeLeftSec * 1000;
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
                            <AuctionCountdown endsAtMs={endsAtMs} />
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

