import { ArrowDownLeft, ArrowUpRight, CalendarPlus, PiggyBank, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { SettingsLink } from '../../components/layout/AppShell.jsx';
import { Logo } from '../../components/layout/Logo.jsx';
import { AnimatedRupiah } from '../../components/ui/AnimatedNumber.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { addDays, relativeDayLabel, todayISO } from '../../lib/dates.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { periodForDate } from '../../state/scope.js';
import { categoryMap, pace as computePace, rangeInsight, totalsIn, txInRange } from '../../state/selectors.js';
import { InstallPrompt } from '../../pwa/InstallPrompt.jsx';
import { PeriodSwitcher } from '../periods/PeriodSwitcher.jsx';
import { PendingIncome } from '../periods/PeriodsTab.jsx';
import { formatDateShort } from '../../lib/format.js';
import { TransactionItem } from '../transactions/TransactionItem.jsx';
import { BudgetPreview } from './BudgetPreview.jsx';
import { PeriodHero } from './PeriodHero.jsx';
import { GoalsPreview, PeriodCta, TipCard, useEndingSoon } from './SideCards.jsx';
import { StreakCard } from './StreakCard.jsx';
import { TodayCard } from './TodayCard.jsx';
import { WeekChart } from './WeekChart.jsx';
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
  const { range, openQuickAdd, openPeriodForm } = useUi();
  const today = todayISO();

  const totals = useMemo(() => totalsIn(data, range), [data, range]);
  const pace = useMemo(() => computePace(data, range, today), [data, range, today]);
  const insight = useMemo(() => rangeInsight(data, range, today), [data, range, today]);
  const cats = useMemo(() => categoryMap(data), [data]);
  const recent = useMemo(
    () =>
      txInRange(data, range)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
        .slice(0, 5),
    [data, range],
  );
  const endingIn = useEndingSoon(range);
  const hasRunningPeriod = Boolean(periodForDate(data, today));
  const cycle = range.period?.cycleId ? data.cycles.find((c) => c.id === range.period.cycleId) : null;
  const nextAuto = Boolean(cycle?.active && cycle.repeat);

  return (
    <div className="dash">
      <header className="dash__top">
        <div className="dash__hello">
          <span className="dash__logo-m">
            <Logo size={36} withName={false} />
          </span>
          <div>
            <p className="dash__greet">{greeting()} 👋</p>
            <h1 className="dash__title">Uangmu {range.kind === 'period' ? 'periode ini' : 'bulan ini'}</h1>
          </div>
        </div>
        <SettingsLink />
      </header>

      <PeriodSwitcher />

      {endingIn !== null && (
        <div className="banner" role="status">
          {nextAuto ? (
            <span>
              {endingIn === 0 ? 'Periode ini berakhir hari ini.' : `Periode ini berakhir ${endingIn} hari lagi.`} Periode berikutnya otomatis mulai{' '}
              <strong>{formatDateShort(addDays(range.end, 1))}</strong>.
            </span>
          ) : (
            <>
              <span>{endingIn === 0 ? 'Periode ini berakhir hari ini.' : `Periode ini berakhir ${endingIn} hari lagi.`} Siapkan periode berikutnya?</span>
              <Button
                size="sm"
                variant="soft"
                onClick={() => openPeriodForm({ preset: { start: addDays(range.end, 1), mode: 'end', end: addDays(range.end, range.days) } })}
              >
                <CalendarPlus size={16} /> Siapkan
              </Button>
            </>
          )}
        </div>
      )}
      <PendingIncome />

      <div className="dash__grid">
        <div className="dash__col dash__col--main">
          <PeriodHero
            range={range}
            totals={totals}
            pace={pace}
            insight={insight}
            hasPeriods={data.periods.length > 0}
            onAddIncome={() => openQuickAdd({ type: 'income' })}
            onNewPeriod={() => openPeriodForm()}
          />

          <section className="summary" aria-label="Ringkasan">
            <SummaryTile icon={<ArrowDownLeft size={18} />} label="Pemasukan" value={totals.income} tone="income" />
            <SummaryTile icon={<ArrowUpRight size={18} />} label="Pengeluaran" value={totals.expense} tone="expense" />
            <SummaryTile icon={<PiggyBank size={18} />} label="Ditabung" value={totals.saved} tone="saved" />
          </section>

          {pace && pace.level !== 'none' && <TodayCard pace={pace} onAdd={() => openQuickAdd()} />}
          {!hasRunningPeriod && totals.income + totals.expense > 0 && <PeriodCta />}
          <WeekChart allowance={pace?.allowance ?? 0} />
        </div>

        <div className="dash__col dash__col--side">
          <InstallPrompt />
          <StreakCard />
          <BudgetPreview range={range} />
          <GoalsPreview />
          <TipCard />
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
              illustration="notes"
              title={range.status === 'upcoming' ? 'Periode ini belum dimulai' : 'Belum ada catatan di sini'}
              action={
                <Button onClick={() => openQuickAdd()}>
                  <Plus size={18} /> Catat transaksi
                </Button>
              }
            >
              Catatan pertama bisa sesederhana “es teh Rp 5.000”. Cukup 3 ketukan.
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
