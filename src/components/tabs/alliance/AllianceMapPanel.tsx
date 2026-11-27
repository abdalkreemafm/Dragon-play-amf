import React, { useEffect, useState } from 'react';
import {
  Check,
  Compass,
  Landmark,
  MapPin,
  Radio,
  Rocket,
  Skull,
  Swords,
  Users,
} from 'lucide-react';
import {
  AllianceActiveRally,
  AllianceEmblemId,
  AllianceOccupiedSite,
  AllianceTechId,
  GameState,
} from '../../../types/game';
import { RARITY_STYLE } from '../../../data/gameData';
import {
  ALLIANCE_MAP_TARGETS,
  ALLIANCE_RALLY_PREP_OPTIONS,
  AllianceMapTargetMeta,
  formatDurationAr,
} from '../../../utils/economyEngine';
import { DragonIllustration } from '../../art/DuckArt';
import { soundFX } from '../../../utils/sound';
import { SectionCard, SectionHeader } from '../../ui/SectionCard';
import { renderEmblemGlyph } from './AllianceHelpers';

interface AllianceMapPanelProps {
  state: GameState;
  nowTs: number;
  currentEmblemId: AllianceEmblemId;
  techLevels: Record<AllianceTechId, number>;
  activeRally: AllianceActiveRally | null;
  activeTargetMeta: AllianceMapTargetMeta | null;
  activeRallyEffectivePower: number;
  activeRallyTotalDragons: number;
  activeMarchLeftMs: number;
  activeMarchPct: number;
  occupiedSites: AllianceOccupiedSite[];
  mapCooldowns: Record<string, number>;
  phalanxLv: number;
  onStartAllianceRally: (targetId: string, prepMinutes: number, selectedDragonIds?: string[]) => void;
  onReinforceRally: (mode: 'ALLY_CALL' | 'SELF_BOOST') => void;
  onSpeedupRally: (mode: 'ALLY_HELP' | 'RESOURCE_BOOST' | 'FAST_MARCH') => void;
  onResolveAllianceRally: () => void;
  onHarvestOccupiedSite: (targetId: string) => void;
  onOpenRallyDetails: () => void;
}

