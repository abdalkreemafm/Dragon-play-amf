import React, { useEffect, useState } from 'react';
import {
  Flame,
  Gavel,
  PlayCircle,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  Tag,
  Timer,
  TrendingDown,
} from 'lucide-react';
import { DragonAuctionRecord, GameState, Rarity } from '../../types/game';
import { RARITY_STYLE, STORE_PACKAGES, formatCompactNumber } from '../../data/gameData';
import { CornIcon, DragonIllustration, GodIllustration, StarIcon } from '../art/DuckArt';
import { DragonExchangeIndex } from '../market/DragonExchangeIndex';
import { soundFX } from '../../utils/sound';
import {
  ECONOMY_LIMITS,
  calculateAuctionListingFee,
  calculateAuctionNetProceeds,
  calculateDragonUpgradeInvestmentAndPrice,
  getBarterEnergyForGoldCost,
  getBarterStarsToEnergyPayout,
  getDragonSellCornPrice,
  getPlayerTier,
  resolveDragonSize,
} from '../../utils/economyEngine';

interface MarketTabProps {
  state: GameState;
  liveAuctions?: DragonAuctionRecord[];
  currentUid?: string | null;
  isSignedIn?: boolean;
  onBidListing?: (listingId: string) => void;
  onBuyNowListing?: (listingId: string) => void;
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
  onBuyMarketGod: (godId: string) => void;
  onBuyStorePackage: (packageId: string) => void;
  onWatchRewardedAd: (kind: 'energy' | 'stars' | 'eggs') => void;
  onBarterTrade: (tradeType: 'CORN_TO_STARS' | 'STARS_TO_CORN' | 'CORN_TO_GOLD') => void;
  auctionPreselect?: {
    section: 'STORE' | 'DUCKS' | 'GODS';
    dragonId?: string;
    nonce: number;
  } | null;
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

const Auction30sBadge: React.FC<{
  cycleEndsAtMs?: number;
  createdAtMs?: number;
  bidCount: number;
  status: string;
}> = React.memo(({ cycleEndsAtMs, createdAtMs = Date.now(), bidCount, status }) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (status !== 'ACTIVE') {
    return (
      <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 font-bold text-[10px]">
        {status === 'SOLD' ? '✓ تم البيع' : 'منتهي'}
      </span>
    );
  }

  const targetMs = cycleEndsAtMs || (createdAtMs + 30000);
  const diffSec = Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
  const displaySec = diffSec > 30 ? 30 : diffSec;

  if (bidCount === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-950/90 border border-sky-400/50 text-sky-200 text-[10.5px] font-mono-num font-bold shadow-[0_0_12px_rgba(56,189,248,0.25)] animate-pulse">
        <TrendingDown className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
        <span className="text-[10px] text-slate-300">انخفاض السعر خلال:</span>
        <span className="font-black text-amber-300 text-xs">00:{String(displaySec).padStart(2, '0')}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/25 to-yellow-500/25 border border-amber-400/70 text-amber-200 text-[10.5px] font-mono-num font-bold shadow-[0_0_15px_rgba(251,191,36,0.4)] animate-pulse">
      <Flame className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
      <span className="text-[10px] text-amber-100">تنبيه مزايدة! ينتهي:</span>
      <span className="font-black text-yellow-300 text-xs">00:{String(displaySec).padStart(2, '0')}</span>
    </div>
  );
});
Auction30sBadge.displayName = 'Auction30sBadge';

