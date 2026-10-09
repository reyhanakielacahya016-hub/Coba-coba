import { Lock, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Chip, Segmented } from '../../components/ui/Form.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { formatRupiah } from '../../lib/format.js';
import { useData } from '../../state/AppProvider.jsx';
import { sortCategories } from '../../state/selectors.js';
import { categoryFromSuggestion, unusedSuggestions } from '../../state/suggestions.js';
import { CategoryFormSheet } from './CategoryFormSheet.jsx';

export function CategoryManager() {
  const { data, dispatch } = useData();
  const toast = useToast();
  const [type, setType] = useState('expense');
  const [form, setForm] = useState(null); // { category } untuk ubah, { type } untuk baru

  const list = useMemo(() => sortCategories(data.categories.filter((c) => c.type === type)), [data.categories, type]);
  const suggestions = useMemo(() => unusedSuggestions(data.categories, type), [data.categories, type]);
  const counts = useMemo(() => {
    const m = new Map();
    for (const t of data.transactions) m.set(t.categoryId, (m.get(t.categoryId) || 0) + 1);
    return m;
  }, [data.transactions]);

  const addSuggestion = (s) => {
    const c = categoryFromSuggestion(s);
    dispatch({ type: 'ADD_CATEGORY', category: c });
    toast({
      message: `Kategori ${c.name} ditambahkan.`,
      action: { label: 'Urungkan', onClick: () => dispatch({ type: 'DELETE_CATEGORY', id: c.id }) },
    });
  };

  return (
    <section className="card section" aria-labelledby="cat-title">
      <div className="section__head">
        <h2 id="cat-title" className="section__title">
          Kategori
        </h2>
        <Button size="sm" variant="soft" onClick={() => setForm({ type })}>
          <Plus size={16} /> Kategori baru
        </Button>
      </div>

      <Segmented
        size="sm"
        label="Jenis kategori"
        value={type}
        onChange={setType}
        options={[
          { value: 'expense', label: 'Pengeluaran' },
          { value: 'income', label: 'Pemasukan' },
        ]}
      />

      <ul className="cat-list">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" className="plain-row" onClick={() => setForm({ category: c })}>
              <span className="budget-row__emoji" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="plain-row__main">
                <span className="plain-row__title">
                  {c.name}
                  {c.locked && <Lock size={12} className="cat-lock" aria-label="tidak bisa dihapus" />}
                </span>
                <span className="plain-row__sub">
                  {counts.get(c.id) || 0} transaksi
                  {c.budget ? <span className="num"> · batas {formatRupiah(c.budget)}</span> : null}
                </span>
              </span>
              <Pencil size={16} className="cat-edit" aria-hidden="true" />
              <span className="sr-only">Ubah</span>
            </button>
          </li>
        ))}
      </ul>

      {suggestions.length > 0 && (
        <div className="cat-suggest">
          <p className="cat-suggest__title">Rekomendasi</p>
          <p className="muted cat-suggest__sub">Ketuk untuk menambahkan.</p>
          <div className="chip-row">
            {suggestions.map((s) => (
              <Chip key={s.key} className="chip--dashed" onClick={() => addSuggestion(s)}>
                <Plus size={14} />
                <span className="chip__emoji">{s.emoji}</span>
                {s.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <CategoryFormSheet state={form} onClose={() => setForm(null)} />
    </section>
  );
}
