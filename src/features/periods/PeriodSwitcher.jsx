import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Button, IconButton } from '../../components/ui/Button.jsx';
import { Sheet } from '../../components/ui/Sheet.jsx';
import { addMonths, currentMonth } from '../../lib/dates.js';
import { formatMonth, formatRupiah, MONTHS_SHORT } from '../../lib/format.js';
import { periodTitle, rangeLabel } from '../../lib/period.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { adjacentScope, periodStatus, sortedPeriods, STATUS_LABEL } from '../../state/scope.js';
import { totalsIn } from '../../state/selectors.js';
import './Periods.css';

/**
 * Tombol pintas periode: ‹ [nama periode] › — ketuk nama untuk memilih
 * periode lain, bulan kalender, atau membuat periode baru.
 */
export function PeriodSwitcher() {
  const { data } = useData();
  const { range, setScope, openScopeSheet } = useUi();
  const prev = adjacentScope(data, range, -1);
  const next = adjacentScope(data, range, 1);

  return (
    <div className="pswitch" role="group" aria-label="Periode yang dilihat">
      <IconButton label={range.kind === 'period' ? 'Periode sebelumnya' : 'Bulan sebelumnya'} onClick={() => prev && setScope(prev)} disabled={!prev}>
        <ChevronLeft size={20} />
      </IconButton>
      <button type="button" className="pswitch__label" onClick={openScopeSheet} aria-haspopup="dialog">
        <span className="pswitch__icon" aria-hidden="true">
          <CalendarRange size={16} />
        </span>
        <span className="pswitch__text">
          <span className="pswitch__title">{range.title}</span>
          <span className="pswitch__sub">
            {range.sub}
            {range.status === 'active' && range.kind === 'period' && <span className="pswitch__live"> · berjalan</span>}
          </span>
        </span>
        <ChevronDown size={16} className="pswitch__caret" aria-hidden="true" />
      </button>
      <IconButton label={range.kind === 'period' ? 'Periode berikutnya' : 'Bulan berikutnya'} onClick={() => next && setScope(next)} disabled={!next}>
        <ChevronRight size={20} />
      </IconButton>
    </div>
  );
}

/** Lembar "Pilih periode": daftar periode, bulan kalender, dan tombol buat periode baru. */
export function ScopeSheet() {
  const { data } = useData();
  const { scopeSheet, closeScopeSheet, range, setScope, openPeriodForm } = useUi();

  const periods = useMemo(
    () =>
      sortedPeriods(data)
        .reverse()
        .map((p) => ({ p, status: periodStatus(p), totals: totalsIn(data, p) })),
    [data],
  );
  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => addMonths(currentMonth(), -i)), []);

  const choose = (scope) => {
    setScope(scope);
    closeScopeSheet();
  };

  return (
    <Sheet
      open={scopeSheet}
      onClose={closeScopeSheet}
      title="Pilih periode"
      description="Semua halaman (beranda, riwayat, batasan, statistik) akan menghitung berdasarkan pilihan ini."
      footer={
        <Button
          onClick={() => {
            closeScopeSheet();
            openPeriodForm();
          }}
        >
          <Plus size={18} /> Buat periode baru
        </Button>
      }
    >
      <div className="stack">
        <section className="scope-group" aria-labelledby="sg-p">
          <h3 id="sg-p" className="scope-group__title">
            Periode pemasukan
          </h3>
          {periods.length === 0 ? (
            <p className="muted scope-empty">
              Belum ada periode. Buat periode untuk menghitung sisa uang dari kiriman satu ke kiriman berikutnya, misalnya tanggal 25 sampai 24
              bulan depan.
            </p>
          ) : (
            <ul className="scope-list">
              {periods.map(({ p, status, totals }) => {
                const active = range.kind === 'period' && range.id === p.id;
                return (
                  <li key={p.id} className="scope-item">
                    <button type="button" className={`scope-opt ${active ? 'is-active' : ''}`} onClick={() => choose({ kind: 'period', id: p.id })} aria-pressed={active}>
                      <span className="scope-opt__main">
                        <span className="scope-opt__title">{periodTitle(p)}</span>
                        <span className="scope-opt__sub">{rangeLabel(p.start, p.end)}</span>
                      </span>
                      <span className="scope-opt__side">
                        <span className={`badge badge--p-${status}`}>{STATUS_LABEL[status]}</span>
                        <span className={`num scope-opt__left ${totals.remaining < 0 ? 'is-neg' : ''}`}>sisa {formatRupiah(totals.remaining)}</span>
                      </span>
                    </button>
                    <IconButton
                      label={`Ubah ${periodTitle(p)}`}
                      onClick={() => {
                        closeScopeSheet();
                        openPeriodForm({ period: p });
                      }}
                    >
                      <Pencil size={16} />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="scope-group" aria-labelledby="sg-m">
          <h3 id="sg-m" className="scope-group__title">
            Bulan kalender
          </h3>
          <div className="chip-row">
            {months.map((m) => {
              const active = range.kind === 'month' && range.month === m;
              const [y, mm] = m.split('-').map(Number);
              return (
                <button key={m} type="button" className={`chip ${active ? 'is-selected' : ''}`} aria-pressed={active} onClick={() => choose({ kind: 'month', month: m })}>
                  {m === currentMonth() ? formatMonth(m) : `${MONTHS_SHORT[mm - 1]} ${y}`}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Sheet>
  );
}
