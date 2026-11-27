import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Megaphone,
  PieChart,
  RefreshCw,
  Sparkles,
  UserMinus,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { AllianceMemberRole, AllianceTechId, GameState } from '../../../types/game';

const ROLE_WEIGHT: Record<AllianceMemberRole, number> = {
  MEMBER: 1,
  ELITE: 2,
  DEPUTY: 3,
  LEADER: 4,
};
import { ACTIVE_SEASON, TREASURE_RACE_STEPS } from '../../../data/gameData';
import {
  ALLIANCE_BLESSING_RESEARCH_MISSIONS,
  ALLIANCE_ROLE_META,
  calculateAllianceDividendBreakdown,
  formatDurationAr,
} from '../../../utils/economyEngine';
import { GodIllustration, GoldIcon, StarIcon } from '../../art/DuckArt';
import { soundFX } from '../../../utils/sound';
import { shareViaTelegram } from '../../../utils/telegram';
import { SectionCard } from '../../ui/SectionCard';
import { SortedRosterMember, TREASURE_THRESHOLDS } from './AllianceHelpers';

interface AllianceRosterPanelProps {
  state: GameState;
  currentUid: string | null;
  rosterSection: 'MEMBERS' | 'DIVIDENDS' | 'BLESSINGS';
  setRosterSection: (sec: 'MEMBERS' | 'DIVIDENDS' | 'BLESSINGS') => void;
  sortedRoster: SortedRosterMember[];
  selfRealRole: AllianceMemberRole;
  leaderName: string;
  canManageMembers: boolean;
  dividendBreakdown: ReturnType<typeof calculateAllianceDividendBreakdown>;
  dividendReady: boolean;
  dividendCdLeftMs: number;
  treasurePoints: number;
  convertedBlessingIds: Set<string>;
  blessingTargetTech: AllianceTechId;
  onLeavePack: () => void;
  onPromoteDemoteMember: (memberId: string, direction: 'UP' | 'DOWN') => void;
  onKickMember: (memberId: string) => void;
  onTransferLeadership?: (memberId: string) => void;
  onRegenerateSecretCode?: () => void;
  onSendQuickAllianceInvite: (
    text: string,
    actionSubTab?: 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'ROSTER',
    actionLabel?: string
  ) => void;
  onDistributeAllianceDividends: () => void;
  onClaimTreasureStep: (threshold: number, stepNumber: number) => void;
  onConvertBlessingToResearch: (godId: string, targetTechId: AllianceTechId) => void;
  onActivateGod: (godId: string, payWith: 'gold' | 'stars') => void;
  onOpenExchangeGold: () => void;
}

