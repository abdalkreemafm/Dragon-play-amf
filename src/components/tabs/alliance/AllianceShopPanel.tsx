import React, { useState } from 'react';
import { Coins, Hammer } from 'lucide-react';
import { ActiveBuffs, GameState, SquadTalentKey } from '../../../types/game';
import {
  ALLIANCE_SHOP_CATALOG,
  AllianceShopOffer,
  ECONOMY_LIMITS,
  RELIC_FORGE_CATALOG,
  RelicForgeOffer,
  SQUAD_TALENT_CATALOG,
  getSquadTalentCost,
} from '../../../utils/economyEngine';
import { soundFX } from '../../../utils/sound';
import { SectionCard } from '../../ui/SectionCard';

interface AllianceShopPanelProps {
  state: GameState;
  nowTs: number;
  playerTier: number;
  allianceCoins: number;
  talents: Record<SquadTalentKey, number>;
  buffs: ActiveBuffs;
  onBuyAllianceShopOffer: (offerId: AllianceShopOffer['id']) => void;
  onUpgradeSquadTalent: (talentKey: SquadTalentKey) => void;
  onForgeRelic: (offerId: RelicForgeOffer['id']) => void;
}

export const AllianceShopPanel: React.FC<AllianceShopPanelProps> = ({
  state,
  nowTs,
  playerTier,
  allianceCoins,
  talents,
  buffs,
  onBuyAllianceShopOffer,
  onUpgradeSquadTalent,
  onForgeRelic,
}) => {
  const [shopSection, setShopSection] = useState<'STORE' | 'TALENTS' | 'FORGE'>('STORE');

  return (
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
              <SectionCard
                key={offer.id}
                compact
                className="flex items-center justify-between gap-3"
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
              </SectionCard>
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
              <SectionCard
                key={meta.key}
                compact
                className="flex items-center justify-between gap-3"
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
              </SectionCard>
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
              <SectionCard
                key={offer.id}
                compact
                className="flex items-center justify-between gap-3"
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
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
