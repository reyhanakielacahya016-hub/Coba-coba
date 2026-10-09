import './ProgressBar.css';

/**
 * Progress bar dengan warna sesuai level: ok (aksen), warn (madu), over (koral), done.
 * `ratio` boleh > 1; bar berhenti di 100% tapi warnanya berubah.
 */
export function ProgressBar({ ratio, level = 'ok', label, size = 'md' }) {
  const pct = Math.max(0, Math.min(1, ratio || 0)) * 100;
  return (
    <div
      className={`progress progress--${level} progress--${size}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round((ratio || 0) * 100)}
    >
      <div className="progress__fill" style={{ '--pct': `${pct}%` }} />
    </div>
  );
}
