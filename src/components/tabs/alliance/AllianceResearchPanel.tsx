import React from 'react';
import { Clock, FlaskConical, Megaphone, Sparkles } from 'lucide-react';
import {
  AllianceActiveResearch,
  AllianceLedger,
  AllianceTechId,
  GameState,
} from '../../../types/game';
import {
  ALLIANCE_BLESSING_RESEARCH_MISSIONS,
  ALLIANCE_RESEARCH_CATALOG,
  formatDurationAr,
  getAllianceTechRequirements,
} from '../../../utils/economyEngine';
import { GodIllustration } from '../../art/DuckArt';
import { soundFX } from '../../../utils/sound';
import { SectionCard, SectionHeader } from '../../ui/SectionCard';

interface AllianceResearchPanelProps {
  state: GameState;
  nowTs: number;
  ledger: AllianceLedger;
  techLevels: Record<AllianceTechId, number>;
  techFunding: Record<AllianceTechId, number>;
  activeResearch: AllianceActiveResearch | null;
  convertedBlessingIds: Set<string>;
  blessingTargetTech: AllianceTechId;
  setBlessingTargetTech: (techId: AllianceTechId) => void;
  onConvertBlessingToResearch: (godId: string, targetTechId: AllianceTechId) => void;
  onFundAllianceTech: (techId: AllianceTechId, mode: 'ENERGY_SMALL' | 'ENERGY_CONVOY' | 'POOL') => void;
  onStartAllianceResearch: (techId: AllianceTechId) => void;
  onSpeedupAllianceResearch: (mode: 'FREE' | 'GOLD_6H' | 'GOLD_24H') => void;
  onSendQuickAllianceInvite: (
    text: string,
    actionSubTab?: 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'ROSTER',
    actionLabel?: string
  ) => void;
  onGoToBlessings: () => void;
}

