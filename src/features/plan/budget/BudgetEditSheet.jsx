import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { AmountInput, Chip } from '../../../components/ui/Form.jsx';
import { Sheet } from '../../../components/ui/Sheet.jsx';
import { useToast } from '../../../hooks/useToast.jsx';
import { formatRupiah } from '../../../lib/format.js';
import { useData } from '../../../state/AppProvider.jsx';
import { averageSpending } from '../../../state/selectors.js';

const PRESETS = [100000, 200000, 300000, 500000, 1000000];

export function BudgetEditSheet({ category, month, onClose }) {
  const { data, dispatch } = useData();
  const toast = useToast();
  const [amount, setAmount] = useState(0);
  const inputRef = useRef(null);
  const [shown, setShown] = useState(category);

  // simpan kategori terakhir supaya isi sheet tidak hilang saat animasi menutup
  useEffect(() => {
    if (category) {
      setShown(category);
      setAmount(category.budget || 0);
    }
  }, [category]);

  const avg = shown ? averageSpending(data, shown.id, month) : 0;

  const save = () => {
    const before = shown.budget;
    dispatch({ type: 'SET_BUDGET', id: shown.id, budget: amount });
    toast({
      message: amount ? `Anggaran ${shown.name} ${formatRupiah(amount)} per bulan.` : `Batas ${shown.name} dihapus.`,
      action: { label: 'Urungkan', onClick: () => dispatch({ type: 'SET_BUDGET', id: shown.id, budget: before || 0 }) },
    });
    onClose();
  };

  return (
    <Sheet
      open={Boolean(category)}
      onClose={onClose}
      title={shown ? `${shown.emoji} Anggaran ${shown.name}` : ''}
      description="Batas ini berlaku setiap bulan. Bisa diubah kapan saja."
      size="sm"
      initialFocus={inputRef}
      footer={
        <>
          {shown?.budget ? (
            <Button
              variant="ghost"
              onClick={() => {
                setAmount(0);
                dispatch({ type: 'SET_BUDGET', id: shown.id, budget: 0 });
                toast({
                  message: `Batas ${shown.name} dihapus.`,
                  action: { label: 'Urungkan', onClick: () => dispatch({ type: 'SET_BUDGET', id: shown.id, budget: shown.budget }) },
                });
                onClose();
              }}
            >
              Hapus batas
            </Button>
          ) : null}
          <Button onClick={save} disabled={!amount}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="stack">
        <AmountInput ref={inputRef} label="Batas per bulan" value={amount} onChange={setAmount} onEnter={() => amount && save()} />
        {avg > 0 && (
          <p className="muted budget-avg">
            Rata-rata pengeluaranmu untuk kategori ini sekitar <strong className="num">{formatRupiah(avg)}</strong> per bulan.{' '}
            <button type="button" className="link-btn" onClick={() => setAmount(avg)}>
              Pakai angka ini
            </button>
          </p>
        )}
        <div className="chip-row">
          {PRESETS.map((p) => (
            <Chip key={p} selected={amount === p} onClick={() => setAmount(p)}>
              <span className="num">{formatRupiah(p)}</span>
            </Chip>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
