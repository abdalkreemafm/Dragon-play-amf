import React from 'react';

type CardAccent = 'default' | 'amber' | 'emerald' | 'sky' | 'rose' | 'indigo';

const ACCENT_BORDER: Record<CardAccent, string> = {
  default: 'border-slate-800',
  amber: 'border-amber-400/35',
  emerald: 'border-emerald-500/35',
  sky: 'border-sky-500/35',
  rose: 'border-rose-500/35',
  indigo: 'border-indigo-500/35',
};

interface SectionCardProps {
  children: React.ReactNode;
  accent?: CardAccent;
  compact?: boolean;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  children,
  accent = 'default',
  compact = false,
  className = '',
}) => {
  return (
    <section
      className={`bg-[#161923] border ${ACCENT_BORDER[accent]} rounded-2xl ${
        compact ? 'p-3' : 'p-4'
      } ${className}`}
    >
      {children}
    </section>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  meta,
  action,
  icon,
}) => {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          {icon ? <span className="shrink-0">{icon}</span> : null}
          <h3 className="text-sm font-black text-white truncate">{title}</h3>
          {meta ? (
            <span className="text-xs font-mono-num text-slate-400 shrink-0 whitespace-nowrap">
              {meta}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};

interface MetaRowProps {
  items: Array<string | number | null | undefined | false>;
  className?: string;
}

export const MetaRow: React.FC<MetaRowProps> = ({ items, className = '' }) => {
  const clean = items.filter((item): item is string | number => item !== null && item !== undefined && item !== false && item !== '');
  if (clean.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 font-mono-num ${className}`}>
      {clean.map((item, idx) => (
        <React.Fragment key={`${idx}-${String(item)}`}>
          {idx > 0 && <span aria-hidden="true">·</span>}
          <span>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
};
