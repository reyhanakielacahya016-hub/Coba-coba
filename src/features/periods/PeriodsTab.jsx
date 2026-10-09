import { ArrowRight, BellRing, CalendarClock, CalendarPlus, Eye, PauseCircle, Pencil, PiggyBank, Repeat2, Settings2 } from 'lucide-react';
import { useMemo } from 'react';
import { AnimatedRupiah } from '../../components/ui/AnimatedNumber.jsx';
import { Button, IconButton } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { addDays, daysInclusive, todayISO } from '../../lib/dates.js';
import { formatDateShort, formatRupiah } from '../../lib/format.js';
import { uid } from '../../lib/id.js';
import { lengthLabel, periodTitle, rangeLabel } from '../../lib/period.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { CARRY_OPTIONS, cycleRuleLabel } from '../../state/cycles.js';
import { periodLedger } from '../../state/ledger.js';
import { periodStatus, sortedPeriods, STATUS_LABEL } from '../../state/scope.js';
import { pace as computePace } from '../../state/selectors.js';
import { PERIOD_TEMPLATES } from '../../state/templates.js';
import { PeriodTimeline } from './PeriodFields.jsx';
import { PeriodSwitcher } from './PeriodSwitcher.jsx';
import './Periods.css';

const carryShort = (v) => CARRY_OPTIONS.find((o) => o.value === v)?.short ?? 'Diabaikan';

