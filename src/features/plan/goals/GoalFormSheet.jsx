import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { EmojiPicker } from '../../../components/ui/EmojiPicker.jsx';
import { AmountInput, Field, TextInput } from '../../../components/ui/Form.jsx';
import { Sheet } from '../../../components/ui/Sheet.jsx';
import { useConfirm } from '../../../hooks/useConfirm.jsx';
import { useToast } from '../../../hooks/useToast.jsx';
import { addDays, todayISO } from '../../../lib/dates.js';
import { uid } from '../../../lib/id.js';
import { useData } from '../../../state/AppProvider.jsx';

/** state: null | { goal } untuk ubah | { preset } untuk baru */
export function GoalFormSheet({ state, onClose }) {
  const { data, dispatch } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const nameRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [target, setTarget] = useState(0);
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (!state) return;
    const g = state.goal ?? null;
    const pre = state.preset ?? {};
    setEditing(g);
    setName(g?.name ?? pre.name ?? '');
    setEmoji(g?.emoji ?? pre.emoji ?? '🎯');
    setTarget(g?.target ?? pre.target ?? 0);
    setDeadline(g?.deadline ?? '');
  }, [state]);

  const valid = name.trim() && target > 0;

  const save = () => {
    if (!valid) return;
    const fields = { name: name.trim(), emoji, target, deadline: deadline || null };
    if (editing) {
      const before = editing;
      dispatch({ type: 'UPDATE_GOAL', goal: { id: editing.id, ...fields } });
      toast({ message: 'Target diperbarui.', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'UPDATE_GOAL', goal: before }) } });
    } else {
      const goal = { id: uid(), ...fields, createdAt: Date.now(), achievedAt: null };
      dispatch({ type: 'ADD_GOAL', goal });
      toast({ message: `Target ${goal.name} dibuat. Semangat! 🌱`, icon: '🌱' });
    }
    onClose();
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Hapus target ${editing.name}?`,
      message: 'Riwayat setoran untuk target ini ikut terhapus. Uangmu sendiri tentu tidak ke mana-mana.',
      confirmLabel: 'Hapus target',
      danger: true,
    });
    if (!ok) return;
    const snapshot = data;
    dispatch({ type: 'DELETE_GOAL', id: editing.id });
    toast({ message: 'Target dihapus.', icon: <Trash2 size={16} />, action: { label: 'Urungkan', onClick: () => dispatch({ type: 'REPLACE_ALL', data: snapshot }) } });
    onClose();
  };

  const today = todayISO();
  const quickDeadlines = [
    { label: '3 bulan', value: addDays(today, 90) },
    { label: '6 bulan', value: addDays(today, 182) },
    { label: '1 tahun', value: addDays(today, 365) },
  ];

  return (
    <Sheet
      open={Boolean(state)}
      onClose={onClose}
      title={editing ? 'Ubah target' : 'Target tabungan baru'}
      initialFocus={nameRef}
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
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="inline-form">
          <EmojiPicker value={emoji} onChange={setEmoji} label="Ikon target" />
          <TextInput ref={nameRef} placeholder="Nama target, mis. Laptop baru" aria-label="Nama target" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </div>
        <AmountInput label="Jumlah yang ingin dikumpulkan" value={target} onChange={setTarget} tone="income" />
        <Field label="Tenggat (opsional)" id="goal-deadline" hint="Dengan tenggat, Saku bisa menyarankan setoran per minggu.">
          <div className="goal-deadline">
            <input id="goal-deadline" type="date" className="input" value={deadline} min={today} onChange={(e) => setDeadline(e.target.value)} />
            <div className="chip-row">
              {quickDeadlines.map((q) => (
                <button key={q.label} type="button" className={`chip ${deadline === q.value ? 'is-selected' : ''}`} onClick={() => setDeadline(q.value)}>
                  {q.label}
                </button>
              ))}
              {deadline && (
                <button type="button" className="chip chip--dashed" onClick={() => setDeadline('')}>
                  Tanpa tenggat
                </button>
              )}
            </div>
          </div>
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
