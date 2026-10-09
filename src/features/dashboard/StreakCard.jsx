import { Check, Flame } from 'lucide-react';
import { useMemo } from 'react';
import { addDays, parseISO, todayISO } from '../../lib/dates.js';
import { DAYS } from '../../lib/format.js';
import { useData } from '../../state/AppProvider.jsx';
import { streakInfo } from '../../state/selectors.js';
import { useToast } from '../../hooks/useToast.jsx';

function streakMessage(count, todayDone) {
  if (count === 0) return 'Satu catatan hari ini sudah cukup untuk memulai.';
  if (!todayDone) return 'Belum ada catatan hari ini. Santai, masih ada waktu.';
  if (count >= 30) return 'Sebulan penuh rajin mencatat. Luar biasa! 🌟';
  if (count >= 7) return 'Lebih dari seminggu! Kebiasaan baik sedang terbentuk.';
  if (count >= 3) return 'Mantap, terus pertahankan ritmenya.';
  return 'Awal yang bagus. Sampai jumpa besok!';
}

export function StreakCard() {
  const { data, dispatch } = useData();
  const toast = useToast();
  const today = todayISO();
  const { count, todayDone } = useMemo(() => streakInfo(data, today), [data, today]);
  const checkedIn = data.checkins.includes(today);
  const hasTxToday = data.transactions.some((t) => t.date === today && !t.auto);

  const week = useMemo(() => {
    const active = new Set(data.checkins);
    for (const t of data.transactions) if (!t.auto) active.add(t.date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6);
      return { date: d, on: active.has(d), label: DAYS[parseISO(d).getDay()].slice(0, 1), isToday: d === today };
    });
  }, [data, today]);

  const toggleCheckin = () => {
    dispatch({ type: 'TOGGLE_CHECKIN', date: today });
    if (!checkedIn) toast({ message: 'Hari hemat tercatat. Keren! 🌿', icon: '🌿' });
  };

  return (
    <section className="streak card" aria-labelledby="streak-title">
      <div className="streak__head">
        <span className={`streak__flame ${todayDone ? 'is-lit' : ''}`} aria-hidden="true">
          <Flame size={22} />
        </span>
        <div>
          <h2 id="streak-title" className="streak__count">
            <span className="num">{count}</span> hari berturut-turut
          </h2>
          <p className="streak__msg">{streakMessage(count, todayDone)}</p>
        </div>
      </div>

      <ol className="streak__week" aria-label="Catatan 7 hari terakhir">
        {week.map((d) => (
          <li key={d.date} className={`streak__day ${d.on ? 'is-on' : ''} ${d.isToday ? 'is-today' : ''}`}>
            <span className="streak__dot">{d.on && <Check size={12} strokeWidth={3} />}</span>
            <span className="streak__dlabel" aria-hidden="true">
              {d.label}
            </span>
            <span className="sr-only">
              {d.isToday ? 'Hari ini' : d.date}: {d.on ? 'tercatat' : 'belum'}
            </span>
          </li>
        ))}
      </ol>

      {!hasTxToday && (
        <button type="button" className={`streak__checkin ${checkedIn ? 'is-done' : ''}`} onClick={toggleCheckin} aria-pressed={checkedIn}>
          <Check size={16} strokeWidth={3} />
          {checkedIn ? 'Hari ini tanpa pengeluaran (ketuk untuk batal)' : 'Hari ini tanpa pengeluaran'}
        </button>
      )}
    </section>
  );
}