/** Tab Rencana → Periode: periode yang dilihat, rencana berulang, dan riwayat semua periode. */
export function PeriodsTab() {
  const { data } = useData();
  const { range, setScope, openPeriodForm } = useUi();
  const toast = useToast();
  const today = todayISO();
  const ledger = periodLedger(data);

  const list = useMemo(
    () =>
      sortedPeriods(data)
        .reverse()
        .map((p) => ({ p, status: periodStatus(p, today), row: ledger.get(p.id) })),
    [data, today, ledger],
  );
  const cycles = data.cycles.filter((c) => c.repeat);

  const view = (p) => {
    setScope({ kind: 'period', id: p.id });
    toast({ message: `Menampilkan ${periodTitle(p)} di semua halaman.`, icon: <Eye size={16} /> });
  };

  if (list.length === 0) {
    return (
      <div className="stack">
        <div className="card">
          <EmptyState
            illustration="calendar"
            title="Belum ada periode"
            action={
              <Button onClick={() => openPeriodForm()}>
                <CalendarPlus size={18} /> Atur periode
              </Button>
            }
          >
            Periode adalah rentang waktu uangmu harus cukup, misalnya dari kiriman tanggal 25 sampai tanggal 24 bulan depan. Saku lalu menghitung sisa uang & jatah harian
            untuk rentang itu.
          </EmptyState>
          <TemplateChips onPick={(id) => openPeriodForm({ template: id })} />
        </div>
        <ExplainCard />
      </div>
    );
  }

  const focus = range.kind === 'period' ? list.find((x) => x.p.id === range.id) : null;

  return (
    <div className="stack">
      <PeriodSwitcher />
      {focus ? <FocusCard item={focus} /> : <MonthNote />}
      <PendingIncome />

      {cycles.length > 0 && (
        <section className="section" aria-labelledby="cyc-title">
          <h2 id="cyc-title" className="section__title plan__subtitle">
            Rencana berulang
          </h2>
          <div className="stack">
            {cycles.map((c) => (
              <CycleCard key={c.id} cycle={c} />
            ))}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="hist-title">
        <div className="section__head">
          <h2 id="hist-title" className="section__title plan__subtitle">
            Riwayat periode
          </h2>
          <Button size="sm" variant="soft" onClick={() => openPeriodForm()}>
            <CalendarPlus size={16} /> Baru
          </Button>
        </div>
        <ul className="period-list enter-stagger">
          {list.map(({ p, status, row }) => {
            const spentShare = row.income + row.carryIn ? Math.min(1, (row.expense + row.saved) / (row.income + row.carryIn)) : 0;
            const viewing = range.kind === 'period' && range.id === p.id;
            return (
              <li key={p.id} className={`period-row card ${viewing ? 'is-viewing' : ''}`}>
                <button type="button" className="period-row__main" onClick={() => view(p)} aria-label={`Tampilkan ${periodTitle(p)}`}>
                  <span className="period-row__top">
                    <span className="period-row__title">{periodTitle(p)}</span>
                    <span className={`badge badge--p-${status}`}>{STATUS_LABEL[status]}</span>
                  </span>
                  <span className="period-row__range">
                    {rangeLabel(p.start, p.end)} · {lengthLabel(p.start, p.end)}
                  </span>
                  <span className="period-row__bar" aria-hidden="true">
                    <span style={{ width: `${spentShare * 100}%` }} className={row.remaining < 0 ? 'is-neg' : ''} />
                  </span>
                  <span className="period-row__nums num">
                    <span>
                      Masuk <strong>{formatRupiah(row.income)}</strong>
                    </span>
                    <span>
                      Keluar <strong>{formatRupiah(row.expense)}</strong>
                    </span>
                    <span className={row.remaining < 0 ? 'is-neg' : 'is-pos'}>
                      Sisa <strong>{formatRupiah(row.remaining)}</strong>
                    </span>
                  </span>
                  <CarryBadges p={p} row={row} status={status} />
                </button>
                <IconButton label={`Ubah ${periodTitle(p)}`} onClick={() => openPeriodForm({ period: p })}>
                  <Pencil size={16} />
                </IconButton>
              </li>
            );
          })}
        </ul>
        {cycles.every((c) => !c.active) && <ContinueBanner latest={list[0].p} />}
      </section>
      <ExplainCard />
    </div>
  );
}

/** Lencana kecil: sisa yang masuk dari periode lalu, yang dibawa keluar, atau yang ke tabungan. */
function CarryBadges({ p, row, status }) {
  const { data } = useData();
  const items = [];
  if (row.carryIn > 0) items.push({ key: 'in', cls: 'is-in', text: `+${formatRupiah(row.carryIn)} dari periode lalu` });
  if (p.settled?.amount > 0) {
    const g = data.goals.find((x) => x.id === p.settled.goalId);
    items.push({ key: 'save', cls: 'is-save', text: `${formatRupiah(p.settled.amount)} ke ${g ? g.name : 'tabungan'}` });
  } else if (status === 'done' && row.carryOut > 0) items.push({ key: 'out', cls: 'is-out', text: `${formatRupiah(row.carryOut)} dibawa` });
  if (!items.length) return null;
  return (
    <span className="carry-badges">
      {items.map((x) => (
        <span key={x.key} className={`carry-badge ${x.cls}`}>
          {x.text}
        </span>
      ))}
    </span>
  );
}

/** Kartu periode yang sedang dilihat: rincian uang, jatah harian, dan aturan sisanya. */
function FocusCard({ item }) {
  const { data } = useData();
  const { openPeriodForm, setScope } = useUi();
  const { p, status, row } = item;
  const today = todayISO();
  const pace = status === 'active' ? computePace(data, p, today) : null;
  const cycle = p.cycleId ? data.cycles.find((c) => c.id === p.cycleId) : null;
  const goal = p.goalId ? data.goals.find((g) => g.id === p.goalId) : null;
  const eyebrow = { active: 'Sedang berjalan', done: 'Sudah selesai', upcoming: 'Akan datang' }[status];

  let carryText = '';
  if (p.settled) carryText = p.settled.amount > 0 ? `Sisa ${formatRupiah(p.settled.amount)} sudah disetor ke ${goal?.name ?? 'tabungan'}.` : 'Tidak ada sisa untuk ditabung.';
  else if (p.carry === 'carry') carryText = status === 'done' ? `Sisa ${formatRupiah(Math.max(0, row.remaining))} dibawa ke periode berikutnya.` : 'Sisa nanti dibawa ke periode berikutnya.';
  else if (p.carry === 'save') carryText = `Sisa nanti disetor ke ${goal?.name ?? 'tabungan'} saat periode selesai.`;
  else carryText = 'Sisa uang tidak dibawa ke periode berikutnya.';

  return (
    <section className="card running" aria-labelledby="run-title">
      <div className="running__head">
        <div>
          <p className="running__eyebrow">{eyebrow}</p>
          <h2 id="run-title" className="running__title">
            {periodTitle(p)}
          </h2>
          <p className="muted running__range">
            {rangeLabel(p.start, p.end)} · {lengthLabel(p.start, p.end)}
          </p>
        </div>
        <IconButton label={`Ubah ${periodTitle(p)}`} onClick={() => openPeriodForm({ period: p })}>
          <Pencil size={18} />
        </IconButton>
      </div>
      <PeriodTimeline start={p.start} end={p.end} today={today} />

      <dl className="ledger">
        {row.carryIn > 0 && (
          <div className="ledger__row is-in">
            <dt>Sisa periode lalu</dt>
            <dd className="num">+{formatRupiah(row.carryIn)}</dd>
          </div>
        )}
        <div className="ledger__row">
          <dt>Pemasukan</dt>
          <dd className="num">+{formatRupiah(row.income)}</dd>
        </div>
        <div className="ledger__row">
          <dt>Pengeluaran</dt>
          <dd className="num">−{formatRupiah(row.expense)}</dd>
        </div>
        {row.saved !== 0 && (
          <div className="ledger__row">
            <dt>Ditabung</dt>
            <dd className="num">−{formatRupiah(row.saved)}</dd>
          </div>
        )}
        <div className="ledger__row ledger__total">
          <dt>Sisa uang</dt>
          <dd>
            <AnimatedRupiah value={row.remaining} className={`num ${row.remaining < 0 ? 'is-neg' : ''}`} />
          </dd>
        </div>
      </dl>

      {pace && (
        <div className="running__stats">
          <div>
            <span className="running__label">Jatah harian</span>
            <AnimatedRupiah value={pace.allowance} className="running__value" />
          </div>
          <div>
            <span className="running__label">Sisa hari</span>
            <span className="running__value num">{pace.daysLeft}</span>
          </div>
        </div>
      )}

      <p className="running__carry">
        {p.carry === 'save' ? <PiggyBank size={16} aria-hidden="true" /> : <Repeat2 size={16} aria-hidden="true" />}
        <span>
          {cycle ? carryText.replace(/\.$/, '') : carryText}
          {cycle && <span className="muted"> · {cycleRuleLabel(cycle)}.</span>}
        </span>
      </p>

      <div className="running__actions">
        <a className="btn btn--soft btn--sm" href="#/" onClick={() => setScope({ kind: 'period', id: p.id })}>
          Lihat di beranda <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
}

function MonthNote() {
  const { range, setScope } = useUi();
  const { data } = useData();
  const running = sortedPeriods(data).find((p) => periodStatus(p) === 'active');
  return (
    <section className="card running running--none">
      <p className="running__eyebrow">Sedang melihat bulan kalender</p>
      <p className="muted">
        {range.title} dihitung dari tanggal 1 sampai akhir bulan. Pilih salah satu periode di bawah untuk melihat sisa uang, sisa bawaan, dan jatah hariannya.
      </p>
      {running && (
        <div className="running__actions">
          <Button size="sm" variant="soft" onClick={() => setScope({ kind: 'period', id: running.id })}>
            <Eye size={16} /> Lihat {periodTitle(running)}
          </Button>
        </div>
      )}
    </section>
  );
}

/** Pengingat: pemasukan periode yang tidak dicatat otomatis dan belum dicatat. */
export function PendingIncome() {
  const { data, dispatch } = useData();
  const toast = useToast();
  const today = todayISO();
  const pending = data.periods.filter((p) => {
    if (p.start > today || p.end < today || !p.cycleId) return false;
    const c = data.cycles.find((x) => x.id === p.cycleId);
    if (!c?.income || c.income.auto) return false;
    return !data.transactions.some((t) => t.periodId === p.id && t.type === 'income');
  });
  if (!pending.length) return null;
  return pending.map((p) => {
    const c = data.cycles.find((x) => x.id === p.cycleId);
    const record = () => {
      const tx = {
        id: uid(),
        type: 'income',
        amount: c.income.amount,
        categoryId: c.income.categoryId,
        date: today < p.start ? p.start : today,
        note: c.name || 'Pemasukan periode',
        recurringId: null,
        periodId: p.id,
        auto: false,
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_TX', tx });
      toast({ message: `Pemasukan ${formatRupiah(tx.amount)} dicatat.`, icon: '💌', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'DELETE_TX', id: tx.id }) } });
    };
    return (
      <div key={p.id} className="suggest-banner suggest-banner--static">
        <BellRing size={18} aria-hidden="true" />
        <span>
          Sudah terima <strong>{c.name || 'pemasukan'}</strong> untuk {periodTitle(p)}? Catat <strong className="num">{formatRupiah(c.income.amount)}</strong> dengan satu ketukan.
        </span>
        <Button size="sm" onClick={record}>
          Catat
        </Button>
      </div>
    );
  });
}

/** Kartu satu rencana berulang. */
function CycleCard({ cycle }) {
  const { data } = useData();
  const { openPeriodForm } = useUi();
  const cat = cycle.income ? data.categories.find((c) => c.id === cycle.income.categoryId) : null;
  const goal = cycle.goalId ? data.goals.find((g) => g.id === cycle.goalId) : null;
  const next = cycle.until ? addDays(cycle.until, 1) : cycle.anchor;
  return (
    <article className={`card cycle ${cycle.active ? '' : 'is-paused'}`}>
      <span className="cycle__icon" aria-hidden="true">
        {cycle.active ? <CalendarClock size={20} /> : <PauseCircle size={20} />}
      </span>
      <div className="cycle__body">
        <h3 className="cycle__title">{cycle.name || 'Periode berulang'}</h3>
        <p className="cycle__rule">{cycleRuleLabel(cycle)}</p>
        <ul className="cycle__facts">
          <li>
            {cycle.income
              ? `${cat?.emoji ?? '💌'} ${formatRupiah(cycle.income.amount)} ${cycle.income.auto ? 'dicatat otomatis' : 'diingatkan untuk dicatat'}`
              : 'Tanpa pemasukan otomatis'}
          </li>
          <li>Sisa: {cycle.carry === 'save' ? `ke ${goal?.name ?? 'tabungan'}` : carryShort(cycle.carry).toLowerCase()}</li>
          <li>{cycle.active ? `Periode berikutnya mulai ${formatDateShort(next)}` : 'Pengulangan sedang dihentikan'}</li>
        </ul>
      </div>
      <IconButton label={`Ubah aturan ${cycle.name}`} onClick={() => openPeriodForm({ cycle })}>
        <Settings2 size={18} />
      </IconButton>
    </article>
  );
}

/** Tidak ada rencana berulang aktif: tawarkan periode berikutnya dengan panjang sama. */
function ContinueBanner({ latest }) {
  const { openPeriodForm } = useUi();
  return (
    <button
      type="button"
      className="suggest-banner"
      onClick={() => openPeriodForm({ preset: { start: addDays(latest.end, 1), mode: 'end', end: addDays(latest.end, daysInclusive(latest.start, latest.end)) } })}
    >
      <Repeat2 size={18} aria-hidden="true" />
      <span>
        Siapkan periode berikutnya mulai <strong>{formatDateShort(addDays(latest.end, 1))}</strong>, atau atur supaya berulang otomatis.
      </span>
    </button>
  );
}

export function TemplateChips({ onPick }) {
  return (
    <div className="period-ideas">
      <p className="muted">Mulai cepat dengan template:</p>
      <div className="tpl-row tpl-row--compact">
        {PERIOD_TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="tpl" onClick={() => onPick(t.id)}>
            <span className="tpl__emoji" aria-hidden="true">
              {t.emoji}
            </span>
            <span className="tpl__title">{t.title}</span>
            <span className="tpl__desc">{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ExplainCard() {
  return (
    <section className="card explain" aria-labelledby="exp-title">
      <h2 id="exp-title" className="section__title">
        Cara kerja periode
      </h2>
      <ol className="explain__list">
        <li>
          <strong>Pilih ritmenya</strong>: harian, mingguan (hari mulai bebas), bulanan (tanggal mulai bebas, misalnya 25), atau kustom.
        </li>
        <li>
          <strong>Isi pemasukannya</strong> dan nyalakan “Ulangi otomatis”. Periode baru dibuat sendiri saat periode lama selesai.
        </li>
        <li>
          <strong>Tentukan nasib sisa uang</strong>: dibawa ke periode berikutnya, dipindah ke tabungan, atau diabaikan. Data lama tetap tersimpan.
        </li>
      </ol>
    </section>
  );
}
