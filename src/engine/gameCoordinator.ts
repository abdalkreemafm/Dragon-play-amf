import { GameState } from '../types/game';
import { syncDailyEconomyState } from '../utils/economyEngine';
import { reduceAllianceAction } from './allianceActions';
import { reduceDragonAction } from './dragonActions';
import { reduceEggsAction } from './eggsActions';
import { reduceTasksArenaAction } from './tasksArenaActions';
import {
  CentralActionContext,
  CentralActionOutcome,
  CentralGameAction,
} from './types';

function clampBalancesNonNegative(state: GameState): GameState {
  const safeCorn = Math.max(0, Math.round(state.corn));
  const safeStars = Math.max(0, Math.round(state.stars));
  const safeGold = Math.max(0, Math.round(state.duckGold));
  const safeDmd = Math.max(0, Math.round(state.dmdTotal * 100) / 100);
  if (
    safeCorn === state.corn &&
    safeStars === state.stars &&
    safeGold === state.duckGold &&
    safeDmd === state.dmdTotal
  ) {
    return state;
  }
  return {
    ...state,
    corn: safeCorn,
    stars: safeStars,
    duckGold: safeGold,
    dmdTotal: safeDmd,
  };
}

/**
 * Central Single-Pipeline Client Game Coordinator:
 * Every gameplay mutation passes through here so daily resets, guards, soft caps,
 * balance clamping, and authoritative reward receipts come from one source of truth.
 */
export function evaluateCentralAction(
  prevState: GameState,
  action: CentralGameAction,
  ctx: CentralActionContext
): CentralActionOutcome {
  const syncedPrev = syncDailyEconomyState(prevState);

  const outcome =
    reduceDragonAction(syncedPrev, action, ctx) ??
    reduceEggsAction(syncedPrev, action, ctx) ??
    reduceAllianceAction(syncedPrev, action, ctx) ??
    reduceTasksArenaAction(syncedPrev, action, ctx);

  if (!outcome) {
    return {
      nextState: syncedPrev,
      receipt: { ok: false, stateChanged: false },
    };
  }

  return {
    nextState: clampBalancesNonNegative(outcome.nextState),
    receipt: outcome.receipt,
  };
}

export type { CentralActionReceipt, CentralActionOutcome, CentralGameAction } from './types';
export { evaluateDeadlineTick } from './tickEngine';
export { loadSavedState, writeCompactedSave } from './storage';
export { withEarnedEnergy, withBurnedEnergy, withEarnedStars, withBurnedStars } from './economyHelpers';
