import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  BellRing,
  Calculator,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Crown,
  Edit3,
  Flag,
  Flame,
  FlaskConical,
  Gift,
  Hammer,
  HeartHandshake,
  Landmark,
  Lock,
  LogOut,
  MapPin,
  Megaphone,
  Network,
  PieChart,
  Radio,
  Rocket,
  ScrollText,
  Send,
  Shield,
  ShoppingBag,
  Skull,
  Sparkles,
  Sliders,
  Swords,
  Trophy,
  Unlock,
  UserMinus,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  AllianceEmblemId,
  AllianceJoinConditions,
  AllianceLogType,
  AllianceMemberRole,
  AllianceTechId,
  DuckSkinId,
  GameState,
  SquadTalentKey,
  SwarmDragonGearSlot,
  SwarmDragonUpgradeKey,
} from '../../types/game';
import {
  ACTIVE_SEASON,
  DUCK_AURA_CATALOG,
  DUCK_GEAR_CATALOG,
  RARITY_STYLE,
  TREASURE_RACE_STEPS,
} from '../../data/gameData';
import {
  ALLIANCE_ACTIVITY_CHESTS,
  ALLIANCE_BLESSING_RESEARCH_MISSIONS,
  ALLIANCE_COOP_MISSIONS_CATALOG,
  ALLIANCE_DAILY_LIMITS,
  ALLIANCE_DONATION_TIERS,
  ALLIANCE_EMBLEM_CATALOG,
  ALLIANCE_MAP_TARGETS,
  ALLIANCE_QUESTS_CATALOG,
  ALLIANCE_RALLY_PREP_OPTIONS,
  ALLIANCE_RESEARCH_CATALOG,
  ALLIANCE_ROLE_META,
  ALLIANCE_ROSTER_MEMBERS,
  ALLIANCE_SHOP_CATALOG,
  AllianceCoopMissionMeta,
  AllianceDonationKind,
  AllianceQuestMeta,
  AllianceShopOffer,
  ECONOMY_LIMITS,
  RELIC_FORGE_CATALOG,
  RelicForgeOffer,
  SQUAD_TALENT_CATALOG,
  SWARM_DRAGON_GEAR_CATALOG,
  SWARM_DRAGON_UPGRADE_CATALOG,
  calculateAllianceDividendBreakdown,
  computeSwarmDragonTotalStats,
  createInitialAllianceLedger,
  createInitialAllianceLogs,
  createInitialAllianceNotifications,
  createInitialCoopProgress,
  createInitialJoinConditions,
  createInitialMemberRoles,
  createInitialRewardPool,
  createInitialSwarmDragonState,
  createInitialTechFunding,
  createInitialTechLevels,
  extractDragonTransferStats,
  formatDurationAr,
  getAllianceLevelInfo,
  getAllianceLevelPerks,
  getAllianceRankMeta,
  getAllianceTechRequirements,
  getPlayerTier,
  getSquadTalentCost,
  getSwarmDragonGearUpgradeCost,
  getSwarmDragonLevelUpCost,
  getSwarmDragonUpgradeCost,
} from '../../utils/economyEngine';
import { DragonIllustration, GodIllustration, GoldIcon, StarIcon } from '../art/DuckArt';
import { TempleAltarBackdrop } from '../art/SceneBackdrops';
import { soundFX } from '../../utils/sound';

export type AllianceMainSubTab = 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'SHOP' | 'ROSTER';

