import { ChevronDown, PiggyBank, Repeat2, Sparkles, Wallet } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { DateField } from '../../components/ui/DateField.jsx';
import { AmountInput, Chip, Segmented, Select, Switch, TextInput } from '../../components/ui/Form.jsx';
import { todayISO } from '../../lib/dates.js';
import { formatDateShort, formatRupiah } from '../../lib/format.js';
import { rangeLabel, UNITS } from '../../lib/period.js';
import { WEEKDAYS, WEEKDAYS_SHORT } from '../../lib/windows.js';
import { CARRY_OPTIONS, CYCLE_KINDS, defaultAnchor } from '../../state/cycles.js';
import { PeriodTimeline } from './PeriodFields.jsx';
import { planPreview, planRule } from './plan.js';
import './Periods.css';

const KIND_HINT = {
  daily: 'Cocok untuk uang jajan harian. Setiap hari jadi satu periode.',
  weekly: 'Cocok untuk gaji atau uang saku mingguan.',
  monthly: 'Cocok untuk kiriman bulanan. Tanggal mulainya bebas, tidak harus tanggal 1.',
  custom: 'Atur sendiri: misalnya 10 hari, 2 minggu, 3 bulan, atau pilih tanggal akhirnya.',
};

const CUSTOM_QUICK = [
  { count: 10, unit: 'day', label: '10 hari' },
  { count: 2, unit: 'week', label: '2 minggu' },
  { count: 3, unit: 'month', label: '3 bulan' },
];

const CARRY_ICON = { carry: <Repeat2 size={18} />, save: <PiggyBank size={18} />, ignore: <Wallet size={18} /> };
const CARRY_DESC = {
  carry: 'Sisa uang menambah saldo awal periode berikutnya.',
  save: 'Saat periode selesai, sisanya disetor ke target tabungan.',
  ignore: 'Setiap periode mulai dari pemasukannya sendiri.',
};

/**
 * Isian rencana periode: jenis, aturan, pengulangan, pemasukan, pratinjau,
 * lalu "Atur lebih detail" (nama, tanggal mulai, sisa uang).
 * mode 'edit' = mengubah aturan siklus yang sudah berjalan.
 */
