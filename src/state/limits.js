// Batasan pengeluaran: untuk total atau satu kategori, dengan rentang bebas
// (harian, mingguan, bulanan, per N hari, rentang tanggal, atau ikut periode),
// nominal tetap / persen dari pemasukan / hitung otomatis, sisa yang hangus
// atau dibawa ke rentang berikutnya, dan ambang peringatan yang bisa diatur.

import { addDays, daysInclusive, monthOf, monthRange, todayISO } from '../lib/dates.js';
import { formatDateShort, formatRupiah } from '../lib/format.js';
import { rangeLabel } from '../lib/period.js';
import { previousWindow, windowAt, WEEKDAYS } from '../lib/windows.js';
import { rawTotals } from './ledger.js';
import { periodForDate, sortedPeriods } from './scope.js';
import { pace } from './selectors.js';

export const LIMIT_WINDOWS = [
  { value: 'day', label: 'Harian' },
  { value: 'week', label: 'Mingguan' },
  { value: 'month', label: 'Bulanan' },
  { value: 'ndays', label: 'Per N hari' },
  { value: 'period', label: 'Ikut periode' },
  { value: 'range', label: 'Rentang tanggal' },
];

export const LIMIT_MODES = [
  { value: 'fixed', label: 'Nominal tetap' },
  { value: 'percent', label: 'Persen pemasukan' },
  { value: 'auto', label: 'Hitung otomatis' },
];

export const DEFAULT_WARN = 0.8;
const MAX_CHAIN = 370;

const floor500 = (n) => (n >= 1000 ? Math.floor(n / 500) * 500 : Math.max(0, Math.floor(n / 100) * 100));

/** Spesifikasi jendela untuk sebuah batasan (lihat lib/windows.js). */
export function limitSpec(limit) {
  const w = limit.window || {};
  switch (w.kind) {
    case 'day':
      return { kind: 'day' };
    case 'week':
      return { kind: 'week', weekStart: w.weekStart ?? 0 };
    case 'month':
      return { kind: 'month', monthDay: w.monthDay ?? 1 };
    case 'ndays':
      return { kind: 'every', anchor: w.anchor || limit.since, count: w.count || 1, unit: 'day' };
    case 'range':
      return { kind: 'range', start: w.start, end: w.end };
    default:
      return { kind: 'period' };
  }
}

/** Jendela batasan yang memuat `date`. Untuk "ikut periode": periode yang mencakup tanggal itu. */
export function limitWindow(data, limit, date) {
  const spec = limitSpec(limit);
  if (spec.kind === 'period') {
    const p = periodForDate(data, date);
    return p ? { start: p.start, end: p.end, periodId: p.id } : null;
  }
  return windowAt(spec, date);
}

function prevLimitWindow(data, limit, w) {
  const spec = limitSpec(limit);
  if (spec.kind === 'period') {
    const list = sortedPeriods(data).filter((p) => p.end < w.start);
    const p = list[list.length - 1];
    return p ? { start: p.start, end: p.end, periodId: p.id } : null;
  }
  return previousWindow(spec, w);
}

/** Rentang "periode" yang menjadi acuan pemasukan untuk jendela ini. */
export function referenceRange(data, date) {
  const p = periodForDate(data, date);
  return p ? { start: p.start, end: p.end, id: p.id, kind: 'period', period: p } : { ...monthRange(monthOf(date)), kind: 'month' };
}

/**
 * Pengeluaran untuk batasan (total / satu kategori) dalam rentang.
 * Batas total bisa mengabaikan transaksi rutin (mis. bayar kos) lewat `skipRecurring`.
 */
export function spentFor(data, limit, r) {
  const target = typeof limit === 'string' ? limit : limit.target;
  const skipRecurring = typeof limit === 'object' && target === 'total' && limit.skipRecurring;
  let s = 0;
  for (const t of data.transactions) {
    if (t.type !== 'expense' || t.date < r.start || t.date > r.end) continue;
    if (target !== 'total' && t.categoryId !== target) continue;
    if (skipRecurring && t.recurringId) continue;
    s += t.amount;
  }
  return s;
}

