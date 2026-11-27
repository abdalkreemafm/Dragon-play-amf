import { GameState } from '../types/game';
import { WEEKEND_EVENTS, getFeedCost } from '../data/gameData';
import {
  ALLIANCE_RESEARCH_CATALOG,
  ECONOMY_LIMITS,
  appendAllianceLog,
  appendAllianceNotification,
  createInitialTechFunding,
  createInitialTechLevels,
  getLevelRequiredFeeds,
  getLocalDateKey,
  getPlayerTier,
  syncDailyEconomyState,
} from '../utils/economyEngine';
import { applyAllianceXpAndLevelNotification } from './economyHelpers';

/**
 * Pure 5-second deadline watcher:
 * Returns exact reference `prevRaw` when nothing matured to avoid spurious re-renders.
 */
export function evaluateDeadlineTick(prevRaw: GameState, nowTs: number): GameState {
  const dateChanged = prevRaw.treasury.dailyDateKey !== getLocalDateKey(new Date(nowTs));
  const anyDragonEvent = prevRaw.ducks.some((d) => {
    if (d.costResetEndsAt && nowTs >= d.costResetEndsAt) return true;
    if (!d.breedingEndsAt) return false;
    if (nowTs >= d.breedingEndsAt) return true;
    const anchor = d.lastBreedingEggAt ?? d.breedingEndsAt - ECONOMY_LIMITS.BREEDING_DURATION_MS;
    return (
      Math.floor(
        (Math.min(nowTs, d.breedingEndsAt) - anchor) / ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS
      ) > 0
    );
  });

  const tournResetAt = prevRaw.tournament.resetAt ?? nowTs + prevRaw.tournament.resetSeconds * 1000;
  const tournamentEnding = nowTs >= tournResetAt;
  const eventExpired = Boolean(prevRaw.weekendEventEndsAt && nowTs >= prevRaw.weekendEventEndsAt);
  const researchDone = Boolean(
    prevRaw.pack.activeResearch && nowTs >= prevRaw.pack.activeResearch.endsAt
  );
  const rallyReady = Boolean(
    prevRaw.pack.activeRally &&
      prevRaw.pack.activeRally.status === 'GATHERING' &&
      nowTs >= prevRaw.pack.activeRally.marchEndsAt
  );
  const expiredSites = (prevRaw.pack.occupiedSites ?? []).some((s) => nowTs >= s.expiresAt);

  if (
    !dateChanged &&
    !anyDragonEvent &&
    !tournamentEnding &&
    !eventExpired &&
    !researchDone &&
    !rallyReady &&
    !expiredSites
  ) {
    return prevRaw;
  }

  const prev = dateChanged ? syncDailyEconomyState(prevRaw) : prevRaw;
  const playerTier = getPlayerTier(prev);
  let eggsGainedThisTick = 0;

  const updatedDucks = anyDragonEvent
    ? prev.ducks.map((d) => {
        let changed = false;
        let next = d;

        if (d.costResetEndsAt && nowTs >= d.costResetEndsAt) {
          changed = true;
          next = {
            ...next,
            costResetEndsAt: null,
            feedClicksSinceReset: 0,
            feedCost: getFeedCost(d.level, d.rarity, playerTier, 0, d),
          };
        }

        if (d.breedingEndsAt) {
          const anchor =
            d.lastBreedingEggAt ?? d.breedingEndsAt - ECONOMY_LIMITS.BREEDING_DURATION_MS;
          const effectiveEnd = Math.min(nowTs, d.breedingEndsAt);
          const newEggs = Math.max(
            0,
            Math.floor((effectiveEnd - anchor) / ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS)
          );
          if (newEggs > 0) {
            eggsGainedThisTick += newEggs;
            changed = true;
            next = {
              ...next,
              lastBreedingEggAt: anchor + newEggs * ECONOMY_LIMITS.BREEDING_EGG_INTERVAL_MS,
            };
          }

          if (nowTs >= d.breedingEndsAt) {
            const nextLv = Math.min(d.maxLevel, d.breedingNextLevel ?? d.level + 1);
            changed = true;
            next = {
              ...next,
              level: nextLv,
              feedsProgress: 0,
              feedsRequired: getLevelRequiredFeeds(nextLv),
              levelFeedsCompleted: false,
              feedClicksSinceReset: 0,
              costResetEndsAt: null,
              breedingEndsAt: null,
              breedingNextLevel: null,
              lastBreedingEggAt: null,
              powerRating: d.powerRating + (30 + nextLv * 15),
              feedCost: getFeedCost(nextLv, d.rarity, playerTier, 0, d),
            };
          }
        }

        return changed ? next : d;
      })
    : prev.ducks;

  const cycleBonusMedals =
    tournamentEnding && prev.tournament.score >= 25
      ? Math.min(30, Math.floor(prev.tournament.score / 25))
      : 0;

  let nextPack = prev.pack;
  if (prev.pack.activeResearch && nowTs >= prev.pack.activeResearch.endsAt) {
    const doneRes = prev.pack.activeResearch;
    const techMeta = ALLIANCE_RESEARCH_CATALOG.find((t) => t.id === doneRes.techId);
    const xpReward = 24000 * doneRes.targetLevel;
    nextPack = {
      ...nextPack,
      power: nextPack.power + 180 * doneRes.targetLevel,
      activeResearch: null,
      techLevels: {
        ...createInitialTechLevels(),
        ...(nextPack.techLevels ?? {}),
        [doneRes.techId]: doneRes.targetLevel,
      },
      techFunding: {
        ...createInitialTechFunding(),
        ...(nextPack.techFunding ?? {}),
        [doneRes.techId]: 0,
      },
      notifications: appendAllianceNotification(nextPack.notifications, {
        category: 'RESEARCH_DONE',
        titleAr: `اكتمل بحث ${techMeta?.nameAr ?? doneRes.techId} (Lv.${doneRes.targetLevel})!`,
        bodyAr: `مفعّل الآن لجميع الأعضاء: ${techMeta?.effectPerLevelAr ?? ''} (+${xpReward.toLocaleString()} خبرة للسرب).`,
        targetSubTab: 'RESEARCH',
        inviteText: `🔬 إعلان تقني: اكتمل بحث "${techMeta?.nameAr ?? doneRes.techId}" للمستوى ${doneRes.targetLevel}! ادخلوا لتمويل البحث التالي.`,
      }),
      logs: appendAllianceLog(nextPack.logs, {
        type: 'RESEARCH',
        actor: 'مختبر أبحاث السرب',
        message: `اكتمل بحث "${techMeta?.nameAr ?? doneRes.techId}" وارتفع للمستوى ${doneRes.targetLevel}!`,
      }),
    };
    nextPack = applyAllianceXpAndLevelNotification(nextPack, xpReward);
  }

  if (
    nextPack.activeRally &&
    nextPack.activeRally.status === 'GATHERING' &&
    nowTs >= nextPack.activeRally.marchEndsAt
  ) {
    const readyRally = nextPack.activeRally;
    nextPack = {
      ...nextPack,
      activeRally: {
        ...readyRally,
        status: 'READY',
      },
      notifications: appendAllianceNotification(nextPack.notifications, {
        category: 'RALLY_READY',
        titleAr: `الحشد جاهز للاشتباك: ${readyRally.targetNameAr}`,
        bodyAr: `اكتمل زمن التجمع (${readyRally.participants.length} حلفاء عند ${readyRally.coords.x}, ${readyRally.coords.y}). ابدأوا الحسم الآن!`,
        targetSubTab: 'MAP',
        inviteText: `⚔️ حشد "${readyRally.targetNameAr}" جاهز للحسم عند (${readyRally.coords.x}, ${readyRally.coords.y})! ادخلوا الخريطة لاستلام الغنائم.`,
      }),
    };
  }

  if (expiredSites) {
    nextPack = {
      ...nextPack,
      occupiedSites: (nextPack.occupiedSites ?? []).filter((s) => nowTs < s.expiresAt),
    };
  }

  const eventStepMs = 12 * 3600 * 1000;
  const nextEventIndex = eventExpired
    ? (prev.weekendEventIndex + 1) % WEEKEND_EVENTS.length
    : prev.weekendEventIndex;
  const nextEventEndsAt = eventExpired
    ? nowTs + eventStepMs
    : prev.weekendEventEndsAt ?? nowTs + eventStepMs;

  return {
    ...prev,
    pack: nextPack,
    weekendEventIndex: nextEventIndex,
    weekendEventEndsAt: nextEventEndsAt,
    breedingEggs: (prev.breedingEggs ?? 0) + eggsGainedThisTick,
    ducks: updatedDucks,
    stats:
      cycleBonusMedals > 0
        ? { ...prev.stats, medals: prev.stats.medals + cycleBonusMedals }
        : prev.stats,
    tournament: tournamentEnding
      ? {
          score: 0,
          claimedMilestones: [],
          resetSeconds: 86400,
          resetAt: nowTs + 86400 * 1000,
          cycleNumber: (prev.tournament.cycleNumber ?? 1) + 1,
        }
      : {
          ...prev.tournament,
          resetAt: tournResetAt,
          resetSeconds: Math.max(0, Math.floor((tournResetAt - nowTs) / 1000)),
        },
  };
}
