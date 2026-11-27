import React, { useMemo, useState } from 'react';
import { Crown, Flame, RefreshCw, Shield, Trophy, Users, X } from 'lucide-react';
import {
  CompetitionParticipantEntry,
  GameState,
  PlayerLeaderboardEntry,
  RealAllianceDirectoryItem,
} from '../../types/game';
import {
  LIVE_EVENTS_REGISTRY,
  formatCompactNumber,
  formatTimer,
  getDuckCombatStats,
  getLeagueMeta,
} from '../../data/gameData';
import { soundFX } from '../../utils/sound';
import { renderEmblemGlyph } from '../tabs/alliance/AllianceHelpers';

interface RankingsModalProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
  leaderboardPlayers: PlayerLeaderboardEntry[];
  allianceDirectory: RealAllianceDirectoryItem[];
  competitionParticipants: CompetitionParticipantEntry[];
  feedChallenges: PlayerLeaderboardEntry[];
  competitionMeta: {
    cycleNumber: number;
    endsAt: number;
    activeEventIndex: number;
    eventEndsAt: number;
  };
  currentUid: string | null;
  onRefreshAlliances?: () => void;
  onOpenTournament: () => void;
  onOpenAlliancesTab: () => void;
}

export const RankingsModal: React.FC<RankingsModalProps> = ({
  open,
  onClose,
  state,
  leaderboardPlayers,
  allianceDirectory,
  competitionParticipants,
  feedChallenges,
  competitionMeta,
  currentUid,
  onRefreshAlliances,
  onOpenTournament,
  onOpenAlliancesTab,
}) => {
  const [tab, setTab] = useState<'PLAYERS' | 'SWARMS' | 'COMPETITIONS'>('PLAYERS');
  const [playerSort, setPlayerSort] = useState<'POWER' | 'LEAGUE' | 'AMF'>('POWER');
  const [swarmSort, setSwarmSort] = useState<'POWER' | 'TREASURY' | 'MEMBERS'>('POWER');
  const [compFilter, setCompFilter] = useState<'TOURNAMENT' | 'FEEDS'>('TOURNAMENT');

  const nowTs = Date.now();
  const compSecLeft = Math.max(0, Math.floor((competitionMeta.endsAt - nowTs) / 1000));
  const eventSecLeft = Math.max(0, Math.floor((competitionMeta.eventEndsAt - nowTs) / 1000));
  const activeEvent =
    LIVE_EVENTS_REGISTRY[competitionMeta.activeEventIndex % LIVE_EVENTS_REGISTRY.length] ??
    LIVE_EVENTS_REGISTRY[0];

  const selfPowerRating = useMemo(() => {
    const lead = state.ducks[state.activeDuckIndex] ?? state.ducks[0];
    if (!lead) return 0;
    return getDuckCombatStats(
      lead,
      state.dmdTotal,
      state.pack.joined,
      state.pack.power,
      state.pack.talents,
      state.activeBuffs
    ).totalPowerScore;
  }, [state]);

  const realPlayers = useMemo(() => {
    const list: Array<PlayerLeaderboardEntry & { isYou: boolean }> = leaderboardPlayers.map((p) => ({
      ...p,
      isYou: Boolean(currentUid && p.uid === currentUid),
    }));
    const hasSelf = list.some((p) => p.isYou);
    if (!hasSelf) {
      const lead = state.ducks[state.activeDuckIndex] ?? state.ducks[0];
      list.push({
        uid: currentUid || 'self_local',
        username: state.username,
        avatarUrl: lead?.skin ?? 'aqua',
        powerRating: selfPowerRating,
        leaguePoints: state.league.points,
        dmdTotal: state.dmdTotal,
        tournamentScore: state.tournament.score,
        totalFeeds: state.stats.totalFeeds,
        allianceName: state.pack.joined ? state.pack.packName : '',
        dragonCount: state.ducks.length,
        activeDragonName: lead?.name ?? 'تنين البداية',
        activeDragonSkin: lead?.skin ?? 'aqua',
        activeDragonRarity: lead?.rarity ?? 'COMMON',
        activeDragonLevel: lead?.level ?? 1,
        isYou: true,
      });
    }
    return list.sort((a, b) => {
      if (playerSort === 'LEAGUE') return b.leaguePoints - a.leaguePoints || b.powerRating - a.powerRating;
      if (playerSort === 'AMF') return b.dmdTotal - a.dmdTotal || b.powerRating - a.powerRating;
      return b.powerRating - a.powerRating || b.leaguePoints - a.leaguePoints;
    });
  }, [leaderboardPlayers, currentUid, state, playerSort]);

  const realSwarms = useMemo(() => {
    const rows = [...allianceDirectory];
    return rows.sort((a, b) => {
      if (swarmSort === 'TREASURY') return (b.treasuryCorn ?? 0) - (a.treasuryCorn ?? 0) || b.power - a.power;
      if (swarmSort === 'MEMBERS') return b.memberCount - a.memberCount || b.power - a.power;
      return b.power - a.power || b.memberCount - a.memberCount;
    });
  }, [allianceDirectory, swarmSort]);

  const realCompRows = useMemo(() => {
    if (compFilter === 'FEEDS') {
      const src = feedChallenges.length > 0 ? feedChallenges : leaderboardPlayers;
      const rows = src.map((p) => ({
        id: p.uid,
        name: p.username,
        allianceName: p.allianceName ?? '',
        primary: p.totalFeeds ?? 0,
        secondary: p.powerRating,
        isYou: Boolean(currentUid && p.uid === currentUid),
      }));
      if (!rows.some((r) => r.isYou)) {
        rows.push({
          id: currentUid || 'self_local',
          name: state.username,
          allianceName: state.pack.joined ? state.pack.packName : '',
          primary: state.stats.totalFeeds,
          secondary: selfPowerRating,
          isYou: true,
        });
      }
      return rows.sort((a, b) => b.primary - a.primary || b.secondary - a.secondary);
    }

    const rows = competitionParticipants.map((p) => ({
      id: p.publicId,
      name: p.name,
      allianceName: leaderboardPlayers.find((lp) => lp.uid === p.publicId)?.allianceName ?? '',
      primary: p.score,
      secondary: p.powerRating,
      isYou: Boolean(currentUid && p.publicId === currentUid),
    }));
    if (!rows.some((r) => r.isYou)) {
      rows.push({
        id: currentUid || 'self_local',
        name: state.username,
        allianceName: state.pack.joined ? state.pack.packName : '',
        primary: state.tournament.score,
        secondary: selfPowerRating,
        isYou: true,
      });
    }
    return rows.sort((a, b) => b.primary - a.primary || b.secondary - a.secondary);
  }, [compFilter, feedChallenges, leaderboardPlayers, competitionParticipants, currentUid, state, selfPowerRating]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-[#161923] border border-amber-400/40 rounded-3xl overflow-hidden shadow-2xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-b from-amber-500/15 to-[#161923] border-b border-slate-800 relative space-y-3">
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute top-3 left-3 w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/70 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-display text-lg font-black text-white">التصنيفات والمسابقات</h3>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
            {[
              { id: 'PLAYERS' as const, label: 'اللاعبون', icon: Crown },
              { id: 'SWARMS' as const, label: 'الأسراب', icon: Shield },
              { id: 'COMPETITIONS' as const, label: 'المسابقات', icon: Flame },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundFX.playTabSwitch();
                    setTab(item.id);
                  }}
                  className={`py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    active
                      ? 'bg-slate-800 text-amber-300 border border-amber-400/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {tab === 'PLAYERS' && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      { id: 'POWER', label: 'القوة' },
                      { id: 'LEAGUE', label: 'الدوري' },
                      { id: 'AMF', label: 'AMF' },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        soundFX.playTabSwitch();
                        setPlayerSort(s.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                        playerSort === s.id
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <span className="font-mono-num text-[11px] font-bold text-slate-400">
                  {realPlayers.length} لاعب مسجل
                </span>
              </div>

              <div className="space-y-2">
                {realPlayers.map((p, idx) => {
                  const league = getLeagueMeta(p.leaguePoints);
                  return (
                    <div
                      key={p.uid}
                      className={`rounded-2xl px-3 py-2.5 border flex items-center justify-between gap-2 ${
                        p.isYou
                          ? 'bg-amber-400/15 border-amber-400/70 text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`font-mono-num font-black w-7 text-center shrink-0 ${
                            idx === 0
                              ? 'text-amber-300 text-sm'
                              : idx === 1
                                ? 'text-slate-200 text-xs'
                                : idx === 2
                                  ? 'text-orange-300 text-xs'
                                  : 'text-slate-400 text-xs'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black truncate">{p.username}</span>
                            {p.isYou && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                                أنت
                              </span>
                            )}
                            {p.allianceName && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[9px] font-bold truncate max-w-[110px]">
                                {p.allianceName}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono-num mt-0.5">
                            {league.nameAr} · {p.dragonCount} تنانين · {p.activeDragonName}
                          </div>
                        </div>
                      </div>

                      <div className="text-left font-mono-num shrink-0 space-y-0.5">
                        <div className="text-xs font-black text-amber-300">
                          {playerSort === 'LEAGUE'
                            ? `${p.leaguePoints.toLocaleString()} 🏆`
                            : playerSort === 'AMF'
                              ? `${p.dmdTotal.toFixed(2)} AMF`
                              : `${p.powerRating.toLocaleString()} ⚡`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {playerSort === 'LEAGUE'
                            ? `${p.powerRating.toLocaleString()} قوة`
                            : `${p.leaguePoints.toLocaleString()} 🏆`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'SWARMS' && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      { id: 'POWER', label: 'القوة' },
                      { id: 'TREASURY', label: 'الخزينة' },
                      { id: 'MEMBERS', label: 'الأعضاء' },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        soundFX.playTabSwitch();
                        setSwarmSort(s.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                        swarmSort === s.id
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {onRefreshAlliances && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playTabSwitch();
                      onRefreshAlliances();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-[11px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>تحديث</span>
                  </button>
                )}
              </div>

              {realSwarms.length === 0 ? (
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 text-center space-y-3">
                  <Shield className="w-9 h-9 text-slate-500 mx-auto" />
                  <div className="text-xs font-black text-slate-300">لا توجد أسراب عامة مسجلة حالياً</div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAlliancesTab();
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black cursor-pointer"
                  >
                    إنشاء أو انضمام لسرب
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {realSwarms.map((a, idx) => {
                    const isMine = state.pack.joined && state.pack.allianceId === a.id;
                    return (
                      <div
                        key={a.id}
                        className={`rounded-2xl px-3 py-2.5 border flex items-center justify-between gap-2 ${
                          isMine
                            ? 'bg-emerald-500/15 border-emerald-400/60 text-white'
                            : 'bg-slate-900/80 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono-num text-xs font-black text-amber-400 w-6 text-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0">
                            {renderEmblemGlyph(a.emblemId, 'w-5 h-5')}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black truncate">{a.packName}</span>
                              {isMine && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 text-[9px] font-black">
                                  سربك
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono-num flex items-center gap-2 mt-0.5">
                              <span>👑 {a.leaderName}</span>
                              <span className="flex items-center gap-0.5">
                                <Users className="w-3 h-3" /> {a.memberCount}/{a.maxMembers}
                              </span>
                              {a.bossLevel ? <span>زعيم Lv.{a.bossLevel}</span> : null}
                            </div>
                          </div>
                        </div>

                        <div className="text-left font-mono-num shrink-0 space-y-0.5">
                          <div className="text-xs font-black text-rose-300">
                            {formatCompactNumber(a.power)} قوة
                          </div>
                          <div className="text-[10px] text-emerald-400">
                            {formatCompactNumber(a.treasuryCorn ?? 0)} خزينة
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'COMPETITIONS' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-900/90 border border-amber-400/35 p-2.5">
                  <div className="text-[10px] text-slate-400 font-bold">
                    البطولة · الدورة #{competitionMeta.cycleNumber}
                  </div>
                  <div className="font-mono-num text-xs font-black text-amber-300 mt-0.5">
                    تنتهي خلال {formatTimer(compSecLeft)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-900/90 border border-sky-400/35 p-2.5">
                  <div className="text-[10px] text-sky-300 font-black truncate">{activeEvent.title}</div>
                  <div className="font-mono-num text-xs font-black text-emerald-300 mt-0.5">
                    {formatTimer(eventSecLeft)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playTabSwitch();
                      setCompFilter('TOURNAMENT');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                      compFilter === 'TOURNAMENT'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    نقاط البطولة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playTabSwitch();
                      setCompFilter('FEEDS');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                      compFilter === 'FEEDS'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    تحدي الإطعام
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTournament();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-400/15 border border-amber-400/50 text-amber-300 text-[11px] font-black cursor-pointer"
                >
                  جوائز البطولة
                </button>
              </div>

              <div className="space-y-1.5">
                {realCompRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
                      row.isYou
                        ? 'bg-amber-400/15 border-amber-400 text-white font-black'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono-num text-amber-400 font-black w-6 shrink-0">#{idx + 1}</span>
                      <span className="truncate">{row.name}</span>
                      {row.allianceName && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[9px] font-bold truncate max-w-[90px]">
                          {row.allianceName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 font-mono-num shrink-0">
                      <span className="text-[10px] text-slate-400">{row.secondary.toLocaleString()} قوة</span>
                      <span className="text-emerald-400 font-black">
                        {row.primary.toLocaleString()} {compFilter === 'FEEDS' ? 'إطعام' : '🏆'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
