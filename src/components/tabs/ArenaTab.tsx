import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Swords,
  Trophy,
  Zap,
  Flag,
  Check,
  Calendar,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { Duck, DuckSkinId, GameState } from '../../types/game';
import {
  DUCK_SKILLS,
  LEAGUE_TIERS,
  RARITY_STYLE,
  WEEKEND_EVENTS,
  getDuckCombatStats,
  getLeagueMeta,
} from '../../data/gameData';
import { ECONOMY_LIMITS, getArenaEntryCost } from '../../utils/economyEngine';
import { CornIcon, DragonIllustration, GoldIcon, StarIcon } from '../art/DuckArt';
import { ColosseumBackdrop } from '../art/SceneBackdrops';
import { ArenaVfxCanvas, ArenaVfxHandle } from '../art/ArenaVfxCanvas';
import { soundFX } from '../../utils/sound';

interface ArenaTabProps {
  state: GameState;
  onSpendArenaEntry: (cost: number) => boolean;
  onRefundArenaEntry?: (amount: number) => void;
  onBattleResult: (won: boolean, rewardCorn: number, rewardStars: number, leaguePts: number, xp: number, gold: number) => void;
  onRaceResult: (place: number, rewardCorn: number, rewardStars: number, leaguePts: number, xp: number) => void;
  onClaimDailyLeague: () => void;
  onRotateWeekendEvent: () => void;
}

interface RivalProfile {
  name: string;
  skin: DuckSkinId;
  maxHp: number;
  attackPower: number;
  rewardCorn: number;
  rewardStars: number;
  leaguePts: number;
}

const RIVALS: RivalProfile[] = [
  { name: 'DRACO_SCOUT', skin: 'classic', maxHp: 220, attackPower: 14, rewardCorn: 220, rewardStars: 3, leaguePts: 25 },
  { name: 'DARK_WYVERN', skin: 'skeleton', maxHp: 310, attackPower: 20, rewardCorn: 360, rewardStars: 5, leaguePts: 40 },
  { name: 'ZLOY_IGNIS', skin: 'ninja', maxHp: 420, attackPower: 26, rewardCorn: 540, rewardStars: 8, leaguePts: 55 },
  { name: 'SOLA_EMPEROR', skin: 'pharaoh', maxHp: 560, attackPower: 33, rewardCorn: 780, rewardStars: 11, leaguePts: 75 },
];

