import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AllianceEmblemId,
  AllianceJoinConditions,
  AllianceMemberRole,
  AllianceTechId,
  AllianceVisibility,
  AppScreen,
  CompetitionParticipantEntry,
  DragonAuctionRecord,
  Duck,
  DuckAuraId,
  DuckGearId,
  DuckSkinId,
  GameState,
  MainTab,
  PlayerLeaderboardEntry,
  RealAllianceDirectoryItem,
  RealAllianceMemberSnapshot,
  RewardBundle,
  SquadTalentKey,
  SwarmDragonGearSlot,
  SwarmDragonUpgradeKey,
} from '../types/game';
import { RARITY_STYLE, WEEKEND_EVENTS, getFeedCost } from '../data/gameData';
import {
  ALLIANCE_DONATION_TIERS,
  AllianceCoopMissionMeta,
  AllianceDonationKind,
  AllianceQuestMeta,
  AllianceShopOffer,
  ECONOMY_LIMITS,
  RelicForgeOffer,
  calculateAuctionListingFee,
  calculateDragonUpgradeInvestmentAndPrice,
  getFirstUnlockedDragonIndex,
  getLevelRequiredFeeds,
  getPlayerTier,
  isDragonSlotLocked,
  normalizeDragonSlots,
  resolveDragonSize,
} from '../utils/economyEngine';
import {
  apiDispatchServerAction,
  apiFetchPublicSnapshot,
  getVerifiedPublicPlayerId,
  getVerifiedSessionToken,
} from '../utils/cryptoVault';
import {
  getTelegramUser,
  initTelegramWebApp,
  setTelegramHapticsEnabled,
  triggerTelegramHaptic,
  verifyTelegramSession,
} from '../utils/telegram';
import { soundFX } from '../utils/sound';
import {
  CentralActionReceipt,
  CentralGameAction,
  HapticKind,
  SoundEffectKind,
  evaluateCentralAction,
  evaluateDeadlineTick,
  fillGridFromQueue,
  loadSavedState,
  withBurnedEnergy,
  withBurnedStars,
  withEarnedEnergy,
  withEarnedStars,
  writeCompactedSave,
} from '../engine';

export type ActiveModal = null | 'TOURNAMENT' | 'PASS' | 'WALLET' | 'PAUSE' | 'RANKINGS';
export type GodsSubTab = 'TREASURES' | 'TASKS' | 'GODS' | 'SHOP';

function playReceiptSound(sound?: SoundEffectKind) {
  if (!sound) return;
  if (typeof sound === 'object' && 'mergeTier' in sound) {
    soundFX.playMerge(sound.mergeTier);
    return;
  }
  switch (sound) {
    case 'tapFeed':
      soundFX.playTapFeed();
      break;
    case 'levelUp':
      soundFX.playLevelUp();
      break;
    case 'godConfirm':
      soundFX.playGodConfirm();
      break;
    case 'chestOpen':
      soundFX.playChestOpen();
      break;
    case 'claim':
      soundFX.playClaim();
      break;
    case 'tabSwitch':
      soundFX.playTabSwitch();
      break;
    case 'victory':
      soundFX.playVictory();
      break;
    case 'critHit':
      soundFX.playCritHit();
      break;
    case 'error':
      soundFX.playError();
      break;
  }
}

function playReceiptHaptic(haptic?: HapticKind) {
  if (haptic) triggerTelegramHaptic(haptic);
}

