import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { addDays, addMonths, daysInMonth, monthOf, todayISO, weekdayMon } from '../../lib/dates.js';
import { formatDateLong, MONTHS } from '../../lib/format.js';
import './Calendar.css';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/**
 * Kalender bulanan: navigasi dengan dropdown bulan & tahun atau tombol ‹ ›,
 * sorotan hari ini, tanggal terpilih, dan (opsional) rentang tanggal.
 * Keyboard: panah = geser hari/minggu, PageUp/PageDown = geser bulan,
 * Home/End = awal/akhir minggu, Enter/Spasi = pilih.
 */
export function Calendar({ value, onSelect, min, max, rangeStart, rangeEnd, autoFocus = false }) {
  const today = todayISO();
  const initial = value || (rangeStart && !value ? rangeStart : null) || today;
  const [view, setView] = useState(monthOf(initial));
  const [focusDate, setFocusDate] = useState(initial);
  const [dir, setDir] = useState(0); // arah animasi saat ganti bulan
  const [hover, setHover] = useState(null); // pratinjau rentang saat memilih tanggal akhir
  const gridRef = useRef(null);
  const uid = useId();
  const wantFocus = useRef(autoFocus);

  // ikuti nilai dari luar
  useEffect(() => {
    if (value) {
      setView(monthOf(value));
      setFocusDate(value);
    }
  }, [value]);

  useEffect(() => {
    if (!wantFocus.current) return;
    const btn = gridRef.current?.querySelector(`[data-date="${focusDate}"]`);
    btn?.focus({ preventScroll: true });
  }, [focusDate, view]);

  const minYear = Math.min(Number((min || today).slice(0, 4)), Number(today.slice(0, 4)) - 10);
  const maxYear = Math.max(Number((max || today).slice(0, 4)), Number(today.slice(0, 4)) + 10);
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i), [minYear, maxYear]);

  const disabled = (d) => (min && d < min) || (max && d > max);

  const goMonth = (m, direction) => {
    setDir(direction);
    setView(m);
    // pertahankan tanggal yang difokus di bulan baru
    const day = Math.min(Number(focusDate.slice(8, 10)), daysInMonth(m));
    setFocusDate(`${m}-${String(day).padStart(2, '0')}`);
  };

  const [vy, vm] = view.split('-').map(Number);
  const first = `${view}-01`;
  const gridStart = addDays(first, -weekdayMon(first));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  // potong baris terakhir kalau seluruhnya bulan depan
  const rows = cells.slice(35).every((d) => monthOf(d) !== view) ? cells.slice(0, 35) : cells;

  // sedang memilih tanggal AKHIR bila ada rangeStart dan nilai ini bukan tanggal mulainya
  const pickingEnd = Boolean(rangeStart) && value !== rangeStart;
  const previewEnd = pickingEnd && hover && hover >= rangeStart ? hover : null;
  const endForBand = previewEnd ?? rangeEnd ?? (rangeStart ? rangeStart : null);
  const lo = rangeStart && endForBand ? (rangeStart < endForBand ? rangeStart : endForBand) : null;
  const hi = rangeStart && endForBand ? (rangeStart < endForBand ? endForBand : rangeStart) : null;

  const moveFocus = (d) => {
    wantFocus.current = true;
    const m = monthOf(d);
    if (m !== view) {
      setDir(m > view ? 1 : -1);
      setView(m);
    }
    setFocusDate(d);
  };

  const onKeyDown = (e) => {
    const map = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (map[e.key] !== undefined) {
      e.preventDefault();
      moveFocus(addDays(focusDate, map[e.key]));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      const m = addMonths(monthOf(focusDate), e.key === 'PageUp' ? -1 : 1);
      const day = Math.min(Number(focusDate.slice(8, 10)), daysInMonth(m));
      moveFocus(`${m}-${String(day).padStart(2, '0')}`);
    } else if (e.key === 'Home') {
      e.preventDefault();
      moveFocus(addDays(focusDate, -weekdayMon(focusDate)));
    } else if (e.key === 'End') {
      e.preventDefault();
      moveFocus(addDays(focusDate, 6 - weekdayMon(focusDate)));
    }
  };

  return (
    <div className="cal">
      <div className="cal__head">
        <button type="button" className="cal__nav" aria-label="Bulan sebelumnya" onClick={() => goMonth(addMonths(view, -1), -1)}>
          <ChevronLeft size={18} />
        </button>
        <div className="cal__selects">
          <label className="sr-only" htmlFor={`${uid}-m`}>
            Bulan
          </label>
          <select
            id={`${uid}-m`}
            className="cal__select"
            value={vm}
            onChange={(e) => goMonth(`${vy}-${String(e.target.value).padStart(2, '0')}`, Number(e.target.value) > vm ? 1 : -1)}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`${uid}-y`}>
            Tahun
          </label>
          <select
            id={`${uid}-y`}
            className="cal__select cal__select--year"
            value={vy}
            onChange={(e) => goMonth(`${e.target.value}-${String(vm).padStart(2, '0')}`, Number(e.target.value) > vy ? 1 : -1)}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="cal__nav" aria-label="Bulan berikutnya" onClick={() => goMonth(addMonths(view, 1), 1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="cal__weekdays" aria-hidden="true">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={i === 6 ? 'is-sunday' : ''}>
            {w}
          </span>
        ))}
      </div>

      <div
        ref={gridRef}
        key={view}
        className={`cal__grid ${dir > 0 ? 'slide-next' : dir < 0 ? 'slide-prev' : ''}`}
        role="grid"
        aria-label={`${MONTHS[vm - 1]} ${vy}`}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: rows.length / 7 }, (_, r) => (
          <div key={r} role="row" className="cal__row">
            {rows.slice(r * 7, r * 7 + 7).map((d) => {
              const outside = monthOf(d) !== view;
              const isSel = d === value;
              const inRange = lo && d >= lo && d <= hi;
              const cls = [
                'cal__day',
                outside && 'is-outside',
                d === today && 'is-today',
                isSel && 'is-selected',
                inRange && 'in-range',
                previewEnd && inRange && 'is-preview',
                d === lo && 'range-start',
                d === hi && 'range-end',
                weekdayMon(d) === 6 && 'is-sunday',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div key={d} role="gridcell" aria-selected={isSel}>
                  <button
                    type="button"
                    className={cls}
                    data-date={d}
                    tabIndex={d === focusDate ? 0 : -1}
                    disabled={disabled(d)}
                    aria-label={`${formatDateLong(d)}${d === today ? ', hari ini' : ''}`}
                    aria-current={d === today ? 'date' : undefined}
                    onClick={() => onSelect(d)}
                    onFocus={() => {
                      setFocusDate(d);
                      if (pickingEnd) setHover(d);
                    }}
                    onMouseEnter={() => pickingEnd && setHover(d)}
                  >
                    {Number(d.slice(8, 10))}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="cal__foot">
        <button type="button" className="cal__chip" disabled={disabled(today)} onClick={() => onSelect(today)}>
          Hari ini
        </button>
        {monthOf(focusDate) !== monthOf(today) && (
          <button type="button" className="cal__chip cal__chip--ghost" onClick={() => moveFocus(today)}>
            Lihat bulan ini
          </button>
        )}
      </div>
    </div>
  );
}
