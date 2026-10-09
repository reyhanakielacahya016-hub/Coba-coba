import { addDays, todayISO } from './dates.js';

/**
 * Hitung streak: berapa hari berturut-turut kamu mencatat.
 * Streak tetap "hidup" kalau hari ini belum mencatat tapi kemarin sudah,
 * supaya tidak terasa menghukum di pagi hari.
 *
 * @param {Iterable<string>} activeDates tanggal "YYYY-MM-DD" yang ada catatannya
 * @returns {{ count: number, todayDone: boolean }}
 */
export function computeStreak(activeDates, today = todayISO()) {
  const set = activeDates instanceof Set ? activeDates : new Set(activeDates);
  const todayDone = set.has(today);
  let cursor = todayDone ? today : addDays(today, -1);
  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return { count, todayDone };
}
