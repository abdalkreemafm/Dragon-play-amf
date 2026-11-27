import React, { useState } from 'react';
import {
  Crown,
  Globe,
  KeyRound,
  Lock,
  RefreshCw,
  Sliders,
  Users,
} from 'lucide-react';
import {
  AllianceEmblemId,
  AllianceJoinConditions,
  AllianceVisibility,
  GameState,
  RealAllianceDirectoryItem,
} from '../../../types/game';
import { ALLIANCE_EMBLEM_CATALOG, createInitialJoinConditions } from '../../../utils/economyEngine';
import { soundFX } from '../../../utils/sound';
import { SectionCard, SectionHeader } from '../../ui/SectionCard';
import { renderEmblemGlyph } from './AllianceHelpers';

interface AllianceDirectoryPanelProps {
  state: GameState;
  allianceDirectory: RealAllianceDirectoryItem[];
  isOnlineAuthed: boolean;
  playerTotalPower: number;
  maxPlayerDragonLevel: number;
  onCreateAlliance?: (data: {
    packName: string;
    motto: string;
    emblemId: AllianceEmblemId;
    visibility?: AllianceVisibility;
    joinConditions: AllianceJoinConditions;
  }) => Promise<boolean | void> | void;
  onJoinAllianceById?: (allianceId: string, inviteCode?: string) => Promise<boolean | void> | void;
  onJoinAllianceByCode?: (inviteCode: string) => Promise<boolean | void> | void;
  onJoinPack: () => void;
  onRefreshAlliances?: () => void;
}