export const AllianceResearchPanel: React.FC<AllianceResearchPanelProps> = ({
  state,
  nowTs,
  ledger,
  techLevels,
  techFunding,
  activeResearch,
  convertedBlessingIds,
  blessingTargetTech,
  setBlessingTargetTech,
  onConvertBlessingToResearch,
  onFundAllianceTech,
  onStartAllianceResearch,
  onSpeedupAllianceResearch,
  onSendQuickAllianceInvite,
  onGoToBlessings,
}) => {
  const pack = state.pack;

  return (
    <div className="space-y-3">
      <SectionCard accent="sky" compact className="space-y-2">
        <SectionHeader
          title="مختبر أبحاث السرب"
          icon={<FlaskConical className="w-4 h-4 text-cyan-400" />}
          action={
            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-[10px] font-mono-num font-black text-cyan-200">
              تبدأ من 100,000 وتتضاعف ×2 كل مستوى
            </span>
          }
        />

        <div className="grid grid-cols-3 gap-1.5 text-center font-mono-num text-[10px]">
          <div className="rounded-xl bg-slate-950/75 border border-slate-800 py-1.5">
            <div className="text-slate-400">مخزون البحث</div>
            <div className="font-black text-cyan-300">
              {ledger.techPointsPool.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/75 border border-slate-800 py-1.5">
            <div className="text-slate-400">ذهب الخزينة</div>
            <div className="font-black text-amber-300">{ledger.vaultGold} 💎</div>
          </div>
          <div className="rounded-xl bg-slate-950/75 border border-slate-800 py-1.5">
            <div className="text-slate-400">تسريع الانتظار</div>
            <div className="font-black text-emerald-300">
              -{Math.min(65, (techLevels.tech_march_speed ?? 0) * 4)}%
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Convert Blessing Cards into Alliance Research Missions */}
      <div className="rounded-2xl bg-gradient-to-b from-[#1e172c] to-[#161923] border border-purple-500/40 p-3 space-y-2.5">
        <SectionHeader
          title="تحويل بطاقات البركات إلى مهمات أبحاث السرب"
          icon={<Sparkles className="w-4 h-4 text-amber-400" />}
          meta={`محوّلة: ${convertedBlessingIds.size}/${state.godCards.length}`}
        />

        <div className="space-y-1">
          <div className="text-[10px] text-slate-300 font-bold">
            اختر البحث المستهدف الذي سيستلم نقاط المهمة:
          </div>
          <div className="flex flex-wrap gap-1">
            {ALLIANCE_RESEARCH_CATALOG.map((t) => {
              const selected = blessingTargetTech === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    soundFX.playTapFeed();
                    setBlessingTargetTech(t.id);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                    selected
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-cyan-400'
                  }`}
                >
                  {t.nameAr}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {state.godCards.map((god) => {
            const mission = ALLIANCE_BLESSING_RESEARCH_MISSIONS[god.id];
            const converted = convertedBlessingIds.has(god.id);
            if (!mission) return null;
            return (
              <div
                key={god.id}
                className={`rounded-xl p-2.5 border space-y-1.5 ${
                  converted
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : god.owned
                      ? 'bg-purple-500/15 border-purple-400/50'
                      : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">{god.name}</div>
                    <div className="text-[10px] font-bold text-purple-200 truncate">
                      {mission.missionTitleAr}
                    </div>
                  </div>
                  <GodIllustration godId={god.godKey} className="w-9 h-9 shrink-0" />
                </div>
                <div className="text-[9.5px] font-mono-num text-emerald-300 font-bold">
                  +{mission.techPointsGain.toLocaleString()} بحث · +{mission.allianceXpGain.toLocaleString()} XP · +{mission.coinsGain}🪙
                </div>
                {converted ? (
                  <div className="py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-black text-center">
                    تم تحويل البطاقة لمهمة بحث ✓
                  </div>
                ) : god.owned ? (
                  <button
                    onClick={() => {
                      soundFX.playGodConfirm();
                      onConvertBlessingToResearch(god.id, blessingTargetTech);
                    }}
                    className="w-full py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[10.5px] hover:brightness-105 cursor-pointer"
                  >
                    تحويل إلى مهمة بحث الآن
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      soundFX.playTabSwitch();
                      onGoToBlessings();
                    }}
                    className="w-full py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-300 font-black text-[10px] cursor-pointer"
                  >
                    تفعيل البطاقة من البركات أولاً
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Research Timer Card */}
      {activeResearch && (() => {
        const resMeta = ALLIANCE_RESEARCH_CATALOG.find((t) => t.id === activeResearch.techId);
        const totalSpan = Math.max(1, activeResearch.endsAt - activeResearch.startedAt);
        const leftMs = Math.max(0, activeResearch.endsAt - nowTs);
        const pct = Math.min(100, Math.round(((totalSpan - leftMs) / totalSpan) * 100));
        return (
          <div className="rounded-2xl bg-gradient-to-r from-[#132530] to-[#161923] border border-cyan-400/55 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-300" />
                  <span>
                    قيد التطوير: {resMeta?.nameAr} (إلى Lv.{activeResearch.targetLevel})
                  </span>
                </div>
                <div className="text-[10px] text-cyan-200 font-mono-num">
                  فزعات الأعضاء: {activeResearch.helpsReceived}/12 · المتبقي: {formatDurationAr(leftMs)}
                </div>
              </div>
              <span className="font-mono-num text-xs font-black text-cyan-300">{pct}%</span>
            </div>

            <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                disabled={activeResearch.helpsReceived >= 12}
                onClick={() => onSpeedupAllianceResearch('FREE')}
                className={`py-2 px-1.5 rounded-xl text-[10.5px] font-black ${
                  activeResearch.helpsReceived < 12
                    ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer'
                    : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                فزعة -1س ({12 - activeResearch.helpsReceived}/12)
              </button>
              <button
                disabled={state.duckGold < 1}
                onClick={() => onSpeedupAllianceResearch('GOLD_6H')}
                className={`py-2 px-1.5 rounded-xl text-[10.5px] font-black ${
                  state.duckGold >= 1
                    ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                تسريع -6س (1💎)
              </button>
              <button
                disabled={state.duckGold < 3}
                onClick={() => onSpeedupAllianceResearch('GOLD_24H')}
                className={`py-2 px-1.5 rounded-xl text-[10.5px] font-black ${
                  state.duckGold >= 3
                    ? 'bg-rose-500 text-white hover:brightness-110 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                تسريع -24س (3💎)
              </button>
              <button
                onClick={() =>
                  onSendQuickAllianceInvite(
                    `🔬 بحث "${resMeta?.nameAr}" (Lv.${activeResearch.targetLevel}) قيد التطوير الآن! أرسلوا فزعات التسريع (-1س لكل عضو).`,
                    'RESEARCH',
                    'فزعة البحث'
                  )
                }
                className="py-2 px-1.5 rounded-xl text-[10.5px] font-black bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30 cursor-pointer flex items-center justify-center gap-1"
              >
                <Megaphone className="w-3 h-3" />
                <span>نداء فزعة</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Research Nodes List (100k -> 200k -> 400k -> ...) */}
      <div className="space-y-2.5">
        {ALLIANCE_RESEARCH_CATALOG.map((tech) => {
          const curLv = techLevels[tech.id] ?? 0;
          const maxed = curLv >= tech.maxLevel;
          const req = getAllianceTechRequirements(
            tech.id,
            curLv,
            techLevels.tech_march_speed ?? 0
          );
          const curFund = Math.min(req.requiredTechPoints, techFunding[tech.id] ?? 0);
          const fundPct = Math.min(
            100,
            Math.round((curFund / Math.max(1, req.requiredTechPoints)) * 100)
          );
          const isDevelopingThis = activeResearch?.techId === tech.id;
          const pointsComplete = curFund >= req.requiredTechPoints;
          const canStart =
            !maxed &&
            !activeResearch &&
            pointsComplete &&
            pack.treasuryCorn >= req.requiredVaultCorn &&
            ledger.vaultGold >= req.requiredVaultGold;

          return (
            <div
              key={tech.id}
              className={`rounded-2xl p-3 border space-y-2 ${
                isDevelopingThis
                  ? 'bg-cyan-500/10 border-cyan-400/60'
                  : 'bg-[#161923] border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-black text-white">
                      {tech.nameAr}
                    </span>
                    <span className="font-mono-num text-[10px] font-black text-amber-300">
                      Lv.{curLv}/{tech.maxLevel}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-emerald-400 font-bold">
                    {tech.effectPerLevelAr}
                  </div>
                </div>

                {!maxed && (
                  <button
                    onClick={() =>
                      onSendQuickAllianceInvite(
                        `🧪 نداء تمويل جماعي لبحث "${tech.nameAr}" نحو Lv.${req.nextLevel} (${curFund.toLocaleString()}/${req.requiredTechPoints.toLocaleString()} نقطة).`,
                        'RESEARCH',
                        'دعم البحث'
                      )
                    }
                    className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-400 text-[9.5px] font-black text-cyan-300 shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <Megaphone className="w-3 h-3" />
                    <span>نداء</span>
                  </button>
                )}
              </div>

              {!maxed && (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono-num">
                      <span className="text-slate-300">
                        تمويل الترقية إلى Lv.{req.nextLevel} (المستوى التالي يتضاعف ×2)
                      </span>
                      <span className="font-black text-cyan-300">
                        {curFund.toLocaleString()} / {req.requiredTechPoints.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all"
                        style={{ width: `${fundPct}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[9.5px] font-mono-num text-slate-400">
                      <span>
                        بدء التطوير:{' '}
                        <strong
                          className={
                            pack.treasuryCorn >= req.requiredVaultCorn
                              ? 'text-emerald-300'
                              : 'text-rose-400'
                          }
                        >
                          {req.requiredVaultCorn.toLocaleString()}⚡
                        </strong>
                        {req.requiredVaultGold > 0 && (
                          <strong
                            className={
                              ledger.vaultGold >= req.requiredVaultGold
                                ? 'text-amber-300'
                                : 'text-rose-400'
                            }
                          >
                            {' '}
                            + {req.requiredVaultGold}💎
                          </strong>
                        )}
                      </span>
                      <span className="text-amber-200 font-bold">
                        الانتظار: {req.durationHours} ساعة
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      disabled={pointsComplete || state.corn < 500}
                      onClick={() => onFundAllianceTech(tech.id, 'ENERGY_SMALL')}
                      className={`py-2 px-1.5 rounded-xl text-[10px] font-black font-mono-num ${
                        !pointsComplete && state.corn >= 500
                          ? 'bg-sky-500/20 border border-sky-400/50 text-sky-200 hover:bg-sky-500/30 cursor-pointer'
                          : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      +5,000 (500⚡)
                    </button>

                    <button
                      disabled={pointsComplete || state.corn < 2500}
                      onClick={() => onFundAllianceTech(tech.id, 'ENERGY_CONVOY')}
                      className={`py-2 px-1.5 rounded-xl text-[10px] font-black font-mono-num ${
                        !pointsComplete && state.corn >= 2500
                          ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer'
                          : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      +28,000 (2,500⚡)
                    </button>

                    <button
                      disabled={pointsComplete || ledger.techPointsPool <= 0}
                      onClick={() => onFundAllianceTech(tech.id, 'POOL')}
                      className={`py-2 px-1.5 rounded-xl text-[10px] font-black font-mono-num ${
                        !pointsComplete && ledger.techPointsPool > 0
                          ? 'bg-purple-500/20 border border-purple-400/50 text-purple-200 hover:bg-purple-500/30 cursor-pointer'
                          : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      مخزون (+25,000)
                    </button>

                    <button
                      disabled={!canStart}
                      onClick={() => onStartAllianceResearch(tech.id)}
                      className={`py-2 px-1.5 rounded-xl text-[10.5px] font-black ${
                        canStart
                          ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer shadow'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isDevelopingThis
                        ? 'قيد التطوير...'
                        : `تطوير (${req.durationHours}س)`}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
