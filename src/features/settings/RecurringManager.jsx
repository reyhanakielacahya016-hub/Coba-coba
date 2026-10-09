import { Plus, Repeat, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { AmountInput, Field, Segmented, Select, Switch, TextInput } from '../../components/ui/Form.jsx';
import { Sheet } from '../../components/ui/Sheet.jsx';
import { useConfirm } from '../../hooks/useConfirm.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { addMonths, currentMonth, todayISO } from '../../lib/dates.js';
import { formatRupiah } from '../../lib/format.js';
import { uid } from '../../lib/id.js';
import { useData } from '../../state/AppProvider.jsx';
import { categoryMap, sortCategories } from '../../state/selectors.js';

/** Daftar pengeluaran / pemasukan rutin (mis. bayar kos tiap tanggal 1). */
export function RecurringManager() {
  const { data, dispatch } = useData();
  const toast = useToast();
  const [form, setForm] = useState(null); // { item } | {}
  const cats = useMemo(() => categoryMap(data), [data]);

  const toggle = (r, active) => {
    dispatch({ type: 'UPDATE_RECURRING', recurring: { id: r.id, active } });
    if (active) dispatch({ type: 'RUN_RECURRING', today: todayISO() });
    toast(active ? 'Jadwal diaktifkan lagi.' : 'Jadwal dijeda. Transaksi lama tetap tersimpan.');
  };

  return (
    <section className="card section" aria-labelledby="rec-title">
      <div className="section__head">
        <h2 id="rec-title" className="section__title">
          Transaksi rutin
        </h2>
        <Button size="sm" variant="soft" onClick={() => setForm({})}>
          <Plus size={16} /> Tambah
        </Button>
      </div>
      {data.recurring.length === 0 ? (
        <p className="muted data-note">
          Belum ada. Tambahkan yang pasti terjadi tiap bulan, seperti bayar kos atau kiriman dari orang tua, supaya tercatat otomatis.
        </p>
      ) : (
        <ul className="cat-list">
          {data.recurring.map((r) => {
            const c = cats.get(r.categoryId);
            return (
              <li key={r.id} className={`rec-row ${r.active ? '' : 'is-paused'}`}>
                <button type="button" className="plain-row" onClick={() => setForm({ item: r })}>
                  <span className="budget-row__emoji" aria-hidden="true">
                    {c?.emoji ?? '📦'}
                  </span>
                  <span className="plain-row__main">
                    <span className="plain-row__title">{r.note || c?.name}</span>
                    <span className="plain-row__sub">
                      <Repeat size={11} aria-hidden="true" /> Tiap tanggal {r.dayOfMonth}
                      {!r.active && ' · dijeda'}
                    </span>
                  </span>
                  <span className={`num rec-amt ${r.type === 'income' ? 'is-income' : ''}`}>
                    {formatRupiah(r.type === 'income' ? r.amount : -r.amount, { sign: true })}
                  </span>
                </button>
                <label className="rec-toggle">
                  <span className="sr-only">Aktifkan {r.note || c?.name}</span>
                  <input type="checkbox" role="switch" checked={r.active} onChange={(e) => toggle(r, e.target.checked)} />
                  <span className="switch__track" aria-hidden="true">
                    <span className="switch__thumb" />
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <RecurringFormSheet state={form} onClose={() => setForm(null)} />
    </section>
  );
}

function RecurringFormSheet({ state, onClose }) {
  const { data, dispatch } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const amountRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [day, setDay] = useState(1);
  const [note, setNote] = useState('');
  const [includeThisMonth, setIncludeThisMonth] = useState(true);

  useEffect(() => {
    if (!state) return;
    const r = state.item ?? null;
    setEditing(r);
    setType(r?.type ?? 'expense');
    setAmount(r?.amount ?? 0);
    setCategoryId(r?.categoryId ?? '');
    setDay(r?.dayOfMonth ?? 1);
    setNote(r?.note ?? '');
    setIncludeThisMonth(false);
  }, [state]);

  const options = sortCategories(data.categories.filter((c) => c.type === type));
  const today = todayISO();
  const dueThisMonth = day <= Number(today.slice(8, 10));
  const valid = amount > 0 && categoryId;

  const save = () => {
    if (!valid) return;
    const fields = { type, amount, categoryId, dayOfMonth: day, note: note.trim() };
    if (editing) {
      const before = editing;
      dispatch({ type: 'UPDATE_RECURRING', recurring: { id: editing.id, ...fields } });
      toast({ message: 'Jadwal diperbarui. Berlaku untuk bulan berikutnya.', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'UPDATE_RECURRING', recurring: before }) } });
    } else {
      const month = currentMonth();
      const r = {
        id: uid(),
        ...fields,
        startMonth: dueThisMonth && !includeThisMonth ? addMonths(month, 1) : month,
        lastGenerated: null,
        active: true,
      };
      const snapshot = data;
      dispatch({ type: 'ADD_RECURRING', recurring: r });
      dispatch({ type: 'RUN_RECURRING', today });
      toast({ message: 'Jadwal rutin dibuat.', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'REPLACE_ALL', data: snapshot }) } });
    }
    onClose();
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Hapus jadwal ini?',
      message: 'Transaksi yang sudah tercatat tetap ada. Hanya pencatatan otomatis berikutnya yang berhenti.',
      confirmLabel: 'Hapus jadwal',
      danger: true,
    });
    if (!ok) return;
    const snapshot = data;
    dispatch({ type: 'DELETE_RECURRING', id: editing.id });
    toast({ message: 'Jadwal dihapus.', icon: <Trash2 size={16} />, action: { label: 'Urungkan', onClick: () => dispatch({ type: 'REPLACE_ALL', data: snapshot }) } });
    onClose();
  };

  return (
    <Sheet
      open={Boolean(state)}
      onClose={onClose}
      title={editing ? 'Ubah transaksi rutin' : 'Transaksi rutin baru'}
      initialFocus={amountRef}
      footer={
        <>
          {editing && (
            <Button variant="danger" onClick={remove}>
              <Trash2 size={18} /> Hapus
            </Button>
          )}
          <Button onClick={save} disabled={!valid}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="stack">
        <Segmented
          label="Jenis"
          value={type}
          onChange={(t) => {
            setType(t);
            setCategoryId('');
          }}
          options={[
            { value: 'expense', label: 'Pengeluaran' },
            { value: 'income', label: 'Pemasukan' },
          ]}
        />
        <AmountInput ref={amountRef} value={amount} onChange={setAmount} tone={type} />
        <div className="rec-grid">
          <Field label="Kategori" id="rec-cat">
            <Select id="rec-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Pilih kategori</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tiap tanggal" id="rec-day">
            <Select id="rec-day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <TextInput placeholder="Catatan, mis. Bayar kos" aria-label="Catatan" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} />
        {day > 28 && <p className="muted data-note">Di bulan yang lebih pendek, akan dicatat di hari terakhir bulan itu.</p>}
        {!editing && dueThisMonth && (
          <Switch
            checked={includeThisMonth}
            onChange={setIncludeThisMonth}
            label="Catat juga untuk bulan ini"
            description={`Tanggal ${day} bulan ini sudah lewat. Matikan kalau sudah kamu catat sendiri.`}
          />
        )}
      </div>
    </Sheet>
  );
}
