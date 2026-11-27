import React, { useId } from 'react';
import { DuckAuraId, DuckGearId, DuckSkinId, EggItemType, GodPatronId, Rarity } from '../../types/game';
import { getDragonArtworkUrl } from '../../data/gameData';
import { clampCustomLevel, getStarTierMeta } from '../../utils/economyEngine';

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

export const DragonIllustration: React.FC<{
  skin: DuckSkinId;
  rarity?: Rarity;
  className?: string;
  isPressed?: boolean;
  mood?: 'idle' | 'fever' | 'battle' | 'hurt';
  level?: number;
  customLevel?: number;
  showEvolutionEffects?: boolean;
  gear?: DuckGearId;
  aura?: DuckAuraId;
  staked?: boolean;
  motionEnabled?: boolean;
}> = React.memo(({
  skin,
  rarity,
  className = 'w-44 h-44',
  isPressed = false,
  level,
  customLevel = 0,
  showEvolutionEffects = false,
}) => {
  const lv = Math.max(1, Math.min(5, level ?? 3));
  const cLv = clampCustomLevel(customLevel);
  const starMeta = getStarTierMeta(cLv);

  const levelScale =
    level === undefined
      ? ''
      : lv === 1
        ? 'scale-[0.88]'
        : lv === 2
          ? 'scale-[0.91]'
          : lv === 3
            ? 'scale-[0.94]'
            : lv === 4
              ? 'scale-[0.97]'
              : 'scale-100';

  const artworkUrl = getDragonArtworkUrl(skin, rarity);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className} ${
        isPressed ? 'brightness-110' : ''
      }`}
    >
      <img
        src={artworkUrl}
        alt={skin}
        draggable={false}
        decoding="async"
        className={`relative z-10 w-full h-full object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.85)] pointer-events-none ${levelScale}`}
      />

      {showEvolutionEffects && cLv > 0 && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-1 right-1 z-20 px-1.5 h-5 rounded-full font-mono-num text-[9px] font-black flex items-center justify-center shadow-md ${starMeta.badgeClass}`}
        >
          ★{cLv}
        </span>
      )}

      {showEvolutionEffects && cLv >= 10 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-1 z-20 px-1.5 h-5 rounded-full bg-amber-400/95 text-slate-950 font-mono-num text-[9px] font-black flex items-center justify-center shadow-md"
        >
          AMF
        </span>
      )}
    </div>
  );
});
DragonIllustration.displayName = 'DragonIllustration';

// Keep DuckIllustration export alias for backwards compatibility across components
export const DuckIllustration = DragonIllustration;

