import {
  AllianceEmblemId,
  AllianceJoinConditions,
  AllianceTechId,
  AllianceVisibility,
  DuckAuraId,
  DuckGearId,
  DuckSkinId,
  GameState,
  Rarity,
  RewardBundle,
  SquadTalentKey,
  SwarmDragonGearSlot,
  SwarmDragonUpgradeKey,
} from '../types/game';
import type {
  AllianceCoopMissionMeta,
  AllianceDonationKind,
  AllianceQuestMeta,
  AllianceShopOffer,
  RelicForgeOffer,
} from '../utils/economyEngine';

export type SoundEffectKind =
  | 'tapFeed'
  | 'levelUp'
  | 'godConfirm'
  | 'chestOpen'
  | 'claim'
  | 'tabSwitch'
  | 'victory'
  | 'critHit'
  | 'error'
  | { mergeTier: number };

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export interface CentralActionReceipt {
  ok: boolean;
  stateChanged: boolean;
  message?: string;
  actualCornDelta?: number;
  actualStarsDelta?: number;
  actualGoldDelta?: number;
  actualDmdDelta?: number;
  sound?: SoundEffectKind;
  haptic?: HapticKind;
  blitzEndsAt?: number;
  timedBonusReadyAt?: number;
  extraChestReadyAt?: number;
  extra?: Record<string, unknown>;
}

export interface CentralActionContext {
  nowTs: number;
  blitzSecLeft: number;
  effectiveCurrentUid: string | null;
}

export interface CentralActionOutcome {
  nextState: GameState;
  receipt: CentralActionReceipt;
}