/** Bagian jendela terhadap periode acuannya (1 kalau sama panjang atau lebih). */
function shareOf(w, ref) {
  return Math.min(1, daysInclusive(w.start, w.end) / daysInclusive(ref.start, ref.end));
}

/**
 * Nilai dasar batasan untuk satu jendela, sebelum ditambah sisa bawaan.
 * - fixed: nominal tetap.
 * - percent: persen × pemasukan periode acuan (disesuaikan kalau jendelanya lebih pendek).
 * - auto: (sisa uang periode ÷ sisa hari) × hari tersisa di jendela, ditambah yang sudah terpakai.
 */
export function baseAmount(data, limit, w, today = todayISO()) {
  if (limit.mode === 'percent') {
    const ref = referenceRange(data, w.start);
    const { income } = rawTotals(data, ref);
    return floor500(((income * (Number(limit.percent) || 0)) / 100) * shareOf(w, ref));
  }
  if (limit.mode === 'auto') {
    const at = today < w.start ? w.start : today > w.end ? w.end : today;
    const ref = referenceRange(data, at);
    const p = pace(data, ref, at);
    if (!p) return 0;
    const end = w.end < ref.end ? w.end : ref.end;
    const before = at > w.start ? spentFor(data, limit, { start: w.start, end: addDays(at, -1) }) : 0;
    return before + p.allowance * daysInclusive(at, end);
  }
  return Math.max(0, Math.round(Number(limit.amount) || 0));
}

/**
 * Batas efektif untuk jendela `w`. Kalau sisa dibawa (rollover 'carry'),
 * sisa yang tidak terpakai dari jendela-jendela sebelumnya ikut ditambahkan.
 * Sisa hanya dibawa di dalam periode yang sama (dan sejak batasan dibuat),
 * supaya tidak menumpuk berbulan-bulan.
 */
export function effectiveAmount(data, limit, w, today = todayISO()) {
  const base = baseAmount(data, limit, w, today);
  if (limit.rollover !== 'carry' || limit.mode === 'auto') return { amount: base, base, carriedIn: 0 };
  const p = limit.window?.kind === 'period' ? null : periodForDate(data, w.start);
  const since = [limit.since || w.start, p?.start ?? ''].sort().pop();
  const chain = [];
  let cur = prevLimitWindow(data, limit, w);
  while (cur && cur.start >= since && chain.length < MAX_CHAIN) {
    chain.unshift(cur);
    cur = prevLimitWindow(data, limit, cur);
  }
  let carry = 0;
  for (const win of chain) {
    const amt = baseAmount(data, limit, win, today) + carry;
    carry = Math.max(0, amt - spentFor(data, limit, win));
  }
  return { amount: base + carry, base, carriedIn: carry };
}

export function limitLevel(ratio, warnAt = DEFAULT_WARN) {
  if (ratio > 1) return 'over';
  if (ratio >= warnAt) return 'warn';
  return 'ok';
}

const cache = new WeakMap();

/**
 * Status satu batasan pada tanggal `today`:
 * terpakai, batas, sisa, level, plus sisa batas hari ini dan yang masih aman dipakai.
 */
