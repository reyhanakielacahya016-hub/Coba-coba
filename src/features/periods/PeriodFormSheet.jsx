import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Sheet } from '../../components/ui/Sheet.jsx';
import { useConfirm } from '../../hooks/useConfirm.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { uid } from '../../lib/id.js';
import { describeLength, overlapping, periodTitle, resolveEnd, validatePeriodInput } from '../../lib/period.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { emptyPeriodInput, PeriodFields } from './PeriodFields.jsx';

/** Catatan bertumpuk yang ramah (bukan error, hanya info). */
export function overlapText(periods, start, end, ignoreId) {
  if (!start || !end) return '';
  const hits = overlapping(periods, start, end, ignoreId);
  if (!hits.length) return '';
  return `Bertumpuk dengan ${hits.map(periodTitle).join(', ')}. Tidak apa-apa, transaksi di tanggal yang sama akan terhitung di keduanya.`;
}

/** Form buat / ubah periode pemasukan. Dibuka lewat openPeriodForm() dari mana saja. */
export function PeriodFormSheet() {
  const { data, dispatch } = useData();
  const { periodForm, closePeriodForm, setScope } = useUi();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [input, setInput] = useState(emptyPeriodInput);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!periodForm) return;
    const p = periodForm.period ?? null;
    setEditing(p);
    setTouched(false);
    setErrors({});
    if (p) {
      const len = describeLength(p.start, p.end);
      setInput({ name: p.name, start: p.start, mode: 'length', count: String(len.count), unit: len.unit, end: p.end });
    } else {
      setInput({ ...emptyPeriodInput(), ...(periodForm.preset ?? {}) });
    }
  }, [periodForm]);

  // validasi ulang setelah pengguna pernah menekan Simpan
  useEffect(() => {
    if (touched) setErrors(validatePeriodInput(input));
  }, [input, touched]);

  const end = resolveEnd(input);

  const save = () => {
    setTouched(true);
    const errs = validatePeriodInput(input);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const fields = { name: input.name.trim(), start: input.start, end };
    if (editing) {
      const before = editing;
      dispatch({ type: 'UPDATE_PERIOD', period: { id: editing.id, ...fields } });
      toast({ message: 'Periode diperbarui.', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'UPDATE_PERIOD', period: before }) } });
    } else {
      const period = { id: uid(), ...fields, createdAt: Date.now() };
      dispatch({ type: 'ADD_PERIOD', period });
      setScope({ kind: 'period', id: period.id });
      toast({
        message: `Periode ${periodTitle(period)} dibuat.`,
        icon: '🗓️',
        action: {
          label: 'Urungkan',
          onClick: () => {
            dispatch({ type: 'DELETE_PERIOD', id: period.id });
            setScope(null);
          },
        },
      });
    }
    closePeriodForm();
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Hapus ${periodTitle(editing)}?`,
      message: 'Hanya jendela periodenya yang dihapus. Semua transaksi, anggaran, dan tabungan tetap aman.',
      confirmLabel: 'Hapus periode',
      danger: true,
    });
    if (!ok) return;
    const p = editing;
    dispatch({ type: 'DELETE_PERIOD', id: p.id });
    setScope(null);
    toast({ message: 'Periode dihapus. Transaksinya tetap ada.', icon: <Trash2 size={16} />, action: { label: 'Urungkan', onClick: () => dispatch({ type: 'ADD_PERIOD', period: p }) } });
    closePeriodForm();
  };

  return (
    <Sheet
      open={Boolean(periodForm)}
      onClose={closePeriodForm}
      title={editing ? 'Ubah periode' : 'Periode pemasukan baru'}
      description="Periode adalah rentang waktu uangmu harus cukup, misalnya dari kiriman satu ke kiriman berikutnya."
      footer={
        <>
          {editing && (
            <Button variant="danger" onClick={remove}>
              <Trash2 size={18} /> Hapus
            </Button>
          )}
          <Button onClick={save}>{editing ? 'Simpan perubahan' : 'Buat periode'}</Button>
        </>
      }
    >
      <PeriodFields value={input} onChange={setInput} errors={errors} overlapNote={overlapText(data.periods, input.start, end, editing?.id)} />
    </Sheet>
  );
}
