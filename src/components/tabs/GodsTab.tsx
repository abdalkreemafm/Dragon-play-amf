import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Check,
  ChevronDown,
  Coins,
  Compass,
  Copy,
  Edit3,
  Flame,
  FlaskConical,
  Globe,
  KeyRound,
  Landmark,
  Lock,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  AllianceEmblemId,
  AllianceJoinConditions,
  AllianceMemberRole,
  AllianceTechId,
  AllianceVisibility,
  DuckSkinId,
  GameState,
  RealAllianceDirectoryItem,
  SquadTalentKey,
  SwarmDragonGearSlot,
  SwarmDragonUpgradeKey,
} from '../../types/game';
import {
  ALLIANCE_ACTIVITY_CHESTS,
  ALLIANCE_COOP_MISSIONS_CATALOG,
  ALLIANCE_DAILY_LIMITS,
  ALLIANCE_EMBLEM_CATALOG,
  ALLIANCE_MAP_TARGETS,
  ALLIANCE_QUESTS_CATALOG,
  ALLIANCE_RESEARCH_CATALOG,
  ALLIANCE_ROLE_META,
  AllianceCoopMissionMeta,
  AllianceDonationKind,
  AllianceQuestMeta,
  AllianceShopOffer,
  RelicForgeOffer,
  calculateAllianceDividendBreakdown,
  computeSwarmDragonTotalStats,
  createInitialAllianceLedger,
  createInitialAllianceLogs,
  createInitialAllianceNotifications,
  createInitialCoopProgress,
  createInitialJoinConditions,
  createInitialRewardPool,
  createInitialSwarmDragonState,
  createInitialTechFunding,
  createInitialTechLevels,
  getAllianceLevelInfo,
  getAllianceLevelPerks,
  getAllianceTechRequirements,
  getPlayerTier,
  getSwarmDragonLevelUpCost,
} from '../../utils/economyEngine';
import { TempleAltarBackdrop } from '../art/SceneBackdrops';
import { soundFX } from '../../utils/sound';
import { renderEmblemGlyph, SortedRosterMember } from './alliance/AllianceHelpers';
import { AllianceDirectoryPanel } from './alliance/AllianceDirectoryPanel';
import { AllianceHqPanel } from './alliance/AllianceHqPanel';
import { AllianceMapPanel } from './alliance/AllianceMapPanel';
import { AllianceResearchPanel } from './alliance/AllianceResearchPanel';
import { AllianceMissionsPanel } from './alliance/AllianceMissionsPanel';
import { AllianceShopPanel } from './alliance/AllianceShopPanel';
import { AllianceRosterPanel } from './alliance/AllianceRosterPanel';
import { AllianceModals } from './alliance/AllianceModals';

export type AllianceMainSubTab = 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'SHOP' | 'ROSTER';

interface GodsTabProps {
  state: GameState;
  initialSubTab?: 'TREASURES' | 'TASKS' | 'GODS' | 'SHOP';
  allianceDirectory?: RealAllianceDirectoryItem[];
  currentUid?: string | null;
  isOnlineAuthed?: boolean;
  onCreateAlliance?: (data: {
    packName: string;
    motto: string;
    emblemId: AllianceEmblemId;
    visibility?: AllianceVisibility;
    joinConditions: AllianceJoinConditions;
  }) => Promise<boolean | void> | void;
  onJoinAllianceById?: (allianceId: string, inviteCode?: string) => Promise<boolean | void> | void;
  onJoinAllianceByCode?: (inviteCode: string) => Promise<boolean | void> | void;
  onRefreshAlliances?: () => void;
  onJoinPack: () => void;
  onLeavePack: () => void;
  onUpdateJoinConditions: (cond: AllianceJoinConditions) => void;
  onDonatePack: (kind: AllianceDonationKind) => void;
  onHelpAllies: () => void;
  onAllianceBreedSpeedup: () => void;
  onAttackAllianceBoss: () => void;
  onSendPackMessage: (text: string) => void;
  onClaimAllianceQuest: (questId: AllianceQuestMeta['id']) => void;
  onClaimActivityChest: (threshold: number) => void;
  onClaimAllianceGift: (giftId: string) => void;
  onClaimAllAllianceGifts: () => void;
  onSupportCoopGoal: (coopId: AllianceCoopMissionMeta['id']) => void;
  onClaimCoopGoal: (coopId: AllianceCoopMissionMeta['id']) => void;
  onPromoteDemoteMember: (memberId: string, direction: 'UP' | 'DOWN') => void;
  onKickMember: (memberId: string) => void;
  onTransferLeadership?: (memberId: string) => void;
  onRecruitAllianceMember?: () => void;
  onUpdateAllianceIdentity: (
    name: string,
    motto: string,
    emblemId: AllianceEmblemId,
    visibility?: AllianceVisibility
  ) => void;
  onRegenerateSecretCode?: () => void;
  onFundAllianceTech: (techId: AllianceTechId, mode: 'ENERGY_SMALL' | 'ENERGY_CONVOY' | 'POOL') => void;
  onConvertBlessingToResearch: (godId: string, targetTechId: AllianceTechId) => void;
  onStartAllianceResearch: (techId: AllianceTechId) => void;
  onSpeedupAllianceResearch: (mode: 'FREE' | 'GOLD_6H' | 'GOLD_24H') => void;
  onStartAllianceRally: (targetId: string, prepMinutes: number, selectedDragonIds?: string[]) => void;
  onDispatchDragonToRally: (dragonId: string) => void;
  onReinforceRally: (mode: 'ALLY_CALL' | 'SELF_BOOST') => void;
  onSpeedupRally: (mode: 'ALLY_HELP' | 'RESOURCE_BOOST' | 'FAST_MARCH') => void;
  onResolveAllianceRally: () => void;
  onHarvestOccupiedSite: (targetId: string) => void;
  onMarkNotificationRead: (notifId: string | 'ALL') => void;
  onSendQuickAllianceInvite: (
    text: string,
    actionSubTab?: 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'ROSTER',
    actionLabel?: string
  ) => void;
  onDistributeAllianceDividends: () => void;
  onDonateDragonToSwarm: (dragonId: string) => void;
  onAllyDonateDragonToSwarm?: () => void;
  onTrainSwarmDragon: () => void;
  onUpgradeSwarmDragonSkill: (key: SwarmDragonUpgradeKey) => void;
  onUpgradeSwarmDragonGear: (slot: SwarmDragonGearSlot) => void;
  onSelectSwarmDragonSkin: (skin: DuckSkinId) => void;
  onBuyAllianceShopOffer: (offerId: AllianceShopOffer['id']) => void;
  onUpgradeSquadTalent: (talentKey: SquadTalentKey) => void;
  onForgeRelic: (offerId: RelicForgeOffer['id']) => void;
  onActivateGod: (godId: string, payWith: 'gold' | 'stars') => void;
  onClaimTreasureStep: (threshold: number, stepNumber: number) => void;
  onOpenExchangeGold: () => void;
}

