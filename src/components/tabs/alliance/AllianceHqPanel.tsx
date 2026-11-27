import React, { useMemo, useState } from 'react';
import {
  Award,
  Coins,
  Compass,
  Flag,
  Flame,
  FlaskConical,
  HeartHandshake,
  Landmark,
  Megaphone,
  PieChart,
  ScrollText,
  Send,
  Swords,
  UserPlus,
} from 'lucide-react';
import {
  AllianceActiveRally,
  AllianceLedger,
  AllianceLogEntry,
  AllianceLogType,
  AllianceRewardPool,
  GameState,
} from '../../../types/game';
import {
  ALLIANCE_DAILY_LIMITS,
  ALLIANCE_DONATION_TIERS,
  AllianceDonationKind,
} from '../../../utils/economyEngine';
import { soundFX } from '../../../utils/sound';
import { SectionCard, SectionHeader } from '../../ui/SectionCard';

interface AllianceHqPanelProps {
  state: GameState;
  ledger: AllianceLedger;
  allianceLogs: AllianceLogEntry[];
  rewardPool: AllianceRewardPool;
  activeRally: AllianceActiveRally | null;
  donationsToday: number;
  helpsToday: number;
  bossLevel: number;
  bossHp: number;
  bossMaxHp: number;
  bossAttacksToday: number;
  estimatedBossDmg: number;
  activeBreedingCount: number;
  breedHelpCooldownLeftMs: number;
  canUseBreedHelp: boolean;
  onlineMembersCount: number;
  onDonatePack: (kind: AllianceDonationKind) => void;
  onHelpAllies: () => void;
  onAllianceBreedSpeedup: () => void;
  onAttackAllianceBoss: () => void;
  onSendPackMessage: (text: string) => void;
  onSendQuickAllianceInvite: (
    text: string,
    actionSubTab?: 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'ROSTER',
    actionLabel?: string
  ) => void;
  onNavigateSubTab: (
    subTab: 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'ROSTER',
    rosterSection?: 'MEMBERS' | 'DIVIDENDS' | 'BLESSINGS'
  ) => void;
}

