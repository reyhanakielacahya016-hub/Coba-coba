import { useId, useState } from 'react';
import { EMOJI_CHOICES } from '../../state/suggestions.js';
import './EmojiPicker.css';

/** Tombol emoji; ketuk untuk membuka pilihan emoji. */
export function EmojiPicker({ value, onChange, label = 'Pilih ikon' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="emoji-picker">
      <button
        type="button"
        className="emoji-picker__btn"
        aria-label={`${label}: ${value}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {value}
      </button>
      {open && (
        <div id={id} className="emoji-picker__grid" role="group" aria-label={label}>
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              className={`emoji-picker__opt ${e === value ? 'is-selected' : ''}`}
              aria-pressed={e === value}
              onClick={() => {
                onChange(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