function mapInitialSubTab(tab?: 'TREASURES' | 'TASKS' | 'GODS' | 'SHOP'): AllianceMainSubTab {
  if (tab === 'TASKS') return 'MISSIONS';
  if (tab === 'SHOP') return 'SHOP';
  if (tab === 'TREASURES') return 'ROSTER';
  return 'HQ';
}

export const GodsTab: React.FC<GodsTabProps> = ({
  state,
  initialSubTab = 'GODS',
  allianceDirectory = [],
  currentUid = null,
  isOnlineAuthed = false,
  onCreateAlliance,
  onJoinAllianceById,
  onJoinAllianceByCode,
  onRefreshAlliances,
  onJoinPack,
  onLeavePack,
  onUpdateJoinConditions,
  onDonatePack,
  onHelpAllies,
  onAllianceBreedSpeedup,
  onAttackAllianceBoss,
  onSendPackMessage,
  onClaimAllianceQuest,
  onClaimActivityChest,
  onClaimAllianceGift,
  onClaimAllAllianceGifts,
  onSupportCoopGoal,
  onClaimCoopGoal,
  onPromoteDemoteMember,
  onKickMember,
  onTransferLeadership,
  onUpdateAllianceIdentity,
  onRegenerateSecretCode,
  onFundAllianceTech,
  onConvertBlessingToResearch,
  onStartAllianceResearch,
  onSpeedupAllianceResearch,
  onStartAllianceRally,
  onDispatchDragonToRally,
  onReinforceRally,
  onSpeedupRally,
  onResolveAllianceRally,
  onHarvestOccupiedSite,
  onMarkNotificationRead,
  onSendQuickAllianceInvite,
  onDistributeAllianceDividends,
  onDonateDragonToSwarm,
  onTrainSwarmDragon,
  onUpgradeSwarmDragonSkill,
  onUpgradeSwarmDragonGear,
  onSelectSwarmDragonSkin,
  onBuyAllianceShopOffer,
  onUpgradeSquadTalent,
  onForgeRelic,
  onActivateGod,
  onClaimTreasureStep,
  onOpenExchangeGold,
}) => {
  const [subTab, setSubTab] = useState<AllianceMainSubTab>(mapInitialSubTab(initialSubTab));
  const [rosterSection, setRosterSection] = useState<'MEMBERS' | 'DIVIDENDS' | 'BLESSINGS'>(
    initialSubTab === 'TREASURES' ? 'BLESSINGS' : 'MEMBERS'
  );
  const [blessingTargetTech, setBlessingTargetTech] = useState<AllianceTechId>('tech_rally_capacity');

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showRallyDetailsModal, setShowRallyDetailsModal] = useState(false);
  const [showLevelPerksModal, setShowLevelPerksModal] = useState(false);
  const [showIdentityModal, setShowIdentityModal] = useState(false);

  const [draftName, setDraftName] = useState(state.pack.packName);
  const [draftMotto, setDraftMotto] = useState(
    state.pack.motto ?? 'وحدة التنانين تفتح أبواب المجد وعرش AMF'
  );
  const [draftEmblem, setDraftEmblem] = useState<AllianceEmblemId>(
    state.pack.emblemId ?? 'dragon_shield'
  );
  const [draftVisibility, setDraftVisibility] = useState<AllianceVisibility>(
    state.pack.visibility ?? 'PUBLIC'
  );
  const [draftConditions, setDraftConditions] = useState<AllianceJoinConditions>(
    () => state.pack.joinConditions ?? createInitialJoinConditions()
  );
  const [copiedCode, setCopiedCode] = useState(false);

  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    setSubTab(mapInitialSubTab(initialSubTab));
    if (initialSubTab === 'TREASURES') {
      setRosterSection('BLESSINGS');
    }
  }, [initialSubTab]);

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const pack = state.pack;
  const levelInfo = getAllianceLevelInfo(pack.xp ?? 12500);
  const currentEmblem =
    ALLIANCE_EMBLEM_CATALOG.find((e) => e.id === (pack.emblemId ?? 'dragon_shield')) ??
    ALLIANCE_EMBLEM_CATALOG[0];

  const playerTotalPower = useMemo(
    () => state.ducks.reduce((acc, d) => acc + (d.powerRating ?? 100), 0),
    [state.ducks]
  );
  const maxPlayerDragonLevel = useMemo(
    () => state.ducks.reduce((mx, d) => Math.max(mx, d.level), 1),
    [state.ducks]
  );

  const allianceCoins = pack.allianceCoins ?? 0;
  const activityPoints = pack.activityPoints ?? 0;
  const donationsToday = pack.donationsToday ?? 0;
  const helpsToday = pack.helpsToday ?? 0;
  const bossAttacksToday = pack.bossAttacksToday ?? 0;
  const bossLevel = pack.bossLevel ?? 4;
  const bossMaxHp = pack.bossMaxHp ?? 12500;
  const bossHp = pack.bossHp ?? bossMaxHp;
  const gifts = pack.gifts ?? [];
  const unclaimedGiftsCount = gifts.filter((g) => !g.claimed).length;
  const talents = pack.talents ?? { fury: 0, carapace: 0, incubation: 0, prestige: 0 };
  const buffs = state.activeBuffs ?? { duelFuryUntil: 0, critEdgeUntil: 0, eggSurgeUntil: 0 };
  const playerTier = getPlayerTier(state);

  const ledger = useMemo(
    () => ({ ...createInitialAllianceLedger(), ...(pack.ledger ?? {}) }),
    [pack.ledger]
  );
  const techLevels = useMemo(
    () => ({ ...createInitialTechLevels(), ...(pack.techLevels ?? {}) }),
    [pack.techLevels]
  );
  const techFunding = useMemo(
    () => ({ ...createInitialTechFunding(), ...(pack.techFunding ?? {}) }),
    [pack.techFunding]
  );
  const activeResearch = pack.activeResearch ?? null;
  const activeRally = pack.activeRally ?? null;
  const occupiedSites = pack.occupiedSites ?? [];
  const mapCooldowns = pack.mapCooldowns ?? {};
  const convertedBlessingIds = useMemo(
    () => new Set(pack.convertedBlessingIds ?? []),
    [pack.convertedBlessingIds]
  );

  const swarmDragon = useMemo(
    () => pack.swarmDragon ?? createInitialSwarmDragonState(),
    [pack.swarmDragon]
  );
  const swarmStats = useMemo(() => computeSwarmDragonTotalStats(swarmDragon), [swarmDragon]);
  const swarmLvCost = useMemo(
    () => getSwarmDragonLevelUpCost(swarmDragon.level),
    [swarmDragon.level]
  );

  const notifications = useMemo(
    () =>
      pack.notifications && pack.notifications.length > 0
        ? pack.notifications
        : createInitialAllianceNotifications(),
    [pack.notifications]
  );
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const rewardPool = useMemo(
    () => ({ ...createInitialRewardPool(), ...(pack.rewardPool ?? {}) }),
    [pack.rewardPool]
  );
  const dividendBreakdown = useMemo(
    () => calculateAllianceDividendBreakdown(state, playerTotalPower),
    [state, playerTotalPower]
  );
  const dividendCdLeftMs = Math.max(
    0,
    (pack.lastDividendAt ?? 0) + ALLIANCE_DAILY_LIMITS.DIVIDEND_COOLDOWN_MS - nowTs
  );
  const dividendReady = dividendCdLeftMs === 0;

  const allianceLogs = useMemo(
    () => (pack.logs && pack.logs.length > 0 ? pack.logs : createInitialAllianceLogs()),
    [pack.logs]
  );

  const coopProgressMap = useMemo(() => {
    const base = { ...createInitialCoopProgress(), ...(pack.coopProgress ?? {}) };
    base.coop_treasury = Math.max(pack.treasuryCorn, base.coop_treasury ?? 125000);
    return base;
  }, [pack.coopProgress, pack.treasuryCorn]);

  const realMembers = useMemo(() => pack.realMembers ?? [], [pack.realMembers]);
  const selfRealRole = useMemo<AllianceMemberRole>(() => {
    if (!pack.joined) return 'MEMBER';
    const found = realMembers.find((m) => currentUid && m.publicId === currentUid);
    if (found) return found.role;
    if (pack.leaderPublicId && currentUid && pack.leaderPublicId === currentUid) {
      return 'LEADER';
    }
    if (currentUid && pack.memberRoles?.[currentUid]) {
      return pack.memberRoles[currentUid];
    }
    return 'MEMBER';
  }, [currentUid, pack.joined, pack.leaderPublicId, pack.memberRoles, realMembers]);
  const isLeader = selfRealRole === 'LEADER';
  const canManageMembers = selfRealRole === 'LEADER' || selfRealRole === 'DEPUTY';

  const leaderName = useMemo(() => {
    if (pack.leaderName) return pack.leaderName;
    const realLeader = realMembers.find((m) => m.role === 'LEADER');
    if (realLeader) return realLeader.displayName;
    if (pack.joined && selfRealRole === 'LEADER') return state.username;
    return 'بدون قائد';
  }, [pack.joined, pack.leaderName, realMembers, selfRealRole, state.username]);

  const onlineMembersCount = useMemo(() => {
    if (!pack.joined) return 0;
    if (realMembers.length > 0) {
      const online = realMembers.filter(
        (m) => m.online || Boolean(currentUid && m.publicId === currentUid)
      ).length;
      return Math.max(1, online);
    }
    return 1;
  }, [currentUid, pack.joined, realMembers]);

  const activeBreedingCount = state.ducks.filter(
    (d) => d.breedingEndsAt && d.breedingEndsAt > nowTs
  ).length;
  const breedHelpCooldownLeftMs = Math.max(
    0,
    (pack.lastBreedHelpAt ?? 0) + ALLIANCE_DAILY_LIMITS.BREEDING_HELP_COOLDOWN_MS - nowTs
  );
  const canUseBreedHelp = activeBreedingCount > 0 && breedHelpCooldownLeftMs === 0;

  const questProgressMap = useMemo(() => {
    const base = pack.questBaselines ?? { feeds: 0, merges: 0, errands: 0 };
    return {
      aq_feed: Math.max(0, state.stats.totalFeeds - base.feeds),
      aq_merge: Math.max(0, state.stats.totalMerges - base.merges),
      aq_errands: Math.max(0, state.stats.totalErrands - base.errands),
      aq_donate: donationsToday,
      aq_boss: bossAttacksToday,
    };
  }, [
    bossAttacksToday,
    donationsToday,
    pack.questBaselines,
    state.stats.totalErrands,
    state.stats.totalFeeds,
    state.stats.totalMerges,
  ]);

  const readyQuestsCount = ALLIANCE_QUESTS_CATALOG.filter(
    (q) =>
      questProgressMap[q.id] >= q.target &&
      !(pack.claimedAllianceQuests ?? []).includes(q.id)
  ).length;

  const readyCoopCount = ALLIANCE_COOP_MISSIONS_CATALOG.filter(
    (g) =>
      (coopProgressMap[g.id] ?? g.initialSeed) >= g.target &&
      !(pack.claimedCoopGoals ?? []).includes(g.id)
  ).length;

  const readyActivityChestsCount = ALLIANCE_ACTIVITY_CHESTS.filter(
    (c) => activityPoints >= c.threshold && !(pack.claimedActivityChests ?? []).includes(c.threshold)
  ).length;

  const missionsBadge =
    readyQuestsCount + readyCoopCount + readyActivityChestsCount + unclaimedGiftsCount;

  const readyResearchCount = ALLIANCE_RESEARCH_CATALOG.filter((t) => {
    const lv = techLevels[t.id] ?? 0;
    if (lv >= t.maxLevel || activeResearch) return false;
    const req = getAllianceTechRequirements(t.id, lv, techLevels.tech_march_speed ?? 0);
    return (
      (techFunding[t.id] ?? 0) >= req.requiredTechPoints &&
      pack.treasuryCorn >= req.requiredVaultCorn &&
      ledger.vaultGold >= req.requiredVaultGold
    );
  }).length;

  const rallyBadge = activeRally ? 1 : 0;

  const estimatedBossDmg = Math.max(
    420,
    Math.round(playerTotalPower * 0.95 + (talents.fury ?? 0) * 95)
  );

  const treasurePoints = state.tournament.score + state.stats.totalErrands * 5;

  const sortedRoster: SortedRosterMember[] = useMemo(() => {
    if (realMembers.length > 0) {
      return realMembers
        .map((m) => {
          const isSelf = Boolean(currentUid && m.publicId === currentUid);
          const roleMeta = ALLIANCE_ROLE_META[m.role] ?? ALLIANCE_ROLE_META.MEMBER;
          return {
            id: m.publicId,
            name: isSelf ? `${m.displayName} (أنت)` : m.displayName,
            role: m.role,
            rank: roleMeta.rankCode,
            titleAr: roleMeta.labelAr,
            power: isSelf ? playerTotalPower : m.powerRating,
            weeklyContrib: isSelf ? (pack.contributionTotal ?? 0) : m.donatedEnergy,
            donatedEnergy: isSelf ? Math.max(ledger.playerEnergyDonated, m.donatedEnergy) : m.donatedEnergy,
            donatedTech: isSelf ? Math.max(ledger.playerTechDonated, m.donatedTech) : m.donatedTech,
            rallyScore: m.rallyScore,
            dailyActivity: isSelf ? activityPoints : m.dailyActivity,
            lastSeenAr: isSelf ? 'متصل الآن' : m.lastSeenAr,
            online: isSelf ? true : m.online,
            isSelf,
          };
        })
        .sort((a, b) => b.power - a.power);
    }

    if (!pack.joined) return [];
    const selfRoleMeta = ALLIANCE_ROLE_META[selfRealRole] ?? ALLIANCE_ROLE_META.MEMBER;
    return [
      {
        id: currentUid || 'player_self',
        name: `${state.username} (أنت)`,
        role: selfRealRole,
        rank: selfRoleMeta.rankCode,
        titleAr: selfRoleMeta.labelAr,
        power: playerTotalPower,
        weeklyContrib: pack.contributionTotal ?? 0,
        donatedEnergy: ledger.playerEnergyDonated,
        donatedTech: ledger.playerTechDonated,
        rallyScore: ledger.playerRallyContrib,
        dailyActivity: activityPoints,
        lastSeenAr: 'متصل الآن',
        online: true,
        isSelf: true,
      },
    ];
  }, [
    activityPoints,
    currentUid,
    ledger.playerEnergyDonated,
    ledger.playerRallyContrib,
    ledger.playerTechDonated,
    pack.contributionTotal,
    pack.joined,
    playerTotalPower,
    realMembers,
    selfRealRole,
    state.username,
  ]);

  const rallyCapLv = techLevels.tech_rally_capacity ?? 0;
  const siegeLv = techLevels.tech_pyramid_siege ?? 0;
  const phalanxLv = techLevels.tech_dragon_phalanx ?? 0;
  const rallyPowerBonusPct = rallyCapLv * 8 + siegeLv * 12 + levelInfo.powerBonusPct;
  const activeRallyRawPower = activeRally
    ? activeRally.participants.reduce((a, b) => a + b.power, 0)
    : 0;
  const activeRallyEffectivePower = Math.round(
    activeRallyRawPower * (1 + rallyPowerBonusPct / 100)
  );
  const activeRallyTotalDragons = activeRally
    ? activeRally.participants.reduce((a, b) => a + (b.dragons?.length ?? b.dragonsCount), 0)
    : 0;
  const activeTargetMeta = activeRally
    ? ALLIANCE_MAP_TARGETS.find((t) => t.id === activeRally.targetId) ?? ALLIANCE_MAP_TARGETS[0]
    : null;
  const activeMarchTotalMs = activeRally
    ? Math.max(1000, activeRally.marchEndsAt - activeRally.startedAt)
    : 1000;
  const activeMarchLeftMs = activeRally ? Math.max(0, activeRally.marchEndsAt - nowTs) : 0;
  const activeMarchPct = activeRally
    ? activeRally.status === 'READY' || activeMarchLeftMs === 0
      ? 100
      : Math.min(
          99,
          Math.max(4, Math.round(((activeMarchTotalMs - activeMarchLeftMs) / activeMarchTotalMs) * 100))
        )
    : 0;

  const openIdentityEditor = () => {
    if (!canManageMembers) return;
    setDraftName(pack.packName);
    setDraftMotto(pack.motto ?? 'وحدة التنانين تفتح أبواب المجد وعرش AMF');
    setDraftEmblem(pack.emblemId ?? 'dragon_shield');
    setDraftVisibility(pack.visibility ?? 'PUBLIC');
    setDraftConditions(pack.joinConditions ?? createInitialJoinConditions());
    setShowIdentityModal(true);
  };

  const allLevelPerks = useMemo(
    () =>
      Array.from({ length: ALLIANCE_DAILY_LIMITS.MAX_ALLIANCE_LEVEL }, (_, i) =>
        getAllianceLevelPerks(i + 1)
      ),
    []
  );

  return (
    <div className="h-full w-full overflow-y-auto overscroll-y-contain touch-pan-y select-none">
      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-3 pb-8 space-y-3">
        {/* 1. Alliance Banner Header */}
        <section className="relative rounded-3xl p-3 sm:p-4 border border-amber-500/35 bg-gradient-to-b from-[#1f192d] via-[#171a26] to-[#131620] shadow-2xl overflow-hidden">
          <TempleAltarBackdrop className="opacity-30" />
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  disabled={!pack.joined || !canManageMembers}
                  onClick={() => {
                    if (!pack.joined || !canManageMembers) return;
                    soundFX.playTabSwitch();
                    openIdentityEditor();
                  }}
                  title={
                    isLeader
                      ? 'تخصيص اسم وشعار وإعدادات السرب'
                      : canManageMembers
                        ? 'تعديل شروط الانضمام'
                        : 'شعار السرب'
                  }
                  className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${currentEmblem.bgGradient} border ${currentEmblem.borderClass} flex items-center justify-center shrink-0 shadow-lg transition-transform ${
                    pack.joined && canManageMembers
                      ? 'hover:scale-105 cursor-pointer'
                      : 'cursor-default'
                  }`}
                >
                  {renderEmblemGlyph(currentEmblem.id, `w-6 h-6 ${currentEmblem.iconColorClass}`)}
                  {pack.joined && canManageMembers && (
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-slate-950 border border-amber-400/70 flex items-center justify-center">
                      {isLeader ? (
                        <Edit3 className="w-2.5 h-2.5 text-amber-300" />
                      ) : (
                        <Settings className="w-2.5 h-2.5 text-amber-300" />
                      )}
                    </span>
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {pack.joined && canManageMembers ? (
                      <button
                        type="button"
                        onClick={() => openIdentityEditor()}
                        className="font-display text-base sm:text-lg font-black text-white truncate hover:text-amber-300 transition-colors cursor-pointer text-right"
                      >
                        {pack.packName}
                      </button>
                    ) : (
                      <span className="font-display text-base sm:text-lg font-black text-white truncate text-right">
                        {pack.joined ? pack.packName : 'تحالفات وأسراب اللاعبين'}
                      </span>
                    )}

                    {pack.joined && (
                      <button
                        onClick={() => {
                          soundFX.playTabSwitch();
                          setShowLevelPerksModal(true);
                        }}
                        title="عرض مزايا مستويات السرب"
                        className="px-2 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400/60 hover:bg-amber-400/35 text-[10px] font-black text-amber-300 font-mono-num flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Lv.{levelInfo.level}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    )}

                    {pack.joined && (
                      <span
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${
                          (ALLIANCE_ROLE_META[selfRealRole] ?? ALLIANCE_ROLE_META.MEMBER).badgeClass
                        }`}
                      >
                        {selfRealRole === 'LEADER'
                          ? `👑 القائد: ${state.username}`
                          : `${(ALLIANCE_ROLE_META[selfRealRole] ?? ALLIANCE_ROLE_META.MEMBER).rankCode} · ${
                              (ALLIANCE_ROLE_META[selfRealRole] ?? ALLIANCE_ROLE_META.MEMBER).labelAr
                            }`}
                      </span>
                    )}

                    {pack.joined && (
                      <span
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-black flex items-center gap-1 ${
                          pack.visibility === 'SECRET'
                            ? 'bg-purple-500/20 border-purple-400/55 text-purple-200'
                            : 'bg-sky-500/15 border-sky-400/45 text-sky-200'
                        }`}
                      >
                        {pack.visibility === 'SECRET' ? (
                          <>
                            <Lock className="w-2.5 h-2.5" />
                            <span>سرب سري</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-2.5 h-2.5" />
                            <span>سرب عام</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  {pack.joined && (
                    <p className="text-[10.5px] text-slate-300 truncate mt-0.5">
                      👑 القائد: <strong className="text-amber-300">{leaderName}</strong> ·{' '}
                      {pack.motto ?? 'وحدة التنانين'}
                    </p>
                  )}
                  {pack.joined && pack.inviteCode && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playTapFeed();
                          navigator.clipboard?.writeText(pack.inviteCode || '').catch(() => {});
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 1800);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-950/90 border border-amber-400/40 hover:border-amber-400 text-[10px] font-mono-num font-black text-amber-200 flex items-center gap-1 cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3 text-amber-400" />
                        <span>رمز السرب: {pack.inviteCode}</span>
                        {copiedCode ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {pack.joined && (
                  <button
                    onClick={() => {
                      soundFX.playTabSwitch();
                      setShowNotifModal(true);
                    }}
                    title="تنبيهات السرب الذكية"
                    className={`relative w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                      unreadNotifCount > 0
                        ? 'bg-amber-400/20 border-amber-400/65 text-amber-300'
                        : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <BellRing className={`w-4 h-4 ${unreadNotifCount > 0 ? 'animate-pulse' : ''}`} />
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-mono-num text-[9px] font-black flex items-center justify-center">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>
                )}

                <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-amber-400/40 text-left">
                  <div className="text-[9px] text-slate-400 font-bold">عملة السرب</div>
                  <div className="font-mono-num text-sm font-black text-amber-300 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>{allianceCoins.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono-num text-slate-300">
                <button
                  onClick={() => setShowLevelPerksModal(true)}
                  className="text-amber-200 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>
                    مزايا المستوى: قوة +{levelInfo.powerBonusPct}% · غنائم +
                    {levelInfo.levelLootBonusPct}%
                  </span>
                </button>
                <span className="text-amber-300 font-bold">
                  {levelInfo.currentXp.toLocaleString()}/{levelInfo.nextXp.toLocaleString()} XP
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-950/90 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all"
                  style={{ width: `${levelInfo.pct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="rounded-xl bg-slate-950/75 border border-slate-800 py-1.5 px-1">
                <div className="text-[9px] text-slate-400">قوة السرب</div>
                <div className="font-mono-num text-xs font-black text-rose-300">
                  {pack.power.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/75 border border-slate-800 py-1.5 px-1">
                <div className="text-[9px] text-slate-400">الأعضاء</div>
                <div className="font-mono-num text-xs font-black text-sky-300">
                  {pack.members}/{levelInfo.maxMembers}
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/75 border border-slate-800 py-1.5 px-1">
                <div className="text-[9px] text-slate-400">خزينة الطعام</div>
                <div className="font-mono-num text-xs font-black text-emerald-300">
                  {pack.treasuryCorn.toLocaleString()}🍖
                </div>
              </div>
              <div className="rounded-xl bg-slate-950/75 border border-slate-800 py-1.5 px-1">
                <div className="text-[9px] text-slate-400">المتصلون الآن</div>
                <div className="font-mono-num text-xs font-black text-amber-300">
                  {onlineMembersCount}/{pack.members}
                </div>
              </div>
            </div>
          </div>
        </section>

        {!pack.joined ? (
          <AllianceDirectoryPanel
            state={state}
            allianceDirectory={allianceDirectory}
            isOnlineAuthed={isOnlineAuthed}
            playerTotalPower={playerTotalPower}
            maxPlayerDragonLevel={maxPlayerDragonLevel}
            onCreateAlliance={onCreateAlliance}
            onJoinAllianceById={onJoinAllianceById}
            onJoinAllianceByCode={onJoinAllianceByCode}
            onRefreshAlliances={onRefreshAlliances}
            onJoinPack={onJoinPack}
          />
        ) : (
          <>
            {unreadNotifCount > 0 && (
              <button
                onClick={() => {
                  soundFX.playTabSwitch();
                  setShowNotifModal(true);
                }}
                className="w-full rounded-2xl bg-amber-400/12 border border-amber-400/45 px-3 py-2 flex items-center justify-between gap-2 text-right hover:bg-amber-400/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BellRing className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
                  <span className="text-[11px] font-black text-amber-200 truncate">
                    {notifications.find((n) => !n.read)?.titleAr} —{' '}
                    {notifications.find((n) => !n.read)?.bodyAr}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black shrink-0">
                  عرض ({unreadNotifCount})
                </span>
              </button>
            )}

            {/* 6-Tab Nav */}
            <nav className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 rounded-2xl bg-[#161923] border border-slate-800">
              {([
                { id: 'HQ', label: 'المقر والشات', icon: Landmark, badge: 0 },
                { id: 'MAP', label: 'الخريطة والحشد', icon: Compass, badge: rallyBadge },
                { id: 'RESEARCH', label: 'الأبحاث', icon: FlaskConical, badge: readyResearchCount },
                { id: 'MISSIONS', label: 'تنين السرب', icon: Flame, badge: missionsBadge },
                { id: 'SHOP', label: 'المتجر والمواهب', icon: ShoppingBag, badge: 0 },
                { id: 'ROSTER', label: 'الأعضاء والأرباح', icon: Users, badge: dividendReady ? 1 : 0 },
              ] as const).map((tab) => {
                const active = subTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      soundFX.playTabSwitch();
                      setSubTab(tab.id);
                    }}
                    className={`relative min-h-[42px] px-1.5 py-1.5 rounded-xl text-[10.5px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      active
                        ? 'bg-slate-800 text-amber-300 border border-amber-400/50 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                    {tab.badge > 0 && (
                      <span className="min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-slate-950 font-mono-num text-[9px] font-black flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {subTab === 'HQ' && (
              <AllianceHqPanel
                state={state}
                ledger={ledger}
                rewardPool={rewardPool}
                activeRally={activeRally}
                allianceLogs={allianceLogs}
                donationsToday={donationsToday}
                helpsToday={helpsToday}
                bossAttacksToday={bossAttacksToday}
                bossLevel={bossLevel}
                bossMaxHp={bossMaxHp}
                bossHp={bossHp}
                activeBreedingCount={activeBreedingCount}
                canUseBreedHelp={canUseBreedHelp}
                breedHelpCooldownLeftMs={breedHelpCooldownLeftMs}
                estimatedBossDmg={estimatedBossDmg}
                onlineMembersCount={onlineMembersCount}
                onDonatePack={onDonatePack}
                onHelpAllies={onHelpAllies}
                onAllianceBreedSpeedup={onAllianceBreedSpeedup}
                onAttackAllianceBoss={onAttackAllianceBoss}
                onSendPackMessage={onSendPackMessage}
                onSendQuickAllianceInvite={onSendQuickAllianceInvite}
                onNavigateSubTab={(
                  tab: AllianceMainSubTab,
                  rosterSec?: 'MEMBERS' | 'DIVIDENDS' | 'BLESSINGS'
                ) => {
                  setSubTab(tab);
                  if (tab === 'ROSTER' && rosterSec) {
                    setRosterSection(rosterSec);
                  }
                }}
              />
            )}

            {subTab === 'MAP' && (
              <AllianceMapPanel
                state={state}
                nowTs={nowTs}
                currentEmblemId={currentEmblem.id}
                techLevels={techLevels}
                activeRally={activeRally}
                activeTargetMeta={activeTargetMeta}
                activeRallyEffectivePower={activeRallyEffectivePower}
                activeRallyTotalDragons={activeRallyTotalDragons}
                activeMarchLeftMs={activeMarchLeftMs}
                activeMarchPct={activeMarchPct}
                occupiedSites={occupiedSites}
                mapCooldowns={mapCooldowns}
                phalanxLv={phalanxLv}
                onStartAllianceRally={onStartAllianceRally}
                onReinforceRally={onReinforceRally}
                onSpeedupRally={onSpeedupRally}
                onResolveAllianceRally={onResolveAllianceRally}
                onHarvestOccupiedSite={onHarvestOccupiedSite}
                onOpenRallyDetails={() => setShowRallyDetailsModal(true)}
              />
            )}

            {subTab === 'RESEARCH' && (
              <AllianceResearchPanel
                state={state}
                nowTs={nowTs}
                ledger={ledger}
                techLevels={techLevels}
                techFunding={techFunding}
                activeResearch={activeResearch}
                convertedBlessingIds={convertedBlessingIds}
                blessingTargetTech={blessingTargetTech}
                setBlessingTargetTech={setBlessingTargetTech}
                onFundAllianceTech={onFundAllianceTech}
                onConvertBlessingToResearch={onConvertBlessingToResearch}
                onStartAllianceResearch={onStartAllianceResearch}
                onSpeedupAllianceResearch={onSpeedupAllianceResearch}
                onSendQuickAllianceInvite={onSendQuickAllianceInvite}
                onGoToBlessings={() => {
                  setSubTab('ROSTER');
                  setRosterSection('BLESSINGS');
                }}
              />
            )}

            {subTab === 'MISSIONS' && (
              <AllianceMissionsPanel
                state={state}
                swarmDragon={swarmDragon}
                swarmStats={swarmStats}
                swarmLvCost={swarmLvCost}
                allianceCoins={allianceCoins}
                activityPoints={activityPoints}
                gifts={gifts}
                unclaimedGiftsCount={unclaimedGiftsCount}
                coopProgressMap={coopProgressMap}
                questProgressMap={questProgressMap}
                missionsBadge={missionsBadge}
                onDonateDragonToSwarm={onDonateDragonToSwarm}
                onTrainSwarmDragon={onTrainSwarmDragon}
                onUpgradeSwarmDragonSkill={onUpgradeSwarmDragonSkill}
                onUpgradeSwarmDragonGear={onUpgradeSwarmDragonGear}
                onSelectSwarmDragonSkin={onSelectSwarmDragonSkin}
                onClaimAllianceQuest={onClaimAllianceQuest}
                onClaimActivityChest={onClaimActivityChest}
                onClaimAllianceGift={onClaimAllianceGift}
                onClaimAllAllianceGifts={onClaimAllAllianceGifts}
                onSupportCoopGoal={onSupportCoopGoal}
                onClaimCoopGoal={onClaimCoopGoal}
              />
            )}

            {subTab === 'SHOP' && (
              <AllianceShopPanel
                state={state}
                nowTs={nowTs}
                playerTier={playerTier}
                allianceCoins={allianceCoins}
                talents={talents}
                buffs={buffs}
                onBuyAllianceShopOffer={onBuyAllianceShopOffer}
                onUpgradeSquadTalent={onUpgradeSquadTalent}
                onForgeRelic={onForgeRelic}
              />
            )}

            {subTab === 'ROSTER' && (
              <AllianceRosterPanel
                state={state}
                currentUid={currentUid}
                rosterSection={rosterSection}
                setRosterSection={setRosterSection}
                sortedRoster={sortedRoster}
                selfRealRole={selfRealRole}
                leaderName={leaderName}
                canManageMembers={canManageMembers}
                dividendBreakdown={dividendBreakdown}
                dividendReady={dividendReady}
                dividendCdLeftMs={dividendCdLeftMs}
                treasurePoints={treasurePoints}
                convertedBlessingIds={convertedBlessingIds}
                blessingTargetTech={blessingTargetTech}
                onLeavePack={onLeavePack}
                onPromoteDemoteMember={onPromoteDemoteMember}
                onKickMember={onKickMember}
                onTransferLeadership={onTransferLeadership}
                onRegenerateSecretCode={onRegenerateSecretCode}
                onSendQuickAllianceInvite={onSendQuickAllianceInvite}
                onDistributeAllianceDividends={onDistributeAllianceDividends}
                onClaimTreasureStep={onClaimTreasureStep}
                onConvertBlessingToResearch={onConvertBlessingToResearch}
                onActivateGod={onActivateGod}
                onOpenExchangeGold={onOpenExchangeGold}
              />
            )}
          </>
        )}
      </div>

      <AllianceModals
        state={state}
        selfRealRole={selfRealRole}
        activeRally={activeRally}
        activeRallyEffectivePower={activeRallyEffectivePower}
        activeMarchPct={activeMarchPct}
        activeMarchLeftMs={activeMarchLeftMs}
        levelInfo={levelInfo}
        allLevelPerks={allLevelPerks}
        notifications={notifications}
        unreadNotifCount={unreadNotifCount}
        showRallyDetailsModal={showRallyDetailsModal}
        setShowRallyDetailsModal={setShowRallyDetailsModal}
        showLevelPerksModal={showLevelPerksModal}
        setShowLevelPerksModal={setShowLevelPerksModal}
        showIdentityModal={showIdentityModal}
        setShowIdentityModal={setShowIdentityModal}
        showNotifModal={showNotifModal}
        setShowNotifModal={setShowNotifModal}
        draftName={draftName}
        setDraftName={setDraftName}
        draftMotto={draftMotto}
        setDraftMotto={setDraftMotto}
        draftEmblem={draftEmblem}
        setDraftEmblem={setDraftEmblem}
        draftVisibility={draftVisibility}
        setDraftVisibility={setDraftVisibility}
        draftConditions={draftConditions}
        setDraftConditions={setDraftConditions}
        onSpeedupRally={onSpeedupRally}
        onResolveAllianceRally={onResolveAllianceRally}
        onReinforceRally={onReinforceRally}
        onDispatchDragonToRally={onDispatchDragonToRally}
        onSendQuickAllianceInvite={onSendQuickAllianceInvite}
        onUpdateAllianceIdentity={onUpdateAllianceIdentity}
        onUpdateJoinConditions={onUpdateJoinConditions}
        onRegenerateSecretCode={onRegenerateSecretCode}
        onLeavePack={onLeavePack}
        onMarkNotificationRead={onMarkNotificationRead}
        onNavigateSubTab={(
          tab: AllianceMainSubTab,
          rosterSec?: 'MEMBERS' | 'DIVIDENDS' | 'BLESSINGS'
        ) => {
          setSubTab(tab);
          if (tab === 'ROSTER' && rosterSec) {
            setRosterSection(rosterSec);
          }
        }}
      />
    </div>
  );
};
