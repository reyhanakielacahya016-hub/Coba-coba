import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { formatRupiah } from '../../lib/format.js';
import { LEVEL } from './PeriodHero.jsx';

function todayMessage(p) {
  if (p.level === 'none') return 'Catat pemasukan dulu supaya Saku bisa menghitung jatah harianmu.';
  if (p.remaining < 0) return 'Uang periode ini sudah habis. Tidak apa-apa, catat terus supaya tahu polanya.';
  if (p.spentToday === 0) return `Belum ada pengeluaran hari ini. Jatahmu ${formatRupiah(p.allowance)}.`;
  if (p.todayLeft >= 0) return `Masih bisa ${formatRupiah(p.todayLeft)} lagi hari ini.`;
  const tomorrow = p.daysLeft > 1 ? ` Mulai besok jatahnya jadi ${formatRupiah(p.allowanceTomorrow)} per hari.` : '';
  return `Lewat ${formatRupiah(-p.todayLeft)} dari jatah hari ini.${tomorrow}`;
}

/** Hari ini: pengeluaran dibanding jatah harian, dengan status yang jelas. */
export function TodayCard({ pace, onAdd }) {
  const lvl = LEVEL[pace.level];
  return (
    <section className={`today card level-${pace.level}`} aria-labelledby="today-title">
      <div className="section__head">
        <h2 id="today-title" className="section__title">
          Hari ini
        </h2>
        <span className={`status status--${pace.level}`}>
          <lvl.icon size={14} aria-hidden="true" /> {lvl.label}
        </span>
      </div>
      <p className="today__nums num">
        <strong>{formatRupiah(pace.spentToday)}</strong>
        <span className="muted"> dari jatah {formatRupiah(pace.allowance)}</span>
      </p>
      <ProgressBar
        ratio={pace.allowance ? pace.spentToday / pace.allowance : pace.spentToday ? 1.01 : 0}
        level={pace.level === 'none' ? 'ok' : pace.level}
        label="Pengeluaran hari ini dibanding jatah harian"
      />
      <div className="today__foot">
        <p className="today__msg">{todayMessage(pace)}</p>
        <Button size="sm" variant="soft" onClick={onAdd}>
          <Plus size={16} /> Catat
        </Button>
      </div>
    </section>
  );
}
