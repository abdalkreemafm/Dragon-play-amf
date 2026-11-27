import { Duck, EggItemType, GameState, GridCell } from '../types/game';
import {
  EGG_GRID_INITIAL_UNLOCKED,
  EGG_GRID_TOTAL_SLOTS,
  RARITY_STYLE,
  createInitialGameState,
  getFeedCost,
} from '../data/gameData';
import {
  ECONOMY_LIMITS,
  clampCustomLevel,
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
  getFirstUnlockedDragonIndex,
  getLevelRequiredFeeds,
  getPlayerTier,
  isDragonSlotLocked,
  normalizeDragonSlots,
  resolveDragonSize,
  syncDailyEconomyState,
} from '../utils/economyEngine';
import { getTelegramUser } from '../utils/telegram';
import { createFallbackStarterDragon, fillGridFromQueue } from './economyHelpers';

export const STORAGE_KEY = 'dragon_dmd_save_v1';

function enforceSingleSupplyChest(grid: GridCell[]): GridCell[] {
  const chestIndices = grid.filter((c) => !c.locked && c.item === 'chest').map((c) => c.index);
  if (chestIndices.length === 1) {
    // Also make sure no locked cell holds a chest
    return grid.some((c) => c.locked && c.item === 'chest')
      ? grid.map((c) => (c.locked && c.item === 'chest' ? { ...c, item: null } : c))
      : grid;
  }
  const keepIndex =
    chestIndices.includes(18)
      ? 18
      : chestIndices.length > 0
        ? chestIndices[0]
        : grid.find((c) => !c.locked && c.index === 18)?.index ??
          grid.find((c) => !c.locked && c.item === null)?.index ??
          18;

  return grid.map((c) => {
    if (c.index === keepIndex) {
      return { ...c, locked: false, item: 'chest' };
    }
    if (c.item === 'chest') {
      return { ...c, item: null };
    }
    return c;
  });
}

export function migrateGridTo30Slots(
  savedGrid: GridCell[],
  savedQueue: EggItemType[]
): { grid: GridCell[]; eggQueue: EggItemType[] } {
  const openIndices = new Set([6, 7, 8, 11, 12, 13, 16, 17, 18]);
  const cleanQueue = savedQueue.filter((item) => item !== 'chest');

  if (savedGrid.length === EGG_GRID_TOTAL_SLOTS) {
    const normalizedGrid = enforceSingleSupplyChest(savedGrid);
    return fillGridFromQueue(normalizedGrid, cleanQueue);
  }

  const existingItems = savedGrid
    .map((c) => c.item)
    .filter((item): item is EggItemType => Boolean(item) && item !== 'chest');

  const nextGrid: GridCell[] = Array.from({ length: EGG_GRID_TOTAL_SLOTS }, (_, index) => {
    const locked = !openIndices.has(index);
    const item = !locked && index === 18 ? 'chest' : !locked ? existingItems.shift() ?? null : null;
    return { index, locked, item };
  });

  const overflow = [...existingItems, ...cleanQueue];
  const filled = fillGridFromQueue(nextGrid, overflow);
  return { grid: enforceSingleSupplyChest(filled.grid), eggQueue: filled.eggQueue };
}

