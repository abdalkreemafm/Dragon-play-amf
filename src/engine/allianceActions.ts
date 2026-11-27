import {
  AllianceActiveRally,
  AllianceActiveResearch,
  AllianceJoinConditions,
  GameState,
} from '../types/game';
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
  ALLIANCE_SHOP_CATALOG,
  SWARM_DRAGON_GEAR_CATALOG,
  SWARM_DRAGON_UPGRADE_CATALOG,
  appendAllianceLog,
  appendAllianceNotification,
  calculateAllianceDividendBreakdown,
  computeSwarmDragonTotalStats,
  createInitialAllianceLedger,
  createInitialCoopProgress,
  createInitialRewardPool,
  createInitialSwarmDragonState,
  createInitialTechFunding,
  extractDragonTransferStats,
  getAllianceLevelInfo,
  getAllianceTechRequirements,
  getSwarmDragonGearUpgradeCost,
  getSwarmDragonLevelUpCost,
  getSwarmDragonUpgradeCost,
  getFirstUnlockedDragonIndex,
  isDragonSlotLocked,
  normalizeDragonSlots,
} from '../utils/economyEngine';
import {
  CentralActionContext,
  CentralActionOutcome,
  CentralGameAction,
} from './types';
import {
  applyAllianceXpAndLevelNotification,
  toRallyDragon,
  withBurnedEnergy,
  withEarnedEnergy,
  withEarnedStars,
} from './economyHelpers';

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