export const AllianceHqPanel: React.FC<AllianceHqPanelProps> = ({
  state,
  ledger,
  allianceLogs,
  rewardPool,
  activeRally,
  donationsToday,
  helpsToday,
  bossLevel,
  bossHp,
  bossMaxHp,
  bossAttacksToday,
  estimatedBossDmg,
  activeBreedingCount,
  breedHelpCooldownLeftMs,
  canUseBreedHelp,
  onlineMembersCount,
  onDonatePack,
  onHelpAllies,
  onAllianceBreedSpeedup,
  onAttackAllianceBoss,
  onSendPackMessage,
  onSendQuickAllianceInvite,
  onNavigateSubTab,
}) => {
  const [ledgerViewMode, setLedgerViewMode] = useState<'DONATE' | 'LOG'>('DONATE');
  const [logFilter, setLogFilter] = useState<
    'ALL' | 'DONATE' | 'RESEARCH' | 'DRAGON' | 'RALLY' | 'BOSS' | 'DIVIDEND' | 'MEMBERS'
  >('ALL');
  const [chatInput, setChatInput] = useState('');

  const pack = state.pack;

  const filteredLogs = useMemo(() => {
    if (logFilter === 'ALL') return allianceLogs;
    if (logFilter === 'MEMBERS') {
      return allianceLogs.filter((l) => l.type === 'JOIN' || l.type === 'ROLE' || l.type === 'HELP');
    }
    return allianceLogs.filter((l) => l.type === logFilter);
  }, [allianceLogs, logFilter]);

  return (
    <div className="space-y-3">
      {/* Unified Donation Ledger & Alliance Event Log */}
      <SectionCard accent="amber" compact className="space-y-2.5">
        <SectionHeader
          title="دفتر التبرعات وموارد الأبحاث · سجل أحداث السرب"
          icon={<Landmark className="w-4 h-4 text-amber-400" />}
          meta={`تبرعات اليوم: ${donationsToday}/${ALLIANCE_DAILY_LIMITS.MAX_DONATIONS_PER_DAY}`}
        />

        {/* Unique Vault & Personal Stats */}
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono-num">
          <div className="rounded-xl bg-slate-950/75 border border-slate-800 py-1.5 px-2">
            <div className="text-[9.5px] text-slate-400">مخزون البحث</div>
            <div className="text-xs font-black text-sky-300">
              {ledger.techPointsPool.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/75 border border-slate-800 py-1.5 px-2">
            <div className="text-[9.5px] text-slate-400">ذهب الخزينة</div>
            <div className="text-xs font-black text-amber-300">
              {ledger.vaultGold} 💎
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/75 border border-slate-800 py-1.5 px-2">
            <div className="text-[9.5px] text-slate-400">تبرعاتك</div>
            <div className="text-xs font-black text-emerald-300">
              {ledger.playerEnergyDonated.toLocaleString()}⚡
            </div>
          </div>
        </div>

        {/* Ledger Mode Switch: Donations OR Unified Event Log */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setLedgerViewMode('DONATE');
            }}
            className={`py-1.5 rounded-lg text-[11px] font-black cursor-pointer flex items-center justify-center gap-1.5 ${
              ledgerViewMode === 'DONATE'
                ? 'bg-slate-800 text-amber-300 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>بوابة التبرعات والموارد</span>
          </button>
          <button
            onClick={() => {
              soundFX.playTabSwitch();
              setLedgerViewMode('LOG');
            }}
            className={`py-1.5 rounded-lg text-[11px] font-black cursor-pointer flex items-center justify-center gap-1.5 ${
              ledgerViewMode === 'LOG'
                ? 'bg-slate-800 text-sky-300 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>سجل أحداث السرب ({allianceLogs.length})</span>
          </button>
        </div>

        {ledgerViewMode === 'DONATE' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALLIANCE_DONATION_TIERS.map((tier) => {
              const canAfford =
                donationsToday < ALLIANCE_DAILY_LIMITS.MAX_DONATIONS_PER_DAY &&
                state.corn >= tier.energyCost &&
                state.duckGold >= tier.goldCost;
              const isGold = tier.goldCost > 0;
              const isTitan = tier.id === 'CORN_TITAN';
              return (
                <button
                  key={tier.id}
                  disabled={!canAfford}
                  onClick={() => onDonatePack(tier.id)}
                  className={`p-2.5 rounded-xl border text-right space-y-1 transition-all ${
                    canAfford
                      ? isGold
                        ? 'bg-purple-500/15 border-purple-400/55 hover:bg-purple-500/25 cursor-pointer'
                        : isTitan
                          ? 'bg-rose-500/15 border-rose-400/55 hover:bg-rose-500/25 cursor-pointer'
                          : tier.id === 'CORN_CONVOY'
                            ? 'bg-emerald-500/15 border-emerald-400/55 hover:bg-emerald-500/25 cursor-pointer'
                            : 'bg-amber-500/15 border-amber-400/55 hover:bg-amber-500/25 cursor-pointer'
                      : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="text-xs font-black text-white flex items-center justify-between gap-2">
                    <span>{tier.titleAr}</span>
                    <span
                      className={`font-mono-num ${
                        isGold ? 'text-sky-300' : 'text-amber-300'
                      }`}
                    >
                      {isGold ? `${tier.goldCost} 💎` : `${tier.energyCost.toLocaleString()}⚡`}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono-num text-emerald-300 font-bold">
                    +{tier.vaultCornGain.toLocaleString()}⚡ خزينة · +{tier.techPointsGain.toLocaleString()} بحث · +{tier.coinsGain}🪙
                    {tier.starsReward > 0 ? ` · +${tier.starsReward}★` : ''}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1">
              {([
                { id: 'ALL', label: 'الكل' },
                { id: 'DONATE', label: 'تبرعات' },
                { id: 'RESEARCH', label: 'الأبحاث' },
                { id: 'DRAGON', label: 'تنين السرب' },
                { id: 'RALLY', label: 'الحشود' },
                { id: 'BOSS', label: 'الزعيم' },
                { id: 'DIVIDEND', label: 'الأرباح' },
                { id: 'MEMBERS', label: 'الأعضاء' },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setLogFilter(f.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    logFilter === f.id
                      ? 'bg-sky-500/25 border border-sky-400/60 text-sky-200'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="bg-slate-950/75 border border-slate-800/80 rounded-xl p-2 space-y-1.5 max-h-64 overflow-y-auto">
              {filteredLogs.slice(0, 25).map((log) => {
                const iconByType: Record<AllianceLogType, React.ReactNode> = {
                  JOIN: <UserPlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
                  DONATE: <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
                  BOSS: <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
                  COOP: <Flag className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
                  HELP: <HeartHandshake className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
                  ROLE: <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />,
                  RESEARCH: <FlaskConical className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
                  RALLY: <Compass className="w-3.5 h-3.5 text-rose-300 shrink-0" />,
                  DIVIDEND: <PieChart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
                  DRAGON: <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
                };
                return (
                  <div
                    key={log.id}
                    className="rounded-lg bg-slate-900/80 border border-slate-800/70 px-2.5 py-1.5 flex items-start justify-between gap-2 text-[11px]"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="mt-0.5">{iconByType[log.type]}</span>
                      <div className="min-w-0 leading-snug">
                        <span className="font-black text-amber-300">{log.actor} </span>
                        <span className="text-slate-200">{log.message}</span>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-mono-num text-slate-500 shrink-0 mt-0.5">
                      {log.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Help + Breeding Speedup (Compact) */}
      <SectionCard accent="emerald" compact className="space-y-2">
        <SectionHeader
          title="مساعدة الإخوة وتسريع التزاوج"
          icon={<HeartHandshake className="w-4 h-4 text-emerald-400" />}
          meta={`${helpsToday}/${ALLIANCE_DAILY_LIMITS.MAX_HELPS_PER_DAY} اليوم`}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            disabled={helpsToday >= ALLIANCE_DAILY_LIMITS.MAX_HELPS_PER_DAY}
            onClick={() => onHelpAllies()}
            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-between gap-2 ${
              helpsToday < ALLIANCE_DAILY_LIMITS.MAX_HELPS_PER_DAY
                ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer'
                : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>مساعدة الأعضاء</span>
            <span className="font-mono-num text-[10px] text-amber-300">+60🪙 +80⚡</span>
          </button>

          <button
            disabled={!canUseBreedHelp}
            onClick={() => onAllianceBreedSpeedup()}
            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-between gap-2 ${
              canUseBreedHelp
                ? 'bg-sky-500/20 border border-sky-400/50 text-sky-200 hover:bg-sky-500/30 cursor-pointer'
                : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>
              {activeBreedingCount === 0
                ? 'لا يوجد تزاوج نشط'
                : breedHelpCooldownLeftMs > 0
                  ? `تسريع التزاوج (${Math.ceil(breedHelpCooldownLeftMs / 60000)}د)`
                  : `تسريع التزاوج (${activeBreedingCount})`}
            </span>
            <span className="font-mono-num text-[10px] text-sky-300">-2 ساعة</span>
          </button>
        </div>
      </SectionCard>

      {/* Alliance Boss Raid */}
      <div className="rounded-2xl bg-gradient-to-r from-[#241322] to-[#161923] border border-rose-500/40 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white">
                زعيم السرب: تنين العاصفة [Lv.{bossLevel}]
              </div>
              <div className="text-[10px] text-slate-300 font-mono-num">
                ضررك: ~{estimatedBossDmg.toLocaleString()} · المتبقي:{' '}
                {ALLIANCE_DAILY_LIMITS.MAX_BOSS_ATTACKS_PER_DAY - bossAttacksToday}/
                {ALLIANCE_DAILY_LIMITS.MAX_BOSS_ATTACKS_PER_DAY}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() =>
                onSendQuickAllianceInvite(
                  `🔥 نداء غارة الزعيم! تنين العاصفة [Lv.${bossLevel}] عند (${bossHp.toLocaleString()}/${bossMaxHp.toLocaleString()} HP). هاجموه الآن!`,
                  'HQ',
                  'ضرب الزعيم'
                )
              }
              title="نداء الزعيم بالشات"
              className="px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-400 text-[10px] font-black text-amber-300 cursor-pointer flex items-center gap-1"
            >
              <Megaphone className="w-3.5 h-3.5" />
            </button>

            <button
              disabled={bossAttacksToday >= ALLIANCE_DAILY_LIMITS.MAX_BOSS_ATTACKS_PER_DAY}
              onClick={() => onAttackAllianceBoss()}
              className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1 ${
                bossAttacksToday < ALLIANCE_DAILY_LIMITS.MAX_BOSS_ATTACKS_PER_DAY
                  ? 'bg-gradient-to-b from-rose-500 to-rose-700 text-white hover:brightness-110 active:scale-95 cursor-pointer shadow'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>هجوم</span>
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono-num">
            <span className="text-rose-300 font-bold">صحة الزعيم</span>
            <span className="text-white font-black">
              {bossHp.toLocaleString()} / {bossMaxHp.toLocaleString()}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-950 border border-rose-500/30 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all"
              style={{
                width: `${Math.max(4, Math.min(100, Math.round((bossHp / Math.max(1, bossMaxHp)) * 100)))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Live Alliance Chat */}
      <SectionCard compact className="space-y-2.5">
        <SectionHeader
          title="مجلس ودردشة السرب"
          icon={<Megaphone className="w-4 h-4 text-amber-300" />}
          meta={`متصلون: ${onlineMembersCount}/${pack.members}`}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() =>
              onSendQuickAllianceInvite(
                activeRally
                  ? `⚔️ انضموا لحشد "${activeRally.targetNameAr}" بتنانينكم (${activeRally.participants.length}/${activeRally.maxSlots})!`
                  : '🧭 حشد جديد سيُطلق على خريطة السرب! جهّزوا تنانينكم للمشاركة.',
                'MAP',
                'فتح الخريطة'
              )
            }
            className="px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-400/45 text-[10px] font-black text-rose-200 hover:bg-rose-500/25 cursor-pointer flex items-center gap-1"
          >
            <Megaphone className="w-3 h-3" />
            <span>دعوة للحشد</span>
          </button>
          <button
            onClick={() =>
              onSendQuickAllianceInvite(
                '🔬 نداء تمويل أبحاث السرب! ساهموا لفتح المستوى التالي.',
                'RESEARCH',
                'تمويل البحث'
              )
            }
            className="px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/45 text-[10px] font-black text-cyan-200 hover:bg-cyan-500/25 cursor-pointer flex items-center gap-1"
          >
            <FlaskConical className="w-3 h-3" />
            <span>تمويل بحث</span>
          </button>
          <button
            onClick={() =>
              onSendQuickAllianceInvite(
                `💰 صندوق توزيع الأرباح #${rewardPool.cycleNumber} يحتوي ${rewardPool.corn.toLocaleString()}⚡ و ${rewardPool.allianceCoins.toLocaleString()}🪙!`,
                'ROSTER',
                'عرض الأرباح'
              )
            }
            className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/45 text-[10px] font-black text-emerald-200 hover:bg-emerald-500/25 cursor-pointer flex items-center gap-1"
          >
            <PieChart className="w-3 h-3" />
            <span>صندوق الأرباح</span>
          </button>
        </div>

        <div className="bg-slate-950/75 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5 max-h-48 overflow-y-auto">
          {pack.messages.length === 0 ? (
            <div className="text-center text-[11px] text-slate-500 py-3">
              لا توجد رسائل بعد — ابدأ المحادثة مع أعضاء السرب الحقيقيين!
            </div>
          ) : (
            pack.messages.slice(-14).map((m) =>
              m.isSystemInvite && m.actionSubTab ? (
                <div
                  key={m.id}
                  className="rounded-xl bg-amber-500/10 border border-amber-400/45 p-2 flex items-center justify-between gap-2 text-[11px]"
                >
                  <div className="min-w-0 leading-snug">
                    <span className="font-black text-amber-300">{m.sender}: </span>
                    <span className="text-white font-bold">{m.text}</span>
                    <span className="text-[9px] text-slate-400 mr-1.5 font-mono-num">
                      {m.time}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      soundFX.playTabSwitch();
                      onNavigateSubTab(
                        m.actionSubTab!,
                        m.actionSubTab === 'ROSTER' ? 'DIVIDENDS' : undefined
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] shrink-0 cursor-pointer hover:brightness-105"
                  >
                    {m.actionLabel ?? 'مشاركة الآن'}
                  </button>
                </div>
              ) : (
                <div key={m.id} className="text-[11px] leading-snug">
                  <span className="font-black text-amber-300">{m.sender}: </span>
                  <span className="text-slate-200">{m.text}</span>
                  <span className="text-[9px] text-slate-500 mr-1.5 font-mono-num">
                    {m.time}
                  </span>
                </div>
              )
            )
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && chatInput.trim()) {
                soundFX.playTapFeed();
                onSendPackMessage(chatInput.trim());
                setChatInput('');
              }
            }}
            placeholder="اكتب رسالة لإخوة السرب..."
            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => {
              if (!chatInput.trim()) return;
              soundFX.playTapFeed();
              onSendPackMessage(chatInput.trim());
              setChatInput('');
            }}
            className="w-10 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center cursor-pointer hover:brightness-105"
            aria-label="إرسال"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </SectionCard>
    </div>
  );
};
