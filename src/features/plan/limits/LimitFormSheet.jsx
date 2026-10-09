import { ChevronDown, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { DateField } from '../../../components/ui/DateField.jsx';
import { AmountInput, Chip, Segmented, Switch, TextInput } from '../../../components/ui/Form.jsx';
import { Sheet } from '../../../components/ui/Sheet.jsx';
import { useConfirm } from '../../../hooks/useConfirm.jsx';
import { useToast } from '../../../hooks/useToast.jsx';
import { addDays, todayISO } from '../../../lib/dates.js';
import { formatRupiah } from '../../../lib/format.js';
import { uid } from '../../../lib/id.js';
import { rangeLabel } from '../../../lib/period.js';
import { WEEKDAYS, WEEKDAYS_SHORT } from '../../../lib/windows.js';
import { useData } from '../../../state/AppProvider.jsx';
import { rawTotals } from '../../../state/ledger.js';
import { limitStatus, limitTitle, perPeriodEstimate, referenceRange, validateLimitInput, windowLabel } from '../../../state/limits.js';
import { categoriesByUsage } from '../../../state/selectors.js';

const MAIN_WINDOWS = [
  { value: 'day', label: 'Harian' },
  { value: 'week', label: 'Mingguan' },
  { value: 'month', label: 'Bulanan' },
  { value: 'other', label: 'Lainnya' },
];

const OTHER_WINDOWS = [
  { value: 'ndays', label: 'Per N hari' },
  { value: 'period', label: 'Ikut periode' },
  { value: 'range', label: 'Rentang tanggal' },
];

const AMOUNT_QUICK = {
  day: [15000, 25000, 30000, 50000],
  week: [50000, 100000, 150000, 250000],
  month: [100000, 250000, 500000, 1000000],
  other: [50000, 100000, 250000, 500000],
};

/** Isian awal sebuah batasan. */
export function emptyLimit(today = todayISO(), over = {}) {
  return {
    name: '',
    target: 'total',
    window: { kind: 'day' },
    mode: 'fixed',
    amount: 0,
    percent: 10,
    rollover: 'reset',
    warnAt: 0.8,
    skipRecurring: true,
    active: true,
    since: today,
    ...over,
  };
}

/**
 * Form buat / ubah batasan. `value` = { limit } untuk mengubah, { preset } untuk
 * membuat dengan isian awal, atau {} untuk membuat dari kosong. null = tertutup.
 */
export function LimitFormSheet({ value, onClose }) {
  const { data, dispatch } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const id = useId();
  const today = todayISO();
  const editing = value?.limit ?? null;
  const [v, setV] = useState(() => emptyLimit(today));
  const [touched, setTouched] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!value) return;
    setTouched(false);
    setV(editing ? { ...editing, window: { ...editing.window } } : emptyLimit(today, value.preset ?? {}));
    if (moreRef.current) moreRef.current.open = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const categories = useMemo(() => categoriesByUsage(data, 'expense', today), [data, today]);
  const set = (patch) => setV((x) => ({ ...x, ...patch }));
  const setWindow = (patch) => setV((x) => ({ ...x, window: { ...x.window, ...patch } }));

  const kind = v.window.kind;
  const group = ['day', 'week', 'month'].includes(kind) ? kind : 'other';
  const isTotal = v.target === 'total';

  const chooseGroup = (g) => {
    if (g === 'other') setWindow({ kind: 'ndays', count: v.window.count || 3, anchor: v.window.anchor || today });
    else setV((x) => ({ ...x, window: { kind: g, weekStart: x.window.weekStart ?? 0, monthDay: x.window.monthDay ?? 1 } }));
  };
  const chooseOther = (k) => {
    if (k === 'ndays') setWindow({ kind: k, count: v.window.count || 3, anchor: v.window.anchor || today });
    else if (k === 'range') setWindow({ kind: k, start: v.window.start || today, end: v.window.end || addDays(today, 6) });
    else setWindow({ kind: k });
  };

  // bentuk batasan yang disimpan
  const draft = useMemo(() => {
    const w = { kind };
    if (kind === 'week') w.weekStart = Number(v.window.weekStart) || 0;
    if (kind === 'month') w.monthDay = Number(v.window.monthDay) || 1;
    if (kind === 'ndays') {
      w.count = Math.floor(Number(v.window.count)) || 0;
      w.anchor = v.window.anchor || today;
    }
    if (kind === 'range') {
      w.start = v.window.start;
      w.end = v.window.end;
    }
    return {
      ...v,
      id: editing?.id ?? 'draft',
      name: v.name.trim(),
      window: w,
      amount: v.mode === 'fixed' ? v.amount : 0,
      percent: Number(v.percent) || 0,
      rollover: v.mode === 'auto' ? 'reset' : v.rollover,
      skipRecurring: isTotal ? v.skipRecurring : false,
      since: editing?.since ?? today,
    };
  }, [v, kind, isTotal, editing, today]);

  const { errors, warnings } = validateLimitInput(data, draft, today);
  const shown = touched ? errors : {};
  const valid = Object.keys(errors).length === 0;

  // pratinjau langsung
  const preview = useMemo(() => {
    if (!valid) return null;
    const st = limitStatus(data, { ...draft, active: true }, today);
    const est = perPeriodEstimate(data, draft, today);
    return { st, est };
  }, [data, draft, today, valid]);
  const ref = referenceRange(data, today);
  const refIncome = rawTotals(data, ref).income;

  useEffect(() => {
    if (touched && (errors.count || errors.start || errors.end) && moreRef.current) moreRef.current.open = true;
  }, [touched, errors.count, errors.start, errors.end]);

  const save = () => {
    setTouched(true);
    if (!valid) return;
    const limit = { ...draft, id: editing?.id ?? uid(), createdAt: editing?.createdAt ?? Date.now() };
    if (editing) {
      const before = editing;
      dispatch({ type: 'UPDATE_LIMIT', limit });
      toast({ message: 'Batasan diperbarui.', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'UPDATE_LIMIT', limit: before }) } });
    } else {
      dispatch({ type: 'ADD_LIMIT', limit });
      toast({ message: `Batasan ${limitTitle(data, limit).toLowerCase()} dipasang.`, icon: '🎯', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'DELETE_LIMIT', id: limit.id }) } });
    }
    onClose();
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Hapus batasan ${limitTitle(data, editing).toLowerCase()}?`,
      message: 'Transaksimu tidak ikut terhapus. Kalau hanya ingin istirahat sebentar, kamu bisa menonaktifkannya saja.',
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    const index = data.limits.findIndex((l) => l.id === editing.id);
    const l = editing;
    dispatch({ type: 'DELETE_LIMIT', id: l.id });
    toast({ message: 'Batasan dihapus.', icon: <Trash2 size={16} />, action: { label: 'Urungkan', onClick: () => dispatch({ type: 'RESTORE_LIMIT', limit: l, index }) } });
    onClose();
  };

  const pctAmount = Math.floor((refIncome * (Number(v.percent) || 0)) / 100);

  return (
    <Sheet
      open={Boolean(value)}
      onClose={onClose}
      title={editing ? 'Ubah batasan' : 'Batasan baru'}
      description="Batasi total pengeluaran atau satu kategori, dengan rentang waktu yang kamu pilih sendiri."
      footer={
        <>
          {editing && (
            <Button variant="danger" onClick={remove}>
              <Trash2 size={18} /> Hapus
            </Button>
          )}
          <Button onClick={save}>{editing ? 'Simpan perubahan' : 'Pasang batasan'}</Button>
        </>
      }
    >
      {value && (
        <div className="pf lf">
          {/* 1. untuk apa */}
          <div className="field">
            <span className="field__label">Batasi untuk</span>
            <Segmented
              size="sm"
              label="Batasi untuk"
              value={isTotal ? 'total' : 'category'}
              onChange={(t) => (t === 'total' ? set({ target: 'total' }) : set({ target: categories.find((c) => !c.locked)?.id ?? categories[0]?.id, mode: v.mode === 'auto' ? 'fixed' : v.mode }))}
              options={[
                { value: 'total', label: 'Semua pengeluaran' },
                { value: 'category', label: 'Satu kategori' },
              ]}
            />
            {!isTotal && (
              <div className="chip-row lf__cats" role="group" aria-label="Kategori">
                {categories.map((c) => (
                  <Chip key={c.id} selected={v.target === c.id} onClick={() => set({ target: c.id })}>
                    <span className="chip__emoji" aria-hidden="true">
                      {c.emoji}
                    </span>
                    {c.name}
                  </Chip>
                ))}
              </div>
            )}
            {shown.target && <p className="datefield__error">{shown.target}</p>}
          </div>

          {/* 2. rentang */}
          <div className="field">
            <span className="field__label">Berlaku</span>
            <Segmented size="sm" label="Rentang batasan" value={group} onChange={chooseGroup} options={MAIN_WINDOWS} />
            {group === 'other' && (
              <div className="lf__other">
                <Segmented size="sm" label="Rentang lainnya" value={kind} onChange={chooseOther} options={OTHER_WINDOWS} />
                {kind === 'ndays' && (
                  <div className="lf__ndays">
                    <span>Setiap</span>
                    <label className="sr-only" htmlFor={`${id}-n`}>
                      Jumlah hari
                    </label>
                    <input
                      id={`${id}-n`}
                      className={`input pf__count num ${shown.count ? 'has-error' : ''}`}
                      inputMode="numeric"
                      value={v.window.count ?? ''}
                      onChange={(e) => setWindow({ count: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
                    />
                    <span>hari</span>
                  </div>
                )}
                {kind === 'ndays' && shown.count && <p className="datefield__error">{shown.count}</p>}
                {kind === 'range' && (
                  <div className="pf__range">
                    <DateField passInvalid label="Dari" value={v.window.start || ''} onChange={(start) => setWindow({ start })} error={shown.start} rangeStart={v.window.start} rangeEnd={v.window.end} />
                    <DateField
                      passInvalid
                      label="Sampai"
                      value={v.window.end || ''}
                      onChange={(end) => setWindow({ end })}
                      error={shown.end}
                      min={v.window.start || undefined}
                      minMessage="Tanggal akhir tidak boleh sebelum tanggal mulai."
                      rangeStart={v.window.start}
                      rangeEnd={v.window.end}
                    />
                  </div>
                )}
                {kind === 'period' && <p className="field__hint">Batas berlaku sepanjang periode pemasukan yang sedang berjalan, dan ikut berganti saat periode baru dimulai.</p>}
                {warnings.window && <p className="field__hint pf__warn">{warnings.window}</p>}
              </div>
            )}
          </div>

          {/* 3. besarnya */}
          <div className="field">
            <span className="field__label">Besarnya</span>
            <Segmented
              size="sm"
              label="Cara menentukan batas"
              value={v.mode}
              onChange={(mode) => set({ mode })}
              options={[
                { value: 'fixed', label: 'Nominal' },
                { value: 'percent', label: 'Persen' },
                ...(isTotal ? [{ value: 'auto', label: 'Otomatis' }] : []),
              ]}
            />
          </div>

          {v.mode === 'fixed' && (
            <div className="field">
              <AmountInput label={`Maksimal ${windowLabel(draft)}`} value={v.amount} onChange={(amount) => set({ amount })} />
              {shown.amount && (
                <p className="datefield__error" role="alert">
                  {shown.amount}
                </p>
              )}
              <div className="chip-row pf__quick">
                {AMOUNT_QUICK[group].map((n) => (
                  <Chip key={n} selected={v.amount === n} onClick={() => set({ amount: n })}>
                    {formatRupiah(n)}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {v.mode === 'percent' && (
            <div className="field">
              <label className="field__label" htmlFor={`${id}-pct`}>
                Maksimal berapa persen dari pemasukan periode?
              </label>
              <div className="lf__pct">
                <input
                  id={`${id}-pct`}
                  className={`input pf__count num ${shown.percent ? 'has-error' : ''}`}
                  inputMode="decimal"
                  value={v.percent}
                  onChange={(e) => set({ percent: e.target.value.replace(/[^\d.,]/g, '').replace(',', '.').slice(0, 5) })}
                />
                <span className="lf__pct-sign">%</span>
                <span className="muted lf__pct-eq num">
                  {refIncome > 0 ? `≈ ${formatRupiah(pctAmount)} dari ${formatRupiah(refIncome)}` : 'Belum ada pemasukan di periode ini.'}
                </span>
              </div>
              {shown.percent && <p className="datefield__error">{shown.percent}</p>}
              <div className="chip-row pf__quick">
                {[5, 10, 20, 30].map((n) => (
                  <Chip key={n} selected={Number(v.percent) === n} onClick={() => set({ percent: n })}>
                    {n}%
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {v.mode === 'auto' && (
            <p className="lf__auto">
              <Sparkles size={16} aria-hidden="true" />
              <span>
                Saku menghitung batasnya sendiri: <strong>sisa uang ÷ sisa hari</strong> di periode berjalan. Kalau hari ini hemat, jatah besok ikut naik.
              </span>
            </p>
          )}
          {shown.mode && <p className="datefield__error">{shown.mode}</p>}

          {/* pratinjau */}
          {preview?.st.window ? (
            <div className="pf__preview lf__preview" aria-live="polite">
              <p className="plan__preview-eyebrow">
                <Sparkles size={14} aria-hidden="true" /> Pratinjau
              </p>
              <p className="plan__preview-line">
                <strong className="num">{formatRupiah(preview.st.base)}</strong> {windowLabel(draft)}
                {preview.est && kind !== 'period' && kind !== 'range' && (
                  <>
                    {' '}
                    · ±<span className="num">{formatRupiah(preview.est.amount)}</span> per periode
                  </>
                )}
                {preview.est?.income > 0 && (
                  <>
                    {' '}
                    · <span className="num">{Math.round((preview.est.amount / preview.est.income) * 100)}%</span> dari pemasukan
                  </>
                )}
              </p>
              <p className="plan__preview-next">
                {preview.st.state === 'upcoming' ? 'Mulai berlaku' : 'Rentang sekarang'}: {rangeLabel(preview.st.window.start, preview.st.window.end)}
                {preview.st.state === 'active' && preview.st.safeToday !== null && (
                  <>
                    {' '}
                    · aman dipakai hari ini <strong className="num">{formatRupiah(preview.st.safeToday)}</strong>
                  </>
                )}
              </p>
            </div>
          ) : (
            valid &&
            kind === 'period' && <p className="field__hint">Pratinjau muncul begitu ada periode yang berjalan.</p>
          )}
          {warnings.amount && (
            <p className="lf__warning" role="status">
              {warnings.amount}
            </p>
          )}

          {/* lanjutan */}
          <details className="more" ref={moreRef}>
            <summary className="more__summary">
              <span>Atur lebih detail</span>
              <ChevronDown size={18} aria-hidden="true" className="more__caret" />
            </summary>
            <div className="more__body">
              <div className="field">
                <label className="field__label" htmlFor={`${id}-name`}>
                  Nama <span className="pf__opt">(opsional)</span>
                </label>
                <TextInput id={`${id}-name`} value={v.name} maxLength={40} placeholder={isTotal ? 'mis. Jatah harian' : 'mis. Makan siang'} onChange={(e) => set({ name: e.target.value })} />
              </div>

              {kind === 'week' && (
                <div className="field">
                  <span className="field__label" id={`${id}-wd`}>
                    Minggu dimulai hari
                  </span>
                  <div className="wd-row" role="radiogroup" aria-labelledby={`${id}-wd`}>
                    {WEEKDAYS_SHORT.map((d, i) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={Number(v.window.weekStart ?? 0) === i}
                        aria-label={WEEKDAYS[i]}
                        className={`wd ${Number(v.window.weekStart ?? 0) === i ? 'is-selected' : ''}`}
                        onClick={() => setWindow({ weekStart: i })}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {kind === 'month' && (
                <div className="field">
                  <label className="field__label" htmlFor={`${id}-md`}>
                    Bulan dimulai tanggal
                  </label>
                  <select id={`${id}-md`} className="input select lf__md" value={v.window.monthDay ?? 1} onChange={(e) => setWindow({ monthDay: Number(e.target.value) })}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Tanggal {d}
                      </option>
                    ))}
                  </select>
                  <p className="field__hint">Samakan dengan tanggal uangmu datang, misalnya 25.</p>
                </div>
              )}

              {v.mode !== 'auto' && kind !== 'range' && (
                <div className="field">
                  <span className="field__label">Kalau batas tidak habis</span>
                  <Segmented
                    size="sm"
                    label="Sisa batas"
                    value={v.rollover}
                    onChange={(rollover) => set({ rollover })}
                    options={[
                      { value: 'reset', label: 'Hangus' },
                      { value: 'carry', label: 'Tambah ke berikutnya' },
                    ]}
                  />
                  <p className="field__hint">
                    {v.rollover === 'carry'
                      ? 'Sisa batas hari/minggu ini ditambahkan ke rentang berikutnya, sampai periode berakhir.'
                      : 'Setiap rentang mulai lagi dari batas yang sama.'}
                  </p>
                </div>
              )}

              <div className="field">
                <label className="field__label" htmlFor={`${id}-warn`}>
                  Beri tanda saat terpakai <span className="num lf__warn-val">{Math.round(v.warnAt * 100)}%</span>
                </label>
                <input
                  id={`${id}-warn`}
                  type="range"
                  className="lf__range"
                  min={50}
                  max={100}
                  step={5}
                  value={Math.round(v.warnAt * 100)}
                  onChange={(e) => set({ warnAt: Number(e.target.value) / 100 })}
                  aria-valuetext={`${Math.round(v.warnAt * 100)} persen`}
                />
                <p className="field__hint">Warnanya berubah jadi kuning madu saat mendekati batas. Tidak ada bunyi atau pesan yang menghakimi.</p>
              </div>

              {isTotal && (
                <Switch
                  checked={v.skipRecurring}
                  onChange={(skipRecurring) => set({ skipRecurring })}
                  label="Abaikan transaksi rutin"
                  description="Tagihan rutin seperti bayar kos tidak dihitung ke batas ini."
                />
              )}
            </div>
          </details>
        </div>
      )}
    </Sheet>
  );
}
