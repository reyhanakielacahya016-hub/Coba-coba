import { ArrowDownLeft, ArrowUpRight, PiggyBank, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { SettingsLink } from '../../components/layout/AppShell.jsx';
import { Logo } from '../../components/layout/Logo.jsx';
import { AnimatedRupiah } from '../../components/ui/AnimatedNumber.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { MonthPicker } from '../../components/ui/MonthPicker.jsx';
import { relativeDayLabel } from '../../lib/dates.js';
import { formatMonth } from '../../lib/format.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { categoryMap, monthInsight, monthTotals, txInMonth } from '../../state/selectors.js';
import { TransactionItem } from '../transactions/TransactionItem.jsx';
import { BudgetPreview } from './BudgetPreview.jsx';
import { StreakCard } from './StreakCard.jsx';
import { InstallPrompt } from '../../pwa/InstallPrompt.jsx';
import './Dashboard.css';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export function DashboardPage() {
  const { data } = useData();
  const { month, setMonth, openQuickAdd } = useUi();

  const totals = useMemo(() => monthTotals(data, month), [data, month]);
  const insight = useMemo(() => monthInsight(data, month), [data, month]);
  const cats = useMemo(() => categoryMap(data), [data]);
  const recent = useMemo(
    () =>
      txInMonth(data, month)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
        .slice(0, 5),
    [data, month],
  );

  const usedRatio = totals.income ? Math.min(1, (totals.expense + totals.saved) / totals.income) : 0;
  const negative = totals.remaining < 0;
  const monthName = formatMonth(month).split(' ')[0];

  return (
    <div className="dash">
      <header className="dash__top">
        <div className="dash__hello">
          <span className="dash__logo-m">
            <Logo size={34} withName={false} />
          </span>
          <div>
            <p className="dash__greet">{greeting()} 👋</p>
            <h1 className="dash__title">Uangmu bulan ini</h1>
          </div>
        </div>
        <SettingsLink />
      </header>

      <div className="dash__picker">
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <div className="dash__grid">
        <div className="dash__col">
          <section className={`hero card ${negative ? 'is-negative' : ''}`} aria-labelledby="hero-label">
            <p id="hero-label" className="hero__label">
              Sisa uang {monthName}
            </p>
            <AnimatedRupiah value={totals.remaining} className="hero__amount" />
            {totals.income > 0 && (
              <div className="hero__usage">
                <div className="hero__bar" aria-hidden="true">
                  <span style={{ width: `${usedRatio * 100}%` }} />
                </div>
                <p className="hero__usage-text">{Math.round(usedRatio * 100)}% pemasukan sudah terpakai atau ditabung</p>
              </div>
            )}
            <p className={`hero__insight tone-${insight.tone}`}>{insight.text}</p>
          </section>

          <section className="summary" aria-label="Ringkasan bulan">
            <SummaryTile icon={<ArrowDownLeft size={18} />} label="Pemasukan" value={totals.income} tone="income" />
            <SummaryTile icon={<ArrowUpRight size={18} />} label="Pengeluaran" value={totals.expense} tone="expense" />
            <SummaryTile icon={<PiggyBank size={18} />} label="Ditabung" value={totals.saved} tone="saved" />
          </section>
        </div>

        <div className="dash__col">
          <InstallPrompt />
          <StreakCard />
          <BudgetPreview month={month} />
        </div>

        <section className="section dash__recent card" aria-labelledby="recent-title">
          <div className="section__head">
            <h2 id="recent-title" className="section__title">
              Transaksi terakhir
            </h2>
            {recent.length > 0 && (
              <a className="link-btn" href="#/riwayat">
                Lihat semua
              </a>
            )}
          </div>
          {recent.length === 0 ? (
            <EmptyState
              compact
              emoji="📝"
              title="Belum ada catatan"
              action={
                <Button onClick={() => openQuickAdd()}>
                  <Plus size={18} /> Catat yang pertama
                </Button>
              }
            >
              Catatan pertamamu bisa sesederhana “es teh Rp 5.000”.
            </EmptyState>
          ) : (
            <ul className="tx-list enter-stagger">
              {recent.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  tx={tx}
                  category={cats.get(tx.categoryId)}
                  meta={relativeDayLabel(tx.date)}
                  onClick={() => openQuickAdd({ edit: tx })}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryTile({ icon, label, value, tone }) {
  return (
    <div className={`tile tile--${tone}`}>
      <span className="tile__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="tile__label">{label}</span>
      <AnimatedRupiah value={value} className="tile__value" />
    </div>
  );
}
