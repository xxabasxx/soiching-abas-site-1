import type { ModuleId } from '../types';

export function Circuit({ id }: { id: ModuleId }) {
  const base = id.replace('-ind', '') as ModuleId;
  void base; // used below
  return (
    <svg className="circuit-illustration" viewBox="0 0 250 86" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path className="circuit-guide" d="M0 43h250M125 0v86" strokeDasharray="2 5" />
      {id === 'input' && <>
        <path d="M13 43h26m-23 0c6-23 11-23 17 0s11 23 17 0" className="circuit-trace" />
        <path d="M62 43h17l34-31 34 31-34 31-34-31m68 0h26m-60-31v-7m0 69v7M173 43h17m9 0h34M190 30v26m9-26v26" />
        <path d="m86 30 13 3-5-12m27 0 13 5-4 9m-43 18 12 3-4 12m28-2 5-13 12 2" />
        <circle cx="62" cy="43" r="2.5" className="circuit-node" /><circle cx="233" cy="43" r="2.5" className="circuit-node" />
      </>}
      {id === 'transformer' && <>
        <path d="M19 21h57v-8h14c15 0 15 15 0 15 15 0 15 15 0 15 15 0 15 15 0 15 15 0 15 15 0 15H76v-8H19M231 21h-57v-8h-14c-15 0-15 15 0 15-15 0-15 15 0 15-15 0-15 15 0 15-15 0-15 15 0 15h14v-8h57" className="circuit-trace" />
        <path d="M119 11v64m12-64v64" strokeWidth="2" />
        <circle cx="19" cy="21" r="2.5" className="circuit-node" /><circle cx="19" cy="65" r="2.5" className="circuit-node" /><circle cx="231" cy="21" r="2.5" className="circuit-node" /><circle cx="231" cy="65" r="2.5" className="circuit-node" />
        <circle cx="72" cy="17" r="1.5" fill="currentColor" /><circle cx="178" cy="17" r="1.5" fill="currentColor" />
      </>}
      {id === 'switching' && <>
        <path d="M12 60h19V27h24v33h15V27h24v33h16" className="circuit-trace" />
        <path d="M135 43h27m0-20v40m8-40v15m0 10v15m0-20h30m-15 0V16h32m-32 27v27h32M170 28h15m-15 30h15" />
        <path d="m179 54-7 4 7 4" /><circle cx="217" cy="16" r="2.5" className="circuit-node" /><circle cx="217" cy="70" r="2.5" className="circuit-node" />
        <path d="M9 74h105" opacity=".2" />
      </>}
      {id === 'output' && <>
        <path d="M15 31h31c0-18 18-18 18 0 0-18 18-18 18 0 0-18 18-18 18 0 0-18 18-18 18 0h106M151 31v18m-11 0h22m-22 8h22m-11 0v16m-8 0h16m-13 5h10m-7 5h4" className="circuit-trace" />
        <circle cx="15" cy="31" r="2.5" className="circuit-node" /><circle cx="224" cy="31" r="2.5" className="circuit-node" /><circle cx="151" cy="31" r="2" fill="currentColor" />
        <path d="M183 60c5-6 10-6 15 0s10 6 15 0 10-6 15 0" opacity=".65" />
      </>}
      {(id === 'ironcore' || id === 'ironcore-ind') && <>
        {/* هسته EI کامل با یوغ، بازوها و زبانه */}
        <path d="M72 8h106v10H72zM72 68h106v10H72zM72 18h12v50H72zM166 18h12v50h-12zM118 18h14v50h-14z" className="circuit-trace" />
        {/* پایه‌ها */}
        <path d="M72 78v4h106v-4" opacity=".4" /><path d="M78 82h94" strokeWidth=".8" opacity=".25" />
        {/* سیم‌پیچ اولیه – ۶ حلقه دور زبانه */}
        <path d="M118 22c-14 0-14 7 0 7-14 0-14 7 0 7-14 0-14 7 0 7-14 0-14 7 0 7-14 0-14 7 0 7-14 0-14 7 0 7" className="circuit-trace" strokeWidth="1.5" />
        {/* سیم‌پیچ ثانویه – ۶ حلقه */}
        <path d="M132 22c14 0 14 7 0 7 14 0 14 7 0 7 14 0 14 7 0 7 14 0 14 7 0 7 14 0 14 7 0 7 14 0 14 7 0 7" className="circuit-trace" strokeWidth="1.5" />
        {/* سیم‌های خروجی اولیه */}
        <path d="M104 25H18m86 39H18" opacity=".5" />
        <circle cx="18" cy="25" r="2.5" className="circuit-node" /><circle cx="18" cy="64" r="2.5" className="circuit-node" />
        {/* سیم‌های خروجی ثانویه */}
        <path d="M146 25h86m-86 39h86" opacity=".5" />
        <circle cx="232" cy="25" r="2.5" className="circuit-node" /><circle cx="232" cy="64" r="2.5" className="circuit-node" />
        {/* مسیر شار مغناطیسی */}
        <path className="iron-flux" d="M125 14H78V72h47" />
        <path className="iron-flux-late" d="M125 14h47V72h-47" />
      </>}
      {(id === 'motor' || id === 'motor-ind') && <>
        {/* استاتور بیرونی */}
        <circle cx="125" cy="43" r="38" className="circuit-trace" />
        {/* شیارهای استاتور */}
        <path d="M125 5v8M125 73v8M87 43h8m52 0h8M96 17l5 6m43 40 5 6M154 17l-5 6m-43 40-5 6" opacity=".35" strokeWidth="1.5" />
        {/* سیم‌پیچ‌های استاتور */}
        <path d="M100 18c-3 6 0 12 6 9m38 0c3 6 0 12-6 9M94 43c-6-3-6-10 0-12m62 0c6-3 6 10 0 12M100 68c-3-6 0-12 6-9m38 0c3-6 0-12-6-9" opacity=".5" strokeWidth="1.3" />
        {/* روتور چرخان */}
        <g className="motor-rotor">
          <circle cx="125" cy="43" r="17" />
          <path d="M125 26v10m0 14v10M108 43h10m14 0h10" strokeWidth="2.5" opacity=".7" />
          <circle cx="125" cy="43" r="4" fill="currentColor" />
        </g>
        {/* شفت */}
        <path d="M125 60v21" strokeWidth="2" />
        <rect x="115" y="79" width="20" height="3" rx="1" fill="currentColor" opacity=".6" />
        {/* سیم‌های ورودی */}
        <path d="M87 43H18m150 0h62" opacity=".4" />
        <circle cx="18" cy="43" r="2.5" className="circuit-node" /><circle cx="230" cy="43" r="2.5" className="circuit-node" />
      </>}
      {(id === 'bldc' || id === 'bldc-ind') && <>
        {/* استاتور با شیارهای برق‌گیر */}
        <circle cx="125" cy="43" r="36" className="circuit-trace" />
        {/* شیارهای استاتور — ۱۲ شیار */}
        <g opacity=".6">
          <path d="M125 7v9M125 70v9M90 16l5 7M155 16l-5 7M89 70l5-7M161 70l-5-7M62 43h9M163 43h9M70 22l7 5M173 22l-7 5M70 64l7-5M173 64l-7-5" strokeWidth="2" />
        </g>
        {/* آهنرباهای دائم روتور — ۱۴ قطب */}
        <g className="motor-rotor">
          <circle cx="125" cy="43" r="22" />
          <circle cx="125" cy="43" r="14" opacity=".3" />
          {/* قطب‌های N/S */}
          <path d="M125 21v8M125 57v8M104 30l6 4M139 30l-6 4M104 56l6-4M139 56l-6-4M114 22l3 7M136 22l-3 7M114 64l3-7M136 64l-3-7" strokeWidth="1.5" opacity=".7" />
          <circle cx="125" cy="43" r="5" fill="currentColor" opacity=".8" />
          <path d="M125 38v10M120 43h10" strokeWidth="1.5" stroke="#100e15" />
        </g>
        {/* ESC/کنترلر — سه فاز */}
        <path d="M12 33h18m-18 10h18m-18 10h18" opacity=".5" />
        <circle cx="12" cy="33" r="2.5" className="circuit-node" />
        <circle cx="12" cy="43" r="2.5" className="circuit-node" />
        <circle cx="12" cy="53" r="2.5" className="circuit-node" />
        {/* سیم‌های سه‌فاز به استاتور */}
        <path d="M30 33c20 0 20-18 35-14M30 43h35M30 53c20 0 20 18 35 14" opacity=".4" />
      </>}
    </svg>
  );
}