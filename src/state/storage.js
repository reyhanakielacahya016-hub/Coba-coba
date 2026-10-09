// Membaca & menyimpan seluruh data ke localStorage.
// Data selalu "dirapikan" saat dibaca supaya file lama/rusak tidak membuat aplikasi error.

import { todayISO } from '../lib/dates.js';
import { makeFallbackCategories } from './suggestions.js';

// Nama kunci tetap 'saku:v1' supaya data lama terbaca; versi struktur ada di field `version`.
export const STORAGE_KEY = 'saku:v1';
export const SCHEMA_VERSION = 3;

export function emptyData() {
  return {
    version: SCHEMA_VERSION,
    settings: { theme: 'system', onboarded: false, lastBackup: null },
    categories: makeFallbackCategories(),
    transactions: [],
    recurring: [],
    goals: [],
    deposits: [],
    checkins: [],
    periods: [],
    cycles: [],
    limits: [],
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const int = (v) => Math.round(Number(v) || 0);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMonth = (v) => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);
const type = (v) => (v === 'income' ? 'income' : 'expense');

/** Ubah data dari versi lama ke versi terbaru. Tambahkan langkah baru di sini. */
export function migrate(raw) {
  const data = { ...raw };
  const from = Number(data.version) || 1;
  // v1 -> v2: fitur periode pemasukan. Data lama belum punya periode, jadi
  // dimulai dengan daftar kosong; semua transaksi tetap utuh dan tetap
  // bisa dilihat per bulan kalender.
  if (from < 2) {
    data.periods = Array.isArray(data.periods) ? data.periods : [];
  }
  // v2 -> v3: periode berulang (cycles) dan batasan (limits).
  // Anggaran kategori lama (per bulan) menjadi batasan "per bulan, nominal tetap"
  // yang dimulai pada tanggal yang sama dengan periode terakhir (atau tanggal 1).
  // Periode lama menjadi periode "sekali saja" dengan sisa diabaikan, jadi angkanya tidak berubah.
  if (from < 3) {
    const periods = arr(data.periods).filter((p) => isObj(p) && isDate(p.start));
    const latest = periods.sort((a, b) => b.start.localeCompare(a.start))[0];
    const monthDay = latest ? Number(latest.start.slice(8, 10)) : 1;
    const today = todayISO();
    data.limits = arr(data.limits).length
      ? data.limits
      : arr(data.categories)
          .filter((c) => isObj(c) && c.id && c.type !== 'income' && int(c.budget) > 0)
          .map((c) => ({
            id: `lim-${c.id}`,
            name: '',
            target: String(c.id),
            window: { kind: 'month', monthDay },
            mode: 'fixed',
            amount: int(c.budget),
            percent: null,
            rollover: 'reset',
            warnAt: 0.8,
            active: true,
            since: today,
            createdAt: Date.now(),
          }));
    data.cycles = arr(data.cycles);
  }
  data.version = SCHEMA_VERSION;
  return data;
}

/**
 * Validasi & normalisasi data. Lempar Error kalau bentuknya sama sekali bukan data Saku.
 */
export function normalizeData(raw) {
  if (!isObj(raw)) throw new Error('Format data tidak dikenali.');
  const data = migrate(raw);

  const categories = arr(data.categories)
    .filter((c) => isObj(c) && c.id && c.name)
    .map((c) => ({
      id: String(c.id),
      name: String(c.name).slice(0, 40),
      emoji: String(c.emoji || '📦').slice(0, 8),
      type: type(c.type),
      locked: Boolean(c.locked),
    }));
  // pastikan kategori cadangan selalu ada
  for (const f of makeFallbackCategories()) {
    if (!categories.some((c) => c.id === f.id)) categories.push(f);
    else categories.find((c) => c.id === f.id).locked = true;
  }
  const catIds = new Set(categories.map((c) => c.id));
  const fallbackFor = (t) => (t === 'income' ? 'lainnya-in' : 'lainnya-out');

  const transactions = arr(data.transactions)
    .filter((t) => isObj(t) && t.id && isDate(t.date) && int(t.amount) > 0)
    .map((t) => {
      const tt = type(t.type);
      return {
        id: String(t.id),
        type: tt,
        amount: int(t.amount),
        categoryId: catIds.has(t.categoryId) ? t.categoryId : fallbackFor(tt),
        date: t.date,
        note: String(t.note || '').slice(0, 120),
        recurringId: t.recurringId ? String(t.recurringId) : null,
        periodId: t.periodId ? String(t.periodId) : null,
        auto: Boolean(t.auto),
        createdAt: int(t.createdAt) || Date.now(),
      };
    });

  const recurring = arr(data.recurring)
    .filter((r) => isObj(r) && r.id && int(r.amount) > 0 && isMonth(r.startMonth))
    .map((r) => {
      const rt = type(r.type);
      return {
        id: String(r.id),
        type: rt,
        amount: int(r.amount),
        categoryId: catIds.has(r.categoryId) ? r.categoryId : fallbackFor(rt),
        note: String(r.note || '').slice(0, 120),
        dayOfMonth: Math.min(31, Math.max(1, int(r.dayOfMonth) || 1)),
        startMonth: r.startMonth,
        lastGenerated: isMonth(r.lastGenerated) ? r.lastGenerated : null,
        active: r.active !== false,
      };
    });

  const goals = arr(data.goals)
    .filter((g) => isObj(g) && g.id && g.name && int(g.target) > 0)
    .map((g) => ({
      id: String(g.id),
      name: String(g.name).slice(0, 40),
      emoji: String(g.emoji || '🎯').slice(0, 8),
      target: int(g.target),
      deadline: isDate(g.deadline) ? g.deadline : null,
      createdAt: int(g.createdAt) || Date.now(),
      achievedAt: g.achievedAt ? int(g.achievedAt) : null,
    }));
  const goalIds = new Set(goals.map((g) => g.id));

  const deposits = arr(data.deposits)
    .filter((d) => isObj(d) && d.id && goalIds.has(d.goalId) && isDate(d.date) && int(d.amount) !== 0)
    .map((d) => ({
      id: String(d.id),
      goalId: d.goalId,
      amount: int(d.amount),
      date: d.date,
      note: String(d.note || '').slice(0, 120),
      periodId: d.periodId ? String(d.periodId) : null,
      auto: Boolean(d.auto),
    }));

  const settings = isObj(data.settings) ? data.settings : {};

  const cycles = arr(data.cycles)
    .filter((c) => isObj(c) && c.id && isDate(c.anchor))
    .map((c) => normalizeCycle(c, catIds, goalIds));
  const cycleIds = new Set(cycles.map((c) => c.id));

  const periods = arr(data.periods)
    .filter((p) => isObj(p) && p.id && isDate(p.start) && isDate(p.end) && p.end >= p.start)
    .map((p) => ({
      id: String(p.id),
      name: String(p.name || '').slice(0, 60),
      start: p.start,
      end: p.end,
      cycleId: cycleIds.has(p.cycleId) ? p.cycleId : null,
      carry: pick(p.carry, CARRY, 'ignore'),
      goalId: goalIds.has(p.goalId) ? p.goalId : null,
      settled: isObj(p.settled) ? { ...p.settled, amount: int(p.settled.amount) } : null,
      createdAt: int(p.createdAt) || Date.now(),
    }));

  const limits = arr(data.limits)
    .filter((l) => isObj(l) && l.id)
    .map((l) => normalizeLimit(l, catIds))
    .filter((l) => l.target);

  return {
    version: SCHEMA_VERSION,
    settings: {
      theme: ['light', 'dark', 'system'].includes(settings.theme) ? settings.theme : 'system',
      onboarded: Boolean(settings.onboarded),
      lastBackup: isDate(settings.lastBackup) ? settings.lastBackup : null,
    },
    categories,
    transactions,
    recurring,
    goals,
    deposits,
    checkins: [...new Set(arr(data.checkins).filter(isDate))],
    periods,
    cycles,
    limits,
  };
}

const CARRY = ['carry', 'save', 'ignore'];
const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);
const clamp = (v, min, max, fallback) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function normalizeCycle(c, catIds, goalIds) {
  const income = isObj(c.income) && int(c.income.amount) > 0
    ? {
        amount: int(c.income.amount),
        categoryId: catIds.has(c.income.categoryId) ? c.income.categoryId : 'lainnya-in',
        auto: c.income.auto !== false,
        note: String(c.income.note || '').slice(0, 120),
      }
    : null;
  return {
    id: String(c.id),
    name: String(c.name || '').slice(0, 60),
    kind: pick(c.kind, ['daily', 'weekly', 'monthly', 'custom'], 'monthly'),
    weekStart: clamp(c.weekStart, 0, 6, 0),
    monthDay: clamp(c.monthDay, 1, 31, 1),
    count: clamp(c.count, 1, 731, 1),
    unit: pick(c.unit, ['day', 'week', 'month'], 'month'),
    anchor: c.anchor,
    repeat: c.repeat !== false,
    income,
    carry: pick(c.carry, CARRY, 'ignore'),
    goalId: goalIds.has(c.goalId) ? c.goalId : null,
    active: c.active !== false,
    until: isDate(c.until) ? c.until : null,
    createdAt: int(c.createdAt) || Date.now(),
  };
}

