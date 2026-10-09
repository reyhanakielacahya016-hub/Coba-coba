import { ArrowDownRight, ArrowUpRight, Flame, Leaf, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader, SettingsLink } from '../../components/layout/AppShell.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Segmented, Switch } from '../../components/ui/Form.jsx';
import { addDays, todayISO } from '../../lib/dates.js';
import { formatDateLong, formatRupiah } from '../../lib/format.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { previousRange } from '../../state/scope.js';
import { dailyTrend, inRange, spendingByCategory, totalsIn, weeklyTrend } from '../../state/selectors.js';
import { PeriodSwitcher } from '../periods/PeriodSwitcher.jsx';
import { CategoryBars } from './CategoryBars.jsx';
import { TrendChart } from './TrendChart.jsx';
import './Stats.css';

const MAX_ROWS = 6; // sisanya digabung jadi "Kategori lain"

export function StatsPage() {
  const { data } = useData();
  const { range, openQuickAdd } = useUi();
  const today = todayISO();
  const [mode, setMode] = useState(range.days > 45 ? 'weekly' : 'daily');
  const [hideRecurring, setHideRecurring] = useState(true);
  useEffect(() => setMode(range.days > 45 ? 'weekly' : 'daily'), [range.days]);

  const isCurrent = inRange(today, range);
  // untuk rentang yang sedang berjalan, hitung sampai hari ini saja
  const until = isCurrent ? today : range.end;
  const elapsed = useMemo(() => ({ start: range.start, end: until }), [range.start, until]);
  const daysCounted = dailyTrend(data, elapsed).length;

  const byCat = useMemo(() => spendingByCategory(data, range), [data, range]);
  const totals = useMemo(() => totalsIn(data, range), [data, range]);
  // fakta harian tanpa pengeluaran rutin (mis. kos), supaya "hari paling boros" bermakna
  const daily = useMemo(() => dailyTrend(data, elapsed, { excludeRecurring: true }), [data, elapsed]);
  const prevRange = useMemo(() => previousRange(data, range, today), [data, range, today]);

  const hasRecurring = useMemo(
    () => data.transactions.some((t) => t.type === 'expense' && t.recurringId && inRange(t.date, range)),
    [data.transactions, range],
  );
  const trend = useMemo(() => {
    const opts = { excludeRecurring: hideRecurring };
    return mode === 'daily' ? dailyTrend(data, range, opts) : weeklyTrend(data, range, opts);
  }, [data, range, mode, hideRecurring]);
  const avgPerDay = daysCounted ? Math.round(totals.expense / daysCounted) : 0;

  const rows = useMemo(() => {
    if (byCat.length <= MAX_ROWS) return byCat;
    const head = byCat.slice(0, MAX_ROWS - 1);
    const tail = byCat.slice(MAX_ROWS - 1);
    const amount = tail.reduce((s, r) => s + r.amount, 0);
    const share = tail.reduce((s, r) => s + r.share, 0);
    return [...head, { category: { id: '__other', name: `${tail.length} kategori lain`, emoji: '…' }, amount, share }];
  }, [byCat]);

  // pembanding: periode/bulan sebelumnya, sepanjang jumlah hari yang sama
  const compare = useMemo(() => {
    if (!prevRange) return null;
    const cut = { start: prevRange.start, end: addDays(prevRange.start, daysCounted - 1) < prevRange.end ? addDays(prevRange.start, daysCounted - 1) : prevRange.end };
    const prevTotals = totalsIn(data, isCurrent ? cut : prevRange);
    if (!prevTotals.expense) return null;
    const diff = totals.expense - prevTotals.expense;
    const pct = Math.round((Math.abs(diff) / prevTotals.expense) * 100);
    const prevCats = new Map(spendingByCategory(data, isCurrent ? cut : prevRange).map((c) => [c.category.id, c.amount]));
    const movers = byCat
      .map((c) => ({ ...c, delta: c.amount - (prevCats.get(c.category.id) || 0) }))
      .filter((c) => Math.abs(c.delta) >= 10000)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);
    return { diff, pct, label: `dibanding ${isCurrent ? 'hari yang sama di ' : ''}${prevRange.title}`, movers };
  }, [prevRange, data, isCurrent, daysCounted, totals.expense, byCat]);

  // fakta kecil: hari paling boros & hari tanpa pengeluaran
  const facts = useMemo(() => {
    const withSpend = daily.filter((d) => d.amount > 0);
    const top = [...daily].sort((a, b) => b.amount - a.amount)[0];
    return { top: top?.amount ? top : null, zeroDays: daily.length - withSpend.length };
  }, [daily]);

  const empty = totals.expense === 0;
  const todayIndex = isCurrent ? trend.findIndex((p) => p.date <= today && (p.end ?? p.date) >= today) : -1;

  return (
    <div className="stats">
      <PageHeader title="Statistik" actions={<SettingsLink />} />
      <PeriodSwitcher />

      {empty ? (
        <div className="card">
          <EmptyState
            illustration="chart"
            title={`Belum ada pengeluaran di ${range.title}`}
            action={
              <Button onClick={() => openQuickAdd()}>
                <Plus size={18} /> Catat pengeluaran
              </Button>
            }
          >
            Setelah ada catatan, di sini muncul ke mana uangmu pergi, tren harian, hari paling boros, dan perbandingan dengan periode sebelumnya.
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="stat-row" aria-label="Angka utama">
            <div className="stat card stat--hero">
              <p className="stat__label">Total pengeluaran</p>
              <p className="stat__value num">{formatRupiah(totals.expense)}</p>
              {compare ? (
                <p className={`stat__delta ${compare.diff <= 0 ? 'is-down' : 'is-up'}`}>
                  {compare.diff <= 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                  {compare.pct}% {compare.diff <= 0 ? 'lebih hemat' : 'lebih banyak'} {compare.label}
                </p>
              ) : (
                <p className="stat__delta">dari {daysCounted} hari</p>
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
                key={`${mode}-${range.start}`}
                points={trend}
                mode={mode}
                todayIndex={todayIndex}
                average={mode === 'daily' ? Math.round(trend.filter((p) => p.date <= until).reduce((a, p) => a + p.amount, 0) / daysCounted) : null}
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

          <section className="facts" aria-label="Fakta kecil">
            {facts.top && (
              <div className="fact card">
                <span className="fact__icon fact__icon--warn" aria-hidden="true">
                  <Flame size={18} />
                </span>
                <div>
                  <p className="fact__label">Hari paling boros{hasRecurring ? ' (tanpa rutin)' : ''}</p>
                  <p className="fact__value num">{formatRupiah(facts.top.amount)}</p>
                  <p className="fact__sub">{formatDateLong(facts.top.date)}</p>
                </div>
              </div>
            )}
            <div className="fact card">
              <span className="fact__icon" aria-hidden="true">
                <Leaf size={18} />
              </span>
              <div>
                <p className="fact__label">Hari tanpa pengeluaran</p>
                <p className="fact__value num">
                  {facts.zeroDays} <small>dari {daysCounted} hari</small>
                </p>
                <p className="fact__sub">{facts.zeroDays ? 'Hari hemat tetap terhitung. Mantap!' : 'Coba satu hari tanpa jajan minggu ini?'}</p>
              </div>
            </div>
            {compare?.movers?.length > 0 && (
              <div className="fact card fact--wide">
                <div className="fact__body">
                  <p className="fact__label">Berubah dibanding {prevRange.title}</p>
                  <ul className="movers">
                    {compare.movers.map((m) => (
                      <li key={m.category.id}>
                        <span>
                          <span aria-hidden="true">{m.category.emoji}</span> {m.category.name}
                        </span>
                        <span className={`num movers__delta ${m.delta > 0 ? 'is-up' : 'is-down'}`}>
                          {m.delta > 0 ? '+' : '−'}
                          {formatRupiah(Math.abs(m.delta)).replace('Rp ', 'Rp ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
