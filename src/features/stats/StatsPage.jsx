import { useMemo, useState } from 'react';
import { PageHeader, SettingsLink } from '../../components/layout/AppShell.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Segmented, Switch } from '../../components/ui/Form.jsx';
import { MonthPicker } from '../../components/ui/MonthPicker.jsx';
import { addMonths, daysInMonth, monthOf, todayISO } from '../../lib/dates.js';
import { formatMonth, formatRupiah } from '../../lib/format.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { dailyTrend, monthTotals, spendingByCategory, weeklyTrend } from '../../state/selectors.js';
import { CategoryBars } from './CategoryBars.jsx';
import { TrendChart } from './TrendChart.jsx';
import './Stats.css';

const MAX_ROWS = 6; // sisanya digabung jadi "Kategori lain"

export function StatsPage() {
  const { data } = useData();
  const { month, setMonth } = useUi();
  const [mode, setMode] = useState('daily');
  const [hideRecurring, setHideRecurring] = useState(true);
  const today = todayISO();

  const byCat = useMemo(() => spendingByCategory(data, month), [data, month]);
  const totals = useMemo(() => monthTotals(data, month), [data, month]);
  const prev = useMemo(() => monthTotals(data, addMonths(month, -1)), [data, month]);
  const hasRecurring = useMemo(
    () => data.transactions.some((t) => t.type === 'expense' && t.recurringId && monthOf(t.date) === month),
    [data.transactions, month],
  );
  const trend = useMemo(() => {
    const opts = { excludeRecurring: hideRecurring };
    return mode === 'daily' ? dailyTrend(data, month, opts) : weeklyTrend(data, month, opts);
  }, [data, month, mode, hideRecurring]);

  const isCurrent = month === monthOf(today);
  const daysCounted = isCurrent ? Number(today.slice(8, 10)) : daysInMonth(month);
  const avgPerDay = daysCounted ? Math.round(totals.expense / daysCounted) : 0;

  const rows = useMemo(() => {
    if (byCat.length <= MAX_ROWS) return byCat;
    const head = byCat.slice(0, MAX_ROWS - 1);
    const tail = byCat.slice(MAX_ROWS - 1);
    const amount = tail.reduce((s, r) => s + r.amount, 0);
    const share = tail.reduce((s, r) => s + r.share, 0);
    return [...head, { category: { id: '__other', name: `${tail.length} kategori lain`, emoji: '…' }, amount, share }];
  }, [byCat]);

  // perbandingan dengan bulan lalu (sampai tanggal yang sama kalau bulan berjalan)
  const compare = useMemo(() => {
    if (!prev.expense) return null;
    let prevExpense = prev.expense;
    if (isCurrent) {
      const pm = addMonths(month, -1);
      const cutoff = `${pm}-${String(Math.min(daysCounted, daysInMonth(pm))).padStart(2, '0')}`;
      prevExpense = data.transactions
        .filter((t) => t.type === 'expense' && monthOf(t.date) === pm && t.date <= cutoff)
        .reduce((s, t) => s + t.amount, 0);
    }
    if (!prevExpense) return null;
    const diff = totals.expense - prevExpense;
    const pct = Math.round((Math.abs(diff) / prevExpense) * 100);
    return { diff, pct, label: isCurrent ? 'dibanding periode sama bulan lalu' : 'dibanding bulan lalu' };
  }, [prev.expense, isCurrent, month, daysCounted, data.transactions, totals.expense]);

  const empty = totals.expense === 0;

  return (
    <div className="stats">
      <PageHeader title="Statistik" actions={<SettingsLink />} />
      <div className="plan__picker">
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {empty ? (
        <div className="card">
          <EmptyState emoji="📊" title={`Belum ada pengeluaran di ${formatMonth(month)}`}>
            Grafik akan muncul setelah ada catatan pengeluaran. Satu catatan saja sudah cukup untuk mulai.
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="stat-row" aria-label="Angka utama">
            <div className="stat card">
              <p className="stat__label">Total pengeluaran</p>
              <p className="stat__value num">{formatRupiah(totals.expense)}</p>
              {compare && (
                <p className="stat__delta">
                  {compare.diff <= 0 ? '↓' : '↑'} {compare.pct}% {compare.label}
                </p>
              )}
            </div>
            <div className="stat card">
              <p className="stat__label">Rata-rata per hari</p>
              <p className="stat__value num">{formatRupiah(avgPerDay)}</p>
              <p className="stat__delta">dari {daysCounted} hari</p>
            </div>
            <div className="stat card">
              <p className="stat__label">Paling banyak</p>
              <p className="stat__value stat__value--text">
                <span aria-hidden="true">{byCat[0].category.emoji}</span> {byCat[0].category.name}
              </p>
              <p className="stat__delta">{Math.round(byCat[0].share * 100)}% dari pengeluaran</p>
            </div>
          </section>

          <div className="stats__grid">
            <section className="card section" aria-labelledby="cat-chart-title">
              <div className="section__head">
                <h2 id="cat-chart-title" className="section__title">
                  Ke mana uangmu pergi
                </h2>
              </div>
              <CategoryBars rows={rows} />
            </section>

            <section className="card section" aria-labelledby="trend-title">
              <div className="section__head trend-head">
                <h2 id="trend-title" className="section__title">
                  Tren pengeluaran
                </h2>
                <Segmented
                  size="sm"
                  label="Tampilan tren"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'daily', label: 'Harian' },
                    { value: 'weekly', label: 'Mingguan' },
                  ]}
                />
              </div>
              <TrendChart
                key={mode}
                points={trend}
                mode={mode}
                month={month}
                todayIndex={isCurrent ? (mode === 'daily' ? daysCounted - 1 : Math.ceil(daysCounted / 7) - 1) : -1}
                average={mode === 'daily' ? Math.round(trend.reduce((a, p) => a + p.amount, 0) / daysCounted) : null}
              />
              {hasRecurring && (
                <Switch
                  checked={hideRecurring}
                  onChange={setHideRecurring}
                  label="Sembunyikan pengeluaran rutin"
                  description="Misalnya bayar kos, supaya pola harianmu lebih terlihat."
                />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
