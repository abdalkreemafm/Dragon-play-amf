import { AllianceRallyDragon, Duck, EggItemType, GameState, GridCell } from '../types/game';
import { getFeedCost } from '../data/gameData';
import {
  appendAllianceLog,
  appendAllianceNotification,
  applySoftCapDamping,
  getAllianceLevelInfo,
  getEnergyHardCap,
  getEnergySoftCap,
  getLevelRequiredFeeds,
  getPlayerTier,
} from '../utils/economyEngine';

export function withEarnedEnergy(
  prev: GameState,
  rawGain: number,
  bypassSoftCap = false
): { corn: number; finalGain: number; damped: boolean; treasury: GameState['treasury'] } {
  if (rawGain <= 0) {
    return { corn: prev.corn, finalGain: 0, damped: false, treasury: prev.treasury };
  }
  const softCap = getEnergySoftCap(getPlayerTier(prev));
  const res = bypassSoftCap
    ? { finalGain: Math.max(1, Math.round(rawGain)), damped: false }
    : applySoftCapDamping(rawGain, prev.corn, softCap, prev.treasury.energyEarnedToday ?? 0);
  return {
    corn: prev.corn + res.finalGain,
    finalGain: res.finalGain,
    damped: res.damped,
    treasury: {
      ...prev.treasury,
      energyEarnedToday: (prev.treasury.energyEarnedToday ?? 0) + res.finalGain,
    },
  };
}

export function withBurnedEnergy(treasury: GameState['treasury'], cost: number): GameState['treasury'] {
  if (cost <= 0) return treasury;
  return {
    ...treasury,
    energyBurnedToday: (treasury.energyBurnedToday ?? 0) + cost,
  };
}

export function withEarnedStars(treasury: GameState['treasury'], amount: number): GameState['treasury'] {
  if (amount <= 0) return treasury;
  return {
    ...treasury,
    starsEarnedToday: (treasury.starsEarnedToday ?? 0) + amount,
  };
}

export function withBurnedStars(treasury: GameState['treasury'], amount: number): GameState['treasury'] {
  if (amount <= 0) return treasury;
  return {
    ...treasury,
    starsBurnedToday: (treasury.starsBurnedToday ?? 0) + amount,
  };
}

export function applyAllianceXpAndLevelNotification(
  pack: GameState['pack'],
  addedXp: number
): GameState['pack'] {
  const prevXp = pack.xp ?? 2250;
  const prevInfo = getAllianceLevelInfo(prevXp);
  const nextXp = prevXp + Math.max(0, Math.round(addedXp));
  const nextInfo = getAllianceLevelInfo(nextXp);
  let nextPack: GameState['pack'] = {
    ...pack,
    xp: nextXp,
    level: nextInfo.level,
  };
  if (nextInfo.level > prevInfo.level) {
    nextPack = {
      ...nextPack,
      notifications: appendAllianceNotification(nextPack.notifications, {
        category: 'LEVEL_UP',
        titleAr: `ارتقى السرب إلى المستوى Lv.${nextInfo.level}!`,
        bodyAr: `سعة الأعضاء ${nextInfo.maxMembers} · علاوة الغنائم +${nextInfo.levelLootBonusPct}% · سعة الخزينة ${nextInfo.vaultCapacity.toLocaleString()}⚡.`,
        targetSubTab: 'HQ',
        inviteText: `🎉 مبروك لأبطال السرب! ارتقينا للمستوى Lv.${nextInfo.level} (+${nextInfo.levelLootBonusPct}% غنائم و +${nextInfo.powerBonusPct}% قوة جماعية)!`,
      }),
      logs: appendAllianceLog(nextPack.logs, {
        type: 'COOP',
        actor: 'إدارة السرب',
        message: `ارتقى تحالف ${nextPack.packName} رسمياً إلى المستوى Lv.${nextInfo.level}!`,
      }),
    };
  }
  return nextPack;
}

export function createFallbackStarterDragon(playerTier = 1): Duck {
  return {
    id: `duck_starter_${Date.now()}`,
    name: 'تنين البداية المائي',
    skin: 'aqua',
    rarity: 'COMMON',
    level: 1,
    maxLevel: 5,
    customLevel: 0,
    dmd: 0,
    dmdStored: 0,
    slotIndex: 0,
    feedCost: getFeedCost(1, 'COMMON', playerTier, 0),
    feedsProgress: 0,
    feedsRequired: getLevelRequiredFeeds(1),
    feedClicksSinceReset: 0,
    costResetEndsAt: null,
    levelFeedsCompleted: false,
    breedingEndsAt: null,
    breedingNextLevel: null,
    lastBreedingEggAt: null,
    staked: false,
    stakeRatePerHour: 0,
    sizeTier: 'NORMAL',
    skillLevel: 1,
    trainingLevel: 0,
    powerRating: 130,
    unlockedAt: Date.now(),
  };
}

export function fillGridFromQueue(
  grid: GridCell[],
  eggQueue: EggItemType[]
): { grid: GridCell[]; eggQueue: EggItemType[]; placedCount: number } {
  if (eggQueue.length === 0) return { grid, eggQueue, placedCount: 0 };
  const emptyIndices = grid.filter((c) => !c.locked && c.item === null).map((c) => c.index);
  const count = Math.min(emptyIndices.length, eggQueue.length);
  if (count === 0) return { grid, eggQueue, placedCount: 0 };
  const placedMap = new Map<number, EggItemType>();
  for (let i = 0; i < count; i++) {
    placedMap.set(emptyIndices[i], eggQueue[i]);
  }
  return {
    grid: grid.map((c) =>
      placedMap.has(c.index) ? { ...c, item: placedMap.get(c.index) ?? null, justMerged: true } : c
    ),
    eggQueue: eggQueue.slice(count),
    placedCount: count,
  };
}

export function computeDragonRallyPower(duck: Duck, phalanxLv: number): number {
  const base = Math.max(85, duck.powerRating ?? 100);
  const raw = Math.round(base * 14 + duck.level * 480 + (duck.customLevel ?? 0) * 180);
  return Math.round(raw * (1 + phalanxLv * 0.06));
}

export function toRallyDragon(duck: Duck, phalanxLv: number): AllianceRallyDragon {
  return {
    id: duck.id,
    name: duck.name,
    skin: duck.skin,
    rarity: duck.rarity,
    level: duck.level,
    power: computeDragonRallyPower(duck, phalanxLv),
  };
}

export function formatEarnedSummary(parts: {
  corn?: number;
  stars?: number;
  gold?: number;
  coins?: number;
  dmd?: number;
}): string {
  const tokens: string[] = [];
  if (parts.corn && parts.corn > 0) tokens.push(`+${parts.corn.toLocaleString()}⚡`);
  if (parts.coins && parts.coins > 0) tokens.push(`+${parts.coins.toLocaleString()}🪙`);
  if (parts.stars && parts.stars > 0) tokens.push(`+${parts.stars.toLocaleString()}★`);
  if (parts.gold && parts.gold > 0) tokens.push(`+${parts.gold.toLocaleString()}💎`);
  if (parts.dmd && parts.dmd > 0) tokens.push(`+${parts.dmd.toFixed(2)} AMF`);
  return tokens.join(' · ');
}
