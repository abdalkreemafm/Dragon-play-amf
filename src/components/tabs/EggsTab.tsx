import React, { useRef, useState } from 'react';
import { Check, Flame, Hammer, Lock, Sparkles, Trophy, X, Zap } from 'lucide-react';
import { EggItemType, GameState, GodOrder } from '../../types/game';
import { EGG_ITEM_META, GOD_PATRONS } from '../../data/gameData';
import { ECONOMY_LIMITS } from '../../utils/economyEngine';
import { CornIcon, GodIllustration, ItemIcon } from '../art/DuckArt';
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
  onDeliverToGod: (orderId: string, cellIndex?: number) => void;
  onOpenSnackChest: (cellIndex: number) => void;
  onUnlockGridSlot: (cellIndex: number) => void;
  onOpenTournament: () => void;
}

export const EggsTab: React.FC<EggsTabProps> = ({
  state,
  blitzSecLeft,
  onStartBlitz,
  onAutoMergeBoard,
  onUseHammerOnCell,
  onMergeCells,
  onPlaceQueuedEgg,
  onDeliverToGod,
  onOpenSnackChest,
  onUnlockGridSlot,
  onOpenTournament,
}) => {
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [dragFromCell, setDragFromCell] = useState<number | null>(null);
  const [inspectItem, setInspectItem] = useState<EggItemType | null>(null);
  const [chestModalCell, setChestModalCell] = useState<number | null>(null);
  const [hammerArmed, setHammerArmed] = useState(false);

  const pointerDragRef = useRef<{
    fromIndex: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  const selectedItem = selectedCell !== null ? state.grid[selectedCell]?.item : null;
  const isBlitz = blitzSecLeft > 0;
  const hasEggSurge = (state.activeBuffs?.eggSurgeUntil ?? 0) > Date.now();
  const canAffordBlitz = state.corn >= ECONOMY_LIMITS.BLITZ_ACTIVATION_COST;

  const wantedByGodMap = new Map<EggItemType, GodOrder>();
  state.godOrders.forEach((ord) => {
    if (!wantedByGodMap.has(ord.wantedItem)) {
      wantedByGodMap.set(ord.wantedItem, ord);
    }
  });

  const findMatchingCellForOrder = (wanted: EggItemType): number => {
    return state.grid.findIndex((c) => !c.locked && c.item === wanted);
  };

  const handleCellClick = (index: number) => {
    const cell = state.grid[index];
    if (!cell) return;

    if (cell.locked) {
      if (state.stars >= 10) {
        soundFX.playClaim();
        onUnlockGridSlot(index);
      } else {
        soundFX.playError();
      }
      return;
    }

    if (hammerArmed) {
      if (cell.item && EGG_ITEM_META[cell.item]?.next) {
        soundFX.playCritHit();
        onUseHammerOnCell(index);
        setHammerArmed(false);
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
      setInspectItem('chest');
      setSelectedCell(null);
      return;
    }

    if (selectedCell !== null) {
      if (selectedCell === index) {
        setSelectedCell(null);
        return;
      }

      const sourceCell = state.grid[selectedCell];
      if (sourceCell && sourceCell.item) {
        if (!cell.item || (cell.item === sourceCell.item && EGG_ITEM_META[cell.item].next)) {
          onMergeCells(selectedCell, index);
          setSelectedCell(null);
          setInspectItem(null);
          return;
        }
      }
    }

    if (cell.item) {
      soundFX.playTabSwitch();
      setSelectedCell(index);
      setInspectItem(cell.item);
    } else {
      if (state.eggQueue.length > 0) {
        soundFX.playTapFeed();
        onPlaceQueuedEgg(index);
      }
      setSelectedCell(null);
    }
  };

  const nextMilestone = [40, 100, 250, 400].find((m) => state.tournament.score < m) ?? 400;

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto px-2 sm:px-5 py-2 overflow-y-auto select-none">
      {/* Top Twilight Temple Arena: Trophy + Blitz + Active Gods */}
      <div
        className={`relative rounded-3xl p-2.5 sm:p-3 mb-2 overflow-hidden shrink-0 border transition-all shadow-2xl ${
          isBlitz
            ? 'border-amber-400 animate-fever-glow'
            : 'border-purple-500/30'
        }`}
      >
        <TempleAltarBackdrop isBlitz={isBlitz} />
        <div className="relative z-10 flex items-center justify-between gap-2">
          {/* Left Stack: Trophy + Blitz Wave Trigger */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              onClick={() => {
                soundFX.playTabSwitch();
                onOpenTournament();
              }}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl bg-slate-900/85 border border-amber-400/40 hover:border-amber-400 cursor-pointer"
            >
              <Trophy className="w-5 h-5 text-amber-400" />
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
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 ${
                isBlitz
                  ? 'bg-rose-500 text-white'
                  : canAffordBlitz
                    ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
              title={`تفعيل موجة دمج سريعة لمدة 30 ثانية (2× نقاط) مقابل ${ECONOMY_LIMITS.BLITZ_ACTIVATION_COST} طاقة`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span className="font-mono-num">
                {isBlitz ? `${Math.ceil(blitzSecLeft)}s 2×` : `موجة 2× (${ECONOMY_LIMITS.BLITZ_ACTIVATION_COST}⚡)`}
              </span>
            </button>
            {hasEggSurge && (
              <div className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-black text-center font-mono-num">
                إكسير التفقيس +20%
              </div>
            )}
          </div>

          {/* 3 Active Duck Gods */}
          <div className="flex-1 grid grid-cols-3 gap-1.5 sm:gap-2">
            {state.godOrders.map((order) => {
              const matchingIdx = findMatchingCellForOrder(order.wantedItem);
              const isReady = matchingIdx !== -1;
              const godInfo = GOD_PATRONS[order.godId];

              return (
                <div
                  key={order.id}
                  className={`relative rounded-2xl p-1.5 sm:p-2 border transition-all flex flex-col items-center ${
                    isReady
                      ? 'bg-emerald-500/15 border-emerald-400/70 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-900/65 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <GodIllustration godId={order.godId} className="w-9 h-9 sm:w-11 sm:h-11 shrink-0" />
                    <div className="flex flex-col items-center">
                      <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center justify-center">
                        <ItemIcon item={order.wantedItem} className="w-5 h-5 sm:w-6 sm:h-6" />
                        {isReady && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <CornIcon className="w-3 h-3" />
                        <span className="font-mono-num text-[10px] font-bold text-emerald-300">
                          +{order.cornReward}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isReady ? (
                    <button
                      onClick={() => {
                        soundFX.playGodConfirm();
                        onDeliverToGod(order.id, matchingIdx);
                        setSelectedCell(null);
                      }}
                      className="mt-1 w-full py-1 rounded-lg bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 font-black text-[10px] tracking-wide hover:brightness-105 active:scale-95 cursor-pointer"
                    >
                      تسليم
                    </button>
                  ) : (
                    <div className="mt-1 w-full text-center leading-tight">
                      <div className="text-[10px] font-extrabold text-slate-200">{godInfo.name}</div>
                      <div className="text-[9px] font-mono-num font-bold text-amber-300">
                        +{isBlitz ? order.trophyPoints * 2 : order.trophyPoints} 🏆
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Center 8x7 Merge Grid */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          className={`w-full max-w-[500px] bg-[#161923] rounded-3xl p-2 sm:p-2.5 shadow-2xl border transition-all ${
            hammerArmed
              ? 'border-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.25)]'
              : isBlitz
                ? 'border-amber-400/70'
                : 'border-slate-800'
          }`}
        >
          <div className="grid grid-cols-8 gap-1 sm:gap-1.5">
            {state.grid.map((cell) => {
              const isSelected = selectedCell === cell.index;
              const isMergeCandidate =
                selectedCell !== null &&
                selectedCell !== cell.index &&
                selectedItem !== null &&
                cell.item === selectedItem &&
                Boolean(EGG_ITEM_META[selectedItem]?.next);
              const isWanted = cell.item ? wantedByGodMap.has(cell.item) : false;

              return (
                <button
                  key={cell.index}
                  type="button"
                  data-cell-index={cell.index}
                  draggable={!cell.locked && Boolean(cell.item) && cell.item !== 'chest'}
                  onDragStart={() => {
                    if (!cell.locked && cell.item) {
                      setDragFromCell(cell.index);
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
                      setSelectedCell(null);
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
                    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 14) {
                      drag.moved = true;
                      setDragFromCell(drag.fromIndex);
                      setSelectedCell(drag.fromIndex);
                    }
                  }}
                  onPointerUp={(e) => {
                    const drag = pointerDragRef.current;
                    pointerDragRef.current = null;
                    if (!drag || e.pointerType === 'mouse') return;
                    if (drag.moved) {
                      suppressNextClickRef.current = true;
                      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cell-index]');
                      const targetAttr = el?.getAttribute('data-cell-index');
                      const targetIndex = targetAttr !== null && targetAttr !== undefined ? Number(targetAttr) : NaN;
                      if (!Number.isNaN(targetIndex) && targetIndex !== drag.fromIndex) {
                        const targetCell = state.grid[targetIndex];
                        if (targetCell && !targetCell.locked) {
                          onMergeCells(drag.fromIndex, targetIndex);
                          setSelectedCell(null);
                          setInspectItem(null);
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
                  className={`relative aspect-square rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    !cell.locked && cell.item && cell.item !== 'chest' ? 'touch-none' : ''
                  } ${
                    cell.locked
                      ? 'stone-socket-locked border border-slate-800/40 text-slate-600 hover:border-amber-500/40'
                      : isSelected
                        ? 'stone-socket bg-amber-400/20 border-2 border-amber-400 scale-105 z-10'
                        : isMergeCandidate
                          ? 'stone-socket bg-emerald-500/20 border-2 border-emerald-400 animate-match-ring'
                          : isWanted
                            ? 'stone-socket border border-emerald-500/60'
                            : 'stone-socket border border-slate-800/80 hover:border-slate-500/70'
                  } ${cell.justMerged ? 'animate-merge-pop' : ''}`}
                >
                  {cell.locked ? (
                    <div className="flex flex-col items-center justify-center leading-none">
                      <Lock className="w-3 h-3 opacity-60" />
                      <span className="font-mono-num text-[8px] font-black text-amber-300/75 mt-0.5">10★</span>
                    </div>
                  ) : cell.item ? (
                    <>
                      <ItemIcon item={cell.item} className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow" />
                      {isWanted && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                          <Check className="w-2 h-2 text-slate-950 stroke-[3]" />
                        </span>
                      )}
                      {cell.item === 'chest' && (
                        <span className="absolute -bottom-1 inset-x-0.5 text-[8px] font-black bg-amber-400 text-slate-950 rounded text-center leading-tight">
                          افتح
                        </span>
                      )}
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Item Info Strip */}
      {inspectItem && (
        <div className="w-full max-w-[500px] mx-auto mt-1.5 bg-[#1a1e2a] border border-slate-700/80 rounded-2xl px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
              <ItemIcon item={inspectItem} className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white truncate">{EGG_ITEM_META[inspectItem].name}</div>
              <div className="text-[10px] text-slate-400 truncate">{EGG_ITEM_META[inspectItem].desc}</div>
            </div>
          </div>
          <button
            onClick={() => setInspectItem(null)}
            className="p-1 text-slate-400 hover:text-white cursor-pointer shrink-0"
            aria-label="إغلاق الوصف"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Boosters + Egg Queue Bar */}
      <div className="w-full max-w-[500px] mx-auto mt-2 bg-[#161923] border border-slate-800 rounded-2xl p-2.5 shrink-0 space-y-2">
        {/* Rapid Merge Boosters */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              const merged = onAutoMergeBoard();
              if (merged > 0) soundFX.playGodConfirm();
              else soundFX.playError();
            }}
            className="min-h-[44px] py-2 px-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/30 text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>دمج تلقائي ذكي ({state.stats.autoMergeBoosters})</span>
          </button>

          <button
            onClick={() => {
              if (state.stats.hammerBoosters <= 0) {
                soundFX.playError();
                return;
              }
              soundFX.playTabSwitch();
              setHammerArmed((v) => !v);
            }}
            className={`min-h-[44px] py-2 px-3 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer ${
              hammerArmed
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-200 hover:bg-rose-500/25'
            }`}
          >
            <Hammer className="w-3.5 h-3.5 shrink-0" />
            <span>{hammerArmed ? 'اختر بيضة للترقية!' : `مطرقة الترقية (${state.stats.hammerBoosters})`}</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>
            قائمة الانتظار: <span className="font-mono-num text-amber-300 font-bold">{state.eggQueue.length}</span> بيضة
          </span>
          <button
            onClick={() => {
              if (state.eggQueue.length > 0) {
                soundFX.playTapFeed();
                onPlaceQueuedEgg();
              } else {
                soundFX.playError();
              }
            }}
            className="min-h-[32px] px-2 text-amber-400 font-bold hover:text-amber-300 cursor-pointer"
          >
            إنزال بيضة +
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pr-1.5 pb-0.5">
          {state.eggQueue.length === 0 ? (
            <div className="text-xs text-slate-500 py-1.5 px-2">القائمة فارغة! أطعم التنانين أو فعّل موجة 2×.</div>
          ) : (
            state.eggQueue.slice(0, 8).map((egg, idx) => (
              <button
                key={`${egg}_${idx}`}
                onClick={() => {
                  if (idx === 0) {
                    soundFX.playTapFeed();
                    onPlaceQueuedEgg();
                  } else {
                    soundFX.playTabSwitch();
                    setInspectItem(egg);
                  }
                }}
                className={`relative w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  idx === 0
                    ? 'bg-amber-400/15 border-amber-400 shadow-md hover:scale-105'
                    : 'bg-slate-900/70 border-slate-800 opacity-80 hover:opacity-100'
                }`}
              >
                <ItemIcon item={egg} className="w-7 h-7" />
                {idx === 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1 rounded bg-amber-400 text-slate-950 font-mono-num text-[9px] font-black shadow">
                    1
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Snack Chest Modal */}
      {chestModalCell !== null && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#181b24] border border-amber-400/40 rounded-3xl p-6 text-center shadow-2xl relative">
            <button
              onClick={() => setChestModalCell(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mb-3">
              <ItemIcon item="chest" className="w-16 h-16" />
            </div>
            <h3 className="font-display text-xl font-black text-white tracking-wide mb-1">صندوق الكنوز</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              افتح الصندوق للحصول على <span className="text-amber-300 font-bold">الوليمة الإلهية</span> ومعززات الدمج!
            </p>
            <div className="text-xs font-bold text-emerald-400 mb-4 flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4" />
              <span>جاهز للفتح الآن!</span>
            </div>
            <button
              onClick={() => {
                soundFX.playChestOpen();
                onOpenSnackChest(chestModalCell);
                setChestModalCell(null);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 font-black text-sm hover:brightness-105 cursor-pointer"
            >
              فتح الصندوق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
