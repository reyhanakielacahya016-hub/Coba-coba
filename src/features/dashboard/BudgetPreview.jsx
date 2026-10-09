import { useMemo } from 'react';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { todayISO } from '../../lib/dates.js';
import { formatRupiah } from '../../lib/format.js';
import { useData } from '../../state/AppProvider.jsx';
import { allLimitStatus, limitTitle, targetEmoji, windowLabel } from '../../state/limits.js';
import '../plan/limits/Limits.css';

/** Tiga batasan aktif yang paling mendesak, dengan yang masih aman dipakai hari ini. */
export function BudgetPreview() {
  const { data } = useData();
  const today = todayISO();
  const list = useMemo(
    () =>
      allLimitStatus(data, today)
        .filter((s) => s.limit.active && s.state === 'active')
        .slice(0, 3),
    [data, today],
  );

  return (
    <section className="section card" aria-labelledby="bp-title">
      <div className="section__head">
        <h2 id="bp-title" className="section__title">
          Batasan
        </h2>
        <a className="link-btn" href="#/rencana">
          {list.length ? 'Kelola' : 'Atur'}
        </a>
      </div>
      {list.length === 0 ? (
        <p className="muted bp__empty">
          Belum ada batasan yang berjalan. Coba pasang jatah harian otomatis, atau batas untuk kategori yang sering bikin kaget, misalnya jajan.
        </p>
      ) : (
        <ul className="lp">
          {list.map((s) => (
            <li key={s.limit.id} className="lp__row">
              <div className="lp__line">
                <span className="lp__name">
                  <span aria-hidden="true">{targetEmoji(data, s.limit)}</span> {limitTitle(data, s.limit)}
                </span>
                <span className={`lp__val num level-${s.level}`}>
                  {formatRupiah(s.spent)} <span className="muted">/ {formatRupiah(s.amount)}</span>
                </span>
              </div>
              <ProgressBar ratio={s.ratio} level={s.level} size="sm" label={`Batasan ${limitTitle(data, s.limit)}`} />
              <span className="lp__sub">
                {windowLabel(s.limit)} · aman dipakai hari ini <strong className="num">{formatRupiah(s.safeToday ?? 0)}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
