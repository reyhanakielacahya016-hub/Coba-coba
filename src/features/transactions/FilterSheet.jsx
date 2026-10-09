import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Chip, Field } from '../../components/ui/Form.jsx';
import { Sheet } from '../../components/ui/Sheet.jsx';
import { addDays, addMonths, currentMonth, daysInMonth, todayISO } from '../../lib/dates.js';

export const PRESETS = [
  { value: 'all', label: 'Semua waktu' },
  { value: '7d', label: '7 hari terakhir' },
  { value: 'this', label: 'Bulan ini' },
  { value: 'last', label: 'Bulan lalu' },
  { value: 'custom', label: 'Pilih tanggal' },
];

export function presetRange(preset) {
  const today = todayISO();
  const m = currentMonth();
  switch (preset) {
    case '7d':
      return { from: addDays(today, -6), to: today };
    case 'this':
      return { from: `${m}-01`, to: `${m}-${daysInMonth(m)}` };
    case 'last': {
      const p = addMonths(m, -1);
      return { from: `${p}-01`, to: `${p}-${daysInMonth(p)}` };
    }
    default:
      return { from: '', to: '' };
  }
}

export function FilterSheet({ open, onClose, categories, categoryIds, range, onApply }) {
  const [ids, setIds] = useState(categoryIds);
  const [r, setR] = useState(range);

  useEffect(() => {
    if (open) {
      setIds(categoryIds);
      setR(range);
    }
  }, [open]);

  const toggle = (id) => setIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter riwayat"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              setIds([]);
              setR({ preset: 'all', from: '', to: '' });
            }}
          >
            Reset
          </Button>
          <Button onClick={() => onApply(ids, r)}>Terapkan</Button>
        </>
      }
    >
      <div className="stack">
        <fieldset className="qa__fieldset">
          <legend className="qa__legend">Rentang waktu</legend>
          <div className="chip-row">
            {PRESETS.map((p) => (
              <Chip key={p.value} selected={r.preset === p.value} onClick={() => setR({ ...r, preset: p.value })}>
                {p.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        {r.preset === 'custom' && (
          <div className="filter-dates">
            <Field label="Dari" id="f-from">
              <input id="f-from" type="date" className="input" value={r.from} max={r.to || undefined} onChange={(e) => setR({ ...r, from: e.target.value })} />
            </Field>
            <Field label="Sampai" id="f-to">
              <input id="f-to" type="date" className="input" value={r.to} min={r.from || undefined} onChange={(e) => setR({ ...r, to: e.target.value })} />
            </Field>
          </div>
        )}

        <fieldset className="qa__fieldset">
          <legend className="qa__legend">Kategori {ids.length > 0 && `(${ids.length})`}</legend>
          <div className="chip-row">
            {categories.map((c) => (
              <Chip key={c.id} selected={ids.includes(c.id)} onClick={() => toggle(c.id)}>
                <span className="chip__emoji">{c.emoji}</span>
                {c.name}
                {c.type === 'income' && <span className="chip__tag">masuk</span>}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>
    </Sheet>
  );
}
