import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Play, ShieldCheck, UserCheck } from 'lucide-react';
import { DragonIllustration, CornIcon, StarIcon, DmdIcon } from './art/DuckArt';
import { SanctuaryBackdrop } from './art/SceneBackdrops';
import { soundFX } from '../utils/sound';

interface TitleScreenProps {
  username: string;
  isTelegramVerified?: boolean;
  hasSavedProgress: boolean;
  savedDmd: number;
  savedDuckCount: number;
  muted: boolean;
  onToggleMute: () => void;
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  username,
  isTelegramVerified = false,
  hasSavedProgress,
  savedDmd,
  savedDuckCount,
  muted,
  onToggleMute,
  onStart,
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
    <div className="relative h-full w-full flex flex-col items-center justify-between overflow-y-auto bg-[#080a10] text-slate-100 select-none px-6 py-8 pt-safe pb-safe">
      <SanctuaryBackdrop variant="title" evolutionLevel={5} customLevel={50} />

      {/* Top minimal utility bar */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between shrink-0">
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
          className="h-11 w-11 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center text-slate-200 hover:border-amber-400/60 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-amber-400" />}
        </button>
      </div>

      {/* Hero Centerpiece */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xl my-auto py-4">
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

        <p className="text-sm sm:text-base text-slate-300 max-w-md mb-5 leading-relaxed">
          ربِّ التنانين، أطعمها حبوب الطاقة حتى المرحلة 5، خصّصها بالنجوم لتوليد عملة DMD، ونافس في الحلبة!
        </p>

        {/* Interactive Hero Dragon Diorama */}
        <button
          type="button"
          onClick={handleHeroTap}
          className="relative group cursor-pointer focus:outline-none mb-5"
          aria-label="التنين الرئيسي"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.22)_0%,transparent_72%)]"
          />
          <div className="relative w-64 h-52 sm:w-72 sm:h-56">
            <div className="relative w-full h-full rounded-[32px] realistic-card border border-amber-400/35 flex items-center justify-center overflow-hidden px-3">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 bottom-3 h-7 rounded-full bg-[radial-gradient(ellipse,rgba(251,191,36,0.22)_0%,transparent_75%)]"
              />
              <div className="relative z-10 flex items-end justify-center gap-1">
                <DragonIllustration
                  skin="aqua"
                  level={3}
                  customLevel={10}
                  showEvolutionEffects={true}
                  className="w-28 h-28 sm:w-32 sm:h-32 scale-x-[-1]"
                  isPressed={heroSquash}
                />
                <DragonIllustration
                  skin="lilac"
                  level={5}
                  customLevel={50}
                  gear="crown"
                  aura="gold"
                  showEvolutionEffects={true}
                  className="w-28 h-28 sm:w-32 sm:h-32"
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

        {/* Identity Verification & Saved Data Card */}
        <div className="w-full max-w-sm rounded-2xl bg-slate-900/85 border border-emerald-500/30 px-4 py-3 mb-4 flex items-center justify-between gap-3 text-right shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
              {isTelegramVerified ? <ShieldCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white truncate">@{username}</div>
              <div className="text-[11px] font-bold text-emerald-300">
                {isTelegramVerified ? 'هوية تيليجرام مؤكدة ✓' : 'ملف الحفظ التلقائي للمتصفح ✓'}
              </div>
            </div>
          </div>
          <div className="text-left shrink-0">
            <div className="text-[11px] font-mono-num font-extrabold text-amber-300">
              {savedDmd.toFixed(2)} DMD
            </div>
            <div className="text-[10px] font-bold text-slate-400">
              {savedDuckCount} تنانين محفوظة
            </div>
          </div>
        </div>

        {/* Single Safe Entry Action */}
        <div className="flex items-center justify-center w-full">
          <button
            onClick={() => {
              soundFX.unlock();
              soundFX.playGodConfirm();
              onStart();
            }}
            className="flex items-center justify-center gap-2.5 w-full max-w-xs px-8 py-4 rounded-2xl bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 font-black text-lg shadow-[0_8px_28px_rgba(250,204,21,0.35)] hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>{hasSavedProgress ? 'متابعة اللعب' : 'دخول اللعبة'}</span>
          </button>
        </div>
      </div>

      {/* Single flat control-hint line */}
      <div className="relative z-10 text-xs sm:text-sm text-slate-400 text-center shrink-0">
        <span>أطعم التنين بالطاقة</span>
        <span className="mx-2" aria-hidden="true">·</span>
        <span>خصّصه بالنجوم عند المرحلة 5</span>
        <span className="mx-2" aria-hidden="true">·</span>
        <span>تقدمك محفوظ تلقائياً</span>
      </div>
    </div>
  );
};
