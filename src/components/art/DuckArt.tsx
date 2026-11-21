import React, { useId } from 'react';
import { DuckAuraId, DuckGearId, DuckSkinId, EggItemType, GodPatronId } from '../../types/game';

// Energy Grain / Crystal Icon (الطاقة / الحبوب الطاقية)
export const CornIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <defs>
        <radialGradient id={`energyCore_${uid}`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#ecfccb" />
          <stop offset="40%" stopColor="#4ade80" />
          <stop offset="82%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#042f2e" />
        </radialGradient>
        <linearGradient id={`energyShell_${uid}`} x1="6" y1="3" x2="26" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5L25 11.5L22.5 24.5L16 29.5L9.5 24.5L7 11.5L16 2.5Z"
        fill={`url(#energyCore_${uid})`}
        stroke={`url(#energyShell_${uid})`}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M16 2.5L16 15.5L7 11.5Z" fill="#ffffff" opacity="0.32" />
      <path d="M16 2.5L25 11.5L16 15.5Z" fill="#bef264" opacity="0.24" />
      <path d="M16 15.5L22.5 24.5L16 29.5Z" fill="#064e3b" opacity="0.45" />
      <circle cx="14" cy="10.5" r="2.2" fill="#ffffff" opacity="0.45" />
    </svg>
  );
};

export const StarIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <defs>
        <radialGradient id={`starGem_${uid}`} cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#ede9fe" />
          <stop offset="35%" stopColor="#a78bfa" />
          <stop offset="72%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#312e81" />
        </radialGradient>
      </defs>
      <path
        d="M16 2.5L19.9 10.9L29.1 12.1L22.3 18.5L24.1 27.6L16 23.1L7.9 27.6L9.7 18.5L2.9 12.1L12.1 10.9L16 2.5Z"
        fill={`url(#starGem_${uid})`}
        stroke="#c4b5fd"
        strokeOpacity="0.65"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M16 2.5L16 16L12.1 10.9Z" fill="#ffffff" opacity="0.4" />
      <path d="M16 2.5L19.9 10.9L16 16Z" fill="#ddd6fe" opacity="0.22" />
      <path d="M16 16L29.1 12.1L22.3 18.5Z" fill="#4338ca" opacity="0.35" />
      <path d="M16 16L7.9 27.6L9.7 18.5Z" fill="#312e81" opacity="0.38" />
    </svg>
  );
};

export const DmdIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <defs>
        <linearGradient id={`dmdRim_${uid}`} x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <radialGradient id={`dmdCore_${uid}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="90%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="13.5" fill="#0b0f19" stroke={`url(#dmdRim_${uid})`} strokeWidth="2.4" />
      <circle cx="16" cy="16" r="10.2" fill={`url(#dmdCore_${uid})`} />
      <circle cx="16" cy="16" r="8.8" stroke="#78350f" strokeOpacity="0.45" strokeWidth="0.8" />
      <path d="M12.4 10.8H16.6C19.2 10.8 20.8 12.6 20.8 16C20.8 19.4 19.2 21.2 16.6 21.2H12.4V10.8Z" fill="#111827" />
      <path d="M14.7 13.1V18.9H16.4C17.6 18.9 18.4 17.8 18.4 16C18.4 14.2 17.6 13.1 16.4 13.1H14.7Z" fill="#fde047" />
      <path d="M8.5 10.5C11 7.2 16 6.2 20.5 8" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
};

export const GoldIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <defs>
        <linearGradient id={`topaz_${uid}`} x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="85%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5L28.5 16L16 29.5L3.5 16L16 2.5Z"
        fill={`url(#topaz_${uid})`}
        stroke="#fef08a"
        strokeOpacity="0.65"
        strokeWidth="1"
      />
      <path d="M16 2.5L16 16L3.5 16Z" fill="#ffffff" opacity="0.35" />
      <path d="M16 2.5L28.5 16L16 16Z" fill="#fde047" opacity="0.22" />
      <path d="M16 7.5L23.5 16L16 24.5L8.5 16L16 7.5Z" fill="#fef08a" opacity="0.3" stroke="#92400e" strokeOpacity="0.35" strokeWidth="0.8" />
    </svg>
  );
};

type DragonElementKind = 'frost' | 'storm' | 'ember';

interface DragonPalette {
  bodyLight: string;
  bodyMid: string;
  bodyDark: string;
  bellyLight: string;
  bellyDark: string;
  wingOuter: string;
  wingMembrane: string;
  wingVein: string;
  hornLight: string;
  hornDark: string;
  eyeGlow: string;
  crestColor: string;
  element: DragonElementKind;
}