export function useGameController() {
  const [initialLoaded] = useState(() => loadSavedState());
  const [screen, setScreen] = useState<AppScreen>('TITLE');
  const [activeTab, setActiveTab] = useState<MainTab>('DUCKS');
  const [godsInitialSubTab, setGodsInitialSubTab] = useState<GodsSubTab>('GODS');
  const [marketPreselect, setMarketPreselect] = useState<{
    section: 'STORE' | 'DUCKS' | 'GODS';
    dragonId?: string;
    nonce: number;
  } | null>(null);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [passInitialTab, setPassInitialTab] = useState<'SEASON' | 'DAILY'>('SEASON');
  const [state, setState] = useState<GameState>(initialLoaded.state);
  const [hasSave, setHasSave] = useState<boolean>(initialLoaded.hasSave);
  const [offlineNoticeShown, setOfflineNoticeShown] = useState(false);
  const [timedBonusReadyAt, setTimedBonusReadyAt] = useState<number>(0);
  const [extraChestReadyAt, setExtraChestReadyAt] = useState<number>(() => initialLoaded.state.stats.extraChestReadyAt ?? 0);
  const [blitzEndsAt, setBlitzEndsAt] = useState<number>(0);
  const [cooldownNowMs, setCooldownNowMs] = useState<number>(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);

  // Telegram + Central Server Snapshot State
  const [tgVerified, setTgVerified] = useState<boolean>(false);
  const [tgUserInfo] = useState<{ id?: number; username?: string } | null>(() => {
    const u = getTelegramUser();
    return u ? { id: u.id, username: u.username } : null;
  });
  const [verifiedPublicUid, setVerifiedPublicUid] = useState<string | null>(() =>
    getVerifiedPublicPlayerId()
  );
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<PlayerLeaderboardEntry[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<DragonAuctionRecord[]>([]);
  const [allianceDirectory, setAllianceDirectory] = useState<RealAllianceDirectoryItem[]>([]);
  const [competitionParticipants, setCompetitionParticipants] = useState<CompetitionParticipantEntry[]>([]);
  const [feedChallenges, setFeedChallenges] = useState<PlayerLeaderboardEntry[]>([]);
  const [competitionMeta, setCompetitionMeta] = useState<{
    cycleNumber: number;
    endsAt: number;
    activeEventIndex: number;
    eventEndsAt: number;
  }>(() => ({
    cycleNumber: initialLoaded.state.tournament.cycleNumber ?? 1,
    endsAt: initialLoaded.state.tournament.resetAt ?? Date.now() + 86400000,
    activeEventIndex: initialLoaded.state.weekendEventIndex ?? 0,
    eventEndsAt: initialLoaded.state.weekendEventEndsAt ?? Date.now() + 43200000,
  }));

  const effectiveCurrentUid = verifiedPublicUid;
  const isOnlineAuthed = tgVerified && Boolean(getVerifiedSessionToken());

  const latestStateRef = useRef<GameState>(state);
  latestStateRef.current = state;
  const blitzEndsAtRef = useRef<number>(blitzEndsAt);
  blitzEndsAtRef.current = blitzEndsAt;
  const effectiveUidRef = useRef<string | null>(effectiveCurrentUid);
  effectiveUidRef.current = effectiveCurrentUid;
  const dirtySaveRef = useRef<boolean>(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAllianceDonateAtRef = useRef<number>(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const commitState = useCallback((next: GameState) => {
    latestStateRef.current = next;
    setState(next);
  }, []);

  // Conditional 1s ticker ONLY while timedBonus, extraChest, or blitz countdown is active
  useEffect(() => {
    const now = Date.now();
    if (timedBonusReadyAt <= now && blitzEndsAt <= now && extraChestReadyAt <= now) return;
    setCooldownNowMs(now);
    const id = setInterval(() => {
      const t = Date.now();
      setCooldownNowMs(t);
      if (t >= timedBonusReadyAt && t >= blitzEndsAt && t >= extraChestReadyAt) {
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timedBonusReadyAt, blitzEndsAt, extraChestReadyAt]);

  const timedBonusReadyIn =
    timedBonusReadyAt > cooldownNowMs ? Math.ceil((timedBonusReadyAt - cooldownNowMs) / 1000) : 0;
  const extraChestReadyIn =
    extraChestReadyAt > cooldownNowMs ? Math.ceil((extraChestReadyAt - cooldownNowMs) / 1000) : 0;
  const blitzSecLeft =
    blitzEndsAt > cooldownNowMs ? Math.ceil((blitzEndsAt - cooldownNowMs) / 1000) : 0;

  // Auto-drop queued eggs when slots are free on the 30-slot grid
  useEffect(() => {
    if (state.eggQueue.length === 0) return;
    const hasFreeSlot = state.grid.some((c) => !c.locked && c.item === null);
    if (!hasFreeSlot) return;
    setState((prev) => {
      const filled = fillGridFromQueue(prev.grid, prev.eggQueue);
      if (filled.placedCount === 0) return prev;
      return {
        ...prev,
        grid: filled.grid,
        eggQueue: filled.eggQueue,
      };
    });
  }, [state.eggQueue, state.grid]);

  // === CENTRAL CLIENT ACTION DISPATCHER ===
  const runCentralAction = useCallback(
    (action: CentralGameAction, opts?: { silentToast?: boolean }): CentralActionReceipt => {
      const nowTs = Date.now();
      const currentBlitzLeft =
        blitzEndsAtRef.current > nowTs ? Math.ceil((blitzEndsAtRef.current - nowTs) / 1000) : 0;

      const outcome = evaluateCentralAction(latestStateRef.current, action, {
        nowTs,
        blitzSecLeft: currentBlitzLeft,
        effectiveCurrentUid: effectiveUidRef.current,
      });

      if (outcome.receipt.stateChanged && outcome.nextState !== latestStateRef.current) {
        commitState(outcome.nextState);
      }

      if (outcome.receipt.blitzEndsAt) {
        blitzEndsAtRef.current = outcome.receipt.blitzEndsAt;
        setBlitzEndsAt(outcome.receipt.blitzEndsAt);
      }
      if (outcome.receipt.timedBonusReadyAt) {
        setTimedBonusReadyAt(outcome.receipt.timedBonusReadyAt);
      }
      if (outcome.receipt.extraChestReadyAt) {
        setExtraChestReadyAt(outcome.receipt.extraChestReadyAt);
      }

      playReceiptSound(outcome.receipt.sound);
      playReceiptHaptic(outcome.receipt.haptic);

      if (!opts?.silentToast && outcome.receipt.message) {
        showToast(outcome.receipt.message);
      }

      return outcome.receipt;
    },
    [commitState, showToast]
  );

  // === SERVER SNAPSHOT MERGE ===
  const checkAndRefundOutbidEscrow = useCallback(
    (list: DragonAuctionRecord[], uid: string | null) => {
      if (!uid) return;
      const escrow = latestStateRef.current.activeEscrowBids ?? [];
      if (escrow.length === 0) return;

      let refundTotal = 0;
      const remainingEscrow = escrow.filter((eb) => {
        const match = list.find((a) => a.id === eb.auctionId);
        if (!match) return true;
        const outbidOrCancelled =
          (match.highestBidderUid && match.highestBidderUid !== uid) ||
          match.status === 'CANCELLED' ||
          (match.status === 'SOLD' && match.winnerUid !== uid);
        if (outbidOrCancelled) {
          refundTotal += eb.amount;
          return false;
        }
        return true;
      });

      if (refundTotal > 0) {
        setState((prev) => {
          const grant = withEarnedEnergy(prev, refundTotal, true);
          return {
            ...prev,
            corn: grant.corn,
            activeEscrowBids: remainingEscrow,
          };
        });
        showToast(`تمت إعادة ${refundTotal.toLocaleString()}⚡ لمحفظتك بعد تخطي عرضك في المزاد!`);
      }
    },
    [showToast]
  );

  const ensureVerifiedSession = useCallback(async (): Promise<boolean> => {
    if (getVerifiedSessionToken()) return true;
    const res = await verifyTelegramSession();
    if (res.verified && res.user) {
      setTgVerified(true);
      if (res.publicId) {
        setVerifiedPublicUid(res.publicId);
      }
      return true;
    }
    return false;
  }, []);

  const applyServerAllianceToPack = useCallback(
    (prevPack: GameState['pack'], rawAlliance: Record<string, unknown> | null): GameState['pack'] => {
      if (!rawAlliance) return prevPack;
      const membersList = Array.isArray(rawAlliance.members)
        ? (rawAlliance.members as RealAllianceMemberSnapshot[])
        : prevPack.realMembers ?? [];
      const msgs = Array.isArray(rawAlliance.messages)
        ? (rawAlliance.messages as GameState['pack']['messages'])
        : prevPack.messages;
      const logs =
        Array.isArray(rawAlliance.logs) && rawAlliance.logs.length > 0
          ? (rawAlliance.logs as NonNullable<GameState['pack']['logs']>)
          : prevPack.logs;

      const memberRoles: Record<string, AllianceMemberRole> = {};
      for (const m of membersList) {
        if (m.publicId && m.role) {
          memberRoles[m.publicId] = m.role;
        }
      }

      return {
        ...prevPack,
        joined: true,
        allianceId: typeof rawAlliance.id === 'string' ? rawAlliance.id : prevPack.allianceId,
        packName: typeof rawAlliance.packName === 'string' ? rawAlliance.packName : prevPack.packName,
        motto: typeof rawAlliance.motto === 'string' ? rawAlliance.motto : prevPack.motto,
        emblemId: (typeof rawAlliance.emblemId === 'string'
          ? rawAlliance.emblemId
          : prevPack.emblemId) as AllianceEmblemId,
        visibility:
          rawAlliance.visibility === 'SECRET' || rawAlliance.visibility === 'PUBLIC'
            ? rawAlliance.visibility
            : prevPack.visibility ?? 'PUBLIC',
        inviteCode:
          typeof rawAlliance.inviteCode === 'string' ? rawAlliance.inviteCode : prevPack.inviteCode,
        leaderPublicId:
          typeof rawAlliance.leaderPublicId === 'string'
            ? rawAlliance.leaderPublicId
            : prevPack.leaderPublicId,
        leaderName:
          typeof rawAlliance.leaderName === 'string' ? rawAlliance.leaderName : prevPack.leaderName,
        joinConditions:
          rawAlliance.joinConditions && typeof rawAlliance.joinConditions === 'object'
            ? (rawAlliance.joinConditions as AllianceJoinConditions)
            : prevPack.joinConditions,
        level: typeof rawAlliance.level === 'number' ? rawAlliance.level : prevPack.level,
        xp: typeof rawAlliance.xp === 'number' ? Math.max(prevPack.xp ?? 0, rawAlliance.xp) : prevPack.xp,
        power:
          typeof rawAlliance.power === 'number'
            ? Math.max(rawAlliance.power, membersList.reduce((a, m) => a + m.powerRating, 0))
            : prevPack.power,
        members: Math.max(1, membersList.length),
        realMembers: membersList,
        memberRoles: Object.keys(memberRoles).length > 0 ? memberRoles : prevPack.memberRoles,
        treasuryCorn:
          typeof rawAlliance.treasuryCorn === 'number'
            ? Math.max(prevPack.treasuryCorn, rawAlliance.treasuryCorn)
            : prevPack.treasuryCorn,
        messages: msgs.slice(-35),
        logs,
      };
    },
    []
  );

  const applyServerSnapshot = useCallback(
    (snapshot: {
      publicId?: string;
      myAlliance?: Record<string, unknown> | null;
      alliances?: unknown[];
      auctions?: unknown[];
      leaderboard?: unknown[];
      competition?: Record<string, unknown> | null;
    }) => {
      if (snapshot.publicId) {
        setVerifiedPublicUid(snapshot.publicId);
      }
      if (Array.isArray(snapshot.alliances)) {
        setAllianceDirectory(snapshot.alliances as RealAllianceDirectoryItem[]);
      }
      if (Array.isArray(snapshot.leaderboard)) {
        setLeaderboardPlayers(snapshot.leaderboard as PlayerLeaderboardEntry[]);
      }
      if (Array.isArray(snapshot.auctions)) {
        const aucList = snapshot.auctions as DragonAuctionRecord[];
        setLiveAuctions(aucList);
        checkAndRefundOutbidEscrow(aucList, snapshot.publicId || effectiveUidRef.current);
      }

      const comp = snapshot.competition;
      if (comp && typeof comp === 'object') {
        if (Array.isArray(comp.participants)) {
          setCompetitionParticipants(comp.participants as CompetitionParticipantEntry[]);
        }
        if (Array.isArray(comp.feedChallenges)) {
          setFeedChallenges(comp.feedChallenges as PlayerLeaderboardEntry[]);
        }
        setCompetitionMeta((prevMeta) => ({
          cycleNumber:
            typeof comp.cycleNumber === 'number' ? comp.cycleNumber : prevMeta.cycleNumber,
          endsAt: typeof comp.endsAt === 'number' ? comp.endsAt : prevMeta.endsAt,
          activeEventIndex:
            typeof comp.activeEventIndex === 'number'
              ? comp.activeEventIndex % WEEKEND_EVENTS.length
              : prevMeta.activeEventIndex,
          eventEndsAt:
            typeof comp.eventEndsAt === 'number' ? comp.eventEndsAt : prevMeta.eventEndsAt,
        }));
      }

      const hasAllianceUpdate = snapshot.myAlliance !== undefined;
      if (hasAllianceUpdate || comp) {
        setState((prev) => {
          let nextPack = prev.pack;
          if (hasAllianceUpdate) {
            if (snapshot.myAlliance) {
              nextPack = applyServerAllianceToPack(prev.pack, snapshot.myAlliance);
            } else if (prev.pack.joined && prev.pack.allianceId) {
              nextPack = {
                ...prev.pack,
                joined: false,
                allianceId: undefined,
                leaderPublicId: undefined,
                leaderName: undefined,
                visibility: undefined,
                inviteCode: undefined,
                memberRoles: {},
                realMembers: [],
              };
            }
          }

          let nextTournament = prev.tournament;
          let nextEventIndex = prev.weekendEventIndex;
          let nextEventEndsAt = prev.weekendEventEndsAt;
          if (comp && typeof comp === 'object') {
            const cycleId = typeof comp.cycleId === 'string' ? comp.cycleId : prev.tournament.cycleId;
            const cycleNumber =
              typeof comp.cycleNumber === 'number'
                ? comp.cycleNumber
                : prev.tournament.cycleNumber ?? 1;
            const endsAt = typeof comp.endsAt === 'number' ? comp.endsAt : prev.tournament.resetAt;
            const cycleRolledOver = Boolean(
              cycleId && prev.tournament.cycleId && cycleId !== prev.tournament.cycleId
            );
            nextTournament = {
              score: cycleRolledOver ? 0 : prev.tournament.score,
              claimedMilestones: cycleRolledOver ? [] : prev.tournament.claimedMilestones,
              resetSeconds: endsAt
                ? Math.max(0, Math.floor((endsAt - Date.now()) / 1000))
                : prev.tournament.resetSeconds,
              resetAt: endsAt,
              cycleId,
              cycleNumber,
            };
            if (typeof comp.activeEventIndex === 'number') {
              nextEventIndex = comp.activeEventIndex % WEEKEND_EVENTS.length;
            }
            if (typeof comp.eventEndsAt === 'number') {
              nextEventEndsAt = comp.eventEndsAt;
            }
          }

          return {
            ...prev,
            pack: nextPack,
            tournament: nextTournament,
            weekendEventIndex: nextEventIndex,
            weekendEventEndsAt: nextEventEndsAt,
          };
        });
      }
    },
    [applyServerAllianceToPack, checkAndRefundOutbidEscrow]
  );

  const runPlayerSyncNow = useCallback(async () => {
    if (!getVerifiedSessionToken()) return;
    const cur = latestStateRef.current;
    const res = await apiDispatchServerAction<{
      publicId?: string;
      myAlliance?: Record<string, unknown> | null;
      alliances?: unknown[];
      auctions?: unknown[];
      leaderboard?: unknown[];
      competition?: Record<string, unknown> | null;
    }>({
      type: 'PLAYER_SYNC',
      payload: {
        username: cur.username,
        corn: cur.corn,
        stars: cur.stars,
        duckGold: cur.duckGold,
        dmdTotal: cur.dmdTotal,
        leaguePoints: cur.league.points,
        totalFeeds: cur.stats.totalFeeds,
        dailyActivityPoints: cur.pack.activityPoints ?? 0,
        tournamentScore: cur.tournament.score,
        tournamentCycleId: cur.tournament.cycleId,
        dragons: cur.ducks.map((d) => ({
          id: d.id,
          name: d.name,
          skin: d.skin,
          rarity: d.rarity,
          level: d.level,
          customLevel: d.customLevel ?? 0,
          skillLevel: d.skillLevel ?? 1,
          trainingLevel: d.trainingLevel ?? 0,
          gear: d.gear ?? 'none',
          aura: d.aura ?? 'auto',
          sizeTier: resolveDragonSize(d),
        })),
      },
    });
    if (res.ok && res.data) {
      applyServerSnapshot(res.data);
    }
  }, [applyServerSnapshot]);

  const flushSaveNow = useCallback((stateToSave?: GameState) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      writeCompactedSave(stateToSave ?? latestStateRef.current);
      dirtySaveRef.current = false;
      setHasSave(true);
    } catch {
      // ignore storage quota
    }
  }, []);

  // Telegram Init & Session Verification (strictly Telegram-only, zero Google)
  useEffect(() => {
    const cleanup = initTelegramWebApp();
    apiFetchPublicSnapshot()
      .then((snap) => applyServerSnapshot(snap))
      .catch(() => {});

    verifyTelegramSession().then(async (res) => {
      if (res.verified && res.user) {
        setTgVerified(true);
        if (res.publicId) {
          setVerifiedPublicUid(res.publicId);
        }
        const displayName =
          res.user.username ||
          [res.user.first_name, res.user.last_name].filter(Boolean).join('_').slice(0, 18);
        if (displayName) {
          setState((prev) =>
            prev.username === 'DRAGON_TAMER' ? { ...prev, username: displayName } : prev
          );
        }
        await runPlayerSyncNow();
      }
    });
    return cleanup;
  }, [applyServerSnapshot, runPlayerSyncNow]);

  // Consolidated Realtime Server Sync (every 26s, below 20 req/min rate limit)
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState === 'hidden') return;
      if (getVerifiedSessionToken()) {
        await runPlayerSyncNow();
      } else {
        const snap = await apiFetchPublicSnapshot();
        applyServerSnapshot(snap);
      }
    }, 26000);
    return () => clearInterval(id);
  }, [applyServerSnapshot, runPlayerSyncNow]);

  // Refresh Alliance DB Directory & Member State immediately upon entering Swarms tab
  useEffect(() => {
    if (screen !== 'PLAYING' || activeTab !== 'GODS') return;
    if (getVerifiedSessionToken()) {
      void runPlayerSyncNow();
    } else {
      void apiFetchPublicSnapshot().then((snap) => applyServerSnapshot(snap));
    }
  }, [screen, activeTab, applyServerSnapshot, runPlayerSyncNow]);

  // Live 30s Auction Cycle Watcher when viewing MARKET tab (syncs right as 30s drops/closes happen)
  useEffect(() => {
    if (screen !== 'PLAYING' || activeTab !== 'MARKET') return;
    const nowMs = Date.now();
    const nextCycleEnds = liveAuctions
      .filter((a) => a.status === 'ACTIVE')
      .map((a) => a.cycleEndsAtMs || nowMs + 10000);
    const earliest = nextCycleEnds.length > 0 ? Math.min(...nextCycleEnds) : nowMs + 10000;
    const waitMs = Math.max(2500, Math.min(10000, earliest + 400 - nowMs));

    const t = setTimeout(async () => {
      if (document.visibilityState === 'hidden') return;
      const snap = await apiFetchPublicSnapshot();
      applyServerSnapshot(snap);
    }, waitMs);

    return () => clearTimeout(t);
  }, [screen, activeTab, liveAuctions, applyServerSnapshot]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    soundFX.muted = state.muted;
  }, [state.muted]);

  useEffect(() => {
    setTelegramHapticsEnabled(state.hapticsEnabled ?? true);
  }, [state.hapticsEnabled]);

  useEffect(() => {
    dirtySaveRef.current = true;
    if (!saveTimerRef.current) {
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        if (dirtySaveRef.current) {
          flushSaveNow();
        }
      }, 4500);
    }
  }, [state, flushSaveNow]);

  useEffect(() => {
    const onUnload = () => {
      if (document.visibilityState === 'hidden' || dirtySaveRef.current) {
        flushSaveNow();
      }
    };
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onUnload);
    return () => {
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('visibilitychange', onUnload);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (dirtySaveRef.current) flushSaveNow();
    };
  }, [flushSaveNow]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'PLAYING') return;
      if (e.key === 'Escape') {
        setModal((prev) => (prev ? null : 'PAUSE'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen]);

  // 5-second pure deadline watcher
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const nowTs = Date.now();
      setState((prevRaw) => evaluateDeadlineTick(prevRaw, nowTs));
    }, 5000);
    return () => clearInterval(interval);
  }, [screen]);

  // === NAVIGATION HELPERS ===
  const navigateToTab = useCallback((tab: MainTab, godsSubTab?: GodsSubTab) => {
    soundFX.playTabSwitch();
    if (godsSubTab) {
      setGodsInitialSubTab(godsSubTab);
    }
    setActiveTab(tab);
  }, []);

  const openDragonAuctionFor = useCallback((dragonId?: string) => {
    soundFX.playTabSwitch();
    setMarketPreselect({
      section: 'DUCKS',
      dragonId,
      nonce: Date.now(),
    });
    setActiveTab('MARKET');
  }, []);

  const openPassModal = useCallback((tab: 'SEASON' | 'DAILY') => {
    soundFX.playTabSwitch();
    setPassInitialTab(tab);
    setModal('PASS');
  }, []);

  const handleStartGame = useCallback(() => {
    setScreen('PLAYING');
    if (!offlineNoticeShown && initialLoaded.offlineDmdEarned > 0.0005) {
      setOfflineNoticeShown(true);
      showToast(`🐉 تم حفظ +${initialLoaded.offlineDmdEarned.toFixed(2)} AMF في محفظتك بنجاح!`);
    }
  }, [initialLoaded.offlineDmdEarned, offlineNoticeShown, showToast]);

  // === REAL ALLIANCE SERVER + LOCAL HANDLERS ===
  const handleRefreshAlliances = useCallback(async () => {
    const snap = await apiFetchPublicSnapshot();
    applyServerSnapshot(snap);
  }, [applyServerSnapshot]);

  const translateAllianceError = useCallback((reason?: string): string => {
    switch (reason) {
      case 'ALLIANCE_NAME_EXISTS':
        return 'يوجد سرب بهذا الاسم بالفعل، اختر اسماً آخر.';
      case 'ALLIANCE_NAME_TOO_SHORT':
        return 'اسم السرب يجب أن يكون 3 أحرف على الأقل.';
      case 'ALREADY_IN_ALLIANCE':
        return 'أنت منضم بالفعل إلى سرب، غادره أولاً.';
      case 'INVALID_SECRET_INVITE_CODE':
        return 'رمز الدعوة السري غير صحيح.';
      case 'MISSING_INVITE_CODE':
        return 'أدخل رمز الدعوة السري للانضمام.';
      case 'ALLIANCE_NOT_FOUND':
        return 'لم يتم العثور على هذا السرب.';
      case 'JOIN_CONDITIONS_NOT_MET':
        return 'تنانينك أو قوتك لم تستوفِ شروط الانضمام لهذا السرب بعد.';
      case 'ALLIANCE_FULL':
        return 'السرب مكتمل العدد حالياً.';
      case 'LEAVE_CURRENT_ALLIANCE_FIRST':
        return 'غادر سربك الحالي أولاً.';
      case 'LEADER_ONLY_ACTION':
        return 'هذه الصلاحية مخصصة لقائد السرب (R5) فقط.';
      case 'INSUFFICIENT_ALLIANCE_RANK':
        return 'رتبتك الحالية لا تمنحك هذه الصلاحية.';
      case 'CANNOT_MANAGE_EQUAL_OR_HIGHER_RANK':
        return 'لا يمكنك تعديل أو طرد عضو برتبة مساوية أو أعلى منك.';
      case 'CANNOT_DEMOTE_BELOW_MEMBER':
        return 'العضو بالفعل في أدنى رتبة (عضو R1).';
      case 'CANNOT_PROMOTE_SELF':
      case 'CANNOT_KICK_SELF':
      case 'ALREADY_LEADER':
        return 'لا يمكن تطبيق هذا الإجراء على حسابك.';
      case 'TARGET_NOT_IN_ALLIANCE':
        return 'العضو المحدد غير موجود في السرب حالياً.';
      default:
        return 'تعذر تنفيذ العملية حالياً، حاول مرة أخرى.';
    }
  }, []);

  const handleCreateAlliance = async (data: {
    packName: string;
    motto: string;
    emblemId: AllianceEmblemId;
    visibility?: AllianceVisibility;
    joinConditions: AllianceJoinConditions;
  }): Promise<boolean> => {
    const authed = await ensureVerifiedSession();
    if (!authed) {
      soundFX.playError();
      showToast('تعذر توثيق الجلسة مع الخادم لإنشاء السرب.');
      return false;
    }
    await runPlayerSyncNow();
    const visibility: AllianceVisibility = data.visibility === 'SECRET' ? 'SECRET' : 'PUBLIC';
    const res = await apiDispatchServerAction<{
      alliance?: Record<string, unknown>;
      alliances?: unknown[];
    }>({
      type: 'ALLIANCE_CREATE',
      packName: data.packName,
      motto: data.motto,
      emblemId: data.emblemId,
      visibility,
      joinConditions: data.joinConditions,
    });
    if (!res.ok || !res.data?.alliance) {
      soundFX.playError();
      showToast(translateAllianceError(res.reason));
      return false;
    }
    if (Array.isArray(res.data.alliances)) {
      setAllianceDirectory(res.data.alliances as RealAllianceDirectoryItem[]);
    }
    const createdAlliance = res.data.alliance;
    let grantedEnergy = 0;
    setState((p) => {
      const energyGrant = withEarnedEnergy(p, 260);
      grantedEnergy = energyGrant.corn - p.corn;
      return {
        ...p,
        corn: energyGrant.corn,
        treasury: energyGrant.treasury,
        pack: applyServerAllianceToPack(
          {
            ...p.pack,
            joined: true,
            allianceCoins: (p.pack.allianceCoins ?? 60) + 60,
            questBaselines: p.pack.questBaselines ?? {
              feeds: p.stats.totalFeeds,
              merges: p.stats.totalMerges,
              errands: p.stats.totalErrands,
            },
          },
          createdAlliance
        ),
      };
    });
    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    const inviteCode = typeof createdAlliance.inviteCode === 'string' ? createdAlliance.inviteCode : '';
    showToast(
      visibility === 'SECRET' && inviteCode
        ? `🔒 تم تأسيس السرب السري "${data.packName}"! رمز الدعوة: ${inviteCode} (+${grantedEnergy} طعام)`
        : `👑 تم تأسيس سرب "${data.packName}" بنجاح (+${grantedEnergy} طعام)!`
    );
    return true;
  };

  const handleJoinAllianceById = async (allianceId: string, inviteCode?: string): Promise<boolean> => {
    const authed = await ensureVerifiedSession();
    if (!authed) {
      soundFX.playError();
      showToast('تعذر توثيق الجلسة مع الخادم للانضمام للسرب.');
      return false;
    }
    await runPlayerSyncNow();
    const res = await apiDispatchServerAction<{
      alliance?: Record<string, unknown>;
      alliances?: unknown[];
    }>({
      type: 'ALLIANCE_JOIN',
      allianceId,
      inviteCode,
    });
    if (!res.ok || !res.data?.alliance) {
      soundFX.playError();
      showToast(translateAllianceError(res.reason));
      return false;
    }
    if (Array.isArray(res.data.alliances)) {
      setAllianceDirectory(res.data.alliances as RealAllianceDirectoryItem[]);
    }
    const joinedAlliance = res.data.alliance;
    let grantedEnergy = 0;
    setState((p) => {
      const energyGrant = withEarnedEnergy(p, 260);
      grantedEnergy = energyGrant.corn - p.corn;
      return {
        ...p,
        corn: energyGrant.corn,
        treasury: energyGrant.treasury,
        pack: applyServerAllianceToPack(
          {
            ...p.pack,
            joined: true,
            allianceCoins: (p.pack.allianceCoins ?? 60) + 60,
            questBaselines: p.pack.questBaselines ?? {
              feeds: p.stats.totalFeeds,
              merges: p.stats.totalMerges,
              errands: p.stats.totalErrands,
            },
          },
          joinedAlliance
        ),
      };
    });
    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    const joinedName = typeof joinedAlliance.packName === 'string' ? joinedAlliance.packName : 'السرب';
    showToast(`🛡️ انضممت إلى "${joinedName}" (+${grantedEnergy} طعام و +60 عملة سرب)!`);
    return true;
  };

  const handleJoinAllianceByCode = async (inviteCode: string): Promise<boolean> => {
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      soundFX.playError();
      showToast('أدخل رمز الدعوة السري أولاً.');
      return false;
    }
    return handleJoinAllianceById('', cleanCode);
  };

  const handleLeavePack = async () => {
    if (!latestStateRef.current.pack.joined) return;
    if (await ensureVerifiedSession()) {
      const res = await apiDispatchServerAction<{ alliances?: unknown[] }>({
        type: 'ALLIANCE_LEAVE',
      });
      if (res.ok && Array.isArray(res.data?.alliances)) {
        setAllianceDirectory(res.data.alliances as RealAllianceDirectoryItem[]);
      }
    }
    runCentralAction({ type: 'LEAVE_PACK_LOCAL' });
  };

  const handlePromoteDemoteMember = async (memberId: string, direction: 'UP' | 'DOWN') => {
    const cur = latestStateRef.current;
    const member = (cur.pack.realMembers ?? []).find((m) => m.publicId === memberId);
    if (!member || member.role === 'LEADER') return;
    if (!(await ensureVerifiedSession()) || !cur.pack.allianceId) {
      soundFX.playError();
      showToast('يلزم اتصال موثق بالسرب لتعديل الرتب.');
      return;
    }
    const res = await apiDispatchServerAction<{
      alliance?: Record<string, unknown>;
      alliances?: unknown[];
    }>({
      type: 'ALLIANCE_MEMBER_ACTION',
      allianceId: cur.pack.allianceId,
      targetPublicId: memberId,
      action: direction === 'UP' ? 'PROMOTE' : 'DEMOTE',
    });
    if (!res.ok || !res.data?.alliance) {
      soundFX.playError();
      showToast(translateAllianceError(res.reason));
      return;
    }
    const nextAlliance = res.data.alliance;
    if (Array.isArray(res.data.alliances)) {
      setAllianceDirectory(res.data.alliances as RealAllianceDirectoryItem[]);
    }
    setState((p) => ({
      ...p,
      pack: applyServerAllianceToPack(p.pack, nextAlliance),
    }));
    soundFX.playGodConfirm();
    triggerTelegramHaptic('light');
    showToast(
      res.receipt?.message ||
        `${direction === 'UP' ? '⬆️ تمت ترقية' : '⬇️ تم خفض'} ${member.displayName} بنجاح!`
    );
  };

  const handleKickMember = async (memberId: string) => {
    const cur = latestStateRef.current;
    const member = (cur.pack.realMembers ?? []).find((m) => m.publicId === memberId);
    if (!member) return;
    if (member.role === 'LEADER') {
      soundFX.playError();
      showToast('لا يمكن طرد قائد السرب!');
      return;
    }
    if (!(await ensureVerifiedSession()) || !cur.pack.allianceId) {
      soundFX.playError();
      showToast('يلزم اتصال موثق بالسرب لإدارة الأعضاء.');
      return;
    }
    const res = await apiDispatchServerAction<{
      alliance?: Record<string, unknown>;
      alliances?: unknown[];
    }>({
      type: 'ALLIANCE_MEMBER_ACTION',
      allianceId: cur.pack.allianceId,
      targetPublicId: memberId,
      action: 'KICK',
    });
    if (!res.ok || !res.data?.alliance) {
      soundFX.playError();
      showToast(translateAllianceError(res.reason));
      return;
    }
    const nextAlliance = res.data.alliance;
    if (Array.isArray(res.data.alliances)) {
      setAllianceDirectory(res.data.alliances as RealAllianceDirectoryItem[]);
    }
    setState((p) => ({
      ...p,
      pack: applyServerAllianceToPack(p.pack, nextAlliance),
    }));
    soundFX.playTabSwitch();
    triggerTelegramHaptic('medium');
    showToast(res.receipt?.message || `تم طرد ${member.displayName} من السرب.`);
  };

  const handleTransferLeadership = async (targetPublicId: string) => {
    const cur = latestStateRef.current;
    const member = (cur.pack.realMembers ?? []).find((m) => m.publicId === targetPublicId);
    if (!member || member.role === 'LEADER') return;
    if (!(await ensureVerifiedSession()) || !cur.pack.allianceId) {
      soundFX.playError();
      showToast('يلزم اتصال موثق بالسرب لنقل القيادة.');
      return;
    }
    const res = await apiDispatchServerAction<{
      alliance?: Record<string, unknown>;
      alliances?: unknown[];
    }>({
      type: 'ALLIANCE_MEMBER_ACTION',
      allianceId: cur.pack.allianceId,
      targetPublicId,
      action: 'TRANSFER_LEADERSHIP',
    });
    if (!res.ok || !res.data?.alliance) {
      soundFX.playError();
      showToast(translateAllianceError(res.reason));
      return;
    }
    const nextAlliance = res.data.alliance;
    if (Array.isArray(res.data.alliances)) {
      setAllianceDirectory(res.data.alliances as RealAllianceDirectoryItem[]);
    }
    setState((p) => ({
      ...p,
      pack: applyServerAllianceToPack(p.pack, nextAlliance),
    }));
    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    showToast(`👑 تم نقل قيادة السرب إلى ${member.displayName} بنجاح!`);
  };

  const handleUpdateAllianceIdentity = async (
    nextName: string,
    nextMotto: string,
    emblemId: AllianceEmblemId,
    visibility?: AllianceVisibility
  ) => {
    const cur = latestStateRef.current;
    if (cur.pack.allianceId) {
      if (!(await ensureVerifiedSession())) {
        soundFX.playError();
        showToast('تعذر توثيق الجلسة لتحديث هوية السرب.');
        return;
      }
      const res = await apiDispatchServerAction<{
        alliance?: Record<string, unknown>;
        alliances?: unknown[];
      }>({
        type: 'ALLIANCE_UPDATE_IDENTITY',
        allianceId: cur.pack.allianceId,
        packName: nextName,
        motto: nextMotto,
        emblemId,
        visibility,
      });
      if (!res.ok || !res.data?.alliance) {
        soundFX.playError();
        showToast(translateAllianceError(res.reason));
        return;
      }
      if (Array.isArray(res.data.alliances)) {
        setAllianceDirectory(res.data.alliances as RealAllianceDirectoryItem[]);
      }
      const nextAlliance = res.data.alliance;
      setState((p) => ({ ...p, pack: applyServerAllianceToPack(p.pack, nextAlliance) }));
      soundFX.playGodConfirm();
      triggerTelegramHaptic('success');
      showToast('تم حفظ هوية وإعدادات السرب في قاعدة البيانات!');
      return;
    }
    runCentralAction({
      type: 'UPDATE_ALLIANCE_IDENTITY_LOCAL',
      packName: nextName,
      motto: nextMotto,
      emblemId,
      visibility,
    });
  };

  const handleUpdateJoinConditions = async (joinConditions: AllianceJoinConditions) => {
    const cur = latestStateRef.current;
    if (cur.pack.allianceId) {
      if (!(await ensureVerifiedSession())) {
        soundFX.playError();
        showToast('تعذر توثيق الجلسة لتحديث شروط الانضمام.');
        return;
      }
      const res = await apiDispatchServerAction<{
        alliance?: Record<string, unknown>;
        alliances?: unknown[];
      }>({
        type: 'ALLIANCE_UPDATE_IDENTITY',
        allianceId: cur.pack.allianceId,
        joinConditions,
      });
      if (!res.ok || !res.data?.alliance) {
        soundFX.playError();
        showToast(translateAllianceError(res.reason));
        return;
      }
      if (Array.isArray(res.data.alliances)) {
        setAllianceDirectory(res.data.alliances as RealAllianceDirectoryItem[]);
      }
      const nextAlliance = res.data.alliance;
      setState((p) => ({ ...p, pack: applyServerAllianceToPack(p.pack, nextAlliance) }));
      soundFX.playGodConfirm();
      showToast('تم حفظ شروط الانضمام الجديدة للسرب!');
      return;
    }
    runCentralAction({
      type: 'UPDATE_JOIN_CONDITIONS_LOCAL',
      joinConditions,
    });
  };

  const handleRegenerateSecretCode = async () => {
    const cur = latestStateRef.current;
    if (!cur.pack.allianceId) return;
    if (!(await ensureVerifiedSession())) {
      soundFX.playError();
      showToast('تعذر توثيق الجلسة لتجديد رمز الدعوة.');
      return;
    }
    const res = await apiDispatchServerAction<{
      alliance?: Record<string, unknown>;
      alliances?: unknown[];
    }>({
      type: 'ALLIANCE_UPDATE_IDENTITY',
      allianceId: cur.pack.allianceId,
      regenerateInviteCode: true,
    });
    if (!res.ok || !res.data?.alliance) {
      soundFX.playError();
      showToast(translateAllianceError(res.reason));
      return;
    }
    const nextAlliance = res.data.alliance;
    setState((p) => ({ ...p, pack: applyServerAllianceToPack(p.pack, nextAlliance) }));
    soundFX.playGodConfirm();
    triggerTelegramHaptic('success');
    const newCode = typeof nextAlliance.inviteCode === 'string' ? nextAlliance.inviteCode : '';
    showToast(newCode ? `🔑 تم تجديد رمز الدعوة السري: ${newCode}` : 'تم تجديد رمز الدعوة السري!');
  };

  const handleSendPackMessage = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const cur = latestStateRef.current;
    if (cur.pack.allianceId && getVerifiedSessionToken()) {
      void apiDispatchServerAction<{ messages?: GameState['pack']['messages'] }>({
        type: 'ALLIANCE_CHAT',
        allianceId: cur.pack.allianceId,
        text: clean,
      }).then((res) => {
        if (res.ok && Array.isArray(res.data?.messages)) {
          const msgs = res.data.messages.slice(-35);
          setState((p) => ({ ...p, pack: { ...p.pack, messages: msgs } }));
        }
      });
    }
    runCentralAction({ type: 'APPEND_PACK_CHAT_LOCAL', text: clean }, { silentToast: true });
  };

  const handleDonateAlliance = (kind: AllianceDonationKind) => {
    const nowTs = Date.now();
    const receipt = runCentralAction({
      type: 'DONATE_ALLIANCE',
      kind,
      lastDonateAt: lastAllianceDonateAtRef.current,
    });
    if (!receipt.ok) return;
    lastAllianceDonateAtRef.current = nowTs;

    const cur = latestStateRef.current;
    if (getVerifiedSessionToken() && cur.pack.allianceId) {
      const tierMeta =
        ALLIANCE_DONATION_TIERS.find((t) => t.id === kind) ?? ALLIANCE_DONATION_TIERS[0];
      const serverKind =
        tierMeta.goldCost > 0
          ? 'GOLD_OFFERING'
          : tierMeta.energyCost >= 500
            ? 'MED_ENERGY'
            : 'SMALL_ENERGY';
      const serverAmount = tierMeta.goldCost > 0 ? 10 : tierMeta.energyCost >= 500 ? 500 : 100;
      void apiDispatchServerAction({
        type: 'ALLIANCE_DONATE',
        allianceId: cur.pack.allianceId,
        kind: serverKind,
        amount: serverAmount,
      });
    }
  };

  const handleAttackAllianceBoss = () => {
    const cur = latestStateRef.current;
    const totalPower = cur.ducks.reduce((acc, d) => acc + (d.powerRating ?? 100), 0);
    const receipt = runCentralAction({ type: 'ATTACK_ALLIANCE_BOSS' });
    if (receipt.ok && getVerifiedSessionToken()) {
      void apiDispatchServerAction({
        type: 'BATTLE_RESOLVE',
        mode: 'ALLIANCE_BOSS',
        rivalPower: cur.pack.bossMaxHp ?? 12500,
        dragonIds: cur.ducks.map((d) => d.id),
        clientClaimedPower: totalPower,
      });
    }
  };

  const handleBattleResult = useCallback(
    (
      won: boolean,
      rewardCorn: number,
      rewardStars: number,
      leaguePts: number,
      xp: number,
      gold: number,
      rewardMedals = 0
    ) => {
      const cur = latestStateRef.current;
      const activeDragon = cur.ducks[cur.activeDuckIndex] ?? cur.ducks[0];
      if (getVerifiedSessionToken()) {
        void apiDispatchServerAction({
          type: 'BATTLE_RESOLVE',
          mode: 'ARENA',
          rivalPower: Math.max(200, Math.round(rewardCorn * 3)),
          dragonIds: activeDragon ? [activeDragon.id] : [],
          clientClaimedPower: activeDragon?.powerRating ?? 100,
        });
      }
      runCentralAction(
        {
          type: 'BATTLE_RESULT',
          won,
          rewardCorn,
          rewardStars,
          leaguePts,
          xp,
          gold,
          rewardMedals,
        },
        { silentToast: true }
      );
    },
    [runCentralAction]
  );

  // === REAL P2P DRAGON AUCTION HANDLERS (TELEGRAM-ONLY) ===
  const handleListDragonAuction = async (
    duckId: string,
    startCorn: number,
    buyNowStars: number,
    durationMin: number
  ) => {
    if (!getVerifiedSessionToken()) {
      await verifyTelegramSession();
    }
    const cur = latestStateRef.current;
    const dragon = cur.ducks.find((d) => d.id === duckId);
    const unlockedCount = cur.ducks.filter((d, i) => !isDragonSlotLocked(d, cur.unlockedSlots) && (d.slotIndex ?? i) < cur.unlockedSlots).length;
    if (!dragon || dragon.breedingEndsAt || isDragonSlotLocked(dragon, cur.unlockedSlots) || unlockedCount <= 1) {
      soundFX.playError();
      showToast('التنين غير متاح للمزاد (تأكد من وجود تنين مفتوح آخر وعدم انشغاله بالتزاوج).');
      return;
    }
    const val = calculateDragonUpgradeInvestmentAndPrice(dragon);
    const safeStart = Math.max(val.minStart, Math.min(val.maxStart, Math.round(startCorn)));
    const safeStars = Math.max(val.minStars, Math.min(val.maxStars, Math.round(buyNowStars)));
    const listingFee = Math.min(cur.corn, calculateAuctionListingFee(safeStart));

    try {
      await runPlayerSyncNow();
      const res = await apiDispatchServerAction<{
        auction?: DragonAuctionRecord;
        listingFee?: number;
        auctions?: DragonAuctionRecord[];
      }>({
        type: 'AUCTION_LIST',
        dragon: {
          id: dragon.id,
          name: dragon.name,
          skin: dragon.skin,
          rarity: dragon.rarity,
          level: dragon.level,
          customLevel: dragon.customLevel ?? 0,
          skillLevel: dragon.skillLevel ?? 1,
          trainingLevel: dragon.trainingLevel ?? 0,
          gear: dragon.gear ?? 'none',
          aura: dragon.aura ?? 'auto',
          sizeTier: resolveDragonSize(dragon),
          powerRating: dragon.powerRating,
        },
        startCornPrice: safeStart,
        buyNowStars: safeStars,
        durationMinutes: durationMin,
      });

      if (!res.ok || !res.data?.auction) {
        soundFX.playError();
        showToast(
          res.reason === 'MAX_ACTIVE_AUCTIONS_5'
            ? 'الحد الأقصى 5 مزادات نشطة بنفس الوقت.'
            : 'فشل نشر المزاد، حاول مجدداً.'
        );
        return;
      }

      const feePaid = res.data.listingFee ?? listingFee;
      const latest = latestStateRef.current;
      const remainingDucks = normalizeDragonSlots(
        latest.ducks.filter((d) => d.id !== duckId),
        latest.unlockedSlots
      );
      const safeIdx = Math.min(latest.activeDuckIndex, Math.max(0, remainingDucks.length - 1));
      const nextState: GameState = {
        ...latest,
        corn: Math.max(0, latest.corn - feePaid),
        treasury: withBurnedEnergy(latest.treasury, feePaid),
        ducks: remainingDucks,
        activeDuckIndex: isDragonSlotLocked(remainingDucks[safeIdx], latest.unlockedSlots)
          ? getFirstUnlockedDragonIndex(remainingDucks, latest.unlockedSlots)
          : safeIdx,
      };
      commitState(nextState);
      flushSaveNow(nextState);
      if (Array.isArray(res.data.auctions)) {
        setLiveAuctions(res.data.auctions);
      } else {
        setLiveAuctions((prev) => [res.data!.auction!, ...prev]);
      }
      soundFX.playGodConfirm();
      triggerTelegramHaptic('success');
      showToast(
        res.receipt?.message ||
          `تم طرح ${dragon.name} في المزاد الأونلاين! (رسوم حرق ${feePaid.toLocaleString()}⚡)`
      );
    } catch {
      soundFX.playError();
      showToast('فشل نشر المزاد، حاول مجدداً.');
    }
  };

  const handleBidLiveAuction = async (auctionId: string) => {
    if (!getVerifiedSessionToken()) {
      await verifyTelegramSession();
    }
    const auc = liveAuctions.find((a) => a.id === auctionId);
    if (!auc || (effectiveCurrentUid && auc.sellerUid === effectiveCurrentUid)) return;
    const minBid = auc.currentCornPrice;
    if (latestStateRef.current.corn < minBid) {
      soundFX.playError();
      showToast(`تحتاج ${minBid.toLocaleString()}⚡ للمزايدة!`);
      return;
    }

    try {
      const res = await apiDispatchServerAction<{
        acceptedPrice?: number;
        auctions?: DragonAuctionRecord[];
      }>({
        type: 'AUCTION_ACTION',
        auctionId,
        operation: 'BID',
      });
      if (!res.ok) {
        soundFX.playError();
        showToast('تم تخطي السعر أو انتهى المزاد!');
        return;
      }
      const acceptedPrice = Number(res.data?.acceptedPrice ?? minBid);
      if (Array.isArray(res.data?.auctions)) {
        setLiveAuctions(res.data.auctions);
      }
      setState((prev) => ({
        ...prev,
        corn: Math.max(0, prev.corn - acceptedPrice),
        activeEscrowBids: [
          ...(prev.activeEscrowBids ?? []).filter((e) => e.auctionId !== auctionId),
          { auctionId, amount: acceptedPrice, placedAt: Date.now() },
        ],
      }));
      soundFX.playTapFeed();
      triggerTelegramHaptic('medium');
      showToast(res.receipt?.message || `عرضك ${acceptedPrice.toLocaleString()}⚡ أصبح الأعلى الآن!`);
    } catch {
      soundFX.playError();
      showToast('تم تخطي السعر أو انتهى المزاد!');
    }
  };

  const handleBuyNowLiveAuction = async (auctionId: string) => {
    if (!getVerifiedSessionToken()) {
      await verifyTelegramSession();
    }
    const auc = liveAuctions.find((a) => a.id === auctionId);
    if (!auc || (effectiveCurrentUid && auc.sellerUid === effectiveCurrentUid)) return;
    if (latestStateRef.current.stars < auc.buyNowStars) {
      soundFX.playError();
      showToast(`تحتاج ${auc.buyNowStars} ★ للشراء الفوري!`);
      return;
    }
    try {
      const res = await apiDispatchServerAction<{ auctions?: DragonAuctionRecord[] }>({
        type: 'AUCTION_ACTION',
        auctionId,
        operation: 'BUY_NOW',
      });
      if (!res.ok) {
        soundFX.playError();
        showToast('لم يعد المزاد متاحاً للشراء.');
        return;
      }
      if (Array.isArray(res.data?.auctions)) {
        setLiveAuctions(res.data.auctions);
      }
      const sz = auc.dragon.sizeTier ?? 'NORMAL';
      const lv = Math.max(1, Math.min(5, auc.dragon.level));
      const reqFeeds = getLevelRequiredFeeds(lv);
      const wonDragon: Duck = {
        id: `dragon_p2p_${Date.now()}`,
        name: auc.dragon.name,
        skin: auc.dragon.skin,
        rarity: auc.rarity,
        level: lv,
        maxLevel: 5,
        customLevel: auc.dragon.customLevel ?? 0,
        dmd: 0,
        dmdStored: 0,
        slotIndex: null,
        feedCost: getFeedCost(lv, auc.rarity, getPlayerTier(latestStateRef.current), 0, {
          sizeTier: sz,
          xl: sz !== 'NORMAL',
        }),
        feedsProgress: lv >= 5 ? reqFeeds : 0,
        feedsRequired: reqFeeds,
        feedClicksSinceReset: 0,
        costResetEndsAt: null,
        levelFeedsCompleted: lv >= 5,
        breedingEndsAt: null,
        breedingNextLevel: null,
        lastBreedingEggAt: null,
        staked: false,
        stakeRatePerHour: 0,
        xl: sz !== 'NORMAL',
        sizeTier: sz,
        gear: auc.dragon.gear,
        aura: auc.dragon.aura,
        skillLevel: auc.dragon.skillLevel ?? 1,
        trainingLevel: auc.dragon.trainingLevel ?? 0,
        powerRating: auc.dragon.powerRating ?? RARITY_STYLE[auc.rarity].basePower + lv * 25,
        unlockedAt: Date.now(),
      };
      setState((prev) => {
        const escrowMatch = (prev.activeEscrowBids ?? []).find((e) => e.auctionId === auctionId);
        const refundAmt = escrowMatch?.amount ?? 0;
        return {
          ...prev,
          corn: prev.corn + refundAmt,
          stars: Math.max(0, prev.stars - auc.buyNowStars),
          treasury: withBurnedStars(prev.treasury, auc.buyNowStars),
          activeEscrowBids: (prev.activeEscrowBids ?? []).filter((e) => e.auctionId !== auctionId),
          ducks: normalizeDragonSlots([...prev.ducks, wonDragon], prev.unlockedSlots),
        };
      });
      soundFX.playVictory();
      triggerTelegramHaptic('success');
      showToast(res.receipt?.message || `مبروك! اشتريت ${auc.dragon.name} فوراً وأُضيف لمجموعتك 🐉`);
    } catch {
      soundFX.playError();
      showToast('لم يعد المزاد متاحاً للشراء.');
    }
  };

  const handleCancelLiveAuction = async (auctionId: string) => {
    if (!getVerifiedSessionToken()) {
      await verifyTelegramSession();
    }
    const auc = liveAuctions.find((a) => a.id === auctionId);
    if (!auc || (effectiveCurrentUid && auc.sellerUid !== effectiveCurrentUid)) return;
    try {
      const res = await apiDispatchServerAction<{ auctions?: DragonAuctionRecord[] }>({
        type: 'AUCTION_ACTION',
        auctionId,
        operation: 'CANCEL',
      });
      if (!res.ok) {
        soundFX.playError();
        showToast('لا يمكن إلغاء المزاد بعد وجود مزايدات.');
        return;
      }
      if (Array.isArray(res.data?.auctions)) {
        setLiveAuctions(res.data.auctions);
      }
      const sz = auc.dragon.sizeTier ?? 'NORMAL';
      const lv = Math.max(1, Math.min(5, auc.dragon.level));
      const reqFeeds = getLevelRequiredFeeds(lv);
      const returnedDragon: Duck = {
        id: auc.dragon.id || `dragon_ret_${Date.now()}`,
        name: auc.dragon.name,
        skin: auc.dragon.skin,
        rarity: auc.rarity,
        level: lv,
        maxLevel: 5,
        customLevel: auc.dragon.customLevel ?? 0,
        dmd: 0,
        dmdStored: 0,
        slotIndex: null,
        feedCost: getFeedCost(lv, auc.rarity, getPlayerTier(latestStateRef.current), 0, {
          sizeTier: sz,
          xl: sz !== 'NORMAL',
        }),
        feedsProgress: 0,
        feedsRequired: reqFeeds,
        feedClicksSinceReset: 0,
        costResetEndsAt: null,
        levelFeedsCompleted: false,
        breedingEndsAt: null,
        breedingNextLevel: null,
        lastBreedingEggAt: null,
        staked: false,
        stakeRatePerHour: 0,
        xl: sz !== 'NORMAL',
        sizeTier: sz,
        gear: auc.dragon.gear,
        aura: auc.dragon.aura,
        skillLevel: auc.dragon.skillLevel ?? 1,
        trainingLevel: auc.dragon.trainingLevel ?? 0,
        powerRating: auc.dragon.powerRating ?? RARITY_STYLE[auc.rarity].basePower + lv * 25,
        unlockedAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        ducks: normalizeDragonSlots([...prev.ducks, returnedDragon], prev.unlockedSlots),
      }));
      soundFX.playTabSwitch();
      showToast(res.receipt?.message || `تم إلغاء المزاد واسترجاع ${auc.dragon.name} إلى قائمتك.`);
    } catch {
      soundFX.playError();
      showToast('لا يمكن إلغاء المزاد بعد وجود مزايدات.');
    }
  };

  const handleClaimBuyerAuction = async (auctionId: string) => {
    if (!getVerifiedSessionToken()) {
      await verifyTelegramSession();
    }
    const auc = liveAuctions.find((a) => a.id === auctionId);
    if (!auc) return;
    try {
      const res = await apiDispatchServerAction<{ auctions?: DragonAuctionRecord[] }>({
        type: 'AUCTION_ACTION',
        auctionId,
        operation: 'CLAIM_BUYER',
      });
      if (!res.ok) {
        soundFX.playError();
        showToast('تعذر استلام التنين الآن.');
        return;
      }
      if (Array.isArray(res.data?.auctions)) {
        setLiveAuctions(res.data.auctions);
      }
      const sz = auc.dragon.sizeTier ?? 'NORMAL';
      const lv = Math.max(1, Math.min(5, auc.dragon.level));
      const reqFeeds = getLevelRequiredFeeds(lv);
      const wonDragon: Duck = {
        id: `dragon_won_p2p_${Date.now()}`,
        name: auc.dragon.name,
        skin: auc.dragon.skin,
        rarity: auc.rarity,
        level: lv,
        maxLevel: 5,
        customLevel: auc.dragon.customLevel ?? 0,
        dmd: 0,
        dmdStored: 0,
        slotIndex: null,
        feedCost: getFeedCost(lv, auc.rarity, getPlayerTier(latestStateRef.current), 0, {
          sizeTier: sz,
          xl: sz !== 'NORMAL',
        }),
        feedsProgress: lv >= 5 ? reqFeeds : 0,
        feedsRequired: reqFeeds,
        feedClicksSinceReset: 0,
        costResetEndsAt: null,
        levelFeedsCompleted: lv >= 5,
        breedingEndsAt: null,
        breedingNextLevel: null,
        lastBreedingEggAt: null,
        staked: false,
        stakeRatePerHour: 0,
        xl: sz !== 'NORMAL',
        sizeTier: sz,
        gear: auc.dragon.gear,
        aura: auc.dragon.aura,
        skillLevel: auc.dragon.skillLevel ?? 1,
        trainingLevel: auc.dragon.trainingLevel ?? 0,
        powerRating: auc.dragon.powerRating ?? RARITY_STYLE[auc.rarity].basePower + lv * 25,
        unlockedAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        activeEscrowBids: (prev.activeEscrowBids ?? []).filter((e) => e.auctionId !== auctionId),
        ducks: normalizeDragonSlots([...prev.ducks, wonDragon], prev.unlockedSlots),
      }));
      soundFX.playVictory();
      showToast(res.receipt?.message || `استلمت ${auc.dragon.name} بنجاح من المزاد! 🐉`);
    } catch {
      soundFX.playError();
      showToast('تعذر استلام التنين الآن.');
    }
  };

  const handleClaimSellerAuction = async (auctionId: string) => {
    if (!getVerifiedSessionToken()) {
      await verifyTelegramSession();
    }
    try {
      const res = await apiDispatchServerAction<{
        auctions?: DragonAuctionRecord[];
        settlementType?: string;
        netStars?: number;
        netCorn?: number;
        taxBurned?: number;
      }>({
        type: 'AUCTION_ACTION',
        auctionId,
        operation: 'CLAIM_SELLER',
      });
      if (!res.ok) {
        soundFX.playError();
        showToast('تعذر تحصيل العوائد حالياً.');
        return;
      }
      if (Array.isArray(res.data?.auctions)) {
        setLiveAuctions(res.data.auctions);
      }
      if (res.data?.settlementType === 'BUY_NOW') {
        const netStars = Number(res.data.netStars ?? 0);
        setState((prev) => ({
          ...prev,
          stars: prev.stars + netStars,
          treasury: withEarnedStars(prev.treasury, netStars),
        }));
        soundFX.playChestOpen();
        showToast(res.receipt?.message || `تم تحصيل +${netStars} ★ من بيع تنينك فوراً!`);
      } else {
        const netCorn = Number(res.data?.netCorn ?? 0);
        const taxBurned = Number(res.data?.taxBurned ?? 0);
        setState((prev) => {
          const grant = withEarnedEnergy(prev, netCorn, true);
          return {
            ...prev,
            corn: grant.corn,
            treasury: withBurnedEnergy(grant.treasury, taxBurned),
          };
        });
        soundFX.playChestOpen();
        showToast(
          res.receipt?.message ||
            `تم تحصيل صافي +${netCorn.toLocaleString()}⚡ (حرق ضريبة 8%: ${taxBurned.toLocaleString()}⚡)`
        );
      }
    } catch {
      soundFX.playError();
      showToast('تعذر تحصيل العوائد حالياً.');
    }
  };

  // === RETURNED VALUE-BEARING WRAPPERS (strictly from committed receipt) ===
  const handleFeedDuck = useCallback(
    (duckId: string, comboMultiplier = 1, isCrit = false) => {
      const receipt = runCentralAction({ type: 'FEED_DUCK', duckId, comboMultiplier, isCrit });
      if (!receipt.ok) return null;
      return {
        burnedEnergy: Number(receipt.extra?.burnedEnergy ?? 0),
        tapSteps: Number(receipt.extra?.tapSteps ?? 1),
        leveledUp: Boolean(receipt.extra?.leveledUp),
      };
    },
    [runCentralAction]
  );

  const handleAutoMergeBoard = useCallback(() => {
    const receipt = runCentralAction({ type: 'AUTO_MERGE_BOARD' });
    return Number(receipt.extra?.mergesPerformed ?? 0);
  }, [runCentralAction]);

  const handleFlipCoin = useCallback(
    (packId: string): DuckSkinId | null => {
      const receipt = runCentralAction({ type: 'FLIP_COIN', packId });
      if (!receipt.ok) return null;
      return (receipt.extra?.pickedSkin as DuckSkinId) ?? null;
    },
    [runCentralAction]
  );

  const handleSpinWheel = useCallback(
    (mega: boolean): { segmentIndex: number; label: string; commitReward: () => void } | null => {
      const receipt = runCentralAction({ type: 'SPIN_WHEEL_PREPARE', mega }, { silentToast: true });
      if (!receipt.ok || receipt.extra?.segmentIndex === undefined) return null;
      const segmentIndex = Number(receipt.extra.segmentIndex);
      const label = String(receipt.extra.label ?? '');
      const bundle = receipt.extra.bundle as RewardBundle;
      let committed = false;
      return {
        segmentIndex,
        label,
        commitReward: () => {
          if (committed) return;
          committed = true;
          runCentralAction({ type: 'SPIN_WHEEL_COMMIT', bundle, label });
        },
      };
    },
    [runCentralAction]
  );

  const handleRedeemPromo = useCallback(
    (code: string): { ok: boolean; message: string } => {
      const receipt = runCentralAction({ type: 'REDEEM_PROMO', code }, { silentToast: true });
      return {
        ok: receipt.ok,
        message: receipt.message || (receipt.ok ? 'تم التفعيل بنجاح!' : 'تعذر تفعيل الرمز.'),
      };
    },
    [runCentralAction]
  );

  const handleSpendArenaEntry = useCallback(
    (cost: number): boolean => {
      const receipt = runCentralAction({ type: 'SPEND_ARENA_ENTRY', cost });
      return receipt.ok;
    },
    [runCentralAction]
  );

  const handleClaimBestTask = useCallback(() => {
    const receipt = runCentralAction({ type: 'CLAIM_BEST_TASK' });
    if (receipt.extra?.openTasksTab) {
      setActiveTab('TASKS');
    }
  }, [runCentralAction]);

  const claimableDailyCount = state.dailyTasks.filter(
    (t) => !t.claimed && t.progress >= t.target
  ).length;

  return {
    screen,
    setScreen,
    activeTab,
    setActiveTab,
    navigateToTab,
    openDragonAuctionFor,
    marketPreselect,
    godsInitialSubTab,
    setGodsInitialSubTab,
    modal,
    setModal,
    passInitialTab,
    setPassInitialTab,
    openPassModal,
    state,
    hasSave,
    toast,
    showToast,
    timedBonusReadyIn,
    extraChestReadyIn,
    blitzSecLeft,
    tgVerified,
    tgUserInfo,
    effectiveCurrentUid,
    isOnlineAuthed,
    leaderboardPlayers,
    liveAuctions,
    allianceDirectory,
    competitionParticipants,
    competitionMeta,
    feedChallenges,
    claimableDailyCount,
    runCentralAction,
    handleStartGame,
    // Dragons / Vault / Custom
    handleSelectDuck: (index: number) => runCentralAction({ type: 'SELECT_DUCK', index }),
    handleFeedDuck,
    handleStartBreeding: (duckId: string) => runCentralAction({ type: 'START_BREEDING', duckId }),
    handleUpgradeXlWithEggs: (duckId: string) => runCentralAction({ type: 'UPGRADE_XL_EGGS', duckId }),
    handleUpgradeStarCustomization: (duckId: string, steps = 1) =>
      runCentralAction({ type: 'UPGRADE_STAR_CUSTOMIZATION', duckId, steps }),
    handleUpgradeDuckSkill: (duckId: string) => runCentralAction({ type: 'UPGRADE_DUCK_SKILL', duckId }),
    handleTrainDragon: (duckId: string) => runCentralAction({ type: 'TRAIN_DRAGON', duckId }),
    handleUpgradeSquadTalent: (talentKey: SquadTalentKey) =>
      runCentralAction({ type: 'UPGRADE_SQUAD_TALENT', talentKey }),
    handleForgeRelic: (offerId: RelicForgeOffer['id']) =>
      runCentralAction({ type: 'FORGE_RELIC', offerId }),
    handleUnlockSlot: (slotIndex: number) => runCentralAction({ type: 'UNLOCK_DRAGON_SLOT', slotIndex }),
    handleAssignSlot: (duckId: string, slotIndex: number) =>
      runCentralAction({ type: 'ASSIGN_DRAGON_SLOT', duckId, slotIndex }),
    handleMergeDucks: (duckIds: string[]) => runCentralAction({ type: 'MERGE_DUCKS', duckIds }),
    handleCustomizeDuck: (duckId: string, gear: DuckGearId, aura: DuckAuraId) =>
      runCentralAction({ type: 'CUSTOMIZE_DUCK', duckId, gear, aura }),
    handleChangeDragonSkin: (duckId: string, skin: DuckSkinId) =>
      runCentralAction({ type: 'CHANGE_DRAGON_SKIN', duckId, skin }),
    handleClaimTimedBonus: () => runCentralAction({ type: 'CLAIM_TIMED_BONUS' }),
    handleClaimExtraChest: () => runCentralAction({ type: 'CLAIM_EXTRA_CHEST' }),
    handleClaimBestTask,
    // Eggs & Temple
    handleMergeCells: (fromIndex: number, toIndex: number) =>
      runCentralAction({ type: 'MERGE_CELLS', fromIndex, toIndex }),
    handleStartBlitz: () => runCentralAction({ type: 'START_BLITZ' }),
    handleAutoMergeBoard,
    handleUseHammerOnCell: (cellIndex: number) => runCentralAction({ type: 'USE_HAMMER_CELL', cellIndex }),
    handlePlaceQueuedEgg: (targetIndex?: number) =>
      runCentralAction({ type: 'PLACE_QUEUED_EGG', targetIndex }),
    handlePlaceAllQueuedEggs: () => runCentralAction({ type: 'PLACE_ALL_QUEUED_EGGS' }),
    handleSellGridItem: (cellIndex: number) => runCentralAction({ type: 'SELL_GRID_ITEM', cellIndex }),
    handleSellQueuedEgg: (queueIndex: number) => runCentralAction({ type: 'SELL_QUEUED_EGG', queueIndex }),
    handleDeliverToGod: (orderId: string, cellIndex?: number) =>
      runCentralAction({ type: 'DELIVER_TO_GOD', orderId, cellIndex }),
    handleOpenSnackChest: (cellIndex: number, earlyOpen?: boolean) =>
      runCentralAction({ type: 'OPEN_SNACK_CHEST', cellIndex, earlyOpen }),
    handleUnlockGridSlot: (cellIndex: number) => runCentralAction({ type: 'UNLOCK_GRID_SLOT', cellIndex }),
    // Arena
    handleSpendArenaEntry,
    handleRefundArenaEntry: (amount: number) =>
      runCentralAction({ type: 'REFUND_ARENA_ENTRY', amount }),
    handleBattleResult,
    handleRaceResult: (
      place: number,
      rewardCorn: number,
      rewardStars: number,
      leaguePts: number,
      xp: number
    ) =>
      runCentralAction(
        { type: 'RACE_RESULT', place, rewardCorn, rewardStars, leaguePts, xp },
        { silentToast: true }
      ),
    handleClaimDailyLeague: () => runCentralAction({ type: 'CLAIM_DAILY_LEAGUE' }),
    handleRotateWeekendEvent: () => runCentralAction({ type: 'ROTATE_WEEKEND_EVENT' }),
    // Alliance
    handleRefreshAlliances,
    handleCreateAlliance,
    handleJoinAllianceById,
    handleJoinAllianceByCode,
    handleLeavePack,
    handlePromoteDemoteMember,
    handleKickMember,
    handleTransferLeadership,
    handleUpdateAllianceIdentity,
    handleUpdateJoinConditions,
    handleRegenerateSecretCode,
    handleSendPackMessage,
    handleDonateAlliance,
    handleFundAllianceTech: (
      techId: AllianceTechId,
      mode: 'ENERGY_SMALL' | 'ENERGY_CONVOY' | 'POOL'
    ) => runCentralAction({ type: 'FUND_ALLIANCE_TECH', techId, mode }),
    handleConvertBlessingToResearch: (godId: string, targetTechId: AllianceTechId) =>
      runCentralAction({ type: 'CONVERT_BLESSING_TO_RESEARCH', godId, targetTechId }),
    handleStartAllianceResearch: (techId: AllianceTechId) =>
      runCentralAction({ type: 'START_ALLIANCE_RESEARCH', techId }),
    handleSpeedupAllianceResearch: (mode: 'FREE' | 'GOLD_6H' | 'GOLD_24H') =>
      runCentralAction({ type: 'SPEEDUP_ALLIANCE_RESEARCH', mode }),
    handleStartAllianceRally: (
      targetId: string,
      prepMinutes: number,
      selectedDragonIds?: string[]
    ) => runCentralAction({ type: 'START_ALLIANCE_RALLY', targetId, prepMinutes, selectedDragonIds }),
    handleDispatchDragonToRally: (dragonId: string) =>
      runCentralAction({ type: 'DISPATCH_DRAGON_TO_RALLY', dragonId }),
    handleReinforceRally: (mode: 'ALLY_CALL' | 'SELF_BOOST') =>
      runCentralAction({ type: 'REINFORCE_RALLY', mode }),
    handleSpeedupRally: (mode: 'ALLY_HELP' | 'RESOURCE_BOOST' | 'FAST_MARCH') =>
      runCentralAction({ type: 'SPEEDUP_RALLY', mode }),
    handleResolveAllianceRally: () => runCentralAction({ type: 'RESOLVE_ALLIANCE_RALLY' }),
    handleHarvestOccupiedSite: (targetId: string) =>
      runCentralAction({ type: 'HARVEST_OCCUPIED_SITE', targetId }),
    handleMarkNotificationRead: (notifId: string | 'ALL') =>
      runCentralAction({ type: 'MARK_NOTIFICATION_READ', notifId }, { silentToast: true }),
    handleSendQuickAllianceInvite: (
      text: string,
      actionSubTab: 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'ROSTER' = 'MAP',
      actionLabel = 'مشاركة فورية'
    ) =>
      runCentralAction({
        type: 'SEND_QUICK_ALLIANCE_INVITE',
        text,
        actionSubTab,
        actionLabel,
      }),
    handleDistributeAllianceDividends: () =>
      runCentralAction({ type: 'DISTRIBUTE_ALLIANCE_DIVIDENDS' }),
    handleHelpAllies: () => runCentralAction({ type: 'HELP_ALLIES' }),
    handleAllianceBreedSpeedup: () => runCentralAction({ type: 'ALLIANCE_BREED_SPEEDUP' }),
    handleAttackAllianceBoss,
    handleSupportCoopGoal: (coopId: AllianceCoopMissionMeta['id']) =>
      runCentralAction({ type: 'SUPPORT_COOP_GOAL', coopId }),
    handleClaimCoopGoal: (coopId: AllianceCoopMissionMeta['id']) =>
      runCentralAction({ type: 'CLAIM_COOP_GOAL', coopId }),
    handleDonateDragonToSwarm: (dragonId: string) =>
      runCentralAction({ type: 'DONATE_DRAGON_TO_SWARM', dragonId }),
    handleTrainSwarmDragon: () => runCentralAction({ type: 'TRAIN_SWARM_DRAGON' }),
    handleUpgradeSwarmDragonSkill: (key: SwarmDragonUpgradeKey) =>
      runCentralAction({ type: 'UPGRADE_SWARM_SKILL', key }),
    handleUpgradeSwarmDragonGear: (slot: SwarmDragonGearSlot) =>
      runCentralAction({ type: 'UPGRADE_SWARM_GEAR', slot }),
    handleSelectSwarmDragonSkin: (skin: DuckSkinId) =>
      runCentralAction({ type: 'SELECT_SWARM_SKIN', skin }, { silentToast: true }),
    handleClaimAllianceQuest: (questId: AllianceQuestMeta['id']) =>
      runCentralAction({ type: 'CLAIM_ALLIANCE_QUEST', questId }),
    handleClaimActivityChest: (threshold: number) =>
      runCentralAction({ type: 'CLAIM_ACTIVITY_CHEST', threshold }),
    handleClaimAllianceGift: (giftId: string) =>
      runCentralAction({ type: 'CLAIM_ALLIANCE_GIFT', giftId }),
    handleClaimAllAllianceGifts: () => runCentralAction({ type: 'CLAIM_ALL_ALLIANCE_GIFTS' }),
    handleBuyAllianceShopOffer: (offerId: AllianceShopOffer['id']) =>
      runCentralAction({ type: 'BUY_ALLIANCE_SHOP_OFFER', offerId }),
    handleActivateGod: (godId: string, payWith: 'gold' | 'stars') =>
      runCentralAction({ type: 'ACTIVATE_GOD', godId, payWith }),
    // Market & Auctions
    handleBuyStorePackage: (packageId: string) =>
      runCentralAction({ type: 'BUY_STORE_PACKAGE', packageId }),
    handleWatchRewardedAd: (kind: 'energy' | 'stars' | 'eggs') =>
      runCentralAction({ type: 'WATCH_REWARDED_AD', kind }),
    handleSellOwnDragon: (duckId: string, cornPrice: number) =>
      runCentralAction({ type: 'SELL_OWN_DRAGON', duckId, cornPrice }),
    handleBarterTrade: (tradeType: 'CORN_TO_STARS' | 'STARS_TO_CORN' | 'CORN_TO_GOLD') =>
      runCentralAction({ type: 'BARTER_TRADE', tradeType }),
    handleListDragonAuction,
    handleBidLiveAuction,
    handleBuyNowLiveAuction,
    handleCancelLiveAuction,
    handleClaimBuyerAuction,
    handleClaimSellerAuction,
    // Tasks, Trader, Passes, System
    handleBuyTraderDeal: () => runCentralAction({ type: 'BUY_TRADER_DEAL' }),
    handleClaimDailyTask: (taskId: string) => runCentralAction({ type: 'CLAIM_DAILY_TASK', taskId }),
    handleClaimDailyLevelReward: (rewardId: number, cornReward: number, eggsReward: number) =>
      runCentralAction({ type: 'CLAIM_DAILY_LEVEL_REWARD', rewardId, cornReward, eggsReward }),
    handleClaimDailyPassDay: () => runCentralAction({ type: 'CLAIM_DAILY_PASS_DAY' }),
    handleUnlockBattlePassPremium: () => runCentralAction({ type: 'UNLOCK_BATTLE_PASS_PREMIUM' }),
    handleClaimBattlePassReward: (level: number, track: 'FREE' | 'PREMIUM') =>
      runCentralAction({ type: 'CLAIM_BATTLE_PASS_REWARD', level, track }),
    handleClaimTournamentMilestone: (scoreThreshold: number) =>
      runCentralAction({ type: 'CLAIM_TOURNAMENT_MILESTONE', scoreThreshold }),
    handleClaimTreasureStep: (threshold: number, stepNumber: number) =>
      runCentralAction({ type: 'CLAIM_TREASURE_STEP', threshold, stepNumber }),
    handleClaimHonorPack: (packId: string) => runCentralAction({ type: 'CLAIM_HONOR_PACK', packId }),
    handleClaimAchievement: (id: string) => runCentralAction({ type: 'CLAIM_ACHIEVEMENT', id }),
    handleClaimHeartMilestone: (threshold: number) =>
      runCentralAction({ type: 'CLAIM_HEART_MILESTONE', threshold }),
    handleClaimSocial: (id: string) => runCentralAction({ type: 'CLAIM_SOCIAL', id }),
    handleInviteFriendSim: (premium = false) =>
      runCentralAction({ type: 'INVITE_FRIEND_SIM', premium }),
    handleInstantSummonDragon: (rarity: 'UNCOMMON' | 'RARE') =>
      runCentralAction({ type: 'INSTANT_SUMMON_DRAGON', rarity }),
    handleFlipCoin,
    handleSpinWheel,
    handleRedeemPromo,
    handleToggleWalletConnect: () =>
      runCentralAction({ type: 'TOGGLE_WALLET_CONNECT' }, { silentToast: true }),
    handleToggleMute: () => runCentralAction({ type: 'TOGGLE_MUTE' }, { silentToast: true }),
    handleToggleHaptics: () => runCentralAction({ type: 'TOGGLE_HAPTICS' }, { silentToast: true }),
    handleToggleDragonMotion: () =>
      runCentralAction({ type: 'TOGGLE_DRAGON_MOTION' }, { silentToast: true }),
  };
}
