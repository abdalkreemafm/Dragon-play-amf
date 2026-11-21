import React, { useId } from 'react';

export const SanctuaryBackdrop: React.FC<{ className?: string; variant?: 'title' | 'stage' }> = ({
  className = '',
  variant = 'stage',
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <radialGradient id={`skyGlow_${uid}`} cx="50%" cy="22%" r="72%">
            <stop offset="0%" stopColor={variant === 'title' ? '#f59e0b' : '#d97706'} stopOpacity="0.22" />
            <stop offset="36%" stopColor="#312e81" stopOpacity="0.16" />
            <stop offset="78%" stopColor="#0b0d14" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#07090e" stopOpacity="1" />
          </radialGradient>
          <linearGradient id={`beam_${uid}`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.24" />
            <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`pillar_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0f131d" />
            <stop offset="35%" stopColor="#1e2436" />
            <stop offset="70%" stopColor="#141824" />
            <stop offset="100%" stopColor="#090b10" />
          </linearGradient>
          <radialGradient id={`pond_${uid}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.18" />
            <stop offset="48%" stopColor="#1e293b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#07090e" stopOpacity="0.95" />
          </radialGradient>
        </defs>

        <rect width="800" height="500" fill={`url(#skyGlow_${uid})`} />

        {/* Volumetric sunbeams */}
        <polygon points="340,0 460,0 590,500 210,500" fill={`url(#beam_${uid})`} />
        <polygon points="180,0 260,0 380,500 80,500" fill={`url(#beam_${uid})`} opacity="0.55" />
        <polygon points="540,0 620,0 720,500 420,500" fill={`url(#beam_${uid})`} opacity="0.5" />

        {/* Distant basalt temple colonnade */}
        <rect x="42" y="45" width="44" height="390" rx="4" fill={`url(#pillar_${uid})`} opacity="0.72" />
        <rect x="34" y="38" width="60" height="16" rx="3" fill="#232a3d" opacity="0.8" />
        <rect x="714" y="45" width="44" height="390" rx="4" fill={`url(#pillar_${uid})`} opacity="0.72" />
        <rect x="706" y="38" width="60" height="16" rx="3" fill="#232a3d" opacity="0.8" />
        <rect x="145" y="95" width="28" height="310" rx="3" fill={`url(#pillar_${uid})`} opacity="0.45" />
        <rect x="627" y="95" width="28" height="310" rx="3" fill={`url(#pillar_${uid})`} opacity="0.45" />

        {/* Brazier flames on left and right pillars */}
        <circle cx="64" cy="185" r="26" fill="#f59e0b" opacity="0.14" />
        <circle cx="64" cy="185" r="9" fill="#fbbf24" opacity="0.5" />
        <circle cx="736" cy="185" r="26" fill="#f59e0b" opacity="0.14" />
        <circle cx="736" cy="185" r="9" fill="#fbbf24" opacity="0.5" />

        {/* Reflective twilight pond & stone dais */}
        <ellipse cx="400" cy="435" rx="360" ry="75" fill={`url(#pond_${uid})`} />
        <ellipse
          cx="400"
          cy="432"
          rx="235"
          ry="34"
          fill="none"
          stroke="#fde68a"
          strokeOpacity="0.16"
          strokeWidth="1.5"
          className="animate-water-shimmer"
        />
        <ellipse cx="400" cy="434" rx="150" ry="20" fill="none" stroke="#f59e0b" strokeOpacity="0.22" strokeWidth="1.2" />
      </svg>

      {/* Atmospheric drifting golden dust motes */}
      <span className="animate-ember absolute top-[22%] left-[24%] w-1.5 h-1.5 rounded-full bg-amber-300/60 blur-[0.5px]" />
      <span
        className="animate-ember absolute top-[35%] right-[22%] w-1 h-1 rounded-full bg-amber-200/70"
        style={{ animationDelay: '1.1s' }}
      />
      <span
        className="animate-ember absolute bottom-[28%] left-[32%] w-1.5 h-1.5 rounded-full bg-orange-300/50 blur-[0.5px]"
        style={{ animationDelay: '2.2s' }}
      />
    </div>
  );
};

export const TempleAltarBackdrop: React.FC<{ isBlitz?: boolean; className?: string }> = ({
  isBlitz = false,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg viewBox="0 0 600 180" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <radialGradient id={`templeBg_${uid}`} cx="50%" cy="15%" r="85%">
            <stop offset="0%" stopColor={isBlitz ? '#f59e0b' : '#7c3aed'} stopOpacity="0.38" />
            <stop offset="52%" stopColor={isBlitz ? '#7c2d12' : '#2e1065'} stopOpacity="0.55" />
            <stop offset="100%" stopColor="#12151f" stopOpacity="0.96" />
          </radialGradient>
          <linearGradient id={`col_${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#4c1d95" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <rect width="600" height="180" fill={`url(#templeBg_${uid})`} />
        {/* Marble Columns */}
        <rect x="18" y="0" width="26" height="180" fill={`url(#col_${uid})`} />
        <rect x="556" y="0" width="26" height="180" fill={`url(#col_${uid})`} />
        <rect x="188" y="0" width="14" height="180" fill={`url(#col_${uid})`} opacity="0.45" />
        <rect x="398" y="0" width="14" height="180" fill={`url(#col_${uid})`} opacity="0.45" />
        {/* Carved Altar Arch */}
        <path
          d="M90 180 Q300 -10 510 180"
          fill="none"
          stroke={isBlitz ? '#fbbf24' : '#a78bfa'}
          strokeOpacity="0.22"
          strokeWidth="2"
        />
        {/* Lantern Glows */}
        <circle cx="110" cy="48" r="28" fill={isBlitz ? '#fbbf24' : '#c084fc'} opacity="0.16" />
        <circle cx="490" cy="48" r="28" fill={isBlitz ? '#fbbf24' : '#c084fc'} opacity="0.16" />
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
            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.22" />
            <stop offset="45%" stopColor="#78350f" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0c0f18" stopOpacity="0.98" />
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
        {/* Dual Volumetric Spotlights */}
        <polygon points="80,0 200,0 290,320 40,320" fill={`url(#spotL_${uid})`} />
        <polygon points="440,0 560,0 600,320 350,320" fill={`url(#spotR_${uid})`} />
        {/* Basalt Colosseum Ring */}
        <ellipse cx="320" cy="275" rx="285" ry="52" fill="#090b11" stroke="#f59e0b" strokeOpacity="0.2" strokeWidth="2" />
        <ellipse cx="320" cy="275" rx="210" ry="32" fill="none" stroke="#94a3b8" strokeOpacity="0.12" strokeWidth="1.5" />
      </svg>
    </div>
  );
};
