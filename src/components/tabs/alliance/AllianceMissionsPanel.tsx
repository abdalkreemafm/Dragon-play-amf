import React, { useState } from 'react';
import { Flag, Flame, Gift, Shield, Swords, Trophy } from 'lucide-react';
import {
  AllianceGiftItem,
  DuckSkinId,
  GameState,
  SwarmDragonGearSlot,
  SwarmDragonState,
  SwarmDragonUpgradeKey,
} from '../../../types/game';
import { DUCK_AURA_CATALOG, DUCK_GEAR_CATALOG, RARITY_STYLE } from '../../../data/gameData';
import {
  ALLIANCE_ACTIVITY_CHESTS,
  ALLIANCE_COOP_MISSIONS_CATALOG,
  ALLIANCE_QUESTS_CATALOG,
  AllianceCoopMissionMeta,
  AllianceQuestMeta,
  SWARM_DRAGON_GEAR_CATALOG,
  SWARM_DRAGON_UPGRADE_CATALOG,
  computeSwarmDragonTotalStats,
  extractDragonTransferStats,
  getSwarmDragonGearUpgradeCost,
  getSwarmDragonUpgradeCost,
} from '../../../utils/economyEngine';
import { DragonIllustration } from '../../art/DuckArt';
import { soundFX } from '../../../utils/sound';
import { SectionCard } from '../../ui/SectionCard';
import { SKIN_LABEL_AR } from './AllianceHelpers';

interface AllianceMissionsPanelProps {
  state: GameState;
  swarmDragon: SwarmDragonState;
  swarmStats: ReturnType<typeof computeSwarmDragonTotalStats>;
  swarmLvCost: { energyCost: number; coinsCost: number };
  allianceCoins: number;
  activityPoints: number;
  gifts: AllianceGiftItem[];
  unclaimedGiftsCount: number;
  coopProgressMap: Record<string, number>;
  questProgressMap: Record<string, number>;
  missionsBadge: number;
  onDonateDragonToSwarm: (dragonId: string) => void;
  onTrainSwarmDragon: () => void;
  onUpgradeSwarmDragonSkill: (key: SwarmDragonUpgradeKey) => void;
  onUpgradeSwarmDragonGear: (slot: SwarmDragonGearSlot) => void;
  onSelectSwarmDragonSkin: (skin: DuckSkinId) => void;
  onClaimAllianceQuest: (questId: AllianceQuestMeta['id']) => void;
  onClaimActivityChest: (threshold: number) => void;
  onClaimAllianceGift: (giftId: string) => void;
  onClaimAllAllianceGifts: () => void;
  onSupportCoopGoal: (coopId: AllianceCoopMissionMeta['id']) => void;
  onClaimCoopGoal: (coopId: AllianceCoopMissionMeta['id']) => void;
}

export const AllianceMissionsPanel: React.FC<AllianceMissionsPanelProps> = ({
  state,
  swarmDragon,
  swarmStats,
  swarmLvCost,
  allianceCoins,
  activityPoints,
  gifts,
  unclaimedGiftsCount,
  coopProgressMap,
  questProgressMap,
  missionsBadge,
  onDonateDragonToSwarm,
  onTrainSwarmDragon,
  onUpgradeSwarmDragonSkill,
  onUpgradeSwarmDragonGear,
  onSelectSwarmDragonSkin,
  onClaimAllianceQuest,
  onClaimActivityChest,
  onClaimAllianceGift,
  onClaimAllAllianceGifts,
  onSupportCoopGoal,
  onClaimCoopGoal,
}) => {
  const [missionsMode, setMissionsMode] = useState<'DRAGON' | 'DAILY'>('DRAGON');
  const [confirmDonateDragonId, setConfirmDonateDragonId] = useState<string | null>(null);
  const pack = state.pack;

  return (
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

          {/* Donate Player Dragons to Swarm Dragon */}
          <SectionCard accent="emerald" compact className="space-y-2.5">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-white">
                التبرع بالتنانين لتنين السرب
              </h4>
              <p className="text-[10px] text-slate-300">
                عند تبرع أي عضو بتنينه، تنتقل جميع خصائصه (المستوى، النجوم ★، الحجم، العتاد، الهالة، المهارة، التدريب) مباشرة إلى تنين السرب!
              </p>
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
          </SectionCard>

          {/* Swarm Dragon Upgrades & Gear */}
          {swarmDragon.unlocked ? (
            <>
              <SectionCard accent="rose" compact className="space-y-2">
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
              </SectionCard>

              <SectionCard accent="sky" compact className="space-y-2">
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
              </SectionCard>
            </>
          ) : (
            <SectionCard compact className="text-center text-xs text-slate-300">
              تُفتح خانات <strong className="text-amber-300">الترقيات الـ4 والعتاد الـ4</strong> فور اكتمال تبرع {swarmDragon.requiredDragons} تنانين لفتح تنين السرب!
            </SectionCard>
          )}

          {/* Inherited Traits & Donated Dragons History */}
          <SectionCard compact className="space-y-2.5">
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
          </SectionCard>
        </div>
      ) : (
        <>
          {/* Daily Activity Chests */}
          <SectionCard accent="amber" compact className="space-y-2.5">
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
          </SectionCard>

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
          <SectionCard accent="indigo" compact className="space-y-2">
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
          </SectionCard>

          {/* Daily Alliance Quests */}
          <SectionCard compact className="space-y-2">
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
          </SectionCard>
        </>
      )}
    </div>
  );
};
