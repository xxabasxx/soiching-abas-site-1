import type { ModuleId } from '../types';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`} aria-label="ABAS SOFT" dir="ltr">
      <svg className="brand-mark" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="42" height="42" rx="11" stroke="currentColor" strokeWidth="1" />
        <path d="M9 22h7l4-11 5 23 4-12h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="brand-type">
        <span className="brand-name">ABAS SOFT<span className="brand-dot">.</span></span>
        <span className="brand-caption" dir="ltr">POWER DESIGN LAB</span>
      </div>
    </div>
  );
}

export function ModuleIcon({ id }: { id: ModuleId }) {
  const shared = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" {...shared} aria-hidden="true">
      {id === 'input' && <><path d="M4 16h5l4-9 6 18 4-9h5" /><path d="M4 6v20M28 6v20" opacity=".38" /></>}
      {id === 'transformer' && <><path d="M4 5h3a3.5 3.5 0 0 1 0 7 3.5 3.5 0 0 1 0 7 3.5 3.5 0 0 1 0 7H4M28 5h-3a3.5 3.5 0 0 0 0 7 3.5 3.5 0 0 0 0 7 3.5 3.5 0 0 0 0 7h3" /><path d="M14 5v22M18 5v22" opacity=".6" /></>}
      {id === 'switching' && <><rect x="9" y="9" width="14" height="14" rx="3" /><path d="M12 4v5M20 4v5M12 23v5M20 23v5M4 12h5M4 20h5M23 12h5M23 20h5" /><path d="m17 12-3 5h5l-3 4" /></>}
      {id === 'output' && <><path d="M3 16h7M22 16h7M13 7v18M19 7v18" /><path d="M5 6h4M7 4v4M25 25h4" opacity=".6" /></>}
    </svg>
  );
}