interface GodsTabProps {
  state: GameState;
  initialSubTab?: 'TREASURES' | 'TASKS' | 'GODS' | 'SHOP';
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
  onRecruitAllianceMember: () => void;
  onUpdateAllianceIdentity: (name: string, motto: string, emblemId: AllianceEmblemId) => void;
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
  onAllyDonateDragonToSwarm: () => void;
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

const TREASURE_THRESHOLDS = [40, 100, 220, 420];

const SKIN_LABEL_AR: Record<DuckSkinId, string> = {
  classic: 'اللهب الكلاسيكي',
  cool: 'الجلد الجليدي',
  dj: 'تنين الرعد',
  royal: 'التنين الملكي',
  aqua: 'تنين المحيط',
  lilac: 'تنين السديم',
  ninja: 'تنين النينجا',
  pharaoh: 'التنين الفرعوني',
  skeleton: 'التنين العظمي',
  bride: 'تنين الكريستال',
  gamer: 'تنين النيون',
  coffee: 'تنين القهوة',
  cupid: 'تنين كيوبيد',
  pumpkin: 'تنين اليقطين',
};

function mapInitialSubTab(tab?: 'TREASURES' | 'TASKS' | 'GODS' | 'SHOP'): AllianceMainSubTab {
  if (tab === 'TASKS') return 'MISSIONS';
  if (tab === 'SHOP') return 'SHOP';
  if (tab === 'TREASURES') return 'ROSTER';
  return 'HQ';
}

function renderEmblemGlyph(emblemId: AllianceEmblemId, className = 'w-6 h-6') {
  switch (emblemId) {
    case 'royal_crown':
      return <Crown className={className} />;
    case 'phoenix_wing':
      return <Flame className={className} />;
    case 'sun_pyramid':
      return <Landmark className={className} />;
    case 'storm_fang':
      return <Zap className={className} />;
    case 'eternal_flame':
      return <Sparkles className={className} />;
    case 'obsidian_sword':
      return <Swords className={className} />;
    case 'emerald_throne':
      return <Trophy className={className} />;
    case 'dragon_shield':
    default:
      return <Shield className={className} />;
  }
}

export const GodsTab: React.FC<GodsTabProps> = ({
  state,
  initialSubTab = 'GODS',
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
  onRecruitAllianceMember,
  onUpdateAllianceIdentity,
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
  onAllyDonateDragonToSwarm,
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
  const [ledgerViewMode, setLedgerViewMode] = useState<'DONATE' | 'LOG'>('DONATE');
  const [missionsMode, setMissionsMode] = useState<'DRAGON' | 'DAILY'>('DRAGON');
  const [shopSection, setShopSection] = useState<'STORE' | 'TALENTS' | 'FORGE'>('STORE');
  const [rosterSection, setRosterSection] = useState<'MEMBERS' | 'DIVIDENDS' | 'BLESSINGS'>(
    initialSubTab === 'TREASURES' ? 'BLESSINGS' : 'MEMBERS'
  );
  const [logFilter, setLogFilter] = useState<
    'ALL' | 'DONATE' | 'RESEARCH' | 'DRAGON' | 'RALLY' | 'BOSS' | 'DIVIDEND' | 'MEMBERS'
  >('ALL');
  const [blessingTargetTech, setBlessingTargetTech] = useState<AllianceTechId>('tech_rally_capacity');

  // Inline 2-step confirmation states (no window.confirm)
  const [confirmDonateDragonId, setConfirmDonateDragonId] = useState<string | null>(null);
  const [confirmKickMemberId, setConfirmKickMemberId] = useState<string | null>(null);
  const [confirmLeavePack, setConfirmLeavePack] = useState(false);

  // Clean modals instead of cluttered stacked panels
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showRallyDetailsModal, setShowRallyDetailsModal] = useState(false);
  const [showLevelPerksModal, setShowLevelPerksModal] = useState(false);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [showFormulaGuide, setShowFormulaGuide] = useState(false);

  // Identity & Join-Conditions editor local draft
  const [draftName, setDraftName] = useState(state.pack.packName);
  const [draftMotto, setDraftMotto] = useState(
    state.pack.motto ?? 'وحدة التنانين تفتح أبواب المجد وعرش DMD'
  );
  const [draftEmblem, setDraftEmblem] = useState<AllianceEmblemId>(
    state.pack.emblemId ?? 'dragon_shield'
  );
  const [draftConditions, setDraftConditions] = useState<AllianceJoinConditions>(
    () => state.pack.joinConditions ?? createInitialJoinConditions()
  );

  // War map target + player's dispatched dragons selection
  const [selectedMapTargetId, setSelectedMapTargetId] = useState<string>(ALLIANCE_MAP_TARGETS[0].id);
  const [selectedPrepMinutes, setSelectedPrepMinutes] = useState<number>(60);
  const [selectedLaunchDragonIds, setSelectedLaunchDragonIds] = useState<string[]>(() =>
    [...state.ducks]
      .sort((a, b) => (b.powerRating ?? 100) - (a.powerRating ?? 100))
      .slice(0, Math.min(3, state.ducks.length))
      .map((d) => d.id)
  );

  const [carouselIdx, setCarouselIdx] = useState(0);
  const [chatInput, setChatInput] = useState('');
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

  // Keep selected launch dragons valid when roster changes
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

  const pack = state.pack;
  const levelInfo = getAllianceLevelInfo(pack.xp ?? 12500);
  const currentEmblem =
    ALLIANCE_EMBLEM_CATALOG.find((e) => e.id === (pack.emblemId ?? 'dragon_shield')) ??
    ALLIANCE_EMBLEM_CATALOG[0];

  const joinConditions = useMemo(
    () => pack.joinConditions ?? createInitialJoinConditions(),
    [pack.joinConditions]
  );

  const playerTotalPower = useMemo(
    () => state.ducks.reduce((acc, d) => acc + (d.powerRating ?? 100), 0),
    [state.ducks]
  );
  const maxPlayerDragonLevel = useMemo(
    () => state.ducks.reduce((mx, d) => Math.max(mx, d.level), 1),
    [state.ducks]
  );
  const meetsJoinPower = playerTotalPower >= joinConditions.minPower;
  const meetsJoinDragons = state.ducks.length >= joinConditions.minDragons;
  const meetsJoinDragonLevel = maxPlayerDragonLevel >= joinConditions.minDragonLevel;
  const canJoinAlliance = meetsJoinPower && meetsJoinDragons && meetsJoinDragonLevel;

  const rankMeta = getAllianceRankMeta(pack.contributionTotal ?? 0, playerTotalPower);
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

  const filteredLogs = useMemo(() => {
    if (logFilter === 'ALL') return allianceLogs;
    if (logFilter === 'MEMBERS') {
      return allianceLogs.filter((l) => l.type === 'JOIN' || l.type === 'ROLE' || l.type === 'HELP');
    }
    return allianceLogs.filter((l) => l.type === logFilter);
  }, [allianceLogs, logFilter]);

  const coopProgressMap = useMemo(() => {
    const base = { ...createInitialCoopProgress(), ...(pack.coopProgress ?? {}) };
    base.coop_treasury = Math.max(pack.treasuryCorn, base.coop_treasury ?? 125000);
    return base;
  }, [pack.coopProgress, pack.treasuryCorn]);

  const memberRolesMap = useMemo(
    () => ({ ...createInitialMemberRoles(), ...(pack.memberRoles ?? {}) }),
    [pack.memberRoles]
  );
  const kickedSet = useMemo(() => new Set(pack.kickedMemberIds ?? []), [pack.kickedMemberIds]);
  const activeNpcRoster = useMemo(
    () => ALLIANCE_ROSTER_MEMBERS.filter((m) => !kickedSet.has(m.id)),
    [kickedSet]
  );
  const leaderName = useMemo(() => {
    const npcLeader = activeNpcRoster.find((m) => (memberRolesMap[m.id] ?? m.role) === 'LEADER');
    if (npcLeader) return npcLeader.name;
    if (pack.joined && rankMeta.roleKey === 'LEADER') return state.username;
    return 'DRAGON_LEADER';
  }, [activeNpcRoster, memberRolesMap, pack.joined, rankMeta.roleKey, state.username]);

  const onlineMembersCount = useMemo(() => {
    const activeOnlineNpcs = activeNpcRoster.filter((m) => m.online).length;
    const extraOnline = Math.max(
      0,
      Math.round((pack.members - activeNpcRoster.length - (pack.joined ? 1 : 0)) * 0.48)
    );
    return Math.min(pack.members, activeOnlineNpcs + (pack.joined ? 1 : 0) + extraOnline);
  }, [activeNpcRoster, pack.joined, pack.members]);

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

  const missionsBadge = readyQuestsCount + readyCoopCount + readyActivityChestsCount + unclaimedGiftsCount;

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

  const currentGod = state.godCards[carouselIdx] ?? state.godCards[0];
  const treasurePoints = state.tournament.score + state.stats.totalErrands * 5;

  const sortedRoster = useMemo(() => {
    const playerEntry = {
      id: 'player_self',
      name: `${state.username} (أنت)`,
      role: rankMeta.roleKey,
      rank: rankMeta.rank,
      titleAr: rankMeta.titleAr,
      power: playerTotalPower,
      weeklyContrib: pack.contributionTotal ?? 0,
      donatedEnergy: ledger.playerEnergyDonated,
      donatedTech: ledger.playerTechDonated,
      rallyScore: ledger.playerRallyContrib,
      dailyActivity: activityPoints,
      lastSeenAr: 'متصل الآن',
      online: true,
      isSelf: true,
    };
    const entries = [
      ...(pack.joined ? [playerEntry] : []),
      ...activeNpcRoster.map((m) => {
        const assignedRole = memberRolesMap[m.id] ?? m.role;
        const roleMeta = ALLIANCE_ROLE_META[assignedRole];
        return {
          ...m,
          role: assignedRole,
          rank: roleMeta.rankCode,
          titleAr: roleMeta.labelAr,
          isSelf: false,
        };
      }),
    ];
    return entries.sort((a, b) => b.power - a.power);
  }, [
    activeNpcRoster,
    activityPoints,
    ledger.playerEnergyDonated,
    ledger.playerRallyContrib,
    ledger.playerTechDonated,
    memberRolesMap,
    pack.contributionTotal,
    pack.joined,
    playerTotalPower,
    rankMeta.rank,
    rankMeta.roleKey,
    rankMeta.titleAr,
    state.username,
  ]);

  // Live rally computations (used by Map + Rally Details Modal)
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
      : Math.min(99, Math.max(4, Math.round(((activeMarchTotalMs - activeMarchLeftMs) / activeMarchTotalMs) * 100)))
    : 0;

  const openIdentityEditor = () => {
    setDraftName(pack.packName);
    setDraftMotto(pack.motto ?? 'وحدة التنانين تفتح أبواب المجد وعرش DMD');
    setDraftEmblem(pack.emblemId ?? 'dragon_shield');
    setDraftConditions(pack.joinConditions ?? createInitialJoinConditions());
    setConfirmLeavePack(false);
    setShowIdentityModal(true);
  };

  const allLevelPerks = useMemo(
    () => Array.from({ length: ALLIANCE_DAILY_LIMITS.MAX_ALLIANCE_LEVEL }, (_, i) => getAllianceLevelPerks(i + 1)),
    []
  );

  return (
    <div className="h-full w-full overflow-y-auto overscroll-y-contain touch-pan-y select-none">
      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-3 pb-8 space-y-3">
        {/* 1. Clean Alliance Banner Header */}
        <section className="relative rounded-3xl p-3 sm:p-4 border border-amber-500/35 bg-gradient-to-b from-[#1f192d] via-[#171a26] to-[#131620] shadow-2xl overflow-hidden">
          <TempleAltarBackdrop className="opacity-30" />
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Clickable Emblem Crest (Leader Customization) */}
                <button
                  onClick={() => {
                    soundFX.playTabSwitch();
                    openIdentityEditor();
                  }}
                  title="تخصيص اسم وشعار السرب"
                  className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${currentEmblem.bgGradient} border ${currentEmblem.borderClass} flex items-center justify-center shrink-0 shadow-lg hover:scale-105 transition-transform cursor-pointer`}
                >
                  {renderEmblemGlyph(currentEmblem.id, `w-6 h-6 ${currentEmblem.iconColorClass}`)}
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-slate-950 border border-amber-400/70 flex items-center justify-center">
                    <Edit3 className="w-2.5 h-2.5 text-amber-300" />
                  </span>
                </button>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={openIdentityEditor}
                      className="font-display text-base sm:text-lg font-black text-white truncate hover:text-amber-300 transition-colors cursor-pointer text-right"
                    >
                      {pack.packName}
                    </button>

                    {/* Clickable Level Badge -> Opens Level Perks Modal */}
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

                    {pack.joined && (
                      <span
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${rankMeta.colorClass}`}
                      >
                        {rankMeta.roleKey === 'LEADER'
                          ? `👑 ${state.username}`
                          : `${rankMeta.rank} · ${rankMeta.titleAr}`}
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-300 truncate mt-0.5">
                    👑 القائد: <strong className="text-amber-300">{leaderName}</strong> ·{' '}
                    {pack.motto ?? 'وحدة التنانين تفتح أبواب المجد وعرش DMD'}
                  </p>
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

