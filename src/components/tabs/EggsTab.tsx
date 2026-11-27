import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Coins,
  Flame,
  Hammer,
  Lock,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { EggItemType, GameState, GodOrder } from '../../types/game';
import {
  ACTIVE_SEASON,
  EGG_ITEM_META,
  TOURNAMENT_MILESTONES,
  formatTimer,
} from '../../data/gameData';
import {
  ECONOMY_LIMITS,
  getEggSellReward,
} from '../../utils/economyEngine';
import { ItemIcon } from '../art/DuckArt';
import { TempleAltarBackdrop } from '../art/SceneBackdrops';
import { soundFX } from '../../utils/sound';

interface EggsTabProps {
  state: GameState;
  blitzSecLeft: number;
  onStartBlitz: () => void;
  onAutoMergeBoard: () => number;
  onUseHammerOnCell: (cellIndex: number) => void;
  onMergeCells: (fromIndex: number, toIndex: number) => void;
  onPlaceQueuedEgg: (targetIndex?: number) => void;
  onPlaceAllQueuedEggs: () => void;
  onSellGridItem: (cellIndex: number) => void;
  onSellQueuedEgg: (queueIndex: number) => void;
  onDeliverToGod: (orderId: string, cellIndex?: number) => void;
  onOpenSnackChest: (cellIndex: number, earlyOpen?: boolean) => void;
  onUnlockGridSlot: (cellIndex: number) => void;
  onOpenTournament: () => void;
}

const ITEM_TIER_ACCENT: Record<EggItemType, string> = {
  egg_1: 'bg-amber-500/20 border-amber-400/40 text-amber-200',
  egg_2: 'bg-sky-500/20 border-sky-400/40 text-sky-200',
  egg_3: 'bg-purple-500/20 border-purple-400/40 text-purple-200',
  egg_4: 'bg-emerald-500/20 border-emerald-400/45 text-emerald-200',
  egg_5: 'bg-orange-500/25 border-orange-400/50 text-orange-200',
  egg_6: 'bg-rose-500/25 border-rose-400/50 text-rose-200',
  egg_7: 'bg-cyan-500/25 border-cyan-300/60 text-cyan-100',
  egg_8: 'bg-indigo-500/25 border-indigo-300/65 text-indigo-100',
  egg_9: 'bg-violet-500/30 border-violet-300/70 text-violet-100',
  egg_10: 'bg-amber-500/30 border-amber-300/75 text-amber-100',
  egg_love: 'bg-pink-500/30 border-pink-300/75 text-pink-100',
  grapes: 'bg-violet-500/20 border-violet-400/40 text-violet-200',
  chalice: 'bg-amber-500/25 border-amber-300/50 text-amber-100',
  cornucopia: 'bg-emerald-500/25 border-emerald-300/50 text-emerald-100',
  feast: 'bg-rose-500/25 border-amber-300/65 text-amber-100',
  chest: 'bg-amber-500/25 border-amber-400/60 text-amber-200',
};

const CELL_TIER_PILL: Record<EggItemType, string> = {
  egg_1: 'bg-amber-950/90 text-amber-200 border-amber-500/40',
  egg_2: 'bg-sky-950/90 text-sky-200 border-sky-400/40',
  egg_3: 'bg-purple-950/90 text-purple-200 border-purple-400/45',
  egg_4: 'bg-emerald-950/90 text-emerald-200 border-emerald-400/50',
  egg_5: 'bg-orange-950/90 text-orange-200 border-orange-400/55',
  egg_6: 'bg-rose-950/90 text-rose-200 border-rose-400/60',
  egg_7: 'bg-cyan-950/90 text-cyan-200 border-cyan-300/65',
  egg_8: 'bg-indigo-950/90 text-indigo-200 border-indigo-300/70',
  egg_9: 'bg-violet-950/90 text-violet-200 border-violet-300/75',
  egg_10: 'bg-amber-950/95 text-amber-100 border-amber-300/80',
  egg_love: 'bg-pink-950/95 text-pink-100 border-pink-300/80',
  grapes: 'bg-violet-950/90 text-violet-200 border-violet-400/45',
  chalice: 'bg-amber-950/90 text-amber-200 border-amber-400/55',
  cornucopia: 'bg-emerald-950/90 text-emerald-200 border-emerald-400/55',
  feast: 'bg-rose-950/90 text-amber-100 border-amber-300/70',
  chest: 'bg-amber-400 text-slate-950 border-amber-200',
};

