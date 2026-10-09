import { useMemo } from 'react';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { formatRupiah } from '../../lib/format.js';
import { useData } from '../../state/AppProvider.jsx';
import { budgetStatus } from '../../state/selectors.js';

/** Tiga anggaran yang paling mendekati batas, dalam periode yang dilihat. */
export function BudgetPreview({ range }) {
  const { data } = useData();
  const list = useMemo(
    () =>
      budgetStatus(data, range)
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 3),
    [data, range],
  );

  return (
    <section className="section card" aria-labelledby="bp-title">
      <div className="section__head">
        <h2 id="bp-title" className="section__title">
          Anggaran
        </h2>
        <a className="link-btn" href="#/rencana">
          {list.length ? 'Kelola' : 'Atur'}
        </a>
      </div>
      {list.length === 0 ? (
        <p className="muted bp__empty">
          Belum ada anggaran. Coba pasang batas untuk kategori yang paling sering bikin kaget, misalnya jajan. Saku bisa menyarankan angkanya.
        </p>
      ) : (
        <ul className="bp">
          {list.map((b) => (
            <li key={b.category.id} className="bp__row">
              <div className="bp__line">
                <span className="bp__name">
                  <span aria-hidden="true">{b.category.emoji}</span> {b.category.name}
                </span>
                <span className={`bp__val num level-${b.level}`}>
                  {formatRupiah(b.spent)} <span className="muted">/ {formatRupiah(b.budget)}</span>
                </span>
              </div>
              <ProgressBar ratio={b.ratio} level={b.level} size="sm" label={`Anggaran ${b.category.name}`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
