import './EmptyState.css';

/** Tampilan ramah saat belum ada data. */
export function EmptyState({ emoji = '🌱', title, children, action, compact = false }) {
  return (
    <div className={`empty ${compact ? 'empty--compact' : ''}`}>
      <div className="empty__art" aria-hidden="true">
        <span>{emoji}</span>
      </div>
      <h3 className="empty__title">{title}</h3>
      {children && <p className="empty__text">{children}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}