export const AllianceMapPanel: React.FC<AllianceMapPanelProps> = ({
  state,
  nowTs,
  currentEmblemId,
  techLevels,
  activeRally,
  activeTargetMeta,
  activeRallyEffectivePower,
  activeRallyTotalDragons,
  activeMarchLeftMs,
  activeMarchPct,
  occupiedSites,
  mapCooldowns,
  phalanxLv,
  onStartAllianceRally,
  onReinforceRally,
  onSpeedupRally,
  onResolveAllianceRally,
  onHarvestOccupiedSite,
  onOpenRallyDetails,
}) => {
  const [selectedMapTargetId, setSelectedMapTargetId] = useState<string>(ALLIANCE_MAP_TARGETS[0].id);
  const [selectedPrepMinutes, setSelectedPrepMinutes] = useState<number>(60);
  const [selectedLaunchDragonIds, setSelectedLaunchDragonIds] = useState<string[]>(() =>
    [...state.ducks]
      .sort((a, b) => (b.powerRating ?? 100) - (a.powerRating ?? 100))
      .slice(0, Math.min(3, state.ducks.length))
      .map((d) => d.id)
  );

  useEffect(() => {
    setSelectedLaunchDragonIds((prev) => {
      const validIds = new Set(state.ducks.map((d) => d.id));
      const kept = prev.filter((id) => validIds.has(id));
      if (kept.length > 0) return kept;
      return [...state.ducks]
        .sort((a, b) => (b.powerRating ?? 100) - (a.powerRating ?? 100))
        .slice(0, Math.min(3, state.ducks.length))
        .map((d) => d.id);
    });
  }, [state.ducks]);

  const selectedTarget =
    ALLIANCE_MAP_TARGETS.find((t) => t.id === selectedMapTargetId) ?? ALLIANCE_MAP_TARGETS[0];
  const selectedCdLeft = Math.max(0, (mapCooldowns[selectedTarget.id] ?? 0) - nowTs);
  const selectedPrep =
    ALLIANCE_RALLY_PREP_OPTIONS.find((o) => o.minutes === selectedPrepMinutes) ??
    ALLIANCE_RALLY_PREP_OPTIONS[1];
  const marchSpeedLv = techLevels.tech_march_speed ?? 0;
  const adjustedPrepMs = Math.max(
    45000,
    Math.round(selectedPrep.minutes * 60000 * (1 - Math.min(0.65, marchSpeedLv * 0.04)))
  );

  const computePreviewPower = (d: typeof state.ducks[number]) => {
    const base = Math.max(85, d.powerRating ?? 100);
    const raw = Math.round(base * 14 + d.level * 480 + (d.customLevel ?? 0) * 180);
    return Math.round(raw * (1 + phalanxLv * 0.06));
  };
  const selectedDragonsPower = state.ducks
    .filter((d) => selectedLaunchDragonIds.includes(d.id))
    .reduce((acc, d) => acc + computePreviewPower(d), 0);

  const marchRatio = activeRally ? activeMarchPct / 100 : 0;
  const marchX =
    activeRally && activeTargetMeta
      ? 50 + (activeTargetMeta.mapPct.x - 50) * marchRatio
      : 50;
  const marchY =
    activeRally && activeTargetMeta
      ? 52 + (activeTargetMeta.mapPct.y - 52) * marchRatio
      : 52;

  return (
    <div className="space-y-3">
      {/* Interactive 2D Kingdom War Map Canvas */}
      <div className="rounded-2xl bg-[#0e131d] border border-amber-500/35 p-3 space-y-2.5">
        <SectionHeader
          title="خريطة السرب ومسير التنانين"
          icon={<Compass className="w-4 h-4 text-amber-400" />}
          meta="قلعة السرب (512, 512)"
        />

        <div className="relative h-56 sm:h-64 w-full rounded-xl overflow-hidden border border-slate-800 bg-[radial-gradient(circle_at_center,#1b2434_0%,#0c1018_100%)]">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <defs>
              <pattern id="warGrid" width="12.5" height="12.5" patternUnits="userSpaceOnUse">
                <path
                  d="M 12.5 0 L 0 0 0 12.5"
                  fill="none"
                  stroke="rgba(148,163,184,0.12)"
                  strokeWidth="0.3"
                />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#warGrid)" />
            <circle
              cx="50"
              cy="52"
              r="28"
              fill="none"
              stroke="rgba(251,191,36,0.14)"
              strokeWidth="0.4"
              strokeDasharray="1.5 1.5"
            />
            {(() => {
              const lineTarget = activeTargetMeta ?? selectedTarget;
              return (
                <>
                  <line
                    x1="50"
                    y1="52"
                    x2={lineTarget.mapPct.x}
                    y2={lineTarget.mapPct.y}
                    stroke={activeRally ? '#fb7185' : '#facc15'}
                    strokeOpacity={activeRally ? 0.35 : 0.7}
                    strokeWidth={activeRally ? '0.9' : '0.5'}
                    strokeDasharray="2 1.5"
                  />
                  {activeRally && (
                    <line
                      x1="50"
                      y1="52"
                      x2={marchX}
                      y2={marchY}
                      stroke="#34d399"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  )}
                </>
              );
            })()}
          </svg>

          {/* Alliance Central Citadel */}
          <div
            style={{ left: '50%', top: '52%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400 flex items-center justify-center shadow-lg">
              {renderEmblemGlyph(currentEmblemId, 'w-4 h-4 text-amber-300')}
            </div>
            <span className="mt-0.5 text-[9px] font-black text-amber-200 bg-slate-950/85 px-1.5 rounded">
              حصن السرب
            </span>
          </div>

          {/* Real-time Moving Dragon March Marker */}
          {activeRally && (
            <button
              onClick={onOpenRallyDetails}
              style={{ left: `${marchX}%`, top: `${marchY}%` }}
              title="اضغط لعرض تفاصيل الحشد"
              className="absolute -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/30 border-2 border-emerald-300 flex items-center justify-center shadow-lg animate-pulse group-hover:scale-110 transition-transform">
                <Rocket className="w-3.5 h-3.5 text-emerald-200" />
              </div>
              <span className="mt-0.5 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400/50 text-[8.5px] font-mono-num font-black text-emerald-300 whitespace-nowrap">
                {activeMarchPct}%
              </span>
            </button>
          )}

          {/* Map Target Nodes */}
          {ALLIANCE_MAP_TARGETS.map((target) => {
            const isSelected = selectedTarget.id === target.id;
            const isOccupied = occupiedSites.some((s) => s.targetId === target.id);
            const isRallied = activeRally?.targetId === target.id;
            const colorCls =
              target.type === 'PYRAMID'
                ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                : target.type === 'MONSTER'
                  ? 'bg-rose-500/25 border-rose-400 text-rose-300'
                  : 'bg-purple-500/25 border-purple-400 text-purple-300';
            return (
              <button
                key={target.id}
                onClick={() => {
                  soundFX.playTabSwitch();
                  setSelectedMapTargetId(target.id);
                }}
                style={{ left: `${target.mapPct.x}%`, top: `${target.mapPct.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform z-20 ${
                  isSelected ? 'scale-110 z-30' : 'hover:scale-105'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-md ${colorCls} ${
                    isSelected ? 'ring-2 ring-white' : ''
                  }`}
                >
                  {target.type === 'PYRAMID' ? (
                    <Landmark className="w-4 h-4" />
                  ) : target.type === 'MONSTER' ? (
                    <Skull className="w-4 h-4" />
                  ) : (
                    <Radio className="w-4 h-4" />
                  )}
                </div>
                <span className="mt-0.5 px-1.5 py-0.5 rounded bg-slate-950/90 text-[9px] font-black text-white whitespace-nowrap">
                  {target.nameAr.split(' ').slice(0, 2).join(' ')}
                  {isOccupied ? ' ✓' : isRallied ? ' ⚔️' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Occupied Pyramids Strip */}
      {occupiedSites.length > 0 && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-400/50 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-amber-200 flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-amber-400" />
              أهرامات تحت سيطرة السرب ({occupiedSites.length})
            </span>
            <span className="text-[10px] font-mono-num text-emerald-300">خراج ساعي مستمر</span>
          </div>
          {occupiedSites.map((site) => (
            <div
              key={site.targetId}
              className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-xs font-black text-white">{site.nameAr}</div>
                <div className="text-[10px] font-mono-num text-slate-300">
                  متبقي: {formatDurationAr(site.expiresAt - nowTs)} · +{site.hourlyCornVault}⚡/س · +{site.hourlyTechPts} بحث/س
                </div>
              </div>
              <button
                onClick={() => onHarvestOccupiedSite(site.targetId)}
                className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-[11px] hover:brightness-105 cursor-pointer"
              >
                حصاد الخراج
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Rally Compact Live Banner -> Opens Dedicated Rally Details Modal */}
      {activeRally && (
        <div className="rounded-2xl bg-gradient-to-b from-[#251524] to-[#161923] border border-rose-500/55 p-3 space-y-2.5 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-rose-400" />
                <span>حشد نشط: {activeRally.targetNameAr}</span>
              </div>
              <div className="text-[10px] font-mono-num text-slate-300">
                {activeRally.participants.length}/{activeRally.maxSlots} مقاعد · {activeRallyTotalDragons} تنانين مشاركة · قوة {activeRallyEffectivePower.toLocaleString()}/{activeRally.requiredPower.toLocaleString()}
              </div>
            </div>
            <span className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-400/50 font-mono-num text-[10.5px] font-black text-rose-200 shrink-0">
              {activeMarchPct >= 100
                ? 'وصل للموقع!'
                : formatDurationAr(activeMarchLeftMs)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono-num">
              <span className="text-emerald-300 font-bold">تقدم المسير نحو الهدف</span>
              <span className="text-white font-black">{activeMarchPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all"
                style={{ width: `${activeMarchPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => {
                soundFX.playTabSwitch();
                onOpenRallyDetails();
              }}
              className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:brightness-105 cursor-pointer flex items-center justify-center gap-1.5 shadow"
            >
              <Compass className="w-4 h-4" />
              <span>تفاصيل الحشد</span>
            </button>

            {activeMarchPct >= 100 ? (
              <button
                onClick={() => onResolveAllianceRally()}
                className="col-span-2 py-2.5 px-3 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-black text-xs hover:brightness-105 cursor-pointer shadow"
              >
                ⚔️ حسم المعركة واستلام الغنائم!
              </button>
            ) : (
              <>
                <button
                  disabled={state.corn < 100}
                  onClick={() => onSpeedupRally('RESOURCE_BOOST')}
                  className={`py-2.5 px-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-1 ${
                    state.corn >= 100
                      ? 'bg-emerald-500/20 border border-emerald-400/55 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer'
                      : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>تسريع -45د (100⚡)</span>
                </button>

                <button
                  disabled={activeRally.participants.length >= activeRally.maxSlots}
                  onClick={() => onReinforceRally('ALLY_CALL')}
                  className={`py-2.5 px-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-1 ${
                    activeRally.participants.length < activeRally.maxSlots
                      ? 'bg-sky-500/20 border border-sky-400/55 text-sky-200 hover:bg-sky-500/30 cursor-pointer'
                      : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>فزعة التنانين</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Selected Target Briefing & Dragon Squad Launcher */}
      <SectionCard compact className="space-y-2.5">
        <SectionHeader
          title={`${selectedTarget.nameAr} [Lv.${selectedTarget.level}]`}
          subtitle={selectedTarget.descAr}
          icon={<MapPin className="w-4 h-4 text-amber-400 shrink-0" />}
          meta={`(${selectedTarget.coords.x}, ${selectedTarget.coords.y})`}
        />

        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono-num">
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2">
            <div className="text-slate-400">القوة المطلوبة</div>
            <div className="font-black text-rose-300">
              {selectedTarget.requiredPower.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2">
            <div className="text-slate-400">الحلفاء الموصى بهم</div>
            <div className="font-black text-sky-300">{selectedTarget.minAllies}+ أعضاء</div>
          </div>
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2">
            <div className="text-slate-400">
              {selectedTarget.occupyHours > 0 ? 'مدة الاحتلال' : 'فترة التهدئة'}
            </div>
            <div className="font-black text-amber-300">
              {selectedTarget.occupyHours > 0
                ? `${selectedTarget.occupyHours} ساعات`
                : `${selectedTarget.cooldownMinutes} دقيقة`}
            </div>
          </div>
        </div>

        {/* Select Player Dragons for this Mission */}
        {!activeRally && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-black text-slate-200">
                اختر تنانينك المشاركة في الحشد ({selectedLaunchDragonIds.length}/{state.ducks.length}):
              </span>
              <span className="font-mono-num font-black text-emerald-300">
                قوة فيلقك: {selectedDragonsPower.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {state.ducks.map((dragon) => {
                const checked = selectedLaunchDragonIds.includes(dragon.id);
                const rStyle = RARITY_STYLE[dragon.rarity];
                return (
                  <button
                    key={dragon.id}
                    onClick={() => {
                      soundFX.playTapFeed();
                      setSelectedLaunchDragonIds((prev) => {
                        if (prev.includes(dragon.id)) {
                          return prev.length > 1 ? prev.filter((id) => id !== dragon.id) : prev;
                        }
                        return [...prev, dragon.id];
                      });
                    }}
                    className={`min-w-[104px] rounded-xl p-1.5 border text-center shrink-0 transition-all cursor-pointer ${
                      checked
                        ? 'bg-emerald-500/15 border-emerald-400 shadow-sm'
                        : 'bg-slate-900/90 border-slate-800 opacity-65 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between px-0.5 text-[9px] font-mono-num">
                      <span className={rStyle.color}>Lv.{dragon.level}</span>
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center ${
                          checked ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <DragonIllustration
                      skin={dragon.skin}
                      level={dragon.level}
                      showEvolutionEffects={false}
                      motionEnabled={false}
                      className="w-10 h-10 mx-auto"
                    />
                    <div className="text-[9.5px] font-black text-white truncate">
                      {dragon.name}
                    </div>
                    <div className="text-[9px] font-mono-num text-amber-300">
                      {computePreviewPower(dragon).toLocaleString()} قوة
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Rally Prep Time Selector */}
        <div className="space-y-1">
          <div className="text-[10px] font-black text-slate-300 flex items-center justify-between">
            <span>مدة التجمع (كلما زادت ارتفعت الغنائم):</span>
            <span className="font-mono-num text-amber-300">
              الفعلي: {formatDurationAr(adjustedPrepMs)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {ALLIANCE_RALLY_PREP_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                onClick={() => setSelectedPrepMinutes(opt.minutes)}
                className={`py-1.5 px-2 rounded-xl border text-[10px] font-black cursor-pointer ${
                  selectedPrepMinutes === opt.minutes
                    ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="truncate">{opt.labelAr}</div>
                <div className="font-mono-num text-[9px] text-emerald-300">
                  غنائم ×{opt.lootMult}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-2.5 py-2 text-[10px] font-mono-num text-emerald-300 font-bold">
          غنائم النصر (×{selectedPrep.lootMult}): +{Math.round(selectedTarget.rewards.vaultCorn * selectedPrep.lootMult).toLocaleString()}⚡ خزينة · +{Math.round(selectedTarget.rewards.techPts * selectedPrep.lootMult).toLocaleString()} بحث · +{Math.round(selectedTarget.rewards.coins * selectedPrep.lootMult).toLocaleString()}🪙 · +{selectedTarget.rewards.stars}★
          {selectedTarget.rewards.gold > 0 ? ` · +${selectedTarget.rewards.gold}💎` : ''}
        </div>

        <button
          disabled={
            Boolean(activeRally) ||
            selectedCdLeft > 0 ||
            state.corn < selectedTarget.staminaCostCorn
          }
          onClick={() =>
            onStartAllianceRally(
              selectedTarget.id,
              selectedPrepMinutes,
              selectedLaunchDragonIds
            )
          }
          className={`w-full py-2.5 rounded-xl font-black text-xs transition-all ${
            !activeRally &&
            selectedCdLeft === 0 &&
            state.corn >= selectedTarget.staminaCostCorn
              ? 'bg-gradient-to-b from-rose-500 to-rose-700 text-white hover:brightness-110 cursor-pointer shadow'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {activeRally
            ? 'أكمل الحشد النشط أعلاه أولاً (أو افتح تفاصيله)'
            : selectedCdLeft > 0
              ? `الهدف يتعافى (${formatDurationAr(selectedCdLeft)})`
              : `إطلاق حشد بتنانينك (${selectedLaunchDragonIds.length}) ضد ${selectedTarget.nameAr} (-${selectedTarget.staminaCostCorn}⚡)`}
        </button>
      </SectionCard>
    </div>
  );
};
