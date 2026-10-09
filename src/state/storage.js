// Membaca & menyimpan seluruh data ke localStorage.
// Data selalu "dirapikan" saat dibaca supaya file lama/rusak tidak membuat aplikasi error.

import { makeFallbackCategories } from './suggestions.js';

export const STORAGE_KEY = 'saku:v1';
export const SCHEMA_VERSION = 1;

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
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const int = (v) => Math.round(Number(v) || 0);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMonth = (v) => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);
const type = (v) => (v === 'income' ? 'income' : 'expense');

/** Ubah data dari versi lama ke versi terbaru. Tambahkan langkah baru di sini. */
function migrate(raw) {
  const data = { ...raw };
  // contoh: if (data.version === 1) { ...; data.version = 2; }
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
      budget: c.budget ? Math.max(0, int(c.budget)) || null : null,
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
    }));

  const settings = isObj(data.settings) ? data.settings : {};

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
