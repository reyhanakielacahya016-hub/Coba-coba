import { ArrowRight, CalendarPlus, Eye, Pencil, Repeat2 } from 'lucide-react';
import { useMemo } from 'react';
import { AnimatedRupiah } from '../../components/ui/AnimatedNumber.jsx';
import { Button, IconButton } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { addDays, currentMonth, todayISO } from '../../lib/dates.js';
import { formatDateShort, formatRupiah } from '../../lib/format.js';
import { describeLength, lengthLabel, periodTitle, rangeLabel } from '../../lib/period.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { periodStatus, sortedPeriods, STATUS_LABEL } from '../../state/scope.js';
import { pace as computePace, totalsIn } from '../../state/selectors.js';
import { PeriodTimeline } from './PeriodFields.jsx';
import './Periods.css';

/** Tab Rencana → Periode: periode berjalan + riwayat semua periode. */
export function PeriodsTab() {
  const { data } = useData();
  const { range, setScope, openPeriodForm } = useUi();
  const toast = useToast();
  const today = todayISO();

  const list = useMemo(
    () =>
      sortedPeriods(data)
        .reverse()
        .map((p) => ({ p, status: periodStatus(p, today), totals: totalsIn(data, p) })),
    [data, today],
  );
  const running = list.find((x) => x.status === 'active');
  const runningPace = running ? computePace(data, running.p, today) : null;
  const latest = list[0]?.p;

  const view = (p) => {
    setScope({ kind: 'period', id: p.id });
    toast({ message: `Menampilkan ${periodTitle(p)} di semua halaman.`, icon: <Eye size={16} /> });
  };

  // lanjutkan periode terakhir dengan panjang yang sama
  const continueLatest = () => {
    const len = describeLength(latest.start, latest.end);
    openPeriodForm({ preset: { start: addDays(latest.end, 1), mode: 'length', count: String(len.count), unit: len.unit } });
  };

  if (list.length === 0) {
    const m = currentMonth();
    return (
      <div className="stack">
        <div className="card">
          <EmptyState
            illustration="calendar"
            title="Belum ada periode pemasukan"
            action={
              <Button onClick={() => openPeriodForm()}>
                <CalendarPlus size={18} /> Buat periode
              </Button>
            }
          >
            Periode adalah rentang waktu uangmu harus cukup, misalnya dari kiriman tanggal 25 sampai tanggal 24 bulan depan. Saku lalu menghitung sisa uang & jatah
            harian untuk rentang itu.
          </EmptyState>
          <div className="period-ideas">
            <p className="muted">Mulai cepat:</p>
            <div className="chip-row">
              <button type="button" className="chip" onClick={() => openPeriodForm({ preset: { start: today, count: '1', unit: 'month' } })}>
                Mulai hari ini · 1 bulan
              </button>
              <button type="button" className="chip" onClick={() => openPeriodForm({ preset: { start: `${m}-01`, count: '1', unit: 'month' } })}>
                Tanggal 1 · 1 bulan
              </button>
              <button type="button" className="chip" onClick={() => openPeriodForm({ preset: { start: today, count: '2', unit: 'week' } })}>
                2 minggu dari hari ini
              </button>
            </div>
          </div>
        </div>
        <ExplainCard />
      </div>
    );
  }

  return (
    <div className="stack">
      {running && runningPace ? (
        <section className="card running" aria-labelledby="run-title">
          <div className="running__head">
            <div>
              <p className="running__eyebrow">Sedang berjalan</p>
              <h2 id="run-title" className="running__title">
                {periodTitle(running.p)}
              </h2>
              <p className="muted running__range">
                {rangeLabel(running.p.start, running.p.end)} · {lengthLabel(running.p.start, running.p.end)}
              </p>
            </div>
            <IconButton label={`Ubah ${periodTitle(running.p)}`} onClick={() => openPeriodForm({ period: running.p })}>
              <Pencil size={18} />
            </IconButton>
          </div>
          <PeriodTimeline start={running.p.start} end={running.p.end} today={today} />
          <div className="running__stats">
            <div>
              <span className="running__label">Sisa uang</span>
              <AnimatedRupiah value={running.totals.remaining} className={`running__value ${running.totals.remaining < 0 ? 'is-neg' : ''}`} />
            </div>
            <div>
              <span className="running__label">Jatah harian</span>
              <AnimatedRupiah value={runningPace.allowance} className="running__value" />
            </div>
            <div>
              <span className="running__label">Sisa hari</span>
              <span className="running__value num">{runningPace.daysLeft}</span>
            </div>
          </div>
          <div className="running__actions">
            {!(range.kind === 'period' && range.id === running.p.id) && (
              <Button size="sm" variant="soft" onClick={() => view(running.p)}>
                <Eye size={16} /> Tampilkan periode ini
              </Button>
            )}
            <a className="btn btn--ghost btn--sm" href="#/" onClick={() => setScope({ kind: 'period', id: running.p.id })}>
              Ke beranda <ArrowRight size={16} />
            </a>
          </div>
        </section>
      ) : (
        <section className="card running running--none">
          <p className="running__eyebrow">Tidak ada periode yang berjalan hari ini</p>
          <p className="muted">Periode terakhirmu sudah selesai. Lanjutkan dengan periode baru supaya jatah harian tetap terhitung.</p>
          <div className="running__actions">
            <Button size="sm" onClick={continueLatest}>
              <Repeat2 size={16} /> Lanjutkan periode berikutnya
            </Button>
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
          {list.map(({ p, status, totals }) => {
            const used = totals.income ? Math.min(1, (totals.expense + totals.saved) / totals.income) : 0;
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
                    <span style={{ width: `${used * 100}%` }} className={totals.remaining < 0 ? 'is-neg' : ''} />
                  </span>
                  <span className="period-row__nums num">
                    <span>
                      Masuk <strong>{formatRupiah(totals.income)}</strong>
                    </span>
                    <span>
                      Keluar <strong>{formatRupiah(totals.expense)}</strong>
                    </span>
                    <span className={totals.remaining < 0 ? 'is-neg' : 'is-pos'}>
                      Sisa <strong>{formatRupiah(totals.remaining)}</strong>
                    </span>
                  </span>
                </button>
                <IconButton label={`Ubah ${periodTitle(p)}`} onClick={() => openPeriodForm({ period: p })}>
                  <Pencil size={16} />
                </IconButton>
              </li>
            );
          })}
        </ul>
        {latest && running && (
          <button type="button" className="suggest-banner" onClick={continueLatest}>
            <Repeat2 size={18} aria-hidden="true" />
            <span>
              Siapkan periode berikutnya mulai <strong>{formatDateShort(addDays(latest.end, 1))}</strong> dengan panjang yang
              sama.
            </span>
          </button>
        )}
      </section>
      <ExplainCard />
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
          <strong>Catat pemasukan</strong> (kiriman, gaji, beasiswa) dan nyalakan “Mulai periode baru”.
        </li>
        <li>
          <strong>Tentukan lamanya</strong>: misalnya 1 bulan, 3 minggu, 10 hari, atau pilih tanggal berakhir.
        </li>
        <li>
          <strong>Saku menghitung</strong> sisa uang dan jatah harian sampai periode selesai. Data lama tetap tersimpan.
        </li>
      </ol>
    </section>
  );
}