export const AllianceRosterPanel: React.FC<AllianceRosterPanelProps> = ({
  state,
  currentUid,
  rosterSection,
  setRosterSection,
  sortedRoster,
  selfRealRole,
  leaderName,
  canManageMembers,
  dividendBreakdown,
  dividendReady,
  dividendCdLeftMs,
  treasurePoints,
  convertedBlessingIds,
  blessingTargetTech,
  onLeavePack,
  onPromoteDemoteMember,
  onKickMember,
  onTransferLeadership,
  onRegenerateSecretCode,
  onSendQuickAllianceInvite,
  onDistributeAllianceDividends,
  onClaimTreasureStep,
  onConvertBlessingToResearch,
  onActivateGod,
  onOpenExchangeGold,
}) => {
  const [confirmKickMemberId, setConfirmKickMemberId] = useState<string | null>(null);
  const [confirmTransferMemberId, setConfirmTransferMemberId] = useState<string | null>(null);
  const [confirmLeavePack, setConfirmLeavePack] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);

  const pack = state.pack;
  const currentGod = state.godCards[carouselIdx] ?? state.godCards[0];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
        <button
          onClick={() => {
            soundFX.playTabSwitch();
            setRosterSection('MEMBERS');
          }}
          className={`py-1.5 rounded-lg text-[10.5px] font-black flex items-center justify-center gap-1 cursor-pointer ${
            rosterSection === 'MEMBERS'
              ? 'bg-slate-800 text-amber-300 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>الأعضاء والرتب</span>
        </button>
        <button
          onClick={() => {
            soundFX.playTabSwitch();
            setRosterSection('DIVIDENDS');
          }}
          className={`py-1.5 rounded-lg text-[10.5px] font-black flex items-center justify-center gap-1 cursor-pointer ${
            rosterSection === 'DIVIDENDS'
              ? 'bg-slate-800 text-emerald-300 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>الأرباح والترابط</span>
        </button>
        <button
          onClick={() => {
            soundFX.playTabSwitch();
            setRosterSection('BLESSINGS');
          }}
          className={`py-1.5 rounded-lg text-[10.5px] font-black flex items-center justify-center gap-1 cursor-pointer ${
            rosterSection === 'BLESSINGS'
              ? 'bg-slate-800 text-amber-300 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>البركات والكنوز</span>
        </button>
      </div>

      {rosterSection === 'MEMBERS' && (
        <div className="space-y-3">
          {/* Roster Actions Bar: Invite Real Friend + Invite Code + Leave Alliance */}
          <SectionCard compact className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.playTapFeed();
                  const inviteText = pack.inviteCode
                    ? `🐉 انضم إلى سربي "${pack.packName}" في DRAGON × AMF! رمز الدعوة: ${pack.inviteCode}`
                    : `🐉 انضم إلى تحالفي "${pack.packName}" في DRAGON × AMF!`;
                  const inviteUrl = currentUid
                    ? `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(inviteText)}`
                    : window.location.origin;
                  shareViaTelegram(
                    inviteText,
                    inviteUrl.startsWith('https://t.me/share') ? window.location.origin : inviteUrl
                  );
                }}
                className="px-3 py-1.5 rounded-xl font-black text-[11px] flex items-center gap-1.5 bg-sky-500/20 border border-sky-400/55 text-sky-200 hover:bg-sky-500/30 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>دعوة صديق حقيقي للسرب</span>
              </button>

              {confirmLeavePack ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setConfirmLeavePack(false);
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
                    تراجع
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

            {pack.inviteCode && (
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-2.5 py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-black flex items-center gap-1 ${
                      pack.visibility === 'SECRET'
                        ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                        : 'bg-sky-500/15 border-sky-400/45 text-sky-200'
                    }`}
                  >
                    {pack.visibility === 'SECRET' ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>سرب سري</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3" />
                        <span>سرب عام</span>
                      </>
                    )}
                  </span>
                  <span className="font-mono-num font-black text-amber-300 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>{pack.inviteCode}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playTapFeed();
                      navigator.clipboard?.writeText(pack.inviteCode || '').catch(() => {});
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 1800);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-400 text-[10px] font-black text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'تم النسخ' : 'نسخ الرمز'}</span>
                  </button>
                  {selfRealRole === 'LEADER' && onRegenerateSecretCode && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playGodConfirm();
                        onRegenerateSecretCode();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-400/50 hover:bg-purple-500/30 text-[10px] font-black text-purple-200 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>تجديد الرمز</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </SectionCard>

          <div className="rounded-2xl bg-gradient-to-b from-[#1d192b] to-[#161923] border border-amber-500/35 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-black text-white">سلم رتب ومناصب وصلاحيات السرب</h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${
                  (ALLIANCE_ROLE_META[selfRealRole] ?? ALLIANCE_ROLE_META.MEMBER).badgeClass
                }`}
              >
                {selfRealRole === 'LEADER'
                  ? `R5 · القائد (${state.username})`
                  : `${(ALLIANCE_ROLE_META[selfRealRole] ?? ALLIANCE_ROLE_META.MEMBER).rankCode} · ${
                      (ALLIANCE_ROLE_META[selfRealRole] ?? ALLIANCE_ROLE_META.MEMBER).labelAr
                    }`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
              {([
                {
                  roleKey: 'LEADER' as AllianceMemberRole,
                  perms: 'تعديل الاسم والشعار والسرية، تعيين/طرد النواب، نقل القيادة، وشروط الانضمام.',
                },
                {
                  roleKey: 'DEPUTY' as AllianceMemberRole,
                  perms: 'ترقية الأعضاء للنخبة، خفض وطرد النخبة والأعضاء، وتعديل شروط الانضمام.',
                },
                {
                  roleKey: 'ELITE' as AllianceMemberRole,
                  perms: 'أولوية الحشود ومكافأة جدارة +8% بدون صلاحيات إدارية.',
                },
                {
                  roleKey: 'MEMBER' as AllianceMemberRole,
                  perms: 'المشاركة بالتبرع والشات والحشود والحصول على حصص الأرباح.',
                },
              ]).map((entry) => {
                const rm = ALLIANCE_ROLE_META[entry.roleKey];
                return (
                  <div
                    key={entry.roleKey}
                    className="rounded-xl bg-slate-950/70 border border-slate-800 p-2 space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white">
                        {entry.roleKey === 'LEADER' ? `👑 ${leaderName}` : rm.labelAr}
                      </span>
                      <span className="font-mono-num text-[9px] text-amber-300 font-bold">
                        {rm.rankCode}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 leading-tight">{entry.perms}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            {sortedRoster.map((member, idx) => {
              const roleStyle = ALLIANCE_ROLE_META[member.role] ?? ALLIANCE_ROLE_META.MEMBER;
              const activityPct = Math.min(100, Math.max(0, member.dailyActivity));
              const isLeader = member.role === 'LEADER';
              const isConfirmingKick = confirmKickMemberId === member.id;
              const isConfirmingTransfer = confirmTransferMemberId === member.id;
              const actorWeight = ROLE_WEIGHT[selfRealRole] ?? 1;
              const targetWeight = ROLE_WEIGHT[member.role] ?? 1;
              const canManageTarget =
                canManageMembers && !member.isSelf && !isLeader && actorWeight > targetWeight;
              const canPromoteTarget = canManageTarget && targetWeight + 1 < actorWeight;
              const canDemoteTarget = canManageTarget && member.role !== 'MEMBER';
              const canTransferToTarget =
                selfRealRole === 'LEADER' && !member.isSelf && !isLeader && Boolean(onTransferLeadership);

              return (
                <div
                  key={member.id}
                  className={`rounded-2xl p-3 border space-y-2 ${
                    member.isSelf
                      ? 'bg-amber-500/10 border-amber-400/50'
                      : 'bg-[#161923] border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono-num text-xs font-black text-amber-300 shrink-0">
                        {isLeader ? (
                          <Crown className="w-4 h-4 text-amber-400" />
                        ) : (
                          `#${idx + 1}`
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-black text-white truncate">
                            {member.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md border text-[9.5px] font-black ${roleStyle.badgeClass}`}
                          >
                            {isLeader ? `القائد (${roleStyle.rankCode})` : `${roleStyle.rankCode} · ${member.titleAr}`}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              member.online ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          <span className="text-amber-300 font-bold">
                            {roleStyle.rankCode}
                          </span>{' '}
                          · <span>{member.lastSeenAr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left font-mono-num shrink-0">
                      <div className="text-xs font-black text-rose-300">
                        {member.power.toLocaleString()} قوة
                      </div>
                      <div className="text-[10px] text-emerald-300">
                        تبرع: {(member.donatedEnergy ?? 0).toLocaleString()}⚡
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <div className="flex-1 min-w-[140px] space-y-1">
                      <div className="flex items-center justify-between text-[9.5px] font-mono-num">
                        <span className="text-slate-400 font-bold">النشاط اليومي</span>
                        <span className="font-black text-emerald-300">{activityPct}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all"
                          style={{ width: `${activityPct}%` }}
                        />
                      </div>
                    </div>

                    {canManageTarget && (
                      <div className="flex flex-wrap items-center gap-1 shrink-0">
                        {canPromoteTarget && (
                          <button
                            onClick={() => onPromoteDemoteMember(member.id, 'UP')}
                            className="px-2 py-1 rounded-lg border text-[9.5px] font-black flex items-center gap-0.5 bg-emerald-500/15 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/25 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                            <span>ترقية</span>
                          </button>
                        )}
                        {canDemoteTarget && (
                          <button
                            onClick={() => onPromoteDemoteMember(member.id, 'DOWN')}
                            className="px-2 py-1 rounded-lg border text-[9.5px] font-black flex items-center gap-0.5 bg-amber-500/15 border-amber-400/50 text-amber-200 hover:bg-amber-500/25 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                            <span>خفض</span>
                          </button>
                        )}
                        {canTransferToTarget && (
                          isConfirmingTransfer ? (
                            <>
                              <button
                                onClick={() => {
                                  onTransferLeadership?.(member.id);
                                  setConfirmTransferMemberId(null);
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 text-[9.5px] font-black cursor-pointer"
                              >
                                تأكيد نقل القيادة
                              </button>
                              <button
                                onClick={() => setConfirmTransferMemberId(null)}
                                className="px-1.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[9.5px] font-black cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setConfirmKickMemberId(null);
                                setConfirmTransferMemberId(member.id);
                              }}
                              className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-400/50 text-amber-200 hover:bg-amber-500/25 text-[9.5px] font-black flex items-center gap-0.5 cursor-pointer"
                            >
                              <Crown className="w-3 h-3" />
                              <span>نقل القيادة</span>
                            </button>
                          )
                        )}
                        {isConfirmingKick ? (
                          <>
                            <button
                              onClick={() => {
                                onKickMember(member.id);
                                setConfirmKickMemberId(null);
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-500 text-white text-[9.5px] font-black cursor-pointer"
                            >
                              تأكيد الطرد
                            </button>
                            <button
                              onClick={() => setConfirmKickMemberId(null)}
                              className="px-1.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[9.5px] font-black cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setConfirmTransferMemberId(null);
                              setConfirmKickMemberId(member.id);
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-400/50 text-rose-200 hover:bg-rose-500/25 text-[9.5px] font-black flex items-center gap-0.5 cursor-pointer"
                          >
                            <UserMinus className="w-3 h-3" />
                            <span>طرد</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rosterSection === 'DIVIDENDS' && (
        <div className="space-y-3">
          {/* Merit-Based Reward Pool */}
          <div className="rounded-2xl bg-gradient-to-b from-[#132620] via-[#161e26] to-[#161923] border border-emerald-500/45 p-3 space-y-2.5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
                  <PieChart className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white">
                    صندوق توزيع الأرباح · الدورة #{dividendBreakdown.pool.cycleNumber}
                  </h3>
                </div>
              </div>

              <button
                onClick={() =>
                  onSendQuickAllianceInvite(
                    `💰 صندوق توزيع مكافآت الدورة #${dividendBreakdown.pool.cycleNumber} متاح (${dividendBreakdown.pool.corn.toLocaleString()}🍖 · ${dividendBreakdown.pool.allianceCoins.toLocaleString()}🪙)!`,
                    'ROSTER',
                    'عرض الحصص'
                  )
                }
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-[10px] font-black text-amber-300 cursor-pointer flex items-center gap-1"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>إعلان بالشات</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center font-mono-num">
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5">
                <div className="text-[9.5px] text-slate-400">طعام تنين</div>
                <div className="text-xs font-black text-emerald-300">
                  {dividendBreakdown.pool.corn.toLocaleString()}🍖
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5">
                <div className="text-[9.5px] text-slate-400">عملة السرب</div>
                <div className="text-xs font-black text-amber-300">
                  {dividendBreakdown.pool.allianceCoins.toLocaleString()}🪙
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5">
                <div className="text-[9.5px] text-slate-400">ذهب</div>
                <div className="text-xs font-black text-sky-300">
                  {dividendBreakdown.pool.duckGold}💎
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/85 border border-emerald-400/40 p-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5 font-mono-num">
                <div className="text-[11px] font-black text-white">
                  جدارتك:{' '}
                  <span className="text-amber-300">
                    {dividendBreakdown.playerShare.meritScore.toLocaleString()}
                  </span>{' '}
                  · نسبتك:{' '}
                  <span className="text-emerald-300">{dividendBreakdown.playerShare.sharePct}%</span>
                </div>
                <div className="text-[10px] text-emerald-300 font-bold">
                  حصتك: +{dividendBreakdown.playerShare.cornShare.toLocaleString()}🍖 · +
                  {dividendBreakdown.playerShare.coinsShare}🪙 · +
                  {dividendBreakdown.playerShare.goldShare}💎
                </div>
              </div>

              <button
                disabled={!dividendReady}
                onClick={() => onDistributeAllianceDividends()}
                className={`px-3.5 py-2 rounded-xl text-xs font-black shrink-0 ${
                  dividendReady
                    ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 hover:brightness-105 cursor-pointer shadow'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {dividendReady
                  ? '💰 صرف الأرباح الآن'
                  : `الدورة القادمة: ${formatDurationAr(dividendCdLeftMs)}`}
              </button>
            </div>
          </div>

          {/* Member Merit Leaderboard */}
          <SectionCard compact className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-white flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-400" />
                حصص الأعضاء حسب الجدارة والرتبة
              </span>
              <span className="font-mono-num text-[10px] text-slate-400">
                الإجمالي: {dividendBreakdown.totalMerit.toLocaleString()}
              </span>
            </div>

            <div className="space-y-1.5">
              {dividendBreakdown.members.map((m, idx) => (
                <div
                  key={m.id}
                  className={`rounded-xl p-2 border space-y-1 ${
                    m.isSelf
                      ? 'bg-emerald-500/10 border-emerald-400/50'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono-num">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-amber-300 font-black">#{idx + 1}</span>
                      <span className="font-black text-white truncate">{m.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-black text-amber-200">
                        {m.rank}
                      </span>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="text-amber-300 font-black">
                        {m.meritScore.toLocaleString()}
                      </span>
                      <span className="text-emerald-300 font-black mr-1.5">({m.sharePct}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400"
                      style={{ width: `${Math.min(100, Math.round(m.sharePct * 2.5))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

        </div>
      )}

      {rosterSection === 'BLESSINGS' && (
        <div className="space-y-4">
          {/* Treasure Race */}
          <SectionCard compact className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-white">
                {ACTIVE_SEASON.nameAr} · سباق صائدي الكنوز
              </span>
              <span className="font-mono-num font-bold text-amber-300">
                {treasurePoints} نقطة
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TREASURE_RACE_STEPS.map((step, i) => {
                const threshold = TREASURE_THRESHOLDS[i] ?? step.step * 100;
                const reached = treasurePoints >= threshold;
                const claimed = state.claimedTreasureSteps.includes(threshold);
                return (
                  <div
                    key={step.step}
                    className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 ${
                      claimed
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : reached
                          ? 'bg-amber-500/15 border-amber-400/70'
                          : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 font-mono-num">
                        المرحلة {step.step} · {threshold}+ نقطة
                      </div>
                      <div className="text-xs font-black text-white truncate">{step.titleAr}</div>
                      <div className="text-[10px] text-emerald-300 font-mono-num font-bold">
                        {step.rewardLabelAr}
                      </div>
                    </div>
                    {claimed ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" />
                        تم
                      </span>
                    ) : (
                      <button
                        disabled={!reached}
                        onClick={() => {
                          soundFX.playClaim();
                          onClaimTreasureStep(threshold, step.step);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 ${
                          reached
                            ? 'bg-amber-400 text-slate-950 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {reached ? 'استلام' : `${threshold}+`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Blessings Carousel */}
          {currentGod && (
            <SectionCard accent="amber" compact className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">{currentGod.name}</h3>
                  <p className="text-[10.5px] text-slate-400">{currentGod.subtitle}</p>
                </div>
                <div className="flex items-center gap-1.5 font-mono-num text-xs font-bold text-amber-300">
                  <GoldIcon className="w-4 h-4" />
                  <span>{state.duckGold} ذهب</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    soundFX.playTabSwitch();
                    setCarouselIdx(
                      (i) => (i - 1 + state.godCards.length) % state.godCards.length
                    );
                  }}
                  aria-label="السابق"
                  className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 hover:border-amber-400 cursor-pointer shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="flex-1 rounded-2xl bg-slate-900/90 border border-slate-800 p-3 text-center space-y-2">
                  <GodIllustration godId={currentGod.godKey} className="w-20 h-20 mx-auto" />
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {currentGod.bonusDesc}
                  </p>
                  {currentGod.owned ? (
                    <div className="space-y-1.5">
                      <div className="py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                        مفعّل الآن في حسابك ✓
                      </div>
                      {convertedBlessingIds.has(currentGod.id) ? (
                        <div className="py-1.5 rounded-xl bg-purple-500/15 border border-purple-400/40 text-purple-200 text-[10.5px] font-black">
                          محوّلة إلى مهمة في أبحاث السرب ✓
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            soundFX.playGodConfirm();
                            onConvertBlessingToResearch(currentGod.id, blessingTargetTech);
                          }}
                          className="w-full py-2 rounded-xl bg-gradient-to-b from-cyan-400 to-cyan-500 text-slate-950 font-black text-xs cursor-pointer hover:brightness-105"
                        >
                          تحويل لمهمة في أبحاث السرب (+
                          {(
                            ALLIANCE_BLESSING_RESEARCH_MISSIONS[currentGod.id]?.techPointsGain ??
                            45000
                          ).toLocaleString()}
                          )
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={state.duckGold < currentGod.goldCost}
                        onClick={() => {
                          soundFX.playGodConfirm();
                          onActivateGod(currentGod.id, 'gold');
                        }}
                        className={`py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 ${
                          state.duckGold >= currentGod.goldCost
                            ? 'bg-amber-400 text-slate-950 cursor-pointer'
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
                        className={`py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 ${
                          state.stars >= currentGod.starCost
                            ? 'bg-indigo-500 text-white cursor-pointer'
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
                  aria-label="التالي"
                  className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 hover:border-amber-400 cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => onOpenExchangeGold()}
                className="w-full py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-amber-300 hover:border-amber-400 cursor-pointer flex items-center justify-center gap-1"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>مقايضة ذهب التنانين</span>
              </button>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
};
