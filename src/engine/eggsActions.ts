import { EggItemType, GameState } from '../types/game';
import {
  ACTIVE_SEASON,
  EGG_ITEM_META,
  LIVE_EVENTS_REGISTRY,
  createRandomGodOrder,
  rollSupplyChestDrops,
} from '../data/gameData';
import {
  ECONOMY_LIMITS,
  createInitialCoopProgress,
  getEggSellReward,
  resolveEventModifiers,
} from '../utils/economyEngine';
import {
  CentralActionContext,
  CentralActionOutcome,
  CentralGameAction,
} from './types';
import { withBurnedEnergy, withBurnedStars, withEarnedEnergy } from './economyHelpers';

function reject(prev: GameState, message?: string): CentralActionOutcome {
  return {
    nextState: prev,
    receipt: {
      ok: false,
      stateChanged: false,
      message,
      sound: message ? 'error' : undefined,
      haptic: message ? 'error' : undefined,
    },
  };
}

export function reduceEggsAction(
  prev: GameState,
  action: CentralGameAction,
  ctx: CentralActionContext
): CentralActionOutcome | null {
  const { nowTs, blitzSecLeft } = ctx;

  switch (action.type) {
    case 'MERGE_CELLS': {
      const fromCell = prev.grid[action.fromIndex];
      const toCell = prev.grid[action.toIndex];
      if (!fromCell || !toCell || fromCell.locked || toCell.locked || !fromCell.item) {
        return reject(prev);
      }

      if (action.fromIndex === action.toIndex) {
        return reject(prev);
      }

      if (!toCell.item) {
        const nextState: GameState = {
          ...prev,
          grid: prev.grid.map((c) => {
            if (c.index === action.fromIndex) return { ...c, item: null, justMerged: false };
            if (c.index === action.toIndex) return { ...c, item: fromCell.item, justMerged: false };
            return { ...c, justMerged: false };
          }),
        };
        return {
          nextState,
          receipt: { ok: true, stateChanged: true, sound: 'tapFeed' },
        };
      }

      if (fromCell.item === toCell.item) {
        const meta = EGG_ITEM_META[fromCell.item];
        if (!meta.next) return reject(prev);

        const activeGodFortune = prev.godCards.some((g) => g.godKey === 'fortune' && g.owned);
        let resultItem: EggItemType = meta.next;
        if (activeGodFortune && Math.random() < 0.2 && EGG_ITEM_META[resultItem]?.next) {
          resultItem = EGG_ITEM_META[resultItem].next!;
        }

        const resultMeta = EGG_ITEM_META[resultItem];
        const blitzMult = blitzSecLeft > 0 ? 2 : 1;
        const incubationMult = 1 + (prev.pack.talents?.incubation ?? 0) * 0.03;
        const surgeMult = (prev.activeBuffs?.eggSurgeUntil ?? 0) > nowTs ? 1.2 : 1;
        const rawEnergy = Math.round(resultMeta.cornValue * blitzMult * incubationMult * surgeMult);

        const energyGrant = withEarnedEnergy(prev, rawEnergy);
        const nextState: GameState = {
          ...prev,
          corn: energyGrant.corn,
          treasury: energyGrant.treasury,
          battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 6 * blitzMult },
          stats: {
            ...prev.stats,
            totalMerges: prev.stats.totalMerges + 1,
            totalEggsHatched: prev.stats.totalEggsHatched + 1,
            hearts: prev.stats.hearts + (resultItem === 'egg_love' ? 140 : 12),
          },
          dailyTasks: prev.dailyTasks.map((dt) =>
            dt.id === 'dt_merge' ? { ...dt, progress: Math.min(dt.target, dt.progress + 1) } : dt
          ),
          grid: prev.grid.map((c) => {
            if (c.index === action.fromIndex) return { ...c, item: null, justMerged: false };
            if (c.index === action.toIndex) return { ...c, item: resultItem, justMerged: true };
            return { ...c, justMerged: false };
          }),
          pack: {
            ...prev.pack,
            coopProgress: {
              ...createInitialCoopProgress(),
              ...(prev.pack.coopProgress ?? {}),
              coop_eggs: (prev.pack.coopProgress?.coop_eggs ?? 145) + 1,
            },
          },
        };

        return {
          nextState,
          receipt: {
            ok: true,
            stateChanged: true,
            actualCornDelta: nextState.corn - prev.corn,
            sound: { mergeTier: resultMeta.tier },
          },
        };
      }

      // If items are different, swap their positions
      const nextState: GameState = {
        ...prev,
        grid: prev.grid.map((c) => {
          if (c.index === action.fromIndex) return { ...c, item: toCell.item, justMerged: false };
          if (c.index === action.toIndex) return { ...c, item: fromCell.item, justMerged: false };
          return { ...c, justMerged: false };
        }),
      };
      return {
        nextState,
        receipt: { ok: true, stateChanged: true, sound: 'tapFeed' },
      };
    }

    case 'START_BLITZ': {
      const cost = ECONOMY_LIMITS.BLITZ_ACTIVATION_COST;
      if (prev.corn < cost) {
        return reject(prev, `تحتاج ${cost}⚡ لتفعيل موجة 2×!`);
      }
      const nextState: GameState = {
        ...prev,
        corn: prev.corn - cost,
        treasury: withBurnedEnergy(prev.treasury, cost),
        eggQueue: ['egg_2', 'egg_1', 'egg_1', 'grapes', ...prev.eggQueue],
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -cost,
          blitzEndsAt: nowTs + 30000,
          message: `🔥 بدأت موجة دمج 2× لمدة 30 ثانية (-${cost}⚡)!`,
        },
      };
    }

    case 'AUTO_MERGE_BOARD': {
      if (prev.stats.autoMergeBoosters <= 0) {
        return {
          nextState: prev,
          receipt: {
            ok: false,
            stateChanged: false,
            message: 'لا توجد شحنات دمج تلقائي متبقية! اصقلها من مواهب السرب أو تذكرة الموسم.',
            extra: { mergesPerformed: 0 },
          },
        };
      }

      let mergesPerformed = 0;
      let totalCornRaw = 0;
      const nextGrid = prev.grid.map((c) => ({ ...c, justMerged: false }));
      const itemBuckets = new Map<EggItemType, number[]>();
      nextGrid.forEach((cell) => {
        if (!cell.locked && cell.item && EGG_ITEM_META[cell.item]?.next) {
          const list = itemBuckets.get(cell.item) ?? [];
          list.push(cell.index);
          itemBuckets.set(cell.item, list);
        }
      });

      itemBuckets.forEach((indices, itemType) => {
        const nextTier = EGG_ITEM_META[itemType]?.next;
        if (!nextTier) return;
        for (let i = 0; i + 1 < indices.length && mergesPerformed < 6; i += 2) {
          const idxA = indices[i];
          const idxB = indices[i + 1];
          nextGrid[idxA].item = null;
          nextGrid[idxB].item = nextTier;
          nextGrid[idxB].justMerged = true;
          mergesPerformed++;
          totalCornRaw += EGG_ITEM_META[nextTier].cornValue;
        }
      });

      if (mergesPerformed === 0) {
        return {
          nextState: prev,
          receipt: {
            ok: false,
            stateChanged: false,
            message: 'لا توجد أزواج متطابقة جاهزة للدمج الآن!',
            extra: { mergesPerformed: 0 },
          },
        };
      }

      const energyGrant = withEarnedEnergy(prev, totalCornRaw);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        treasury: energyGrant.treasury,
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + mergesPerformed * 8 },
        grid: nextGrid,
        stats: {
          ...prev.stats,
          autoMergeBoosters: prev.stats.autoMergeBoosters - 1,
          totalMerges: prev.stats.totalMerges + mergesPerformed,
        },
        pack: {
          ...prev.pack,
          coopProgress: {
            ...createInitialCoopProgress(),
            ...(prev.pack.coopProgress ?? {}),
            coop_eggs: (prev.pack.coopProgress?.coop_eggs ?? 145) + mergesPerformed,
          },
        },
      };
      const actualCorn = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: actualCorn,
          message: `⚡ الدمج الذكي نفّذ ${mergesPerformed} عمليات دمج (+${actualCorn.toLocaleString()} طاقة)!`,
          extra: { mergesPerformed },
        },
      };
    }

    case 'USE_HAMMER_CELL': {
      const cell = prev.grid[action.cellIndex];
      if (!cell || !cell.item || prev.stats.hammerBoosters <= 0) return reject(prev);
      const nextTier = EGG_ITEM_META[cell.item]?.next;
      if (!nextTier) return reject(prev);
      const nextState: GameState = {
        ...prev,
        grid: prev.grid.map((c) =>
          c.index === action.cellIndex
            ? { ...c, item: nextTier, justMerged: true }
            : { ...c, justMerged: false }
        ),
        stats: { ...prev.stats, hammerBoosters: prev.stats.hammerBoosters - 1 },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          message: `🔨 تمت ترقية العنصر إلى ${EGG_ITEM_META[nextTier].name}!`,
        },
      };
    }

    case 'PLACE_QUEUED_EGG': {
      if (prev.eggQueue.length === 0) return reject(prev);
      const nextItem = prev.eggQueue[0];
      const emptyIdx =
        action.targetIndex !== undefined &&
        !prev.grid[action.targetIndex]?.locked &&
        !prev.grid[action.targetIndex]?.item
          ? action.targetIndex
          : prev.grid.findIndex((c) => !c.locked && c.item === null);

      if (emptyIdx === -1) {
        return reject(prev, 'الساحة ممتلئة! استخدم الدمج التلقائي أو ادمج يدوياً.');
      }

      const nextState: GameState = {
        ...prev,
        eggQueue: prev.eggQueue.slice(1),
        grid: prev.grid.map((c) =>
          c.index === emptyIdx ? { ...c, item: nextItem, justMerged: true } : { ...c, justMerged: false }
        ),
      };
      return { nextState, receipt: { ok: true, stateChanged: true } };
    }

    case 'PLACE_ALL_QUEUED_EGGS': {
      if (prev.eggQueue.length === 0) return reject(prev);
      const available = prev.grid.filter((c) => !c.locked && c.item === null).map((c) => c.index);
      if (available.length === 0) {
        return reject(prev, 'الساحة ممتلئة! ادمج أو بع بعض العناصر لإتاحة مساحة.');
      }
      const count = Math.min(available.length, prev.eggQueue.length);
      const toPlace = prev.eggQueue.slice(0, count);
      const targetMap = new Map<number, EggItemType>();
      available.slice(0, count).forEach((gridIdx, i) => {
        targetMap.set(gridIdx, toPlace[i]);
      });
      const nextState: GameState = {
        ...prev,
        eggQueue: prev.eggQueue.slice(count),
        grid: prev.grid.map((c) =>
          targetMap.has(c.index)
            ? { ...c, item: targetMap.get(c.index) ?? null, justMerged: true }
            : { ...c, justMerged: false }
        ),
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'tapFeed',
          message: `تم إنزال ${count} بيضة إلى الساحة!`,
        },
      };
    }

    case 'DELIVER_TO_GOD': {
      const order = prev.godOrders.find((o) => o.id === action.orderId);
      if (!order) return reject(prev);
      const idx =
        action.cellIndex !== undefined
          ? action.cellIndex
          : prev.grid.findIndex((c) => !c.locked && c.item === order.wantedItem);
      if (idx === -1) return reject(prev);

      const activeGodHype = prev.godCards.some((g) => g.godKey === 'hype' && g.owned);
      const eventMods = resolveEventModifiers(
        LIVE_EVENTS_REGISTRY[prev.weekendEventIndex % LIVE_EVENTS_REGISTRY.length]
      );
      const blitzMult = blitzSecLeft > 0 ? 2 : 1;
      const incubationMult = 1 + (prev.pack.talents?.incubation ?? 0) * 0.03;
      const surgeMult = (prev.activeBuffs?.eggSurgeUntil ?? 0) > nowTs ? 1.2 : 1;
      const rawOrderCorn = Math.round(
        order.cornReward * blitzMult * incubationMult * surgeMult * eventMods.templeEnergyMult
      );
      const prestigeMult = 1 + (prev.pack.talents?.prestige ?? 0) * 0.03;
      const basePts = activeGodHype ? Math.round(order.trophyPoints * 1.5) : order.trophyPoints;
      const ptsEarned = Math.round(basePts * blitzMult * prestigeMult);
      const goldGain = order.trophyPoints >= 10 ? 1 : 0;
      const newOrder = createRandomGodOrder(prev.stats.totalErrands + 1);

      const energyGrant = withEarnedEnergy(prev, rawOrderCorn);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        duckGold: prev.duckGold + goldGain,
        treasury: energyGrant.treasury,
        battlePass: { ...prev.battlePass, xp: prev.battlePass.xp + 20 },
        godOrders: prev.godOrders.map((o) => (o.id === action.orderId ? newOrder : o)),
        grid: prev.grid.map((c) => (c.index === idx ? { ...c, item: null, justMerged: false } : c)),
        tournament: {
          ...prev.tournament,
          score: prev.tournament.score + ptsEarned,
        },
        stats: {
          ...prev.stats,
          totalErrands: prev.stats.totalErrands + 1,
          medals: prev.stats.medals + 5,
        },
        dailyTasks: prev.dailyTasks.map((dt) =>
          dt.id === 'dt_errands' ? { ...dt, progress: Math.min(dt.target, dt.progress + 1) } : dt
        ),
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualGoldDelta: goldGain,
          haptic: 'success',
          message: `تم تسليم ${EGG_ITEM_META[order.wantedItem].name}! +${cornDelta.toLocaleString()} طاقة${goldGain > 0 ? ` و +${goldGain} 💎` : ''} و +${ptsEarned} 🏆`,
        },
      };
    }

    case 'OPEN_SNACK_CHEST': {
      const readyAt = prev.stats.snackChestReadyAt ?? 0;
      const discountLeft = prev.stats.snackChestDiscountOpensLeft ?? 10;
      const isExpired = nowTs >= readyAt;

      let starCost = 0;
      if (!isExpired) {
        if (action.earlyOpen) {
          starCost = discountLeft > 0 ? 20 : 39;
          if (prev.stars < starCost) {
            return reject(prev, `تحتاج ${starCost} نجوم ★ لفتح الصندوق مبكراً!`);
          }
        } else {
          return reject(prev, 'صندوق الكنوز قيد الانتظار (4 ساعات)!');
        }
      }

      const roll = rollSupplyChestDrops(ACTIVE_SEASON.id);
      const activeGodPlunder = prev.godCards.some((g) => g.godKey === 'plunder' && g.owned);
      const rawBonus = (activeGodPlunder ? 220 : 180) + roll.cornBonus;
      const energyGrant = withEarnedEnergy(prev, rawBonus);
      const nextTreasury = starCost > 0 ? withBurnedStars(energyGrant.treasury, starCost) : energyGrant.treasury;

      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: starCost > 0 ? prev.stars - starCost : prev.stars,
        treasury: nextTreasury,
        grid: prev.grid.map((c) =>
          c.index === action.cellIndex
            ? { ...c, item: 'chest', justMerged: true }
            : c.item === 'chest'
              ? { ...c, item: null, justMerged: false }
              : c
        ),
        eggQueue: [...roll.eggs.filter((item) => item !== 'chest'), ...prev.eggQueue],
        stats: {
          ...prev.stats,
          autoMergeBoosters: prev.stats.autoMergeBoosters + 1,
          snackChestReadyAt: nowTs + 4 * 3600 * 1000,
          snackChestDiscountOpensLeft: starCost > 0 && discountLeft > 0 ? discountLeft - 1 : discountLeft,
        },
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: starCost > 0 ? -starCost : 0,
          message: `تم فتح صندوق الإمداد (${roll.rarityLabelAr}) بنجاح! +${cornDelta} طعام تنين وموارد موسمية!`,
        },
      };
    }

    case 'UNLOCK_GRID_SLOT': {
      const lockedCount = prev.grid.filter((c) => c.locked).length;
      const extraUnlocked = 21 - lockedCount;
      const starCost = 50 + extraUnlocked * 20;
      if (prev.stars < starCost) {
        return reject(prev, `تحتاج إلى ${starCost} نجمة ⭐ لفتح هذه الخانة!`);
      }
      const nextState: GameState = {
        ...prev,
        stars: prev.stars - starCost,
        grid: prev.grid.map((c) => (c.index === action.cellIndex ? { ...c, locked: false } : c)),
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualStarsDelta: -starCost,
          message: `تم فتح خانة جديدة في حقل البيض مقابل ${starCost} نجمة ⭐!`,
        },
      };
    }

    case 'SELL_GRID_ITEM': {
      const cell = prev.grid[action.cellIndex];
      if (!cell || cell.locked || !cell.item || cell.item === 'chest') return reject(prev);
      const item = cell.item;
      const meta = EGG_ITEM_META[item];
      const reward = getEggSellReward(item);
      const energyGrant = withEarnedEnergy(prev, reward.corn);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + reward.stars,
        duckGold: prev.duckGold + reward.gold,
        treasury: {
          ...energyGrant.treasury,
          starsEarnedToday: (energyGrant.treasury.starsEarnedToday ?? 0) + reward.stars,
        },
        grid: prev.grid.map((c) =>
          c.index === action.cellIndex ? { ...c, item: null, justMerged: false } : c
        ),
      };
      const cornDelta = nextState.corn - prev.corn;
      const extras: string[] = [`+${cornDelta} طعام`];
      if (reward.stars > 0) extras.push(`+${reward.stars} ★`);
      if (reward.gold > 0) extras.push(`+${reward.gold} 💎`);
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: reward.stars,
          actualGoldDelta: reward.gold,
          sound: 'claim',
          haptic: 'light',
          message: `تم بيع ${meta.name}: ${extras.join(' · ')}`,
        },
      };
    }

    case 'SELL_QUEUED_EGG': {
      const item = prev.eggQueue[action.queueIndex];
      if (!item || item === 'chest') return reject(prev);
      const meta = EGG_ITEM_META[item];
      const reward = getEggSellReward(item);
      const energyGrant = withEarnedEnergy(prev, reward.corn);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + reward.stars,
        duckGold: prev.duckGold + reward.gold,
        treasury: {
          ...energyGrant.treasury,
          starsEarnedToday: (energyGrant.treasury.starsEarnedToday ?? 0) + reward.stars,
        },
        eggQueue: prev.eggQueue.filter((_, idx) => idx !== action.queueIndex),
      };
      const cornDelta = nextState.corn - prev.corn;
      const extras: string[] = [`+${cornDelta} طاقة ⚡`];
      if (reward.stars > 0) extras.push(`+${reward.stars} ★`);
      if (reward.gold > 0) extras.push(`+${reward.gold} 💎`);
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: reward.stars,
          actualGoldDelta: reward.gold,
          sound: 'claim',
          haptic: 'light',
          message: `تم بيع ${meta.name} من قائمة الانتظار: ${extras.join(' · ')}`,
        },
      };
    }

    default:
      return null;
  }
}
