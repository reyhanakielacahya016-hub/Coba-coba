import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MonthPicker } from '../../../components/ui/MonthPicker.jsx';
import { ProgressBar } from '../../../components/ui/ProgressBar.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { formatMonth, formatRupiah } from '../../../lib/format.js';
import { useData, useUi } from '../../../state/AppProvider.jsx';
import { budgetLevel, budgetMessage, budgetStatus, sortCategories, spendingByCategory } from '../../../state/selectors.js';
import { BudgetEditSheet } from './BudgetEditSheet.jsx';

export function BudgetList() {
  const { data } = useData();
  const { month, setMonth } = useUi();
  const [editing, setEditing] = useState(null);

  const status = useMemo(() => budgetStatus(data, month), [data, month]);
  const spent = useMemo(() => new Map(spendingByCategory(data, month).map((s) => [s.category.id, s.amount])), [data, month]);
  const unbudgeted = useMemo(
    () => sortCategories(data.categories.filter((c) => c.type === 'expense' && !c.budget)),
    [data.categories],
  );

  const total = status.reduce((s, b) => s + b.budget, 0);
  const used = status.reduce((s, b) => s + b.spent, 0);
  const totalRatio = total ? used / total : 0;
  const ordered = [...status].sort((a, b) => b.ratio - a.ratio);

  return (
    <div className="stack">
      <div className="plan__picker">
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {status.length > 0 ? (
        <section className="card budget-total" aria-labelledby="bt-title">
          <p id="bt-title" className="budget-total__label">
            Anggaran {formatMonth(month)}
          </p>
          <p className="budget-total__nums">
            <span className="budget-total__used num">{formatRupiah(used)}</span>
            <span className="muted num"> dari {formatRupiah(total)}</span>
          </p>
          <ProgressBar ratio={totalRatio} level={budgetLevel(totalRatio)} size="lg" label="Total anggaran terpakai" />
          <p className="muted budget-total__note">
            {total - used >= 0
              ? `Masih ada ${formatRupiah(total - used)} untuk kategori yang dianggarkan.`
              : `Lewat ${formatRupiah(used - total)} dari total rencana. Tidak apa-apa, ini bahan belajar untuk bulan depan.`}
          </p>
        </section>
      ) : (
        <div className="card">
          <EmptyState emoji="🎯" title="Belum ada anggaran">
            Pasang batas bulanan untuk kategori yang sering bikin kaget. Ketuk salah satu kategori di bawah untuk mulai.
          </EmptyState>
        </div>
      )}

      {ordered.length > 0 && (
        <ul className="budget-list enter-stagger" aria-label="Anggaran per kategori">
          {ordered.map((b) => (
            <li key={b.category.id}>
              <button type="button" className={`budget-row card level-${b.level}`} onClick={() => setEditing(b.category)}>
                <span className="budget-row__top">
                  <span className="budget-row__emoji" aria-hidden="true">
                    {b.category.emoji}
                  </span>
                  <span className="budget-row__name">{b.category.name}</span>
                  {b.level !== 'ok' && <span className={`badge badge--${b.level}`}>{b.level === 'over' ? 'Lewat batas' : 'Hampir habis'}</span>}
                  <span className="budget-row__pct num">{Math.round(b.ratio * 100)}%</span>
                </span>
                <ProgressBar ratio={b.ratio} level={b.level} label={`Anggaran ${b.category.name}`} />
                <span className="budget-row__bottom">
                  <span className="num">
                    <strong>{formatRupiah(b.spent)}</strong> / {formatRupiah(b.budget)}
                  </span>
                </span>
                <span className="budget-row__msg">{budgetMessage(b)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {unbudgeted.length > 0 && (
        <section className="section" aria-labelledby="nb-title">
          <h2 id="nb-title" className="section__title plan__subtitle">
            Belum ada batas
          </h2>
          <ul className="card plain-list">
            {unbudgeted.map((c) => (
              <li key={c.id}>
                <button type="button" className="plain-row" onClick={() => setEditing(c)}>
                  <span className="budget-row__emoji" aria-hidden="true">
                    {c.emoji}
                  </span>
                  <span className="plain-row__main">
                    <span className="plain-row__title">{c.name}</span>
                    <span className="plain-row__sub num">Terpakai {formatRupiah(spent.get(c.id) || 0)} bulan ini</span>
                  </span>
                  <span className="plain-row__cta">
                    Atur <ChevronRight size={16} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BudgetEditSheet category={editing} month={month} onClose={() => setEditing(null)} />
    </div>
  );
}
