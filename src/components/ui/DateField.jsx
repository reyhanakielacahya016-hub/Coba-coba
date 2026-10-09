import { CalendarDays, X } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { isISODate, makeISO } from '../../lib/dates.js';
import { formatDateLong, formatDateShort } from '../../lib/format.js';
import { Calendar } from './Calendar.jsx';
import './DateField.css';

const supportsPopover = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;

const split = (iso) => (iso ? { d: String(Number(iso.slice(8, 10))), m: String(Number(iso.slice(5, 7))), y: iso.slice(0, 4) } : { d: '', m: '', y: '' });

/**
 * Isian tanggal dengan dua cara:
 * 1. ketik angka tanggal / bulan / tahun, atau
 * 2. ketuk ikon kalender untuk memilih lewat kalender dropdown.
 * Nilai yang dikirim lewat onChange selalu "YYYY-MM-DD" (atau '' bila dikosongkan).
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  rangeStart,
  rangeEnd,
  error,
  hint,
  clearable = false,
  compact = false,
  minMessage,
}) {
  const id = useId();
  const [parts, setParts] = useState(() => split(value));
  const [localError, setLocalError] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const popRef = useRef(null);
  const btnRef = useRef(null);
  const dRef = useRef(null);
  const mRef = useRef(null);
  const yRef = useRef(null);
  const editing = useRef(false);

  // sinkron dengan nilai dari luar (mis. dipilih lewat kalender atau chip "Kemarin")
  useEffect(() => {
    if (!editing.current) setParts(split(value));
    setLocalError('');
  }, [value]);

  const check = (iso) => {
    if (min && iso < min) return minMessage ?? `Tidak boleh sebelum ${formatDateShort(min)}.`;
    if (max && iso > max) return `Tidak boleh setelah ${formatDateShort(max)}.`;
    return '';
  };

  const commit = (next) => {
    const { d, m, y } = next;
    if (!d && !m && !y) {
      setLocalError('');
      if (clearable) onChange('');
      return;
    }
    if (!d || !m || y.length !== 4) {
      setLocalError('');
      return; // belum lengkap, tunggu
    }
    const iso = makeISO(y, m, d);
    if (!iso) {
      setLocalError('Tanggal itu tidak ada di kalender. Cek lagi ya.');
      return;
    }
    const msg = check(iso);
    setLocalError(msg);
    if (!msg) onChange(iso);
  };

  const onPart = (key, max, nextRef) => (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, key === 'y' ? 4 : 2);
    const next = { ...parts, [key]: raw };
    setParts(next);
    commit(next);
    if (nextRef && raw.length === max) nextRef.current?.focus();
  };

  const onBack = (prevRef) => (e) => {
    if (e.key === 'Backspace' && !e.currentTarget.value && prevRef) {
      e.preventDefault();
      prevRef.current?.focus();
    }
  };

  // ——— popover kalender ———
  const position = useCallback(() => {
    const pop = popRef.current;
    const box = boxRef.current;
    if (!pop || !box || !supportsPopover) return;
    const r = box.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(340, vw - 32);
    const h = pop.offsetHeight || 380;
    let left = Math.min(Math.max(16, r.left), vw - width - 16);
    let top = r.bottom + 8;
    if (top + h > vh - 16) top = r.top - h - 8 >= 16 ? r.top - h - 8 : Math.max(16, (vh - h) / 2);
    pop.style.width = `${width}px`;
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }, []);

  const show = () => {
    if (!supportsPopover) {
      setOpen((o) => !o);
      return;
    }
    const pop = popRef.current;
    if (pop.matches(':popover-open')) {
      pop.hidePopover();
      return;
    }
    pop.showPopover();
    position(); // langsung di posisi yang benar sebelum digambar
  };

  useLayoutEffect(() => {
    if (!open || !supportsPopover) return;
    position();
    const onMove = () => position();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, position]);

  const pick = (iso) => {
    const msg = check(iso);
    if (msg) {
      setLocalError(msg);
      return;
    }
    setLocalError('');
    setParts(split(iso));
    onChange(iso);
    if (supportsPopover) popRef.current?.hidePopover();
    else setOpen(false);
    btnRef.current?.focus();
  };

  const shownError = error || localError;
  const pretty = isISODate(value) ? formatDateLong(value) : '';

  const calendar = (
    <Calendar value={isISODate(value) ? value : null} onSelect={pick} min={min} max={max} rangeStart={rangeStart} rangeEnd={rangeEnd} />
  );

  return (
    <div className={`datefield ${compact ? 'datefield--compact' : ''}`}>
      {label && (
        <label className="field__label" htmlFor={`${id}-d`}>
          {label}
        </label>
      )}
      <div ref={boxRef} className={`datefield__box ${shownError ? 'has-error' : ''} ${open ? 'is-open' : ''}`}>
        <div
          className="datefield__parts"
          role="group"
          aria-label={label ? `${label}: tanggal, bulan, tahun` : 'Tanggal, bulan, tahun'}
          onFocus={() => (editing.current = true)}
          onBlur={() => (editing.current = false)}
        >
          <input
            ref={dRef}
            id={`${id}-d`}
            className="datefield__part"
            inputMode="numeric"
            placeholder="hh"
            aria-label="Tanggal"
            value={parts.d}
            onChange={onPart('d', 2, mRef)}
            aria-invalid={Boolean(shownError)}
          />
          <span aria-hidden="true">/</span>
          <input
            ref={mRef}
            className="datefield__part"
            inputMode="numeric"
            placeholder="bb"
            aria-label="Bulan"
            value={parts.m}
            onChange={onPart('m', 2, yRef)}
            onKeyDown={onBack(dRef)}
            aria-invalid={Boolean(shownError)}
          />
          <span aria-hidden="true">/</span>
          <input
            ref={yRef}
            className="datefield__part datefield__part--year"
            inputMode="numeric"
            placeholder="tttt"
            aria-label="Tahun"
            value={parts.y}
            onChange={onPart('y', 4)}
            onKeyDown={onBack(mRef)}
            aria-invalid={Boolean(shownError)}
          />
        </div>
        {clearable && value && (
          <button
            type="button"
            className="datefield__clear"
            aria-label="Kosongkan tanggal"
            onClick={() => {
              setParts(split(''));
              onChange('');
            }}
          >
            <X size={16} />
          </button>
        )}
        <button
          ref={btnRef}
          type="button"
          className="datefield__btn"
          aria-label={label ? `Buka kalender ${label.toLowerCase()}` : 'Buka kalender'}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={show}
        >
          <CalendarDays size={19} />
        </button>
      </div>

      {supportsPopover ? (
        <div
          ref={popRef}
          popover="auto"
          className="datefield__pop"
          role="dialog"
          aria-label={label ? `Kalender ${label.toLowerCase()}` : 'Kalender'}
          onToggle={(e) => {
            const isOpen = e.newState === 'open';
            setOpen(isOpen);
            if (isOpen) requestAnimationFrame(() => popRef.current?.querySelector('.cal__day[tabindex="0"]')?.focus());
          }}
        >
          {calendar}
        </div>
      ) : (
        open && <div className="datefield__inline">{calendar}</div>
      )}

      {shownError ? (
        <p className="datefield__error" role="alert">
          {shownError}
        </p>
      ) : (
        (hint || pretty) && !compact && <p className="field__hint">{hint ?? pretty}</p>
      )}
    </div>
  );
}