export const MarketTab: React.FC<MarketTabProps> = ({
  state,
  liveAuctions = [],
  currentUid = null,
  isSignedIn = false,
  onSellOwnDuck,
  onListDragonAuction,
  onBidLiveAuction,
  onBuyNowLiveAuction,
  onCancelLiveAuction,
  onClaimBuyerAuction,
  onClaimSellerAuction,
  onBuyMarketGod,
  onBuyStorePackage,
  onWatchRewardedAd,
  onBarterTrade,
  auctionPreselect = null,
}) => {
  const [section, setSection] = useState<'STORE' | 'DUCKS' | 'GODS'>('STORE');
  const [rarityTab, setRarityTab] = useState<'ALL' | Rarity | 'MY_MARKET'>('ALL');
  const [confirmSellId, setConfirmSellId] = useState<string | null>(null);

  // Live P2P Auction Composer State (unlocked slots only, requires >1 unlocked dragon)
  const unlockedCount = state.ducks.filter((d, i) => (d.slotIndex ?? i) < state.unlockedSlots).length;
  const eligibleDragons = state.ducks.filter(
    (d, i) => !d.breedingEndsAt && (d.slotIndex ?? i) < state.unlockedSlots && unlockedCount > 1
  );
  const [showListComposer, setShowListComposer] = useState(false);
  const [composerRarity, setComposerRarity] = useState<Rarity | 'ALL'>('ALL');
  const [selectedDuckId, setSelectedDuckId] = useState<string>('');
  const [startPriceInput, setStartPriceInput] = useState<number>(800);
  const [buyNowStarsInput, setBuyNowStarsInput] = useState<number>(25);
  const [durationMin, setDurationMin] = useState<number>(60);
  const [busyAuctionId, setBusyAuctionId] = useState<string | null>(null);

  useEffect(() => {
    if (!auctionPreselect) return;
    setSection(auctionPreselect.section);
    if (auctionPreselect.section === 'DUCKS') {
      setShowListComposer(true);
      setComposerRarity('ALL');
      if (auctionPreselect.dragonId) {
        setSelectedDuckId(auctionPreselect.dragonId);
      }
    }
  }, [auctionPreselect?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredEligible = eligibleDragons.filter(
    (d) => composerRarity === 'ALL' || d.rarity === composerRarity
  );

  const activeDraftDragon =
    filteredEligible.find((d) => d.id === selectedDuckId) ??
    filteredEligible[0] ??
    eligibleDragons.find((d) => d.id === selectedDuckId) ??
    eligibleDragons[0] ??
    null;

  useEffect(() => {
    if (!activeDraftDragon) return;
    if (activeDraftDragon.id !== selectedDuckId) {
      setSelectedDuckId(activeDraftDragon.id);
    }
    const band = calculateDragonUpgradeInvestmentAndPrice(activeDraftDragon);
    setStartPriceInput(band.suggestedStart);
    setBuyNowStarsInput(band.suggestedStars);
  }, [
    activeDraftDragon?.id,
    activeDraftDragon?.level,
    activeDraftDragon?.feedsProgress,
    activeDraftDragon?.customLevel,
    activeDraftDragon?.skillLevel,
    activeDraftDragon?.trainingLevel,
    activeDraftDragon?.gear,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const playerTier = getPlayerTier(state);
  const barterGoldCost = getBarterEnergyForGoldCost(playerTier);
  const barterStarsPayout = getBarterStarsToEnergyPayout(playerTier);

  const visibleLiveAuctions = liveAuctions.filter((a) => {
    if (rarityTab === 'MY_MARKET') {
      return Boolean(
        currentUid &&
          (a.sellerUid === currentUid || a.highestBidderUid === currentUid || a.winnerUid === currentUid)
      );
    }
    if (rarityTab === 'ALL') {
      return a.status === 'ACTIVE';
    }
    return a.rarity === rarityTab && a.status === 'ACTIVE';
  });

  const renderAuctionComposer = () => {
    const band = activeDraftDragon ? calculateDragonUpgradeInvestmentAndPrice(activeDraftDragon) : null;
    const clampedStart = band
      ? Math.max(band.minStart, Math.min(band.maxStart, Math.round(startPriceInput || band.suggestedStart)))
      : 500;
    const clampedStars = band
      ? Math.max(band.minStars, Math.min(band.maxStars, Math.round(buyNowStarsInput || band.suggestedStars)))
      : 20;
    const listingFee = Math.min(state.corn, calculateAuctionListingFee(clampedStart));
    const netEstimate = calculateAuctionNetProceeds(clampedStart);

    return (
      <div className="bg-[#181b24] border border-amber-400/35 rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <Gavel className="w-4 h-4 text-amber-400" />
              <span>بيع تنينك في مزاد اللاعبين (أونلاين)</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.playTabSwitch();
              setShowListComposer((v) => !v);
            }}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{showListComposer ? 'إخفاء' : 'اعرض تنين'}</span>
          </button>
        </div>

        {showListComposer && (
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-3">
            {eligibleDragons.length === 0 ? (
              <p className="text-xs text-amber-300 text-center py-2">
                يجب أن تمتلك تنينين على الأقل (وغير مشغولين بالتزاوج) لعرض أحدهم في المزاد.
              </p>
            ) : (
              <>
                {/* Classification Filter Tabs */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">حدد التنين حسب التصنيف:</span>
                    <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                      {(['ALL', 'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            soundFX.playTabSwitch();
                            setComposerRarity(r);
                          }}
                          className={`px-2 py-0.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                            composerRarity === r
                              ? 'bg-amber-400 text-slate-950 border-amber-300'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {r === 'ALL' ? 'الكل' : RARITY_STYLE[r].labelAr}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pt-1">
                    {filteredEligible.map((d) => {
                      const selected = activeDraftDragon?.id === d.id;
                      const dSize = resolveDragonSize(d);
                      const dRarity = RARITY_STYLE[d.rarity];
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            soundFX.playTabSwitch();
                            setSelectedDuckId(d.id);
                          }}
                          className={`p-2 rounded-xl border text-right flex items-center gap-2 cursor-pointer transition-all ${
                            selected
                              ? 'bg-amber-400/20 border-amber-400 ring-1 ring-amber-400/50'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <DragonIllustration
                            skin={d.skin}
                            rarity={d.rarity}
                            level={d.level}
                            customLevel={d.customLevel}
                            showEvolutionEffects={true}
                            className="w-10 h-10 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black text-white truncate">
                              {d.name} {dSize !== 'NORMAL' ? `(${dSize})` : ''}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[10px] font-bold ${dRarity.color}`}>
                                {dRarity.labelAr}
                              </span>
                              <span className="text-[10px] font-mono-num text-slate-400">
                                · L{d.level} · ★{d.customLevel ?? 0}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {band && activeDraftDragon && (
                  <div className="space-y-3">
                    {/* Dragon Classification & Valuation Banner */}
                    <div className="rounded-2xl bg-slate-950/90 border border-amber-400/30 p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-[10px] font-black text-amber-300">
                            التصنيف: {RARITY_STYLE[activeDraftDragon.rarity].labelAr}
                          </span>
                          <span className="text-[11px] font-black text-emerald-300 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>سعر السوق الافتتاحي</span>
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono-num font-black text-xs">
                          {band.suggestedStart.toLocaleString()} ⚡
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px] font-mono-num">
                        <div className="rounded-lg bg-slate-900 px-2 py-1 flex items-center justify-between">
                          <span className="text-slate-400">إطعام المستويات:</span>
                          <span className="text-amber-300 font-bold">{band.breakdown.levelFeedsEnergy.toLocaleString()}⚡</span>
                        </div>
                        <div className="rounded-lg bg-slate-900 px-2 py-1 flex items-center justify-between">
                          <span className="text-slate-400">المهارات والتدريب:</span>
                          <span className="text-sky-300 font-bold">
                            {(band.breakdown.skillsEquivalent + band.breakdown.trainingEnergy).toLocaleString()}⚡
                          </span>
                        </div>
                        <div className="rounded-lg bg-slate-900 px-2 py-1 flex items-center justify-between">
                          <span className="text-slate-400">التخصيص والعتاد:</span>
                          <span className="text-indigo-300 font-bold">
                            +{(band.breakdown.customStarsEquivalent + band.breakdown.sizeAndGearBonus).toLocaleString()}⚡
                          </span>
                        </div>
                      </div>

                      {/* 30-Second Auction Logic Rules Card */}
                      <div className="rounded-xl bg-slate-900/90 border border-amber-400/25 p-2.5 space-y-1 text-[11px] leading-relaxed">
                        <div className="flex items-center gap-1.5 font-black text-amber-300">
                          <Timer className="w-3.5 h-3.5 text-amber-400" />
                          <span>منطق المزاد التلقائي (30 ثانية):</span>
                        </div>
                        <p className="text-[10px] text-slate-300">
                          يبدأ المزاد بالسعر المحسوب ({clampedStart.toLocaleString()}⚡) لمدة 30 ثانية؛ إذا لم يزايد أحد ينخفض السعر 5% كل 30 ثانية. وعند أول مزايدة يرتفع السعر 5% ويبدأ عداد 30 ثانية جديد، وإذا لم يزايد أحد ينتقل التنين للمشتري الجديد فوراً.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <label className="block space-y-1">
                        <span className="text-[11px] font-bold text-slate-300">
                          سعر الافتتاح المخصص (⚡ اختياري)
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
                          الشراء الفوري بالنجوم (★)
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
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-[11px] font-mono-num">
                  <span className="text-amber-300">رسوم العرض: {listingFee.toLocaleString()} ⚡</span>
                  <span className="text-emerald-400">
                    صافي الاستلام المقدر (-8% ضريبة): +{netEstimate.net.toLocaleString()} ⚡
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!activeDraftDragon || busyAuctionId === 'CREATE'}
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
                    activeDraftDragon && busyAuctionId !== 'CREATE'
                      ? 'bg-gradient-to-b from-amber-400 to-yellow-500 text-slate-950 hover:brightness-105 cursor-pointer shadow-lg'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Gavel className="w-4 h-4" />
                  <span>
                    {busyAuctionId === 'CREATE'
                      ? 'جارٍ النشر في المزاد...'
                      : `نشر ${activeDraftDragon ? activeDraftDragon.name : 'التنين'} في المزاد بسعر ${clampedStart.toLocaleString()} ⚡`}
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
    const bidCost = a.currentCornPrice;
    const isSold = a.status === 'SOLD' || a.auctionPhase === 'SOLD';
    const canCancel = isSeller && a.status === 'ACTIVE' && a.bidCount === 0;
    const canBuyerClaim =
      !a.buyerClaimed &&
      isHighestBidder &&
      a.bidCount > 0 &&
      (isSold || (a.status === 'ACTIVE' && expired));
    const canSellerClaim =
      isSeller &&
      !a.sellerClaimed &&
      (isSold || (a.status === 'ACTIVE' && expired && a.bidCount > 0));
    const dSize = a.dragon.sizeTier ?? 'NORMAL';
    const busy = busyAuctionId === a.id;

    return (
      <div key={a.id} className={`rounded-3xl border realistic-card ${st.border} p-4 space-y-3.5 shadow-xl`}>
        {/* Dragon Header & Classification */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-md border text-[10.5px] font-black ${st.bg} ${st.border} ${st.color}`}>
                التصنيف: {st.labelAr}
              </span>
              <span className="font-mono-num text-xs font-bold text-slate-300">
                LVL {a.dragon.level} {dSize !== 'NORMAL' ? `· ${dSize}` : ''} ★{a.dragon.customLevel ?? 0}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-[9.5px] font-black text-emerald-300">
                مزاد أونلاين
              </span>
            </div>

            <div className="text-base font-black text-white truncate">{a.dragon.name}</div>

            <div className="text-[11px] text-slate-400 font-mono-num flex flex-wrap gap-2">
              <span>
                البائع: <span className="text-slate-300 font-bold">{a.sellerName}</span>
              </span>
              {a.highestBidderName ? (
                <span>
                  · أعلى مزايد: <span className="text-amber-300 font-bold">{a.highestBidderName}</span>
                </span>
              ) : (
                <span className="text-slate-500">· لم يزايد أحد بعد</span>
              )}
            </div>

            {/* Dragon Stats preview */}
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono-num pt-0.5">
              <span>تصنيف القوة: {a.dragon.powerRating ?? (RARITY_STYLE[a.rarity].basePower + a.dragon.level * 25)}</span>
              <span>·</span>
              <span>المهارة: Lv.{a.dragon.skillLevel ?? 0}</span>
              <span>·</span>
              <span>التدريب: Lv.{a.dragon.trainingLevel ?? 0}</span>
            </div>

            {a.valuation && (
              <div className="text-[10px] font-mono-num text-emerald-400/90 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-2 py-1 inline-block">
                السعر السوقي التلقائي: {a.valuation.suggestedStartCorn.toLocaleString()}⚡
              </div>
            )}
          </div>

          <DragonIllustration
            skin={a.dragon.skin}
            rarity={a.rarity}
            level={a.dragon.level}
            customLevel={a.dragon.customLevel ?? 0}
            showEvolutionEffects={true}
            className="w-20 h-20 shrink-0 object-contain drop-shadow-md"
          />
        </div>

        {/* Dynamic 30-Second Auction Clock & Highlighted Price Bar with CSS Animations */}
        <div className="rounded-2xl p-3 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-400/50 shadow-[0_0_18px_rgba(251,191,36,0.22)] relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-300">السعر الحالي:</span>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/80 border border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.3)] animate-pulse">
                <CornIcon className="w-4 h-4 text-amber-400" />
                <span className="text-base font-black text-amber-300 font-mono-num tracking-wide">
                  {formatCompactNumber(a.currentCornPrice)} ⚡
                </span>
                {a.lastPriceDirection === 'UP' && (
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                    +5% ارتفع
                  </span>
                )}
                {a.lastPriceDirection === 'DOWN' && (
                  <span className="text-[10px] font-black text-sky-400 bg-sky-500/15 px-1.5 py-0.5 rounded">
                    -5% انخفض
                  </span>
                )}
              </div>
            </div>

            {/* 30-Second Dynamic Countdown Indicator */}
            <Auction30sBadge
              cycleEndsAtMs={a.cycleEndsAtMs}
              createdAtMs={a.createdAtMs}
              bidCount={a.bidCount}
              status={a.status}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-amber-400/20 text-slate-400 font-mono-num">
            <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-slate-400" />
              <span>إجمالي وقت العرض:</span>
              <AuctionCountdown endsAtMs={a.endsAtMs} compact />
            </div>
            <div className="flex items-center gap-2">
              {isHighestBidder && <span className="text-emerald-400 font-black">أنت المتصدر حالياً! ★</span>}
              {isSeller && <span className="text-amber-300 font-black">تنينك المعروض</span>}
              <div className="flex items-center gap-1 text-indigo-300 font-bold">
                <StarIcon className="w-3.5 h-3.5" />
                <span>شراء فوري: {a.buyNowStars}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!isSeller && a.status === 'ACTIVE' && !expired && !isSold && (
            <>
              <button
                type="button"
                disabled={!isSignedIn || isHighestBidder || state.corn < bidCost || busy}
                onClick={async () => {
                  if (!onBidLiveAuction) return;
                  setBusyAuctionId(a.id);
                  try {
                    await onBidLiveAuction(a.id);
                  } finally {
                    setBusyAuctionId(null);
                  }
                }}
                className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                  isSignedIn && !isHighestBidder && state.corn >= bidCost && !busy
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.35)] hover:brightness-110 active:scale-95 cursor-pointer animate-pulse'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Gavel className="w-4 h-4" />
                <span className="font-mono-num">
                  {isHighestBidder
                    ? 'أنت أعلى مزايد (ينتقل إليك عند انتهاء الـ 30ث)'
                    : a.bidCount === 0
                      ? `شراء / بدء المزايدة بسعر ${formatCompactNumber(bidCost)} ⚡`
                      : `زايد الآن وارفع السعر (+5%) بسعر ${formatCompactNumber(bidCost)} ⚡`}
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
                className={`min-h-[44px] py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                  isSignedIn && state.stars >= a.buyNowStars && !busy
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg cursor-pointer active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <StarIcon className="w-4 h-4 text-yellow-300" />
                <span className="font-mono-num">شراء فوري {a.buyNowStars} ★</span>
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
              className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg hover:brightness-105 active:scale-95 animate-bounce"
            >
              🎉 مبروك! فزت بالمزاد بعد انتهاء الـ 30 ثانية · استلم التنين الآن 🐉
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
              className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg hover:brightness-105 active:scale-95"
            >
              💰 تحصيل أرباح البيع بالمزاد (صافي بعد ضريبة 8%)
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
              className="w-full min-h-[40px] py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-rose-400 text-slate-200 font-bold text-xs cursor-pointer transition-colors"
            >
              {expired ? 'انتهى العرض بدون مزايدة · استرداد التنين' : 'إلغاء المزاد واسترداد التنين إلى حظيرتك'}
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
          المتجر والحزم
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
          {/* Store Packages */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>حزم المتجر الرسمية</span>
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
                      <span className="font-mono-num text-xs font-bold text-amber-300">
                        متاح فوري
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white">{pkg.title}</h4>
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
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <PlayCircle className="w-4 h-4 text-emerald-400" />
                <span>مكافآت الإعلانات الاختيارية</span>
              </h3>
              <span className="font-mono-num text-xs font-black text-amber-300 shrink-0">
                {state.treasury.adsWatchedToday} / {state.treasury.maxAdsPerDay} اليوم
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { kind: 'energy' as const, title: `+${ECONOMY_LIMITS.AD_ENERGY_REWARD} طعام تنين 🍖`, sub: 'إطعام سريع' },
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
          <DragonExchangeIndex
            liveAuctions={liveAuctions}
            selectedRarity={rarityTab}
            onSelectRarity={(r) => {
              soundFX.playTabSwitch();
              setRarityTab(r);
            }}
          />

          <div className="grid grid-cols-4 sm:flex sm:flex-wrap sm:items-center gap-1.5 pb-2.5 mb-3 border-b border-slate-800 shrink-0">
            {(['ALL', 'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MY_MARKET'] as const).map((tab) => {
              const active = rarityTab === tab;
              const label =
                tab === 'ALL' ? 'الكل' : tab === 'MY_MARKET' ? 'سوقي ومزادي' : RARITY_STYLE[tab].labelAr;
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
                  <h3 className="text-sm font-black text-amber-300">مقايضة الموارد (الرتبة {playerTier})</h3>
                  <span className="font-mono-num text-[11px] font-bold text-slate-400">
                    متوازن ضد التضخم
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    disabled={state.corn < barterGoldCost}
                    onClick={() => onBarterTrade('CORN_TO_GOLD')}
                    className={`min-h-[44px] py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-between border ${
                      state.corn >= barterGoldCost
                        ? 'bg-slate-900 border-slate-700 hover:border-amber-400 text-white cursor-pointer'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span className="flex items-center gap-1 font-mono-num">
                      <CornIcon className="w-3.5 h-3.5" /> {barterGoldCost.toLocaleString()} طعام
                    </span>
                    <span className="flex items-center gap-1 text-amber-300 font-mono-num">
                      ← +12 💎
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
                <h3 className="text-sm font-black text-white mb-2.5">البيع الفوري للخزينة (طعام تنين)</h3>
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
                            rarity={d.rarity}
                            level={d.level}
                            customLevel={d.customLevel}
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
              {visibleLiveAuctions.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-black text-emerald-300 px-1">
                    مزادات اللاعبين الحية · {rarityTab === 'ALL' ? 'جميع التصنيفات' : RARITY_STYLE[rarityTab].labelAr} ({visibleLiveAuctions.length})
                  </div>
                  {visibleLiveAuctions.map(renderLiveAuctionCard)}
                </div>
              ) : (
                <div className="rounded-3xl bg-[#181b24] border border-slate-800 p-6 text-center space-y-2">
                  <Gavel className="w-9 h-9 text-slate-500 mx-auto" />
                  <div className="text-sm font-black text-white">
                    لا توجد مزادات نشطة حالياً في {rarityTab === 'ALL' ? 'السوق' : `فئة ${RARITY_STYLE[rarityTab].labelAr}`}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

