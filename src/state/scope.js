// "Scope" = jendela waktu yang sedang dilihat: sebuah periode pemasukan,
// atau satu bulan kalender. Semua halaman menghitung berdasarkan rentang ini.

import { addMonths, currentMonth, daysInclusive, monthOf, monthRange, todayISO } from '../lib/dates.js';
import { formatMonth } from '../lib/format.js';
import { periodTitle, rangeLabel } from '../lib/period.js';

/** Periode diurutkan dari yang paling awal. */
export function sortedPeriods(data) {
  return [...data.periods].sort((a, b) => a.start.localeCompare(b.start) || a.createdAt - b.createdAt);
}

/** Periode yang mencakup tanggal ini (kalau bertumpuk, pilih yang mulainya paling akhir). */
export function periodForDate(data, date) {
  return (
    sortedPeriods(data)
      .filter((p) => p.start <= date && p.end >= date)
      .pop() ?? null
  );
}

export function periodStatus(p, today = todayISO()) {
  if (p.end < today) return 'done';
  if (p.start > today) return 'upcoming';
  return 'active';
}

export const STATUS_LABEL = { active: 'Berjalan', done: 'Selesai', upcoming: 'Akan datang' };

/** Scope bawaan: periode yang sedang berjalan, kalau tidak ada pakai bulan ini. */
export function defaultScope(data, today = todayISO()) {
  const p = periodForDate(data, today);
  return p ? { kind: 'period', id: p.id } : { kind: 'month', month: monthOf(today) };
}

/**
 * Ubah scope menjadi rentang lengkap untuk dihitung & ditampilkan.
 * scope null = otomatis (lihat defaultScope).
 */
export function resolveRange(data, scope, today = todayISO()) {
  const s = scope ?? defaultScope(data, today);
  if (s.kind === 'period') {
    const p = data.periods.find((x) => x.id === s.id);
    if (p) {
      return {
        kind: 'period',
        id: p.id,
        period: p,
        start: p.start,
        end: p.end,
        title: periodTitle(p),
        sub: rangeLabel(p.start, p.end),
        days: daysInclusive(p.start, p.end),
        status: periodStatus(p, today),
      };
    }
  }
  const month = s.kind === 'month' && s.month ? s.month : currentMonth();
  const r = monthRange(month);
  const status = r.end < today ? 'done' : r.start > today ? 'upcoming' : 'active';
  return {
    kind: 'month',
    month,
    start: r.start,
    end: r.end,
    title: formatMonth(month),
    sub: 'Bulan kalender',
    days: daysInclusive(r.start, r.end),
    status,
  };
}

/** Scope sebelum/sesudah (untuk tombol ‹ ›). null kalau tidak ada. */
export function adjacentScope(data, range, dir, today = todayISO()) {
  if (range.kind === 'period') {
    const list = sortedPeriods(data);
    const i = list.findIndex((p) => p.id === range.id);
    const next = list[i + dir];
    return next ? { kind: 'period', id: next.id } : null;
  }
  const month = addMonths(range.month, dir);
  if (dir > 0 && month > monthOf(today)) return null;
  return { kind: 'month', month };
}

/** Rentang pembanding: periode sebelumnya, atau bulan sebelumnya. */
export function previousRange(data, range, today = todayISO()) {
  const prev = adjacentScope(data, range, -1, today);
  return prev ? resolveRange(data, prev, today) : null;
}

export function isSameScope(a, b) {
  if (!a || !b) return false;
  return a.kind === b.kind && (a.kind === 'period' ? a.id === b.id : a.month === b.month);
}

/** Rentang yang "berlaku" untuk sebuah tanggal: periodenya, atau bulan kalendernya. */
export function rangeForDate(data, date, today = todayISO()) {
  const p = periodForDate(data, date);
  return resolveRange(data, p ? { kind: 'period', id: p.id } : { kind: 'month', month: monthOf(date) }, today);
}