const DRAGON_PALETTES: Record<DuckSkinId, DragonPalette> = {
  aqua: {
    bodyLight: '#93d5eb',
    bodyMid: '#3c6e85',
    bodyDark: '#102430',
    bellyLight: '#bae6fd',
    bellyDark: '#528ea8',
    wingOuter: '#1c3e52',
    wingMembrane: '#2c6b87',
    wingVein: '#7dd3fc',
    hornLight: '#e0f2fe',
    hornDark: '#47687c',
    eyeGlow: '#38bdf8',
    crestColor: '#7dd3fc',
    element: 'frost',
  },
  bride: {
    bodyLight: '#f1f5f9',
    bodyMid: '#7c8fa6',
    bodyDark: '#1e293b',
    bellyLight: '#ffffff',
    bellyDark: '#cbd5e1',
    wingOuter: '#334155',
    wingMembrane: '#6485a8',
    wingVein: '#bae6fd',
    hornLight: '#e0f2fe',
    hornDark: '#475569',
    eyeGlow: '#7dd3fc',
    crestColor: '#e0f2fe',
    element: 'frost',
  },
  cool: {
    bodyLight: '#60a5fa',
    bodyMid: '#1e40af',
    bodyDark: '#0b183d',
    bellyLight: '#bfdbfe',
    bellyDark: '#3b82f6',
    wingOuter: '#172554',
    wingMembrane: '#1d4ed8',
    wingVein: '#67e8f9',
    hornLight: '#e0f2fe',
    hornDark: '#1e3a8a',
    eyeGlow: '#38bdf8',
    crestColor: '#60a5fa',
    element: 'frost',
  },
  dj: {
    bodyLight: '#64748b',
    bodyMid: '#1e293b',
    bodyDark: '#070b14',
    bellyLight: '#94a3b8',
    bellyDark: '#334155',
    wingOuter: '#0f172a',
    wingMembrane: '#1e3a5f',
    wingVein: '#38bdf8',
    hornLight: '#94a3b8',
    hornDark: '#0f172a',
    eyeGlow: '#38bdf8',
    crestColor: '#38bdf8',
    element: 'storm',
  },
  skeleton: {
    bodyLight: '#cbd5e1',
    bodyMid: '#475569',
    bodyDark: '#0f172a',
    bellyLight: '#f8fafc',
    bellyDark: '#94a3b8',
    wingOuter: '#1e293b',
    wingMembrane: '#0f172a',
    wingVein: '#22d3ee',
    hornLight: '#f8fafc',
    hornDark: '#475569',
    eyeGlow: '#22d3ee',
    crestColor: '#e2e8f0',
    element: 'storm',
  },
  ninja: {
    bodyLight: '#475569',
    bodyMid: '#111827',
    bodyDark: '#030712',
    bellyLight: '#64748b',
    bellyDark: '#1f2937',
    wingOuter: '#090d16',
    wingMembrane: '#3b0d1e',
    wingVein: '#fb7185',
    hornLight: '#9ca3af',
    hornDark: '#111827',
    eyeGlow: '#f43f5e',
    crestColor: '#fb7185',
    element: 'storm',
  },
  gamer: {
    bodyLight: '#34d399',
    bodyMid: '#065f46',
    bodyDark: '#021c15',
    bellyLight: '#a7f3d0',
    bellyDark: '#047857',
    wingOuter: '#064e3b',
    wingMembrane: '#0f5132',
    wingVein: '#4ade80',
    hornLight: '#bef264',
    hornDark: '#14532d',
    eyeGlow: '#4ade80',
    crestColor: '#34d399',
    element: 'storm',
  },
  classic: {
    bodyLight: '#5c8280',
    bodyMid: '#243b40',
    bodyDark: '#0d161a',
    bellyLight: '#9a7e63',
    bellyDark: '#4a382c',
    wingOuter: '#291c18',
    wingMembrane: '#8c4423',
    wingVein: '#fb923c',
    hornLight: '#d4af7a',
    hornDark: '#523b24',
    eyeGlow: '#fb923c',
    crestColor: '#f59e0b',
    element: 'ember',
  },
  lilac: {
    bodyLight: '#a855f7',
    bodyMid: '#4c1d95',
    bodyDark: '#1b0736',
    bellyLight: '#e9d5ff',
    bellyDark: '#7e22ce',
    wingOuter: '#2e1065',
    wingMembrane: '#6b213a',
    wingVein: '#fbbf24',
    hornLight: '#fde047',
    hornDark: '#78350f',
    eyeGlow: '#f472b6',
    crestColor: '#c084fc',
    element: 'ember',
  },
  cupid: {
    bodyLight: '#f472b6',
    bodyMid: '#831843',
    bodyDark: '#2e0518',
    bellyLight: '#fbcfe8',
    bellyDark: '#be185d',
    wingOuter: '#500724',
    wingMembrane: '#9d174d',
    wingVein: '#fda4af',
    hornLight: '#fef08a',
    hornDark: '#a16207',
    eyeGlow: '#fb7185',
    crestColor: '#fda4af',
    element: 'ember',
  },
  pumpkin: {
    bodyLight: '#fb923c',
    bodyMid: '#7c2d12',
    bodyDark: '#240b04',
    bellyLight: '#fed7aa',
    bellyDark: '#c2410c',
    wingOuter: '#431407',
    wingMembrane: '#9a3412',
    wingVein: '#fde047',
    hornLight: '#bef264',
    hornDark: '#365314',
    eyeGlow: '#fde047',
    crestColor: '#f97316',
    element: 'ember',
  },
  pharaoh: {
    bodyLight: '#facc15',
    bodyMid: '#854d0e',
    bodyDark: '#291504',
    bellyLight: '#fef08a',
    bellyDark: '#b45309',
    wingOuter: '#451a03',
    wingMembrane: '#1e3a5f',
    wingVein: '#38bdf8',
    hornLight: '#fef9c3',
    hornDark: '#92400e',
    eyeGlow: '#38bdf8',
    crestColor: '#facc15',
    element: 'ember',
  },
  royal: {
    bodyLight: '#fde047',
    bodyMid: '#92400e',
    bodyDark: '#2e1604',
    bellyLight: '#fef9c3',
    bellyDark: '#ca8a04',
    wingOuter: '#450a0a',
    wingMembrane: '#7f1d1d',
    wingVein: '#fbbf24',
    hornLight: '#ffffff',
    hornDark: '#b45309',
    eyeGlow: '#f43f5e',
    crestColor: '#facc15',
    element: 'ember',
  },
  coffee: {
    bodyLight: '#ea580c',
    bodyMid: '#5c1812',
    bodyDark: '#1c0605',
    bellyLight: '#fdba74',
    bellyDark: '#9a3412',
    wingOuter: '#2b0907',
    wingMembrane: '#7c2d12',
    wingVein: '#fb923c',
    hornLight: '#fdba74',
    hornDark: '#521b08',
    eyeGlow: '#fb923c',
    crestColor: '#ef4444',
    element: 'ember',
  },
};

