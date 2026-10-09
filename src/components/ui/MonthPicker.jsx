import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, currentMonth } from '../../lib/dates.js';
import { formatMonth } from '../../lib/format.js';
import { IconButton } from './Button.jsx';
import './MonthPicker.css';

/** ‹ Oktober 2026 › — tidak bisa maju melewati bulan ini. */
export function MonthPicker({ value, onChange }) {
  const isNow = value === currentMonth();
  return (
    <div className="month-picker">
      <IconButton label="Bulan sebelumnya" onClick={() => onChange(addMonths(value, -1))}>
        <ChevronLeft size={20} />
      </IconButton>
      <button
        type="button"
        className="month-picker__label"
        onClick={() => onChange(currentMonth())}
        disabled={isNow}
        title={isNow ? undefined : 'Kembali ke bulan ini'}
        aria-live="polite"
      >
        {formatMonth(value)}
        {!isNow && <span className="month-picker__back">ke bulan ini</span>}
      </button>
      <IconButton label="Bulan berikutnya" onClick={() => onChange(addMonths(value, 1))} disabled={isNow}>
        <ChevronRight size={20} />
      </IconButton>
    </div>
  );
}
