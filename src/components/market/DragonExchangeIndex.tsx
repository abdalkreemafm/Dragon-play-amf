import React, { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from 'lucide-react';
import { DragonAuctionRecord, Rarity } from '../../types/game';
import { RARITY_STYLE, formatCompactNumber } from '../../data/gameData';

interface DragonExchangeIndexProps {
  liveAuctions: DragonAuctionRecord[];
  selectedRarity: 'ALL' | Rarity | 'MY_MARKET';
  onSelectRarity: (rarity: 'ALL' | Rarity | 'MY_MARKET') => void;
}

const RARITY_TICKERS: Array<{
  rarity: Rarity;
  code: string;
  baseIndexCorn: number;
}> = [
  { rarity: 'COMMON', code: 'CMN', baseIndexCorn: 450 },
  { rarity: 'UNCOMMON', code: 'UNC', baseIndexCorn: 1100 },
  { rarity: 'RARE', code: 'RAR', baseIndexCorn: 2800 },
  { rarity: 'EPIC', code: 'EPC', baseIndexCorn: 7500 },
  { rarity: 'LEGENDARY', code: 'LGD', baseIndexCorn: 20000 },
];

export const DragonExchangeIndex: React.FC<DragonExchangeIndexProps> = ({
  liveAuctions,
  selectedRarity,
  onSelectRarity,
}) => {
  const analytics = useMemo(() => {
    const activeAuctions = liveAuctions.filter((a) => a.status === 'ACTIVE');
    const soldAuctions = liveAuctions.filter((a) => a.status === 'SOLD');
    const marketSample = [...activeAuctions, ...soldAuctions];

    // Scope sample when a single rarity is selected, otherwise aggregate whole market
    const scopedSample =
      selectedRarity !== 'ALL' && selectedRarity !== 'MY_MARKET'
        ? marketSample.filter((a) => a.rarity === selectedRarity)
        : marketSample;

    const scopedActive =
      selectedRarity !== 'ALL' && selectedRarity !== 'MY_MARKET'
        ? activeAuctions.filter((a) => a.rarity === selectedRarity)
        : activeAuctions;

    // Compute real weighted DRX index against fair market valuations
    let totalCurrent = 0;
    let totalBaseline = 0;
    let totalBids = 0;
    let upCount = 0;
    let downCount = 0;

    for (const a of scopedSample) {
      const base =
        a.valuation?.suggestedStartCorn ||
        a.startCornPrice ||
        RARITY_TICKERS.find((t) => t.rarity === a.rarity)?.baseIndexCorn ||
        1000;
      totalCurrent += a.currentCornPrice;
      totalBaseline += base;
      totalBids += a.bidCount;
      if (a.lastPriceDirection === 'UP') upCount += 1;
      else if (a.lastPriceDirection === 'DOWN') downCount += 1;
    }

    const fallbackBase =
      selectedRarity !== 'ALL' && selectedRarity !== 'MY_MARKET'
        ? RARITY_TICKERS.find((t) => t.rarity === selectedRarity)?.baseIndexCorn ?? 1000
        : 1000;

    const ratio = totalBaseline > 0 ? totalCurrent / totalBaseline : 1;
    const indexPoints = Number((1000 * ratio).toFixed(2));
    const changePct = Number(((ratio - 1) * 100).toFixed(2));
    const totalMarketCap = scopedActive.reduce((sum, a) => sum + a.currentCornPrice, 0);
    const avgPrice =
      scopedSample.length > 0 ? Math.round(totalCurrent / scopedSample.length) : fallbackBase;

    const trend: 'UP' | 'DOWN' | 'FLAT' =
      changePct > 0.05 || upCount > downCount
        ? 'UP'
        : changePct < -0.05 || downCount > upCount
          ? 'DOWN'
          : 'FLAT';

    // Build chronological price-ratio curve from real auctions (minimum 7 points for clean chart axis)
    const chronological = [...scopedSample].sort(
      (a, b) => (a.createdAtMs ?? a.endsAtMs) - (b.createdAtMs ?? b.endsAtMs)
    );

    const series: Array<{ value: number; volume: number; label: string }> = [];
    if (chronological.length === 0) {
      // Quiet baseline flatline at 1000.00 index when market is awaiting first listing
      for (let i = 0; i < 8; i += 1) {
        series.push({ value: 1000, volume: 0, label: `T-${8 - i}` });
      }
    } else {
      series.push({ value: 1000, volume: 0, label: 'الافتتاح' });
      let runningRatioSum = 0;
      chronological.forEach((a, idx) => {
        const base =
          a.valuation?.suggestedStartCorn ||
          a.startCornPrice ||
          RARITY_TICKERS.find((t) => t.rarity === a.rarity)?.baseIndexCorn ||
          1000;
        const pointRatio = (a.currentCornPrice / Math.max(1, base)) * 1000;
        runningRatioSum += pointRatio;
        const cumulativeAvg = runningRatioSum / (idx + 1);
        series.push({
          value: Number(cumulativeAvg.toFixed(2)),
          volume: Math.max(1, a.bidCount + (a.status === 'SOLD' ? 2 : 1)),
          label: a.dragon.name,
        });
      });
      // Ensure smooth multi-point visual density when few auctions are live
      while (series.length < 6) {
        const prev = series[series.length - 1];
        series.unshift({ value: 1000, volume: 0, label: 'الافتتاح' });
        if (series.length < 6) {
          series.push({ ...prev });
        }
      }
    }

    // Per-classification live ticker metrics
    const tickers = RARITY_TICKERS.map((t) => {
      const tierAuctions = marketSample.filter((a) => a.rarity === t.rarity);
      const activeTier = activeAuctions.filter((a) => a.rarity === t.rarity);
      if (tierAuctions.length === 0) {
        return {
          ...t,
          labelAr: RARITY_STYLE[t.rarity].labelAr,
          colorClass: RARITY_STYLE[t.rarity].color,
          price: t.baseIndexCorn,
          pct: 0,
          activeCount: 0,
        };
      }
      const sumCurr = tierAuctions.reduce((s, a) => s + a.currentCornPrice, 0);
      const sumStart = tierAuctions.reduce(
        (s, a) => s + (a.valuation?.suggestedStartCorn || a.startCornPrice || t.baseIndexCorn),
        0
      );
      const tierAvg = Math.round(sumCurr / tierAuctions.length);
      const tierPct = Number((((sumCurr / Math.max(1, sumStart)) - 1) * 100).toFixed(1));
      return {
        ...t,
        labelAr: RARITY_STYLE[t.rarity].labelAr,
        colorClass: RARITY_STYLE[t.rarity].color,
        price: tierAvg,
        pct: tierPct,
        activeCount: activeTier.length,
      };
    });

    return {
      indexPoints,
      changePct,
      trend,
      totalMarketCap,
      avgPrice,
      tradeCount: soldAuctions.length + totalBids,
      activeCount: scopedActive.length,
      series,
      tickers,
    };
  }, [liveAuctions, selectedRarity]);

  // SVG Chart Geometry
  const svgW = 560;
  const svgH = 112;
  const padX = 6;
  const padTop = 10;
  const padBottom = 22;
  const values = analytics.series.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const span = Math.max(20, maxVal - minVal);
  const yMin = minVal - span * 0.15;
  const yMax = maxVal + span * 0.15;
  const plotH = svgH - padTop - padBottom;
  const maxVol = Math.max(1, ...analytics.series.map((p) => p.volume));

  const coords = analytics.series.map((pt, i) => {
    const x =
      analytics.series.length > 1
        ? padX + (i / (analytics.series.length - 1)) * (svgW - padX * 2)
        : svgW / 2;
    const y = padTop + (1 - (pt.value - yMin) / Math.max(1, yMax - yMin)) * plotH;
    return { x, y, volume: pt.volume, value: pt.value };
  });

  const linePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath =
    coords.length > 0
      ? `M ${coords[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} L ${coords
          .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
          .join(' L ')} L ${coords[coords.length - 1].x.toFixed(1)},${(padTop + plotH).toFixed(1)} Z`
      : '';

  const strokeColor =
    analytics.trend === 'UP' ? '#34d399' : analytics.trend === 'DOWN' ? '#fb7185' : '#fbbf24';
  const gradId = `drxGrad_${analytics.trend}`;

  const activeCategoryLabel =
    selectedRarity === 'ALL' || selectedRarity === 'MY_MARKET'
      ? 'المؤشر العام (DRX)'
      : `مؤشر ${RARITY_STYLE[selectedRarity].labelAr}`;

  return (
    <section
      aria-label="المؤشر السوقي لبورصة التنانين"
      className="rounded-3xl bg-[#121621] border border-slate-800/90 p-4 sm:p-5 space-y-4 mb-3.5"
    >
      {/* Exchange Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-slate-200">{activeCategoryLabel}</span>
            <span aria-hidden="true">·</span>
            <span>السوق الفوري 30ث</span>
          </div>

          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-mono-num text-2xl sm:text-3xl font-black text-white tracking-tight">
              {analytics.indexPoints.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span
              className={`font-mono-num text-xs sm:text-sm font-black inline-flex items-center gap-0.5 ${
                analytics.changePct > 0
                  ? 'text-emerald-400'
                  : analytics.changePct < 0
                    ? 'text-rose-400'
                    : 'text-slate-400'
              }`}
            >
              {analytics.changePct > 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : analytics.changePct < 0 ? (
                <ArrowDownRight className="w-4 h-4" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              {analytics.changePct > 0 ? '+' : ''}
              {analytics.changePct.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => onSelectRarity('ALL')}
            className={`min-h-[34px] px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
              selectedRarity === 'ALL'
                ? 'bg-slate-800 text-amber-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المؤشر العام
          </button>
          <button
            type="button"
            onClick={() => onSelectRarity('MY_MARKET')}
            className={`min-h-[34px] px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
              selectedRarity === 'MY_MARKET'
                ? 'bg-slate-800 text-amber-300'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            صفقاتي
          </button>
        </div>
      </div>

      {/* Exchange Price & Volume Chart */}
      <div className="relative w-full">
        <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-500 mb-1">
          <span>أعلى: {maxVal.toFixed(1)}</span>
          <span>أدنى: {minVal.toFixed(1)}</span>
        </div>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-28 overflow-visible"
          role="img"
          aria-label="مخطط حركة مؤشر مزاد التنانين"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Hairline horizontal grid */}
          {[0.25, 0.5, 0.75, 1].map((frac) => {
            const gy = padTop + frac * plotH;
            return (
              <line
                key={frac}
                x1={padX}
                y1={gy}
                x2={svgW - padX}
                y2={gy}
                stroke="rgba(148,163,184,0.12)"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Baseline 1000 reference */}
          {1000 >= yMin && 1000 <= yMax && (
            <line
              x1={padX}
              y1={padTop + (1 - (1000 - yMin) / Math.max(1, yMax - yMin)) * plotH}
              x2={svgW - padX}
              y2={padTop + (1 - (1000 - yMin) / Math.max(1, yMax - yMin)) * plotH}
              stroke="rgba(251,191,36,0.28)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          )}

          {/* Volume histogram bars along bottom */}
          {coords.map((c, idx) => {
            if (c.volume <= 0) return null;
            const barH = Math.max(3, (c.volume / maxVol) * 14);
            return (
              <rect
                key={`vol_${idx}`}
                x={c.x - 4}
                y={svgH - barH}
                width="8"
                height={barH}
                rx="2"
                fill="rgba(148,163,184,0.24)"
              />
            );
          })}

          {/* Area & Price Curve */}
          {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
          {linePoints && (
            <polyline
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={linePoints}
            />
          )}

          {/* Latest Price Node */}
          {coords.length > 0 && (
            <circle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r="4"
              fill={strokeColor}
              stroke="#121621"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      {/* Market Breadth Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2.5 pt-3 border-t border-slate-800/80 text-xs">
        <div className="px-2 sm:border-l sm:border-slate-800/80 first:border-l-0">
          <div className="text-[11px] text-slate-400">القيمة السوقية النشطة</div>
          <div className="font-mono-num font-black text-white mt-0.5">
            {formatCompactNumber(analytics.totalMarketCap)} ⚡
          </div>
        </div>
        <div className="px-2 sm:border-l sm:border-slate-800/80">
          <div className="text-[11px] text-slate-400">متوسط السعر السوقي</div>
          <div className="font-mono-num font-black text-amber-300 mt-0.5">
            {formatCompactNumber(analytics.avgPrice)} ⚡
          </div>
        </div>
        <div className="px-2 sm:border-l sm:border-slate-800/80">
          <div className="text-[11px] text-slate-400">حجم المزايدات والصفقات</div>
          <div className="font-mono-num font-black text-white mt-0.5">
            {analytics.tradeCount} عملية · {analytics.activeCount} نشط
          </div>
        </div>
        <div className="px-2">
          <div className="text-[11px] text-slate-400">زخم السوق</div>
          <div
            className={`font-black mt-0.5 ${
              analytics.trend === 'UP'
                ? 'text-emerald-400'
                : analytics.trend === 'DOWN'
                  ? 'text-rose-400'
                  : 'text-amber-300'
            }`}
          >
            {analytics.trend === 'UP'
              ? 'صاعد (طلب مرتفع)'
              : analytics.trend === 'DOWN'
                ? 'هابط (تخفيض 30ث)'
                : 'مستقر (توازن)'}
          </div>
        </div>
      </div>

      {/* Interactive Classification Stock Tickers */}
      <div className="pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
          <span>مؤشرات التصنيفات المدرجة (اضغط للتصفية)</span>
          <span className="font-mono-num">السعر بالـ ⚡ / التغير</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {analytics.tickers.map((t) => {
            const active = selectedRarity === t.rarity;
            return (
              <button
                key={t.rarity}
                type="button"
                onClick={() => onSelectRarity(t.rarity)}
                className={`min-h-[52px] px-2.5 py-2 rounded-xl border text-right transition-colors cursor-pointer flex flex-col justify-between ${
                  active
                    ? 'bg-slate-800/95 border-amber-400/60'
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className={`text-[11px] font-black ${t.colorClass}`}>{t.labelAr}</span>
                  <span className="font-mono-num text-[10px] text-slate-500">{t.code}</span>
                </div>
                <div className="flex items-baseline justify-between gap-1 w-full mt-1 font-mono-num">
                  <span className="text-xs font-black text-white">
                    {formatCompactNumber(t.price)}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      t.pct > 0
                        ? 'text-emerald-400'
                        : t.pct < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {t.pct > 0 ? `+${t.pct}%` : `${t.pct}%`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
