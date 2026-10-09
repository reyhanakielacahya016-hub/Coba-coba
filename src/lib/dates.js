// Utilitas tanggal sederhana. Semua tanggal disimpan sebagai teks lokal
// "YYYY-MM-DD" dan bulan sebagai "YYYY-MM" supaya bebas masalah zona waktu.

import { DAYS, MONTHS_SHORT } from './format.js';

const pad = (n) => String(n).padStart(2, '0');

export function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO() {
  return toISO(new Date());
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-10-09" -> "2026-10" */
export function monthOf(iso) {
  return iso.slice(0, 7);
}

export function currentMonth() {
  return monthOf(todayISO());
}

/** Geser bulan: addMonths("2026-01", -1) -> "2025-12" */
export function addMonths(monthKey, n) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Tanggal dalam bulan, dipotong ke akhir bulan (tanggal 31 di Februari -> 28/29). */
export function dateInMonth(monthKey, day) {
  const d = Math.min(Math.max(1, day), daysInMonth(monthKey));
  return `${monthKey}-${pad(d)}`;
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Selisih hari b - a (bisa negatif). */
export function diffDays(a, b) {
  const ms = parseISO(b) - parseISO(a);
  return Math.round(ms / 86_400_000);
}

/** Label ramah: "Hari ini", "Kemarin", atau "Senin, 7 Okt". */
export function relativeDayLabel(iso, today = todayISO()) {
  const diff = diffDays(iso, today);
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Kemarin';
  const d = parseISO(iso);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${sameYear ? '' : ' ' + d.getFullYear()}`;
}

/** Minggu ke berapa dalam bulan (1–5), dihitung per 7 hari dari tanggal 1. */
export function weekOfMonth(iso) {
  return Math.ceil(Number(iso.slice(8, 10)) / 7);
}

/** Bandingkan bulan: -1, 0, 1 */
export function compareMonth(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Rentang satu bulan kalender: { start: "2026-10-01", end: "2026-10-31" } */
export function monthRange(monthKey) {
  return { start: `${monthKey}-01`, end: `${monthKey}-${pad(daysInMonth(monthKey))}` };
}

/** Jumlah hari dari a sampai b, termasuk keduanya. */
export function daysInclusive(a, b) {
  return diffDays(a, b) + 1;
}

/** Tambah n bulan pada tanggal; tanggal 31 dipotong ke akhir bulan tujuan. */
export function addMonthsToDate(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const target = addMonths(`${y}-${pad(m)}`, n);
  return dateInMonth(target, d);
}

/** Buat ISO dari angka; null kalau tanggalnya tidak ada (mis. 31 Februari). */
export function makeISO(y, m, d) {
  const yy = Number(y);
  const mm = Number(m);
  const dd = Number(d);
  if (!Number.isInteger(yy) || !Number.isInteger(mm) || !Number.isInteger(dd)) return null;
  if (yy < 1900 || yy > 2200 || mm < 1 || mm > 12 || dd < 1) return null;
  if (dd > daysInMonth(`${yy}-${pad(mm)}`)) return null;
  return `${yy}-${pad(mm)}-${pad(dd)}`;
}

export function isISODate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && makeISO(...v.split('-')) === v;
}

/** Senin = 0 … Minggu = 6 (kalender Indonesia mulai Senin). */
export function weekdayMon(iso) {
  return (parseISO(iso).getDay() + 6) % 7;
}