export const AllianceDirectoryPanel: React.FC<AllianceDirectoryPanelProps> = ({
  state,
  allianceDirectory,
  playerTotalPower,
  maxPlayerDragonLevel,
  onCreateAlliance,
  onJoinAllianceById,
  onJoinAllianceByCode,
  onJoinPack,
  onRefreshAlliances,
}) => {
  const [createPackName, setCreatePackName] = useState('');
  const [createMotto, setCreateMotto] = useState('وحدة التنانين تفتح أبواب المجد وعرش AMF');
  const [createEmblem, setCreateEmblem] = useState<AllianceEmblemId>('dragon_shield');
  const [createVisibility, setCreateVisibility] = useState<AllianceVisibility>('PUBLIC');
  const [createConditions, setCreateConditions] = useState<AllianceJoinConditions>(() =>
    createInitialJoinConditions()
  );
  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [allianceSearch, setAllianceSearch] = useState('');
  const [creatingMode, setCreatingMode] = useState<AllianceVisibility | null>(null);
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [joiningAllianceId, setJoiningAllianceId] = useState<string | null>(null);

  const q = allianceSearch.trim().toLowerCase();
  const filteredAlliances = allianceDirectory.filter(
    (a) =>
      !q ||
      a.packName.toLowerCase().includes(q) ||
      a.leaderName.toLowerCase().includes(q) ||
      a.motto.toLowerCase().includes(q)
  );

  const handleCreateWithVisibility = async (visibility: AllianceVisibility) => {
    if (createPackName.trim().length < 3 || creatingMode) return;
    setCreateVisibility(visibility);
    soundFX.playGodConfirm();
    if (onCreateAlliance) {
      setCreatingMode(visibility);
      try {
        await onCreateAlliance({
          packName: createPackName.trim(),
          motto: createMotto.trim(),
          emblemId: createEmblem,
          visibility,
          joinConditions: createConditions,
        });
      } finally {
        setCreatingMode(null);
      }
    } else {
      onJoinPack();
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Create Real Alliance Card (Public or Secret) */}
      <SectionCard accent="amber" className="space-y-3 shadow-xl">
        <SectionHeader
          title="تأسيس سرب جديد"
          icon={<Crown className="w-4 h-4 text-amber-400" />}
          action={
            <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/45 text-[10px] font-black text-emerald-300 shrink-0 font-mono-num">
              +240🍖 مكافأة تأسيس
            </span>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-[11px] font-black text-slate-300">اسم السرب (3 إلى 28 حرفاً)</span>
            <input
              type="text"
              maxLength={28}
              value={createPackName}
              onChange={(e) => setCreatePackName(e.target.value)}
              placeholder="مثال: فرسان التنين الذهبي"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-black text-slate-300">شعار ووصف السرب</span>
            <input
              type="text"
              maxLength={72}
              value={createMotto}
              onChange={(e) => setCreateMotto(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </label>
        </div>

        {/* Visibility Preview Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCreateVisibility('PUBLIC')}
            className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
              createVisibility === 'PUBLIC'
                ? 'bg-sky-500/15 border-sky-400 text-white'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-black">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>سرب عام</span>
            </div>
            <div className="text-[9.5px] text-slate-400 mt-0.5">
              يظهر في القائمة لجميع اللاعبين
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCreateVisibility('SECRET')}
            className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
              createVisibility === 'SECRET'
                ? 'bg-purple-500/20 border-purple-400 text-white'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-black">
              <Lock className="w-3.5 h-3.5 text-purple-300" />
              <span>سرب سري</span>
            </div>
            <div className="text-[9.5px] text-slate-400 mt-0.5">
              مخفي من القائمة · دخول برمز الدعوة فقط
            </div>
          </button>
        </div>

        {/* Emblem Selector */}
        <div className="space-y-1">
          <div className="text-[11px] font-black text-slate-300">راية السرب:</div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {ALLIANCE_EMBLEM_CATALOG.map((emb) => {
              const selected = createEmblem === emb.id;
              return (
                <button
                  key={emb.id}
                  type="button"
                  onClick={() => {
                    soundFX.playTapFeed();
                    setCreateEmblem(emb.id);
                  }}
                  title={emb.nameAr}
                  className={`rounded-xl p-1.5 border flex items-center justify-center cursor-pointer transition-all ${
                    selected
                      ? 'bg-amber-400/20 border-amber-400 ring-1 ring-amber-300'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${emb.bgGradient} border ${emb.borderClass} flex items-center justify-center`}
                  >
                    {renderEmblemGlyph(emb.id, `w-4 h-4 ${emb.iconColorClass}`)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Join Conditions for new alliance */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-black text-amber-300 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              <span>شروط الانضمام المطلوبة</span>
            </span>
            <button
              type="button"
              onClick={() =>
                setCreateConditions((p) => ({ ...p, autoAccept: !p.autoAccept }))
              }
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer ${
                createConditions.autoAccept
                  ? 'bg-emerald-500/25 border border-emerald-400/60 text-emerald-200'
                  : 'bg-slate-800 border border-slate-700 text-slate-300'
              }`}
            >
              {createConditions.autoAccept ? 'قبول فوري: مفعّل' : 'قبول فوري: يدوي'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-0.5">
              <span className="text-[9.5px] text-slate-400 font-bold block">أقل قوة</span>
              <input
                type="number"
                min={100}
                max={50000}
                step={50}
                value={createConditions.minPower}
                onChange={(e) =>
                  setCreateConditions((p) => ({
                    ...p,
                    minPower: Math.max(100, Number(e.target.value) || 100),
                  }))
                }
                className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-num"
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-[9.5px] text-slate-400 font-bold block">عدد التنانين</span>
              <input
                type="number"
                min={1}
                max={8}
                value={createConditions.minDragons}
                onChange={(e) =>
                  setCreateConditions((p) => ({
                    ...p,
                    minDragons: Math.max(1, Math.min(8, Number(e.target.value) || 1)),
                  }))
                }
                className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-num"
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-[9.5px] text-slate-400 font-bold block">مستوى التنين</span>
              <input
                type="number"
                min={1}
                max={5}
                value={createConditions.minDragonLevel}
                onChange={(e) =>
                  setCreateConditions((p) => ({
                    ...p,
                    minDragonLevel: Math.max(1, Math.min(5, Number(e.target.value) || 1)),
                  }))
                }
                className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono-num"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={creatingMode !== null || createPackName.trim().length < 3}
            onClick={() => void handleCreateWithVisibility('PUBLIC')}
            className={`py-3 px-3 rounded-2xl font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-1.5 ${
              createPackName.trim().length >= 3 && creatingMode === null
                ? 'bg-gradient-to-b from-[#facc15] to-[#eab308] text-slate-950 hover:brightness-105 active:scale-95 cursor-pointer'
                : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>{creatingMode === 'PUBLIC' ? 'جاري الإنشاء...' : 'إنشاء سرب عام 👑'}</span>
          </button>

          <button
            type="button"
            disabled={creatingMode !== null || createPackName.trim().length < 3}
            onClick={() => void handleCreateWithVisibility('SECRET')}
            className={`py-3 px-3 rounded-2xl font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-1.5 ${
              createPackName.trim().length >= 3 && creatingMode === null
                ? 'bg-gradient-to-b from-purple-500 to-indigo-600 text-white hover:brightness-110 active:scale-95 cursor-pointer border border-purple-300/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>{creatingMode === 'SECRET' ? 'جاري الإنشاء السري...' : 'إنشاء سرب سري 🔒'}</span>
          </button>
        </div>
      </SectionCard>

      {/* 2. Join Secret Swarm by Invite Code */}
      <SectionCard className="space-y-2.5 border-purple-500/35 bg-gradient-to-b from-[#1a1529] to-[#141724]">
        <SectionHeader
          title="انضمام إلى سرب سري برمز الدعوة"
          subtitle="إذا وصلك رمز دعوة سري (مثل DRG-XXXXXX)، أدخله هنا للانضمام المباشر."
          icon={<KeyRound className="w-4 h-4 text-purple-300" />}
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            maxLength={16}
            value={secretCodeInput}
            onChange={(e) => setSecretCodeInput(e.target.value.toUpperCase())}
            placeholder="أدخل رمز السرب السري (مثال: DRG-A1B2C3)"
            className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-purple-500/40 text-xs text-white font-mono-num font-bold tracking-wider uppercase focus:outline-none focus:border-purple-300"
          />
          <button
            type="button"
            disabled={joiningByCode || secretCodeInput.trim().length < 4}
            onClick={async () => {
              const code = secretCodeInput.trim().toUpperCase();
              if (!code || joiningByCode) return;
              soundFX.playGodConfirm();
              if (onJoinAllianceByCode) {
                setJoiningByCode(true);
                try {
                  await onJoinAllianceByCode(code);
                } finally {
                  setJoiningByCode(false);
                }
              } else {
                onJoinPack();
              }
            }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shrink-0 ${
              secretCodeInput.trim().length >= 4 && !joiningByCode
                ? 'bg-purple-500 hover:bg-purple-400 text-white cursor-pointer shadow'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{joiningByCode ? 'جاري التحقق...' : 'انضمام برمز سري 🔑'}</span>
          </button>
        </div>
      </SectionCard>

      {/* 3. Real Public Alliances Directory from Database */}
      <SectionCard className="space-y-3 shadow-xl">
        <SectionHeader
          title={`قاعدة بيانات الأسراب العامة (${allianceDirectory.length})`}
          subtitle="جميع الأسراب العامة المحفوظة على الخادم تظهر هنا مع قوتها وأعضائها مباشرة."
          icon={<Users className="w-4 h-4 text-sky-400" />}
          action={
            onRefreshAlliances ? (
              <button
                type="button"
                onClick={() => {
                  soundFX.playTapFeed();
                  onRefreshAlliances();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-[10.5px] font-black text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>تحديث القائمة</span>
              </button>
            ) : undefined
          }
        />

        <input
          type="text"
          value={allianceSearch}
          onChange={(e) => setAllianceSearch(e.target.value)}
          placeholder="ابحث باسم السرب أو القائد..."
          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400"
        />

        {filteredAlliances.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-center space-y-1">
            <div className="text-xs font-black text-slate-200">
              {allianceDirectory.length === 0
                ? 'لا توجد أسراب عامة منشأة بعد في قاعدة البيانات'
                : 'لا توجد نتائج مطابقة للبحث'}
            </div>
            <div className="text-[10.5px] text-slate-400">
              أنشئ أول سرب عام أو سرب سري بالأعلى وشارك الرمز مع أصدقائك!
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
            {filteredAlliances.map((a) => {
              const emb =
                ALLIANCE_EMBLEM_CATALOG.find((e) => e.id === a.emblemId) ??
                ALLIANCE_EMBLEM_CATALOG[0];
              const okPower = playerTotalPower >= a.joinConditions.minPower;
              const okDragons = state.ducks.length >= a.joinConditions.minDragons;
              const okLv = maxPlayerDragonLevel >= a.joinConditions.minDragonLevel;
              const isFull = a.memberCount >= a.maxMembers;
              const canJoinThis = !isFull && okPower && okDragons && okLv;
              const isJoiningThis = joiningAllianceId === a.id;

              return (
                <div
                  key={a.id}
                  className="rounded-2xl bg-slate-900/95 border border-slate-800 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${emb.bgGradient} border ${emb.borderClass} flex items-center justify-center shrink-0`}
                      >
                        {renderEmblemGlyph(emb.id, `w-5 h-5 ${emb.iconColorClass}`)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-white truncate">
                            {a.packName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono-num text-[9.5px] font-black">
                            Lv.{a.level}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300 truncate">
                          👑 القائد: <strong className="text-amber-300">{a.leaderName}</strong> ·{' '}
                          {a.motto}
                        </div>
                      </div>
                    </div>

                    <div className="text-left font-mono-num text-[10px] shrink-0">
                      <div className="font-black text-rose-300">
                        {a.power.toLocaleString()} قوة
                      </div>
                      <div className="text-sky-300">
                        {a.memberCount}/{a.maxMembers} أعضاء · 🟢 {a.onlineCount}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5 font-mono-num text-[9.5px]">
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          okPower
                            ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/35 text-rose-300'
                        }`}
                      >
                        قوة {a.joinConditions.minPower}+
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          okDragons
                            ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/35 text-rose-300'
                        }`}
                      >
                        {a.joinConditions.minDragons}+ تنين
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          okLv
                            ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/35 text-rose-300'
                        }`}
                      >
                        Lv.{a.joinConditions.minDragonLevel}+
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!canJoinThis || joiningAllianceId !== null}
                      onClick={async () => {
                        soundFX.playGodConfirm();
                        if (onJoinAllianceById) {
                          setJoiningAllianceId(a.id);
                          try {
                            await onJoinAllianceById(a.id);
                          } finally {
                            setJoiningAllianceId(null);
                          }
                        } else {
                          onJoinPack();
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl font-black text-[11px] ${
                        canJoinThis && joiningAllianceId === null
                          ? 'bg-emerald-400 text-slate-950 hover:brightness-105 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      {isJoiningThis
                        ? 'جاري الانضمام...'
                        : isFull
                          ? 'مكتمل'
                          : canJoinThis
                            ? 'انضمام للسرب'
                            : 'الشروط غير مستوفاة'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