            {/* Slim Alliance XP Bar + Level Perks Link */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono-num text-slate-300">
                <button
                  onClick={() => setShowLevelPerksModal(true)}
                  className="text-amber-200 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>مزايا المستوى: قوة +{levelInfo.powerBonusPct}% · غنائم +{levelInfo.levelLootBonusPct}%</span>
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

            {/* 4 Primary Single-Source Telemetry Tiles */}
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
                <div className="text-[9px] text-slate-400">طاقة الخزينة</div>
                <div className="font-mono-num text-xs font-black text-emerald-300">
                  {pack.treasuryCorn.toLocaleString()}⚡
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

        {/* Join Prompt if player hasn't joined the Alliance yet */}
        {!pack.joined ? (
          <section className="rounded-3xl bg-[#161923] border border-amber-400/40 p-4 space-y-3 shadow-xl">
            <div className="text-center space-y-1">
              <h3 className="font-display text-lg font-black text-white">
                انضم إلى تحالف {pack.packName}
              </h3>
              <p className="text-xs text-slate-300">
                في ألعاب التحالف الاستراتيجية، قوتك تتضاعف مع الإخوة! احصل على مزايا فورية:
              </p>
            </div>

            {/* Alliance Join Conditions */}
            <div className="rounded-2xl bg-slate-950/80 border border-amber-500/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-amber-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  شروط الانضمام للسرب
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-200">
                  {joinConditions.autoAccept ? 'قبول فوري تلقائي' : 'يتطلب مطابقة الشروط'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center font-mono-num text-[10.5px]">
                <div
                  className={`rounded-xl p-2 border ${
                    meetsJoinPower
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="text-[9px] text-slate-400">القوة المطلوبة</div>
                  <div className="font-black">
                    {playerTotalPower.toLocaleString()}/{joinConditions.minPower.toLocaleString()}
                  </div>
                </div>
                <div
                  className={`rounded-xl p-2 border ${
                    meetsJoinDragons
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="text-[9px] text-slate-400">عدد التنانين</div>
                  <div className="font-black">
                    {state.ducks.length}/{joinConditions.minDragons}
                  </div>
                </div>
                <div
                  className={`rounded-xl p-2 border ${
                    meetsJoinDragonLevel
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="text-[9px] text-slate-400">أعلى مستوى تنين</div>
                  <div className="font-black">
                    Lv.{maxPlayerDragonLevel}/Lv.{joinConditions.minDragonLevel}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 flex items-center gap-2.5">
                <Swords className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <div className="font-black text-white">حشود بتنانين الأعضاء</div>
                  <div className="text-[10.5px] text-slate-400">أرسل تنانينك لغزو الأهرام والوحوش</div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-black text-white">تنين السرب الأسطوري</div>
                  <div className="text-[10.5px] text-slate-400">ورّث خصائص التنانين لتنين السرب</div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 flex items-center gap-2.5">
                <FlaskConical className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-black text-white">أبحاث السرب الكبرى</div>
                  <div className="text-[10.5px] text-slate-400">تطوير جماعي يضاعف قوة السرب</div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <div className="font-black text-white">متجر وتوزيع الأرباح</div>
                  <div className="text-[10.5px] text-slate-400">أرباح عادلة حسب مساهمة كل عضو</div>
                </div>
              </div>
            </div>

            <button
              disabled={!canJoinAlliance}
              onClick={() => {
                soundFX.playGodConfirm();
                onJoinPack();
              }}
              className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-lg transition-all ${
                canJoinAlliance
                  ? 'bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 hover:brightness-105 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {canJoinAlliance
                ? `انضم إلى ${pack.packName} الآن (+240 ⚡ و +3 ★)`
                : 'يجب استيفاء شروط الانضمام للسرب أعلاه أولاً'}
            </button>
          </section>
        ) : (
          <>
            {/* Compact Unread Smart Alert Ticker (Replaces bulky top box; opens clean modal) */}
            {unreadNotifCount > 0 && notifications[0] && (
              <div className="rounded-2xl bg-gradient-to-r from-[#261a2c] to-[#171d2c] border border-amber-400/55 px-3 py-2 flex items-center justify-between gap-2 shadow">
                <button
                  onClick={() => setShowNotifModal(true)}
                  className="flex items-center gap-2 min-w-0 text-right cursor-pointer"
                >
                  <BellRing className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-white truncate">
                      {notifications[0].titleAr}
                    </div>
                    <div className="text-[9.5px] text-slate-300 truncate">
                      {notifications[0].bodyAr}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      soundFX.playTabSwitch();
                      onMarkNotificationRead(notifications[0].id);
                      setSubTab(notifications[0].targetSubTab);
                      if (notifications[0].targetSubTab === 'ROSTER') {
                        setRosterSection('DIVIDENDS');
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] cursor-pointer hover:brightness-105"
                  >
                    انتقال
                  </button>
                  <button
                    onClick={() => setShowNotifModal(true)}
                    className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-black text-slate-200 cursor-pointer"
                  >
                    الكل ({unreadNotifCount})
                  </button>
                </div>
              </div>
            )}

            {/* 2. Alliance 6-Tab Navigation (3x2 Grid) */}
            <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-[#181b24] border border-slate-800">
              {([
                { id: 'HQ', label: 'القيادة والخزينة', badge: canUseBreedHelp ? 1 : 0 },
                { id: 'MAP', label: 'خريطة التحشيد', badge: rallyBadge },
                { id: 'RESEARCH', label: 'أبحاث السرب', badge: readyResearchCount },
                { id: 'MISSIONS', label: 'تنين السرب', badge: missionsBadge },
                { id: 'SHOP', label: 'المتجر', badge: 0 },
                { id: 'ROSTER', label: 'الأعضاء والأرباح', badge: dividendReady ? 1 : 0 },
              ] as const).map((t) => {
                const active = subTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      soundFX.playTabSwitch();
                      setSubTab(t.id);
                    }}
                    className={`relative min-h-[40px] py-2 px-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                      active
                        ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{t.label}</span>
                    {t.badge > 0 && (
                      <span className="min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-mono-num text-[9px] font-black flex items-center justify-center shrink-0">
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* SUBTAB 1: HQ (Unified Donation Ledger + Research Pool + Alliance Event Log + Help + Boss + Chat) */}
            {subTab === 'HQ' && (
              <div className="space-y-3">
                {/* Unified Donation Ledger & Alliance Event Log */}
                <div className="rounded-2xl bg-[#161923] border border-amber-500/35 p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs sm:text-sm font-black text-white">
                        دفتر التبرعات وموارد الأبحاث · سجل أحداث السرب
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono-num font-bold text-amber-300">
                      تبرعات اليوم: {donationsToday}/{ALLIANCE_DAILY_LIMITS.MAX_DONATIONS_PER_DAY}
                    </span>
                  </div>

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
                </div>

                {/* Help + Breeding Speedup (Compact) */}
                <div className="rounded-2xl bg-[#161923] border border-emerald-500/30 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-white flex items-center gap-1.5">
                      <HeartHandshake className="w-4 h-4 text-emerald-400" />
                      مساعدة الإخوة وتسريع التزاوج
                    </span>
                    <span className="text-[10px] font-mono-num font-bold text-emerald-300">
                      {helpsToday}/{ALLIANCE_DAILY_LIMITS.MAX_HELPS_PER_DAY} اليوم
                    </span>
                  </div>

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
                </div>

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
                <div className="rounded-2xl bg-[#161923] border border-slate-800 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4" />
                      <span>مجلس ودردشة السرب</span>
                    </span>
                    <span className="text-[10px] font-mono-num text-slate-400">
                      متصلون: {onlineMembersCount}/{pack.members}
                    </span>
                  </div>

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
                    {pack.messages.slice(-14).map((m) =>
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
                              setSubTab(m.actionSubTab!);
                              if (m.actionSubTab === 'ROSTER') {
                                setRosterSection('DIVIDENDS');
                              }
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
                </div>
              </div>
            )}

            {/* SUBTAB: MAP & COLLECTIVE DRAGON RALLIES */}
            {subTab === 'MAP' && (() => {
              const selectedTarget =
                ALLIANCE_MAP_TARGETS.find((t) => t.id === selectedMapTargetId) ??
                ALLIANCE_MAP_TARGETS[0];
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

              // Interpolated live march position from Citadel (50, 52) -> Target
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs sm:text-sm font-black text-white">
                          خريطة السرب ومسير التنانين
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono-num text-slate-400">
                        قلعة السرب (512, 512)
                      </span>
                    </div>

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
                          {renderEmblemGlyph(currentEmblem.id, 'w-4 h-4 text-amber-300')}
                        </div>
                        <span className="mt-0.5 text-[9px] font-black text-amber-200 bg-slate-950/85 px-1.5 rounded">
                          حصن السرب
                        </span>
                      </div>

                      {/* Real-time Moving Dragon March Marker */}
                      {activeRally && (
                        <button
                          onClick={() => setShowRallyDetailsModal(true)}
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

                      {/* Real-time March Progress Bar */}
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
                            setShowRallyDetailsModal(true);
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
                  <div className="rounded-2xl bg-[#161923] border border-slate-800 p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            {selectedTarget.nameAr} [Lv.{selectedTarget.level}]
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">{selectedTarget.descAr}</p>
                      </div>
                      <span className="font-mono-num text-[10px] text-slate-300 shrink-0">
                        ({selectedTarget.coords.x}, {selectedTarget.coords.y})
                      </span>
                    </div>

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
                  </div>
                </div>
              );
            })()}

            {/* SUBTAB: ALLIANCE RESEARCH TREE (أبحاث السرب: Starts at 100,000 and doubles x2 every level) */}
            {subTab === 'RESEARCH' && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-[#161923] border border-cyan-500/35 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <FlaskConical className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs sm:text-sm font-black text-white">
                        مختبر أبحاث السرب
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-[10px] font-mono-num font-black text-cyan-200">
                      تبدأ من 100,000 وتتضاعف ×2 كل مستوى
                    </span>
                  </div>

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
                </div>

                {/* Convert Blessing Cards into Alliance Research Missions */}
                <div className="rounded-2xl bg-gradient-to-b from-[#1e172c] to-[#161923] border border-purple-500/40 p-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs sm:text-sm font-black text-white">
                        تحويل بطاقات البركات إلى مهمات أبحاث السرب
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono-num font-bold text-purple-200">
                      محوّلة: {convertedBlessingIds.size}/{state.godCards.length}
                    </span>
                  </div>

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
                              <div className="text-xs font-black text-white truncate">
                                {god.name}
                              </div>
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
                                setSubTab('ROSTER');
                                setRosterSection('BLESSINGS');
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
            )}

            {/* SUBTAB: SWARM DRAGON (تنين السرب) & DAILY CHESTS/QUESTS */}
            {subTab === 'MISSIONS' && (
              <div className="space-y-3">
                {/* 2-Way Toggle: Swarm Dragon (primary) | Daily Missions & Chests */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                  <button
                    onClick={() => {
                      soundFX.playTabSwitch();
                      setMissionsMode('DRAGON');
                    }}
                    className={`py-2 rounded-lg text-[11px] font-black cursor-pointer flex items-center justify-center gap-1.5 ${
                      missionsMode === 'DRAGON'
                        ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>تنين السرب</span>
                  </button>
                  <button
                    onClick={() => {
                      soundFX.playTabSwitch();
                      setMissionsMode('DAILY');
                    }}
                    className={`py-2 rounded-lg text-[11px] font-black cursor-pointer flex items-center justify-center gap-1.5 ${
                      missionsMode === 'DAILY'
                        ? 'bg-slate-800 text-emerald-300 border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>
                      صناديق ومهام اليوم{missionsBadge > 0 ? ` (${missionsBadge})` : ''}
                    </span>
                  </button>
                </div>

                {missionsMode === 'DRAGON' ? (
                  <div className="space-y-3">
                    {/* Swarm Dragon Hero Status Card */}
                    <div className="rounded-2xl bg-gradient-to-b from-[#25182d] via-[#171b28] to-[#141722] border border-amber-400/50 p-3.5 space-y-3 shadow-xl">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 h-16 rounded-2xl bg-slate-950/90 border border-amber-400/45 flex items-center justify-center shrink-0">
                            <DragonIllustration
                              skin={swarmDragon.skin}
                              level={Math.min(5, Math.max(1, Math.ceil(swarmDragon.level / 10)))}
                              showEvolutionEffects={swarmDragon.unlocked}
                              motionEnabled={swarmDragon.unlocked}
                              className="w-14 h-14"
                            />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-sm sm:text-base font-black text-white">
                                {swarmDragon.name}
                              </h3>
                              <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400/55 text-[10px] font-mono-num font-black text-amber-300">
                                {swarmDragon.unlocked ? `Lv.${swarmDragon.level}/50` : 'مغلق 🔒'}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-300 mt-0.5">
                              {swarmDragon.unlocked
                                ? 'مفتوح ويقاتل مع السرب! جميع خصائص التنانين المتبرّع بها تنتقل إليه فوراً.'
                                : `يتطلب تبرع ${swarmDragon.requiredDragons} تنانين لفتحه (متاح الآن ${swarmDragon.donatedCount}/${swarmDragon.requiredDragons}).`}
                            </p>
                          </div>
                        </div>

                        {swarmDragon.unlocked && swarmDragon.level < 50 && (
                          <button
                            disabled={
                              state.corn < swarmLvCost.energyCost ||
                              allianceCoins < swarmLvCost.coinsCost
                            }
                            onClick={() => {
                              soundFX.playGodConfirm();
                              onTrainSwarmDragon();
                            }}
                            className={`px-3 py-2 rounded-xl font-black text-[11px] font-mono-num shrink-0 ${
                              state.corn >= swarmLvCost.energyCost &&
                              allianceCoins >= swarmLvCost.coinsCost
                                ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 hover:brightness-105 cursor-pointer shadow'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            ترقية المستوى ({swarmLvCost.energyCost.toLocaleString()}⚡ · {swarmLvCost.coinsCost}🪙)
                          </button>
                        )}
                      </div>

                      {/* Unlock Progress Bar */}
                      {!swarmDragon.unlocked && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono-num">
                            <span className="text-amber-300 font-bold">تقدّم فتح تنين السرب</span>
                            <span className="text-white font-black">
                              {swarmDragon.donatedCount} / {swarmDragon.requiredDragons} تنانين
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-slate-950 border border-amber-400/35 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(
                                    (swarmDragon.donatedCount / Math.max(1, swarmDragon.requiredDragons)) *
                                      100
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Live Inherited + Upgraded Stats */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center font-mono-num text-[10px]">
                        <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5 px-1">
                          <div className="text-[9px] text-slate-400">القوة الكلية</div>
                          <div className="font-black text-amber-300">
                            {swarmStats.totalPower.toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5 px-1">
                          <div className="text-[9px] text-slate-400">الصحة HP</div>
                          <div className="font-black text-emerald-300">
                            {swarmStats.hp.toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5 px-1">
                          <div className="text-[9px] text-slate-400">الهجوم ATK</div>
                          <div className="font-black text-rose-300">
                            {swarmStats.attack.toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5 px-1">
                          <div className="text-[9px] text-slate-400">الدفاع DEF</div>
                          <div className="font-black text-sky-300">
                            {swarmStats.defense.toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5 px-1">
                          <div className="text-[9px] text-slate-400">السرعة SPD</div>
                          <div className="font-black text-cyan-300">
                            {swarmStats.speed.toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5 px-1">
                          <div className="text-[9px] text-slate-400">مضاعف التاج</div>
                          <div className="font-black text-purple-300">
                            +{swarmStats.crownMultPct}%
                          </div>
                        </div>
                      </div>

                      {/* Inherited Skins Selector */}
                      {swarmDragon.inheritedSkins.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-400 font-bold">
                            المظاهر المنقولة من التنانين المتبرَّع بها:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {swarmDragon.inheritedSkins.map((sk) => {
                              const active = swarmDragon.skin === sk;
                              return (
                                <button
                                  key={sk}
                                  onClick={() => {
                                    soundFX.playTapFeed();
                                    onSelectSwarmDragonSkin(sk);
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                                    active
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-amber-400'
                                  }`}
                                >
                                  {SKIN_LABEL_AR[sk] ?? sk}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Donate Member & Player Dragons */}
                    <div className="rounded-2xl bg-[#161923] border border-emerald-500/35 p-3 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-white">
                            التبرع بالتنانين لتنين السرب
                          </h4>
                          <p className="text-[10px] text-slate-300">
                            عند التبرع بأي تنين، تنتقل جميع خصائصه (المستوى، النجوم ★، الحجم، العتاد، الهالة، المهارة، التدريب) مباشرة إلى تنين السرب!
                          </p>
                        </div>
                        <button
                          disabled={state.corn < 450}
                          onClick={() => {
                            soundFX.playTapFeed();
                            onAllyDonateDragonToSwarm();
                          }}
                          className={`px-3 py-1.5 rounded-xl font-black text-[10.5px] font-mono-num shrink-0 ${
                            state.corn >= 450
                              ? 'bg-sky-500/20 border border-sky-400/55 text-sky-200 hover:bg-sky-500/30 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          نداء تبرع عضو (-450⚡)
                        </button>
                      </div>

                      {state.ducks.length <= 1 ? (
                        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 text-[11px] text-amber-200 font-bold text-center">
                          يجب الاحتفاظ بتنين واحد على الأقل في عشك. فقّس أو احصل على تنين ثانٍ للتبرع به!
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {state.ducks.map((duck) => {
                            const preview = extractDragonTransferStats(duck);
                            const rStyle = RARITY_STYLE[duck.rarity];
                            const gearMeta = DUCK_GEAR_CATALOG.find((g) => g.id === preview.gear);
                            const auraMeta = DUCK_AURA_CATALOG.find((a) => a.id === preview.aura);
                            const isConfirming = confirmDonateDragonId === duck.id;

                            return (
                              <div
                                key={duck.id}
                                className="rounded-xl bg-slate-900/95 border border-slate-800 p-2.5 space-y-2"
                              >
                                <div className="flex items-center gap-2">
                                  <DragonIllustration
                                    skin={duck.skin}
                                    level={duck.level}
                                    showEvolutionEffects={false}
                                    motionEnabled={false}
                                    className="w-11 h-11 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-xs font-black text-white truncate">
                                        {duck.name}
                                      </span>
                                      <span className={`text-[9.5px] font-black ${rStyle.color}`}>
                                        {rStyle.labelAr}
                                      </span>
                                    </div>
                                    <div className="text-[9.5px] font-mono-num text-slate-300">
                                      Lv.{duck.level} · ★{duck.customLevel} · {preview.sizeTier} · مهارة Lv.{preview.skillLevel} · تدريب +{preview.trainingLevel}
                                    </div>
                                    <div className="text-[9.5px] text-amber-200 truncate">
                                      {gearMeta ? `${gearMeta.icon} ${gearMeta.nameAr}` : 'طبيعي'} · هالة: {auraMeta?.nameAr ?? 'تلقائية'}
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 px-2 py-1 text-[9.5px] font-mono-num text-emerald-300 font-bold">
                                  ينقل: +{preview.powerAdded.toLocaleString()} قوة · +{preview.hpAdded} صحة · +{preview.attackAdded} هجوم · +{preview.defenseAdded} دفاع · +{preview.speedAdded} سرعة
                                </div>

                                {isConfirming ? (
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      onClick={() => {
                                        soundFX.playGodConfirm();
                                        onDonateDragonToSwarm(duck.id);
                                        setConfirmDonateDragonId(null);
                                      }}
                                      className="py-1.5 rounded-lg bg-rose-500 text-white font-black text-[10px] cursor-pointer"
                                    >
                                      تأكيد التبرع الدائم؟
                                    </button>
                                    <button
                                      onClick={() => setConfirmDonateDragonId(null)}
                                      className="py-1.5 rounded-lg bg-slate-800 text-slate-300 font-black text-[10px] cursor-pointer"
                                    >
                                      إلغاء
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDonateDragonId(duck.id)}
                                    className="w-full py-1.5 rounded-lg bg-amber-400/20 border border-amber-400/55 text-amber-200 hover:bg-amber-400/30 font-black text-[10.5px] cursor-pointer"
                                  >
                                    تبرع بالتنين ونقل خصائصه
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Swarm Dragon Upgrades & Gear (Active when Unlocked) */}
                    {swarmDragon.unlocked ? (
                      <>
                        {/* 4 Skill Upgrades */}
                        <div className="rounded-2xl bg-[#161923] border border-rose-500/35 p-3 space-y-2">
                          <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                            <Swords className="w-4 h-4 text-rose-400" />
                            <span>ترقيات قدرات تنين السرب</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {SWARM_DRAGON_UPGRADE_CATALOG.map((u) => {
                              const lv = swarmDragon.upgrades[u.key] ?? 0;
                              const maxed = lv >= u.maxLevel;
                              const cost = getSwarmDragonUpgradeCost(u.key, lv);
                              const canAfford =
                                !maxed &&
                                state.corn >= cost.energyCost &&
                                allianceCoins >= cost.coinsCost;
                              return (
                                <div
                                  key={u.key}
                                  className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-black text-white">{u.nameAr}</span>
                                    <span className="font-mono-num text-[10px] font-black text-amber-300">
                                      Lv.{lv}/{u.maxLevel}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400">{u.descAr}</p>
                                  <div className="text-[10px] font-bold text-emerald-300">
                                    {u.effectPerLvAr}
                                  </div>
                                  <button
                                    disabled={!canAfford}
                                    onClick={() => {
                                      soundFX.playGodConfirm();
                                      onUpgradeSwarmDragonSkill(u.key);
                                    }}
                                    className={`w-full py-1.5 rounded-lg font-black text-[10.5px] font-mono-num ${
                                      maxed
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : canAfford
                                          ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                                  >
                                    {maxed
                                      ? 'الحد الأقصى ✓'
                                      : `ترقية (${cost.energyCost.toLocaleString()}⚡ · ${cost.coinsCost}🪙)`}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 4 Gear Slots */}
                        <div className="rounded-2xl bg-[#161923] border border-cyan-500/35 p-3 space-y-2">
                          <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-cyan-400" />
                            <span>عتاد ومعدات تنين السرب</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {SWARM_DRAGON_GEAR_CATALOG.map((g) => {
                              const lv = swarmDragon.gearLevels[g.slot] ?? 0;
                              const maxed = lv >= g.maxLevel;
                              const cost = getSwarmDragonGearUpgradeCost(g.slot, lv);
                              const canAfford =
                                !maxed &&
                                allianceCoins >= cost.coinsCost &&
                                state.duckGold >= cost.goldCost;
                              return (
                                <div
                                  key={g.slot}
                                  className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-black text-white">{g.nameAr}</span>
                                    <span className="font-mono-num text-[10px] font-black text-cyan-300">
                                      +{lv}/{g.maxLevel}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400">{g.descAr}</p>
                                  <div className="text-[10px] font-bold text-emerald-300">
                                    {g.bonusPerLvAr}
                                  </div>
                                  <button
                                    disabled={!canAfford}
                                    onClick={() => {
                                      soundFX.playGodConfirm();
                                      onUpgradeSwarmDragonGear(g.slot);
                                    }}
                                    className={`w-full py-1.5 rounded-lg font-black text-[10.5px] font-mono-num ${
                                      maxed
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : canAfford
                                          ? 'bg-cyan-400 text-slate-950 hover:brightness-105 cursor-pointer'
                                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                                  >
                                    {maxed
                                      ? 'مصقول بالكامل ✓'
                                      : `تطوير العتاد (${cost.coinsCost}🪙 · ${cost.goldCost}💎)`}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl bg-[#161923] border border-slate-800 p-3 text-center text-xs text-slate-300">
                        تُفتح خانات <strong className="text-amber-300">الترقيات الـ4 والعتاد الـ4</strong> فور اكتمال تبرع {swarmDragon.requiredDragons} تنانين لفتح تنين السرب!
                      </div>
                    )}

                    {/* Inherited Traits & Donated Dragons History */}
                    <div className="rounded-2xl bg-[#161923] border border-slate-800 p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-white">
                          الخصائص المنقولة وسجل التنانين المتبرَّع بها ({swarmDragon.donations.length})
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {swarmDragon.inheritedGearIds.map((gid) => {
                          const gm = DUCK_GEAR_CATALOG.find((x) => x.id === gid);
                          return (
                            <span
                              key={gid}
                              className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-200 font-bold"
                            >
                              {gm ? `${gm.icon} ${gm.nameAr}` : gid}
                            </span>
                          );
                        })}
                        {swarmDragon.inheritedAuraIds.map((aid) => {
                          const am = DUCK_AURA_CATALOG.find((x) => x.id === aid);
                          return (
                            <span
                              key={aid}
                              className="px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-400/40 text-purple-200 font-bold"
                            >
                              هالة: {am?.nameAr ?? aid}
                            </span>
                          );
                        })}
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        {swarmDragon.donations.map((entry) => {
                          const rStyle = RARITY_STYLE[entry.rarity];
                          return (
                            <div
                              key={entry.id}
                              className="rounded-xl bg-slate-900/90 border border-slate-800 p-2 flex items-center justify-between gap-2 text-[10.5px]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <DragonIllustration
                                  skin={entry.skin}
                                  level={entry.level}
                                  showEvolutionEffects={false}
                                  motionEnabled={false}
                                  className="w-8 h-8 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-white truncate">
                                      {entry.dragonName}
                                    </span>
                                    <span className={`text-[9px] font-black ${rStyle.color}`}>
                                      {rStyle.labelAr}
                                    </span>
                                  </div>
                                  <div className="text-[9.5px] text-slate-400 font-mono-num">
                                    من <strong className="text-amber-300">{entry.donorName}</strong> · Lv.{entry.level} · ★{entry.customLevel} · {entry.sizeTier} · مهارة {entry.skillLevel} · تدريب +{entry.trainingLevel}
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono-num text-[10px] font-black text-emerald-300 shrink-0">
                                +{entry.powerAdded.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Daily Activity Chests */}
                    <div className="rounded-2xl bg-[#161923] border border-amber-500/35 p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-white flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          صناديق نشاط السرب اليومي
                        </span>
                        <span className="font-mono-num font-black text-amber-300">
                          {activityPoints} / 100 نقطة
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all"
                          style={{ width: `${Math.min(100, activityPoints)}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {ALLIANCE_ACTIVITY_CHESTS.map((chest) => {
                          const reached = activityPoints >= chest.threshold;
                          const claimed = (pack.claimedActivityChests ?? []).includes(chest.threshold);
                          return (
                            <button
                              key={chest.threshold}
                              disabled={!reached || claimed}
                              onClick={() => onClaimActivityChest(chest.threshold)}
                              className={`rounded-xl p-2 border text-center space-y-0.5 transition-all ${
                                claimed
                                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                                  : reached
                                    ? 'bg-amber-400/20 border-amber-400 text-amber-200 hover:bg-amber-400/30 cursor-pointer animate-pulse'
                                    : 'bg-slate-900/80 border-slate-800 text-slate-400'
                              }`}
                            >
                              <div className="text-[10px] font-black font-mono-num">
                                {chest.threshold} نقطة
                              </div>
                              <div className="text-[9.5px] font-bold truncate">{chest.titleAr}</div>
                              <div className="text-[9px] font-mono-num font-black">
                                {claimed ? 'تم ✓' : reached ? 'استلم!' : `+${chest.corn}⚡`}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cooperative Alliance Missions */}
                    <div className="rounded-2xl bg-gradient-to-b from-[#1a162b] to-[#161923] border border-purple-500/40 p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Flag className="w-4 h-4 text-purple-400" />
                          <h3 className="text-xs sm:text-sm font-black text-white">
                            مهام السرب التعاونية
                          </h3>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-400/40 text-[10px] font-black text-purple-200">
                          تقدم جماعي
                        </span>
                      </div>

                      <div className="space-y-2">
                        {ALLIANCE_COOP_MISSIONS_CATALOG.map((goal) => {
                          const rawProg = coopProgressMap[goal.id] ?? goal.initialSeed;
                          const prog = Math.min(goal.target, rawProg);
                          const claimed = (pack.claimedCoopGoals ?? []).includes(goal.id);
                          const reached = rawProg >= goal.target;
                          const pct = Math.min(100, Math.round((prog / goal.target) * 100));
                          const canSupport = !reached && !claimed && state.corn >= goal.supportCostCorn;

                          return (
                            <div
                              key={goal.id}
                              className={`rounded-xl p-2.5 border space-y-2 ${
                                claimed
                                  ? 'bg-emerald-500/10 border-emerald-500/35'
                                  : reached
                                    ? 'bg-amber-500/15 border-amber-400/60'
                                    : 'bg-slate-900/90 border-slate-800'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-white">{goal.titleAr}</div>
                                  <div className="text-[10px] text-slate-400">{goal.descAr}</div>
                                </div>
                                <span className="font-mono-num text-[10.5px] font-black text-amber-300 shrink-0">
                                  {prog.toLocaleString()} / {goal.target.toLocaleString()} {goal.unitAr}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-purple-500 via-sky-400 to-emerald-400 transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-[9.5px] font-mono-num font-bold text-emerald-300">
                                    +{goal.rewardCorn}⚡ · +{goal.rewardCoins}🪙 · +{goal.rewardStars}★
                                    {goal.rewardGold > 0 ? ` · +${goal.rewardGold}💎` : ''}
                                  </div>

                                  {claimed ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
                                      تم ✓
                                    </span>
                                  ) : reached ? (
                                    <button
                                      onClick={() => onClaimCoopGoal(goal.id)}
                                      className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-[11px] hover:brightness-105 cursor-pointer shadow"
                                    >
                                      استلام المكافأة!
                                    </button>
                                  ) : (
                                    <button
                                      disabled={!canSupport}
                                      onClick={() => onSupportCoopGoal(goal.id)}
                                      className={`px-2.5 py-1 rounded-xl font-black text-[10px] font-mono-num transition-all ${
                                        canSupport
                                          ? 'bg-purple-500/25 border border-purple-400/60 text-purple-200 hover:bg-purple-500/35 cursor-pointer'
                                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                      }`}
                                    >
                                      دعم (+{goal.supportBoost.toLocaleString()} / {goal.supportCostCorn}⚡)
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Member Alliance Gift Boxes */}
                    <div className="rounded-2xl bg-[#161923] border border-purple-500/35 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Gift className="w-4 h-4 text-purple-400" />
                          <h3 className="text-xs sm:text-sm font-black text-white">
                            هدايا الأعضاء ({unclaimedGiftsCount})
                          </h3>
                        </div>
                        {unclaimedGiftsCount > 1 && (
                          <button
                            onClick={() => onClaimAllAllianceGifts()}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] cursor-pointer hover:brightness-105"
                          >
                            استلام الكل
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {gifts.map((gift) => (
                          <div
                            key={gift.id}
                            className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 ${
                              gift.claimed
                                ? 'bg-slate-900/50 border-slate-800/70 opacity-65'
                                : gift.rarity === 'EPIC'
                                  ? 'bg-purple-500/15 border-purple-400/50'
                                  : gift.rarity === 'RARE'
                                    ? 'bg-sky-500/15 border-sky-400/45'
                                    : 'bg-slate-900 border-slate-700'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-black text-white truncate">{gift.titleAr}</div>
                              <div className="text-[10px] text-slate-400">
                                من: <strong className="text-amber-300">{gift.sender}</strong> ·{' '}
                                <span className="font-mono-num text-emerald-300">
                                  +{gift.corn}⚡ +{gift.allianceCoins}🪙
                                  {gift.stars > 0 ? ` +${gift.stars}★` : ''}
                                </span>
                              </div>
                            </div>

                            {gift.claimed ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-bold shrink-0">
                                مستلمة ✓
                              </span>
                            ) : (
                              <button
                                onClick={() => onClaimAllianceGift(gift.id)}
                                className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-[10.5px] shrink-0 cursor-pointer hover:brightness-105"
                              >
                                استلام
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Daily Alliance Quests */}
                    <div className="rounded-2xl bg-[#161923] border border-slate-800 p-3 space-y-2">
                      <h3 className="text-xs sm:text-sm font-black text-white">مهام السرب اليومية</h3>
                      <div className="space-y-2">
                        {ALLIANCE_QUESTS_CATALOG.map((q) => {
                          const prog = Math.min(q.target, questProgressMap[q.id] ?? 0);
                          const claimed = (pack.claimedAllianceQuests ?? []).includes(q.id);
                          const ready = prog >= q.target && !claimed;
                          const pct = Math.min(100, Math.round((prog / q.target) * 100));

                          return (
                            <div
                              key={q.id}
                              className={`rounded-xl p-2.5 border flex items-center justify-between gap-2.5 ${
                                claimed
                                  ? 'bg-emerald-500/10 border-emerald-500/35'
                                  : ready
                                    ? 'bg-amber-500/15 border-amber-400/60'
                                    : 'bg-slate-900/90 border-slate-800'
                              }`}
                            >
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-black text-white truncate">{q.titleAr}</span>
                                  <span className="font-mono-num text-[10px] font-bold text-amber-300 shrink-0">
                                    {prog}/{q.target}
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-sky-400 to-emerald-400"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className="text-[9.5px] font-mono-num font-bold text-emerald-300">
                                  +{q.activityPts} نشاط · +{q.allianceCoins}🪙 · +{q.corn}⚡ · +{q.stars}★
                                </div>
                              </div>

                              <button
                                disabled={!ready}
                                onClick={() => onClaimAllianceQuest(q.id)}
                                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 ${
                                  claimed
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : ready
                                      ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                {claimed ? 'تم ✓' : ready ? 'استلام' : 'جارٍ'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SUBTAB: SHOP + TALENTS + FORGE */}
            {subTab === 'SHOP' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                  {([
                    { id: 'STORE', label: 'متجر السرب' },
                    { id: 'TALENTS', label: 'مواهب السرب' },
                    { id: 'FORGE', label: 'صقل التعاويذ' },
                  ] as const).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        soundFX.playTabSwitch();
                        setShopSection(s.id);
                      }}
                      className={`py-1.5 rounded-lg text-[10.5px] font-black transition-all cursor-pointer ${
                        shopSection === s.id
                          ? 'bg-slate-800 text-amber-300 border border-slate-700'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {shopSection === 'STORE' && (
                  <div className="space-y-2">
                    {ALLIANCE_SHOP_CATALOG.map((offer) => {
                      const canAfford = allianceCoins >= offer.costCoins;
                      return (
                        <div
                          key={offer.id}
                          className="rounded-2xl bg-[#161923] border border-slate-800 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white">{offer.titleAr}</span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-mono-num text-[10px] font-black">
                                {offer.badgeText}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-400">{offer.descAr}</p>
                          </div>

                          <button
                            disabled={!canAfford}
                            onClick={() => onBuyAllianceShopOffer(offer.id)}
                            className={`min-h-[38px] px-3 py-1.5 rounded-xl font-black text-xs font-mono-num shrink-0 flex items-center gap-1 ${
                              canAfford
                                ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>{offer.costCoins}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {shopSection === 'TALENTS' && (
                  <div className="space-y-2">
                    {SQUAD_TALENT_CATALOG.map((meta) => {
                      const rank = talents[meta.key] ?? 0;
                      const maxed = rank >= ECONOMY_LIMITS.MAX_TALENT_RANK;
                      const cost = getSquadTalentCost(meta.key, rank, playerTier);
                      const canAfford =
                        !maxed &&
                        state.corn >= cost.corn &&
                        state.stars >= cost.stars &&
                        state.duckGold >= cost.gold &&
                        state.stats.medals >= cost.medals;

                      return (
                        <div
                          key={meta.key}
                          className="rounded-2xl bg-[#161923] border border-slate-800 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2 text-xs font-black text-white">
                              <span>{meta.nameAr}</span>
                              <span className="font-mono-num text-[11px] text-amber-300">
                                {rank}/{ECONOMY_LIMITS.MAX_TALENT_RANK}
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-400 font-bold">
                              {meta.effectPerRankAr}
                            </div>
                            <div className="text-[10px] text-slate-400">{meta.descAr}</div>
                            {!maxed && (
                              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono-num text-[10px] font-bold">
                                {cost.corn > 0 && (
                                  <span className={state.corn >= cost.corn ? 'text-amber-300' : 'text-rose-400'}>
                                    {cost.corn.toLocaleString()}⚡
                                  </span>
                                )}
                                {cost.stars > 0 && (
                                  <span className={state.stars >= cost.stars ? 'text-indigo-300' : 'text-rose-400'}>
                                    {cost.stars}★
                                  </span>
                                )}
                                {cost.gold > 0 && (
                                  <span className={state.duckGold >= cost.gold ? 'text-amber-200' : 'text-rose-400'}>
                                    {cost.gold} ذهب
                                  </span>
                                )}
                                {cost.medals > 0 && (
                                  <span className={state.stats.medals >= cost.medals ? 'text-emerald-300' : 'text-rose-400'}>
                                    {cost.medals} ميدالية
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            disabled={!canAfford}
                            onClick={() => onUpgradeSquadTalent(meta.key)}
                            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-black shrink-0 ${
                              maxed
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : canAfford
                                  ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {maxed ? 'مكتمل ✓' : 'ترقية'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {shopSection === 'FORGE' && (
                  <div className="space-y-2">
                    {RELIC_FORGE_CATALOG.map((offer) => {
                      const until =
                        offer.id === 'duel_fury'
                          ? buffs.duelFuryUntil
                          : offer.id === 'crit_edge'
                            ? buffs.critEdgeUntil
                            : offer.id === 'egg_surge'
                              ? buffs.eggSurgeUntil
                              : 0;
                      const hoursLeft = until > nowTs ? Math.ceil((until - nowTs) / 3600000) : 0;
                      const canAfford =
                        state.corn >= offer.cornCost &&
                        state.duckGold >= offer.goldCost &&
                        state.stats.medals >= offer.medalsCost &&
                        state.stars >= offer.starsCost;

                      return (
                        <div
                          key={offer.id}
                          className="rounded-2xl bg-[#161923] border border-slate-800 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2 text-xs font-black text-white">
                              <Hammer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate">{offer.nameAr}</span>
                              <span className="font-mono-num text-[10px] text-sky-300 shrink-0">
                                {hoursLeft > 0 ? `نشط (${hoursLeft}س)` : offer.durationLabel}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">{offer.descAr}</div>
                            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono-num text-[10px] font-bold">
                              {offer.cornCost > 0 && (
                                <span className={state.corn >= offer.cornCost ? 'text-amber-300' : 'text-rose-400'}>
                                  {offer.cornCost}⚡
                                </span>
                              )}
                              {offer.goldCost > 0 && (
                                <span className={state.duckGold >= offer.goldCost ? 'text-amber-200' : 'text-rose-400'}>
                                  {offer.goldCost} ذهب
                                </span>
                              )}
                              {offer.medalsCost > 0 && (
                                <span className={state.stats.medals >= offer.medalsCost ? 'text-emerald-300' : 'text-rose-400'}>
                                  {offer.medalsCost} ميدالية
                                </span>
                              )}
                              {offer.starsCost > 0 && (
                                <span className={state.stars >= offer.starsCost ? 'text-indigo-300' : 'text-rose-400'}>
                                  {offer.starsCost}★
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            disabled={!canAfford}
                            onClick={() => onForgeRelic(offer.id)}
                            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-black shrink-0 ${
                              canAfford
                                ? 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            صقل
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB: MEMBERS ROSTER + DIVIDEND DISTRIBUTION + TREASURES/BLESSINGS */}
            {subTab === 'ROSTER' && (
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
                    {/* Roster Actions Bar: Recruit + Leave Alliance (inline confirm) */}
                    <div className="rounded-2xl bg-[#161923] border border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-2">
                      <button
                        disabled={pack.members >= levelInfo.maxMembers || state.corn < 350}
                        onClick={() => {
                          soundFX.playTapFeed();
                          onRecruitAllianceMember();
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-[11px] flex items-center gap-1.5 ${
                          pack.members < levelInfo.maxMembers && state.corn >= 350
                            ? 'bg-emerald-500/20 border border-emerald-400/55 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer'
                            : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>تجنيد عضو جديد (+1) · 350⚡</span>
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

                    <div className="rounded-2xl bg-gradient-to-b from-[#1d192b] to-[#161923] border border-amber-500/35 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-400" />
                          <h3 className="text-xs sm:text-sm font-black text-white">سلم رتب ومناصب السرب</h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${rankMeta.colorClass}`}>
                          {rankMeta.roleKey === 'LEADER'
                            ? state.username
                            : `${rankMeta.rank} · ${rankMeta.titleAr}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                        {(['LEADER', 'DEPUTY', 'ELITE', 'MEMBER'] as AllianceMemberRole[]).map((roleKey) => {
                          const rm = ALLIANCE_ROLE_META[roleKey];
                          return (
                            <div
                              key={roleKey}
                              className="rounded-xl bg-slate-950/70 border border-slate-800 p-2 space-y-0.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-black text-white">
                                  {roleKey === 'LEADER' ? leaderName : rm.labelAr}
                                </span>
                                {roleKey !== 'LEADER' && (
                                  <span className="font-mono-num text-[9px] text-amber-300 font-bold">
                                    {rm.rankCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-slate-400 leading-tight">{rm.perkAr}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {sortedRoster.map((member, idx) => {
                        const roleStyle = ALLIANCE_ROLE_META[member.role];
                        const activityPct = Math.min(100, Math.max(0, member.dailyActivity));
                        const isLeader = member.role === 'LEADER';
                        const isConfirmingKick = confirmKickMemberId === member.id;

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
                                  {isLeader || idx === 0 ? (
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
                                    <span className={`px-1.5 py-0.5 rounded-md border text-[9.5px] font-black ${roleStyle.badgeClass}`}>
                                      {isLeader ? `القائد: ${member.name}` : member.titleAr}
                                    </span>
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        member.online ? 'bg-emerald-400' : 'bg-slate-600'
                                      }`}
                                    />
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    <span className="text-amber-300 font-bold">
                                      {isLeader ? member.name : member.rank}
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

                              {!member.isSelf && !isLeader && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    disabled={member.role === 'DEPUTY'}
                                    onClick={() => onPromoteDemoteMember(member.id, 'UP')}
                                    className={`px-2 py-1 rounded-lg border text-[9.5px] font-black flex items-center gap-0.5 ${
                                      member.role !== 'DEPUTY'
                                        ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/25 cursor-pointer'
                                        : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                    }`}
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                    <span>ترقية</span>
                                  </button>
                                  <button
                                    disabled={member.role === 'MEMBER'}
                                    onClick={() => onPromoteDemoteMember(member.id, 'DOWN')}
                                    className={`px-2 py-1 rounded-lg border text-[9.5px] font-black flex items-center gap-0.5 ${
                                      member.role !== 'MEMBER'
                                        ? 'bg-amber-500/15 border-amber-400/50 text-amber-200 hover:bg-amber-500/25 cursor-pointer'
                                        : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                    }`}
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                    <span>خفض</span>
                                  </button>
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
                                      onClick={() => setConfirmKickMemberId(member.id)}
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
                            <p className="text-[10px] text-slate-300">
                              يموَّل تلقائياً من التبرعات والزعيم والحشود وخراج الأهرام.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            onSendQuickAllianceInvite(
                              `💰 صندوق توزيع مكافآت الدورة #${dividendBreakdown.pool.cycleNumber} متاح (${dividendBreakdown.pool.corn.toLocaleString()}⚡ · ${dividendBreakdown.pool.allianceCoins.toLocaleString()}🪙 · ${dividendBreakdown.pool.stars}★)!`,
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

                      <div className="grid grid-cols-4 gap-1.5 text-center font-mono-num">
                        <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5">
                          <div className="text-[9.5px] text-slate-400">طاقة</div>
                          <div className="text-xs font-black text-emerald-300">
                            {dividendBreakdown.pool.corn.toLocaleString()}⚡
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5">
                          <div className="text-[9.5px] text-slate-400">عملة السرب</div>
                          <div className="text-xs font-black text-amber-300">
                            {dividendBreakdown.pool.allianceCoins.toLocaleString()}🪙
                          </div>
                        </div>
                        <div className="rounded-xl bg-slate-950/80 border border-slate-800 py-1.5">
                          <div className="text-[9.5px] text-slate-400">نجوم</div>
                          <div className="text-xs font-black text-indigo-300">
                            {dividendBreakdown.pool.stars}★
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
                            جدارتك: <span className="text-amber-300">{dividendBreakdown.playerShare.meritScore.toLocaleString()}</span> · نسبتك:{' '}
                            <span className="text-emerald-300">{dividendBreakdown.playerShare.sharePct}%</span>
                          </div>
                          <div className="text-[10px] text-emerald-300 font-bold">
                            حصتك: +{dividendBreakdown.playerShare.cornShare.toLocaleString()}⚡ · +{dividendBreakdown.playerShare.coinsShare}🪙 · +{dividendBreakdown.playerShare.starsShare}★ · +{dividendBreakdown.playerShare.goldShare}💎
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
                    <div className="rounded-2xl bg-[#161923] border border-slate-800 p-3 space-y-2">
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
                                <span className="text-amber-300 font-black">{m.meritScore.toLocaleString()}</span>
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
                    </div>

                    {/* Collapsible Formula Architecture Guide */}
                    <div className="rounded-2xl bg-[#161923] border border-cyan-500/35 overflow-hidden">
                      <button
                        onClick={() => setShowFormulaGuide((v) => !v)}
                        className="w-full p-3 flex items-center justify-between gap-2 text-right cursor-pointer hover:bg-slate-900/50"
                      >
                        <div className="flex items-center gap-1.5">
                          <Network className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-black text-white">
                            معادلات حساب الأرصدة والترابط وتوزيع المكافآت
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            showFormulaGuide ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {showFormulaGuide && (
                        <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                          <div className="rounded-xl bg-slate-950/75 border border-slate-800 p-2.5 space-y-1">
                            <div className="font-black text-amber-300">1. حساب مستوى التحالف</div>
                            <p className="text-slate-300 leading-relaxed">
                              الخبرة للمستوى = <span className="font-mono-num text-cyan-300">100,000 × 2^(Lv-1)</span>.
                              كل ترقية تمنح +2 عضو، +95,000⚡ سعة خزينة، +3% غنائم، و+2% قوة.
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-950/75 border border-slate-800 p-2.5 space-y-1">
                            <div className="font-black text-rose-300">2. الترابط مع التنانين والأبحاث</div>
                            <p className="text-slate-300 leading-relaxed">
                              تنانينك تقود حشود الخريطة وتضرب الزعيم، وأبحاث السرب تبدأ من 100,000 نقطة وتتضاعف ×2 كل مستوى.
                            </p>
                          </div>
                          <div className="rounded-xl bg-slate-950/75 border border-slate-800 p-2.5 space-y-1 sm:col-span-2">
                            <div className="font-black text-emerald-300">3. معادلة توزيع المكافآت</div>
                            <p className="text-slate-300 leading-relaxed font-mono-num">
                              الجدارة = (طاقة×0.04 + نقاط بحث×0.25 + حشد وزعيم×0.8 + نشاط×25) × معامل الرتبة (R5 ×1.25 · R4 ×1.15 · R3 ×1.08 · R1 ×1.00).
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {rosterSection === 'BLESSINGS' && (
                  <div className="space-y-4">
                    {/* Treasure Race */}
                    <div className="rounded-2xl bg-[#161923] border border-slate-800 p-3 space-y-2.5">
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
                    </div>

                    {/* Blessings Carousel */}
                    {currentGod && (
                      <div className="rounded-2xl bg-[#161923] border border-amber-400/30 p-3 space-y-3">
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ================================================================ */}
      {/* MODAL 1: RALLY DETAILS MODAL (تفاصيل الحشد + تسريع المسير + تنانين الأعضاء) */}
      {/* ================================================================ */}
      {showRallyDetailsModal && activeRally && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4"
          onClick={() => setShowRallyDetailsModal(false)}
        >
          <div
            className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl bg-[#141824] border border-rose-400/50 p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-black text-white flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-rose-400" />
                  <span>تفاصيل الحشد: {activeRally.targetNameAr}</span>
                </div>
                <div className="text-[10.5px] font-mono-num text-slate-300">
                  الإحداثيات ({activeRally.coords.x}, {activeRally.coords.y}) · غنائم ×{activeRally.lootMultiplier} · قوة فعالة{' '}
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

            {/* Live March Progress Track on Map */}
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
                  style={{ right: `clamp(0px, calc(${activeMarchPct}% - 12px), calc(100% - 24px))` }}
                  className="absolute w-6 h-6 rounded-full bg-emerald-400 border-2 border-slate-950 flex items-center justify-center shadow"
                >
                  <Rocket className="w-3 h-3 text-slate-950" />
                </div>
              </div>

              {/* Speed Boost Controls */}
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

            {/* Dispatch Your Remaining Dragons to This Mission */}
            {(() => {
              const selfParticipant = activeRally.participants.find((pt) => pt.id === 'player_self');
              const sentDragonIds = new Set((selfParticipant?.dragons ?? []).map((dr) => dr.id));
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
                          <div className="text-[9.5px] font-black text-white truncate">{duck.name}</div>
                          <div className="text-[9px] text-slate-400 font-mono-num">Lv.{duck.level}</div>
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

            {/* Alliance Members & Their Sent Dragons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-white">
                  الأعضاء المشاركون وتنانينهم ({activeRally.participants.length}/{activeRally.maxSlots})
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
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-black ${rm.badgeClass}`}>
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

      {/* ================================================================ */}
      {/* MODAL 2: ALLIANCE LEVEL PERKS MODAL (عند الضغط على شعار المستوى بجانب الاسم) */}
      {/* ================================================================ */}
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

                    <p className="text-[10.5px] font-bold text-emerald-300">{perk.unlockedFeatureAr}</p>
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

      {/* ================================================================ */}
      {/* MODAL 3: LEADER ALLIANCE IDENTITY & EMBLEM EDITOR MODAL */}
      {/* ================================================================ */}
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
                <h3 className="text-sm font-black text-white">تخصيص اسم وشعار السرب</h3>
              </div>
              <button
                onClick={() => setShowIdentityModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block space-y-1">
                <span className="text-[11px] font-black text-slate-300">اسم التحالف (السرب)</span>
                <input
                  type="text"
                  maxLength={32}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-black text-slate-300">شعار ووصف السرب</span>
                <input
                  type="text"
                  maxLength={72}
                  value={draftMotto}
                  onChange={(e) => setDraftMotto(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-black text-slate-300">اختر راية وشعار السرب:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALLIANCE_EMBLEM_CATALOG.map((emb) => {
                  const selected = draftEmblem === emb.id;
                  return (
                    <button
                      key={emb.id}
                      onClick={() => {
                        soundFX.playTapFeed();
                        setDraftEmblem(emb.id);
                      }}
                      className={`rounded-2xl p-2 border text-center space-y-1 cursor-pointer transition-all ${
                        selected
                          ? 'bg-amber-400/20 border-amber-400 ring-1 ring-amber-300'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'
                      }`}
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

            {/* Alliance Join Conditions Config */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-amber-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>شروط الانضمام للسرب</span>
                </span>
                <button
                  onClick={() =>
                    setDraftConditions((prev) => ({ ...prev, autoAccept: !prev.autoAccept }))
                  }
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer ${
                    draftConditions.autoAccept
                      ? 'bg-emerald-500/25 border border-emerald-400/60 text-emerald-200'
                      : 'bg-slate-800 border border-slate-700 text-slate-300'
                  }`}
                >
                  {draftConditions.autoAccept ? 'قبول فوري: مفعّل' : 'قبول فوري: يدوي'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">أقل قوة</span>
                  <input
                    type="number"
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
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-num"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">أقل عدد تنانين</span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={draftConditions.minDragons}
                    onChange={(e) =>
                      setDraftConditions((p) => ({
                        ...p,
                        minDragons: Math.max(1, Math.min(8, Number(e.target.value) || 1)),
                      }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-num"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">مستوى التنين</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={draftConditions.minDragonLevel}
                    onChange={(e) =>
                      setDraftConditions((p) => ({
                        ...p,
                        minDragonLevel: Math.max(1, Math.min(5, Number(e.target.value) || 1)),
                      }))
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-num"
                  />
                </label>
              </div>
            </div>

            <button
              onClick={() => {
                onUpdateAllianceIdentity(draftName, draftMotto, draftEmblem);
                onUpdateJoinConditions(draftConditions);
                setShowIdentityModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-black text-xs hover:brightness-105 cursor-pointer shadow"
            >
              حفظ الاسم والشعار وشروط الانضمام
            </button>

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

      {/* ================================================================ */}
      {/* MODAL 4: SMART NOTIFICATIONS MODAL */}
      {/* ================================================================ */}
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
                        setSubTab(notif.targetSubTab);
                        if (notif.targetSubTab === 'ROSTER') setRosterSection('DIVIDENDS');
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
    </div>
  );
};
