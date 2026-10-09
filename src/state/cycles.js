// Periode berulang ("siklus"): harian, mingguan, bulanan, atau kustom.
// applyCycles() membuat periode baru setiap kali periode lama berakhir,
// mencatat pemasukan otomatis, dan memindahkan sisa ke tabungan bila diminta.
// Semua fungsi murni (mengembalikan data baru) sehingga mudah dites.

import { addDays, monthOf } from '../lib/dates.js';
import { MONTHS } from '../lib/format.js';
import { uid } from '../lib/id.js';
import { periodTitle } from '../lib/period.js';
import { windowAt, WEEKDAYS } from '../lib/windows.js';
import { periodLedger } from './ledger.js';

export const CYCLE_KINDS = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'custom', label: 'Kustom' },
];

export const CARRY_OPTIONS = [
  { value: 'carry', label: 'Bawa ke periode berikutnya', short: 'Dibawa' },
  { value: 'save', label: 'Pindahkan ke tabungan', short: 'Ke tabungan' },
  { value: 'ignore', label: 'Abaikan', short: 'Diabaikan' },
];

const MAX_CATCH_UP = 400;

/** Ubah aturan siklus menjadi spesifikasi jendela (lihat lib/windows.js). */
export function cycleSpec(c) {
  if (c.kind === 'daily') return { kind: 'day' };
  if (c.kind === 'weekly') return { kind: 'week', weekStart: c.weekStart ?? 0 };
  if (c.kind === 'monthly') return { kind: 'month', monthDay: c.monthDay ?? 1 };
  return { kind: 'every', anchor: c.anchor, count: c.count || 1, unit: c.unit || 'month' };
}

/** Tanggal mulai bawaan untuk aturan ini: awal jendela yang memuat `today`. */
export function defaultAnchor(c, today) {
  if (c.kind === 'custom') return today;
  return windowAt(cycleSpec(c), today).start;
}

/**
 * Rentang periode yang dimulai di `start`. Periode pertama boleh "terpotong"
 * (misalnya mulai tanggal 10, uang datang tiap tanggal 25 → 10–24), setelah itu selalu rapi.
 */
export function cycleRangeFrom(c, start) {
  const w = windowAt(cycleSpec(c), start);
  return { start, end: w.end };
}

/** n periode pertama dari aturan ini (untuk pratinjau & tes). */
export function previewCycle(c, n = 3) {
  const out = [];
  let start = c.anchor;
  for (let i = 0; i < n && start; i++) {
    const r = cycleRangeFrom(c, start);
    out.push(r);
    start = addDays(r.end, 1);
  }
  return out;
}

/** Kalimat aturan: "Tiap bulan, mulai tanggal 25", "Tiap Sabtu", "Tiap 10 hari". */
export function cycleRuleLabel(c) {
  if (c.kind === 'daily') return 'Tiap hari';
  if (c.kind === 'weekly') return `Tiap minggu, mulai hari ${WEEKDAYS[c.weekStart ?? 0]}`;
  if (c.kind === 'monthly') return `Tiap bulan, mulai tanggal ${c.monthDay ?? 1}`;
  const unit = { day: 'hari', week: 'minggu', month: 'bulan' }[c.unit] ?? 'hari';
  return `Tiap ${c.count} ${unit}`;
}

/** Nama untuk satu periode hasil siklus. Bulanan diberi nama bulan supaya mudah dibedakan. */
export function instanceName(c, start) {
  const base = c.name?.trim() || 'Periode';
  const monthly = c.kind === 'monthly' || (c.kind === 'custom' && c.unit === 'month');
  return monthly ? `${base} ${MONTHS[Number(monthOf(start).slice(5)) - 1]}` : base;
}

function makeIncomeTx(c, period) {
  return {
    id: uid(),
    type: 'income',
    amount: c.income.amount,
    categoryId: c.income.categoryId,
    date: period.start,
    note: c.income.note || c.name || 'Pemasukan periode',
    recurringId: null,
    periodId: period.id,
    auto: true,
    createdAt: Date.now(),
  };
}

