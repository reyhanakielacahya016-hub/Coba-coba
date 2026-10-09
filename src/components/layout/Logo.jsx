export const APP_NAME = 'Saku';

/** Logo kantong kecil + nama aplikasi. */
export function Logo({ size = 32, withName = true }) {
  return (
    <span className="logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="18" fill="var(--accent)" />
        <circle cx="38" cy="20" r="10" fill="var(--bg)" opacity="0.55" />
        <path d="M13 24h38v13c0 7-6 13.5-19 18C19 50.5 13 44 13 37V24z" fill="var(--bg)" />
        <path d="M18 29h28" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 5" />
        <path d="M25 39c2.2 2.4 4.4 3.6 7 3.6s4.8-1.2 7-3.6" fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      {withName && (
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size * 0.68, letterSpacing: '-0.03em' }}>
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
