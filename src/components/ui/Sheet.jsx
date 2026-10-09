import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button.jsx';
import './Sheet.css';

/**
 * Panel yang naik dari bawah (di HP) atau dialog di tengah (di desktop).
 * Memakai <dialog> bawaan browser, jadi fokus keyboard terkunci di dalamnya
 * dan tombol Esc otomatis menutup.
 */
export function Sheet({ open, onClose, title, description, children, footer, size = 'md', initialFocus }) {
  const ref = useRef(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = ref.current;
    if (!mounted || !el) return;
    if (!el.open) {
      el.showModal();
      if (initialFocus?.current) {
        requestAnimationFrame(() => initialFocus.current?.focus());
      }
    }
  }, [mounted, initialFocus]);

  useEffect(() => {
    if (!mounted && ref.current?.open) ref.current.close();
  }, [mounted]);

  if (!mounted) return null;

  return (
    <dialog
      ref={ref}
      className={`sheet sheet--${size} ${closing ? 'is-closing' : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        // klik di area gelap di luar panel = tutup
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet__panel">
        <div className="sheet__grip" aria-hidden="true" />
        <header className="sheet__head">
          <div>
            <h2 id={titleId} className="sheet__title">
              {title}
            </h2>
            {description && <p className="sheet__desc">{description}</p>}
          </div>
          <IconButton label="Tutup" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </div>
    </dialog>
  );
}
