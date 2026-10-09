import { CalendarClock, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AnimatedRupiah } from '../../../components/ui/AnimatedNumber.jsx';
import { Button, IconButton } from '../../../components/ui/Button.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Chip } from '../../../components/ui/Form.jsx';
import { ProgressBar } from '../../../components/ui/ProgressBar.jsx';
import { useToast } from '../../../hooks/useToast.jsx';
import { relativeDayLabel, todayISO } from '../../../lib/dates.js';
import { formatDateShort, formatRupiah } from '../../../lib/format.js';
import { useData } from '../../../state/AppProvider.jsx';
import { goalProgress } from '../../../state/selectors.js';
import { Celebration } from './Celebration.jsx';
import { DepositSheet } from './DepositSheet.jsx';
import { GoalFormSheet } from './GoalFormSheet.jsx';
import './Goals.css';

const IDEAS = [
  { name: 'Dana darurat', emoji: '🛟', target: 500000 },
  { name: 'Laptop baru', emoji: '💻', target: 7000000 },
  { name: 'Mudik', emoji: '🚆', target: 1000000 },
  { name: 'HP baru', emoji: '📱', target: 3000000 },
];

export function GoalList() {
  const { data } = useData();
  const [form, setForm] = useState(null); // { goal } | { preset }
  const [depositFor, setDepositFor] = useState(null);
  const [celebrate, setCelebrate] = useState(null);

  const today = todayISO();
  const goals = useMemo(() => {
    const list = data.goals.map((g) => ({ goal: g, p: goalProgress(data, g, today) }));
    // yang belum tercapai di atas, urut tenggat terdekat
    return list.sort((a, b) => Number(a.p.done) - Number(b.p.done) || (a.goal.deadline || '9999').localeCompare(b.goal.deadline || '9999'));
  }, [data, today]);

  const totalSaved = goals.reduce((s, g) => s + g.p.saved, 0);
  const achieved = goals.filter((g) => g.p.done).length;

  if (goals.length === 0) {
    return (
      <div className="stack">
        <div className="card">
          <EmptyState
            emoji="🐷"
            title="Belum ada target tabungan"
            action={
              <Button onClick={() => setForm({ preset: {} })}>
                <Plus size={18} /> Buat target
              </Button>
            }
          >
            Menabung terasa lebih ringan kalau ada tujuannya. Mulai dari yang kecil juga tidak apa-apa.
          </EmptyState>
          <div className="goal-ideas">
            <p className="muted">Butuh ide?</p>
            <div className="chip-row">
              {IDEAS.map((i) => (
                <Chip key={i.name} onClick={() => setForm({ preset: i })}>
                  <span className="chip__emoji">{i.emoji}</span>
                  {i.name}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <GoalFormSheet state={form} onClose={() => setForm(null)} />
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="card goals-total" aria-label="Total tabungan">
        <div>
          <p className="muted goals-total__label">Total tabungan</p>
          <AnimatedRupiah value={totalSaved} className="goals-total__amount" />
          <p className="muted goals-total__sub">
            {goals.length} target{achieved > 0 && ` · ${achieved} tercapai 🎉`}
          </p>
        </div>
        <Button variant="soft" onClick={() => setForm({ preset: {} })}>
          <Plus size={18} /> Target baru
        </Button>
      </section>

      <ul className="goal-list enter-stagger">
        {goals.map(({ goal, p }) => (
          <GoalCard key={goal.id} goal={goal} p={p} onDeposit={() => setDepositFor(goal)} onEdit={() => setForm({ goal })} />
        ))}
      </ul>

      <GoalFormSheet state={form} onClose={() => setForm(null)} />
      <DepositSheet goal={depositFor} onClose={() => setDepositFor(null)} onAchieved={(g) => setCelebrate(g)} />
      {celebrate && <Celebration goal={celebrate} onClose={() => setCelebrate(null)} />}
    </div>
  );
}

function deadlineText(goal, p) {
  if (!goal.deadline) return null;
  if (p.done) return `Tenggat ${formatDateShort(goal.deadline)}`;
  if (p.daysLeft < 0) return 'Tenggatnya sudah lewat. Boleh digeser kok, ketuk ikon pensil.';
  if (p.daysLeft === 0) return 'Tenggatnya hari ini. Semangat!';
  const tip = p.perWeek ? ` · sisihkan ± ${formatRupiah(p.perWeek)}/minggu` : '';
  return `${p.daysLeft} hari lagi${tip}`;
}

function GoalCard({ goal, p, onDeposit, onEdit }) {
  const { data, dispatch } = useData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const deposits = useMemo(
    () => data.deposits.filter((d) => d.goalId === goal.id).sort((a, b) => b.date.localeCompare(a.date)),
    [data.deposits, goal.id],
  );
  const dl = deadlineText(goal, p);

  const removeDeposit = (d) => {
    dispatch({ type: 'DELETE_DEPOSIT', id: d.id });
    toast({ message: 'Setoran dihapus.', icon: <Trash2 size={16} />, action: { label: 'Urungkan', onClick: () => dispatch({ type: 'ADD_DEPOSIT', deposit: d }) } });
  };

  return (
    <li className={`goal card ${p.done ? 'is-done' : ''}`}>
      <div className="goal__head">
        <span className="goal__emoji" aria-hidden="true">
          {goal.emoji}
        </span>
        <div className="goal__title">
          <h3>{goal.name}</h3>
          <p className="num">
            <strong>{formatRupiah(p.saved)}</strong> <span className="muted">dari {formatRupiah(goal.target)}</span>
          </p>
        </div>
        <IconButton label={`Ubah target ${goal.name}`} onClick={onEdit}>
          <Pencil size={18} />
        </IconButton>
      </div>

      <div className="goal__progress">
        <ProgressBar ratio={p.ratio} level={p.done ? 'done' : 'ok'} size="lg" label={`Progres ${goal.name}`} />
        <span className="goal__pct num">{Math.floor(p.ratio * 100)}%</span>
      </div>

      {p.done ? (
        <p className="goal__done">
          <span className="badge badge--done">Tercapai 🎉</span> Kamu berhasil! Uang ini siap dipakai sesuai rencana.
        </p>
      ) : (
        dl && (
          <p className="goal__deadline">
            <CalendarClock size={15} aria-hidden="true" /> {dl}
          </p>
        )
      )}

      <div className="goal__actions">
        {!p.done && (
          <Button size="sm" onClick={onDeposit}>
            <Plus size={16} /> Setor
          </Button>
        )}
        {deposits.length > 0 && (
          <button type="button" className="goal__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {deposits.length} setoran <ChevronDown size={16} className={open ? 'is-open' : ''} />
          </button>
        )}
        {p.done && (
          <Button size="sm" variant="ghost" onClick={onDeposit}>
            Ambil / setor lagi
          </Button>
        )}
      </div>

      {open && (
        <ul className="goal__deposits">
          {deposits.map((d) => (
            <li key={d.id}>
              <span className="goal__dep-date">{relativeDayLabel(d.date)}</span>
              <span className="goal__dep-note">{d.note}</span>
              <span className={`num goal__dep-amt ${d.amount < 0 ? 'is-out' : ''}`}>{formatRupiah(d.amount, { sign: true })}</span>
              <IconButton label="Hapus setoran" onClick={() => removeDeposit(d)}>
                <Trash2 size={16} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