export function loadSavedState(): { state: GameState; hasSave: boolean; offlineDmdEarned: number } {
  const defaults = createInitialGameState();
  const tgUser = getTelegramUser();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameState>;
      if (parsed && Array.isArray(parsed.ducks) && Array.isArray(parsed.grid)) {
        const unlockedSlots = parsed.unlockedSlots ?? 3;
        const schemaVer = parsed.schemaVersion ?? 1;
        const nowTs = Date.now();
        const tier = getPlayerTier({
          ducks: parsed.ducks,
          unlockedSlots,
        });
        let legacyDmdFolded = 0;
        let offlineBreedingEggs = 0;

        const migratedDragons: Duck[] = parsed.ducks.map((d) => {
          const rawCustom = d.customLevel ?? 0;
          const migratedCustom =
            schemaVer < 3 && rawCustom > ECONOMY_LIMITS.MAX_CUSTOM_STAR_LEVEL
              ? Math.min(9, Math.floor(rawCustom / 10))
              : clampCustomLevel(rawCustom);

          let level = Math.max(1, Math.min(5, d.level ?? 1));
          let feedsRequired = getLevelRequiredFeeds(level);
          let feedsProgress =
            schemaVer < 3 && (d.feedsRequired ?? 0) > 0 && (d.feedsRequired ?? 0) !== feedsRequired
              ? Math.min(feedsRequired, Math.round(((d.feedsProgress ?? 0) / d.feedsRequired) * feedsRequired))
              : Math.min(feedsRequired, d.feedsProgress ?? 0);

          let feedClicksSinceReset = d.feedClicksSinceReset ?? 0;
          let costResetEndsAt = d.costResetEndsAt ?? null;
          if (costResetEndsAt && nowTs >= costResetEndsAt) {
            costResetEndsAt = null;
            feedClicksSinceReset = 0;
          }

          let breedingEndsAt = d.breedingEndsAt ?? null;
          let breedingNextLevel = d.breedingNextLevel ?? null;
          let lastBreedingEggAt = d.lastBreedingEggAt ?? null;
          let powerRating = d.powerRating ?? RARITY_STYLE[d.rarity].basePower + level * 20;

          if (breedingEndsAt) {
            const anchor = lastBreedingEggAt ?? breedingEndsAt - ECONOMY_LIMITS.BREEDING_DURATION_MS;
            const effectiveEnd = Math.min(nowTs, breedingEndsAt);
            const eggsEarned = Math.max(
              0,
              Math.floor((effectiveEnd - anchor) / ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS)
            );
            offlineBreedingEggs += eggsEarned;
            lastBreedingEggAt = anchor + eggsEarned * ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS;

            if (nowTs >= breedingEndsAt) {
              const nextLv = Math.min(5, breedingNextLevel ?? level + 1);
              powerRating += 30 + nextLv * 15;
              level = nextLv;
              feedsRequired = getLevelRequiredFeeds(nextLv);
              feedsProgress = 0;
              feedClicksSinceReset = 0;
              costResetEndsAt = null;
              breedingEndsAt = null;
              breedingNextLevel = null;
              lastBreedingEggAt = null;
            }
          }

          const sizeTier = resolveDragonSize(d);
          legacyDmdFolded += d.dmdStored ?? 0;

          return {
            ...d,
            level,
            maxLevel: 5,
            customLevel: migratedCustom,
            dmdStored: 0,
            staked: false,
            stakeRatePerHour: 0,
            sizeTier,
            xl: sizeTier !== 'NORMAL',
            feedsProgress,
            feedsRequired,
            feedClicksSinceReset,
            costResetEndsAt,
            levelFeedsCompleted: feedsProgress >= feedsRequired,
            breedingEndsAt,
            breedingNextLevel,
            lastBreedingEggAt,
            feedCost: getFeedCost(level, d.rarity ?? 'COMMON', tier, feedClicksSinceReset, {
              sizeTier,
              xl: sizeTier !== 'NORMAL',
            }),
            skillLevel: d.skillLevel ?? 1,
            trainingLevel: d.trainingLevel ?? 0,
            powerRating,
          };
        });

        const safeDragons =
          migratedDragons.length > 0 ? migratedDragons : [createFallbackStarterDragon(tier)];
        const normalizedDragons = normalizeDragonSlots(safeDragons, unlockedSlots);
        const syncedGodCards = (parsed.godCards ?? defaults.godCards).map((g) =>
          g.godKey === 'harvest'
            ? {
                ...g,
                subtitle: 'توفير 20% طاقة إطعام',
                bonusDesc: 'يخفض تكلفة الإطعام بنسبة 20% مع ضمان حرق صافي لا يقل عن 80% في كل نقرة.',
              }
            : g
        );
        const resolvedUsername =
          parsed.username && parsed.username !== 'DRAGON_TAMER'
            ? parsed.username
            : tgUser?.displayName || defaults.username;

        const migratedBoard = migrateGridTo30Slots(parsed.grid, parsed.eggQueue ?? []);

        return {
          state: syncDailyEconomyState({
            ...defaults,
            ...parsed,
            schemaVersion: 3,
            username: resolvedUsername,
            hapticsEnabled: parsed.hapticsEnabled ?? true,
            dragonMotionEnabled: parsed.dragonMotionEnabled ?? true,
            dmdTotal: (parsed.dmdTotal ?? 0) + legacyDmdFolded,
            breedingEggs: (parsed.breedingEggs ?? 0) + offlineBreedingEggs,
            customizedVault: parsed.customizedVault ?? [],
            ducks: normalizedDragons,
            godCards: syncedGodCards,
            unlockedSlots,
            grid: migratedBoard.grid,
            eggQueue: migratedBoard.eggQueue,
            activeDuckIndex: (() => {
              const clamped = Math.min(
                parsed.activeDuckIndex ?? 0,
                Math.max(0, normalizedDragons.length - 1)
              );
              return isDragonSlotLocked(normalizedDragons[clamped], unlockedSlots)
                ? getFirstUnlockedDragonIndex(normalizedDragons, unlockedSlots)
                : clamped;
            })(),
            treasury: {
              ...defaults.treasury,
              ...(parsed.treasury ?? {}),
              maxAdsPerDay: ECONOMY_LIMITS.MAX_DAILY_ADS,
              energyEarnedToday: parsed.treasury?.energyEarnedToday ?? 0,
              energyBurnedToday: parsed.treasury?.energyBurnedToday ?? 0,
              starsEarnedToday: parsed.treasury?.starsEarnedToday ?? 0,
              starsBurnedToday: parsed.treasury?.starsBurnedToday ?? 0,
              invitesClaimedToday: parsed.treasury?.invitesClaimedToday ?? 0,
            },
            pack: {
              ...defaults.pack,
              ...(parsed.pack ?? {}),
              emblemId: parsed.pack?.emblemId ?? 'dragon_shield',
              talents: {
                ...(defaults.pack.talents ?? { fury: 0, carapace: 0, incubation: 0, prestige: 0 }),
                ...(parsed.pack?.talents ?? {}),
              },
              questBaselines: parsed.pack?.questBaselines ?? {
                feeds: parsed.stats?.totalFeeds ?? 0,
                merges: parsed.stats?.totalMerges ?? 0,
                errands: parsed.stats?.totalErrands ?? 0,
              },
              gifts:
                parsed.pack?.gifts && parsed.pack.gifts.length > 0
                  ? parsed.pack.gifts
                  : defaults.pack.gifts,
              logs:
                parsed.pack?.logs && parsed.pack.logs.length > 0
                  ? parsed.pack.logs
                  : createInitialAllianceLogs(),
              coopProgress: {
                ...createInitialCoopProgress(),
                ...(parsed.pack?.coopProgress ?? {}),
              },
              claimedCoopGoals: parsed.pack?.claimedCoopGoals ?? [],
              memberRoles: {
                ...createInitialMemberRoles(),
                ...(parsed.pack?.memberRoles ?? {}),
              },
              kickedMemberIds: Array.isArray(parsed.pack?.kickedMemberIds)
                ? parsed.pack.kickedMemberIds
                : [],
              joinConditions: {
                ...createInitialJoinConditions(),
                ...(parsed.pack?.joinConditions ?? {}),
              },
              convertedBlessingIds: Array.isArray(parsed.pack?.convertedBlessingIds)
                ? parsed.pack.convertedBlessingIds
                : [],
              swarmDragon: parsed.pack?.swarmDragon
                ? {
                    ...createInitialSwarmDragonState(),
                    ...parsed.pack.swarmDragon,
                    upgrades: {
                      ...createInitialSwarmDragonState().upgrades,
                      ...(parsed.pack.swarmDragon.upgrades ?? {}),
                    },
                    gearLevels: {
                      ...createInitialSwarmDragonState().gearLevels,
                      ...(parsed.pack.swarmDragon.gearLevels ?? {}),
                    },
                  }
                : createInitialSwarmDragonState(),
              ledger: {
                ...createInitialAllianceLedger(),
                ...(parsed.pack?.ledger ?? {}),
              },
              techLevels: {
                ...createInitialTechLevels(),
                ...(parsed.pack?.techLevels ?? {}),
              },
              techFunding: {
                ...createInitialTechFunding(),
                ...(parsed.pack?.techFunding ?? {}),
              },
              activeResearch: parsed.pack?.activeResearch ?? null,
              activeRally: parsed.pack?.activeRally ?? null,
              occupiedSites: Array.isArray(parsed.pack?.occupiedSites)
                ? parsed.pack.occupiedSites
                : [],
              mapCooldowns: parsed.pack?.mapCooldowns ?? {},
              notifications:
                Array.isArray(parsed.pack?.notifications) && parsed.pack.notifications.length > 0
                  ? parsed.pack.notifications
                  : createInitialAllianceNotifications(),
              rewardPool: {
                ...createInitialRewardPool(),
                ...(parsed.pack?.rewardPool ?? {}),
              },
              lastDividendAt: parsed.pack?.lastDividendAt ?? 0,
            },
            activeBuffs: {
              ...(defaults.activeBuffs ?? { duelFuryUntil: 0, critEdgeUntil: 0, eggSurgeUntil: 0 }),
              ...(parsed.activeBuffs ?? {}),
            },
            league: { ...defaults.league, ...(parsed.league ?? {}) },
            battlePass: { ...defaults.battlePass, ...(parsed.battlePass ?? {}) },
            stats: { ...defaults.stats, ...(parsed.stats ?? {}) },
          }),
          hasSave: true,
          offlineDmdEarned: legacyDmdFolded,
        };
      }
    }
  } catch {
    // ignore corrupted save
  }
  const initialFilled = fillGridFromQueue(defaults.grid, defaults.eggQueue);
  return {
    state: {
      ...defaults,
      grid: initialFilled.grid,
      eggQueue: initialFilled.eggQueue,
      schemaVersion: 3,
      username: tgUser?.displayName || defaults.username,
    },
    hasSave: false,
    offlineDmdEarned: 0,
  };
}

export function writeCompactedSave(stateToSave: GameState): void {
  const compacted: GameState = {
    ...stateToSave,
    pack: {
      ...stateToSave.pack,
      logs: (stateToSave.pack.logs ?? []).slice(0, 45),
      messages: (stateToSave.pack.messages ?? []).slice(-35),
      notifications: (stateToSave.pack.notifications ?? []).slice(0, 20),
      swarmDragon: stateToSave.pack.swarmDragon
        ? {
            ...stateToSave.pack.swarmDragon,
            donations: (stateToSave.pack.swarmDragon.donations ?? []).slice(0, 35),
          }
        : undefined,
    },
    lastSavedAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted));
}