function normalizeLimit(l, catIds) {
  const w = isObj(l.window) ? l.window : {};
  const kind = pick(w.kind, ['day', 'week', 'month', 'ndays', 'range', 'period'], 'period');
  const window = { kind };
  if (kind === 'week') window.weekStart = clamp(w.weekStart, 0, 6, 0);
  if (kind === 'month') window.monthDay = clamp(w.monthDay, 1, 31, 1);
  if (kind === 'ndays') {
    window.count = clamp(w.count, 1, 366, 1);
    window.anchor = isDate(w.anchor) ? w.anchor : isDate(l.since) ? l.since : todayISO();
  }
  if (kind === 'range') {
    window.start = isDate(w.start) ? w.start : todayISO();
    window.end = isDate(w.end) && w.end >= window.start ? w.end : window.start;
  }
  const target = l.target === 'total' ? 'total' : catIds.has(l.target) ? String(l.target) : null;
  let mode = pick(l.mode, ['fixed', 'percent', 'auto'], 'fixed');
  if (mode === 'auto' && target !== 'total') mode = 'fixed';
  return {
    id: String(l.id),
    name: String(l.name || '').slice(0, 40),
    target,
    window,
    mode,
    amount: mode === 'fixed' ? Math.max(0, int(l.amount)) : int(l.amount) || 0,
    percent: mode === 'percent' ? Math.min(100, Math.max(0, Number(l.percent) || 0)) : l.percent ?? null,
    rollover: mode === 'auto' ? 'reset' : pick(l.rollover, ['reset', 'carry'], 'reset'),
    warnAt: Math.min(1, Math.max(0.3, Number(l.warnAt) || 0.8)),
    skipRecurring: target === 'total' ? l.skipRecurring !== false : false,
    active: l.active !== false,
    since: isDate(l.since) ? l.since : todayISO(),
    createdAt: int(l.createdAt) || Date.now(),
  };
}

export function loadData() {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return emptyData();
    return normalizeData(JSON.parse(text));
  } catch (err) {
    console.warn('Gagal membaca data, mulai dari kosong.', err);
    return emptyData();
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('Gagal menyimpan data.', err);
    return false;
  }
}