export const GearIcon: React.FC<{ gear: DuckGearId; className?: string }> = ({
  gear,
  className = 'w-6 h-6',
}) => {
  const uid = useId().replace(/:/g, '');
  if (gear === 'crown') {
    return (
      <svg viewBox="0 0 36 36" className={className} fill="none">
        <defs>
          <linearGradient id={`crownG_${uid}`} x1="6" y1="8" x2="30" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="55%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <path
          d="M5 26L8 12L14 19L18 9L22 19L28 12L31 26H5Z"
          fill={`url(#crownG_${uid})`}
          stroke="#78350f"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect x="6" y="25.5" width="24" height="4" rx="1.5" fill="#d97706" stroke="#78350f" strokeWidth="1.3" />
        <circle cx="18" cy="21" r="2.2" fill="#e11d48" stroke="#fef08a" strokeWidth="0.8" />
        <circle cx="11.5" cy="22" r="1.4" fill="#38bdf8" />
        <circle cx="24.5" cy="22" r="1.4" fill="#38bdf8" />
      </svg>
    );
  }
  if (gear === 'helmet') {
    return (
      <svg viewBox="0 0 36 36" className={className} fill="none">
        <defs>
          <linearGradient id={`helmG_${uid}`} x1="6" y1="6" x2="30" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <path
          d="M7 22C7 12.5 12 7 18 7C24 7 29 12.5 29 22L27 27H22V20L18 17L14 20V27H9L7 22Z"
          fill={`url(#helmG_${uid})`}
          stroke="#facc15"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M18 4L20.5 13H15.5L18 4Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
      </svg>
    );
  }
  if (gear === 'shades') {
    return (
      <svg viewBox="0 0 36 36" className={className} fill="none">
        <rect x="4" y="13" width="12" height="9" rx="3" fill="#090d16" stroke="#f97316" strokeWidth="1.6" />
        <rect x="20" y="13" width="12" height="9" rx="3" fill="#090d16" stroke="#f97316" strokeWidth="1.6" />
        <path d="M16 16.5H20" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.5 15.5L11 20M22.5 15.5L27 20" stroke="#fb7185" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (gear === 'wings') {
    return (
      <svg viewBox="0 0 36 36" className={className} fill="none">
        <defs>
          <linearGradient id={`wingG_${uid}`} x1="4" y1="8" x2="32" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <path
          d="M17 24C12 19 6 14 4 8C10 9 14 12 17 17C20 12 24 9 32 8C30 14 24 19 19 24L18 28L17 24Z"
          fill={`url(#wingG_${uid})`}
          stroke="#e0f2fe"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none">
      <circle cx="18" cy="18" r="10" stroke="#475569" strokeWidth="1.6" strokeDasharray="3 3" />
      <path d="M18 12L21.5 18L18 24L14.5 18L18 12Z" fill="#38bdf8" fillOpacity="0.65" />
    </svg>
  );
};

export const DragonIllustration: React.FC<{
  skin: DuckSkinId;
  className?: string;
  isPressed?: boolean;
  mood?: 'idle' | 'fever' | 'battle' | 'hurt';
  level?: number;
  customLevel?: number;
  showEvolutionEffects?: boolean;
  gear?: DuckGearId;
  aura?: DuckAuraId;
  staked?: boolean;
}> = ({
  skin,
  className = 'w-44 h-44',
  isPressed = false,
  mood = 'idle',
  level,
  customLevel = 0,
  showEvolutionEffects = false,
  gear = 'none',
  aura = 'auto',
  staked = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const p = DRAGON_PALETTES[skin] ?? DRAGON_PALETTES.aqua;
  const lv = Math.max(1, Math.min(5, level ?? 3));

  const levelScale =
    level === undefined
      ? ''
      : lv === 1
        ? 'scale-[0.88]'
        : lv === 2
          ? 'scale-[0.93]'
          : lv === 3
            ? 'scale-[0.97]'
            : lv === 4
              ? 'scale-[1.02]'
              : 'scale-[1.06]';

  const auraGradient =
    aura === 'gold'
      ? 'from-amber-400/50 via-yellow-300/25 to-transparent'
      : aura === 'flame'
        ? 'from-rose-500/50 via-orange-400/25 to-transparent'
        : aura === 'emerald'
          ? 'from-emerald-400/45 via-teal-300/20 to-transparent'
          : mood === 'fever'
            ? 'from-rose-500/45 via-amber-400/25 to-transparent'
            : mood === 'battle'
              ? 'from-rose-500/35 via-orange-400/15 to-transparent'
              : lv >= 5 && customLevel >= 1
                ? 'from-amber-400/45 via-yellow-300/25 to-transparent'
                : lv >= 5
                  ? 'from-amber-400/35 via-yellow-300/15 to-transparent'
                  : lv === 4
                    ? 'from-purple-400/35 via-fuchsia-400/15 to-transparent'
                    : lv === 3
                      ? 'from-sky-400/30 via-cyan-300/10 to-transparent'
                      : lv === 2
                        ? 'from-emerald-400/25 via-teal-300/10 to-transparent'
                        : 'from-slate-400/10 to-transparent';

  const pedestalClass =
    aura === 'gold' || (staked && aura === 'auto')
      ? 'border-amber-300/85 bg-amber-400/25 shadow-[0_0_22px_rgba(251,191,36,0.55)]'
      : aura === 'flame'
        ? 'border-rose-400/85 bg-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.5)]'
        : aura === 'emerald'
          ? 'border-emerald-400/85 bg-emerald-500/25 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
          : lv >= 5
            ? 'border-amber-300/80 bg-amber-400/25 shadow-[0_0_20px_rgba(251,191,36,0.55)]'
            : lv === 4
              ? 'border-purple-400/70 bg-purple-400/20 shadow-[0_0_14px_rgba(192,132,252,0.45)]'
              : lv === 3
                ? 'border-sky-400/65 bg-sky-400/15 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                : 'border-emerald-400/55 bg-emerald-400/15';

  const showCrown = gear === 'crown' || (gear === 'none' && showEvolutionEffects && lv >= 5);
  const effectiveAuraGlow =
    aura === 'gold'
      ? '#facc15'
      : aura === 'flame'
        ? '#fb923c'
        : aura === 'emerald'
          ? '#34d399'
          : p.eyeGlow;

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className} transition-transform duration-150 ${
        isPressed
          ? 'scale-95 -translate-y-0.5 brightness-115'
          : mood === 'hurt'
            ? 'animate-hit-shake'
            : 'animate-duck-breathe'
      }`}
    >
      {/* Evolution / Custom Aura Halo */}
      {(showEvolutionEffects || aura !== 'auto' || staked || customLevel > 0) && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-1 rounded-full bg-radial ${auraGradient} blur-md`}
        />
      )}

      {/* Evolution / Staked Pedestal Ring */}
      {(showEvolutionEffects || staked || aura !== 'auto') && (lv >= 2 || staked || aura !== 'auto') && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-1 w-[78%] h-[16%] rounded-full border blur-[0.3px] ${pedestalClass}`}
        />
      )}

      {/* Heroic Dark-Fantasy Winged Quadruped Dragon SVG */}
      <svg
        viewBox="0 0 200 200"
        className={`relative z-10 w-full h-full drop-shadow-[0_14px_18px_rgba(0,0,0,0.8)] transition-transform duration-200 ${levelScale}`}
        fill="none"
      >
        <defs>
          <linearGradient id={`dScale_${uid}`} x1="36" y1="26" x2="152" y2="168" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.bodyLight} />
            <stop offset="48%" stopColor={p.bodyMid} />
            <stop offset="100%" stopColor={p.bodyDark} />
          </linearGradient>
          <linearGradient id={`dPlate_${uid}`} x1="68" y1="62" x2="108" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.bellyLight} />
            <stop offset="55%" stopColor={p.bellyDark} />
            <stop offset="100%" stopColor={p.bodyDark} />
          </linearGradient>
          <linearGradient id={`dWingL_${uid}`} x1="16" y1="32" x2="90" y2="134" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.wingVein} stopOpacity="0.9" />
            <stop offset="42%" stopColor={p.wingMembrane} />
            <stop offset="100%" stopColor={p.wingOuter} />
          </linearGradient>
          <linearGradient id={`dWingR_${uid}`} x1="108" y1="18" x2="190" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.wingVein} stopOpacity="0.88" />
            <stop offset="42%" stopColor={p.wingMembrane} />
            <stop offset="100%" stopColor={p.wingOuter} />
          </linearGradient>
          <linearGradient id={`dHorn_${uid}`} x1="55" y1="10" x2="115" y2="62" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.hornLight} />
            <stop offset="65%" stopColor={p.hornDark} />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id={`dRock_${uid}`} x1="32" y1="150" x2="170" y2="194" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="32%" stopColor="#263143" />
            <stop offset="100%" stopColor="#070a12" />
          </linearGradient>
          <radialGradient id={`dGlow_${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="42%" stopColor={effectiveAuraGlow} stopOpacity="0.96" />
            <stop offset="100%" stopColor={effectiveAuraGlow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`dSpec_${uid}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.48" />
            <stop offset="48%" stopColor={p.bodyLight} stopOpacity="0.14" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
          </radialGradient>
          {/* Procedural overlapping armored dragon scales texture */}
          <pattern id={`dScaleTex_${uid}`} width="9" height="8" patternUnits="userSpaceOnUse">
            <path
              d="M4.5 0.5L8.4 3.4L7 7.4L4.5 7.8L2 7.4L0.6 3.4Z"
              fill="none"
              stroke="#05080f"
              strokeOpacity="0.48"
              strokeWidth="0.95"
            />
            <path
              d="M2.2 2.4L4.5 1.1L6.8 2.4"
              stroke="#ffffff"
              strokeOpacity="0.24"
              strokeWidth="0.7"
              strokeLinecap="round"
            />
          </pattern>
        </defs>

        {/* Ground Shadow & Basalt Cliff Crag */}
        <ellipse cx="102" cy="186" rx="70" ry="9.5" fill="#000000" opacity="0.68" />
        <path
          d="M30 184L42 163L62 157L94 155L134 157L158 165L172 184L142 191L58 191Z"
          fill={`url(#dRock_${uid})`}
          stroke="#090d16"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Cliff Rock Facets, Chisel Highlights & Elemental Fissure Cracks */}
        <path
          d="M42 163L74 172L94 155M134 157L128 176L158 165M74 172L68 189M128 176L138 190M62 157L84 164L112 159"
          stroke="#94a3b8"
          strokeOpacity="0.34"
          strokeWidth="1.2"
        />
        <path
          d="M52 169L78 174L92 167M114 168L134 175L152 170"
          stroke={effectiveAuraGlow}
          strokeOpacity="0.78"
          strokeWidth="1.7"
          strokeLinecap="round"
        />

        {/* Celestial Storm Wing Gear Overlay */}
        {gear === 'wings' && (
          <g className="animate-dragon-wing">
            <path
              d="M84 86C52 44 14 26 6 58C8 82 32 104 68 112Z"
              fill={effectiveAuraGlow}
              fillOpacity="0.34"
              stroke="#e0f2fe"
              strokeWidth="1.6"
            />
            <path
              d="M112 84C144 36 184 18 194 54C190 80 164 104 126 112Z"
              fill={effectiveAuraGlow}
              fillOpacity="0.34"
              stroke="#e0f2fe"
              strokeWidth="1.6"
            />
          </g>
        )}

        {/* BACK LEFT BAT-WING */}
        <g className="animate-dragon-wing">
          <path
            d="M78 82C62 62 46 46 32 38C22 50 12 72 10 96C20 98 24 114 22 126C36 116 44 118 48 132C58 116 68 114 78 122Z"
            fill={`url(#dWingL_${uid})`}
            stroke={p.bodyDark}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path
            d="M78 84L32 38M32 38L14 96M32 38L30 116M32 38L52 114"
            stroke={p.wingOuter}
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <path
            d="M32 38C25 32 22 25 26 21C30 26 34 31 35 37Z"
            fill={`url(#dHorn_${uid})`}
            stroke={p.bodyDark}
            strokeWidth="1.2"
          />
          <path
            d="M34 56C44 68 46 84 40 100M26 70C32 82 28 96 22 108M44 66C54 78 56 92 52 106"
            stroke={p.wingVein}
            strokeOpacity="0.72"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>

        {/* FRONT RIGHT BAT-WING */}
        <g className="animate-dragon-wing">
          <path
            d={
              lv >= 4
                ? 'M106 86C116 56 126 30 132 18C152 24 176 42 188 76C184 96 188 122 186 142C174 126 164 128 160 144C148 124 136 122 126 136C118 118 110 116 104 122Z'
                : 'M106 88C114 62 124 40 130 28C148 34 170 50 182 80C178 98 180 118 178 134C166 122 158 124 154 136C144 120 134 118 124 128C116 116 110 114 104 120Z'
            }
            fill={`url(#dWingR_${uid})`}
            stroke={p.bodyDark}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Wing Arm & Finger Bones + Specular Rim */}
          <path
            d="M104 88C114 62 122 38 130 24M130 24L184 78M130 24L176 124M130 24L154 124M130 24L126 118"
            stroke={p.wingOuter}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M105 86C114 61 122 38 129 25"
            stroke={p.bodyLight}
            strokeOpacity="0.42"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Apex Hooked Wing-Thumb Claw */}
          <path
            d="M130 24C126 15 129 9 135 8C136 14 135 20 133 26Z"
            fill={`url(#dHorn_${uid})`}
            stroke={p.bodyDark}
            strokeWidth="1.3"
          />
          {/* Wing Membrane Capillary Glow Veins */}
          <path
            d="M136 42C150 56 164 78 168 102M132 58C142 74 146 96 144 116M148 58C160 66 172 80 176 96"
            stroke={p.wingVein}
            strokeOpacity="0.74"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </g>

        {/* SWEEPING SPIKED DRAGON TAIL */}
        <path
          d="M128 138C154 140 172 156 164 174C156 188 132 184 114 178C128 175 144 175 150 165C154 156 140 150 124 150Z"
          fill={`url(#dScale_${uid})`}
          stroke={p.bodyDark}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M128 138C154 140 172 156 164 174C156 188 132 184 114 178C128 175 144 175 150 165C154 156 140 150 124 150Z"
          fill={`url(#dScaleTex_${uid})`}
        />
        <path
          d="M148 138L153 130L156 142M162 150L170 144L168 157M166 166L175 166L166 175M114 178L102 183L112 170L124 174Z"
          fill={p.crestColor}
          stroke={p.bodyDark}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* BACK RIGHT HINDLEG */}
        <path
          d="M114 120C132 122 142 136 134 154L142 168L130 170L122 154C116 144 110 132 114 120Z"
          fill={`url(#dScale_${uid})`}
          stroke={p.bodyDark}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M114 120C132 122 142 136 134 154L142 168L130 170L122 154C116 144 110 132 114 120Z"
          fill={`url(#dScaleTex_${uid})`}
        />
        <path
          d="M126 168L120 174M134 169L132 175M141 168L144 174"
          stroke={`url(#dHorn_${uid})`}
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* QUADRUPED MUSCULAR TORSO & SCALE ARMOR */}
        <path
          d="M66 96C66 78 96 76 118 92C134 106 134 134 118 148C98 160 72 152 66 130C62 116 64 106 66 96Z"
          fill={`url(#dScale_${uid})`}
          stroke={p.bodyDark}
          strokeWidth="2.4"
        />
        <path
          d="M66 96C66 78 96 76 118 92C134 106 134 134 118 148C98 160 72 152 66 130C62 116 64 106 66 96Z"
          fill={`url(#dScaleTex_${uid})`}
        />
        <path
          d="M66 96C66 78 96 76 118 92C134 106 134 134 118 148C98 160 72 152 66 130C62 116 64 106 66 96Z"
          fill={`url(#dSpec_${uid})`}
        />
        {/* Overlapping Ventral Chest & Belly Scale Plates */}
        <path
          d="M72 90C76 82 94 82 98 92C100 112 96 134 86 148C74 142 68 118 72 90Z"
          fill={`url(#dPlate_${uid})`}
          stroke={p.bodyDark}
          strokeWidth="1.6"
        />
        <path
          d="M72 98Q85 103 97 98M71 108Q85 113 97 108M72 118Q85 123 95 118M74 128Q84 133 93 128M77 138Q84 142 90 138"
          stroke={p.bodyDark}
          strokeOpacity="0.72"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M74 96Q85 100 95 96M73 106Q85 110 95 106M74 116Q85 120 93 116"
          stroke="#ffffff"
          strokeOpacity="0.28"
          strokeWidth="0.9"
          strokeLinecap="round"
        />

        {/* S-CURVED SCALED NECK + DORSAL CREST SPIKES */}
        <path
          d="M66 96C64 78 66 64 70 52L94 56C98 72 104 86 102 100Z"
          fill={`url(#dScale_${uid})`}
          stroke={p.bodyDark}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M66 96C64 78 66 64 70 52L94 56C98 72 104 86 102 100Z"
          fill={`url(#dScaleTex_${uid})`}
        />
        <path
          d="M68 62Q82 65 94 62M67 72Q82 76 96 72M67 82Q83 86 98 82"
          stroke={p.bellyLight}
          strokeOpacity="0.58"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M89 48L102 41L95 55M93 58L108 54L98 67M97 70L112 68L102 80M108 88L122 83L114 96"
          fill={p.crestColor}
          stroke={p.bodyDark}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* FRONT FORELIMBS + SCULPTED MUSCLE + TALONS */}
        <path
          d="M92 106C106 108 114 122 108 136L104 166L92 166L92 140C86 128 84 114 92 106Z"
          fill={`url(#dScale_${uid})`}
          stroke={p.bodyDark}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M92 106C106 108 114 122 108 136L104 166L92 166L92 140C86 128 84 114 92 106Z"
          fill={`url(#dScaleTex_${uid})`}
        />
        <path
          d="M95 111C103 113 107 123 103 134"
          stroke={p.bodyLight}
          strokeOpacity="0.45"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path d="M108 134L118 128L107 142" fill={`url(#dHorn_${uid})`} stroke={p.bodyDark} strokeWidth="1.3" />
        <path
          d="M92 165L84 172M97 166L95 174M103 165L107 172"
          stroke={`url(#dHorn_${uid})`}
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        <path
          d="M68 114C60 124 58 138 62 152L58 164L70 165L74 146C78 134 76 122 68 114Z"
          fill={`url(#dScale_${uid})`}
          stroke={p.bodyDark}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M68 114C60 124 58 138 62 152L58 164L70 165L74 146C78 134 76 122 68 114Z"
          fill={`url(#dScaleTex_${uid})`}
        />
        <path
          d="M58 163L50 169M64 164L62 171M69 164L74 170"
          stroke={`url(#dHorn_${uid})`}
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* FIERCE THREE-QUARTER DRAGON HEAD, HORNS & ROARING FANGED JAWS */}
        <path
          d={
            lv >= 4
              ? 'M78 32C86 18 100 8 114 6C106 18 96 28 88 38Z'
              : 'M78 33C86 22 96 14 106 12C100 22 92 30 86 38Z'
          }
          fill={`url(#dHorn_${uid})`}
          stroke={p.bodyDark}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d={
            lv >= 4
              ? 'M68 32C70 16 80 6 92 3C86 16 82 26 78 36Z'
              : 'M68 34C70 21 78 12 86 10C82 20 80 28 76 37Z'
          }
          fill={`url(#dHorn_${uid})`}
          stroke={p.bodyDark}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Striated Keratin Ridges & Metallic Rings along Horns */}
        <path d="M74 21L82 24M88 21L96 24" stroke="#facc15" strokeOpacity="0.78" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M72 28L77 30M84 26L89 29M94 16L99 19" stroke="#0f172a" strokeOpacity="0.5" strokeWidth="1.1" strokeLinecap="round" />

        {/* Cheek & Jaw Frill Spikes */}
        <path
          d="M82 40L97 35L87 46M84 48L99 47L86 55M80 56L92 59L78 62"
          fill={p.bodyLight}
          stroke={p.bodyDark}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Glowing Maw Interior Core */}
        <path
          d="M40 54L68 50L70 64L46 66Z"
          fill={`url(#dGlow_${uid})`}
          opacity={mood === 'fever' || mood === 'battle' || isPressed ? 0.95 : 0.76}
        />

        {/* Lower Snarling Jaw & Chin Spike */}
        <path
          d="M44 62L72 58L74 67L56 71L45 68Z"
          fill={`url(#dScale_${uid})`}
          stroke={p.bodyDark}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M52 70L48 76L56 71Z" fill={`url(#dHorn_${uid})`} stroke={p.bodyDark} strokeWidth="1.1" />
        <path d="M47 62L49 57L51 62M55 61L57 57L59 61M63 60L65 56L67 60" fill="#f8fafc" />

        {/* Upper Angular Predator Skull & Snout */}
        <path
          d="M36 52C38 44 48 37 64 33C76 30 85 36 86 47C82 54 70 56 54 55L40 56Z"
          fill={`url(#dScale_${uid})`}
          stroke={p.bodyDark}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M36 52C38 44 48 37 64 33C76 30 85 36 86 47C82 54 70 56 54 55L40 56Z"
          fill={`url(#dScaleTex_${uid})`}
        />
        {/* Snout Specular Ridge */}
        <path d="M40 49C46 43 56 39 68 37" stroke={p.bodyLight} strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M41 55L43 61L45 55M49 55L51 60L53 55M57 55L59 60L61 55" fill="#f8fafc" />

        {/* Fierce Brow Ridge & Multi-Layered Glassy Dragon Eye */}
        <path d="M54 39L72 41" stroke={p.bodyDark} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="62" cy="44" rx="5.2" ry="3.4" transform="rotate(-10 62 44)" fill="#05070c" />
        <ellipse cx="62" cy="44" rx="3.7" ry="2.4" transform="rotate(-10 62 44)" fill={p.eyeGlow} />
        <ellipse cx="62" cy="44" rx="0.9" ry="2.2" fill="#05070c" />
        <circle cx="60.4" cy="42.8" r="1.1" fill="#ffffff" fillOpacity="0.9" />

        {/* Glowing Nostril Smoke / Ember */}
        <circle cx="43" cy="48" r="1.8" fill={p.eyeGlow} />

        {/* LIVE ELEMENTAL BREATH & LIGHTNING EFFECTS */}
        {(p.element === 'frost' || mood === 'fever') && (
          <g className="animate-dragon-breath">
            <path
              d="M39 58C26 56 16 62 12 68C20 68 30 65 40 62Z"
              fill={effectiveAuraGlow}
              fillOpacity="0.5"
            />
            <circle cx="22" cy="60" r="2.2" fill="#ffffff" fillOpacity="0.72" />
            <circle cx="15" cy="66" r="1.6" fill={effectiveAuraGlow} fillOpacity="0.88" />
          </g>
        )}

        {(p.element === 'storm' || mood === 'fever' || mood === 'battle') && (
          <g className="animate-dragon-bolt">
            <path
              d="M28 52L18 46L23 39L12 32"
              stroke={effectiveAuraGlow}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M156 54L170 46L164 62L178 58"
              stroke={effectiveAuraGlow}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M52 162L40 152L46 144"
              stroke="#ffffff"
              strokeOpacity="0.75"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </g>
        )}

        {p.element === 'ember' && (
          <g className="animate-dragon-breath">
            <circle cx="34" cy="56" r="2.4" fill={p.eyeGlow} fillOpacity="0.82" />
            <circle cx="24" cy="49" r="1.6" fill="#fef08a" fillOpacity="0.8" />
            <circle cx="28" cy="66" r="1.5" fill={p.wingVein} fillOpacity="0.75" />
          </g>
        )}

        {/* IN-SVG EQUIPPED GEAR */}
        {showCrown && (
          <g transform="translate(56, 14)">
            <path
              d="M0 18L3 5L9 11L13 1L17 11L23 5L26 18Z"
              fill="#facc15"
              stroke="#78350f"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <rect x="1" y="17" width="24" height="4" rx="1.5" fill="#d97706" stroke="#78350f" strokeWidth="1.2" />
            <circle cx="13" cy="12" r="2" fill="#e11d48" />
          </g>
        )}

        {gear === 'helmet' && (
          <g>
            <path
              d="M42 44C46 34 60 28 76 31L82 43L68 45L54 41L42 44Z"
              fill="#94a3b8"
              stroke="#facc15"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M58 26L64 36L52 36Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
          </g>
        )}

        {gear === 'shades' && (
          <g>
            <path
              d="M44 43L68 40L72 47L48 50Z"
              fill="#090d16"
              stroke="#f97316"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M50 44L60 47" stroke="#fb7185" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}
      </svg>

      {/* Star Customization Level Badge (Custom_LVL >= 1) */}
      {showEvolutionEffects && customLevel > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 right-1 z-20 px-1.5 h-5 rounded-full bg-indigo-500/95 border border-indigo-200 text-white font-mono-num text-[9px] font-black flex items-center justify-center shadow-md"
        >
          ★{customLevel}
        </span>
      )}

      {/* Active DMD Generator Badge */}
      {showEvolutionEffects && staked && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-1 z-20 px-1.5 h-5 rounded-full bg-amber-400/95 border border-amber-200 text-slate-950 font-mono-num text-[9px] font-black flex items-center justify-center shadow-md"
        >
          DMD
        </span>
      )}
    </div>
  );
};