export function limitStatus(data, limit, today = todayISO()) {
  let byData = cache.get(data);
  if (!byData) cache.set(data, (byData = new Map()));
  const key = `${limit.id}|${today}|${JSON.stringify(limit)}`;
  if (byData.has(key)) return byData.get(key);

  let w = limitWindow(data, limit, today);
  // rentang tanggal tetap: tetap tampil walau belum mulai / sudah lewat
  if (!w && limit.window?.kind === 'range') w = windowAt(limitSpec(limit), today);
  let result;
  if (!w) {
    result = { limit, window: null, state: 'idle', level: limit.active ? 'idle' : 'off' };
  } else {
    const { amount, base, carriedIn } = effectiveAmount(data, limit, w, today);
    const spent = spentFor(data, limit, w);
    const left = amount - spent;
    const ratio = amount > 0 ? spent / amount : spent > 0 ? Infinity : 0;
    const warnAt = limit.warnAt ?? DEFAULT_WARN;
    const state = today < w.start ? 'upcoming' : today > w.end ? 'done' : 'active';
    const out = {
      limit,
      window: w,
      state,
      amount,
      base,
      carriedIn,
      spent,
      left,
      ratio,
      warnAt,
      level: limit.active ? limitLevel(ratio, warnAt) : 'off',
      daysTotal: daysInclusive(w.start, w.end),
      daysLeft: 0,
      spentToday: 0,
      todayCap: null,
      todayLeft: null,
      safeToday: null,
    };
    if (state === 'active') {
      out.daysLeft = daysInclusive(today, w.end);
      out.spentToday = spentFor(data, limit, { start: today, end: today });
      // jatah hari ini dihitung dari kondisi awal hari, supaya tidak "turun" tiap kali mencatat
      out.todayCap = out.daysLeft === 1 ? Math.max(0, left + out.spentToday) : floor500(Math.max(0, left + out.spentToday) / out.daysLeft);
      out.todayLeft = out.todayCap - out.spentToday;
      out.safeToday = Math.max(0, Math.min(out.todayLeft, left));
    }
    result = out;
  }
  byData.set(key, result);
  return result;
}

/** Status semua batasan, yang aktif lebih dulu, lalu yang paling mendesak. */
export function allLimitStatus(data, today = todayISO()) {
  const rank = { over: 0, warn: 1, ok: 2, idle: 3, off: 4 };
  return data.limits
    .map((l) => limitStatus(data, l, today))
    .sort((a, b) => rank[a.level] - rank[b.level] || (b.ratio || 0) - (a.ratio || 0));
}

/** Batasan aktif yang terkena oleh pengeluaran di kategori ini (termasuk batas total). */
export function limitsTouching(data, categoryId, today = todayISO()) {
  return data.limits
    .filter((l) => l.active && (l.target === 'total' || l.target === categoryId))
    .map((l) => limitStatus(data, l, today))
    .filter((s) => s.state === 'active');
}

// ——— Label & pesan ———

export function targetName(data, limit) {
  if (limit.target === 'total') return 'Semua pengeluaran';
  return data.categories.find((c) => c.id === limit.target)?.name ?? 'Kategori terhapus';
}

export function targetEmoji(data, limit) {
  if (limit.target === 'total') return '🧮';
  return data.categories.find((c) => c.id === limit.target)?.emoji ?? '📦';
}

export function limitTitle(data, limit) {
  return limit.name?.trim() || targetName(data, limit);
}

/** "per hari", "per minggu (mulai Sabtu)", "per 3 hari", "12–20 Okt 2026", "per periode" */
export function windowLabel(limit) {
  const w = limit.window || {};
  switch (w.kind) {
    case 'day':
      return 'per hari';
    case 'week':
      return (w.weekStart ?? 0) === 0 ? 'per minggu' : `per minggu (mulai ${WEEKDAYS[w.weekStart]})`;
    case 'month':
      return (w.monthDay ?? 1) === 1 ? 'per bulan' : `per bulan (mulai tgl ${w.monthDay})`;
    case 'ndays':
      return `per ${w.count} hari`;
    case 'range':
      return w.start && w.end ? rangeLabel(w.start, w.end) : 'rentang tanggal';
    default:
      return 'per periode';
  }
}

/** "Rp 30.000", "10% pemasukan", "Otomatis" */
export function modeLabel(limit) {
  if (limit.mode === 'percent') return `${limit.percent}% pemasukan`;
  if (limit.mode === 'auto') return 'Otomatis';
  return formatRupiah(limit.amount);
}

