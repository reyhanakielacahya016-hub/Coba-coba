// Fungsi-fungsi "membaca" data: menghitung total, sisa, anggaran, tren, dll.
// Semuanya murni (tanpa efek samping) sehingga mudah dites.

import { addDays, addMonths, currentMonth, daysInMonth, diffDays, monthOf, todayISO, weekOfMonth } from '../lib/dates.js';
import { formatRupiah } from '../lib/format.js';
import { computeStreak } from '../lib/streak.js';

export const WARN_AT = 0.8;

export function categoryMap(data) {
  return new Map(data.categories.map((c) => [c.id, c]));
}

/** Urutan tampilan kategori: pengeluaran dulu, "Lainnya" di akhir masing-masing. */
export function sortCategories(list) {
  const rank = (c) => (c.type === 'income' ? 2 : 0) + (c.locked ? 1 : 0);
  return list.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
}

export function txInMonth(data, month) {
  return data.transactions.filter((t) => monthOf(t.date) === month);
}

/** Ringkasan satu bulan. Sisa = pemasukan − pengeluaran − ditabung. */
export function monthTotals(data, month) {
  let income = 0;
  let expense = 0;
  for (const t of data.transactions) {
    if (monthOf(t.date) !== month) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  const saved = data.deposits.filter((d) => monthOf(d.date) === month).reduce((s, d) => s + d.amount, 0);
  return { income, expense, saved, remaining: income - expense - saved };
}

/** Pengeluaran per kategori, urut dari terbesar. */
export function spendingByCategory(data, month) {
  const cats = categoryMap(data);
  const sums = new Map();
  for (const t of data.transactions) {
    if (t.type !== 'expense' || monthOf(t.date) !== month) continue;
    sums.set(t.categoryId, (sums.get(t.categoryId) || 0) + t.amount);
  }
  const total = [...sums.values()].reduce((a, b) => a + b, 0);
  return [...sums.entries()]
    .map(([id, amount]) => ({ category: cats.get(id), amount, share: total ? amount / total : 0 }))
    .filter((x) => x.category)
    .sort((a, b) => b.amount - a.amount);
}

export function budgetLevel(ratio) {
  if (ratio > 1) return 'over';
  if (ratio >= WARN_AT) return 'warn';
  return 'ok';
}

/** Status anggaran setiap kategori pengeluaran yang punya batas. */
export function budgetStatus(data, month) {
  const spent = new Map();
  for (const t of data.transactions) {
    if (t.type !== 'expense' || monthOf(t.date) !== month) continue;
    spent.set(t.categoryId, (spent.get(t.categoryId) || 0) + t.amount);
  }
  return data.categories
    .filter((c) => c.type === 'expense' && c.budget)
    .map((c) => {
      const s = spent.get(c.id) || 0;
      const ratio = s / c.budget;
      return { category: c, spent: s, budget: c.budget, left: c.budget - s, ratio, level: budgetLevel(ratio) };
    });
}

/** Pesan lembut untuk satu baris anggaran. */
export function budgetMessage(b) {
  const name = b.category.name.toLowerCase();
  if (b.level === 'over') return `Lewat ${formatRupiah(-b.left)} dari rencana. Tidak apa-apa, bulan depan bisa diatur lagi.`;
  if (b.level === 'warn') return `Tinggal ${formatRupiah(b.left)} untuk ${name}, pelan-pelan ya.`;
  if (b.spent === 0) return 'Belum terpakai sama sekali.';
  return `Masih ada ${formatRupiah(b.left)}.`;
}

/** Pengeluaran per hari dalam bulan. */
export function dailyTrend(data, month) {
  const n = daysInMonth(month);
  const days = Array.from({ length: n }, (_, i) => ({ key: i + 1, label: String(i + 1), amount: 0 }));
  for (const t of data.transactions) {
    if (t.type !== 'expense' || monthOf(t.date) !== month) continue;
    days[Number(t.date.slice(8, 10)) - 1].amount += t.amount;
  }
  return days;
}

/** Pengeluaran per minggu (Minggu 1 = tanggal 1–7, dst). */
export function weeklyTrend(data, month) {
  const weeks = Math.ceil(daysInMonth(month) / 7);
  const out = Array.from({ length: weeks }, (_, i) => {
    const start = i * 7 + 1;
    const end = Math.min(start + 6, daysInMonth(month));
    return { key: i + 1, label: `${start}–${end}`, amount: 0 };
  });
  for (const t of data.transactions) {
    if (t.type !== 'expense' || monthOf(t.date) !== month) continue;
    out[weekOfMonth(t.date) - 1].amount += t.amount;
  }
  return out;
}

/** Kategori diurutkan dari yang paling sering dipakai 60 hari terakhir. */
export function categoriesByUsage(data, type, today = todayISO()) {
  const since = addDays(today, -60);
  const count = new Map();
  for (const t of data.transactions) {
    if (t.type !== type || t.date < since || t.auto) continue;
    count.set(t.categoryId, (count.get(t.categoryId) || 0) + 1);
  }
  const list = data.categories.filter((c) => c.type === type);
  return list
    .map((c, i) => ({ c, n: count.get(c.id) || 0, i }))
    .sort((a, b) => {
      // "Lainnya" selalu di belakang
      if (a.c.locked !== b.c.locked) return a.c.locked ? 1 : -1;
      return b.n - a.n || a.i - b.i;
    })
    .map((x) => x.c);
}

/** Tanggal-tanggal yang "aktif" untuk streak: ada catatan manual atau check-in. */
export function streakInfo(data, today = todayISO()) {
  const dates = new Set(data.checkins);
  for (const t of data.transactions) if (!t.auto) dates.add(t.date);
  return computeStreak(dates, today);
}

export function goalSaved(data, goalId) {
  return data.deposits.filter((d) => d.goalId === goalId).reduce((s, d) => s + d.amount, 0);
}

/**
 * Info progres target tabungan, termasuk saran setoran per minggu
 * agar tercapai tepat waktu.
 */
export function goalProgress(data, goal, today = todayISO()) {
  const saved = goalSaved(data, goal.id);
  const left = Math.max(0, goal.target - saved);
  const ratio = goal.target ? Math.min(1, saved / goal.target) : 0;
  let daysLeft = null;
  let perWeek = null;
  if (goal.deadline) {
    daysLeft = diffDays(today, goal.deadline);
    if (left > 0 && daysLeft > 0) perWeek = Math.ceil(left / Math.max(1, daysLeft / 7) / 1000) * 1000;
  }
  return { saved, left, ratio, daysLeft, perWeek, done: saved >= goal.target };
}

/** Satu kalimat ringkasan yang ramah untuk dashboard. */
export function monthInsight(data, month, today = todayISO()) {
  const { income, expense, remaining } = monthTotals(data, month);
  const isCurrent = month === monthOf(today);
  const isFuture = month > monthOf(today);

  if (isFuture) return { tone: 'neutral', text: 'Bulan ini belum dimulai. Sampai jumpa nanti!' };
  if (income === 0 && expense === 0) {
    return isCurrent
      ? { tone: 'neutral', text: 'Belum ada catatan bulan ini. Mulai dari yang kecil, misalnya sarapan tadi pagi.' }
      : { tone: 'neutral', text: 'Tidak ada catatan di bulan ini.' };
  }

  if (isCurrent) {
    const day = Number(today.slice(8, 10));
    const daysLeft = daysInMonth(month) - day + 1;
    if (remaining > 0) {
      const perDay = Math.floor(remaining / daysLeft / 500) * 500;
      return {
        tone: 'good',
        text: `Sisa ${daysLeft} hari lagi. Kira-kira ${formatRupiah(perDay)} per hari supaya aman sampai akhir bulan.`,
      };
    }
    if (income === 0) {
      return { tone: 'neutral', text: 'Belum ada pemasukan yang dicatat bulan ini. Kiriman atau gaji bisa dicatat lewat tombol +.' };
    }
    return {
      tone: 'care',
      text: 'Pengeluaran sudah menyusul pemasukan. Tidak apa-apa, yuk lihat pos mana yang bisa dikurangi pelan-pelan.',
    };
  }

  const prev = monthTotals(data, addMonths(month, -1));
  if (remaining > 0) {
    return { tone: 'good', text: `Bulan ini kamu menyisakan ${formatRupiah(remaining)}. Keren! 🌿` };
  }
  if (prev.expense && expense < prev.expense) {
    return { tone: 'neutral', text: `Pengeluaranmu ${formatRupiah(prev.expense - expense)} lebih hemat dari bulan sebelumnya.` };
  }
  return { tone: 'care', text: 'Bulan yang cukup berat. Semoga bulan berikutnya lebih ringan.' };
}

/**
 * Saring transaksi untuk halaman Riwayat.
 * filter: { q, type: 'all'|'expense'|'income', categoryIds: string[], from, to }
 */
export function filterTransactions(data, filter) {
  const cats = categoryMap(data);
  const q = (filter.q || '').trim().toLowerCase();
  // "25.000" atau "25000" dicari sebagai nominal
  const qNumber = /^[\d.\s]+$/.test(q) ? q.replace(/[.\s]/g, '') : '';
  const catSet = filter.categoryIds?.length ? new Set(filter.categoryIds) : null;
  return data.transactions
    .filter((t) => {
      if (filter.type && filter.type !== 'all' && t.type !== filter.type) return false;
      if (catSet && !catSet.has(t.categoryId)) return false;
      if (filter.from && t.date < filter.from) return false;
      if (filter.to && t.date > filter.to) return false;
      if (q) {
        const name = cats.get(t.categoryId)?.name.toLowerCase() ?? '';
        const hit = t.note.toLowerCase().includes(q) || name.includes(q) || (qNumber && String(t.amount).includes(qNumber));
        if (!hit) return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

/** Kelompokkan transaksi (sudah terurut) per tanggal. */
export function groupByDay(list) {
  const groups = [];
  let current = null;
  for (const t of list) {
    if (!current || current.date !== t.date) {
      current = { date: t.date, items: [], expense: 0, income: 0 };
      groups.push(current);
    }
    current.items.push(t);
    current[t.type] += t.amount;
  }
  return groups;
}

export function isCurrentMonth(month) {
  return month === currentMonth();
}