// Keep DuckIllustration export alias for backwards compatibility across components
export const DuckIllustration = DragonIllustration;

export const ItemIcon: React.FC<{ item: EggItemType; className?: string }> = ({
  item,
  className = 'w-10 h-10',
}) => {
  const uid = useId().replace(/:/g, '');
  if (item === 'chest') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <defs>
          <linearGradient id={`chestLid_${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <rect x="6" y="16" width="36" height="24" rx="5" fill="#78350f" stroke="#f59e0b" strokeWidth="2.5" />
        <path d="M6 20C6 13 13 10 24 10C35 10 42 13 42 20H6Z" fill={`url(#chestLid_${uid})`} stroke="#fef08a" strokeWidth="1.5" />
        <rect x="20" y="18" width="8" height="10" rx="2" fill="#facc15" stroke="#451a03" strokeWidth="1.5" />
        <circle cx="24" cy="23" r="1.8" fill="#451a03" />
      </svg>
    );
  }
  if (item === 'grapes') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <path d="M24 6L34 18L24 38L14 18L24 6Z" fill="#a855f7" stroke="#f3e8ff" strokeWidth="2" />
        <path d="M24 6L24 38M14 18H34" stroke="#e9d5ff" strokeOpacity="0.45" strokeWidth="1.5" />
      </svg>
    );
  }
  if (item === 'chalice') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <path d="M13 10H35L31 24C30 28 27 30 24 30C21 30 18 28 17 24L13 10Z" fill="#facc15" stroke="#b45309" strokeWidth="2" />
        <rect x="21" y="30" width="6" height="8" fill="#d97706" />
        <rect x="15" y="38" width="18" height="4" rx="2" fill="#facc15" />
        <circle cx="24" cy="18" r="3.5" fill="#ef4444" />
      </svg>
    );
  }
  if (item === 'cornucopia') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <path d="M10 30C12 16 26 10 40 16C34 26 26 36 12 36L10 30Z" fill="#d97706" stroke="#fef08a" strokeWidth="2" />
        <circle cx="16" cy="28" r="4" fill="#ef4444" />
        <circle cx="22" cy="24" r="4" fill="#22c55e" />
        <circle cx="26" cy="30" r="4" fill="#a855f7" />
        <circle cx="31" cy="22" r="3.5" fill="#facc15" />
      </svg>
    );
  }
  if (item === 'feast') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <ellipse cx="24" cy="34" rx="18" ry="6" fill="#facc15" stroke="#92400e" strokeWidth="2" />
        <path d="M12 32C12 20 36 20 36 32H12Z" fill="#ea580c" stroke="#fef08a" strokeWidth="1.5" />
        <circle cx="24" cy="17" r="4" fill="#fde047" />
      </svg>
    );
  }

  // Dragon Eggs (egg_1 .. egg_love) with scaly dragon-shell texture & elemental glow
  const eggPalette: Record<string, { top: string; bot: string; crack: string }> = {
    egg_1: { top: '#fef3c7', bot: '#d97706', crack: '#fbbf24' },
    egg_2: { top: '#bae6fd', bot: '#0284c7', crack: '#38bdf8' },
    egg_3: { top: '#e9d5ff', bot: '#7e22ce', crack: '#c084fc' },
    egg_4: { top: '#bbf7d0', bot: '#15803d', crack: '#4ade80' },
    egg_5: { top: '#fef08a', bot: '#ea580c', crack: '#fb923c' },
    egg_6: { top: '#fecdd3', bot: '#be123c', crack: '#fb7185' },
    egg_7: { top: '#cffafe', bot: '#4338ca', crack: '#67e8f9' },
    egg_love: { top: '#fbcfe8', bot: '#db2777', crack: '#fef08a' },
  };
  const pal = eggPalette[item] ?? eggPalette.egg_1;

  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <defs>
        <linearGradient id={`egg_${uid}`} x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={pal.top} />
          <stop offset="100%" stopColor={pal.bot} />
        </linearGradient>
      </defs>
      <path
        d="M24 6C15 6 10 19 10 29C10 37 16 42 24 42C32 42 38 37 38 29C38 19 33 6 24 6Z"
        fill={`url(#egg_${uid})`}
        stroke="#0f172a"
        strokeWidth="2"
      />
      {/* Dragon egg scale chevrons & elemental crack */}
      <path
        d="M17 20L21 23L25 20L29 23L32 20M15 29L20 32L24 28L28 32L33 29"
        stroke={pal.crack}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="19" cy="14" rx="3" ry="5" fill="#ffffff" opacity="0.4" transform="rotate(-14 19 14)" />
    </svg>
  );
};

