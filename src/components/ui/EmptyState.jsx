import { Illustration } from './Illustration.jsx';
import './EmptyState.css';

/**
 * Tampilan ramah saat belum ada data: ilustrasi, penjelasan singkat,
 * dan aksi nyata. `illustration` memakai ilustrasi SVG; `emoji` sebagai cadangan.
 */
export function EmptyState({ illustration, emoji = '🌱', title, children, action, secondary, compact = false }) {
  return (
    <div className={`empty ${compact ? 'empty--compact' : ''}`}>
      {illustration ? (
        <div className="empty__illu">
          <Illustration name={illustration} size={compact ? 104 : 136} />
        </div>
      ) : (
        <div className="empty__art" aria-hidden="true">
          <span>{emoji}</span>
        </div>
      )}
      <h3 className="empty__title">{title}</h3>
      {children && <p className="empty__text">{children}</p>}
      {(action || secondary) && (
        <div className="empty__action">
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}