export const ItemIcon: React.FC<{ item: EggItemType; className?: string }> = React.memo(({
  item,
  className = 'w-10 h-10',
}) => {
  const uid = useId().replace(/:/g, '');

  if (item === 'chest') {
    return (
      <div className={`relative flex items-center justify-center pointer-events-none ${className}`}>
        <img
          src="/assets/aistudio/1795778001605_d02a7aff.png"
          alt="chest"
          draggable={false}
          decoding="async"
          className="w-full h-full object-contain rounded-lg select-none"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (item === 'grapes') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <defs>
          <radialGradient id={`gemCore_${uid}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f5d0fe" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#581c87" />
          </radialGradient>
        </defs>
        <ellipse cx="24" cy="42" rx="11" ry="2.5" fill="#020617" fillOpacity="0.45" />
        <path d="M24 6L36 17L31 37L24 41L17 37L12 17L24 6Z" fill={`url(#gemCore_${uid})`} stroke="#1e1b4b" strokeWidth="2" strokeLinejoin="round" />
        <path d="M24 6L28 19L24 41L20 19L24 6Z" fill="#f3e8ff" fillOpacity="0.28" />
        <path d="M12 17H36M17 37L24 27L31 37" stroke="#f5d0fe" strokeOpacity="0.65" strokeWidth="1.4" />
        <circle cx="20" cy="14" r="2.1" fill="#ffffff" fillOpacity="0.7" />
      </svg>
    );
  }

  if (item === 'chalice') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <defs>
          <linearGradient id={`chaliceGold_${uid}`} x1="12" y1="8" x2="36" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="45%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <ellipse cx="24" cy="43" rx="12" ry="2.5" fill="#020617" fillOpacity="0.45" />
        <path d="M11 14C7 14 6 19 10 21L15 22" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <path d="M37 14C41 14 42 19 38 21L33 22" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <path d="M13 10H35L31.5 24C30.3 28.5 27.4 30.5 24 30.5C20.6 30.5 17.7 28.5 16.5 24L13 10Z" fill={`url(#chaliceGold_${uid})`} stroke="#451a03" strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="24" cy="10.5" rx="10" ry="2.5" fill="#38bdf8" stroke="#fef08a" strokeWidth="1.2" />
        <rect x="21" y="30.5" width="6" height="8" rx="1.5" fill="#d97706" stroke="#451a03" strokeWidth="1.5" />
        <rect x="15" y="38" width="18" height="4.5" rx="2.2" fill={`url(#chaliceGold_${uid})`} stroke="#451a03" strokeWidth="1.6" />
        <path d="M24 16L27.5 20.5L24 25L20.5 20.5L24 16Z" fill="#ef4444" stroke="#fef2f2" strokeWidth="1" />
      </svg>
    );
  }

  if (item === 'cornucopia') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <defs>
          <linearGradient id={`hornGold_${uid}`} x1="10" y1="12" x2="40" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="55%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
        </defs>
        <ellipse cx="24" cy="41" rx="14" ry="2.6" fill="#020617" fillOpacity="0.45" />
        <path d="M9 32C11 16 25 9 41 14C37 22 33 34 14 37L9 32Z" fill={`url(#hornGold_${uid})`} stroke="#451a03" strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 17C22 21 25 27 25 33M26 14C30 18 32 23 32 28" stroke="#78350f" strokeWidth="1.5" strokeOpacity="0.7" />
        <circle cx="15.5" cy="30" r="4.2" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.2" />
        <circle cx="21.5" cy="24.5" r="4.2" fill="#22c55e" stroke="#14532d" strokeWidth="1.2" />
        <circle cx="26" cy="30.5" r="4" fill="#a855f7" stroke="#3b0764" strokeWidth="1.2" />
        <circle cx="30" cy="21" r="3.6" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="1.2" />
        <circle cx="14.2" cy="28.7" r="1.2" fill="#ffffff" fillOpacity="0.7" />
        <circle cx="20.2" cy="23.2" r="1.2" fill="#ffffff" fillOpacity="0.7" />
      </svg>
    );
  }

  if (item === 'feast') {
    return (
      <svg viewBox="0 0 48 48" className={className} fill="none">
        <defs>
          <linearGradient id={`feastPlatter_${uid}`} x1="8" y1="18" x2="40" y2="39" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <radialGradient id={`feastDome_${uid}`} cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="65%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </radialGradient>
        </defs>
        <ellipse cx="24" cy="41" rx="17" ry="3" fill="#020617" fillOpacity="0.5" />
        <ellipse cx="24" cy="34" rx="18" ry="6" fill={`url(#feastPlatter_${uid})`} stroke="#78350f" strokeWidth="2" />
        <path d="M11 32C11 19 37 19 37 32H11Z" fill={`url(#feastDome_${uid})`} stroke="#fef08a" strokeWidth="1.6" />
        <path d="M17 24L24 14L31 24" fill="#fde047" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="24" cy="14" r="3.2" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.2" />
        <circle cx="16" cy="29" r="2.4" fill="#4ade80" />
        <circle cx="32" cy="29" r="2.4" fill="#a855f7" />
      </svg>
    );
  }

  // Realistic uploaded dragon eggs corresponding to levels 1 to 10
  const eggImageMap: Record<EggItemType | string, string> = {
    egg_1: '/assets/aistudio/______1_ac8c3a4b.png',
    egg_2: '/assets/aistudio/______2_7920b14a.png',
    egg_3: '/assets/aistudio/______3_1bfdf18c.png',
    egg_4: '/assets/aistudio/______4_7306ebbc.png',
    egg_5: '/assets/aistudio/______5_44e2ce61.png',
    egg_6: '/assets/aistudio/______6_6e9d0b02.png',
    egg_7: '/assets/aistudio/_____7_11454792.png',
    egg_8: '/assets/aistudio/_____8_123db32c.png',
    egg_9: '/assets/aistudio/_____9_4897743e.png',
    egg_10: '/assets/aistudio/_____10_56b25baa.png',
    egg_love: '/assets/aistudio/_____10_56b25baa.png',
  };

  const imgSrc = eggImageMap[item] ?? '/assets/aistudio/______1_ac8c3a4b.png';

  return (
    <div className={`relative flex items-center justify-center pointer-events-none ${className}`}>
      <img
        src={imgSrc}
        alt={item}
        draggable={false}
        decoding="async"
        className="w-full h-full object-contain select-none"
        referrerPolicy="no-referrer"
      />
    </div>
  );
});

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

