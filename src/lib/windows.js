// Matematika "jendela waktu": rentang harian, mingguan, bulanan, atau per-N.
// Dipakai bersama oleh periode berulang dan batasan pengeluaran.
// Semua tanggal berupa teks "YYYY-MM-DD"; rentang selalu inklusif { start, end }.

import { addDays, addMonths, addMonthsToDate, dateInMonth, diffDays, monthOf, weekdayMon } from './dates.js';

/** Nama hari, Senin = 0 … Minggu = 6 (sama dengan weekdayMon). */
export const WEEKDAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const WEEKDAYS_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const clampInt = (v, min, max, fallback) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Minggu yang memuat `date`, dimulai pada hari `weekStart` (0 = Senin). */
export function weekWindow(date, weekStart = 0) {
  const ws = clampInt(weekStart, 0, 6, 0);
  const start = addDays(date, -((weekdayMon(date) - ws + 7) % 7));
  return { start, end: addDays(start, 6) };
}

/**
 * "Bulan" yang dimulai setiap tanggal `monthDay`. Kalau bulannya lebih pendek
 * (mis. tanggal 31 di bulan 30 hari atau Februari), mulainya di hari terakhir bulan itu.
 * Contoh tanggal 25: 25 Okt – 24 Nov. Contoh tanggal 31: 31 Jan – 27 Feb, 28 Feb – 30 Mar.
 */
export function monthWindow(date, monthDay = 1) {
  const md = clampInt(monthDay, 1, 31, 1);
  let m = monthOf(date);
  let start = dateInMonth(m, md);
  if (start > date) {
    m = addMonths(m, -1);
    start = dateInMonth(m, md);
  }
  const next = dateInMonth(addMonths(m, 1), md);
  return { start, end: addDays(next, -1) };
}

const monthIndex = (iso) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;

/**
 * Rentang berulang "setiap N hari/minggu/bulan" yang dihitung dari tanggal `anchor`.
 * Untuk bulan, setiap awal dihitung langsung dari anchor (bukan berantai) supaya
 * tanggal 31 tidak "bergeser" makin maju.
 */
export function everyWindow(date, { anchor, count = 1, unit = 'day' }) {
  const n = clampInt(count, 1, 1000, 1);
  if (unit === 'month') {
    const startOf = (k) => addMonthsToDate(anchor, k * n);
    let k = Math.floor((monthIndex(date) - monthIndex(anchor)) / n);
    while (startOf(k) > date) k -= 1;
    while (startOf(k + 1) <= date) k += 1;
    return { start: startOf(k), end: addDays(startOf(k + 1), -1) };
  }
  const len = unit === 'week' ? n * 7 : n;
  const k = Math.floor(diffDays(anchor, date) / len);
  const start = addDays(anchor, k * len);
  return { start, end: addDays(start, len - 1) };
}

/**
 * Jendela yang memuat `date` menurut spesifikasi:
 *   { kind: 'day' }
 *   { kind: 'week', weekStart }
 *   { kind: 'month', monthDay }
 *   { kind: 'every', anchor, count, unit }
 *   { kind: 'range', start, end }       (tetap, tidak berulang)
 * Mengembalikan null kalau spesifikasinya tidak lengkap.
 */
export function windowAt(spec, date) {
  if (!spec || !date) return null;
  switch (spec.kind) {
    case 'day':
      return { start: date, end: date };
    case 'week':
      return weekWindow(date, spec.weekStart);
    case 'month':
      return monthWindow(date, spec.monthDay);
    case 'every':
      return spec.anchor ? everyWindow(date, spec) : null;
    case 'range':
      return spec.start && spec.end ? { start: spec.start, end: spec.end } : null;
    default:
      return null;
  }
}

/** Jendela sebelum jendela `w` (null untuk rentang tetap). */
export function previousWindow(spec, w) {
  if (!w || spec.kind === 'range') return null;
  return windowAt(spec, addDays(w.start, -1));
}

/** Jendela sesudah jendela `w` (null untuk rentang tetap). */
export function nextWindow(spec, w) {
  if (!w || spec.kind === 'range') return null;
  return windowAt(spec, addDays(w.end, 1));
}
