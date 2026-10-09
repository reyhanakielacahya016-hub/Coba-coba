import { Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { PageHeader, SettingsLink } from '../../components/layout/AppShell.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Segmented } from '../../components/ui/Form.jsx';
import { formatDateShort, formatRupiah } from '../../lib/format.js';
import { relativeDayLabel } from '../../lib/dates.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { categoryMap, filterTransactions, groupByDay, sortCategories } from '../../state/selectors.js';
import { FilterSheet, presetRange, PRESETS } from './FilterSheet.jsx';
import { TransactionItem } from './TransactionItem.jsx';
import './History.css';

const PAGE = 20; // jumlah hari yang ditampilkan per "halaman"

export function HistoryPage() {
  const { data } = useData();
  const { openQuickAdd, range: scopeRange } = useUi();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [categoryIds, setCategoryIds] = useState([]);
  const [range, setRange] = useState({ preset: 'all', from: '', to: '' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const deferredQ = useDeferredValue(q);

  const cats = useMemo(() => categoryMap(data), [data]);
  const list = useMemo(
    () => filterTransactions(data, { q: deferredQ, type, categoryIds, from: range.from, to: range.to }),
    [data, deferredQ, type, categoryIds, range],
  );
  const groups = useMemo(() => groupByDay(list), [list]);
  const totals = useMemo(
    () => list.reduce((acc, t) => ((acc[t.type] += t.amount), acc), { expense: 0, income: 0 }),
    [list],
  );

  const activeFilters = categoryIds.length + (range.preset !== 'all' ? 1 : 0);
  const anyFilter = activeFilters > 0 || type !== 'all' || q.trim();
  const clearAll = () => {
    setQ('');
    setType('all');
    setCategoryIds([]);
    setRange({ preset: 'all', from: '', to: '' });
  };

  const rangeLabel =
    range.preset === 'custom'
      ? `${range.from ? formatDateShort(range.from) : '…'} – ${range.to ? formatDateShort(range.to) : '…'}`
      : range.preset === 'scope'
        ? scopeRange.title
        : PRESETS.find((p) => p.value === range.preset)?.label;

  return (
    <div className="history">
      <PageHeader title="Riwayat" actions={<SettingsLink />} />

      <div className="history__tools">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Cari transaksi</span>
          <input
            type="search"
            placeholder="Cari catatan, kategori, atau nominal"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
          />
          {q && (
            <button type="button" className="search__clear" onClick={() => setQ('')} aria-label="Hapus pencarian">
              <X size={16} />
            </button>
          )}
        </label>

        <div className="history__filters">
          <Segmented
            size="sm"
            label="Jenis"
            value={type}
            onChange={(v) => {
              setType(v);
              setLimit(PAGE);
            }}
            options={[
              { value: 'all', label: 'Semua' },
              { value: 'expense', label: 'Keluar' },
              { value: 'income', label: 'Masuk' },
            ]}
          />
          <button type="button" className={`filter-btn ${activeFilters ? 'is-active' : ''}`} onClick={() => setFilterOpen(true)}>
            <SlidersHorizontal size={17} />
            Filter
            {activeFilters > 0 && <span className="filter-btn__count">{activeFilters}</span>}
          </button>
        </div>

        {activeFilters > 0 && (
          <div className="chip-row history__active">
            {range.preset !== 'all' && (
              <button type="button" className="tag" onClick={() => setRange({ preset: 'all', from: '', to: '' })}>
                {rangeLabel} <X size={14} aria-label="hapus" />
              </button>
            )}
            {categoryIds.map((id) => {
              const c = cats.get(id);
              if (!c) return null;
              return (
                <button key={id} type="button" className="tag" onClick={() => setCategoryIds((ids) => ids.filter((x) => x !== id))}>
                  {c.emoji} {c.name} <X size={14} aria-label="hapus" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {list.length > 0 && (
        <p className="history__summary" aria-live="polite">
          <span>{list.length} transaksi</span>
          {totals.expense > 0 && <span className="num">keluar {formatRupiah(totals.expense)}</span>}
          {totals.income > 0 && <span className="num is-income">masuk {formatRupiah(totals.income)}</span>}
        </p>
      )}

      {data.transactions.length === 0 ? (
        <EmptyState
          emoji="🗒️"
          title="Riwayatmu masih kosong"
          action={
            <Button onClick={() => openQuickAdd()}>
              <Plus size={18} /> Catat transaksi
            </Button>
          }
        >
          Setiap catatan akan muncul di sini, dikelompokkan per hari.
        </EmptyState>
      ) : list.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="Tidak ada yang cocok"
          action={
            anyFilter && (
              <Button variant="soft" onClick={clearAll}>
                Hapus semua filter
              </Button>
            )
          }
        >
          Coba kata lain atau longgarkan filternya.
        </EmptyState>
      ) : (
        <div className="history__groups">
          {groups.slice(0, limit).map((g) => (
            <section key={g.date} className="day card" aria-label={relativeDayLabel(g.date)}>
              <header className="day__head">
                <h2 className="day__title">{relativeDayLabel(g.date)}</h2>
                <span className="day__total num">
                  {g.expense > 0 && <span>−{formatRupiah(g.expense)}</span>}
                  {g.income > 0 && <span className="is-income">+{formatRupiah(g.income)}</span>}
                </span>
              </header>
              <ul className="tx-list">
                {g.items.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} category={cats.get(tx.categoryId)} onClick={() => openQuickAdd({ edit: tx })} />
                ))}
              </ul>
            </section>
          ))}
          {groups.length > limit && (
            <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>
              Tampilkan lebih banyak
            </Button>
          )}
        </div>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={sortCategories(data.categories.filter((c) => type === 'all' || c.type === type))}
        categoryIds={categoryIds}
        range={range}
        scopeRange={scopeRange}
        onApply={(ids, r) => {
          setCategoryIds(ids);
          setRange(r.preset === 'custom' ? r : { preset: r.preset, ...presetRange(r.preset, scopeRange) });
          setLimit(PAGE);
          setFilterOpen(false);
        }}
      />
    </div>
  );
}
