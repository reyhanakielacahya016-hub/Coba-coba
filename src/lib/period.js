// Logika periode pemasukan: hitung tanggal akhir, label, dan validasi.
// Murni (tanpa React) supaya mudah dites.

import { addDays, addMonthsToDate, daysInclusive, isISODate } from './dates.js';
import { formatDateShort, MONTHS_SHORT } from './format.js';

export const UNITS = [
  { value: 'day', label: 'Hari' },
  { value: 'week', label: 'Minggu' },
  { value: 'month', label: 'Bulan' },
];

/** Tanggal akhir (inklusif) dari tanggal mulai + lama periode. */
export function computeEnd(start, count, unit) {
  const n = Math.floor(Number(count));
  if (!isISODate(start) || !(n > 0)) return null;
  if (unit === 'day') return addDays(start, n - 1);
  if (unit === 'week') return addDays(start, n * 7 - 1);
  return addDays(addMonthsToDate(start, n), -1);
}

/** Kalau rentang pas N bulan / N minggu, kembalikan bentuk itu; selain itu dalam hari. */
export function describeLength(start, end) {
  const days = daysInclusive(start, end);
  for (let n = 1; n <= 24; n++) if (computeEnd(start, n, 'month') === end) return { count: n, unit: 'month', days };
  if (days % 7 === 0) return { count: days / 7, unit: 'week', days };
  return { count: days, unit: 'day', days };
}

export function lengthLabel(start, end) {
  const { count, unit, days } = describeLength(start, end);
  const unitName = { day: 'hari', week: 'minggu', month: 'bulan' }[unit];
  return unit === 'day' ? `${days} hari` : `${count} ${unitName} (${days} hari)`;
}

/** "1–31 Okt 2026", "25 Okt – 24 Nov 2026", "20 Des 2026 – 5 Jan 2027" */
export function rangeLabel(start, end) {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  if (y1 === y2 && m1 === m2) return `${d1}–${d2} ${MONTHS_SHORT[m2 - 1]} ${y2}`;
  if (y1 === y2) return `${d1} ${MONTHS_SHORT[m1 - 1]} – ${d2} ${MONTHS_SHORT[m2 - 1]} ${y2}`;
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}

/** Nama tampilan periode; kalau tidak diberi nama, pakai rentang tanggalnya. */
export function periodTitle(p) {
  return p.name?.trim() || `Periode ${rangeLabel(p.start, p.end)}`;
}

/**
 * Validasi isian periode. Mengembalikan objek pesan error per kolom (kosong = valid).
 * input: { start, mode: 'length'|'end', count, unit, end }
 */
export function validatePeriodInput(input) {
  const errors = {};
  if (!input.start) errors.start = 'Pilih tanggal mulai dulu ya.';
  else if (!isISODate(input.start)) errors.start = 'Tanggal mulai belum benar.';

  if (input.mode === 'length') {
    const n = Number(input.count);
    if (input.count === '' || input.count === null || input.count === undefined) errors.count = 'Isi lama periodenya.';
    else if (!Number.isFinite(n) || n <= 0) errors.count = 'Lama periode harus lebih dari 0.';
    else if (!Number.isInteger(n)) errors.count = 'Pakai angka bulat, misalnya 10 atau 2.';
    else if ((input.unit === 'day' && n > 731) || (input.unit === 'week' && n > 104) || (input.unit === 'month' && n > 24)) {
      errors.count = 'Maksimal 2 tahun untuk satu periode.';
    }
  } else if (!input.end) errors.end = 'Pilih tanggal berakhir.';
  else if (!isISODate(input.end)) errors.end = 'Tanggal berakhir belum benar.';
  else if (!errors.start && input.end < input.start) errors.end = 'Tanggal berakhir tidak boleh sebelum tanggal mulai.';
  else if (!errors.start && daysInclusive(input.start, input.end) > 731) errors.end = 'Maksimal 2 tahun untuk satu periode.';

  return errors;
}

/** Tanggal akhir hasil isian (atau null kalau belum valid). */
export function resolveEnd(input) {
  if (Object.keys(validatePeriodInput(input)).length) return null;
  return input.mode === 'length' ? computeEnd(input.start, input.count, input.unit) : input.end;
}

/** Periode lain yang bertumpuk dengan rentang ini. */
export function overlapping(periods, start, end, ignoreId) {
  return periods.filter((p) => p.id !== ignoreId && p.start <= end && p.end >= start);
}