export function reduceAllianceAction(
  prev: GameState,
  action: CentralGameAction,
  ctx: CentralActionContext
): CentralActionOutcome | null {
  const { nowTs, effectiveCurrentUid } = ctx;

  switch (action.type) {
    case 'DONATE_ALLIANCE': {
      if (nowTs - action.lastDonateAt < 5000) {
        return reject(prev, 'انتظر 5 ثوانٍ بين كل تبرع وآخر (حماية السبام)!');
      }
      const used = prev.pack.donationsToday ?? 0;
      if (used >= ALLIANCE_DAILY_LIMITS.MAX_DONATIONS_PER_DAY) {
        return reject(prev, 'وصلت للحد اليومي من تبرعات السرب!');
      }
      const tierMeta =
        ALLIANCE_DONATION_TIERS.find((t) => t.id === action.kind) ?? ALLIANCE_DONATION_TIERS[0];

      if (tierMeta.energyCost > 0 && prev.corn < tierMeta.energyCost) {
        return reject(prev, `تحتاج ${tierMeta.energyCost.toLocaleString()}⚡ لهذا التبرع!`);
      }
      if (tierMeta.goldCost > 0 && prev.duckGold < tierMeta.goldCost) {
        return reject(prev, `تحتاج ${tierMeta.goldCost} ذهب تنانين 💎 لهذا التبرع!`);
      }

      const taxLv = prev.pack.techLevels?.tech_treasury_tax ?? 0;
      const taxMult = 1 + taxLv * 0.12;
      const critRoll = Math.random();
      const critMult = critRoll < 0.06 ? 5 : critRoll < 0.16 ? 3 : critRoll < 0.36 ? 2 : 1;

      const vaultCornGain = Math.round(tierMeta.vaultCornGain * taxMult);
      const techGain = Math.round(tierMeta.techPointsGain * taxMult * critMult);
      const coinGain = Math.round(tierMeta.coinsGain * (critMult > 1 ? 1.45 : 1));
      const poolCornFeed = Math.round(vaultCornGain * 0.08);

      const curLedger = { ...createInitialAllianceLedger(), ...(prev.pack.ledger ?? {}) };
      const curPool = { ...createInitialRewardPool(), ...(prev.pack.rewardPool ?? {}) };
      const nextTreasuryAfterEnergy =
        tierMeta.energyCost > 0 ? withBurnedEnergy(prev.treasury, tierMeta.energyCost) : prev.treasury;
      const nextTreasury =
        tierMeta.starsReward > 0
          ? withEarnedStars(nextTreasuryAfterEnergy, tierMeta.starsReward)
          : nextTreasuryAfterEnergy;

      let nextPack: GameState['pack'] = {
        ...prev.pack,
        power: prev.pack.power + tierMeta.powerGain,
        treasuryCorn: prev.pack.treasuryCorn + vaultCornGain,
        allianceCoins: (prev.pack.allianceCoins ?? 0) + coinGain,
        contributionTotal: (prev.pack.contributionTotal ?? 0) + coinGain,
        activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + tierMeta.activityGain),
        donationsToday: used + 1,
        rewardPool: {
          ...curPool,
          corn: curPool.corn + poolCornFeed,
          allianceCoins: curPool.allianceCoins + Math.round(coinGain * 0.25),
        },
        ledger: {
          ...curLedger,
          techPointsPool: curLedger.techPointsPool + techGain,
          vaultGold: curLedger.vaultGold + tierMeta.vaultGoldGain,
          playerEnergyDonated: curLedger.playerEnergyDonated + tierMeta.energyCost,
          playerGoldDonated: curLedger.playerGoldDonated + tierMeta.goldCost,
          playerTechDonated: curLedger.playerTechDonated + techGain,
          allianceTotalEnergyDonated: curLedger.allianceTotalEnergyDonated + vaultCornGain,
          allianceTotalGoldDonated: curLedger.allianceTotalGoldDonated + tierMeta.vaultGoldGain,
        },
        coopProgress: {
          ...createInitialCoopProgress(),
          ...(prev.pack.coopProgress ?? {}),
          coop_treasury: Math.max(
            prev.pack.treasuryCorn + vaultCornGain,
            (prev.pack.coopProgress?.coop_treasury ?? 125000) + vaultCornGain
          ),
        },
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'DONATE',
          actor: prev.username,
          message: `قدّم "${tierMeta.titleAr}" (+${vaultCornGain.toLocaleString()}⚡ للخزينة · +${techGain.toLocaleString()} بحث${critMult > 1 ? ` · مضاعف حظ ×${critMult}!` : ''}).`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, tierMeta.xpGain);

      const nextState: GameState = {
        ...prev,
        corn: prev.corn - tierMeta.energyCost,
        duckGold: prev.duckGold - tierMeta.goldCost,
        stars: prev.stars + tierMeta.starsReward,
        treasury: nextTreasury,
        pack: nextPack,
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -tierMeta.energyCost,
          actualGoldDelta: -tierMeta.goldCost,
          actualStarsDelta: tierMeta.starsReward,
          sound: 'claim',
          haptic: critMult > 1 ? 'success' : 'light',
          message: `${critMult > 1 ? `🔥 ضربة حظ ×${critMult}! ` : ''}${tierMeta.titleAr}: +${coinGain.toLocaleString()}🪙 · +${techGain.toLocaleString()} بحث · +${vaultCornGain.toLocaleString()}⚡ خزينة!`,
        },
      };
    }

    case 'FUND_ALLIANCE_TECH': {
      const meta = ALLIANCE_RESEARCH_CATALOG.find((t) => t.id === action.techId);
      if (!meta) return reject(prev);
      const curLv = prev.pack.techLevels?.[action.techId] ?? 0;
      if (curLv >= meta.maxLevel) return reject(prev);
      const marchLv = prev.pack.techLevels?.tech_march_speed ?? 0;
      const req = getAllianceTechRequirements(action.techId, curLv, marchLv);
      const curFund = prev.pack.techFunding?.[action.techId] ?? 0;
      if (curFund >= req.requiredTechPoints) {
        return reject(prev, 'تمويل النقاط لهذا البحث مكتمل! يمكنك بدء التطوير الآن.');
      }

      if (action.mode === 'ENERGY_SMALL' || action.mode === 'ENERGY_CONVOY') {
        const energyCost = action.mode === 'ENERGY_CONVOY' ? 2500 : 500;
        const rawBoost = action.mode === 'ENERGY_CONVOY' ? 28000 : 5000;
        const coinsReward = action.mode === 'ENERGY_CONVOY' ? 480 : 90;
        const xpReward = action.mode === 'ENERGY_CONVOY' ? 14000 : 2800;

        if (prev.corn < energyCost) {
          return reject(prev, `تحتاج ${energyCost.toLocaleString()}⚡ لتمويل البحث!`);
        }
        const boostPts = Math.min(req.requiredTechPoints - curFund, rawBoost);
        const curLedger = { ...createInitialAllianceLedger(), ...(prev.pack.ledger ?? {}) };
        let nextPack: GameState['pack'] = {
          ...prev.pack,
          treasuryCorn: prev.pack.treasuryCorn + energyCost,
          allianceCoins: (prev.pack.allianceCoins ?? 0) + coinsReward,
          contributionTotal: (prev.pack.contributionTotal ?? 0) + coinsReward,
          activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 10),
          techFunding: {
            ...createInitialTechFunding(),
            ...(prev.pack.techFunding ?? {}),
            [action.techId]: Math.min(req.requiredTechPoints, curFund + boostPts),
          },
          ledger: {
            ...curLedger,
            playerEnergyDonated: curLedger.playerEnergyDonated + energyCost,
            playerTechDonated: curLedger.playerTechDonated + boostPts,
            allianceTotalEnergyDonated: curLedger.allianceTotalEnergyDonated + energyCost,
          },
          logs: appendAllianceLog(prev.pack.logs, {
            type: 'RESEARCH',
            actor: prev.username,
            message: `موّل بحث "${meta.nameAr}" بـ +${boostPts.toLocaleString()} نقطة بحث (-${energyCost.toLocaleString()}⚡).`,
          }),
        };
        nextPack = applyAllianceXpAndLevelNotification(nextPack, xpReward);
        const nextState: GameState = {
          ...prev,
          corn: prev.corn - energyCost,
          treasury: withBurnedEnergy(prev.treasury, energyCost),
          pack: nextPack,
        };
        return {
          nextState,
          receipt: {
            ok: true,
            stateChanged: true,
            actualCornDelta: -energyCost,
            sound: 'claim',
            message: `تم تمويل "${meta.nameAr}" (+${boostPts.toLocaleString()} نقطة بحث · +${coinsReward}🪙)!`,
          },
        };
      } else {
        const curLedger = { ...createInitialAllianceLedger(), ...(prev.pack.ledger ?? {}) };
        const actualChunk = Math.min(
          25000,
          req.requiredTechPoints - curFund,
          curLedger.techPointsPool
        );
        if (actualChunk <= 0) {
          return reject(prev, 'رصيد نقاط أبحاث السرب غير كافٍ! تبرّع للخزينة أو انتصر في الحشود.');
        }
        const nextState: GameState = {
          ...prev,
          pack: {
            ...prev.pack,
            allianceCoins: (prev.pack.allianceCoins ?? 0) + 120,
            techFunding: {
              ...createInitialTechFunding(),
              ...(prev.pack.techFunding ?? {}),
              [action.techId]: curFund + actualChunk,
            },
            ledger: {
              ...curLedger,
              techPointsPool: curLedger.techPointsPool - actualChunk,
            },
            logs: appendAllianceLog(prev.pack.logs, {
              type: 'RESEARCH',
              actor: prev.username,
              message: `وجّه +${actualChunk.toLocaleString()} نقطة من مخزون السرب إلى "${meta.nameAr}".`,
            }),
          },
        };
        return {
          nextState,
          receipt: {
            ok: true,
            stateChanged: true,
            sound: 'claim',
            message: `تم ضخ +${actualChunk.toLocaleString()} نقطة بحث من مخزون السرب!`,
          },
        };
      }
    }

    case 'CONVERT_BLESSING_TO_RESEARCH': {
      const card = prev.godCards.find((g) => g.id === action.godId);
      const missionMeta = ALLIANCE_BLESSING_RESEARCH_MISSIONS[action.godId];
      const techMeta = ALLIANCE_RESEARCH_CATALOG.find((t) => t.id === action.targetTechId);
      if (!card || !missionMeta || !techMeta) return reject(prev);
      if (!card.owned) {
        return reject(prev, `يلزم تفعيل بطاقة "${card.name}" أولاً لتحويلها إلى مهمة في أبحاث السرب!`);
      }
      if ((prev.pack.convertedBlessingIds ?? []).includes(action.godId)) {
        return reject(prev, 'تم تحويل هذه البطاقة إلى مهمة أبحاث السرب مسبقاً!');
      }

      const curLv = prev.pack.techLevels?.[action.targetTechId] ?? 0;
      const marchLv = prev.pack.techLevels?.tech_march_speed ?? 0;
      const req = getAllianceTechRequirements(action.targetTechId, curLv, marchLv);
      const curFund = prev.pack.techFunding?.[action.targetTechId] ?? 0;
      const needed = Math.max(0, req.requiredTechPoints - curFund);
      const directApplied = Math.min(needed, missionMeta.techPointsGain);
      const overflowToPool = Math.max(0, missionMeta.techPointsGain - directApplied);
      const curLedger = { ...createInitialAllianceLedger(), ...(prev.pack.ledger ?? {}) };

      let nextPack: GameState['pack'] = {
        ...prev.pack,
        convertedBlessingIds: [...(prev.pack.convertedBlessingIds ?? []), action.godId],
        allianceCoins: (prev.pack.allianceCoins ?? 0) + missionMeta.coinsGain,
        contributionTotal: (prev.pack.contributionTotal ?? 0) + missionMeta.coinsGain,
        activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + missionMeta.activityGain),
        techFunding: {
          ...createInitialTechFunding(),
          ...(prev.pack.techFunding ?? {}),
          [action.targetTechId]: Math.min(req.requiredTechPoints, curFund + directApplied),
        },
        ledger: {
          ...curLedger,
          techPointsPool: curLedger.techPointsPool + overflowToPool,
          playerTechDonated: curLedger.playerTechDonated + missionMeta.techPointsGain,
        },
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'RESEARCH',
          actor: prev.username,
          message: `حوّل بطاقة "${card.name}" إلى "${missionMeta.missionTitleAr}" (+${missionMeta.techPointsGain.toLocaleString()} نقطة نحو ${techMeta.nameAr})!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, missionMeta.allianceXpGain);

      return {
        nextState: { ...prev, pack: nextPack },
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'godConfirm',
          haptic: 'success',
          message: `✨ تحوّلت "${card.name}" لمهمة أبحاث السرب: +${missionMeta.techPointsGain.toLocaleString()} نقطة و +${missionMeta.coinsGain}🪙!`,
        },
      };
    }

    case 'START_ALLIANCE_RESEARCH': {
      if (prev.pack.activeResearch) {
        return reject(prev, 'يوجد بحث قيد التطوير حالياً في مختبر أبحاث السرب!');
      }
      const meta = ALLIANCE_RESEARCH_CATALOG.find((t) => t.id === action.techId);
      if (!meta) return reject(prev);
      const curLv = prev.pack.techLevels?.[action.techId] ?? 0;
      if (curLv >= meta.maxLevel) return reject(prev);
      const marchLv = prev.pack.techLevels?.tech_march_speed ?? 0;
      const req = getAllianceTechRequirements(action.techId, curLv, marchLv);
      const curFund = prev.pack.techFunding?.[action.techId] ?? 0;
      const vaultGold = prev.pack.ledger?.vaultGold ?? 0;

      if (curFund < req.requiredTechPoints) {
        return reject(
          prev,
          `يلزم إكمال تمويل النقاط (${curFund.toLocaleString()}/${req.requiredTechPoints.toLocaleString()}) أولاً!`
        );
      }
      if (prev.pack.treasuryCorn < req.requiredVaultCorn) {
        return reject(prev, `خزينة السرب تحتاج ${req.requiredVaultCorn.toLocaleString()}⚡ لبدء هذا التطوير!`);
      }
      if (vaultGold < req.requiredVaultGold) {
        return reject(prev, `خزينة السرب تحتاج ${req.requiredVaultGold}💎 ذهب التنانين لبدء التطوير!`);
      }

      const researchObj: AllianceActiveResearch = {
        techId: action.techId,
        targetLevel: req.nextLevel,
        startedAt: nowTs,
        endsAt: nowTs + req.durationMs,
        helpsReceived: 0,
      };
      const curLedger = { ...createInitialAllianceLedger(), ...(prev.pack.ledger ?? {}) };

      const nextState: GameState = {
        ...prev,
        pack: {
          ...prev.pack,
          treasuryCorn: prev.pack.treasuryCorn - req.requiredVaultCorn,
          ledger: {
            ...curLedger,
            vaultGold: Math.max(0, curLedger.vaultGold - req.requiredVaultGold),
          },
          activeResearch: researchObj,
          logs: appendAllianceLog(prev.pack.logs, {
            type: 'RESEARCH',
            actor: prev.username,
            message: `أطلق تطوير "${meta.nameAr}" إلى المستوى ${req.nextLevel} (مدة الانتظار: ${req.durationHours} ساعة)!`,
          }),
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'godConfirm',
          haptic: 'success',
          message: `🔬 بدأ تطوير "${meta.nameAr}" (المدة: ${req.durationHours} ساعة)!`,
        },
      };
    }

    case 'SPEEDUP_ALLIANCE_RESEARCH': {
      const active = prev.pack.activeResearch;
      if (!active) return reject(prev);
      if (action.mode === 'FREE') {
        if (active.helpsReceived >= 12) {
          return reject(prev, 'اكتملت فزعات تسريع الأعضاء لهذا البحث (12/12)!');
        }
        const reductionMs = 60 * 60 * 1000;
        const nextState: GameState = {
          ...prev,
          pack: {
            ...prev.pack,
            allianceCoins: (prev.pack.allianceCoins ?? 0) + 45,
            activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 6),
            activeResearch: {
              ...active,
              endsAt: Math.max(nowTs + 1000, active.endsAt - reductionMs),
              helpsReceived: active.helpsReceived + 1,
            },
          },
        };
        return {
          nextState,
          receipt: {
            ok: true,
            stateChanged: true,
            sound: 'claim',
            message: 'فزعة السرب قلّصت وقت البحث -1 ساعة كاملة (+45🪙)!',
          },
        };
      }
      const goldCost = action.mode === 'GOLD_24H' ? 3 : 1;
      const hoursCut = action.mode === 'GOLD_24H' ? 24 : 6;
      if (prev.duckGold < goldCost) {
        return reject(prev, `تحتاج ${goldCost}💎 ذهب التنانين لتسريع البحث -${hoursCut} ساعة!`);
      }
      const reductionMs = hoursCut * 3600 * 1000;
      const nextState: GameState = {
        ...prev,
        duckGold: prev.duckGold - goldCost,
        pack: {
          ...prev.pack,
          allianceCoins: (prev.pack.allianceCoins ?? 0) + goldCost * 90,
          activeResearch: {
            ...active,
            endsAt: Math.max(nowTs + 500, active.endsAt - reductionMs),
          },
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualGoldDelta: -goldCost,
          sound: 'godConfirm',
          message: `⚡ تم تسريع بحث التحالف -${hoursCut} ساعة!`,
        },
      };
    }

    case 'UPDATE_ALLIANCE_IDENTITY_LOCAL': {
      const cleanedName = action.packName.trim().slice(0, 32) || prev.pack.packName;
      const cleanedMotto =
        action.motto.trim().slice(0, 72) || (prev.pack.motto ?? 'وحدة التنانين تفتح أبواب المجد وعرش AMF');
      const emblemMeta =
        ALLIANCE_EMBLEM_CATALOG.find((e) => e.id === action.emblemId) ?? ALLIANCE_EMBLEM_CATALOG[0];

      const nextState: GameState = {
        ...prev,
        pack: {
          ...prev.pack,
          packName: cleanedName,
          motto: cleanedMotto,
          emblemId: emblemMeta.id,
          visibility: action.visibility ?? prev.pack.visibility,
          logs: appendAllianceLog(prev.pack.logs, {
            type: 'ROLE',
            actor: prev.username,
            message: `حدّث هوية التحالف إلى "${cleanedName}" واختار شعار "${emblemMeta.nameAr}".`,
          }),
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'godConfirm',
          haptic: 'success',
          message: `تم حفظ هوية السرب: ${cleanedName} (${emblemMeta.nameAr})!`,
        },
      };
    }

    case 'UPDATE_JOIN_CONDITIONS_LOCAL': {
      const cleaned: AllianceJoinConditions = {
        minPower: Math.max(100, Math.min(500000, Math.round(action.joinConditions.minPower))),
        minDragons: Math.max(1, Math.min(20, Math.round(action.joinConditions.minDragons))),
        minDragonLevel: Math.max(1, Math.min(5, Math.round(action.joinConditions.minDragonLevel))),
        autoAccept: Boolean(action.joinConditions.autoAccept),
      };
      const nextState: GameState = {
        ...prev,
        pack: {
          ...prev.pack,
          joinConditions: cleaned,
          logs: appendAllianceLog(prev.pack.logs, {
            type: 'ROLE',
            actor: prev.username,
            message: `حدّث شروط الانضمام للسرب (قوة ${cleaned.minPower}+ · ${cleaned.minDragons}+ تنين · Lv.${cleaned.minDragonLevel}+).`,
          }),
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'godConfirm',
          message: 'تم حفظ شروط الانضمام الجديدة للسرب!',
        },
      };
    }

    case 'START_ALLIANCE_RALLY': {
      if (prev.pack.activeRally) {
        return reject(prev, 'يوجد حشد تحالف نشط حالياً على الخريطة!');
      }
      const target = ALLIANCE_MAP_TARGETS.find((t) => t.id === action.targetId);
      if (!target) return reject(prev);
      const cdUntil = prev.pack.mapCooldowns?.[action.targetId] ?? 0;
      if (cdUntil > nowTs) {
        return reject(prev, 'هذا الهدف في فترة استعادة الهدوء حالياً!');
      }
      if (prev.corn < target.staminaCostCorn) {
        return reject(prev, `تحتاج ${target.staminaCostCorn}⚡ لإطلاق نداء الحشد!`);
      }

      const prepMeta =
        ALLIANCE_RALLY_PREP_OPTIONS.find((o) => o.minutes === action.prepMinutes) ??
        ALLIANCE_RALLY_PREP_OPTIONS[1];
      const lvInfo = getAllianceLevelInfo(prev.pack.xp ?? 2250);
      const rallyCapLv = prev.pack.techLevels?.tech_rally_capacity ?? 0;
      const marchLv = prev.pack.techLevels?.tech_march_speed ?? 0;
      const phalanxLv = prev.pack.techLevels?.tech_dragon_phalanx ?? 0;
      const speedReduction = Math.min(0.65, marchLv * 0.04);
      const durationMs = Math.max(
        45 * 1000,
        Math.round(prepMeta.minutes * 60 * 1000 * (1 - speedReduction))
      );
      const maxSlots = 6 + rallyCapLv + lvInfo.rallySlotBonus;

      const chosenDucks =
        action.selectedDragonIds && action.selectedDragonIds.length > 0
          ? prev.ducks.filter((d) => action.selectedDragonIds!.includes(d.id))
          : [...prev.ducks]
              .sort((a, b) => (b.powerRating ?? 100) - (a.powerRating ?? 100))
              .slice(0, Math.min(3, prev.ducks.length));
      const playerDragons = (chosenDucks.length > 0 ? chosenDucks : prev.ducks.slice(0, 1)).map((d) =>
        toRallyDragon(d, phalanxLv)
      );
      const playerEffectivePower = playerDragons.reduce((acc, d) => acc + d.power, 0);

      const newRally: AllianceActiveRally = {
        id: `rally_${nowTs}`,
        targetId: target.id,
        targetNameAr: target.nameAr,
        targetType: target.type,
        coords: target.coords,
        requiredPower: target.requiredPower,
        maxSlots,
        prepMinutes: prepMeta.minutes,
        startedAt: nowTs,
        marchEndsAt: nowTs + durationMs,
        lootMultiplier: prepMeta.lootMult,
        participants: [
          {
            id: 'player_self',
            name: prev.username,
            role: 'LEADER',
            power: playerEffectivePower,
            dragonsCount: playerDragons.length,
            dragons: playerDragons,
            joinedAt: nowTs,
          },
        ],
        status: 'GATHERING',
        helpUsedCount: 0,
      };

      const rallyInviteText = `📣 نداء حشد عاجل بتنانين الأعضاء! الهدف: "${target.nameAr}" (${target.coords.x}, ${target.coords.y}) · القوة المطلوبة ${target.requiredPower.toLocaleString()} · مضاعف الغنائم ×${prepMeta.lootMult}. أرسلوا تنانينكم الآن!`;

      const nextState: GameState = {
        ...prev,
        corn: prev.corn - target.staminaCostCorn,
        treasury: withBurnedEnergy(prev.treasury, target.staminaCostCorn),
        pack: {
          ...prev.pack,
          activeRally: newRally,
          activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 15),
          notifications: appendAllianceNotification(prev.pack.notifications, {
            category: 'RALLY_STARTED',
            titleAr: `حشد جديد نحو ${target.nameAr}!`,
            bodyAr: `أطلقه ${prev.username} بـ ${playerDragons.length} تنين عند (${target.coords.x}, ${target.coords.y}) · مطلوب ${target.requiredPower.toLocaleString()} قوة جماعية.`,
            targetSubTab: 'MAP',
            inviteText: rallyInviteText,
          }),
          logs: appendAllianceLog(prev.pack.logs, {
            type: 'RALLY',
            actor: prev.username,
            message: `أطلق حشد السرب بـ ${playerDragons.length} تنين نحو "${target.nameAr}" (${target.coords.x}, ${target.coords.y}).`,
          }),
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -target.staminaCostCorn,
          sound: 'godConfirm',
          haptic: 'success',
          message: `📣 انطلق الحشد مع تنانينك (${playerDragons.length})! افتح تفاصيل الحشد لمتابعة المسير والتسريع!`,
        },
      };
    }

    case 'DISPATCH_DRAGON_TO_RALLY': {
      const rally = prev.pack.activeRally;
      if (!rally || rally.status === 'RESOLVED') return reject(prev);
      const duck = prev.ducks.find((d) => d.id === action.dragonId);
      if (!duck) return reject(prev);
      const selfPt = rally.participants.find((pt) => pt.id === 'player_self');
      if ((selfPt?.dragons ?? []).some((dr) => dr.id === action.dragonId)) return reject(prev);

      const phalanxLv = prev.pack.techLevels?.tech_dragon_phalanx ?? 0;
      const rallyDragon = toRallyDragon(duck, phalanxLv);
      const curLedger = { ...createInitialAllianceLedger(), ...(prev.pack.ledger ?? {}) };

      const nextState: GameState = {
        ...prev,
        pack: {
          ...prev.pack,
          allianceCoins: (prev.pack.allianceCoins ?? 0) + 45,
          contributionTotal: (prev.pack.contributionTotal ?? 0) + 70,
          ledger: {
            ...curLedger,
            playerRallyContrib: curLedger.playerRallyContrib + rallyDragon.power,
          },
          activeRally: {
            ...rally,
            participants: rally.participants.map((pt) => {
              if (pt.id !== 'player_self') return pt;
              const nextDragons = [...(pt.dragons ?? []), rallyDragon];
              return {
                ...pt,
                power: pt.power + rallyDragon.power,
                dragonsCount: nextDragons.length,
                dragons: nextDragons,
              };
            }),
          },
          logs: appendAllianceLog(prev.pack.logs, {
            type: 'RALLY',
            actor: prev.username,
            message: `أرسل التنين "${duck.name}" [Lv.${duck.level}] للمشاركة في حشد "${rally.targetNameAr}" (+${rallyDragon.power.toLocaleString()} قوة)!`,
          }),
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'claim',
          haptic: 'light',
          message: `🐉 انطلق التنين "${duck.name}" إلى صفوف الحشد (+${rallyDragon.power.toLocaleString()} قوة)!`,
        },
      };
    }

    case 'REINFORCE_RALLY': {
      const rally = prev.pack.activeRally;
      if (!rally || rally.status === 'RESOLVED') return reject(prev);

      if (action.mode === 'ALLY_CALL') {
        const joinedIds = new Set(rally.participants.map((pt) => pt.id));
        const realAllies = (prev.pack.realMembers ?? []).filter(
          (m) => m.publicId !== effectiveCurrentUid && !joinedIds.has(m.publicId)
        );
        const freeSlots = Math.max(0, rally.maxSlots - rally.participants.length);
        if (freeSlots === 0 || realAllies.length === 0) {
          return reject(
            prev,
            'لا يوجد أعضاء إضافيون في التحالف للمشاركة الآن — ادعُ أصدقاءك أو استخدم التعزيز الذاتي!'
          );
        }
        const joining = realAllies.slice(0, Math.min(3, freeSlots));
        const addedParticipants = joining.map((m) => ({
          id: m.publicId,
          name: m.displayName,
          role: m.role,
          power: Math.max(400, m.powerRating),
          dragonsCount: 1,
          dragons: [],
          joinedAt: nowTs,
        }));
        const powerAdded = addedParticipants.reduce((a, b) => a + b.power, 0);

        const nextState: GameState = {
          ...prev,
          pack: {
            ...prev.pack,
            activeRally: {
              ...rally,
              participants: [...rally.participants, ...addedParticipants],
            },
            logs: appendAllianceLog(prev.pack.logs, {
              type: 'RALLY',
              actor: joining.map((j) => j.displayName).join(' و '),
              message: `ساندوا الحشد بقوة +${powerAdded.toLocaleString()}!`,
            }),
          },
        };
        return {
          nextState,
          receipt: {
            ok: true,
            stateChanged: true,
            sound: 'claim',
            haptic: 'light',
            message: `🐉 انضم ${joining.length} أعضاء حقيقيين للحشد (+${powerAdded.toLocaleString()} قوة)!`,
          },
        };
      }

      if (prev.corn < 250) {
        return reject(prev, 'تحتاج 250⚡ لتعزيز طاقة تنانينك داخل الحشد!');
      }
      const boostPower = Math.max(
        2400,
        Math.round(prev.ducks.reduce((acc, d) => acc + (d.powerRating ?? 100), 0) * 3.5)
      );
      const curLedger = { ...createInitialAllianceLedger(), ...(prev.pack.ledger ?? {}) };
      const nextState: GameState = {
        ...prev,
        corn: prev.corn - 250,
        treasury: withBurnedEnergy(prev.treasury, 250),
        pack: {
          ...prev.pack,
          allianceCoins: (prev.pack.allianceCoins ?? 0) + 65,
          contributionTotal: (prev.pack.contributionTotal ?? 0) + 100,
          ledger: {
            ...curLedger,
            playerRallyContrib: curLedger.playerRallyContrib + boostPower,
          },
          activeRally: {
            ...rally,
            participants: rally.participants.map((pt) =>
              pt.id === 'player_self' ? { ...pt, power: pt.power + boostPower } : pt
            ),
          },
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -250,
          sound: 'claim',
          message: `🔥 عزّزت طاقة تنانينك في الحشد (+${boostPower.toLocaleString()} قوة · +65🪙)!`,
        },
      };
    }

    case 'SPEEDUP_RALLY': {
      const rally = prev.pack.activeRally;
      if (!rally || rally.status !== 'GATHERING') return reject(prev);

      if (action.mode === 'ALLY_HELP') {
        if (rally.helpUsedCount >= 5) {
          return reject(prev, 'استُخدمت فزعات الأعضاء المجانية لهذا الحشد بالكامل (5/5)!');
        }
        const nextEnds = Math.max(nowTs, rally.marchEndsAt - 15 * 60 * 1000);
        const nextState: GameState = {
          ...prev,
          pack: {
            ...prev.pack,
            allianceCoins: (prev.pack.allianceCoins ?? 0) + 25,
            activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 4),
            activeRally: {
              ...rally,
              marchEndsAt: nextEnds,
              status: nextEnds <= nowTs ? 'READY' : 'GATHERING',
              helpUsedCount: rally.helpUsedCount + 1,
            },
          },
        };
        return {
          nextState,
          receipt: {
            ok: true,
            stateChanged: true,
            sound: 'claim',
            message: '🐎 فزعة الأعضاء سرّعت مسير الحشد -15 دقيقة (+25🪙)!',
          },
        };
      }

      if (action.mode === 'RESOURCE_BOOST') {
        if (prev.corn < 100) {
          return reject(prev, 'تحتاج 100⚡ لتسريع مسير الحشد -45 دقيقة!');
        }
        const nextEnds = Math.max(nowTs, rally.marchEndsAt - 45 * 60 * 1000);
        const nextState: GameState = {
          ...prev,
          corn: prev.corn - 100,
          treasury: withBurnedEnergy(prev.treasury, 100),
          pack: {
            ...prev.pack,
            allianceCoins: (prev.pack.allianceCoins ?? 0) + 35,
            activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 5),
            activeRally: {
              ...rally,
              marchEndsAt: nextEnds,
              status: nextEnds <= nowTs ? 'READY' : 'GATHERING',
            },
            logs: appendAllianceLog(prev.pack.logs, {
              type: 'RALLY',
              actor: prev.username,
              message: 'ضغط تسريع مسير الحشد (-45 دقيقة · 100⚡).',
            }),
          },
        };
        return {
          nextState,
          receipt: {
            ok: true,
            stateChanged: true,
            actualCornDelta: -100,
            sound: 'claim',
            message: '⚡ تم تسريع مسير الحشد -45 دقيقة (+35🪙)!',
          },
        };
      }

      if (prev.corn < 250) {
        return reject(prev, 'تحتاج 250⚡ للتسريع الفائق -4 ساعات!');
      }
      const nextEnds = Math.max(nowTs, rally.marchEndsAt - 240 * 60 * 1000);
      const nextState: GameState = {
        ...prev,
        corn: prev.corn - 250,
        treasury: withBurnedEnergy(prev.treasury, 250),
        pack: {
          ...prev.pack,
          allianceCoins: (prev.pack.allianceCoins ?? 0) + 75,
          activeRally: {
            ...rally,
            marchEndsAt: nextEnds,
            status: nextEnds <= nowTs ? 'READY' : 'GATHERING',
          },
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -250,
          sound: 'godConfirm',
          message: '🚀 تم التسريع الفائق لمسير التحشيد (-4 ساعات)!',
        },
      };
    }

    case 'RESOLVE_ALLIANCE_RALLY': {
      const rally = prev.pack.activeRally;
      if (!rally) return reject(prev);
      if (rally.status === 'GATHERING' && nowTs < rally.marchEndsAt) {
        return reject(prev, 'الحشد ما زال في مرحلة التجمع والمسير! سرّع المسير أو انتظر انتهاء العدّاد.');
      }
      const target = ALLIANCE_MAP_TARGETS.find((t) => t.id === rally.targetId);
      if (!target) return reject(prev);

      const lvInfo = getAllianceLevelInfo(prev.pack.xp ?? 2250);
      const rallyCapLv = prev.pack.techLevels?.tech_rally_capacity ?? 0;
      const siegeLv = prev.pack.techLevels?.tech_pyramid_siege ?? 0;
      const divLv = prev.pack.techLevels?.tech_dividend_vault ?? 0;
      const sdState = prev.pack.swarmDragon ?? createInitialSwarmDragonState();
      const swarmBonusPower = sdState.unlocked ? computeSwarmDragonTotalStats(sdState).totalPower : 0;

      const rawPower =
        rally.participants.reduce((a, b) => a + b.power, 0) + swarmBonusPower;
      const totalPower = Math.round(
        rawPower * (1 + rallyCapLv * 0.08 + siegeLv * 0.12 + lvInfo.powerBonusPct / 100)
      );
      const won = totalPower >= target.requiredPower;

      const lootBonus = rally.lootMultiplier * (1 + siegeLv * 0.1 + lvInfo.levelLootBonusPct / 100);
      const dividendBonusMult = 1 + divLv * 0.15;
      const vaultCornGain = won ? Math.round(target.rewards.vaultCorn * lootBonus) : 450;
      const techGain = won ? Math.round(target.rewards.techPts * lootBonus) : 120;
      const playerCoins = won ? Math.round(target.rewards.coins * lootBonus) : 65;
      const playerStars = won ? target.rewards.stars : 0;
      const playerGold = won ? target.rewards.gold : 0;
      const poolCornGain = won ? Math.round(target.rewards.poolCorn * lootBonus * dividendBonusMult) : 150;
      const poolCoinsGain = won ? Math.round(target.rewards.poolCoins * lootBonus * dividendBonusMult) : 40;
      const poolStarsGain = won ? Math.round(target.rewards.poolStars * dividendBonusMult) : 0;
      const xpGain = won ? target.allianceXpReward : 4500;

      const curLedger = { ...createInitialAllianceLedger(), ...(prev.pack.ledger ?? {}) };
      const curPool = { ...createInitialRewardPool(), ...(prev.pack.rewardPool ?? {}) };
      const existingOccupied = (prev.pack.occupiedSites ?? []).filter((s) => s.targetId !== target.id);
      const nextOccupied =
        won && target.occupyHours > 0
          ? [
              ...existingOccupied,
              {
                targetId: target.id,
                nameAr: target.nameAr,
                coords: target.coords,
                occupiedAt: nowTs,
                expiresAt: nowTs + target.occupyHours * 3600 * 1000,
                hourlyCornVault: Math.round(target.hourlyCornVault * (1 + divLv * 0.08)),
                hourlyTechPts: Math.round(target.hourlyTechPts * (1 + divLv * 0.08)),
                lastHarvestAt: nowTs,
              },
            ]
          : prev.pack.occupiedSites ?? [];

      let nextNotifications = prev.pack.notifications;
      if (won && target.type === 'PYRAMID') {
        nextNotifications = appendAllianceNotification(nextNotifications, {
          category: 'PYRAMID_CAPTURED',
          titleAr: `سيطر السرب على ${target.nameAr}!`,
          bodyAr: `احتلال ${target.occupyHours} ساعات يدرّ +${Math.round(target.hourlyCornVault * (1 + divLv * 0.08)).toLocaleString()}⚡/س للخزينة ويموّل صندوق التوزيع.`,
          targetSubTab: 'MAP',
          inviteText: `🏛️ تم احتلال "${target.nameAr}" لـ ${target.occupyHours} ساعات! ادخلوا لحصاد الخراج الساعي ورفع جدارة الأرباح.`,
        });
      }

      let nextPack: GameState['pack'] = {
        ...prev.pack,
        treasuryCorn: prev.pack.treasuryCorn + vaultCornGain,
        allianceCoins: (prev.pack.allianceCoins ?? 0) + playerCoins,
        contributionTotal: (prev.pack.contributionTotal ?? 0) + playerCoins,
        power: prev.pack.power + (won ? 350 : 0),
        activeRally: null,
        occupiedSites: nextOccupied,
        mapCooldowns: {
          ...(prev.pack.mapCooldowns ?? {}),
          [target.id]: nowTs + target.cooldownMinutes * 60 * 1000,
        },
        rewardPool: {
          ...curPool,
          corn: curPool.corn + poolCornGain,
          allianceCoins: curPool.allianceCoins + poolCoinsGain,
          stars: curPool.stars + poolStarsGain,
          duckGold: curPool.duckGold + (won ? 1 : 0),
        },
        notifications: nextNotifications,
        ledger: {
          ...curLedger,
          techPointsPool: curLedger.techPointsPool + techGain,
          playerRallyContrib: curLedger.playerRallyContrib + (won ? 1200 : 250),
          ralliesWon: curLedger.ralliesWon + (won ? 1 : 0),
          pyramidsCaptured:
            curLedger.pyramidsCaptured + (won && target.type === 'PYRAMID' ? 1 : 0),
        },
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'RALLY',
          actor: prev.username,
          message: won
            ? `انتصر حشد السرب (${rally.participants.length} حلفاء) على "${target.nameAr}" بقوة ${totalPower.toLocaleString()}! (+${vaultCornGain.toLocaleString()}⚡ خزينة · +${poolCornGain.toLocaleString()}⚡ لصندوق التوزيع).`
            : `تراجع الحشد أمام "${target.nameAr}" (${totalPower.toLocaleString()} / ${target.requiredPower.toLocaleString()} قوة) — ادعوا حلفاء أكثر في المرة القادمة.`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, xpGain);

      const nextState: GameState = {
        ...prev,
        stars: prev.stars + playerStars,
        duckGold: prev.duckGold + playerGold,
        eggQueue: won && target.rewards.egg ? [...prev.eggQueue, target.rewards.egg] : prev.eggQueue,
        breedingEggs:
          won && target.rewards.breedingEggs
            ? (prev.breedingEggs ?? 0) + target.rewards.breedingEggs
            : prev.breedingEggs,
        treasury: playerStars > 0 ? withEarnedStars(prev.treasury, playerStars) : prev.treasury,
        pack: nextPack,
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualStarsDelta: playerStars,
          actualGoldDelta: playerGold,
          sound: won ? 'victory' : 'error',
          haptic: won ? 'success' : 'warning',
          message: won
            ? `🏆 انتصار الحشد على ${target.nameAr}! +${playerCoins}🪙 +${playerStars}★ (+${vaultCornGain.toLocaleString()}⚡ للخزينة و +${poolCornGain.toLocaleString()}⚡ لصندوق التوزيع)!`
            : `⚔️ القوة الجماعية (${totalPower.toLocaleString()}) أقل من المطلوب (${target.requiredPower.toLocaleString()})! طوّر أبحاث الحشود.`,
        },
      };
    }

    case 'HARVEST_OCCUPIED_SITE': {
      const site = (prev.pack.occupiedSites ?? []).find((s) => s.targetId === action.targetId);
      if (!site) return reject(prev);
      const elapsedHours = Math.max(0.2, (nowTs - site.lastHarvestAt) / 3600000);
      const vaultGain = Math.max(450, Math.round(site.hourlyCornVault * elapsedHours));
      const techGain = Math.max(140, Math.round(site.hourlyTechPts * elapsedHours));
      const poolShare = Math.round(vaultGain * 0.25);

      const curLedger = { ...createInitialAllianceLedger(), ...(prev.pack.ledger ?? {}) };
      const curPool = { ...createInitialRewardPool(), ...(prev.pack.rewardPool ?? {}) };
      let nextPack: GameState['pack'] = {
        ...prev.pack,
        treasuryCorn: prev.pack.treasuryCorn + vaultGain,
        allianceCoins: (prev.pack.allianceCoins ?? 0) + 120,
        ledger: {
          ...curLedger,
          techPointsPool: curLedger.techPointsPool + techGain,
          playerRallyContrib: curLedger.playerRallyContrib + 180,
        },
        rewardPool: {
          ...curPool,
          corn: curPool.corn + poolShare,
          allianceCoins: curPool.allianceCoins + 150,
        },
        occupiedSites: (prev.pack.occupiedSites ?? []).map((s) =>
          s.targetId === action.targetId ? { ...s, lastHarvestAt: nowTs } : s
        ),
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'RALLY',
          actor: prev.username,
          message: `حصد خراج "${site.nameAr}" (+${vaultGain.toLocaleString()}⚡ للخزينة · +${techGain.toLocaleString()} بحث · +${poolShare.toLocaleString()}⚡ لصندوق التوزيع).`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 6500);
      return {
        nextState: { ...prev, pack: nextPack },
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'claim',
          message: `🏛️ حُصد خراج ${site.nameAr}: +${vaultGain.toLocaleString()}⚡ للخزينة · +${techGain.toLocaleString()} بحث · +120🪙!`,
        },
      };
    }

    case 'MARK_NOTIFICATION_READ': {
      return {
        nextState: {
          ...prev,
          pack: {
            ...prev.pack,
            notifications: (prev.pack.notifications ?? []).map((n) =>
              action.notifId === 'ALL' || n.id === action.notifId ? { ...n, read: true } : n
            ),
          },
        },
        receipt: { ok: true, stateChanged: true },
      };
    }

    case 'SEND_QUICK_ALLIANCE_INVITE': {
      const clean = action.text.trim();
      if (!clean) return reject(prev);
      const nextState: GameState = {
        ...prev,
        pack: {
          ...prev.pack,
          activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 2),
          messages: [
            ...prev.pack.messages,
            {
              id: `msg_inv_${nowTs}`,
              sender: prev.username,
              text: clean,
              time: new Date(nowTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
              isSystemInvite: true,
              actionSubTab: action.actionSubTab ?? 'MAP',
              actionLabel: action.actionLabel ?? 'مشاركة فورية',
            },
          ].slice(-35),
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'godConfirm',
          haptic: 'light',
          message: '📣 أُرسلت الدعوة التفاعلية في شات السرب بنجاح!',
        },
      };
    }

    case 'DISTRIBUTE_ALLIANCE_DIVIDENDS': {
      const lastAt = prev.pack.lastDividendAt ?? 0;
      const cdLeft = Math.max(0, lastAt + ALLIANCE_DAILY_LIMITS.DIVIDEND_COOLDOWN_MS - nowTs);
      if (cdLeft > 0) {
        return reject(
          prev,
          `الدورة القادمة لتوزيع مكافآت السرب متاحة بعد ${Math.ceil(cdLeft / 60000)} دقيقة.`
        );
      }
      const playerPower = prev.ducks.reduce((acc, d) => acc + (d.powerRating ?? 100), 0);
      const breakdown = calculateAllianceDividendBreakdown(prev, playerPower);
      const myShare = breakdown.playerShare;

      const energyGrant = withEarnedEnergy(prev, myShare.cornShare, true);
      const nextTreasury =
        myShare.starsShare > 0
          ? withEarnedStars(energyGrant.treasury, myShare.starsShare)
          : energyGrant.treasury;
      const curLedger = { ...createInitialAllianceLedger(), ...(prev.pack.ledger ?? {}) };
      const curPool = { ...createInitialRewardPool(), ...(prev.pack.rewardPool ?? {}) };
      const nextCycle = (curPool.cycleNumber ?? 1) + 1;

      let nextPack: GameState['pack'] = {
        ...prev.pack,
        allianceCoins: (prev.pack.allianceCoins ?? 0) + myShare.coinsShare,
        lastDividendAt: nowTs,
        rewardPool: {
          corn: 2400,
          allianceCoins: 450,
          stars: 0,
          duckGold: 2,
          cycleNumber: nextCycle,
        },
        ledger: {
          ...curLedger,
          totalDividendsClaimed: (curLedger.totalDividendsClaimed ?? 0) + 1,
        },
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'DIVIDEND',
          actor: prev.username,
          message: `وزّع أرباح الدورة #${curPool.cycleNumber}: حصتك ${myShare.sharePct}% (+${myShare.cornShare.toLocaleString()}⚡ · +${myShare.coinsShare}🪙 · +${myShare.starsShare}★ · +${myShare.goldShare}💎).`,
        }),
        messages: [
          ...prev.pack.messages,
          {
            id: `msg_div_${nowTs}`,
            sender: 'خزينة السرب',
            text: `💰 اكتمل توزيع غنائم الدورة #${curPool.cycleNumber} حسب الجدارة! حصتك: ${myShare.sharePct}% (+${myShare.cornShare.toLocaleString()}⚡ و +${myShare.coinsShare}🪙).`,
            time: new Date(nowTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            isSystemInvite: true,
            actionSubTab: 'ROSTER' as const,
            actionLabel: 'عرض الحصص',
          },
        ].slice(-35),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 8500);

      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + myShare.starsShare,
        duckGold: prev.duckGold + myShare.goldShare,
        treasury: nextTreasury,
        pack: nextPack,
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: myShare.starsShare,
          actualGoldDelta: myShare.goldShare,
          sound: 'chestOpen',
          haptic: 'success',
          message: `💰 استلمت حصتك (${myShare.sharePct}%): +${cornDelta.toLocaleString()}⚡ +${myShare.coinsShare}🪙 +${myShare.starsShare}★ +${myShare.goldShare}💎!`,
        },
      };
    }

    case 'HELP_ALLIES': {
      const used = prev.pack.helpsToday ?? 0;
      if (used >= ALLIANCE_DAILY_LIMITS.MAX_HELPS_PER_DAY) {
        return reject(prev, 'اكتملت مساعدات الإخوة لليوم!');
      }
      const energyGrant = withEarnedEnergy(prev, 80);
      let nextPack: GameState['pack'] = {
        ...prev.pack,
        allianceCoins: (prev.pack.allianceCoins ?? 0) + 60,
        contributionTotal: (prev.pack.contributionTotal ?? 0) + 45,
        activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 6),
        helpsToday: used + 1,
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'HELP',
          actor: prev.username,
          message: 'ساعد إخوة السرب في تسريع التطوير وتجهيز العش.',
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 1800);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        treasury: energyGrant.treasury,
        pack: nextPack,
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          sound: 'claim',
          haptic: 'light',
          message: `ساعدت إخوة السرب (+60 🪙 · +${cornDelta}⚡ · +6 نشاط)!`,
        },
      };
    }

    case 'ALLIANCE_BREED_SPEEDUP': {
      const lastHelp = prev.pack.lastBreedHelpAt ?? 0;
      if (nowTs < lastHelp + ALLIANCE_DAILY_LIMITS.BREEDING_HELP_COOLDOWN_MS) {
        const mins = Math.ceil(
          (lastHelp + ALLIANCE_DAILY_LIMITS.BREEDING_HELP_COOLDOWN_MS - nowTs) / 60000
        );
        return reject(prev, `مساعدة التزاوج متاحة بعد ${mins} دقيقة.`);
      }
      const activeCount = prev.ducks.filter(
        (d) => d.breedingEndsAt && d.breedingEndsAt > nowTs
      ).length;
      if (activeCount === 0) {
        return reject(prev, 'لا يوجد أي تنين في بوابة التزاوج حالياً!');
      }
      let nextPack: GameState['pack'] = {
        ...prev.pack,
        lastBreedHelpAt: nowTs,
        allianceCoins: (prev.pack.allianceCoins ?? 0) + 70,
        activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 10),
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'HELP',
          actor: prev.username,
          message: `حصل على فزعة السرب لتقليص وقت التزاوج -2 ساعة لـ ${activeCount} تنين.`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 2600);
      const nextState: GameState = {
        ...prev,
        ducks: prev.ducks.map((d) =>
          d.breedingEndsAt && d.breedingEndsAt > nowTs
            ? {
                ...d,
                breedingEndsAt: Math.max(
                  nowTs,
                  d.breedingEndsAt - ALLIANCE_DAILY_LIMITS.BREEDING_HELP_REDUCTION_MS
                ),
              }
            : d
        ),
        pack: nextPack,
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'godConfirm',
          haptic: 'success',
          message: `أرسل الإخوة دعمهم! تم تقليص وقت التزاوج -2 ساعة لـ ${activeCount} تنين!`,
        },
      };
    }

    case 'ATTACK_ALLIANCE_BOSS': {
      const used = prev.pack.bossAttacksToday ?? 0;
      if (used >= ALLIANCE_DAILY_LIMITS.MAX_BOSS_ATTACKS_PER_DAY) {
        return reject(
          prev,
          `استنفدت هجمات الزعيم اليومية (${ALLIANCE_DAILY_LIMITS.MAX_BOSS_ATTACKS_PER_DAY}/${ALLIANCE_DAILY_LIMITS.MAX_BOSS_ATTACKS_PER_DAY})!`
        );
      }
      const sdState = prev.pack.swarmDragon ?? createInitialSwarmDragonState();
      const swarmDmgBonus = sdState.unlocked
        ? Math.round(computeSwarmDragonTotalStats(sdState).attack * 2.5)
        : 0;
      const totalPower = prev.ducks.reduce((acc, d) => acc + (d.powerRating ?? 100), 0);
      const dmg = Math.max(
        420,
        Math.round(totalPower * 0.95 + (prev.pack.talents?.fury ?? 0) * 95 + swarmDmgBonus)
      );
      const prevHp = prev.pack.bossHp ?? prev.pack.bossMaxHp ?? 12500;
      const bossLv = prev.pack.bossLevel ?? 4;
      const isKill = prevHp - dmg <= 0;
      const nextLv = isKill ? bossLv + 1 : bossLv;
      const nextMaxHp = isKill ? 12500 + (nextLv - 4) * 4500 : prev.pack.bossMaxHp ?? 12500;
      const nextHp = isKill ? nextMaxHp : prevHp - dmg;
      const energyGain = isKill ? 580 : 200;
      const coinGain = isKill ? 300 : 100;
      const starGain = 0;

      const energyGrant = withEarnedEnergy(prev, energyGain);
      const nextTreasury = energyGrant.treasury;
      const curPool = { ...createInitialRewardPool(), ...(prev.pack.rewardPool ?? {}) };
      const curLedger = { ...createInitialAllianceLedger(), ...(prev.pack.ledger ?? {}) };

      let nextPack: GameState['pack'] = {
        ...prev.pack,
        bossLevel: nextLv,
        bossHp: nextHp,
        bossMaxHp: nextMaxHp,
        bossAttacksToday: used + 1,
        allianceCoins: (prev.pack.allianceCoins ?? 0) + coinGain,
        contributionTotal: (prev.pack.contributionTotal ?? 0) + coinGain,
        activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + (isKill ? 22 : 15)),
        power: prev.pack.power + (isKill ? 120 : 30),
        ledger: {
          ...curLedger,
          playerRallyContrib: curLedger.playerRallyContrib + Math.round(dmg * 0.35),
        },
        rewardPool: {
          ...curPool,
          corn: curPool.corn + (isKill ? 1800 : 350),
          allianceCoins: curPool.allianceCoins + (isKill ? 380 : 80),
        },
        coopProgress: {
          ...createInitialCoopProgress(),
          ...(prev.pack.coopProgress ?? {}),
          coop_boss: (prev.pack.coopProgress?.coop_boss ?? 48000) + dmg,
        },
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'BOSS',
          actor: prev.username,
          message: isKill
            ? `أسقط زعيم السرب [Lv.${bossLv}] بضربة قاضية (${dmg.toLocaleString()} ضرر)!`
            : `هاجم زعيم السرب [Lv.${bossLv}] وألحق ${dmg.toLocaleString()} ضرر!`,
        }),
        messages: isKill
          ? [
              ...prev.pack.messages,
              {
                id: `msg_boss_${nowTs}`,
                sender: prev.username,
                text: `🔥 حطّمت زعيم السرب [Lv.${bossLv}] بضربة ${dmg.toLocaleString()}! غنيمة للجميع وإضافة لصندوق الأرباح!`,
                time: new Date(nowTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
              },
            ].slice(-35)
          : prev.pack.messages,
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, isKill ? 18000 : 4500);

      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + starGain,
        treasury: nextTreasury,
        pack: nextPack,
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: starGain,
          sound: 'critHit',
          haptic: isKill ? 'success' : 'medium',
          message: isKill
            ? `🏆 قُضي على زعيم السرب [Lv.${bossLv}]! +${coinGain}🪙 +${cornDelta}⚡ +${starGain}★!`
            : `⚔️ ضربة ${dmg.toLocaleString()} للزعيم! +${coinGain}🪙 و +${cornDelta}⚡!`,
        },
      };
    }

    case 'SUPPORT_COOP_GOAL': {
      const goal = ALLIANCE_COOP_MISSIONS_CATALOG.find((g) => g.id === action.coopId);
      if (!goal) return reject(prev);
      if (prev.corn < goal.supportCostCorn) {
        return reject(prev, `تحتاج ${goal.supportCostCorn}⚡ للمساهمة ودعم هذا الهدف التعاوني!`);
      }
      const baseCoop = { ...createInitialCoopProgress(), ...(prev.pack.coopProgress ?? {}) };
      const curVal =
        action.coopId === 'coop_treasury'
          ? Math.max(prev.pack.treasuryCorn, baseCoop[action.coopId] ?? goal.initialSeed)
          : baseCoop[action.coopId] ?? goal.initialSeed;
      let nextPack: GameState['pack'] = {
        ...prev.pack,
        treasuryCorn:
          action.coopId === 'coop_treasury'
            ? prev.pack.treasuryCorn + goal.supportBoost
            : prev.pack.treasuryCorn,
        allianceCoins: (prev.pack.allianceCoins ?? 0) + 30,
        contributionTotal: (prev.pack.contributionTotal ?? 0) + 35,
        activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 10),
        coopProgress: {
          ...baseCoop,
          [action.coopId]: curVal + goal.supportBoost,
        },
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'COOP',
          actor: prev.username,
          message: `دعم مهمة "${goal.titleAr}" بإضافة +${goal.supportBoost.toLocaleString()} ${goal.unitAr}!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 2500);

      const nextState: GameState = {
        ...prev,
        corn: prev.corn - goal.supportCostCorn,
        treasury: withBurnedEnergy(prev.treasury, goal.supportCostCorn),
        pack: nextPack,
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -goal.supportCostCorn,
          sound: 'claim',
          haptic: 'light',
          message: `دعمت "${goal.titleAr}" (+${goal.supportBoost.toLocaleString()} ${goal.unitAr} · +30🪙)!`,
        },
      };
    }

    case 'CLAIM_COOP_GOAL': {
      const goal = ALLIANCE_COOP_MISSIONS_CATALOG.find((g) => g.id === action.coopId);
      if (!goal || (prev.pack.claimedCoopGoals ?? []).includes(action.coopId)) return reject(prev);
      const rawProg =
        action.coopId === 'coop_treasury'
          ? Math.max(prev.pack.treasuryCorn, prev.pack.coopProgress?.[action.coopId] ?? goal.initialSeed)
          : prev.pack.coopProgress?.[action.coopId] ?? goal.initialSeed;
      if (rawProg < goal.target) {
        return reject(prev, 'لم يكتمل الهدف الجماعي للسرب بعد!');
      }
      const energyGrant = withEarnedEnergy(prev, goal.rewardCorn);
      const nextTreasury =
        goal.rewardStars > 0
          ? withEarnedStars(energyGrant.treasury, goal.rewardStars)
          : energyGrant.treasury;

      let nextPack: GameState['pack'] = {
        ...prev.pack,
        claimedCoopGoals: [...(prev.pack.claimedCoopGoals ?? []), action.coopId],
        allianceCoins: (prev.pack.allianceCoins ?? 0) + goal.rewardCoins,
        contributionTotal: (prev.pack.contributionTotal ?? 0) + goal.rewardCoins,
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'COOP',
          actor: prev.username,
          message: `استلم المكافأة الجماعية لإنجاز "${goal.titleAr}" (+${goal.rewardCorn}⚡ · +${goal.rewardCoins}🪙)!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, goal.rewardXp);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + goal.rewardStars,
        duckGold: prev.duckGold + goal.rewardGold,
        eggQueue: goal.rewardEgg ? [...prev.eggQueue, goal.rewardEgg] : prev.eggQueue,
        breedingEggs: (prev.breedingEggs ?? 0) + (goal.rewardBreedingEggs ?? 0),
        treasury: nextTreasury,
        pack: nextPack,
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: goal.rewardStars,
          actualGoldDelta: goal.rewardGold,
          sound: 'chestOpen',
          haptic: 'success',
          message: `🏆 أُنجزت المهمة التعاونية "${goal.titleAr}": +${cornDelta}⚡ +${goal.rewardCoins}🪙!`,
        },
      };
    }

    case 'DONATE_DRAGON_TO_SWARM': {
      if (prev.ducks.length <= 1) {
        return reject(prev, 'يجب أن تحتفظ بتنين واحد على الأقل لخوض الحلبة والمهام!');
      }
      const targetDragon = prev.ducks.find((d) => d.id === action.dragonId);
      if (!targetDragon) return reject(prev);

      const extracted = extractDragonTransferStats(targetDragon);
      const sd = prev.pack.swarmDragon ?? createInitialSwarmDragonState();
      const wasUnlocked = sd.unlocked;
      const updatedCount = sd.donatedCount + 1;
      const unlockedNow = sd.unlocked || updatedCount >= sd.requiredDragons;

      const remainingDucks = normalizeDragonSlots(
        prev.ducks.filter((d) => d.id !== action.dragonId),
        prev.unlockedSlots
      );

      const entry = {
        id: `sd_user_${nowTs}`,
        donorName: prev.username,
        dragonName: targetDragon.name,
        skin: targetDragon.skin,
        rarity: targetDragon.rarity,
        level: targetDragon.level,
        customLevel: targetDragon.customLevel ?? 0,
        sizeTier: extracted.sizeTier,
        gear: extracted.gear,
        aura: extracted.aura,
        skillLevel: extracted.skillLevel,
        trainingLevel: extracted.trainingLevel,
        powerAdded: extracted.powerAdded,
        hpAdded: extracted.hpAdded,
        attackAdded: extracted.attackAdded,
        defenseAdded: extracted.defenseAdded,
        speedAdded: extracted.speedAdded,
        donatedAt: nowTs,
      };

      const nextGearIds =
        extracted.gear !== 'none' && !sd.inheritedGearIds.includes(extracted.gear)
          ? [...sd.inheritedGearIds, extracted.gear]
          : sd.inheritedGearIds;
      const nextAuraIds =
        extracted.aura !== 'auto' && !sd.inheritedAuraIds.includes(extracted.aura)
          ? [...sd.inheritedAuraIds, extracted.aura]
          : sd.inheritedAuraIds;
      const nextSkins = !sd.inheritedSkins.includes(targetDragon.skin)
        ? [...sd.inheritedSkins, targetDragon.skin]
        : sd.inheritedSkins;

      let nextPack: GameState['pack'] = {
        ...prev.pack,
        power: prev.pack.power + extracted.powerAdded,
        allianceCoins: (prev.pack.allianceCoins ?? 0) + 380,
        contributionTotal: (prev.pack.contributionTotal ?? 0) + 450,
        activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 25),
        swarmDragon: {
          ...sd,
          unlocked: unlockedNow,
          donatedCount: updatedCount,
          inheritedPower: sd.inheritedPower + extracted.powerAdded,
          inheritedHp: sd.inheritedHp + extracted.hpAdded,
          inheritedAttack: sd.inheritedAttack + extracted.attackAdded,
          inheritedDefense: sd.inheritedDefense + extracted.defenseAdded,
          inheritedSpeed: sd.inheritedSpeed + extracted.speedAdded,
          inheritedGearIds: nextGearIds,
          inheritedAuraIds: nextAuraIds,
          inheritedSkins: nextSkins,
          donations: [entry, ...sd.donations],
        },
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'DRAGON',
          actor: prev.username,
          message: `تبرّع بتنين "${targetDragon.name}" إلى تنين السرب ونقل جميع خصائصه (+${extracted.powerAdded.toLocaleString()} قوة · +${extracted.hpAdded} HP · +${extracted.attackAdded} ATK)!${
            !wasUnlocked && unlockedNow ? ' 🐉 فُتح تنين السرب رسمياً!' : ''
          }`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 15000);

      const safeIdx = Math.min(prev.activeDuckIndex, Math.max(0, remainingDucks.length - 1));
      const nextState: GameState = {
        ...prev,
        ducks: remainingDucks,
        activeDuckIndex: isDragonSlotLocked(remainingDucks[safeIdx], prev.unlockedSlots)
          ? getFirstUnlockedDragonIndex(remainingDucks, prev.unlockedSlots)
          : safeIdx,
        pack: nextPack,
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'chestOpen',
          haptic: 'success',
          message:
            !wasUnlocked && unlockedNow
              ? `🐉 مبروك! تم فتح تنين السرب وانتقلت جميع خصائص "${targetDragon.name}" إليه (+${extracted.powerAdded.toLocaleString()} قوة)!`
              : `🐉 انتقلت جميع خصائص "${targetDragon.name}" إلى تنين السرب (+${extracted.powerAdded.toLocaleString()} قوة · +380🪙)!`,
        },
      };
    }

    case 'TRAIN_SWARM_DRAGON': {
      const sd = prev.pack.swarmDragon ?? createInitialSwarmDragonState();
      if (!sd.unlocked) {
        return reject(
          prev,
          `يلزم أولاً إكمال تبرعات التنانين (${sd.donatedCount}/${sd.requiredDragons}) لفتح تنين السرب!`
        );
      }
      if (sd.level >= 50) return reject(prev);
      const cost = getSwarmDragonLevelUpCost(sd.level);
      if (prev.corn < cost.energyCost) {
        return reject(prev, `تحتاج ${cost.energyCost.toLocaleString()}⚡ لرفع مستوى تنين السرب!`);
      }
      if ((prev.pack.allianceCoins ?? 0) < cost.coinsCost) {
        return reject(prev, `تحتاج ${cost.coinsCost}🪙 عملة سرب لرفع مستوى تنين السرب!`);
      }
      const nextLv = sd.level + 1;
      let nextPack: GameState['pack'] = {
        ...prev.pack,
        allianceCoins: Math.max(0, (prev.pack.allianceCoins ?? 0) - cost.coinsCost),
        power: prev.pack.power + 620,
        contributionTotal: (prev.pack.contributionTotal ?? 0) + cost.coinsCost,
        activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 10),
        swarmDragon: { ...sd, level: nextLv, xp: 0 },
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'DRAGON',
          actor: prev.username,
          message: `رقّى مستوى "${sd.name}" إلى Lv.${nextLv}!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 5200);
      return {
        nextState: {
          ...prev,
          corn: prev.corn - cost.energyCost,
          treasury: withBurnedEnergy(prev.treasury, cost.energyCost),
          pack: nextPack,
        },
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -cost.energyCost,
          sound: 'levelUp',
          haptic: 'success',
          message: `⬆️ ارتقى تنين السرب إلى المستوى Lv.${nextLv}!`,
        },
      };
    }

    case 'UPGRADE_SWARM_SKILL': {
      const sd = prev.pack.swarmDragon ?? createInitialSwarmDragonState();
      if (!sd.unlocked) {
        return reject(prev, 'افتح تنين السرب أولاً عبر التبرع بالتنانين!');
      }
      const meta = SWARM_DRAGON_UPGRADE_CATALOG.find((u) => u.key === action.key);
      if (!meta) return reject(prev);
      const curRank = sd.upgrades?.[action.key] ?? 0;
      if (curRank >= meta.maxLevel) return reject(prev);
      const cost = getSwarmDragonUpgradeCost(action.key, curRank);
      if (prev.corn < cost.energyCost || (prev.pack.allianceCoins ?? 0) < cost.coinsCost) {
        return reject(prev, `تحتاج ${cost.energyCost.toLocaleString()}⚡ و ${cost.coinsCost}🪙 للترقية!`);
      }
      const nextRank = curRank + 1;
      let nextPack: GameState['pack'] = {
        ...prev.pack,
        allianceCoins: Math.max(0, (prev.pack.allianceCoins ?? 0) - cost.coinsCost),
        power: prev.pack.power + 320,
        activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 8),
        swarmDragon: {
          ...sd,
          upgrades: { ...sd.upgrades, [action.key]: nextRank },
        },
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'DRAGON',
          actor: prev.username,
          message: `طوّر "${meta.nameAr}" لتنين السرب إلى Lv.${nextRank}!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 3800);
      return {
        nextState: {
          ...prev,
          corn: prev.corn - cost.energyCost,
          treasury: withBurnedEnergy(prev.treasury, cost.energyCost),
          pack: nextPack,
        },
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -cost.energyCost,
          sound: 'levelUp',
          message: `🔥 تطوّر "${meta.nameAr}" إلى Lv.${nextRank}!`,
        },
      };
    }

    case 'UPGRADE_SWARM_GEAR': {
      const sd = prev.pack.swarmDragon ?? createInitialSwarmDragonState();
      if (!sd.unlocked) {
        return reject(prev, 'افتح تنين السرب أولاً لصقل العتاد!');
      }
      const meta = SWARM_DRAGON_GEAR_CATALOG.find((g) => g.slot === action.slot);
      if (!meta) return reject(prev);
      const curLv = sd.gearLevels?.[action.slot] ?? 0;
      if (curLv >= meta.maxLevel) return reject(prev);
      const cost = getSwarmDragonGearUpgradeCost(action.slot, curLv);
      if ((prev.pack.allianceCoins ?? 0) < cost.coinsCost || prev.duckGold < cost.goldCost) {
        return reject(prev, `تحتاج ${cost.coinsCost}🪙 و ${cost.goldCost}💎 لصقل هذا العتاد!`);
      }
      const nextLv = curLv + 1;
      let nextPack: GameState['pack'] = {
        ...prev.pack,
        allianceCoins: Math.max(0, (prev.pack.allianceCoins ?? 0) - cost.coinsCost),
        power: prev.pack.power + 420,
        activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + 10),
        swarmDragon: {
          ...sd,
          gearLevels: { ...sd.gearLevels, [action.slot]: nextLv },
        },
        logs: appendAllianceLog(prev.pack.logs, {
          type: 'DRAGON',
          actor: prev.username,
          message: `صقل عتاد "${meta.nameAr}" لتنين السرب إلى Lv.${nextLv}!`,
        }),
      };
      nextPack = applyAllianceXpAndLevelNotification(nextPack, 4800);
      return {
        nextState: {
          ...prev,
          duckGold: prev.duckGold - cost.goldCost,
          pack: nextPack,
        },
        receipt: {
          ok: true,
          stateChanged: true,
          actualGoldDelta: -cost.goldCost,
          sound: 'godConfirm',
          haptic: 'success',
          message: `🛡️ ارتقى عتاد "${meta.nameAr}" إلى +${nextLv}!`,
        },
      };
    }

    case 'SELECT_SWARM_SKIN': {
      const sd = prev.pack.swarmDragon ?? createInitialSwarmDragonState();
      return {
        nextState: {
          ...prev,
          pack: { ...prev.pack, swarmDragon: { ...sd, skin: action.skin } },
        },
        receipt: { ok: true, stateChanged: true, sound: 'tapFeed' },
      };
    }

    case 'CLAIM_ALLIANCE_QUEST': {
      const quest = ALLIANCE_QUESTS_CATALOG.find((q) => q.id === action.questId);
      if (!quest || (prev.pack.claimedAllianceQuests ?? []).includes(action.questId)) {
        return reject(prev);
      }
      const energyGrant = withEarnedEnergy(prev, quest.corn);
      const nextPack = applyAllianceXpAndLevelNotification(
        {
          ...prev.pack,
          claimedAllianceQuests: [...(prev.pack.claimedAllianceQuests ?? []), action.questId],
          allianceCoins: (prev.pack.allianceCoins ?? 0) + quest.allianceCoins,
          contributionTotal: (prev.pack.contributionTotal ?? 0) + quest.allianceCoins,
          activityPoints: Math.min(100, (prev.pack.activityPoints ?? 0) + quest.activityPts),
        },
        quest.xp
      );
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + quest.stars,
        treasury: withEarnedStars(energyGrant.treasury, quest.stars),
        pack: nextPack,
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: quest.stars,
          sound: 'claim',
          haptic: 'success',
          message: `أُنجزت مهمة "${quest.titleAr}": +${quest.allianceCoins}🪙 +${cornDelta}⚡ +${quest.stars}★!`,
        },
      };
    }

    case 'CLAIM_ACTIVITY_CHEST': {
      const chest = ALLIANCE_ACTIVITY_CHESTS.find((c) => c.threshold === action.threshold);
      if (!chest) return reject(prev);
      if ((prev.pack.activityPoints ?? 0) < action.threshold) return reject(prev);
      if ((prev.pack.claimedActivityChests ?? []).includes(action.threshold)) return reject(prev);

      const energyGrant = withEarnedEnergy(prev, chest.corn);
      const nextPack = applyAllianceXpAndLevelNotification(
        {
          ...prev.pack,
          claimedActivityChests: [...(prev.pack.claimedActivityChests ?? []), action.threshold],
          allianceCoins: (prev.pack.allianceCoins ?? 0) + chest.allianceCoins,
        },
        3500
      );
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + chest.stars,
        duckGold: prev.duckGold + chest.duckGold,
        treasury: withEarnedStars(energyGrant.treasury, chest.stars),
        pack: nextPack,
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: chest.stars,
          actualGoldDelta: chest.duckGold,
          sound: 'chestOpen',
          haptic: 'success',
          message: `تم فتح ${chest.titleAr}: +${cornDelta}⚡ +${chest.allianceCoins}🪙 +${chest.stars}★!`,
        },
      };
    }

    case 'CLAIM_ALLIANCE_GIFT': {
      const gift = (prev.pack.gifts ?? []).find((g) => g.id === action.giftId);
      if (!gift || gift.claimed) return reject(prev);
      const energyGrant = withEarnedEnergy(prev, gift.corn);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + gift.stars,
        treasury: withEarnedStars(energyGrant.treasury, gift.stars),
        pack: {
          ...prev.pack,
          allianceCoins: (prev.pack.allianceCoins ?? 0) + gift.allianceCoins,
          gifts: (prev.pack.gifts ?? []).map((g) =>
            g.id === action.giftId ? { ...g, claimed: true } : g
          ),
        },
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: gift.stars,
          sound: 'claim',
          message: `استلمت ${gift.titleAr}: +${cornDelta}⚡ +${gift.allianceCoins}🪙!`,
        },
      };
    }

    case 'CLAIM_ALL_ALLIANCE_GIFTS': {
      const unclaimed = (prev.pack.gifts ?? []).filter((g) => !g.claimed);
      if (unclaimed.length === 0) return reject(prev);
      const sumCorn = unclaimed.reduce((a, g) => a + g.corn, 0);
      const sumStars = unclaimed.reduce((a, g) => a + g.stars, 0);
      const sumCoins = unclaimed.reduce((a, g) => a + g.allianceCoins, 0);
      const energyGrant = withEarnedEnergy(prev, sumCorn);
      const nextState: GameState = {
        ...prev,
        corn: energyGrant.corn,
        stars: prev.stars + sumStars,
        treasury: withEarnedStars(energyGrant.treasury, sumStars),
        pack: {
          ...prev.pack,
          allianceCoins: (prev.pack.allianceCoins ?? 0) + sumCoins,
          gifts: (prev.pack.gifts ?? []).map((g) => ({ ...g, claimed: true })),
        },
      };
      const cornDelta = nextState.corn - prev.corn;
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: cornDelta,
          actualStarsDelta: sumStars,
          sound: 'chestOpen',
          haptic: 'success',
          message: `استلمت ${unclaimed.length} هدايا (+${cornDelta}⚡ +${sumCoins}🪙 +${sumStars}★)!`,
        },
      };
    }

    case 'BUY_ALLIANCE_SHOP_OFFER': {
      const offer = ALLIANCE_SHOP_CATALOG.find((o) => o.id === action.offerId);
      if (!offer) return reject(prev);
      const coins = prev.pack.allianceCoins ?? 0;
      if (coins < offer.costCoins) {
        return reject(prev, `تحتاج ${offer.costCoins} عملة سرب للشراء!`);
      }
      const nextCoins = coins - offer.costCoins;
      const nextPack = { ...prev.pack, allianceCoins: nextCoins };
      let nextState: GameState;
      if (offer.id === 'shop_energy') {
        const energyGrant = withEarnedEnergy(prev, 650);
        nextState = { ...prev, corn: energyGrant.corn, treasury: energyGrant.treasury, pack: nextPack };
      } else if (offer.id === 'shop_eggs') {
        nextState = { ...prev, eggQueue: [...prev.eggQueue, 'egg_2', 'egg_2'], pack: nextPack };
      } else if (offer.id === 'shop_breed_eggs') {
        nextState = { ...prev, breedingEggs: (prev.breedingEggs ?? 0) + 3, pack: nextPack };
      } else if (offer.id === 'shop_medals') {
        nextState = {
          ...prev,
          stats: { ...prev.stats, medals: prev.stats.medals + 40 },
          pack: nextPack,
        };
      } else if (offer.id === 'shop_automerge') {
        nextState = {
          ...prev,
          stats: { ...prev.stats, autoMergeBoosters: prev.stats.autoMergeBoosters + 2 },
          pack: nextPack,
        };
      } else if (offer.id === 'shop_hammer') {
        nextState = {
          ...prev,
          stats: { ...prev.stats, hammerBoosters: prev.stats.hammerBoosters + 2 },
          pack: nextPack,
        };
      } else {
        nextState = { ...prev, duckGold: prev.duckGold + 5, pack: nextPack };
      }

      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: nextState.corn - prev.corn,
          actualStarsDelta: nextState.stars - prev.stars,
          actualGoldDelta: nextState.duckGold - prev.duckGold,
          sound: 'claim',
          haptic: 'success',
          message: `تم شراء "${offer.titleAr}" (${offer.badgeText})!`,
        },
      };
    }

    case 'CONTRIBUTE_PACK_LEGACY': {
      if (prev.corn < action.amount) {
        return reject(prev, `تحتاج ${action.amount.toLocaleString()} طعام تنين للتبرع للسرب!`);
      }
      const nextTreasury = withBurnedEnergy(prev.treasury, action.amount);
      const nextState: GameState = {
        ...prev,
        corn: prev.corn - action.amount,
        treasury: nextTreasury,
        pack: {
          ...prev.pack,
          power: prev.pack.power + 8,
          treasuryCorn: prev.pack.treasuryCorn + action.amount,
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          actualCornDelta: -action.amount,
          message: `تم دعم السرب (-${action.amount.toLocaleString()} طعام تنين · +8 قوة للسرب)!`,
        },
      };
    }

    case 'APPEND_PACK_CHAT_LOCAL': {
      const clean = action.text.trim();
      if (!clean) return reject(prev);
      const nextState: GameState = {
        ...prev,
        pack: {
          ...prev.pack,
          messages: [
            ...prev.pack.messages,
            {
              id: `msg_${nowTs}`,
              sender: prev.username,
              text: clean,
              time: new Date(nowTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            },
          ].slice(-35),
        },
      };
      return { nextState, receipt: { ok: true, stateChanged: true } };
    }

    case 'LEAVE_PACK_LOCAL': {
      if (!prev.pack.joined) return reject(prev);
      const nextState: GameState = {
        ...prev,
        pack: {
          ...prev.pack,
          joined: false,
          allianceId: undefined,
          leaderPublicId: undefined,
          leaderName: undefined,
          realMembers: [],
          members: 0,
          logs: appendAllianceLog(prev.pack.logs, {
            type: 'ROLE',
            actor: prev.username,
            message: `غادر صفوف ${prev.pack.packName}.`,
          }),
        },
      };
      return {
        nextState,
        receipt: {
          ok: true,
          stateChanged: true,
          sound: 'tabSwitch',
          haptic: 'medium',
          message: 'غادرت السرب بنجاح. يمكنك الانضمام أو تأسيس تحالف جديد في أي وقت.',
        },
      };
    }

    default:
      return null;
  }
}
