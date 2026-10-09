/**
 * Ilustrasi kecil bergaya datar untuk empty state. Warna mengikuti token tema,
 * jadi otomatis cocok di mode terang & gelap.
 * name: 'notes' | 'piggy' | 'chart' | 'calendar' | 'search' | 'target' | 'wallet'
 */
export function Illustration({ name, size = 120 }) {
  const common = { width: size, height: size * 0.75, viewBox: '0 0 160 120', 'aria-hidden': true, className: `illu illu--${name}` };
  const ground = <ellipse cx="80" cy="108" rx="58" ry="7" fill="var(--surface-3)" />;
  switch (name) {
    case 'notes':
      return (
        <svg {...common}>
          {ground}
          <rect x="44" y="18" width="62" height="82" rx="10" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" transform="rotate(-6 75 59)" />
          <rect x="54" y="22" width="62" height="82" rx="10" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
          <rect x="64" y="38" width="34" height="6" rx="3" fill="var(--accent)" />
          <rect x="64" y="52" width="42" height="5" rx="2.5" fill="var(--surface-3)" />
          <rect x="64" y="63" width="30" height="5" rx="2.5" fill="var(--surface-3)" />
          <rect x="64" y="74" width="38" height="5" rx="2.5" fill="var(--surface-3)" />
          <g transform="rotate(35 118 70)">
            <rect x="112" y="40" width="10" height="52" rx="3" fill="var(--warn)" />
            <path d="M112 92h10l-5 10z" fill="var(--ink-2)" />
            <rect x="112" y="40" width="10" height="8" rx="2" fill="var(--over)" />
          </g>
          <circle cx="40" cy="36" r="5" fill="var(--accent-soft)" />
          <circle cx="128" cy="22" r="3.5" fill="var(--accent)" opacity="0.5" />
        </svg>
      );
    case 'piggy':
      return (
        <svg {...common}>
          {ground}
          <circle cx="98" cy="20" r="11" fill="var(--warn)" />
          <text x="98" y="25" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--warn-ink)">
            Rp
          </text>
          <ellipse cx="78" cy="70" rx="40" ry="31" fill="var(--accent)" />
          <circle cx="114" cy="66" r="12" fill="var(--accent-strong)" />
          <circle cx="111" cy="64" r="2" fill="var(--accent-ink)" />
          <circle cx="117" cy="64" r="2" fill="var(--accent-ink)" />
          <path d="M60 44l6-12 10 10z" fill="var(--accent-strong)" />
          <circle cx="96" cy="58" r="3" fill="var(--ink)" />
          <rect x="66" y="40" width="22" height="5" rx="2.5" fill="var(--accent-ink)" opacity="0.7" />
          <rect x="54" y="92" width="10" height="14" rx="4" fill="var(--accent-strong)" />
          <rect x="88" y="92" width="10" height="14" rx="4" fill="var(--accent-strong)" />
          <path d="M38 66c-8-2-10 8-3 9" stroke="var(--accent-strong)" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          {ground}
          <rect x="30" y="20" width="100" height="80" rx="12" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
          <rect x="44" y="66" width="12" height="22" rx="3" fill="var(--surface-3)" />
          <rect x="62" y="52" width="12" height="36" rx="3" fill="var(--surface-3)" />
          <rect x="80" y="40" width="12" height="48" rx="3" fill="var(--accent)" />
          <rect x="98" y="58" width="12" height="30" rx="3" fill="var(--surface-3)" />
          <path d="M44 48l18-10 18 6 26-14" stroke="var(--warn)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 6" />
          <circle cx="132" cy="24" r="10" fill="var(--accent-soft)" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          {ground}
          <rect x="36" y="22" width="88" height="80" rx="12" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
          <rect x="36" y="22" width="88" height="20" rx="12" fill="var(--accent)" />
          <rect x="36" y="34" width="88" height="8" fill="var(--accent)" />
          <rect x="54" y="14" width="6" height="16" rx="3" fill="var(--ink-2)" />
          <rect x="100" y="14" width="6" height="16" rx="3" fill="var(--ink-2)" />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={46 + c * 15}
                y={50 + r * 12}
                width="9"
                height="7"
                rx="2"
                fill={r === 1 && c >= 1 && c <= 3 ? 'var(--accent)' : r === 1 || (r === 2 && c === 0) ? 'var(--accent-soft)' : 'var(--surface-3)'}
              />
            )),
          )}
          <circle cx="130" cy="96" r="14" fill="var(--warn)" />
          <path d="M130 88v9l6 3" stroke="var(--warn-ink)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          {ground}
          <rect x="34" y="28" width="70" height="66" rx="10" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
          <rect x="44" y="42" width="40" height="5" rx="2.5" fill="var(--surface-3)" />
          <rect x="44" y="54" width="30" height="5" rx="2.5" fill="var(--surface-3)" />
          <rect x="44" y="66" width="44" height="5" rx="2.5" fill="var(--surface-3)" />
          <circle cx="104" cy="66" r="20" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="5" />
          <path d="M118 80l14 14" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" />
        </svg>
      );
    case 'target':
      return (
        <svg {...common}>
          {ground}
          <circle cx="80" cy="60" r="40" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
          <circle cx="80" cy="60" r="28" fill="var(--accent-soft)" />
          <circle cx="80" cy="60" r="15" fill="var(--accent)" />
          <circle cx="80" cy="60" r="5" fill="var(--accent-ink)" />
          <path d="M80 60l38-30" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M112 26l10-2-2 10z" fill="var(--warn)" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          {ground}
          <rect x="34" y="34" width="92" height="64" rx="14" fill="var(--accent)" />
          <rect x="34" y="34" width="92" height="18" rx="9" fill="var(--accent-strong)" />
          <rect x="96" y="58" width="34" height="22" rx="8" fill="var(--accent-soft)" />
          <circle cx="108" cy="69" r="4" fill="var(--accent)" />
          <circle cx="58" cy="24" r="10" fill="var(--warn)" />
        </svg>
      );
  }
}
