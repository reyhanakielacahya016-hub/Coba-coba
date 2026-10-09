import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { EmojiPicker } from '../../components/ui/EmojiPicker.jsx';
import { AmountInput, Chip, Segmented, Switch, TextInput } from '../../components/ui/Form.jsx';
import { Sheet } from '../../components/ui/Sheet.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { addDays, monthOf, todayISO } from '../../lib/dates.js';
import { formatRupiah } from '../../lib/format.js';
import { uid } from '../../lib/id.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { budgetStatus, categoriesByUsage, streakInfo } from '../../state/selectors.js';
import './QuickAddSheet.css';

const QUICK_AMOUNTS = [5000, 10000, 15000, 20000, 50000];

function emptyForm(preset = {}) {
  return {
    type: preset.type ?? 'expense',
    amount: 0,
    categoryId: preset.categoryId ?? null,
    date: todayISO(),
    note: '',
    repeat: false,
  };
}

/**
 * Sheet catat cepat. Alur tercepat: ＋ → ketik nominal → ketuk kategori → Simpan.
 * Juga dipakai untuk mengubah dan menghapus transaksi.
 */
export function QuickAddSheet() {
  const { data, dispatch } = useData();
  const { quickAdd, closeQuickAdd } = useUi();
  const toast = useToast();
  const amountRef = useRef(null);
  const editing = quickAdd?.edit ?? null;

  const [form, setForm] = useState(emptyForm);
  const [hint, setHint] = useState('');

  // isi ulang form setiap kali sheet dibuka
  useEffect(() => {
    if (!quickAdd) return;
    setHint('');
    if (quickAdd.edit) {
      const t = quickAdd.edit;
      setForm({ type: t.type, amount: t.amount, categoryId: t.categoryId, date: t.date, note: t.note, repeat: Boolean(t.recurringId) });
    } else {
      setForm(emptyForm(quickAdd));
    }
  }, [quickAdd]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const categories = useMemo(() => categoriesByUsage(data, form.type), [data, form.type]);
  const today = todayISO();
  const yesterday = addDays(today, -1);

  const canSave = form.amount > 0 && form.categoryId;

  const save = () => {
    if (!form.amount) {
      setHint('Isi nominalnya dulu ya.');
      amountRef.current?.focus();
      return;
    }
    if (!form.categoryId) {
      setHint('Pilih kategorinya dulu ya.');
      return;
    }

    if (editing) {
      const before = editing;
      dispatch({
        type: 'UPDATE_TX',
        tx: { id: editing.id, type: form.type, amount: form.amount, categoryId: form.categoryId, date: form.date, note: form.note.trim() },
      });
      toast({ message: 'Perubahan disimpan.', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'UPDATE_TX', tx: before }) } });
      closeQuickAdd();
      return;
    }

    const tx = {
      id: uid(),
      type: form.type,
      amount: form.amount,
      categoryId: form.categoryId,
      date: form.date,
      note: form.note.trim(),
      recurringId: null,
      auto: false,
      createdAt: Date.now(),
    };

    let recurringId = null;
    if (form.repeat) {
      recurringId = uid();
      tx.recurringId = recurringId;
      dispatch({
        type: 'ADD_TX_RECURRING',
        tx,
        recurring: {
          id: recurringId,
          type: tx.type,
          amount: tx.amount,
          categoryId: tx.categoryId,
          note: tx.note,
          dayOfMonth: Number(tx.date.slice(8, 10)),
          startMonth: monthOf(tx.date),
          lastGenerated: monthOf(tx.date),
          active: true,
        },
      });
    } else {
      dispatch({ type: 'ADD_TX', tx });
    }

    toast({
      message: feedbackMessage(data, tx),
      action: {
        label: 'Urungkan',
        onClick: () => {
          dispatch({ type: 'DELETE_TX', id: tx.id });
          if (recurringId) dispatch({ type: 'DELETE_RECURRING', id: recurringId });
        },
      },
    });
    closeQuickAdd();
  };

  const remove = () => {
    const tx = editing;
    dispatch({ type: 'DELETE_TX', id: tx.id });
    toast({
      message: 'Transaksi dihapus.',
      icon: <Trash2 size={16} />,
      action: { label: 'Urungkan', onClick: () => dispatch({ type: 'ADD_TX', tx }) },
    });
    closeQuickAdd();
  };

  const isIncome = form.type === 'income';

  return (
    <Sheet
      open={Boolean(quickAdd)}
      onClose={closeQuickAdd}
      title={editing ? 'Ubah transaksi' : 'Catat transaksi'}
      initialFocus={editing ? undefined : amountRef}
      footer={
        <>
          {editing && (
            <Button variant="danger" onClick={remove} className="qa__delete">
              <Trash2 size={18} /> Hapus
            </Button>
          )}
          <Button size="lg" aria-disabled={!canSave} className={canSave ? '' : 'is-pending'} form="qa-form" type="submit">
            {editing ? 'Simpan perubahan' : isIncome ? 'Simpan pemasukan' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form
        id="qa-form"
        className="qa"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Segmented
          label="Jenis transaksi"
          value={form.type}
          onChange={(type) => set({ type, categoryId: null })}
          options={[
            { value: 'expense', label: 'Pengeluaran' },
            { value: 'income', label: 'Pemasukan' },
          ]}
        />

        <AmountInput
          ref={amountRef}
          value={form.amount}
          tone={form.type}
          onChange={(amount) => {
            set({ amount });
            setHint('');
          }}
          onEnter={save}
        />

        {!editing && !isIncome && (
          <div className="qa__quick" aria-label="Nominal cepat">
            {QUICK_AMOUNTS.map((n) => (
              <button key={n} type="button" className="qa__qbtn num" onClick={() => set({ amount: n })}>
                {n / 1000}rb
              </button>
            ))}
          </div>
        )}

        <fieldset className="qa__fieldset">
          <legend className="qa__legend">Kategori</legend>
          <div className="chip-row qa__cats">
            {categories.map((c) => (
              <Chip
                key={c.id}
                selected={form.categoryId === c.id}
                onClick={() => {
                  set({ categoryId: c.id });
                  setHint('');
                }}
              >
                <span className="chip__emoji">{c.emoji}</span>
                {c.name}
              </Chip>
            ))}
            <NewCategoryChip
              type={form.type}
              onCreated={(c) => {
                dispatch({ type: 'ADD_CATEGORY', category: c });
                set({ categoryId: c.id });
              }}
            />
          </div>
        </fieldset>

        {hint && (
          <p className="qa__hint" role="alert">
            {hint}
          </p>
        )}

        <div className="qa__details">
          <div className="qa__dates" role="group" aria-label="Tanggal">
            <Chip selected={form.date === today} onClick={() => set({ date: today })}>
              Hari ini
            </Chip>
            <Chip selected={form.date === yesterday} onClick={() => set({ date: yesterday })}>
              Kemarin
            </Chip>
            <label className="qa__date">
              <span className="sr-only">Pilih tanggal</span>
              <input
                type="date"
                className={`input ${form.date !== today && form.date !== yesterday ? 'is-custom' : ''}`}
                value={form.date}
                max={addDays(today, 365)}
                onChange={(e) => e.target.value && set({ date: e.target.value })}
              />
            </label>
          </div>
          <TextInput
            placeholder={isIncome ? 'Catatan (opsional), mis. kiriman Oktober' : 'Catatan (opsional), mis. nasi padang'}
            aria-label="Catatan"
            value={form.note}
            maxLength={120}
            onChange={(e) => set({ note: e.target.value })}
          />
          {!editing && (
            <Switch
              checked={form.repeat}
              onChange={(repeat) => set({ repeat })}
              label="Ulangi tiap bulan"
              description={`Otomatis dicatat setiap tanggal ${Number(form.date.slice(8, 10))}, cocok untuk kos atau kiriman.`}
            />
          )}
          {editing?.recurringId && <p className="qa__note">Transaksi ini bagian dari jadwal rutin. Jadwalnya bisa diatur di Pengaturan.</p>}
        </div>
      </form>
    </Sheet>
  );
}

/** Chip "+ Kategori" yang membuka form mini di tempat. */
function NewCategoryChip({ type, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✨');

  if (!open) {
    return (
      <Chip className="chip--dashed" onClick={() => setOpen(true)}>
        <Plus size={16} /> Kategori
      </Chip>
    );
  }

  const create = () => {
    const n = name.trim();
    if (!n) return;
    onCreated({ id: uid(), name: n, emoji, type, budget: null, locked: false });
    setName('');
    setOpen(false);
  };

  return (
    <div className="inline-form qa__newcat">
      <EmojiPicker value={emoji} onChange={setEmoji} />
      <TextInput
        autoFocus
        placeholder="Nama kategori baru"
        aria-label="Nama kategori baru"
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            create();
          }
          if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      />
      <Button size="md" onClick={create} disabled={!name.trim()}>
        Tambah
      </Button>
    </div>
  );
}

/** Pesan setelah menyimpan: streak atau info anggaran, singkat dan tidak menghakimi. */
function feedbackMessage(dataBefore, tx) {
  const after = { ...dataBefore, transactions: [...dataBefore.transactions, tx] };
  if (tx.type === 'expense') {
    const month = monthOf(tx.date);
    const b = budgetStatus(after, month).find((x) => x.category.id === tx.categoryId);
    const prev = budgetStatus(dataBefore, month).find((x) => x.category.id === tx.categoryId);
    if (b && prev && b.level !== prev.level) {
      if (b.level === 'over') return `Tersimpan. Anggaran ${b.category.name.toLowerCase()} sudah lewat, santai saja.`;
      if (b.level === 'warn') return `Tersimpan. Anggaran ${b.category.name.toLowerCase()} tinggal ${formatRupiah(b.left)}.`;
    }
  }
  const before = streakInfo(dataBefore);
  const now = streakInfo(after);
  if (!before.todayDone && now.todayDone && now.count > 1) return `Tersimpan. Streak ${now.count} hari! 🔥`;
  return tx.type === 'income' ? 'Pemasukan tersimpan.' : 'Tersimpan.';
}
