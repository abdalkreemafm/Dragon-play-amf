import React, { useState } from 'react';
import {
  BellRing,
  CheckCheck,
  Compass,
  Crown,
  Globe,
  HeartHandshake,
  KeyRound,
  Lock,
  LogOut,
  Megaphone,
  RefreshCw,
  Rocket,
  Sliders,
  Sparkles,
  Swords,
  Unlock,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  AllianceActiveRally,
  AllianceEmblemId,
  AllianceJoinConditions,
  AllianceMemberRole,
  AllianceNotification,
  AllianceVisibility,
  GameState,
} from '../../../types/game';
import { RARITY_STYLE } from '../../../data/gameData';
import {
  ALLIANCE_EMBLEM_CATALOG,
  ALLIANCE_ROLE_META,
  AllianceLevelPerkEntry,
  formatDurationAr,
  getAllianceLevelInfo,
} from '../../../utils/economyEngine';
import { DragonIllustration } from '../../art/DuckArt';
import { soundFX } from '../../../utils/sound';
import { renderEmblemGlyph } from './AllianceHelpers';
import { AllianceMainSubTab } from '../GodsTab';

interface AllianceModalsProps {
  state: GameState;
  selfRealRole: AllianceMemberRole;
  activeRally: AllianceActiveRally | null;
  activeRallyEffectivePower: number;
  activeMarchPct: number;
  activeMarchLeftMs: number;
  levelInfo: ReturnType<typeof getAllianceLevelInfo>;
  allLevelPerks: AllianceLevelPerkEntry[];
  notifications: AllianceNotification[];
  unreadNotifCount: number;
  showRallyDetailsModal: boolean;
  setShowRallyDetailsModal: (v: boolean) => void;
  showLevelPerksModal: boolean;
  setShowLevelPerksModal: (v: boolean) => void;
  showIdentityModal: boolean;
  setShowIdentityModal: (v: boolean) => void;
  showNotifModal: boolean;
  setShowNotifModal: (v: boolean) => void;
  draftName: string;
  setDraftName: (v: string) => void;
  draftMotto: string;
  setDraftMotto: (v: string) => void;
  draftEmblem: AllianceEmblemId;
  setDraftEmblem: (v: AllianceEmblemId) => void;
  draftVisibility: AllianceVisibility;
  setDraftVisibility: (v: AllianceVisibility) => void;
  draftConditions: AllianceJoinConditions;
  setDraftConditions: React.Dispatch<React.SetStateAction<AllianceJoinConditions>>;
  onSpeedupRally: (mode: 'ALLY_HELP' | 'RESOURCE_BOOST' | 'FAST_MARCH') => void;
  onResolveAllianceRally: () => void;
  onReinforceRally: (mode: 'ALLY_CALL' | 'SELF_BOOST') => void;
  onDispatchDragonToRally: (dragonId: string) => void;
  onSendQuickAllianceInvite: (
    text: string,
    actionSubTab?: 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'ROSTER',
    actionLabel?: string
  ) => void;
  onUpdateAllianceIdentity: (
    name: string,
    motto: string,
    emblemId: AllianceEmblemId,
    visibility?: AllianceVisibility
  ) => void;
  onUpdateJoinConditions: (cond: AllianceJoinConditions) => void;
  onRegenerateSecretCode?: () => void;
  onLeavePack: () => void;
  onMarkNotificationRead: (notifId: string | 'ALL') => void;
  onNavigateSubTab: (tab: AllianceMainSubTab, rosterSec?: 'MEMBERS' | 'DIVIDENDS' | 'BLESSINGS') => void;
}

