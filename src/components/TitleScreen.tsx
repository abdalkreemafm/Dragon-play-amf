import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Play, RotateCcw } from 'lucide-react';
import { DragonIllustration, CornIcon, StarIcon, DmdIcon } from './art/DuckArt';
import { SanctuaryBackdrop } from './art/SceneBackdrops';
import { soundFX } from '../utils/sound';

interface TitleScreenProps {
  hasSavedProgress: boolean;
  savedDmd: number;
  savedDuckCount: number;
  muted: boolean;
  onToggleMute: () => void;
  onStart: () => void;
  onResetNewGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSavedProgress,
  savedDmd,
  savedDuckCount,
  muted,
  onToggleMute,
  onStart,
  onResetNewGame,
}) => {
  const [heroSquash, setHeroSquash] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        soundFX.playGodConfirm();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  const handleHeroTap = () => {
    soundFX.playTapFeed();
    setHeroSquash(true);
    setTimeout(() => setHeroSquash(false), 200);
  };

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-between overflow-hidden bg-[#080a10] text-slate-100 select-none px-6 py-8">
      <SanctuaryBackdrop variant="title" />

      {/* Top minimal utility bar */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="font-mono-num">DRAGON × DMD</span>
          {hasSavedProgress && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-amber-300">
                {savedDmd.toFixed(2)} DMD · {savedDuckCount} تنانين
              </span>
            </>
          )}
        </div>
        <button
          onClick={onToggleMute}
          aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
          className="h-10 w-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-slate-200 hover:border-amber-400/60 transition-colors cursor-pointer backdrop-blur-sm"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-amber-400" />}
        </button>
      </div>

      {/* Hero Centerpiece */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xl my-auto">
        <svg viewBox="0 0 460 88" className="w-full max-w-md mb-2 drop-shadow-[0_8px_24px_rgba(245,197,24,0.28)]">
          <defs>
            <linearGradient id="dragonTitleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
          <text
            x="230"
            y="58"
            textAnchor="middle"
            fill="url(#dragonTitleGrad)"
            stroke="#090d16"
            strokeWidth="6"
            paintOrder="stroke"
            style={{
              fontFamily: "'Outfit', 'Cairo', sans-serif",
              fontWeight: 900,
              fontSize: '42px',
              letterSpacing: '2px',
            }}
          >
            DRAGON × DMD
          </text>
        </svg>

        <p className="text-sm sm:text-base text-slate-300 max-w-md mb-6 leading-relaxed">
          ربِّ التنانين، أطعمها حبوب الطاقة حتى المرحلة 5، خصّصها بالنجوم لتوليد عملة DMD، ونافس في الحلبة!
        </p>

        {/* Interactive Hero Dragon Diorama */}
        <button
          type="button"
          onClick={handleHeroTap}
          className="relative group cursor-pointer focus:outline-none mb-6"
          aria-label="التنين الرئيسي"
        >
          <div className="absolute -inset-8 rounded-full bg-amber-400/15 blur-2xl group-hover:bg-amber-400/25 transition-colors" />
          <div className="relative w-64 h-52 sm:w-72 sm:h-56">
            <div className="relative w-full h-full rounded-[32px] realistic-card border border-amber-400/35 flex items-center justify-center overflow-hidden px-3">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 bottom-4 h-7 rounded-full bg-amber-400/15 blur-md"
              />
              <div className="relative z-10 flex items-end justify-center gap-0">
                <DragonIllustration
                  skin="aqua"
                  level={3}
                  showEvolutionEffects={true}
                  className="w-32 h-32 sm:w-36 sm:h-36 -ml-2"
                  isPressed={heroSquash}
                />
                <DragonIllustration
                  skin="lilac"
                  level={5}
                  customLevel={2}
                  showEvolutionEffects={true}
                  className="w-32 h-32 sm:w-36 sm:h-36 -mr-2"
                  isPressed={heroSquash}
                />
              </div>
              <div className="absolute top-3 left-3 bg-slate-900/95 border border-indigo-400/30 rounded-xl p-1.5 shadow-xl">
                <StarIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="absolute -top-2.5 -right-2.5 z-20 bg-slate-900/95 border border-amber-400/35 rounded-xl p-2 shadow-xl">
              <DmdIcon className="w-6 h-6" />
            </div>
            <div className="absolute -bottom-2.5 -left-2.5 z-20 bg-slate-900/95 border border-emerald-400/35 rounded-xl p-2 shadow-xl">
              <CornIcon className="w-6 h-6" />
            </div>
          </div>
        </button>

        {/* Start Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              soundFX.playGodConfirm();
              onStart();
            }}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 font-extrabold text-lg shadow-[0_8px_28px_rgba(250,204,21,0.35)] hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>{hasSavedProgress ? 'متابعة اللعب' : 'ابدأ اللعب'}</span>
          </button>

          {hasSavedProgress && (
            <button
              onClick={() => {
                soundFX.playTabSwitch();
                onResetNewGame();
              }}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-200 font-bold text-sm hover:border-slate-500 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>لعبة جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Single flat control-hint line */}
      <div className="relative z-10 text-xs sm:text-sm text-slate-400 text-center">
        <span>أطعم التنين بالطاقة</span>
        <span className="mx-2" aria-hidden="true">·</span>
        <span>خصّصه بالنجوم عند المرحلة 5</span>
        <span className="mx-2" aria-hidden="true">·</span>
        <span>Enter للبدء</span>
      </div>
    </div>
  );
};