/** Buat periode-periode yang sudah waktunya untuk setiap siklus aktif. */
function generate(data, today) {
  const periods = [];
  const transactions = [];
  let changed = false;
  const cycles = data.cycles.map((c) => {
    if (!c.active) return c;
    // periode pertama selalu dibuat (walau tanggalnya di masa depan); berikutnya hanya kalau sudah tiba
    let start = c.until ? addDays(c.until, 1) : c.anchor;
    let until = c.until;
    let n = 0;
    while (start && (!until || (c.repeat && start <= today)) && n < MAX_CATCH_UP) {
      const r = cycleRangeFrom(c, start);
      const period = {
        id: uid(),
        name: instanceName(c, r.start),
        start: r.start,
        end: r.end,
        cycleId: c.id,
        carry: c.carry,
        goalId: c.goalId ?? null,
        settled: null,
        createdAt: Date.now(),
      };
      periods.push(period);
      if (c.income?.auto && c.income.amount > 0) transactions.push(makeIncomeTx(c, period));
      until = r.end;
      start = addDays(r.end, 1);
      n++;
    }
    if (until === c.until) return c;
    changed = true;
    return { ...c, until };
  });
  if (!changed) return data;
  return {
    ...data,
    cycles,
    periods: [...data.periods, ...periods],
    transactions: [...data.transactions, ...transactions],
  };
}

/**
 * Periode yang sudah selesai dengan aturan "pindahkan ke tabungan":
 * sisa positifnya disetor ke target tabungan (satu kali, ditandai `settled`).
 */
function settle(data, today) {
  const due = data.periods
    .filter((p) => p.carry === 'save' && !p.settled && p.end < today)
    .sort((a, b) => a.end.localeCompare(b.end));
  if (!due.length) return data;
  let next = data;
  for (const p of due) {
    const row = periodLedger(next).get(p.id);
    const goal = next.goals.find((g) => g.id === p.goalId);
    const amount = row && goal ? Math.max(0, row.remaining) : 0;
    let deposit = null;
    if (amount > 0) {
      deposit = {
        id: uid(),
        goalId: goal.id,
        amount,
        date: p.end,
        note: `Sisa ${periodTitle(p)}`,
        periodId: p.id,
        auto: true,
      };
    }
    next = {
      ...next,
      deposits: deposit ? [...next.deposits, deposit] : next.deposits,
      periods: next.periods.map((x) =>
        x.id === p.id ? { ...x, settled: { amount, depositId: deposit?.id ?? null, goalId: goal?.id ?? null, at: today } } : x,
      ),
    };
  }
  return next;
}

export function applyCycles(data, today) {
  return settle(generate(data, today), today);
}

/**
 * Validasi isian rencana periode. Mengembalikan { errors, warnings }.
 * input: { kind, weekStart, monthDay, count, unit, anchor, mode, end, incomeAmount, carry, goalId }
 */
export function validateCycleInput(input) {
  const errors = {};
  const warnings = {};
  if (!input.anchor) errors.anchor = 'Pilih tanggal mulai dulu ya.';
  if (input.kind === 'monthly') {
    const d = Number(input.monthDay);
    if (!Number.isInteger(d) || d < 1 || d > 31) errors.monthDay = 'Pilih tanggal 1 sampai 31.';
    else if (d > 28) warnings.monthDay = `Di bulan yang lebih pendek, periode dimulai di hari terakhir bulan itu.`;
  }
  if (input.kind === 'custom') {
    if (input.mode === 'end') {
      if (!input.end) errors.end = 'Pilih tanggal berakhir.';
      else if (input.anchor && input.end < input.anchor) errors.end = 'Tanggal berakhir tidak boleh sebelum tanggal mulai.';
    } else {
      const n = Number(input.count);
      if (input.count === '' || input.count == null) errors.count = 'Isi lama periodenya.';
      else if (!Number.isInteger(n) || n <= 0) errors.count = 'Lama periode harus angka bulat lebih dari 0.';
      else if ((input.unit === 'day' && n > 731) || (input.unit === 'week' && n > 104) || (input.unit === 'month' && n > 24)) {
        errors.count = 'Maksimal 2 tahun untuk satu periode.';
      }
    }
  }
  if (input.incomeOn && !(Number(input.incomeAmount) > 0)) errors.incomeAmount = 'Jumlah pemasukan tidak boleh nol.';
  if (input.carry === 'save' && !input.goalId) errors.goalId = 'Pilih target tabungan untuk menampung sisanya.';
  return { errors, warnings };
}