export const ArenaTab: React.FC<ArenaTabProps> = ({
  state,
  onSpendArenaEntry,
  onRefundArenaEntry,
  onBattleResult,
  onRaceResult,
  onClaimDailyLeague,
  onRotateWeekendEvent,
}) => {
  const [arenaMode, setArenaMode] = useState<'DUEL' | 'RACE' | 'LEAGUE'>('DUEL');
  const [selectedRivalIdx, setSelectedRivalIdx] = useState(0);

  const [duelPhase, setDuelPhase] = useState<'LOBBY' | 'FIGHTING' | 'RESULT'>('LOBBY');
  const [duelOutcome, setDuelOutcome] = useState<{ won: boolean; text: string } | null>(null);
  const [playerHp, setPlayerHp] = useState(300);
  const [playerMaxHp, setPlayerMaxHp] = useState(300);
  const [enemyHp, setEnemyHp] = useState(220);
  const [enemyMaxHp, setEnemyMaxHp] = useState(220);
  const [duelTimeLeft, setDuelTimeLeft] = useState(25);
  const [skillCd, setSkillCd] = useState(0);
  const [shieldActiveSec, setShieldActiveSec] = useState(0);
  const [frenzySecLeft, setFrenzySecLeft] = useState(0);
  const [turboCombatSec, setTurboCombatSec] = useState(0);
  const [enemyTelegraph, setEnemyTelegraph] = useState(0);
  const [duelShake, setDuelShake] = useState(false);
  const [hitBanner, setHitBanner] = useState<string | null>(null);
  const [parryCd, setParryCd] = useState(0);
  const [parriedFlash, setParriedFlash] = useState(false);
  const vfxRef = useRef<ArenaVfxHandle | null>(null);
  const onRefundArenaEntryRef = useRef(onRefundArenaEntry);
  onRefundArenaEntryRef.current = onRefundArenaEntry;
  const activeMatchEntryRef = useRef<{ mode: 'DUEL' | 'RACE'; amount: number; pMax: number; eMax: number } | null>(null);

  const [racePhase, setRacePhase] = useState<'LOBBY' | 'RACING' | 'RESULT'>('LOBBY');
  const [racePositions, setRacePositions] = useState<number[]>([0, 0, 0, 0]);
  const [raceSkillCd, setRaceSkillCd] = useState(0);
  const [raceTurboSec, setRaceTurboSec] = useState(0);
  const [raceResultPlace, setRaceResultPlace] = useState<number | null>(null);

  const activeDuck: Duck = state.ducks[state.activeDuckIndex] ?? state.ducks[0];
  const duckSkill = DUCK_SKILLS[activeDuck.skin];
  const leagueMeta = getLeagueMeta(state.league.points);
  const nextLeague = LEAGUE_TIERS[LEAGUE_TIERS.findIndex((t) => t.tier === leagueMeta.tier) + 1];
  const rival = RIVALS[selectedRivalIdx] ?? RIVALS[0];
  const activeEvent = WEEKEND_EVENTS[state.weekendEventIndex % WEEKEND_EVENTS.length];

  const combatStats = getDuckCombatStats(
    activeDuck,
    state.dmdTotal,
    state.pack.joined,
    state.pack.power,
    state.pack.talents,
    state.activeBuffs
  );
  const prestigeRank = state.pack.talents?.prestige ?? 0;
  const duelEntryCost = getArenaEntryCost(selectedRivalIdx, prestigeRank, false);
  const raceEntryCost = getArenaEntryCost(0, prestigeRank, true);
  const rivalScore = Math.round(rival.maxHp * 0.45 + rival.attackPower * 8);
  const winRatio = combatStats.totalPowerScore / Math.max(1, rivalScore);
  const winVerdict =
    winRatio >= 1.15
      ? { label: 'أفضلية قوية لك', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40' }
      : winRatio >= 0.88
        ? { label: 'معركة متكافئة', color: 'text-amber-300 bg-amber-500/15 border-amber-500/40' }
        : { label: 'خصم قوي · طوّر تنينك', color: 'text-rose-400 bg-rose-500/15 border-rose-500/40' };

  const duelStateRef = useRef({
    pHp: 300,
    eHp: 220,
    time: 25,
    skillCd: 0,
    parryCd: 0,
    shield: 0,
    frenzy: 0,
    turboCombat: 0,
    enemyWindup: 0,
    ended: false,
  });

  const raceStateRef = useRef({
    pos: [0, 0, 0, 0],
    speeds: [0, 12.5, 13.8, 11.9],
    turbo: 0,
    skillCd: 0,
    ended: false,
  });

  const startDuel = () => {
    if (!onSpendArenaEntry(duelEntryCost)) return;
    const pMax = combatStats.maxHp;
    duelStateRef.current = {
      pHp: pMax,
      eHp: rival.maxHp,
      time: 25,
      skillCd: 0,
      parryCd: 0,
      shield: 0,
      frenzy: 0,
      turboCombat: 0,
      enemyWindup: 0,
      ended: false,
    };
    activeMatchEntryRef.current = {
      mode: 'DUEL',
      amount: duelEntryCost,
      pMax,
      eMax: rival.maxHp,
    };
    setPlayerMaxHp(pMax);
    setPlayerHp(pMax);
    setEnemyMaxHp(rival.maxHp);
    setEnemyHp(rival.maxHp);
    setDuelTimeLeft(25);
    setSkillCd(0);
    setParryCd(0);
    setShieldActiveSec(0);
    setFrenzySecLeft(0);
    setTurboCombatSec(0);
    setEnemyTelegraph(0);
    setHitBanner(null);
    setDuelOutcome(null);
    setDuelPhase('FIGHTING');
    soundFX.playGodConfirm();
  };

  useEffect(() => {
    if (duelPhase !== 'FIGHTING') return;
    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;
      const d = duelStateRef.current;
      if (d.ended) return;

      d.time = Math.max(0, d.time - dt);
      d.skillCd = Math.max(0, d.skillCd - dt);
      d.parryCd = Math.max(0, d.parryCd - dt);
      d.shield = Math.max(0, d.shield - dt);
      d.frenzy = Math.max(0, d.frenzy - dt);
      d.turboCombat = Math.max(0, d.turboCombat - dt);
      d.enemyWindup += dt * 0.48;

      if (d.enemyWindup >= 1) {
        d.enemyWindup = 0;
        const dmg = d.shield > 0 ? Math.round(rival.attackPower * 0.25) : rival.attackPower;
        d.pHp = Math.max(0, d.pHp - dmg);
        soundFX.playBattleHit();
        vfxRef.current?.spawnAttack('ENEMY_HIT', `-${dmg}`);
      }

      setPlayerHp(Math.ceil(d.pHp));
      setEnemyHp(Math.ceil(d.eHp));
      setDuelTimeLeft(d.time);
      setSkillCd(d.skillCd);
      setParryCd(d.parryCd);
      setShieldActiveSec(d.shield);
      setFrenzySecLeft(d.frenzy);
      setTurboCombatSec(d.turboCombat);
      setEnemyTelegraph(d.enemyWindup);

      if (d.eHp <= 0 || d.pHp <= 0 || d.time <= 0) {
        d.ended = true;
        activeMatchEntryRef.current = null;
        const won = d.eHp <= 0 || (d.time <= 0 && d.pHp >= d.eHp);
        const fullWinsToday = state.treasury.arenaFullWinsToday ?? 0;
        const mult = fullWinsToday < ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS ? 1 : ECONOMY_LIMITS.ARENA_AFTER_CAP_RATIO;
        if (won) {
          soundFX.playVictory();
          const finalCorn = Math.round(rival.rewardCorn * mult);
          const finalStars = Math.max(1, Math.round(rival.rewardStars * activeEvent.starBonusMult * mult));
          setDuelOutcome({
            won: true,
            text: `انتصار ساحق على ${rival.name}! +${finalCorn.toLocaleString()} طاقة و +${finalStars} ★`,
          });
          onBattleResult(true, rival.rewardCorn, rival.rewardStars, rival.leaguePts, 65, 2);
        } else {
          soundFX.playDefeat();
          setDuelOutcome({
            won: false,
            text: `خسرت النزال أمام ${rival.name}! جرّب توقيت الصدّ المضاد (+25 طاقة مواساة).`,
          });
          onBattleResult(false, 25, 0, 5, 20, 0);
        }
        setDuelPhase('RESULT');
        return;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [duelPhase, rival, activeEvent.starBonusMult, onBattleResult, state.treasury.arenaFullWinsToday]);

  const handlePlayerStrike = () => {
    if (duelPhase !== 'FIGHTING') return;
    const d = duelStateRef.current;
    if (d.ended) return;
    const frenzyCritBonus = d.frenzy > 0 ? 25 : 0;
    const isCrit = Math.random() < Math.min(100, combatStats.critChance + frenzyCritBonus) / 100;
    const buffMult = (d.frenzy > 0 ? 1.55 : 1) * (d.turboCombat > 0 ? 1.35 : 1);
    const baseDmg = Math.round(combatStats.attack * buffMult);
    const dmg = isCrit ? Math.round(baseDmg * 1.9) : baseDmg;
    d.eHp = Math.max(0, d.eHp - dmg);
    setEnemyHp(Math.ceil(d.eHp));

    if (isCrit) {
      soundFX.playCritHit();
      setDuelShake(true);
      setHitBanner(`حرج -${dmg}!`);
      vfxRef.current?.spawnAttack('CRIT', `حرج -${dmg}!`);
      setTimeout(() => setDuelShake(false), 180);
    } else {
      soundFX.playTapFeed();
      setHitBanner(`-${dmg}`);
      vfxRef.current?.spawnAttack('FIREBALL', `-${dmg}`);
    }
  };

  const handleCounterParry = () => {
    if (duelPhase !== 'FIGHTING') return;
    const d = duelStateRef.current;
    if (d.ended || d.parryCd > 0) return;

    const inWindow = d.enemyWindup >= 0.7 && d.enemyWindup <= 0.98;
    d.parryCd = 3.2;

    if (inWindow) {
      const counterDmg = Math.round(combatStats.attack * 1.65);
      d.enemyWindup = 0;
      d.shield = 2.0;
      d.eHp = Math.max(0, d.eHp - counterDmg);
      setEnemyHp(Math.ceil(d.eHp));
      soundFX.playParry();
      setParriedFlash(true);
      setDuelShake(true);
      setHitBanner(`صد مضاد حاسم! -${counterDmg} 🛡️`);
      vfxRef.current?.spawnAttack('PARRY', `صد حرج -${counterDmg}!`);
      setTimeout(() => {
        setParriedFlash(false);
        setDuelShake(false);
      }, 240);
    } else {
      d.shield = 1.0;
      soundFX.playBattleHit();
      setHitBanner('درع مؤقت (-75% ضرر)');
      vfxRef.current?.spawnAttack('SHIELD', 'درع');
    }
  };

  const handlePlayerSkill = () => {
    if (duelPhase !== 'FIGHTING') return;
    const d = duelStateRef.current;
    if (d.ended || d.skillCd > 0) return;

    soundFX.playSkillUse();
    d.skillCd = duckSkill.cooldownSec * (activeDuck.skin === 'coffee' ? 0.8 : 1);
    const skillPower = duckSkill.basePower + activeDuck.skillLevel * 10;

    if (duckSkill.type === 'SHIELD') {
      d.shield = 3.5;
      const dmg = Math.round(skillPower * 0.7);
      d.eHp = Math.max(0, d.eHp - dmg);
      setHitBanner(`🛡️ ${duckSkill.name}!`);
      vfxRef.current?.spawnAttack('SHIELD', `-${dmg} 🛡️`);
    } else if (duckSkill.type === 'VAMPIRE') {
      const heal = Math.round(skillPower * 0.9);
      d.eHp = Math.max(0, d.eHp - skillPower);
      d.pHp = Math.min(playerMaxHp, d.pHp + heal);
      setHitBanner(`❤️ امتصاص +${heal} HP`);
      vfxRef.current?.spawnAttack('VAMPIRE', `+${heal} HP`);
    } else if (duckSkill.type === 'BURST') {
      if (activeDuck.skin === 'ninja') {
        const dmg = Math.round(skillPower * 1.9);
        d.eHp = Math.max(0, d.eHp - dmg);
        d.enemyWindup = Math.max(0, d.enemyWindup - 0.4);
        setDuelShake(true);
        setHitBanner(`⚡ ${duckSkill.name} حرج -${dmg}!`);
        vfxRef.current?.spawnAttack('CRIT', `حرج -${dmg}!`);
        setTimeout(() => setDuelShake(false), 240);
      } else {
        const perHit = Math.round(skillPower * 0.58);
        const dmg = perHit * 3;
        d.eHp = Math.max(0, d.eHp - dmg);
        d.enemyWindup = Math.max(0, d.enemyWindup - 0.35);
        setDuelShake(true);
        setHitBanner(`⚡ ${duckSkill.name} (3×${perHit}) -${dmg}!`);
        vfxRef.current?.spawnAttack('CRIT', `3× -${dmg}!`);
        setTimeout(() => setDuelShake(false), 240);
      }
    } else if (duckSkill.type === 'FRENZY') {
      const frenzyDur = activeDuck.skin === 'dj' ? 4.6 : 4.0;
      d.frenzy = frenzyDur;
      const dmg = Math.round(skillPower * 1.1);
      d.eHp = Math.max(0, d.eHp - dmg);
      d.enemyWindup = Math.max(0, d.enemyWindup - 0.4);
      setFrenzySecLeft(frenzyDur);
      setDuelShake(true);
      setHitBanner(`🔥 غضب ${frenzyDur.toFixed(1)}ث! -${dmg}`);
      vfxRef.current?.spawnAttack('SHOCKWAVE', `غضب -${dmg}!`);
      setTimeout(() => setDuelShake(false), 240);
    } else {
      const dmg = Math.round(skillPower * 1.25);
      d.eHp = Math.max(0, d.eHp - dmg);
      d.enemyWindup = Math.max(0, d.enemyWindup - 0.6);
      d.turboCombat = 3.5;
      setTurboCombatSec(3.5);
      setDuelShake(true);
      setHitBanner(`⚡ ${duckSkill.name} توربو -${dmg}!`);
      vfxRef.current?.spawnAttack('SHOCKWAVE', `توربو -${dmg}!`);
      setTimeout(() => setDuelShake(false), 240);
    }
  };

  const handleRaceTap = () => {
    if (racePhase !== 'RACING') return;
    const r = raceStateRef.current;
    if (r.ended) return;
    r.pos[0] = Math.min(100, r.pos[0] + 2.4 + activeDuck.skillLevel * 0.25);
    soundFX.playTapFeed();
  };

  const handleRaceSkill = () => {
    if (racePhase !== 'RACING') return;
    const r = raceStateRef.current;
    if (r.ended || r.skillCd > 0) return;
    r.skillCd = 4.5 * (activeDuck.skin === 'coffee' ? 0.8 : 1);
    r.turbo = duckSkill.type === 'TURBO' ? 3.4 : 2.6;
    r.pos[0] = Math.min(100, r.pos[0] + 7.5);
    soundFX.playSkillUse();
  };

  const strikeHandlerRef = useRef(handlePlayerStrike);
  strikeHandlerRef.current = handlePlayerStrike;
  const raceTapHandlerRef = useRef(handleRaceTap);
  raceTapHandlerRef.current = handleRaceTap;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (duelPhase === 'FIGHTING') {
          e.preventDefault();
          strikeHandlerRef.current();
        } else if (racePhase === 'RACING') {
          e.preventDefault();
          raceTapHandlerRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duelPhase, racePhase]);

  useEffect(() => {
    return () => {
      const entry = activeMatchEntryRef.current;
      if (!entry) return;
      if (entry.mode === 'DUEL') {
        const d = duelStateRef.current;
        if (!d.ended && d.pHp === entry.pMax && d.eHp === entry.eMax) {
          onRefundArenaEntryRef.current?.(entry.amount);
        }
        d.ended = true;
      } else if (entry.mode === 'RACE') {
        const r = raceStateRef.current;
        if (!r.ended && r.pos[0] < 6) {
          onRefundArenaEntryRef.current?.(entry.amount);
        }
        r.ended = true;
      }
      activeMatchEntryRef.current = null;
    };
  }, []);

  const handleRetreatMatch = (mode: 'DUEL' | 'RACE') => {
    const entry = activeMatchEntryRef.current;
    if (mode === 'DUEL') {
      const d = duelStateRef.current;
      d.ended = true;
      if (entry && entry.mode === 'DUEL' && d.pHp === entry.pMax && d.eHp === entry.eMax) {
        onRefundArenaEntryRef.current?.(entry.amount);
      }
      activeMatchEntryRef.current = null;
      setDuelPhase('LOBBY');
    } else {
      const r = raceStateRef.current;
      r.ended = true;
      if (entry && entry.mode === 'RACE' && r.pos[0] < 6) {
        onRefundArenaEntryRef.current?.(entry.amount);
      }
      activeMatchEntryRef.current = null;
      setRacePhase('LOBBY');
    }
    soundFX.playTabSwitch();
  };

  const startRace = () => {
    if (!onSpendArenaEntry(raceEntryCost)) return;
    raceStateRef.current = {
      pos: [0, 0, 0, 0],
      speeds: [6.5, 11.8 + Math.random() * 2.2, 12.2 + Math.random() * 2.5, 11.4 + Math.random() * 2.4],
      turbo: 0,
      skillCd: 0,
      ended: false,
    };
    activeMatchEntryRef.current = {
      mode: 'RACE',
      amount: raceEntryCost,
      pMax: 100,
      eMax: 100,
    };
    setRacePositions([0, 0, 0, 0]);
    setRaceSkillCd(0);
    setRaceTurboSec(0);
    setRaceResultPlace(null);
    setRacePhase('RACING');
    soundFX.playRaceBeep(true);
  };

  useEffect(() => {
    if (racePhase !== 'RACING') return;
    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;
      const r = raceStateRef.current;
      if (r.ended) return;

      r.turbo = Math.max(0, r.turbo - dt);
      r.skillCd = Math.max(0, r.skillCd - dt);

      const wingSpeedBonus = activeDuck.gear === 'wings' ? 2.2 : 0;
      const skinSpeedMult =
        activeDuck.skin === 'aqua' || activeDuck.skin === 'cool'
          ? 1.18
          : activeDuck.skin === 'bride'
            ? 1.15
            : activeDuck.skin === 'classic'
              ? 1.1
              : 1;
      const playerBase = ((r.turbo > 0 ? 19.5 : 8.2) + activeDuck.skillLevel * 0.7 + wingSpeedBonus) * skinSpeedMult;
      r.pos[0] = Math.min(100, r.pos[0] + playerBase * dt);
      for (let i = 1; i <= 3; i++) {
        const surge = Math.random() < 0.04 ? 6 : 0;
        r.pos[i] = Math.min(100, r.pos[i] + (r.speeds[i] + surge) * dt);
      }

      setRacePositions([...r.pos]);
      setRaceSkillCd(r.skillCd);
      setRaceTurboSec(r.turbo);

      if (r.pos[0] >= 100 || r.pos.slice(1).every((p) => p >= 100)) {
        r.ended = true;
        activeMatchEntryRef.current = null;
        const finishedAhead = r.pos.slice(1).filter((p) => p >= r.pos[0]).length;
        const place = finishedAhead + 1;
        setRaceResultPlace(place);
        const rewardTable = [
          { corn: 320, stars: 5, pts: 45, xp: 60 },
          { corn: 190, stars: 2, pts: 25, xp: 40 },
          { corn: 95, stars: 1, pts: 12, xp: 25 },
          { corn: 25, stars: 0, pts: 5, xp: 15 },
        ];
        const rw = rewardTable[place - 1] ?? rewardTable[3];
        if (place <= 2) soundFX.playVictory();
        else soundFX.playTabSwitch();
        onRaceResult(place, rw.corn, rw.stars, rw.pts, rw.xp);
        setRacePhase('RESULT');
        return;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [racePhase, activeDuck.skillLevel, activeDuck.gear, activeDuck.skin, onRaceResult]);

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto px-3 sm:px-5 py-3 overflow-y-auto space-y-3">
      {/* Rotating Weekend Event Banner */}
      <div className="rounded-2xl px-3.5 py-2.5 bg-gradient-to-l from-amber-500/20 via-purple-900/25 to-[#181b24] border border-amber-400/40 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-start gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="min-w-0 leading-snug">
            <div className="text-xs font-black text-amber-200">{activeEvent.title}</div>
            <div className="text-[11px] text-slate-300 mt-0.5">{activeEvent.desc}</div>
          </div>
        </div>
        <button
          onClick={() => {
            soundFX.playTabSwitch();
            onRotateWeekendEvent();
          }}
          title="تبديل فعالية نهاية الأسبوع"
          className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-amber-400 text-[10px] font-bold text-slate-200 flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>تبديل</span>
        </button>
      </div>

      {/* League Status Header */}
      <div className={`rounded-2xl p-3 border ${leagueMeta.border} ${leagueMeta.bg} flex items-center justify-between gap-3 shrink-0`}>
        <div>
          <div className="flex items-center gap-2">
            <Trophy className={`w-5 h-5 ${leagueMeta.color}`} />
            <span className={`font-extrabold text-sm ${leagueMeta.color}`}>{leagueMeta.nameAr}</span>
            <span className="font-mono-num text-xs text-white font-black">
              {state.league.points} نقطة
            </span>
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
            <span>سلسلة: <strong className="text-amber-300 font-mono-num">{state.league.winStreak} 🔥</strong></span>
            <span>· جوائز كاملة اليوم: <strong className="font-mono-num text-emerald-300">{Math.max(0, ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS - (state.treasury.arenaFullWinsToday ?? 0))}/{ECONOMY_LIMITS.MAX_DAILY_ARENA_FULL_WINS}</strong></span>
            {nextLeague && (
              <span>· التالي: {nextLeague.nameAr}</span>
            )}
          </div>
        </div>

        <button
          disabled={state.league.dailyClaimed}
          onClick={() => {
            soundFX.playChestOpen();
            onClaimDailyLeague();
          }}
          className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 ${
            state.league.dailyClaimed
              ? 'bg-slate-800/80 text-slate-400'
              : 'bg-amber-400 text-slate-950 hover:brightness-105 cursor-pointer'
          }`}
        >
          {state.league.dailyClaimed ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>{state.league.dailyClaimed ? 'جائزة اليوم ✓' : 'مكافأة الدوري'}</span>
        </button>
      </div>

      {/* Arena Sub-Mode Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#181b24] border border-slate-800 shrink-0">
        <button
          disabled={duelPhase === 'FIGHTING' || racePhase === 'RACING'}
          onClick={() => {
            soundFX.playTabSwitch();
            setArenaMode('DUEL');
          }}
          className={`min-h-[44px] py-2 px-1 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 whitespace-nowrap ${
            duelPhase === 'FIGHTING' || racePhase === 'RACING' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${
            arenaMode === 'DUEL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-300'
          }`}
        >
          <Swords className="w-3.5 h-3.5 shrink-0" />
          <span>معركة 1×1</span>
        </button>

        <button
          disabled={duelPhase === 'FIGHTING' || racePhase === 'RACING'}
          onClick={() => {
            soundFX.playTabSwitch();
            setArenaMode('RACE');
          }}
          className={`min-h-[44px] py-2 px-1 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 whitespace-nowrap ${
            duelPhase === 'FIGHTING' || racePhase === 'RACING' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${
            arenaMode === 'RACE' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-300'
          }`}
        >
          <Flag className="w-3.5 h-3.5 shrink-0" />
          <span>سباق التنانين</span>
        </button>

        <button
          disabled={duelPhase === 'FIGHTING' || racePhase === 'RACING'}
          onClick={() => {
            soundFX.playTabSwitch();
            setArenaMode('LEAGUE');
          }}
          className={`min-h-[44px] py-2 px-1 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1 whitespace-nowrap ${
            duelPhase === 'FIGHTING' || racePhase === 'RACING' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${
            arenaMode === 'LEAGUE' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' : 'text-slate-300'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 shrink-0" />
          <span>التصنيف الدوري</span>
        </button>
      </div>

      {/* === MODE 1: LIVE DUEL === */}
      {arenaMode === 'DUEL' && (
        <div className={`relative overflow-hidden realistic-card border ${parriedFlash ? 'border-emerald-400' : 'border-slate-800'} rounded-3xl p-4 space-y-4 ${duelShake ? 'animate-hit-shake' : ''}`}>
          <ColosseumBackdrop />
          <ArenaVfxCanvas ref={vfxRef} />
          <div className="relative z-10 space-y-4">
          {duelPhase === 'LOBBY' && (
            <>
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  <DragonIllustration
                    skin={activeDuck.skin}
                    level={activeDuck.level}
                    customLevel={activeDuck.customLevel}
                    gear={activeDuck.gear}
                    aura={activeDuck.aura}
                    staked={activeDuck.staked}
                    showEvolutionEffects={true}
                    className="w-16 h-16"
                    mood="battle"
                  />
                  <div>
                    <div className="text-sm font-black text-white">{activeDuck.name}</div>
                    <div className="text-[11px] font-bold text-amber-300">
                      مهارة: {duckSkill.name} (م{activeDuck.skillLevel})
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-num">
                      قوة شاملة: {combatStats.totalPowerScore} ⚡
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-black ${RARITY_STYLE[activeDuck.rarity].color}`}>
                  {RARITY_STYLE[activeDuck.rarity].labelAr}
                </span>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-400 mb-2">اختر منافسك في الحلبة:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {RIVALS.map((rv, idx) => (
                    <button
                      key={rv.name}
                      onClick={() => {
                        soundFX.playTabSwitch();
                        setSelectedRivalIdx(idx);
                      }}
                      className={`rounded-2xl p-2.5 border text-center cursor-pointer transition-all ${
                        selectedRivalIdx === idx
                          ? 'bg-rose-500/15 border-rose-400'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <DragonIllustration skin={rv.skin} className="w-14 h-14 mx-auto" mood="battle" />
                      <div className="text-[11px] font-black text-white truncate mt-1">{rv.name}</div>
                      <div className="text-[10px] font-mono-num text-emerald-400">+{rv.rewardCorn.toLocaleString()} طاقة</div>
                      <div className="text-[10px] font-mono-num text-indigo-300">+{rv.rewardStars * activeEvent.starBonusMult} ★ · +{rv.leaguePts} 🏆</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pre-Battle Tactical Comparison Card */}
              <div className="rounded-2xl bg-slate-950/85 border border-slate-800 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-white">مقارنة ما قبل النزال</span>
                  <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-black ${winVerdict.color}`}>
                    {winVerdict.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono-num text-xs">
                  <div className="rounded-xl bg-slate-900/90 p-2 border border-slate-800">
                    <div className="text-[10px] text-slate-400">الصحة HP</div>
                    <div className="font-black text-emerald-400 mt-0.5">
                      {combatStats.maxHp} <span className="text-slate-500">مقابل</span>{' '}
                      <span className="text-rose-400">{rival.maxHp}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-900/90 p-2 border border-slate-800">
                    <div className="text-[10px] text-slate-400">قوة الضربة</div>
                    <div className="font-black text-amber-300 mt-0.5">
                      {combatStats.attack} <span className="text-slate-500">مقابل</span>{' '}
                      <span className="text-rose-400">{rival.attackPower}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-900/90 p-2 border border-slate-800">
                    <div className="text-[10px] text-slate-400">حاسمة</div>
                    <div className="font-black text-sky-300 mt-0.5">{combatStats.critChance}%</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300 pt-0.5">
                  <span>
                    تأثير <strong className="text-amber-300">DMD</strong>: +{combatStats.dmdSynergyPct}% قوة
                  </span>
                  <span>
                    تآزر <strong className="text-rose-300">السرب</strong>:{' '}
                    {state.pack.joined ? `+${combatStats.packSynergyPct}% مفعّل ✓` : 'انضم للسرب (+10% قوة)'}
                  </span>
                </div>
              </div>

              <button
                onClick={startDuel}
                className={`w-full min-h-[48px] py-3.5 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                  state.corn >= duelEntryCost
                    ? 'bg-gradient-to-b from-rose-500 to-rose-600 text-white hover:brightness-110 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Swords className="w-5 h-5" />
                <span className="font-mono-num">
                  بدء النزال الحي ضد {rival.name} · رسوم الدخول: {duelEntryCost} ⚡
                </span>
              </button>
            </>
          )}

          {duelPhase === 'FIGHTING' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono-num text-lg font-black text-amber-300">
                  {duelTimeLeft.toFixed(1)}s
                </span>
                {hitBanner && (
                  <span className="font-display text-sm font-black text-rose-400">{hitBanner}</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRetreatMatch('DUEL')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-rose-400 hover:text-white cursor-pointer"
                >
                  انسحاب
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="bg-slate-900/80 border border-sky-500/40 rounded-2xl p-3 text-center">
                  <div className="text-xs font-black text-white mb-1">{activeDuck.name}</div>
                  <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden mb-1">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-100"
                      style={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
                    />
                  </div>
                  <div className="font-mono-num text-[11px] text-emerald-300 mb-2">
                    {playerHp} / {playerMaxHp} HP {shieldActiveSec > 0 ? '🛡️' : ''} {frenzySecLeft > 0 ? '🔥' : ''} {turboCombatSec > 0 ? '⚡' : ''}
                  </div>
                  <DragonIllustration
                    skin={activeDuck.skin}
                    level={activeDuck.level}
                    customLevel={activeDuck.customLevel}
                    gear={activeDuck.gear}
                    aura={activeDuck.aura}
                    staked={activeDuck.staked}
                    showEvolutionEffects={true}
                    className="w-28 h-28 mx-auto"
                    mood="battle"
                  />
                </div>

                <div className="bg-slate-900/80 border border-rose-500/40 rounded-2xl p-3 text-center">
                  <div className="text-xs font-black text-rose-300 mb-1">{rival.name}</div>
                  <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden mb-1">
                    <div
                      className="h-full bg-rose-500 transition-all duration-100"
                      style={{ width: `${(enemyHp / enemyMaxHp) * 100}%` }}
                    />
                  </div>
                  <div className="font-mono-num text-[11px] text-rose-300 mb-2">
                    {enemyHp} / {enemyMaxHp} HP
                  </div>
                  <DragonIllustration skin={rival.skin} className="w-28 h-28 mx-auto scale-x-[-1]" mood="battle" />
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-amber-300 font-bold">
                    {enemyTelegraph > 0.72 ? '⚡ تحذير: الخصم يتهيأ لضربة قوية!' : 'شحن هجوم الخصم'}
                  </span>
                  <span className="font-mono-num text-slate-400">{Math.round(enemyTelegraph * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${enemyTelegraph > 0.72 ? 'bg-rose-500' : 'bg-amber-400'}`}
                    style={{ width: `${enemyTelegraph * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handlePlayerStrike}
                  className="py-3.5 rounded-2xl bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 font-black text-sm active:scale-95 transition-transform cursor-pointer flex items-center justify-center gap-1.5 shadow-lg min-h-[48px]"
                >
                  <Swords className="w-4 h-4" />
                  <span>هجوم</span>
                </button>

                <button
                  disabled={parryCd > 0}
                  onClick={handleCounterParry}
                  className={`py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all min-h-[48px] ${
                    parryCd > 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : enemyTelegraph >= 0.7
                        ? 'bg-emerald-400 text-slate-950 shadow-lg ring-2 ring-emerald-300 cursor-pointer active:scale-95'
                        : 'bg-sky-500/20 border border-sky-400/50 text-sky-200 hover:bg-sky-500/30 cursor-pointer'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>
                    {parryCd > 0
                      ? `صد (${parryCd.toFixed(1)}s)`
                      : enemyTelegraph >= 0.7
                        ? 'صد حرج الآن!'
                        : 'صد مضاد'}
                  </span>
                </button>

                <button
                  disabled={skillCd > 0}
                  onClick={handlePlayerSkill}
                  className={`py-3 px-1.5 rounded-2xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all min-h-[48px] ${
                    skillCd > 0
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-b from-indigo-500 to-purple-600 text-white hover:brightness-110 active:scale-95 cursor-pointer shadow-lg'
                  }`}
                >
                  <Zap className="w-4 h-4 shrink-0" />
                  <span className="leading-tight text-center">
                    {skillCd > 0 ? `${skillCd.toFixed(1)}s` : duckSkill.name}
                  </span>
                </button>
              </div>
            </div>
          )}

          {duelPhase === 'RESULT' && duelOutcome && (
            <div className="text-center py-4 space-y-4">
              <div className={`font-display text-2xl font-black ${duelOutcome.won ? 'text-emerald-400' : 'text-rose-400'}`}>
                {duelOutcome.won ? 'انتصار! 🏆' : 'هزيمة'}
              </div>
              <p className="text-sm text-slate-200">{duelOutcome.text}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={startDuel}
                  className={`min-h-[44px] px-6 py-3 rounded-2xl font-black text-sm font-mono-num ${
                    state.corn >= duelEntryCost
                      ? 'bg-amber-400 text-slate-950 cursor-pointer'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  نزال جديد ({duelEntryCost} ⚡)
                </button>
                <button
                  onClick={() => setDuelPhase('LOBBY')}
                  className="min-h-[44px] px-6 py-3 rounded-2xl bg-slate-800 text-slate-200 font-bold text-sm cursor-pointer"
                >
                  تغيير الخصم
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* === MODE 2: LIVE 4-DRAGON RACE === */}
      {arenaMode === 'RACE' && (
        <div className="relative overflow-hidden realistic-card border border-slate-800 rounded-3xl p-4 space-y-4">
          <ColosseumBackdrop className="opacity-65" />
          <div className="relative z-10 space-y-4">
          {racePhase === 'LOBBY' && (
            <div className="text-center space-y-4 py-2">
              <h3 className="font-display text-xl font-black text-white">سباق التنانين المباشر (4 متنافسين)</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                انقر بسرعة{' '}
                <span className="hidden sm:inline">
                  (أو اضغط <strong className="text-amber-300">Space</strong>){' '}
                </span>
                لدفع تنينك نحو خط النهاية، وفعّل مهارة التوربو لتجاوز الخصوم!
              </p>
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto text-xs font-mono-num">
                <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 font-bold">
                  المركز 1: 320⚡ + {5 * activeEvent.starBonusMult} ★
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold">
                  المركز 2: 190⚡ + {2 * activeEvent.starBonusMult} ★
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 text-slate-400 font-bold">
                  المركز 3: 95⚡ + {1 * activeEvent.starBonusMult} ★
                </div>
              </div>
              <button
                onClick={startRace}
                className={`w-full max-w-sm min-h-[48px] py-3.5 rounded-2xl font-black text-sm font-mono-num ${
                  state.corn >= raceEntryCost
                    ? 'bg-gradient-to-b from-sky-400 to-blue-600 text-white hover:brightness-105 cursor-pointer'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                انطلاق السباق! 🏁 (رسوم الدخول: {raceEntryCost} ⚡)
              </button>
            </div>
          )}

          {racePhase === 'RACING' && (
            <div className="space-y-3">
              {[
                { label: `${state.username} (أنت)`, skin: activeDuck.skin, pos: racePositions[0], isYou: true },
                { label: 'NububiicA', skin: 'cool' as DuckSkinId, pos: racePositions[1], isYou: false },
                { label: 'CAMA_9L', skin: 'ninja' as DuckSkinId, pos: racePositions[2], isYou: false },
                { label: 'IgnisRex', skin: 'pumpkin' as DuckSkinId, pos: racePositions[3], isYou: false },
              ].map((lane) => (
                <div
                  key={lane.label}
                  className={`rounded-2xl p-2.5 border ${
                    lane.isYou ? 'bg-amber-400/10 border-amber-400/50' : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className={lane.isYou ? 'font-black text-amber-300' : 'text-slate-300 font-bold'}>
                      {lane.label}
                    </span>
                    <span className="font-mono-num text-slate-400">{Math.round(lane.pos)}%</span>
                  </div>
                  <div className="relative h-9 rounded-xl bg-slate-950/90 border border-slate-800 overflow-hidden flex items-center px-2">
                    <div
                      className={`absolute left-0 top-1/2 -translate-y-1/2 h-2.5 rounded-r-full transition-all duration-75 ${
                        lane.isYou && raceTurboSec > 0
                          ? 'bg-gradient-to-r from-rose-500 via-amber-400 to-yellow-200'
                          : lane.isYou
                            ? 'bg-gradient-to-r from-sky-500/40 to-amber-400/80'
                            : 'bg-slate-700/50'
                      }`}
                      style={{ width: `${Math.min(90, lane.pos)}%` }}
                    />
                    <div
                      className="absolute left-2 top-1/2 -translate-y-1/2 transition-all duration-75"
                      style={{ left: `calc(${Math.min(88, lane.pos)}% + 4px)` }}
                    >
                      <DragonIllustration
                        skin={lane.skin}
                        gear={lane.isYou ? activeDuck.gear : undefined}
                        aura={lane.isYou ? activeDuck.aura : undefined}
                        className="w-8 h-8"
                      />
                    </div>
                    <div className="mr-auto text-xs opacity-60">🏁</div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRetreatMatch('RACE')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-rose-400 hover:text-white cursor-pointer"
                >
                  انسحاب من السباق
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={handleRaceTap}
                  className="py-4 rounded-2xl bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 font-black text-base active:scale-95 cursor-pointer"
                >
                  اندفاع سريع! ({raceTurboSec > 0 ? '🔥 توربو' : 'اضغط'})
                </button>
                <button
                  disabled={raceSkillCd > 0}
                  onClick={handleRaceSkill}
                  className={`py-4 rounded-2xl font-black text-sm ${
                    raceSkillCd > 0
                      ? 'bg-slate-800 text-slate-500'
                      : 'bg-sky-500 text-slate-950 cursor-pointer'
                  }`}
                >
                  {raceSkillCd > 0 ? `شحن (${raceSkillCd.toFixed(1)}s)` : 'تفعيل التوربو ⚡'}
                </button>
              </div>
            </div>
          )}

          {racePhase === 'RESULT' && raceResultPlace !== null && (
            <div className="text-center py-4 space-y-4">
              <div className="font-display text-2xl font-black text-amber-300">
                المركز #{raceResultPlace} 🏁
              </div>
              <p className="text-sm text-slate-300">
                {raceResultPlace === 1
                  ? 'تنينك حصد المركز الأول بجدارة!'
                  : 'سباق رائع! طوّر تنينك وحاول مجدداً لانتزاع الصدارة.'}
              </p>
              <button
                onClick={startRace}
                className={`min-h-[44px] px-6 py-3 rounded-2xl font-black text-sm font-mono-num ${
                  state.corn >= raceEntryCost
                    ? 'bg-sky-400 text-slate-950 cursor-pointer'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                سباق جديد ({raceEntryCost} ⚡)
              </button>
            </div>
          )}
          </div>
        </div>
      )}

      {/* === MODE 3: LEAGUE STANDINGS === */}
      {arenaMode === 'LEAGUE' && (
        <div className="bg-[#151822] border border-slate-800 rounded-3xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white">درجات الدوري التصنيفي</h3>
            <span className="text-xs text-amber-300 font-mono-num">
              الانتصارات: {state.league.wins} · السباقات: {state.league.racesWon}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {LEAGUE_TIERS.map((tier) => {
              const isCurrent = tier.tier === leagueMeta.tier;
              return (
                <div
                  key={tier.tier}
                  className={`rounded-2xl p-3 border flex items-center justify-between ${
                    isCurrent ? `${tier.bg} ${tier.border}` : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div>
                    <div className={`text-xs font-black ${tier.color}`}>
                      {tier.nameAr} {isCurrent ? '· (الحالي)' : ''}
                    </div>
                    <div className="text-[11px] font-mono-num text-slate-400">
                      من {tier.minPoints} نقطة
                    </div>
                  </div>
                  <div className="text-left text-[11px] font-mono-num">
                    <div className="text-emerald-400 flex items-center gap-1 justify-end">
                      {tier.dailyCorn.toLocaleString()} <CornIcon className="w-3 h-3" />
                    </div>
                    <div className="text-indigo-300 flex items-center gap-1 justify-end">
                      +{tier.dailyStars} <StarIcon className="w-3 h-3" /> · +{tier.dailyGold} <GoldIcon className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-400">تصنيف الدوري الحالي:</div>
            {[
              { name: 'SOLAFEIFEI', pts: 1520, tier: 'أسطوري' },
              { name: 'ZLOYPHILIPP', pts: 980, tier: 'ماسي' },
              { name: 'DRAGON_MAXIM', pts: 540, tier: 'ذهبي' },
              { name: state.username, pts: state.league.points, tier: leagueMeta.nameAr, isYou: true },
              { name: 'DRACO_SCOUT', pts: 120, tier: 'برونزي' },
            ]
              .sort((a, b) => b.pts - a.pts)
              .map((row, idx) => (
                <div
                  key={row.name}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
                    row.isYou
                      ? 'bg-amber-400/20 border-amber-400 text-white font-black'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num text-amber-400 w-5">#{idx + 1}</span>
                    <span>{row.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono-num">
                    <span className="text-[11px] text-slate-400">{row.tier}</span>
                    <span className="text-emerald-400 font-bold">{row.pts}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
