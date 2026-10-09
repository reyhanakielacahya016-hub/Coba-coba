import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { EmojiPicker } from '../../components/ui/EmojiPicker.jsx';
import { Segmented, TextInput } from '../../components/ui/Form.jsx';
import { Sheet } from '../../components/ui/Sheet.jsx';
import { useConfirm } from '../../hooks/useConfirm.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { uid } from '../../lib/id.js';
import { useData } from '../../state/AppProvider.jsx';

/** Form tambah / ubah kategori. state: null | { type } | { category } */
export function CategoryFormSheet({ state, onClose }) {
  const { data, dispatch } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const nameRef = useRef(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [type, setType] = useState('expense');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (!state) return;
    const c = state.category ?? null;
    setEditing(c);
    setName(c?.name ?? '');
    setEmoji(c?.emoji ?? '✨');
    setType(c?.type ?? state.type ?? 'expense');
  }, [state]);

  const trimmed = name.trim();
  const duplicate = data.categories.some(
    (c) => c.type === type && c.id !== editing?.id && c.name.toLowerCase() === trimmed.toLowerCase(),
  );

  const save = () => {
    if (!trimmed || duplicate) return;
    if (editing) {
      const before = editing;
      dispatch({ type: 'UPDATE_CATEGORY', category: { id: editing.id, name: trimmed, emoji } });
      toast({ message: 'Kategori diperbarui.', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'UPDATE_CATEGORY', category: before }) } });
    } else {
      const c = { id: uid(), name: trimmed, emoji, type, budget: null, locked: false };
      dispatch({ type: 'ADD_CATEGORY', category: c });
      toast({ message: `Kategori ${c.name} dibuat.`, action: { label: 'Urungkan', onClick: () => dispatch({ type: 'DELETE_CATEGORY', id: c.id }) } });
    }
    onClose();
  };

  const remove = async () => {
    const used = data.transactions.filter((t) => t.categoryId === editing.id).length;
    const ok = await confirm({
      title: `Hapus kategori ${editing.name}?`,
      message: used
        ? `${used} transaksi di kategori ini akan dipindah ke "Lainnya". Datanya tidak hilang.`
        : 'Kategori ini belum dipakai, jadi aman dihapus.',
      confirmLabel: 'Hapus kategori',
      danger: true,
    });
    if (!ok) return;
    const snapshot = data;
    dispatch({ type: 'DELETE_CATEGORY', id: editing.id });
    toast({
      message: `Kategori ${editing.name} dihapus.`,
      icon: <Trash2 size={16} />,
      action: { label: 'Urungkan', onClick: () => dispatch({ type: 'REPLACE_ALL', data: snapshot }) },
    });
    onClose();
  };

  return (
    <Sheet
      open={Boolean(state)}
      onClose={onClose}
      title={editing ? 'Ubah kategori' : 'Kategori baru'}
      size="sm"
      initialFocus={nameRef}
      footer={
        <>
          {editing && !editing.locked && (
            <Button variant="danger" onClick={remove}>
              <Trash2 size={18} /> Hapus
            </Button>
          )}
          <Button onClick={save} disabled={!trimmed || duplicate}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="stack">
        {!editing && (
          <Segmented
            label="Jenis kategori"
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: 'Pengeluaran' },
              { value: 'income', label: 'Pemasukan' },
            ]}
          />
        )}
        <div className="inline-form">
          <EmojiPicker value={emoji} onChange={setEmoji} />
          <TextInput
            ref={nameRef}
            placeholder="Nama kategori"
            aria-label="Nama kategori"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), save())}
          />
        </div>
        {duplicate && <p className="qa__hint">Nama ini sudah dipakai. Coba nama lain ya.</p>}
        {editing?.locked && <p className="muted">“{editing.name}” adalah kategori cadangan, jadi tidak bisa dihapus. Nama dan ikonnya tetap bisa diubah.</p>}
      </div>
    </Sheet>
  );
}
