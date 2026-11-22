import React, { useId } from 'react';
import { clampCustomLevel, getStarTierMeta } from '../../utils/economyEngine';

export interface SanctuaryBackdropProps {
  className?: string;
  variant?: 'title' | 'stage';
  evolutionLevel?: number;
  customLevel?: number;
  element?: 'frost' | 'storm' | 'ember';
  isFever?: boolean;
}

export const SanctuaryBackdrop: React.FC<SanctuaryBackdropProps> = ({
  className = '',
  variant = 'stage',
  evolutionLevel = 1,
  customLevel = 0,
  element = 'ember',
  isFever = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const lv = Math.max(1, Math.min(5, evolutionLevel));
  const cLv = clampCustomLevel(customLevel);
  const starMeta = getStarTierMeta(cLv);

  const primaryGlow = isFever
    ? '#f43f5e'
    : cLv >= 2
      ? starMeta.auraColorHex
      : element === 'frost'
        ? '#38bdf8'
        : element === 'storm'
          ? '#60a5fa'
          : variant === 'title'
            ? '#f59e0b'
            : '#d97706';

  const secondaryGlow =
    element === 'frost'
      ? '#0c4a6e'
      : element === 'storm'
        ? '#1e1b4b'
        : cLv >= 6
          ? '#78350f'
          : '#312e81';

  const beamOpacity = Math.min(0.42, 0.16 + lv * 0.03 + (cLv >= 4 ? 0.08 : 0) + (isFever ? 0.08 : 0));
  const showInnerRunes = lv >= 3 || cLv >= 2;
  const showGrandHalo = lv >= 5 || cLv >= 6;

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <radialGradient id={`skyGlow_${uid}`} cx="50%" cy="24%" r="74%">
            <stop offset="0%" stopColor={primaryGlow} stopOpacity={variant === 'title' ? 0.34 : 0.25 + lv * 0.02} />
            <stop offset="38%" stopColor={secondaryGlow} stopOpacity="0.24" />
            <stop offset="78%" stopColor="#090c14" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#05070c" stopOpacity="1" />
          </radialGradient>
          <linearGradient id={`beam_${uid}`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={primaryGlow} stopOpacity={beamOpacity} />
            <stop offset="65%" stopColor={primaryGlow} stopOpacity="0.06" />
            <stop offset="100%" stopColor={primaryGlow} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`pillar_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0b0f18" />
            <stop offset="38%" stopColor="#1e2639" />
            <stop offset="72%" stopColor="#121724" />
            <stop offset="100%" stopColor="#07090f" />
          </linearGradient>
          <radialGradient id={`pond_${uid}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor={primaryGlow} stopOpacity={0.18 + (cLv >= 10 ? 0.1 : 0)} />
            <stop offset="48%" stopColor="#1e293b" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#06080e" stopOpacity="0.96" />
          </radialGradient>
        </defs>

        <rect width="800" height="500" fill={`url(#skyGlow_${uid})`} />

        {/* Distant jagged mountain silhouette behind the dragon sanctum */}
        <path
          d="M0 440 L95 310 L180 355 L285 245 L395 315 L505 230 L615 340 L710 280 L800 410 L800 500 L0 500 Z"
          fill="#0b101b"
          opacity="0.85"
        />

        {/* Volumetric sanctum light shafts */}
        <polygon points="340,0 460,0 590,500 210,500" fill={`url(#beam_${uid})`} />
        <polygon points="180,0 260,0 380,500 80,500" fill={`url(#beam_${uid})`} opacity="0.55" />
        <polygon points="540,0 620,0 720,500 420,500" fill={`url(#beam_${uid})`} opacity="0.5" />

        {/* Evolution & Star-Tier Sacred Dragon Rune Mandala behind stage */}
        {showInnerRunes && (
          <g opacity={cLv >= 75 ? 0.34 : cLv >= 25 ? 0.24 : 0.16}>
            <circle cx="400" cy="235" r="142" fill="none" stroke={primaryGlow} strokeWidth="1.2" strokeDasharray="8 6" />
            <circle cx="400" cy="235" r="112" fill="none" stroke={primaryGlow} strokeWidth="0.9" />
            <polygon
              points="400,104 514,300 286,300"
              fill="none"
              stroke={primaryGlow}
              strokeWidth="0.9"
              opacity="0.7"
            />
          </g>
        )}

        {showGrandHalo && (
          <g opacity={cLv >= 100 ? 0.45 : 0.28}>
            <circle cx="400" cy="235" r="176" fill="none" stroke={primaryGlow} strokeWidth="1.4" strokeDasharray="3 10" />
            <polygon
              points="400,366 514,170 286,170"
              fill="none"
              stroke={primaryGlow}
              strokeWidth="0.9"
              opacity="0.6"
            />
          </g>
        )}

        {/* Distant basalt temple colonnade */}
        <rect x="42" y="45" width="44" height="390" rx="4" fill={`url(#pillar_${uid})`} opacity="0.78" />
        <rect x="34" y="38" width="60" height="16" rx="3" fill="#232a3d" opacity="0.85" />
        <rect x="714" y="45" width="44" height="390" rx="4" fill={`url(#pillar_${uid})`} opacity="0.78" />
        <rect x="706" y="38" width="60" height="16" rx="3" fill="#232a3d" opacity="0.85" />
        <rect x="145" y="95" width="28" height="310" rx="3" fill={`url(#pillar_${uid})`} opacity="0.48" />
        <rect x="627" y="95" width="28" height="310" rx="3" fill={`url(#pillar_${uid})`} opacity="0.48" />

        {/* Brazier flames on left and right pillars scaling with evolution */}
        <circle cx="64" cy="185" r={22 + lv * 3} fill={primaryGlow} opacity={0.14 + lv * 0.02} />
        <circle cx="64" cy="185" r="9" fill={primaryGlow} opacity="0.65" />
        <circle cx="736" cy="185" r={22 + lv * 3} fill={primaryGlow} opacity={0.14 + lv * 0.02} />
        <circle cx="736" cy="185" r="9" fill={primaryGlow} opacity="0.65" />

        {/* Reflective twilight pond & stone dais */}
        <ellipse cx="400" cy="435" rx="360" ry="75" fill={`url(#pond_${uid})`} />
        <ellipse
          cx="400"
          cy="432"
          rx="235"
          ry="34"
          fill="none"
          stroke={primaryGlow}
          strokeOpacity="0.22"
          strokeWidth="1.5"
          className="animate-water-shimmer"
        />
        <ellipse
          cx="400"
          cy="434"
          rx="150"
          ry="20"
          fill="none"
          stroke={primaryGlow}
          strokeOpacity={0.22 + (cLv >= 10 ? 0.16 : 0)}
          strokeWidth="1.4"
        />
      </svg>

      {/* Atmospheric drifting ember / frost motes */}
      <span
        className="animate-ember absolute top-[22%] left-[24%] w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: primaryGlow, opacity: 0.65 }}
      />
      <span
        className="animate-ember absolute top-[35%] right-[22%] w-1 h-1 rounded-full"
        style={{ backgroundColor: primaryGlow, opacity: 0.72, animationDelay: '1.1s' }}
      />
      <span
        className="animate-ember absolute bottom-[28%] left-[32%] w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: primaryGlow, opacity: 0.55, animationDelay: '2.2s' }}
      />
    </div>
  );
};

export const TempleAltarBackdrop: React.FC<{ isBlitz?: boolean; className?: string }> = ({
  isBlitz = false,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const accent = isBlitz ? '#fbbf24' : '#a78bfa';
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg viewBox="0 0 600 180" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <radialGradient id={`templeBg_${uid}`} cx="50%" cy="15%" r="85%">
            <stop offset="0%" stopColor={isBlitz ? '#f59e0b' : '#7c3aed'} stopOpacity="0.42" />
            <stop offset="52%" stopColor={isBlitz ? '#7c2d12' : '#2e1065'} stopOpacity="0.58" />
            <stop offset="100%" stopColor="#0f131d" stopOpacity="0.98" />
          </radialGradient>
          <linearGradient id={`col_${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.68" />
            <stop offset="50%" stopColor="#4c1d95" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.86" />
          </linearGradient>
        </defs>
        <rect width="600" height="180" fill={`url(#templeBg_${uid})`} />
        <rect x="18" y="0" width="26" height="180" fill={`url(#col_${uid})`} />
        <rect x="556" y="0" width="26" height="180" fill={`url(#col_${uid})`} />
        <rect x="188" y="0" width="14" height="180" fill={`url(#col_${uid})`} opacity="0.48" />
        <rect x="398" y="0" width="14" height="180" fill={`url(#col_${uid})`} opacity="0.48" />
        {/* Dragon Altar Rune Ring */}
        <circle cx="300" cy="96" r="64" fill="none" stroke={accent} strokeOpacity="0.2" strokeWidth="1.3" strokeDasharray="6 4" />
        <path
          d="M90 180 Q300 -10 510 180"
          fill="none"
          stroke={accent}
          strokeOpacity="0.26"
          strokeWidth="2"
        />
        <circle cx="110" cy="48" r="28" fill={isBlitz ? '#fbbf24' : '#c084fc'} opacity="0.18" />
        <circle cx="490" cy="48" r="28" fill={isBlitz ? '#fbbf24' : '#c084fc'} opacity="0.18" />
      </svg>
    </div>
  );
};

export const ColosseumBackdrop: React.FC<{ className?: string }> = ({ className = '' }) => {
  const uid = useId().replace(/:/g, '');
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg viewBox="0 0 640 320" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <radialGradient id={`arenaGlow_${uid}`} cx="50%" cy="25%" r="80%">
            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.24" />
            <stop offset="45%" stopColor="#78350f" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0a0d16" stopOpacity="0.98" />
          </radialGradient>
          <linearGradient id={`spotL_${uid}`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`spotR_${uid}`} x1="1" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="640" height="320" fill={`url(#arenaGlow_${uid})`} />
        {/* Colosseum tiered stone arches */}
        <path
          d="M25 245 Q120 155 320 150 Q520 155 615 245"
          fill="none"
          stroke="#475569"
          strokeOpacity="0.26"
          strokeWidth="2"
        />
        <polygon points="80,0 200,0 290,320 40,320" fill={`url(#spotL_${uid})`} />
        <polygon points="440,0 560,0 600,320 350,320" fill={`url(#spotR_${uid})`} />
        {/* Basalt Colosseum Ring */}
        <ellipse cx="320" cy="275" rx="285" ry="52" fill="#090b11" stroke="#f59e0b" strokeOpacity="0.25" strokeWidth="2" />
        <ellipse cx="320" cy="275" rx="210" ry="32" fill="none" stroke="#94a3b8" strokeOpacity="0.16" strokeWidth="1.5" />
      </svg>
    </div>
  );
};
