import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { AmountInput, Chip, Segmented, TextInput } from '../../../components/ui/Form.jsx';
import { Sheet } from '../../../components/ui/Sheet.jsx';
import { useToast } from '../../../hooks/useToast.jsx';
import { todayISO } from '../../../lib/dates.js';
import { formatRupiah } from '../../../lib/format.js';
import { uid } from '../../../lib/id.js';
import { useData } from '../../../state/AppProvider.jsx';
import { goalSaved } from '../../../state/selectors.js';

export function DepositSheet({ goal, onClose, onAchieved }) {
  const { data, dispatch } = useData();
  const toast = useToast();
  const inputRef = useRef(null);
  const [shown, setShown] = useState(goal);
  const [mode, setMode] = useState('in');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (goal) {
      setShown(goal);
      setMode('in');
      setAmount(0);
      setNote('');
    }
  }, [goal]);

  if (!shown) return null;
  const saved = goalSaved(data, shown.id);
  const left = Math.max(0, shown.target - saved);
  const quick = [10000, 25000, 50000, 100000].filter((n) => mode === 'out' || n < left);
  const tooMuchOut = mode === 'out' && amount > saved;

  const save = () => {
    if (!amount || tooMuchOut) return;
    const deposit = { id: uid(), goalId: shown.id, amount: mode === 'out' ? -amount : amount, date: todayISO(), note: note.trim() };
    dispatch({ type: 'ADD_DEPOSIT', deposit });
    const after = saved + deposit.amount;
    if (mode === 'in' && saved < shown.target && after >= shown.target) {
      onAchieved(shown);
    } else {
      const pct = Math.floor(Math.min(1, after / shown.target) * 100);
      toast({
        message: mode === 'in' ? `${formatRupiah(amount)} masuk ke ${shown.name}. Sudah ${pct}%!` : `${formatRupiah(amount)} diambil dari ${shown.name}.`,
        icon: mode === 'in' ? '🐷' : undefined,
        action: { label: 'Urungkan', onClick: () => dispatch({ type: 'DELETE_DEPOSIT', id: deposit.id }) },
      });
    }
    onClose();
  };

  return (
    <Sheet
      open={Boolean(goal)}
      onClose={onClose}
      title={`${shown.emoji} ${shown.name}`}
      description={`Terkumpul ${formatRupiah(saved)} · kurang ${formatRupiah(left)}`}
      size="sm"
      initialFocus={inputRef}
      footer={
        <Button size="lg" onClick={save} disabled={!amount || tooMuchOut}>
          {mode === 'in' ? 'Setor' : 'Ambil'}
        </Button>
      }
    >
      <div className="stack">
        <Segmented
          label="Jenis"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'in', label: 'Setor' },
            { value: 'out', label: 'Ambil' },
          ]}
        />
        <AmountInput ref={inputRef} value={amount} onChange={setAmount} tone={mode === 'in' ? 'income' : 'expense'} onEnter={save} />
        <div className="chip-row">
          {quick.map((n) => (
            <Chip key={n} selected={amount === n} onClick={() => setAmount(n)}>
              <span className="num">{formatRupiah(n)}</span>
            </Chip>
          ))}
          {mode === 'in' && left > 0 && (
            <Chip selected={amount === left} onClick={() => setAmount(left)}>
              Pas lunas <span className="num">{formatRupiah(left)}</span>
            </Chip>
          )}
        </div>
        <TextInput placeholder="Catatan (opsional)" aria-label="Catatan setoran" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} />
        {mode === 'out' && !tooMuchOut && <p className="muted">Kadang memang perlu dipakai. Tidak apa-apa, nanti bisa diisi lagi.</p>}
        {tooMuchOut && <p className="qa__hint">Saldo target ini baru {formatRupiah(saved)}.</p>}
        <p className="muted deposit-note">Setoran dihitung sebagai “Ditabung” dan mengurangi sisa uang bulan ini.</p>
      </div>
    </Sheet>
  );
}