export const GodIllustration: React.FC<{
  godId: GodPatronId | 'harvest' | 'hype' | 'fortune' | 'plunder' | 'trader';
  className?: string;
}> = ({ godId, className = 'w-16 h-16' }) => {
  const uid = useId().replace(/:/g, '');
  const themes: Record<string, { bgTop: string; bgBot: string; ring: string; glow: string }> = {
    anubis: { bgTop: '#312e81', bgBot: '#0f172a', ring: '#f59e0b', glow: '#fbbf24' },
    horus: { bgTop: '#0369a1', bgBot: '#082f49', ring: '#38bdf8', glow: '#7dd3fc' },
    dionysus: { bgTop: '#581c87', bgBot: '#1e0b36', ring: '#c084fc', glow: '#e879f9' },
    bastet: { bgTop: '#831843', bgBot: '#2d061b', ring: '#f472b6', glow: '#fb7185' },
    zeus: { bgTop: '#854d0e', bgBot: '#1c1004', ring: '#facc15', glow: '#fef08a' },
    harvest: { bgTop: '#065f46', bgBot: '#022c22', ring: '#34d399', glow: '#6ee7b7' },
    hype: { bgTop: '#3730a3', bgBot: '#1e1b4b', ring: '#fbbf24', glow: '#fde047' },
    fortune: { bgTop: '#6b21a8', bgBot: '#2e1065', ring: '#e879f9', glow: '#f0abfc' },
    plunder: { bgTop: '#9a3412', bgBot: '#2a0f05', ring: '#facc15', glow: '#fb923c' },
    trader: { bgTop: '#1e3a5f', bgBot: '#091526', ring: '#38bdf8', glow: '#facc15' },
  };
  const meta = themes[godId] ?? themes.anubis;

  const renderGlyph = () => {
    switch (godId) {
      case 'anubis':
        return (
          <g>
            {/* Jackal Dragon Crown & Ankh Crest */}
            <path d="M22 30L20 13L29 22L32 19L35 22L44 13L42 30L47 36L32 50L17 36L22 30Z" fill={`url(#gAccent_${uid})`} stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
            <path d="M26 30L32 25L38 30L32 42L26 30Z" fill="#0f172a" fillOpacity="0.65" />
            <circle cx="27" cy="31" r="2.1" fill="#fef08a" />
            <circle cx="37" cy="31" r="2.1" fill="#fef08a" />
            <path d="M32 16V23M29 19.5H35" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 'horus':
        return (
          <g>
            {/* Solar Falcon Wings & Eye of Horus */}
            <path d="M10 28C16 20 24 20 32 24C40 20 48 20 54 28C47 31 41 33 37 38L32 47L27 38C23 33 17 31 10 28Z" fill={`url(#gAccent_${uid})`} stroke="#082f49" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="32" cy="21" r="6" fill="#fef08a" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M25 32C28 29 36 29 39 32C36 35 28 35 25 32Z" fill="#082f49" />
            <circle cx="32" cy="32" r="2.2" fill="#38bdf8" />
          </g>
        );
      case 'dionysus':
        return (
          <g>
            {/* Golden Goblet & Vine Crest */}
            <path d="M21 18H43L40 31C39 36 36 38 32 38C28 38 25 36 24 31L21 18Z" fill={`url(#gAccent_${uid})`} stroke="#1e0b36" strokeWidth="2" />
            <path d="M32 38V47M24 47H40" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
            <circle cx="25" cy="17" r="3.2" fill="#e879f9" stroke="#3b0764" strokeWidth="1.2" />
            <circle cx="32" cy="15" r="3.6" fill="#c084fc" stroke="#3b0764" strokeWidth="1.2" />
            <circle cx="39" cy="17" r="3.2" fill="#e879f9" stroke="#3b0764" strokeWidth="1.2" />
          </g>
        );
      case 'bastet':
        return (
          <g>
            {/* Solar Cat Guardian + Crescent Halo */}
            <circle cx="32" cy="33" r="14" stroke="#facc15" strokeWidth="2" strokeOpacity="0.65" />
            <path d="M21 28L19 14L29 21H35L45 14L43 28C45 34 42 44 32 47C22 44 19 34 21 28Z" fill={`url(#gAccent_${uid})`} stroke="#2d061b" strokeWidth="2" strokeLinejoin="round" />
            <path d="M25 30L29 32L25 34Z" fill="#fef08a" />
            <path d="M39 30L35 32L39 34Z" fill="#fef08a" />
            <path d="M32 36L30 39H34L32 36Z" fill="#2d061b" />
          </g>
        );
      case 'zeus':
        return (
          <g>
            {/* Royal Lightning Bolt & Halo */}
            <circle cx="32" cy="32" r="17" stroke="#fef08a" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.7" />
            <path d="M35 12L20 33H31L27 52L45 29H33L35 12Z" fill={`url(#gAccent_${uid})`} stroke="#422006" strokeWidth="2" strokeLinejoin="round" />
            <path d="M34 17L24 31H32L30 44" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
          </g>
        );
      case 'harvest':
        return (
          <g>
            {/* Emerald Leaf Chalice */}
            <path d="M32 49V23" stroke="#a7f3d0" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M32 34C22 34 16 27 17 17C26 17 32 23 32 34Z" fill={`url(#gAccent_${uid})`} stroke="#022c22" strokeWidth="1.8" />
            <path d="M32 30C42 30 48 23 47 13C38 13 32 19 32 30Z" fill="#6ee7b7" stroke="#022c22" strokeWidth="1.8" />
            <circle cx="32" cy="18" r="3" fill="#fef08a" />
          </g>
        );
      case 'hype':
        return (
          <g>
            {/* Twin Lightning Wings */}
            <path d="M12 24L26 28L18 37L32 45L46 37L38 28L52 24L38 19L32 12L26 19L12 24Z" fill={`url(#gAccent_${uid})`} stroke="#1e1b4b" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M32 18L27 32H33L29 45" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      case 'fortune':
        return (
          <g>
            {/* Arcane Crystal Prism */}
            <path d="M32 11L46 27L32 51L18 27L32 11Z" fill={`url(#gAccent_${uid})`} stroke="#2e1065" strokeWidth="2" strokeLinejoin="round" />
            <path d="M32 11L32 51M18 27H46" stroke="#fdf4ff" strokeOpacity="0.6" strokeWidth="1.4" />
            <circle cx="32" cy="27" r="4" fill="#fef08a" />
          </g>
        );
      case 'plunder':
        return (
          <g>
            {/* Sovereign Dragon Crown */}
            <path d="M14 40L17 20L26 29L32 15L38 29L47 20L50 40H14Z" fill={`url(#gAccent_${uid})`} stroke="#431407" strokeWidth="2" strokeLinejoin="round" />
            <rect x="16" y="40" width="32" height="6" rx="2" fill="#f59e0b" stroke="#431407" strokeWidth="1.6" />
            <circle cx="32" cy="31" r="3" fill="#e11d48" stroke="#fef08a" strokeWidth="1" />
          </g>
        );
      case 'trader':
      default:
        return (
          <g>
            {/* Celestial Scales of Barter */}
            <path d="M32 15V46M23 46H41M17 22H47" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M17 22L12 34H22L17 22Z" fill="#38bdf8" fillOpacity="0.85" stroke="#e0f2fe" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M47 22L42 34H52L47 22Z" fill="#facc15" fillOpacity="0.85" stroke="#fef08a" strokeWidth="1.3" strokeLinejoin="round" />
            <circle cx="32" cy="15" r="3.5" fill="#fef08a" />
          </g>
        );
    }
  };

  return (
    <div
      className={`${className} rounded-2xl border flex items-center justify-center shadow-lg relative overflow-hidden`}
      style={{
        borderColor: `${meta.ring}66`,
        background: `radial-gradient(circle at 35% 25%, ${meta.bgTop}, ${meta.bgBot})`,
      }}
    >
      <svg viewBox="0 0 64 64" className="w-[86%] h-[86%] drop-shadow-[0_3px_8px_rgba(0,0,0,0.75)]" fill="none">
        <defs>
          <linearGradient id={`gAccent_${uid}`} x1="14" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="50%" stopColor={meta.glow} />
            <stop offset="100%" stopColor={meta.ring} />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="26" stroke={meta.ring} strokeOpacity="0.28" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="22" stroke={meta.glow} strokeOpacity="0.16" strokeWidth="1" strokeDasharray="3 3" />
        {renderGlyph()}
      </svg>
    </div>
  );
};