/** Pesan lembut, tidak menghakimi. */
export function limitMessage(st) {
  if (!st.window) return st.limit.window?.kind === 'period' ? 'Aktif begitu ada periode yang berjalan.' : 'Belum ada rentang yang berjalan.';
  if (st.state === 'upcoming') return `Mulai ${formatDateShort(st.window.start)}.`;
  if (st.level === 'off') return 'Sedang dinonaktifkan.';
  if (st.amount === 0) return 'Batasnya Rp 0 untuk rentang ini (belum ada pemasukan atau sisa uang).';
  if (st.level === 'over') {
    return `Lewat ${formatRupiah(-st.left)} dari batas. Tidak apa-apa, ${st.state === 'done' ? 'rentang berikutnya' : 'besok'} bisa diatur pelan-pelan.`;
  }
  if (st.level === 'warn') return `Sudah ${Math.round(st.ratio * 100)}% terpakai. Tinggal ${formatRupiah(st.left)}, pelan-pelan ya.`;
  if (st.spent === 0) return 'Belum terpakai sama sekali.';
  return `Masih ada ${formatRupiah(st.left)}.`;
}

/**
 * Perkiraan nilai batasan untuk satu periode penuh (dipakai di pratinjau
 * dan peringatan "melebihi pemasukan").
 */
export function perPeriodEstimate(data, limit, today = todayISO()) {
  const ref = referenceRange(data, today);
  const refDays = daysInclusive(ref.start, ref.end);
  const w = limitWindow(data, limit, today) ?? windowAt(limitSpec(limit), today);
  if (!w) return null;
  const amount = baseAmount(data, limit, w, today);
  const days = daysInclusive(w.start, w.end);
  const factor = limit.window?.kind === 'period' || limit.window?.kind === 'range' ? 1 : refDays / days;
  const { income } = rawTotals(data, ref);
  return { amount: Math.round(amount * factor), income, ref, refDays };
}

/**
 * Validasi isian batasan. Mengembalikan { errors, warnings } berisi pesan per kolom.
 */
export function validateLimitInput(data, input, today = todayISO()) {
  const errors = {};
  const warnings = {};
  const w = input.window || {};
  if (!input.target) errors.target = 'Pilih untuk apa batas ini.';
  if (input.mode === 'auto' && input.target !== 'total') errors.mode = 'Hitung otomatis hanya untuk batas semua pengeluaran.';
  if (input.mode === 'fixed' && !(Number(input.amount) > 0)) errors.amount = 'Jumlah batas tidak boleh nol.';
  if (input.mode === 'percent') {
    const p = Number(input.percent);
    if (!(p > 0)) errors.percent = 'Persentase harus lebih dari 0.';
    else if (p > 100) errors.percent = 'Persentase maksimal 100%.';
  }
  if (w.kind === 'ndays') {
    const n = Number(w.count);
    if (!Number.isInteger(n) || n < 1) errors.count = 'Isi jumlah hari, minimal 1.';
    else if (n > 366) errors.count = 'Maksimal 366 hari.';
  }
  if (w.kind === 'range') {
    if (!w.start) errors.start = 'Pilih tanggal mulai.';
    if (!w.end) errors.end = 'Pilih tanggal berakhir.';
    else if (w.start && w.end < w.start) errors.end = 'Tanggal akhir tidak boleh sebelum tanggal mulai.';
  }
  if (w.kind === 'period' && data.periods.length === 0) warnings.window = 'Belum ada periode. Batas ini mulai berlaku begitu kamu membuat periode.';
  if (Object.keys(errors).length === 0) {
    const est = perPeriodEstimate(data, { ...input, since: today, id: 'preview' }, today);
    if (est && est.income > 0 && est.amount > est.income) {
      warnings.amount = `Kalau dihitung satu periode, batas ini sekitar ${formatRupiah(est.amount)}, lebih besar dari pemasukanmu (${formatRupiah(est.income)}). Tetap boleh disimpan.`;
    }
  }
  return { errors, warnings };
}

/** Jumlah batas kategori per periode vs pemasukan — untuk peringatan di daftar batasan. */
export function categoryLimitsVsIncome(data, today = todayISO()) {
  let sum = 0;
  let income = 0;
  for (const l of data.limits) {
    if (!l.active || l.target === 'total') continue;
    const est = perPeriodEstimate(data, l, today);
    if (!est) continue;
    sum += est.amount;
    income = est.income;
  }
  return { sum, income, over: income > 0 && sum > income };
}
