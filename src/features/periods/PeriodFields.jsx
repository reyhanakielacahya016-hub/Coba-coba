import { useId } from 'react';
import { DateField } from '../../components/ui/DateField.jsx';
import { Chip, Segmented, TextInput } from '../../components/ui/Form.jsx';
import { daysInclusive, todayISO } from '../../lib/dates.js';
import { lengthLabel, rangeLabel, resolveEnd, UNITS } from '../../lib/period.js';
import './Periods.css';

const QUICK = [
  { count: 1, unit: 'month', label: '1 bulan' },
  { count: 2, unit: 'week', label: '2 minggu' },
  { count: 10, unit: 'day', label: '10 hari' },
  { count: 3, unit: 'month', label: '1 semester (3 bln)' },
];

/** Nilai awal isian periode. */
export function emptyPeriodInput(start = todayISO()) {
  return { name: '', start, mode: 'length', count: '1', unit: 'month', end: '' };
}

/**
 * Isian periode: nama (opsional), tanggal mulai, lalu lama periode
 * (angka + hari/minggu/bulan) ATAU tanggal berakhir langsung.
 */
export function PeriodFields({ value, onChange, errors = {}, showName = true, overlapNote }) {
  const id = useId();
  const set = (patch) => onChange({ ...value, ...patch });
  const end = resolveEnd(value);
  const today = todayISO();

  return (
    <div className="pf">
      {showName && (
        <div className="field">
          <label className="field__label" htmlFor={`${id}-name`}>
            Nama periode <span className="pf__opt">(opsional)</span>
          </label>
          <TextInput
            id={`${id}-name`}
            placeholder="mis. Kiriman Oktober"
            value={value.name}
            maxLength={60}
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>
      )}

      <DateField passInvalid label="Tanggal mulai" value={value.start} onChange={(start) => set({ start })} error={errors.start} rangeStart={value.start} rangeEnd={end} />

      <div className="field">
        <span className="field__label" id={`${id}-mode`}>
          Sampai kapan?
        </span>
        <Segmented
          size="sm"
          label="Cara menentukan akhir periode"
          value={value.mode}
          onChange={(mode) => set({ mode, end: mode === 'end' && !value.end && end ? end : value.end })}
          options={[
            { value: 'length', label: 'Lama periode' },
            { value: 'end', label: 'Tanggal berakhir' },
          ]}
        />
      </div>

      {value.mode === 'length' ? (
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
            <Segmented size="sm" label="Satuan lama periode" value={value.unit} onChange={(unit) => set({ unit })} options={UNITS} />
          </div>
          {errors.count && (
            <p className="datefield__error" role="alert">
              {errors.count}
            </p>
          )}
          <div className="chip-row pf__quick">
            {QUICK.map((q) => (
              <Chip
                key={q.label}
                selected={String(value.count) === String(q.count) && value.unit === q.unit}
                onClick={() => set({ count: String(q.count), unit: q.unit })}
              >
                {q.label}
              </Chip>
            ))}
          </div>
        </div>
      ) : (
        <DateField
                passInvalid
          label="Tanggal berakhir"
          value={value.end}
          onChange={(v) => set({ end: v })}
          error={errors.end}
          min={value.start || undefined}
          minMessage="Tanggal berakhir tidak boleh sebelum tanggal mulai."
          rangeStart={value.start}
          rangeEnd={value.end}
        />
      )}

      {end ? (
        <div className="pf__preview" aria-live="polite">
          <div className="pf__preview-top">
            <span className="pf__preview-range">{rangeLabel(value.start, end)}</span>
            <span className="pf__preview-len">{lengthLabel(value.start, end)}</span>
          </div>
          <PeriodTimeline start={value.start} end={end} today={today} />
          {overlapNote && <p className="pf__overlap">{overlapNote}</p>}
        </div>
      ) : null}
    </div>
  );
}

/** Garis waktu kecil: seberapa jauh hari ini dalam periode. */
export function PeriodTimeline({ start, end, today = todayISO() }) {
  const total = daysInclusive(start, end);
  const elapsed = today < start ? 0 : today > end ? total : daysInclusive(start, today);
  const pct = (elapsed / total) * 100;
  return (
    <div className="timeline" aria-hidden="true">
      <div className="timeline__track">
        <span className="timeline__fill" style={{ width: `${pct}%` }} />
        {today >= start && today <= end && <span className="timeline__now" style={{ left: `${pct}%` }} />}
      </div>
    </div>
  );
}