export type CentralGameAction =
  // Dragon actions
  | { type: 'SELECT_DUCK'; index: number }
  | { type: 'FEED_DUCK'; duckId: string; comboMultiplier?: number; isCrit?: boolean }
  | { type: 'START_BREEDING'; duckId: string }
  | { type: 'UPGRADE_XL_EGGS'; duckId: string }
  | { type: 'UPGRADE_STAR_CUSTOMIZATION'; duckId: string; steps?: number }
  | { type: 'UPGRADE_DUCK_SKILL'; duckId: string }
  | { type: 'TRAIN_DRAGON'; duckId: string }
  | { type: 'UPGRADE_SQUAD_TALENT'; talentKey: SquadTalentKey }
  | { type: 'FORGE_RELIC'; offerId: RelicForgeOffer['id'] }
  | { type: 'UNLOCK_DRAGON_SLOT'; slotIndex: number }
  | { type: 'ASSIGN_DRAGON_SLOT'; duckId: string; slotIndex: number }
  | { type: 'MERGE_DUCKS'; duckIds: string[] }
  | { type: 'CUSTOMIZE_DUCK'; duckId: string; gear: DuckGearId; aura: DuckAuraId }
  | { type: 'CHANGE_DRAGON_SKIN'; duckId: string; skin: DuckSkinId }
  | { type: 'CLAIM_TIMED_BONUS' }
  | { type: 'CLAIM_EXTRA_CHEST' }
  | { type: 'CLAIM_BEST_TASK' }
  // Eggs & Temple actions
  | { type: 'MERGE_CELLS'; fromIndex: number; toIndex: number }
  | { type: 'START_BLITZ' }
  | { type: 'AUTO_MERGE_BOARD' }
  | { type: 'USE_HAMMER_CELL'; cellIndex: number }
  | { type: 'PLACE_QUEUED_EGG'; targetIndex?: number }
  | { type: 'PLACE_ALL_QUEUED_EGGS' }
  | { type: 'DELIVER_TO_GOD'; orderId: string; cellIndex?: number }
  | { type: 'OPEN_SNACK_CHEST'; cellIndex: number; earlyOpen?: boolean }
  | { type: 'UNLOCK_GRID_SLOT'; cellIndex: number }
  | { type: 'SELL_GRID_ITEM'; cellIndex: number }
  | { type: 'SELL_QUEUED_EGG'; queueIndex: number }
  // Alliance actions (local deterministic transitions; online RPC handled cleanly in controller)
  | { type: 'DONATE_ALLIANCE'; kind: AllianceDonationKind; lastDonateAt: number }
  | { type: 'FUND_ALLIANCE_TECH'; techId: AllianceTechId; mode: 'ENERGY_SMALL' | 'ENERGY_CONVOY' | 'POOL' }
  | { type: 'CONVERT_BLESSING_TO_RESEARCH'; godId: string; targetTechId: AllianceTechId }
  | { type: 'START_ALLIANCE_RESEARCH'; techId: AllianceTechId }
  | { type: 'SPEEDUP_ALLIANCE_RESEARCH'; mode: 'FREE' | 'GOLD_6H' | 'GOLD_24H' }
  | {
      type: 'UPDATE_ALLIANCE_IDENTITY_LOCAL';
      packName: string;
      motto: string;
      emblemId: AllianceEmblemId;
      visibility?: AllianceVisibility;
    }
  | { type: 'UPDATE_JOIN_CONDITIONS_LOCAL'; joinConditions: AllianceJoinConditions }
  | { type: 'START_ALLIANCE_RALLY'; targetId: string; prepMinutes: number; selectedDragonIds?: string[] }
  | { type: 'DISPATCH_DRAGON_TO_RALLY'; dragonId: string }
  | { type: 'REINFORCE_RALLY'; mode: 'ALLY_CALL' | 'SELF_BOOST' }
  | { type: 'SPEEDUP_RALLY'; mode: 'ALLY_HELP' | 'RESOURCE_BOOST' | 'FAST_MARCH' }
  | { type: 'RESOLVE_ALLIANCE_RALLY' }
  | { type: 'HARVEST_OCCUPIED_SITE'; targetId: string }
  | { type: 'MARK_NOTIFICATION_READ'; notifId: string | 'ALL' }
  | {
      type: 'SEND_QUICK_ALLIANCE_INVITE';
      text: string;
      actionSubTab?: 'HQ' | 'MAP' | 'RESEARCH' | 'MISSIONS' | 'ROSTER';
      actionLabel?: string;
    }
  | { type: 'DISTRIBUTE_ALLIANCE_DIVIDENDS' }
  | { type: 'HELP_ALLIES' }
  | { type: 'ALLIANCE_BREED_SPEEDUP' }
  | { type: 'ATTACK_ALLIANCE_BOSS' }
  | { type: 'SUPPORT_COOP_GOAL'; coopId: AllianceCoopMissionMeta['id'] }
  | { type: 'CLAIM_COOP_GOAL'; coopId: AllianceCoopMissionMeta['id'] }
  | { type: 'DONATE_DRAGON_TO_SWARM'; dragonId: string }
  | { type: 'TRAIN_SWARM_DRAGON' }
  | { type: 'UPGRADE_SWARM_SKILL'; key: SwarmDragonUpgradeKey }
  | { type: 'UPGRADE_SWARM_GEAR'; slot: SwarmDragonGearSlot }
  | { type: 'SELECT_SWARM_SKIN'; skin: DuckSkinId }
  | { type: 'CLAIM_ALLIANCE_QUEST'; questId: AllianceQuestMeta['id'] }
  | { type: 'CLAIM_ACTIVITY_CHEST'; threshold: number }
  | { type: 'CLAIM_ALLIANCE_GIFT'; giftId: string }
  | { type: 'CLAIM_ALL_ALLIANCE_GIFTS' }
  | { type: 'BUY_ALLIANCE_SHOP_OFFER'; offerId: AllianceShopOffer['id'] }
  | { type: 'CONTRIBUTE_PACK_LEGACY'; amount: number }
  | { type: 'APPEND_PACK_CHAT_LOCAL'; text: string }
  | { type: 'LEAVE_PACK_LOCAL' }
  // Arena, Store, Tasks & System actions
  | { type: 'SPEND_ARENA_ENTRY'; cost: number }
  | { type: 'REFUND_ARENA_ENTRY'; amount: number }
  | {
      type: 'BATTLE_RESULT';
      won: boolean;
      rewardCorn: number;
      rewardStars: number;
      leaguePts: number;
      xp: number;
      gold: number;
      rewardMedals?: number;
    }
  | {
      type: 'RACE_RESULT';
      place: number;
      rewardCorn: number;
      rewardStars: number;
      leaguePts: number;
      xp: number;
    }
  | { type: 'CLAIM_DAILY_LEAGUE' }
  | { type: 'ROTATE_WEEKEND_EVENT' }
  | { type: 'ACTIVATE_GOD'; godId: string; payWith: 'gold' | 'stars' }
  | { type: 'BUY_STORE_PACKAGE'; packageId: string }
  | { type: 'WATCH_REWARDED_AD'; kind: 'energy' | 'stars' | 'eggs' }
  | { type: 'SELL_OWN_DRAGON'; duckId: string; cornPrice: number }
  | { type: 'BARTER_TRADE'; tradeType: 'CORN_TO_STARS' | 'STARS_TO_CORN' | 'CORN_TO_GOLD' }
  | { type: 'BUY_TRADER_DEAL' }
  | { type: 'CLAIM_DAILY_TASK'; taskId: string }
  | { type: 'CLAIM_DAILY_LEVEL_REWARD'; rewardId: number; cornReward: number; eggsReward: number }
  | { type: 'CLAIM_DAILY_PASS_DAY' }
  | { type: 'UNLOCK_BATTLE_PASS_PREMIUM' }
  | { type: 'CLAIM_BATTLE_PASS_REWARD'; level: number; track: 'FREE' | 'PREMIUM' }
  | { type: 'CLAIM_TOURNAMENT_MILESTONE'; scoreThreshold: number }
  | { type: 'CLAIM_TREASURE_STEP'; threshold: number; stepNumber: number }
  | { type: 'CLAIM_HONOR_PACK'; packId: string }
  | { type: 'CLAIM_ACHIEVEMENT'; id: string }
  | { type: 'CLAIM_HEART_MILESTONE'; threshold: number }
  | { type: 'CLAIM_SOCIAL'; id: string }
  | { type: 'INVITE_FRIEND_SIM'; premium?: boolean }
  | { type: 'INSTANT_SUMMON_DRAGON'; rarity: 'UNCOMMON' | 'RARE' }
  | { type: 'FLIP_COIN'; packId: string }
  | { type: 'SPIN_WHEEL_PREPARE'; mega: boolean }
  | { type: 'SPIN_WHEEL_COMMIT'; bundle: RewardBundle; label: string }
  | { type: 'REDEEM_PROMO'; code: string }
  | { type: 'TOGGLE_WALLET_CONNECT' }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'TOGGLE_HAPTICS' }
  | { type: 'TOGGLE_DRAGON_MOTION' };