export const AllianceModals: React.FC<AllianceModalsProps> = ({
  state,
  selfRealRole,
  activeRally,
  activeRallyEffectivePower,
  activeMarchPct,
  activeMarchLeftMs,
  levelInfo,
  allLevelPerks,
  notifications,
  unreadNotifCount,
  showRallyDetailsModal,
  setShowRallyDetailsModal,
  showLevelPerksModal,
  setShowLevelPerksModal,
  showIdentityModal,
  setShowIdentityModal,
  showNotifModal,
  setShowNotifModal,
  draftName,
  setDraftName,
  draftMotto,
  setDraftMotto,
  draftEmblem,
  setDraftEmblem,
  draftVisibility,
  setDraftVisibility,
  draftConditions,
  setDraftConditions,
  onSpeedupRally,
  onResolveAllianceRally,
  onReinforceRally,
  onDispatchDragonToRally,
  onSendQuickAllianceInvite,
  onUpdateAllianceIdentity,
  onUpdateJoinConditions,
  onRegenerateSecretCode,
  onLeavePack,
  onMarkNotificationRead,
  onNavigateSubTab,
}) => {
  const [confirmLeavePack, setConfirmLeavePack] = useState(false);
  const pack = state.pack;
  const isLeader = selfRealRole === 'LEADER';
  const canEditConditions = selfRealRole === 'LEADER' || selfRealRole === 'DEPUTY';

  return (
    <>
      {/* MODAL 1: RALLY DETAILS MODAL */}
      {showRallyDetailsModal && activeRally && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4"
          onClick={() => setShowRallyDetailsModal(false)}
        >
          <div
            className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl bg-[#141824] border border-rose-400/50 p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-black text-white flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-rose-400" />
                  <span>تفاصيل الحشد: {activeRally.targetNameAr}</span>
                </div>
                <div className="text-[10.5px] font-mono-num text-slate-300">
                  الإحداثيات ({activeRally.coords.x}, {activeRally.coords.y}) · غنائم ×
                  {activeRally.lootMultiplier} · قوة فعالة{' '}
                  <strong className="text-emerald-300">
                    {activeRallyEffectivePower.toLocaleString()}
                  </strong>
                  /{activeRally.requiredPower.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setShowRallyDetailsModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-slate-950/85 border border-emerald-500/35 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-num">
                <span className="font-black text-emerald-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4" />
                  تقدم مسير الأسطول على الخريطة
                </span>
                <span className="font-black text-white">
                  {activeMarchPct}% ·{' '}
                  {activeMarchPct >= 100 ? 'وصل!' : formatDurationAr(activeMarchLeftMs)}
                </span>
              </div>

              <div className="relative h-6 flex items-center">
                <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 transition-all"
                    style={{ width: `${activeMarchPct}%` }}
                  />
                </div>
                <div
                  style={{
                    right: `clamp(0px, calc(${activeMarchPct}% - 12px), calc(100% - 24px))`,
                  }}
                  className="absolute w-6 h-6 rounded-full bg-emerald-400 border-2 border-slate-950 flex items-center justify-center shadow"
                >
                  <Rocket className="w-3 h-3 text-slate-950" />
                </div>
              </div>

              {activeMarchPct >= 100 ? (
                <button
                  onClick={() => {
                    onResolveAllianceRally();
                    setShowRallyDetailsModal(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-black text-xs hover:brightness-105 cursor-pointer shadow"
                >
                  ⚔️ حسم معركة الحشد الآن واستلام الغنائم!
                </button>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
                  <button
                    disabled={activeRally.helpUsedCount >= 5}
                    onClick={() => onSpeedupRally('ALLY_HELP')}
                    className={`py-2 px-2 rounded-xl text-[10.5px] font-black border flex items-center justify-center gap-1 ${
                      activeRally.helpUsedCount < 5
                        ? 'bg-slate-800 border-slate-600 text-amber-200 hover:border-amber-400 cursor-pointer'
                        : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>فزعة -15د ({5 - activeRally.helpUsedCount}/5)</span>
                  </button>

                  <button
                    disabled={state.corn < 100}
                    onClick={() => onSpeedupRally('RESOURCE_BOOST')}
                    className={`py-2 px-2 rounded-xl text-[10.5px] font-black border flex items-center justify-center gap-1 ${
                      state.corn >= 100
                        ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer'
                        : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>تسريع -45د (100⚡)</span>
                  </button>

                  <button
                    disabled={state.corn < 250}
                    onClick={() => onSpeedupRally('FAST_MARCH')}
                    className={`py-2 px-2 rounded-xl text-[10.5px] font-black border flex items-center justify-center gap-1 ${
                      state.corn >= 250
                        ? 'bg-amber-400/20 border-amber-400/60 text-amber-200 hover:bg-amber-400/30 cursor-pointer'
                        : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>تسريع -4س (250⚡)</span>
                  </button>
                </div>
              )}
            </div>

            {(() => {
              const selfParticipant = activeRally.participants.find(
                (pt) => pt.id === 'player_self'
              );
              const sentDragonIds = new Set(
                (selfParticipant?.dragons ?? []).map((dr) => dr.id)
              );
              return (
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-white">إرسال تنانينك للمهمة</span>
                    <button
                      disabled={state.corn < 250}
                      onClick={() => onReinforceRally('SELF_BOOST')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                        state.corn >= 250
                          ? 'bg-sky-500/20 border border-sky-400/50 text-sky-200 hover:bg-sky-500/30 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      شحن طاقة تنانينك (250⚡)
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {state.ducks.map((duck) => {
                      const alreadySent = sentDragonIds.has(duck.id);
                      return (
                        <div
                          key={duck.id}
                          className={`min-w-[106px] rounded-xl p-1.5 border text-center shrink-0 ${
                            alreadySent
                              ? 'bg-emerald-500/10 border-emerald-500/40'
                              : 'bg-slate-950/90 border-slate-700'
                          }`}
                        >
                          <DragonIllustration
                            skin={duck.skin}
                            level={duck.level}
                            showEvolutionEffects={false}
                            motionEnabled={false}
                            className="w-10 h-10 mx-auto"
                          />
                          <div className="text-[9.5px] font-black text-white truncate">
                            {duck.name}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono-num">
                            Lv.{duck.level}
                          </div>
                          {alreadySent ? (
                            <span className="mt-1 inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black">
                              في المسير ✓
                            </span>
                          ) : (
                            <button
                              onClick={() => onDispatchDragonToRally(duck.id)}
                              className="mt-1 w-full py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[9.5px] cursor-pointer hover:brightness-105"
                            >
                              إرسال الآن
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-white">
                  الأعضاء المشاركون وتنانينهم ({activeRally.participants.length}/
                  {activeRally.maxSlots})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={activeRally.participants.length >= activeRally.maxSlots}
                    onClick={() => onReinforceRally('ALLY_CALL')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${
                      activeRally.participants.length < activeRally.maxSlots
                        ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    <span>فزعة الأعضاء</span>
                  </button>
                  <button
                    onClick={() =>
                      onSendQuickAllianceInvite(
                        `📣 نداء حشد بتنانين الأعضاء نحو "${activeRally.targetNameAr}"! القوة ${activeRallyEffectivePower.toLocaleString()}/${activeRally.requiredPower.toLocaleString()}.`,
                        'MAP',
                        'انضم للحشد'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-400/50 text-amber-200 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Megaphone className="w-3 h-3" />
                    <span>دعوة</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                {activeRally.participants.map((pt) => {
                  const rm = ALLIANCE_ROLE_META[pt.role];
                  const dragonsList = pt.dragons ?? [];
                  return (
                    <div
                      key={pt.id}
                      className={`rounded-xl p-2.5 border space-y-1.5 ${
                        pt.id === 'player_self'
                          ? 'bg-amber-500/10 border-amber-400/50'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono-num">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-white">{pt.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[9px] font-black ${rm.badgeClass}`}
                          >
                            {rm.labelAr}
                          </span>
                        </div>
                        <span className="font-black text-amber-300">
                          +{pt.power.toLocaleString()} قوة
                        </span>
                      </div>

                      {dragonsList.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {dragonsList.map((dr) => {
                            const rStyle = RARITY_STYLE[dr.rarity];
                            return (
                              <div
                                key={dr.id}
                                className="rounded-lg bg-slate-950/80 border border-slate-800 px-2 py-1 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <DragonIllustration
                                    skin={dr.skin}
                                    level={dr.level}
                                    showEvolutionEffects={false}
                                    motionEnabled={false}
                                    className="w-7 h-7 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-[10px] font-black text-white truncate">
                                      {dr.name}
                                    </div>
                                    <div className={`text-[9px] font-mono-num ${rStyle.color}`}>
                                      Lv.{dr.level} · {rStyle.labelAr}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[9.5px] font-mono-num font-black text-emerald-300 shrink-0">
                                  {dr.power.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ALLIANCE LEVEL PERKS MODAL */}
      {showLevelPerksModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4"
          onClick={() => setShowLevelPerksModal(false)}
        >
          <div
            className="w-full max-w-xl max-h-[86vh] overflow-y-auto rounded-3xl bg-[#141824] border border-amber-400/50 p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    مزايا مستويات السرب (المستوى الحالي: Lv.{levelInfo.level})
                  </h3>
                  <p className="text-[10.5px] text-slate-300">
                    كل مستوى يفتح مزايا جديدة ومقاعد حشد إضافية وسعة خزينة أكبر لكل الأعضاء.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLevelPerksModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-slate-950/85 border border-emerald-400/40 p-2.5 grid grid-cols-4 gap-1.5 text-center font-mono-num text-[10px]">
              <div>
                <div className="text-slate-400">الأعضاء</div>
                <div className="font-black text-sky-300">{levelInfo.maxMembers}</div>
              </div>
              <div>
                <div className="text-slate-400">قوة السرب</div>
                <div className="font-black text-rose-300">+{levelInfo.powerBonusPct}%</div>
              </div>
              <div>
                <div className="text-slate-400">الغنائم</div>
                <div className="font-black text-emerald-300">+{levelInfo.levelLootBonusPct}%</div>
              </div>
              <div>
                <div className="text-slate-400">مقاعد الحشد</div>
                <div className="font-black text-amber-300">+{levelInfo.rallySlotBonus}</div>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[54vh] overflow-y-auto pr-0.5">
              {allLevelPerks.map((perk) => {
                const unlocked = levelInfo.level >= perk.level;
                const isCurrent = levelInfo.level === perk.level;
                return (
                  <div
                    key={perk.level}
                    className={`rounded-2xl p-2.5 border space-y-1 ${
                      isCurrent
                        ? 'bg-amber-500/15 border-amber-400/70'
                        : unlocked
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-slate-900/80 border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {unlocked ? (
                          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span className="font-black text-white font-mono-num">
                          المستوى Lv.{perk.level}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                            مستواك الحالي
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono-num text-amber-300">
                        {perk.xpRequired.toLocaleString()} XP
                      </span>
                    </div>

                    <p className="text-[10.5px] font-bold text-emerald-300">
                      {perk.unlockedFeatureAr}
                    </p>
                    <div className="text-[9.5px] font-mono-num text-slate-300 flex flex-wrap gap-2">
                      <span>أعضاء: {perk.maxMembers}</span>
                      <span>· خزينة: {perk.vaultCapacity.toLocaleString()}⚡</span>
                      <span>· قوة: +{perk.powerBonusPct}%</span>
                      <span>· غنائم: +{perk.levelLootBonusPct}%</span>
                      {perk.rallySlotBonus > 0 && <span>· +{perk.rallySlotBonus} مقاعد حشد</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LEADER / DEPUTY ALLIANCE SETTINGS EDITOR MODAL */}
      {showIdentityModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4"
          onClick={() => setShowIdentityModal(false)}
        >
          <div
            className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl bg-[#141824] border border-amber-400/50 p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white">
                  {isLeader ? 'إدارة هوية السرب وخصوصيته' : 'تعديل شروط الانضمام للسرب'}
                </h3>
              </div>
              <button
                onClick={() => setShowIdentityModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isLeader && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/40 px-3 py-2 text-[10.5px] font-bold text-amber-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                <span>
                  {canEditConditions
                    ? 'بصفتك نائب القائد (R4)، يمكنك تعديل شروط الانضمام فقط. تعديل الاسم والراية والسرية مخصص للقائد (R5).'
                    : 'هذه الإعدادات للقراءة فقط لرتبتك الحالية.'}
                </span>
              </div>
            )}

            <div className={`space-y-2 ${!isLeader ? 'opacity-60' : ''}`}>
              <label className="block space-y-1">
                <span className="text-[11px] font-black text-slate-300">اسم السرب</span>
                <input
                  type="text"
                  maxLength={32}
                  disabled={!isLeader}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-amber-400 disabled:cursor-not-allowed"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-black text-slate-300">شعار ووصف السرب</span>
                <input
                  type="text"
                  maxLength={72}
                  disabled={!isLeader}
                  value={draftMotto}
                  onChange={(e) => setDraftMotto(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 disabled:cursor-not-allowed"
                />
              </label>
            </div>

            {/* Visibility & Secret Invite Code Controls (Leader Only) */}
            <div className={`rounded-2xl bg-slate-900/90 border border-slate-800 p-3 space-y-2 ${!isLeader ? 'opacity-60' : ''}`}>
              <div className="text-[11px] font-black text-slate-300">حالة ظهور السرب في قاعدة البيانات:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!isLeader}
                  onClick={() => setDraftVisibility('PUBLIC')}
                  className={`p-2 rounded-xl border text-right transition-all ${
                    draftVisibility === 'PUBLIC'
                      ? 'bg-sky-500/20 border-sky-400 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400'
                  } ${isLeader ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>سرب عام</span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!isLeader}
                  onClick={() => setDraftVisibility('SECRET')}
                  className={`p-2 rounded-xl border text-right transition-all ${
                    draftVisibility === 'SECRET'
                      ? 'bg-purple-500/20 border-purple-400 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400'
                  } ${isLeader ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <Lock className="w-3.5 h-3.5 text-purple-300" />
                    <span>سرب سري (بالرمز)</span>
                  </div>
                </button>
              </div>

              {pack.inviteCode && (
                <div className="flex items-center justify-between gap-2 pt-1 text-[10.5px]">
                  <span className="font-mono-num font-black text-amber-300 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>رمز الدعوة: {pack.inviteCode}</span>
                  </span>
                  {isLeader && onRegenerateSecretCode && (
                    <button
                      type="button"
                      onClick={() => onRegenerateSecretCode()}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-400/50 text-purple-200 hover:bg-purple-500/30 font-black flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>تجديد الرمز</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className={`space-y-1.5 ${!isLeader ? 'opacity-60' : ''}`}>
              <div className="text-[11px] font-black text-slate-300">اختر راية وشعار السرب:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALLIANCE_EMBLEM_CATALOG.map((emb) => {
                  const selected = draftEmblem === emb.id;
                  return (
                    <button
                      key={emb.id}
                      type="button"
                      disabled={!isLeader}
                      onClick={() => {
                        if (!isLeader) return;
                        soundFX.playTapFeed();
                        setDraftEmblem(emb.id);
                      }}
                      className={`rounded-2xl p-2 border text-center space-y-1 transition-all ${
                        selected
                          ? 'bg-amber-400/20 border-amber-400 ring-1 ring-amber-300'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'
                      } ${isLeader ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      <div
                        className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${emb.bgGradient} border ${emb.borderClass} flex items-center justify-center`}
                      >
                        {renderEmblemGlyph(emb.id, `w-5 h-5 ${emb.iconColorClass}`)}
                      </div>
                      <div className="text-[10px] font-black text-white truncate">{emb.nameAr}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-amber-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>شروط الانضمام للسرب</span>
                </span>
                <button
                  type="button"
                  disabled={!canEditConditions}
                  onClick={() =>
                    setDraftConditions((prev) => ({ ...prev, autoAccept: !prev.autoAccept }))
                  }
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                    draftConditions.autoAccept
                      ? 'bg-emerald-500/25 border border-emerald-400/60 text-emerald-200'
                      : 'bg-slate-800 border border-slate-700 text-slate-300'
                  } ${canEditConditions ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                >
                  {draftConditions.autoAccept ? 'قبول فوري: مفعّل' : 'قبول فوري: يدوي'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">أقل قوة</span>
                  <input
                    type="number"
                    disabled={!canEditConditions}
                    min={0}
                    max={50000}
                    step={50}
                    value={draftConditions.minPower}
                    onChange={(e) =>
                      setDraftConditions((p) => ({
                        ...p,
                        minPower: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-num disabled:opacity-60"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">أقل عدد تنانين</span>
                  <input
                    type="number"
                    disabled={!canEditConditions}
                    min={1}
                    max={8}
                    value={draftConditions.minDragons}
                    onChange={(e) =>
                      setDraftConditions((p) => ({
                        ...p,
                        minDragons: Math.max(1, Math.min(8, Number(e.target.value) || 1)),
                      }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-num disabled:opacity-60"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">مستوى التنين</span>
                  <input
                    type="number"
                    disabled={!canEditConditions}
                    min={1}
                    max={5}
                    value={draftConditions.minDragonLevel}
                    onChange={(e) =>
                      setDraftConditions((p) => ({
                        ...p,
                        minDragonLevel: Math.max(1, Math.min(5, Number(e.target.value) || 1)),
                      }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-num disabled:opacity-60"
                  />
                </label>
              </div>
            </div>

            {canEditConditions && (
              <button
                type="button"
                onClick={() => {
                  if (isLeader) {
                    onUpdateAllianceIdentity(draftName, draftMotto, draftEmblem, draftVisibility);
                  }
                  onUpdateJoinConditions(draftConditions);
                  setShowIdentityModal(false);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-black text-xs hover:brightness-105 cursor-pointer shadow"
              >
                {isLeader ? 'حفظ الهوية والخصوصية وشروط الانضمام' : 'حفظ شروط الانضمام'}
              </button>
            )}

            {pack.joined && (
              <div className="pt-1 border-t border-slate-800 flex items-center justify-end">
                {confirmLeavePack ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setConfirmLeavePack(false);
                        setShowIdentityModal(false);
                        onLeavePack();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-black text-[11px] cursor-pointer"
                    >
                      تأكيد مغادرة السرب؟
                    </button>
                    <button
                      onClick={() => setConfirmLeavePack(false)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-black text-[11px] cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmLeavePack(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-400/50 text-rose-200 hover:bg-rose-500/25 font-black text-[11px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>مغادرة السرب</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: SMART NOTIFICATIONS MODAL */}
      {showNotifModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4"
          onClick={() => setShowNotifModal(false)}
        >
          <div
            className="w-full max-w-lg max-h-[82vh] overflow-y-auto rounded-3xl bg-[#141824] border border-amber-400/50 p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-300" />
                <h3 className="text-sm font-black text-white">تنبيهات السرب الذكية</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {unreadNotifCount > 0 && (
                  <button
                    onClick={() => onMarkNotificationRead('ALL')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-black text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>قراءة الكل</span>
                  </button>
                )}
                <button
                  onClick={() => setShowNotifModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`rounded-2xl p-2.5 border space-y-1.5 ${
                    notif.read
                      ? 'bg-slate-950/60 border-slate-800/80 opacity-75'
                      : 'bg-slate-900/95 border-amber-400/45'
                  }`}
                >
                  <div className="text-xs font-black text-white">{notif.titleAr}</div>
                  <p className="text-[10.5px] text-slate-300 leading-snug">{notif.bodyAr}</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onMarkNotificationRead(notif.id);
                        onNavigateSubTab(
                          notif.targetSubTab,
                          notif.targetSubTab === 'ROSTER' ? 'DIVIDENDS' : undefined
                        );
                        setShowNotifModal(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-600 text-[10px] font-black text-white cursor-pointer"
                    >
                      انتقال للقسم
                    </button>
                    {notif.inviteText && (
                      <button
                        onClick={() => {
                          onMarkNotificationRead(notif.id);
                          onSendQuickAllianceInvite(
                            notif.inviteText ?? notif.titleAr,
                            notif.targetSubTab,
                            'مشاركة الآن'
                          );
                          setShowNotifModal(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Megaphone className="w-3 h-3" />
                        <span>دعوة سريعة للشات</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
