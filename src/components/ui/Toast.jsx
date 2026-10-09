import { Check, X } from 'lucide-react';
import './Toast.css';

export function Toast({ message, icon, action, leaving, onDismiss }) {
  return (
    <div className={`toast ${leaving ? 'is-leaving' : ''}`}>
      <span className="toast__icon" aria-hidden="true">{icon ?? <Check size={18} strokeWidth={2.5} />}</span>
      <span className="toast__msg">{message}</span>
      {action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
        >
          {action.label}
        </button>
      )}
      <button type="button" className="toast__close" onClick={onDismiss} aria-label="Tutup notifikasi">
        <X size={16} />
      </button>
    </div>
  );
}