export function PlanFields({ value, onChange, errors = {}, warnings = {}, incomeCategories, goals, mode = 'create', overlapNote }) {
  const id = useId();
  const today = todayISO();
  const set = (patch) => {
    const next = { ...value, ...patch };
    // tanggal mulai ikut menyesuaikan selama belum diubah sendiri
    if (next.anchorAuto && mode === 'create' && ('kind' in patch || 'weekStart' in patch || 'monthDay' in patch)) {
      next.anchor = defaultAnchor(planRule(next), today);
    }
    onChange(next);
  };
  const preview = planPreview(value, today);
  const isCustom = value.kind === 'custom';
  // buka "Atur lebih detail" kalau ada kesalahan di dalamnya
  const moreRef = useRef(null);
  const detailError = Boolean(errors.goalId || (errors.anchor && !(isCustom && value.customMode === 'end')));
  useEffect(() => {
    if (detailError && moreRef.current) moreRef.current.open = true;
  }, [detailError]);

  return (
    <div className="pf plan">
      <div className="field">
        <span className="field__label">Jenis periode</span>
        <Segmented
          size="sm"
          label="Jenis periode"
          value={value.kind}
          onChange={(kind) => set({ kind, repeat: kind === 'custom' ? false : value.kind === 'custom' ? true : value.repeat })}
          options={CYCLE_KINDS}
        />
        <p className="field__hint">{KIND_HINT[value.kind]}</p>
      </div>

      {value.kind === 'weekly' && (
        <div className="field">
          <span className="field__label" id={`${id}-wd`}>
            Mulai setiap hari
          </span>
          <div className="wd-row" role="radiogroup" aria-labelledby={`${id}-wd`}>
            {WEEKDAYS_SHORT.map((d, i) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={Number(value.weekStart) === i}
                aria-label={WEEKDAYS[i]}
                className={`wd ${Number(value.weekStart) === i ? 'is-selected' : ''}`}
                onClick={() => set({ weekStart: i })}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {value.kind === 'monthly' && (
        <div className="field">
          <span className="field__label" id={`${id}-md`}>
            Uang datang setiap tanggal
          </span>
          <div className="md-grid" role="radiogroup" aria-labelledby={`${id}-md`}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={Number(value.monthDay) === d}
                aria-label={`Tanggal ${d}`}
                className={`md ${Number(value.monthDay) === d ? 'is-selected' : ''}`}
                onClick={() => set({ monthDay: d })}
              >
                {d}
              </button>
            ))}
          </div>
          {errors.monthDay && <p className="datefield__error">{errors.monthDay}</p>}
          {warnings.monthDay && <p className="field__hint pf__warn">{warnings.monthDay}</p>}
        </div>
      )}

      {isCustom && (
        <div className="field">
          <span className="field__label">Lama periode</span>
          <Segmented
            size="sm"
            label="Cara menentukan akhir periode"
            value={value.customMode}
            onChange={(customMode) => set({ customMode, end: customMode === 'end' && !value.end && preview ? preview.first.end : value.end })}
            options={[
              { value: 'length', label: 'Jumlah & satuan' },
              { value: 'end', label: 'Pilih tanggal akhir' },
            ]}
          />
          {value.customMode === 'length' ? (
            <div className="pf__length">
              <div className="pf__count-row">
                <label className="sr-only" htmlFor={`${id}-count`}>
                  Jumlah
                </label>
                <input
                  id={`${id}-count`}
                  className={`input pf__count num ${errors.count ? 'has-error' : ''}`}
                  inputMode="numeric"
                  value={value.count}
                  aria-invalid={Boolean(errors.count)}
                  onChange={(e) => set({ count: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
                />
                <Segmented size="sm" label="Satuan" value={value.unit} onChange={(unit) => set({ unit })} options={UNITS} />
              </div>
              {errors.count && (
                <p className="datefield__error" role="alert">
                  {errors.count}
                </p>
              )}
              <div className="chip-row pf__quick">
                {CUSTOM_QUICK.map((q) => (
                  <Chip key={q.label} selected={String(value.count) === String(q.count) && value.unit === q.unit} onClick={() => set({ count: String(q.count), unit: q.unit })}>
                    {q.label}
                  </Chip>
                ))}
              </div>
            </div>
          ) : (
            <div className="pf__range">
              <DateField passInvalid label="Mulai" value={value.anchor} onChange={(anchor) => set({ anchor, anchorAuto: false })} error={errors.anchor} rangeStart={value.anchor} rangeEnd={value.end} />
              <DateField
                passInvalid
                label="Berakhir"
                value={value.end}
                onChange={(end) => set({ end })}
                error={errors.end}
                min={value.anchor || undefined}
                minMessage="Tanggal akhir tidak boleh sebelum tanggal mulai."
                rangeStart={value.anchor}
                rangeEnd={value.end}
              />
            </div>
          )}
        </div>
      )}

      <Switch
        checked={value.repeat}
        onChange={(repeat) => set({ repeat })}
        label="Ulangi otomatis"
        description={value.repeat ? 'Periode baru langsung dimulai saat periode ini berakhir.' : 'Hanya sekali, tidak berulang.'}
      />

      <section className="plan__income" aria-labelledby={`${id}-inc`}>
        <Switch
          checked={value.incomeOn}
          onChange={(incomeOn) => set({ incomeOn })}
          label={<span id={`${id}-inc`}>Ada pemasukan di awal periode</span>}
          description="Misalnya kiriman ortu, gaji, atau beasiswa."
        />
        {value.incomeOn && (
          <div className="plan__income-body">
            <AmountInput label="Jumlah yang diterima" tone="income" value={value.incomeAmount} onChange={(incomeAmount) => set({ incomeAmount })} />
            {errors.incomeAmount && (
              <p className="datefield__error" role="alert">
                {errors.incomeAmount}
              </p>
            )}
            <div className="chip-row" role="group" aria-label="Kategori pemasukan">
              {incomeCategories.map((c) => (
                <Chip key={c.id} selected={value.incomeCategoryId === c.id} onClick={() => set({ incomeCategoryId: c.id })}>
                  <span className="chip__emoji" aria-hidden="true">
                    {c.emoji}
                  </span>
                  {c.name}
                </Chip>
              ))}
            </div>
            {value.repeat ? (
              <Switch
                checked={value.incomeAuto}
                onChange={(incomeAuto) => set({ incomeAuto })}
                label="Catat otomatis tiap periode baru"
                description={value.incomeAuto ? 'Pemasukan langsung tercatat di hari pertama setiap periode.' : 'Saku akan mengingatkanmu untuk mencatatnya.'}
              />
            ) : (
              <p className="field__hint">{mode === 'create' ? 'Pemasukan ini langsung dicatat di hari pertama periode.' : ''}</p>
            )}
          </div>
        )}
      </section>

      {preview ? (
        <div className="pf__preview plan__preview" aria-live="polite">
          <p className="plan__preview-eyebrow">
            <Sparkles size={14} aria-hidden="true" /> {mode === 'edit' ? 'Periode berikutnya' : 'Pratinjau'}
          </p>
          <p className="plan__preview-line">
            <strong>Periode: {rangeLabel(preview.first.start, preview.first.end)}</strong> ({preview.days} hari)
            {preview.allowance > 0 && (
              <>
                {' '}
                · Jatah harian <strong className="num">±{formatRupiah(preview.allowance)}</strong>
              </>
            )}
          </p>
          <PeriodTimeline start={preview.first.start} end={preview.first.end} today={today} />
          {preview.next.length > 0 && (
            <p className="plan__preview-next">
              Berikutnya mulai {preview.next.map((r) => formatDateShort(r.start, { withYear: false })).join(', ')}, dan seterusnya.
            </p>
          )}
          {mode === 'create' && preview.catchUp > 1 && (
            <p className="plan__preview-note">
              Tanggal mulainya sudah lewat, jadi {preview.catchUp} periode akan langsung dibuat
              {value.incomeOn && value.incomeAuto && value.incomeAmount > 0 ? `, masing-masing dengan pemasukan ${formatRupiah(value.incomeAmount)}` : ''}.
            </p>
          )}
          {!value.incomeOn && <p className="plan__preview-note">Isi pemasukan untuk melihat perkiraan jatah harian.</p>}
          {overlapNote && <p className="pf__overlap">{overlapNote}</p>}
        </div>
      ) : null}

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
            <TextInput id={`${id}-name`} placeholder="mis. Uang bulanan" value={value.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} />
          </div>

          {mode === 'create' && !(isCustom && value.customMode === 'end') && (
            <DateField
                passInvalid
              label="Periode pertama mulai"
              value={value.anchor}
              onChange={(anchor) => set({ anchor, anchorAuto: false })}
              error={errors.anchor}
              hint={value.kind === 'custom' ? undefined : 'Boleh di tengah: periode pertama akan dipotong sampai tanggal mulai berikutnya.'}
            />
          )}

          <fieldset className="carry">
            <legend className="field__label">Kalau ada sisa uang di akhir periode</legend>
            {CARRY_OPTIONS.map((o) => (
              <label key={o.value} className={`carry__opt ${value.carry === o.value ? 'is-selected' : ''}`}>
                <input type="radio" name={`${id}-carry`} value={o.value} checked={value.carry === o.value} onChange={() => set({ carry: o.value })} />
                <span className="carry__icon" aria-hidden="true">
                  {CARRY_ICON[o.value]}
                </span>
                <span className="carry__text">
                  <span className="carry__label">{o.label}</span>
                  <span className="carry__desc">{CARRY_DESC[o.value]}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {value.carry === 'save' && (
            <div className="field">
              <label className="field__label" htmlFor={`${id}-goal`}>
                Setor ke target
              </label>
              <Select id={`${id}-goal`} value={value.goalId} onChange={(e) => set({ goalId: e.target.value })}>
                <option value="">Pilih target…</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji} {g.name}
                  </option>
                ))}
                <option value="__new">＋ Buat target baru “Sisa periode”</option>
              </Select>
              {errors.goalId && <p className="datefield__error">{errors.goalId}</p>}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
