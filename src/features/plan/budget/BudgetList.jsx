import { ChevronRight, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { ProgressBar } from '../../../components/ui/ProgressBar.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { monthOf } from '../../../lib/dates.js';
import { formatRupiah } from '../../../lib/format.js';
import { useToast } from '../../../hooks/useToast.jsx';
import { PeriodSwitcher } from '../../periods/PeriodSwitcher.jsx';
import { useData, useUi } from '../../../state/AppProvider.jsx';
import { averageSpending, budgetLevel, budgetMessage, budgetStatus, isFullMonth, sortCategories, spendingByCategory } from '../../../state/selectors.js';
import { BudgetEditSheet } from './BudgetEditSheet.jsx';

export function BudgetList() {
  const { data, dispatch } = useData();
  const { range } = useUi();
  const toast = useToast();
  const [editing, setEditing] = useState(null);

  const status = useMemo(() => budgetStatus(data, range), [data, range]);
  const spent = useMemo(() => new Map(spendingByCategory(data, range).map((s) => [s.category.id, s.amount])), [data, range]);
  const scaled = !isFullMonth(range);
  const month = monthOf(range.end);

  // saran anggaran otomatis dari rata-rata 3 bulan terakhir
  const suggestions = useMemo(
    () =>
      data.categories
        .filter((c) => c.type === 'expense' && !c.budget && !c.locked)
        .map((c) => ({ c, avg: averageSpending(data, c.id, month) }))
        .filter((x) => x.avg > 0)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5),
    [data, month],
  );
  const applySuggestions = () => {
    const snapshot = data;
    for (const { c, avg } of suggestions) dispatch({ type: 'SET_BUDGET', id: c.id, budget: Math.ceil(avg / 10000) * 10000 });
    toast({
      message: `${suggestions.length} anggaran dipasang dari rata-rata pengeluaranmu.`,
      icon: <Sparkles size={16} />,
      action: { label: 'Urungkan', onClick: () => dispatch({ type: 'REPLACE_ALL', data: snapshot }) },
    });
  };
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
      <PeriodSwitcher />

      {status.length > 0 ? (
        <section className="card budget-total" aria-labelledby="bt-title">
          <p id="bt-title" className="budget-total__label">
            Anggaran · {range.title}
          </p>
          <p className="budget-total__nums">
            <span className="budget-total__used num">{formatRupiah(used)}</span>
            <span className="muted num"> dari {formatRupiah(total)}</span>
          </p>
          <ProgressBar ratio={totalRatio} level={budgetLevel(totalRatio)} size="lg" label="Total anggaran terpakai" />
          <p className="muted budget-total__note">
            {total - used >= 0
              ? `Masih ada ${formatRupiah(total - used)} untuk kategori yang dianggarkan.`
              : `Lewat ${formatRupiah(used - total)} dari total rencana. Tidak apa-apa, ini bahan belajar untuk periode berikutnya.`}
          </p>
          {scaled && (
            <p className="budget-total__scaled">
              Anggaran disimpan per bulan, lalu disesuaikan untuk {range.days} hari {range.kind === 'period' ? 'periode' : ''} ini.
            </p>
          )}
        </section>
      ) : (
        <div className="card">
          <EmptyState
            illustration="target"
            title="Belum ada anggaran"
            action={
              suggestions.length > 0 && (
                <Button onClick={applySuggestions}>
                  <Sparkles size={18} /> Pasang otomatis ({suggestions.length} kategori)
                </Button>
              )
            }
          >
            Pasang batas bulanan untuk kategori yang sering bikin kaget.{' '}
            {suggestions.length > 0 ? 'Saku bisa mengisinya dari rata-rata pengeluaranmu, atau ' : ''}ketuk kategori di bawah untuk mengatur sendiri.
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
                  {scaled && <span className="budget-row__monthly num">{formatRupiah(b.monthly)}/bulan</span>}
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

      {status.length > 0 && suggestions.length > 0 && (
        <button type="button" className="suggest-banner" onClick={applySuggestions}>
          <Sparkles size={18} aria-hidden="true" />
          <span>
            <strong>Saran:</strong> pasang anggaran untuk {suggestions.map((x) => x.c.name).join(', ')} dari rata-rata pengeluaranmu.
          </span>
        </button>
      )}

      <BudgetEditSheet category={editing} month={month} onClose={() => setEditing(null)} />
    </div>
  );
}
