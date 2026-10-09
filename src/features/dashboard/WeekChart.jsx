import { useMemo, useState } from 'react';
import { formatRupiah, formatShort } from '../../lib/format.js';
import { todayISO } from '../../lib/dates.js';
import { useData } from '../../state/AppProvider.jsx';
import { lastDays } from '../../state/selectors.js';

/** Grafik batang kecil: pengeluaran 7 hari terakhir, dengan garis jatah harian. */
export function WeekChart({ allowance }) {
  const { data } = useData();
  const today = todayISO();
  const days = useMemo(() => lastDays(data, 7, today), [data, today]);
  const [active, setActive] = useState(days.length - 1);
  const max = Math.max(...days.map((d) => d.amount), allowance || 0, 1);
  const total = days.reduce((s, d) => s + d.amount, 0);
  const a = days[active];

  return (
    <section className="week card" aria-labelledby="week-title">
      <div className="section__head">
        <h2 id="week-title" className="section__title">
          7 hari terakhir
        </h2>
        <span className="muted week__total num">{formatRupiah(total)}</span>
      </div>
      <p className="week__readout" aria-live="polite">
        <span className="muted">{a.date === today ? 'Hari ini' : a.long}</span> <strong className="num">{formatRupiah(a.amount)}</strong>
      </p>
      <div className="week__bars" role="group" aria-label="Pengeluaran per hari">
        {allowance > 0 && (
          <span className="week__line" style={{ bottom: `calc(22px + (100% - 30px) * ${allowance / max})` }}>
            <span>jatah {formatShort(allowance)}</span>
          </span>
        )}
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            className={`week__col ${i === active ? 'is-active' : ''} ${allowance && d.amount > allowance ? 'is-over' : ''}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`${d.long}: ${formatRupiah(d.amount)}`}
          >
            <span className="week__bar-wrap">
              <span className="week__bar" style={{ height: `${Math.max(d.amount ? 4 : 0, (d.amount / max) * 100)}%`, animationDelay: `${i * 40}ms` }} />
            </span>
            <span className="week__day">{d.date === today ? 'Ini' : d.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