interface ChestCellBadgeProps {
  readyAt: number;
}

const ChestCellBadge: React.FC<ChestCellBadgeProps> = React.memo(({ readyAt }) => {
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const current = Date.now();
    setNowTs(current);
    if (readyAt <= current) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNowTs(t);
      if (t >= readyAt) {
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [readyAt]);

  const chestSecLeft = Math.max(0, Math.ceil((readyAt - nowTs) / 1000));

  return (
    <span
      className={`absolute -bottom-0.5 inset-x-0.5 text-[7px] font-mono-num font-black rounded text-center leading-tight py-0.5 border pointer-events-none ${
        chestSecLeft > 0
          ? 'bg-slate-950/90 text-amber-300 border-amber-400/40'
          : 'bg-amber-400 text-slate-950 border-amber-200 font-extrabold'
      }`}
    >
      {chestSecLeft > 0 ? formatTimer(chestSecLeft) : 'جاهز!'}
    </span>
  );
});

interface ChestModalProps {
  cellIndex: number;
  readyAt: number;
  discountLeft: number;
  stars: number;
  onClose: () => void;
  onOpenChest: (cellIndex: number, earlyOpen: boolean) => void;
}

const ChestModal: React.FC<ChestModalProps> = ({
  cellIndex,
  readyAt,
  discountLeft,
  stars,
  onClose,
  onOpenChest,
}) => {
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const current = Date.now();
    setNowTs(current);
    if (readyAt <= current) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNowTs(t);
      if (t >= readyAt) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [readyAt]);

  const chestSecLeft = Math.max(0, Math.ceil((readyAt - nowTs) / 1000));
  const isExpired = chestSecLeft <= 0;
  const starCost = discountLeft > 0 ? 20 : 39;
  const canAffordStars = stars >= starCost;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#161923] border-t sm:border border-amber-400/50 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Chest Description Card */}
        <div className="rounded-2xl bg-[#1c2131] border border-slate-700/80 p-4 flex items-center gap-3.5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
            <ItemIcon item="chest" className="w-12 h-12" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="text-xs font-black text-amber-400">صندوق الإمداد</div>
            <div className="text-[11px] text-slate-300">
              يمنحك «الوليمة الإلهية» وموارد دمج فورية
            </div>
          </div>
        </div>

        {/* Rarity & Seasonal Banner */}
        <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/30 p-3 space-y-1.5 text-right">
          <div className="flex items-center justify-between text-[11px] font-black text-indigo-300">
            <span>{ACTIVE_SEASON.nameAr}</span>
            <span className="text-amber-300">★ {ACTIVE_SEASON.passTitleAr}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1 text-[9.5px] font-mono-num text-center">
            <div className="rounded-lg bg-slate-900/80 border border-slate-700 py-1 text-slate-300">
              شائع {Math.round((ACTIVE_SEASON.dropRates?.common ?? 0.6) * 100)}%
            </div>
            <div className="rounded-lg bg-sky-950/80 border border-sky-500/40 py-1 text-sky-200">
              نادر {Math.round((ACTIVE_SEASON.dropRates?.rare ?? 0.3) * 100)}%
            </div>
            <div className="rounded-lg bg-amber-950/80 border border-amber-500/40 py-1 text-amber-200">
              ملحمي {Math.round((ACTIVE_SEASON.dropRates?.epic ?? 0.1) * 100)}%
            </div>
          </div>
        </div>

        {/* Timer & Progress Card */}
        <div className="rounded-2xl bg-[#1c2131] border border-slate-700/80 p-4 space-y-2.5 text-center">
          <div className="text-xs font-mono-num font-bold text-amber-300">
            {isExpired
              ? 'الصندوق جاهز للفتح المجاني الآن!'
              : `فتح الصندوق بعد ${formatTimer(chestSecLeft)}`}
          </div>
          <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-[width] duration-300"
              style={{
                width: isExpired
                  ? '100%'
                  : `${Math.max(4, Math.min(100, ((4 * 3600 - chestSecLeft) / (4 * 3600)) * 100))}%`,
              }}
            />
          </div>

          <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/40 p-3 space-y-2 mt-2">
            <button
              disabled={!isExpired && !canAffordStars}
              onClick={() => {
                soundFX.playChestOpen();
                onOpenChest(cellIndex, !isExpired);
                onClose();
              }}
              className={`w-full min-h-[48px] py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-colors duration-150 ${
                isExpired || canAffordStars
                  ? 'bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 hover:brightness-105 cursor-pointer'
                  : 'bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>فتح الصندوق الآن</span>
              <span className="flex items-center gap-1 font-mono-num">
                {!isExpired ? (
                  <>
                    <span className="text-slate-500 line-through text-xs">★39</span>
                    <span className="text-indigo-950 font-black">★{starCost}</span>
                  </>
                ) : (
                  <span className="text-indigo-950 font-black">مجاناً!</span>
                )}
              </span>
            </button>

            <div className="text-[10px] font-mono-num font-extrabold text-emerald-400 text-center">
              أول 10 فتحات بنصف التكلفة · متبقي {discountLeft}/10
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EggsTab: React.FC<EggsTabProps> = ({
  state,
  blitzSecLeft,
  onStartBlitz,
  onAutoMergeBoard,
  onUseHammerOnCell,
  onMergeCells,
  onPlaceQueuedEgg,
  onSellGridItem,
  onSellQueuedEgg,
  onDeliverToGod,
  onOpenSnackChest,
  onUnlockGridSlot,
  onOpenTournament,
}) => {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [selectedQueueIdx, setSelectedQueueIdx] = useState<number | null>(null);
  const [dragFromCell, setDragFromCell] = useState<number | null>(null);
  const [chestModalCell, setChestModalCell] = useState<number | null>(null);
  const [hammerArmed, setHammerArmed] = useState(false);

  const pointerDragRef = useRef<{
    fromIndex: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  const selectedCellItem = selectedCell !== null ? state.grid[selectedCell]?.item ?? null : null;
  const selectedQueueItem =
    selectedQueueIdx !== null ? state.eggQueue[selectedQueueIdx] ?? null : null;
  const inspectedItem: EggItemType | null = selectedCellItem ?? selectedQueueItem ?? null;

  const isBlitz = blitzSecLeft > 0;
  const canAffordBlitz = state.corn >= ECONOMY_LIMITS.BLITZ_ACTIVATION_COST;

  const wantedByGodMap = useMemo(() => {
    const map = new Map<EggItemType, GodOrder>();
    state.godOrders.forEach((ord) => {
      if (!map.has(ord.wantedItem)) {
        map.set(ord.wantedItem, ord);
      }
    });
    return map;
  }, [state.godOrders]);

  const findMatchingCellForOrder = (wanted: EggItemType): number => {
    return state.grid.findIndex((c) => !c.locked && c.item === wanted);
  };

  const clearSelection = () => {
    setSelectedCell(null);
    setSelectedQueueIdx(null);
  };

  const lockedCount = state.grid.filter((c) => c.locked).length;
  const extraUnlocked = 21 - lockedCount;
  const starCost = 50 + extraUnlocked * 20;

  const handleCellClick = (index: number) => {
    const cell = state.grid[index];
    if (!cell) return;

    if (cell.locked) {
      onUnlockGridSlot(index);
      if (state.stars >= starCost) soundFX.playClaim();
      return;
    }

    if (hammerArmed) {
      if (cell.item && EGG_ITEM_META[cell.item]?.next) {
        soundFX.playCritHit();
        onUseHammerOnCell(index);
        setHammerArmed(false);
        clearSelection();
        return;
      } else {
        soundFX.playError();
        setHammerArmed(false);
        return;
      }
    }

    if (cell.item === 'chest') {
      soundFX.playTabSwitch();
      setChestModalCell(index);
      clearSelection();
      return;
    }

    if (selectedCell !== null) {
      if (selectedCell === index) {
        clearSelection();
        return;
      }

      const sourceCell = state.grid[selectedCell];
      if (sourceCell && sourceCell.item) {
        onMergeCells(selectedCell, index);
        clearSelection();
        return;
      }
    }

    if (cell.item) {
      soundFX.playTabSwitch();
      setSelectedQueueIdx(null);
      setSelectedCell(index);
    } else {
      if (state.eggQueue.length > 0) {
        soundFX.playTapFeed();
        onPlaceQueuedEgg(index);
      }
      clearSelection();
    }
  };

  const nextMilestone =
    TOURNAMENT_MILESTONES.find((m) => state.tournament.score < m.score)?.score ??
    TOURNAMENT_MILESTONES[TOURNAMENT_MILESTONES.length - 1]?.score ??
    400;

  const inspectedMeta = inspectedItem ? EGG_ITEM_META[inspectedItem] : null;
  const inspectedSellReward =
    inspectedItem && inspectedItem !== 'chest' ? getEggSellReward(inspectedItem) : null;

  const hasQueueRow = state.eggQueue.length > 0;
  const showBottomBar = Boolean(inspectedItem && inspectedMeta) || hasQueueRow;
  const containerWidthClass = 'max-w-[min(480px,max(310px,calc((100dvh-310px)*5/6+104px)))]';
  const chestReadyAt = state.stats.snackChestReadyAt ?? 0;

  return (
    <div className="h-full w-full overflow-y-auto overscroll-y-contain touch-pan-y select-none">
      <div className={`min-h-full w-full ${containerWidthClass} mx-auto px-1.5 sm:px-2.5 pt-1 pb-4 flex flex-col justify-start gap-1.5`}>
        {/* 1. Compact Temple Orders Strip */}
        <section
          className={`relative rounded-2xl p-1.5 overflow-hidden border transition-colors duration-150 shadow-lg shrink-0 ${
            isBlitz ? 'border-amber-400 animate-fever-glow' : 'border-purple-500/35'
          }`}
        >
          <TempleAltarBackdrop isBlitz={isBlitz} />
          <div className="relative z-10 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  onOpenTournament();
                }}
                className="px-2 py-1 rounded-xl bg-slate-900/85 border border-amber-400/40 hover:border-amber-400 flex items-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono-num text-[10px] font-extrabold text-amber-300">
                  {state.tournament.score}/{nextMilestone}
                </span>
              </button>

              <button
                disabled={!isBlitz && !canAffordBlitz}
                onClick={() => {
                  if (!isBlitz) {
                    if (!canAffordBlitz) {
                      soundFX.playError();
                      return;
                    }
                    soundFX.playBlitzStart();
                    onStartBlitz();
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 transition-colors duration-150 ${
                  isBlitz
                    ? 'bg-rose-500 text-white'
                    : canAffordBlitz
                      ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span className="font-mono-num">
                  {isBlitz
                    ? `${Math.ceil(blitzSecLeft)}s 2×`
                    : `موجة 2× (${ECONOMY_LIMITS.BLITZ_ACTIVATION_COST}⚡)`}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {state.godOrders.map((order) => {
                const matchingIdx = findMatchingCellForOrder(order.wantedItem);
                const isReady = matchingIdx !== -1;
                const wantedMeta = EGG_ITEM_META[order.wantedItem];

                return (
                  <div
                    key={order.id}
                    className={`rounded-xl px-1.5 py-1 border transition-colors duration-150 flex items-center justify-between gap-1 ${
                      isReady
                        ? 'bg-emerald-500/20 border-emerald-400/80'
                        : 'bg-slate-950/75 border-slate-700/60'
                    }`}
                  >
                    <div className="relative w-7 h-7 rounded-lg bg-slate-900/95 border border-slate-700 flex items-center justify-center shrink-0">
                      <ItemIcon item={order.wantedItem} className="w-5 h-5" />
                      <span className="absolute -bottom-1 -left-1 px-1 rounded bg-slate-800 border border-slate-600 text-[7px] font-mono-num font-black text-slate-200 leading-none">
                        {wantedMeta.tier}
                      </span>
                    </div>

                    {isReady ? (
                      <button
                        onClick={() => {
                          soundFX.playGodConfirm();
                          onDeliverToGod(order.id, matchingIdx);
                          clearSelection();
                        }}
                        className="flex-1 py-1 px-1 rounded-lg bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 font-black text-[9.5px] leading-tight hover:brightness-105 cursor-pointer flex items-center justify-center gap-0.5"
                      >
                        <Check className="w-3 h-3 stroke-[3] shrink-0" />
                        <span>تسليم</span>
                      </button>
                    ) : (
                      <div className="flex-1 text-left leading-tight min-w-0">
                        <div className="font-mono-num text-[9.5px] font-black text-emerald-300 truncate">
                          +{order.cornReward}⚡
                        </div>
                        <div className="font-mono-num text-[8.5px] font-bold text-amber-300 truncate">
                          +{isBlitz ? order.trophyPoints * 2 : order.trophyPoints}🏆
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2. Single-Screen 5x6 Merge Grid Flush Between Auto-Merge & Hammer */}
        <section className="shrink-0 w-full flex items-stretch gap-1.5 sm:gap-2">
          {/* Right Side (in RTL): Auto-Merge */}
          <button
            type="button"
            onClick={() => {
              const merged = onAutoMergeBoard();
              if (merged > 0) {
                soundFX.playGodConfirm();
                clearSelection();
              } else {
                soundFX.playError();
              }
            }}
            title="دمج تلقائي"
            className="w-11 sm:w-12 shrink-0 py-3 px-1 rounded-2xl bg-indigo-500/20 border border-indigo-500/45 text-indigo-200 hover:bg-indigo-500/30 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors duration-150 shadow-lg"
          >
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[9.5px] font-black leading-tight text-center">
              دمج
              <br />
              تلقائي
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-950/70 border border-indigo-400/30 font-mono-num text-[9.5px] font-black text-amber-300">
              {state.stats.autoMergeBoosters}
            </span>
          </button>

          {/* Center: 5x6 (30-Slot) Merge Grid */}
          <div
            className={`flex-1 min-w-0 bg-[#161923] rounded-2xl p-1.5 shadow-xl border transition-colors duration-150 ${
              hammerArmed
                ? 'border-rose-400'
                : isBlitz
                  ? 'border-amber-400/75'
                  : 'border-slate-800'
            }`}
          >
            <div className="grid grid-cols-5 gap-1">
              {state.grid.map((cell) => {
                const isSelected = selectedCell === cell.index;
                const isMergeCandidate =
                  selectedCell !== null &&
                  selectedCell !== cell.index &&
                  selectedCellItem !== null &&
                  cell.item === selectedCellItem &&
                  Boolean(EGG_ITEM_META[selectedCellItem]?.next);
                const isHammerTarget =
                  hammerArmed && !cell.locked && Boolean(cell.item && EGG_ITEM_META[cell.item]?.next);
                const isWanted = cell.item ? wantedByGodMap.has(cell.item) : false;
                const meta = cell.item ? EGG_ITEM_META[cell.item] : null;

                return (
                  <button
                    key={cell.index}
                    type="button"
                    data-cell-index={cell.index}
                    draggable={!cell.locked && Boolean(cell.item) && cell.item !== 'chest'}
                    onDragStart={() => {
                      if (!cell.locked && cell.item) {
                        setDragFromCell(cell.index);
                        setSelectedQueueIdx(null);
                        setSelectedCell(cell.index);
                      }
                    }}
                    onDragOver={(e) => {
                      if (!cell.locked) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragFromCell !== null && dragFromCell !== cell.index && !cell.locked) {
                        onMergeCells(dragFromCell, cell.index);
                        clearSelection();
                      }
                      setDragFromCell(null);
                    }}
                    onPointerDown={(e) => {
                      if (e.pointerType === 'mouse') return;
                      if (!cell.locked && cell.item && cell.item !== 'chest') {
                        pointerDragRef.current = {
                          fromIndex: cell.index,
                          startX: e.clientX,
                          startY: e.clientY,
                          moved: false,
                        };
                      }
                    }}
                    onPointerMove={(e) => {
                      const drag = pointerDragRef.current;
                      if (!drag || e.pointerType === 'mouse') return;
                      if (
                        !drag.moved &&
                        Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 14
                      ) {
                        drag.moved = true;
                        setDragFromCell(drag.fromIndex);
                        setSelectedQueueIdx(null);
                        setSelectedCell(drag.fromIndex);
                      }
                    }}
                    onPointerUp={(e) => {
                      const drag = pointerDragRef.current;
                      pointerDragRef.current = null;
                      if (!drag || e.pointerType === 'mouse') return;
                      if (drag.moved) {
                        suppressNextClickRef.current = true;
                        const el = document
                          .elementFromPoint(e.clientX, e.clientY)
                          ?.closest('[data-cell-index]');
                        const targetAttr = el?.getAttribute('data-cell-index');
                        const targetIndex =
                          targetAttr !== null && targetAttr !== undefined
                            ? Number(targetAttr)
                            : NaN;
                        if (!Number.isNaN(targetIndex) && targetIndex !== drag.fromIndex) {
                          const targetCell = state.grid[targetIndex];
                          if (targetCell && !targetCell.locked) {
                            onMergeCells(drag.fromIndex, targetIndex);
                            clearSelection();
                          }
                        }
                        setDragFromCell(null);
                        setTimeout(() => {
                          suppressNextClickRef.current = false;
                        }, 50);
                      }
                    }}
                    onPointerCancel={() => {
                      pointerDragRef.current = null;
                      setDragFromCell(null);
                    }}
                    onClick={() => {
                      if (suppressNextClickRef.current) return;
                      handleCellClick(cell.index);
                    }}
                    className={`relative aspect-square rounded-xl border-2 flex items-center justify-center transition-colors duration-150 cursor-pointer ${
                      !cell.locked && Boolean(cell.item) && cell.item !== 'chest'
                        ? 'touch-none'
                        : 'touch-manipulation'
                    } ${
                      cell.locked
                        ? 'stone-socket-locked border-slate-800/50 text-slate-500 hover:border-amber-400/55'
                        : isSelected
                          ? 'stone-socket bg-amber-400/20 border-amber-400'
                          : isHammerTarget
                            ? 'stone-socket bg-rose-500/15 border-rose-400'
                            : isMergeCandidate
                              ? 'stone-socket bg-emerald-500/20 border-emerald-400'
                              : isWanted
                                ? 'stone-socket border-emerald-500/65 bg-emerald-500/5'
                                : 'stone-socket border-slate-800/80 hover:border-slate-500/70'
                    } ${cell.justMerged ? 'animate-merge-pop' : ''}`}
                  >
                    {cell.locked ? (
                      <div className="flex flex-col items-center justify-center leading-none">
                        <Lock className="w-3 h-3 opacity-65 text-amber-300" />
                        <span className="font-mono-num text-[7.5px] font-black text-amber-300 mt-0.5">
                          {starCost}⭐
                        </span>
                      </div>
                    ) : cell.item ? (
                      <>
                        <ItemIcon item={cell.item} className="w-[78%] h-[78%]" />
                        {isWanted && (
                          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-2 h-2 text-slate-950 stroke-[3]" />
                          </span>
                        )}
                        {cell.item === 'chest' ? (
                          <ChestCellBadge readyAt={chestReadyAt} />
                        ) : meta && meta.tier > 0 ? (
                          <span
                            className={`absolute bottom-0.5 left-0.5 px-1 rounded border text-[7px] font-mono-num font-black leading-tight ${CELL_TIER_PILL[cell.item]}`}
                          >
                            {meta.tier}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </button>
                );
              })}
              </div>
            </div>

          {/* Left Side (in RTL): Hammer */}
          <button
            type="button"
            onClick={() => {
              if (state.stats.hammerBoosters <= 0) {
                soundFX.playError();
                return;
              }
              soundFX.playTabSwitch();
              setHammerArmed((v) => !v);
            }}
            title="مطرقة"
            className={`w-11 sm:w-12 shrink-0 py-3 px-1 rounded-2xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors duration-150 shadow-lg ${
              hammerArmed
                ? 'bg-rose-500 text-white border-rose-300'
                : 'bg-rose-500/15 border-rose-500/45 text-rose-200 hover:bg-rose-500/25'
            }`}
          >
            <Hammer className="w-4 h-4 shrink-0" />
            <span className="text-[9.5px] font-black leading-tight text-center">
              {hammerArmed ? (
                <>
                  اختر
                  <br />
                  بيضة!
                </>
              ) : (
                'مطرقة'
              )}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded-md border font-mono-num text-[9.5px] font-black ${
                hammerArmed
                  ? 'bg-rose-950/60 border-rose-200/40 text-white'
                  : 'bg-slate-950/70 border-rose-400/30 text-rose-200'
              }`}
            >
              {state.stats.hammerBoosters}
            </span>
          </button>
        </section>

        {/* 3. Selected Item Direct Sell Bar & Overflow Queue (shown when active) */}
        {showBottomBar && (
          <section className="w-full bg-[#161923] border border-slate-800 rounded-2xl p-1.5 space-y-1 shadow-xl shrink-0">
            {inspectedItem && inspectedMeta && (
              <div className="flex items-center justify-between gap-2 bg-[#1c2131] border border-slate-700/80 rounded-xl px-2 py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${ITEM_TIER_ACCENT[inspectedItem]}`}
                  >
                    <ItemIcon item={inspectedItem} className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <span className="text-[11px] font-black text-white truncate block">
                      {inspectedMeta.name}
                    </span>
                    <span className="text-[9px] text-amber-300 font-mono-num font-bold">
                      {inspectedMeta.tier > 0 ? `المستوى ${inspectedMeta.tier}` : 'صندوق كنوز'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {inspectedSellReward && (
                    <button
                      onClick={() => {
                        if (selectedCell !== null) {
                          onSellGridItem(selectedCell);
                        } else if (selectedQueueIdx !== null) {
                          onSellQueuedEgg(selectedQueueIdx);
                        }
                        clearSelection();
                      }}
                      className="h-8 px-2.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-black text-[10.5px] flex items-center gap-1 hover:brightness-105 cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5 shrink-0" />
                      <span>بيع</span>
                      <span className="font-mono-num bg-slate-950/20 px-1 rounded text-[9.5px] font-black">
                        +{inspectedSellReward.corn}⚡
                        {inspectedSellReward.stars > 0 ? ` +${inspectedSellReward.stars}★` : ''}
                        {inspectedSellReward.gold > 0 ? ` +${inspectedSellReward.gold}💎` : ''}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={clearSelection}
                    className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                    aria-label="إغلاق"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {hasQueueRow && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5">
                <span className="text-[9.5px] font-bold text-amber-300 shrink-0 px-1 font-mono-num">
                  +{state.eggQueue.length}
                </span>
                {state.eggQueue.slice(0, 8).map((egg, idx) => {
                  const isQueueSelected = selectedQueueIdx === idx;
                  const qMeta = EGG_ITEM_META[egg];
                  return (
                    <button
                      key={`${egg}_${idx}`}
                      onClick={() => {
                        soundFX.playTabSwitch();
                        setSelectedCell(null);
                        setSelectedQueueIdx(isQueueSelected ? null : idx);
                      }}
                      className={`relative w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-150 cursor-pointer ${
                        isQueueSelected
                          ? 'bg-amber-400/25 border-2 border-amber-400'
                          : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500'
                      }`}
                    >
                      <ItemIcon item={egg} className="w-5 h-5" />
                      {qMeta.tier > 0 && (
                        <span className="absolute bottom-0 left-0 px-0.5 rounded bg-slate-950/90 text-[6.5px] font-mono-num font-black text-slate-200 leading-none">
                          {qMeta.tier}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Snack Chest Slide-Up Sheet */}
      {chestModalCell !== null && (
        <ChestModal
          cellIndex={chestModalCell}
          readyAt={chestReadyAt}
          discountLeft={state.stats.snackChestDiscountOpensLeft ?? 10}
          stars={state.stars}
          onClose={() => setChestModalCell(null)}
          onOpenChest={onOpenSnackChest}
        />
      )}
    </div>
  );
};
