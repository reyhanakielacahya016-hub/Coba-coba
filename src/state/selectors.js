// Fungsi-fungsi "membaca" data: menghitung total, sisa, tren, dll.
// Semuanya murni (tanpa efek samping) sehingga mudah dites.

import { addDays, addMonths, currentMonth, daysInclusive, diffDays, monthOf, monthRange, parseISO, todayISO } from '../lib/dates.js';
import { DAYS, formatDateShort, formatRupiah } from '../lib/format.js';
import { computeStreak } from '../lib/streak.js';
import { periodLedger, rawTotals } from './ledger.js';

export const WARN_AT = 0.8;

export function categoryMap(data) {
  return new Map(data.categories.map((c) => [c.id, c]));
}

/** Urutan tampilan kategori: pengeluaran dulu, "Lainnya" di akhir masing-masing. */
export function sortCategories(list) {
  const rank = (c) => (c.type === 'income' ? 2 : 0) + (c.locked ? 1 : 0);
  return list.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
}

export const inRange = (date, r) => date >= r.start && date <= r.end;

export function txInRange(data, r) {
  return data.transactions.filter((t) => inRange(t.date, r));
}

/**
 * Ringkasan satu rentang. Sisa = sisa bawaan + pemasukan − pengeluaran − ditabung.
 * Sisa bawaan (`carryIn`) hanya ada untuk periode yang periode sebelumnya
 * memakai aturan "bawa sisa".
 */
export function totalsIn(data, r) {
  const { income, expense, saved } = rawTotals(data, r);
  const pid = r.kind === 'month' ? null : r.id;
  const carryIn = pid ? periodLedger(data).get(pid)?.carryIn ?? 0 : 0;
  return { income, expense, saved, carryIn, remaining: carryIn + income - expense - saved };
}

export function monthTotals(data, month) {
  return totalsIn(data, monthRange(month));
}

/** Pengeluaran per kategori, urut dari terbesar. */
export function spendingByCategory(data, r) {
  const cats = categoryMap(data);
  const sums = new Map();
  for (const t of data.transactions) {
    if (t.type !== 'expense' || !inRange(t.date, r)) continue;
    sums.set(t.categoryId, (sums.get(t.categoryId) || 0) + t.amount);
  }
  const total = [...sums.values()].reduce((a, b) => a + b, 0);
  return [...sums.entries()]
    .map(([id, amount]) => ({ category: cats.get(id), amount, share: total ? amount / total : 0 }))
    .filter((x) => x.category)
    .sort((a, b) => b.amount - a.amount);
}

/** Rata-rata pengeluaran kategori pada 3 bulan sebelum `month` (hanya bulan yang ada datanya). */
export function averageSpending(data, categoryId, month) {
  const months = [1, 2, 3].map((n) => addMonths(month, -n));
  const active = new Set(data.transactions.map((t) => monthOf(t.date)));
  const used = months.filter((m) => active.has(m));
  if (!used.length) return 0;
  const total = data.transactions
    .filter((t) => t.categoryId === categoryId && t.type === 'expense' && used.includes(monthOf(t.date)))
    .reduce((s, t) => s + t.amount, 0);
  return Math.round(total / used.length / 1000) * 1000;
}

/** Pengeluaran per hari sepanjang rentang. */
export function dailyTrend(data, r, { excludeRecurring = false } = {}) {
  const n = daysInclusive(r.start, r.end);
  const days = Array.from({ length: n }, (_, i) => {
    const date = addDays(r.start, i);
    const d = Number(date.slice(8, 10));
    return { key: date, date, label: String(d), long: formatDateShort(date, { withYear: false }), amount: 0 };
  });
  for (const t of data.transactions) {
    if (t.type !== 'expense' || !inRange(t.date, r)) continue;
    if (excludeRecurring && t.recurringId) continue;
    days[diffDays(r.start, t.date)].amount += t.amount;
  }
  return days;
}

/** Pengeluaran per 7 hari, dihitung dari tanggal mulai rentang. */
export function weeklyTrend(data, r, opts = {}) {
  const days = dailyTrend(data, r, opts);
  const out = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    const a = chunk[0].date;
    const b = chunk[chunk.length - 1].date;
    const sameMonth = a.slice(0, 7) === b.slice(0, 7);
    out.push({
      key: a,
      date: a,
      end: b,
      label: sameMonth ? `${Number(a.slice(8))}–${Number(b.slice(8))}` : `${Number(a.slice(8))}–${formatDateShort(b, { withYear: false })}`,
      long: `${formatDateShort(a, { withYear: false })} – ${formatDateShort(b, { withYear: false })}`,
      amount: chunk.reduce((s, d) => s + d.amount, 0),
    });
  }
  return out;
}

/**
 * Laju pengeluaran untuk rentang yang sedang berjalan:
 * sisa hari, jatah harian (sisa uang ÷ sisa hari), dan status hari ini.
 * Mengembalikan null kalau hari ini di luar rentang.
 */
export function pace(data, r, today = todayISO()) {
  if (!inRange(today, r)) return null;
  const totals = totalsIn(data, r);
  const daysTotal = daysInclusive(r.start, r.end);
  const daysLeft = daysInclusive(today, r.end); // termasuk hari ini
  const daysElapsed = daysTotal - daysLeft + 1;
  // tagihan rutin (mis. bayar kos) tidak dihitung sebagai jajan hari ini
  const spentToday = data.transactions
    .filter((t) => t.type === 'expense' && t.date === today && !t.recurringId)
    .reduce((s, t) => s + t.amount, 0);
  // jatah dihitung dari kondisi awal hari ini, supaya tidak "turun" setiap kali mencatat
  const availableToday = totals.remaining + spentToday;
  // dibulatkan ke bawah per Rp 500 supaya mudah diingat (dan tetap aman)
  const raw = availableToday > 0 ? availableToday / daysLeft : 0;
  const allowance = raw >= 1000 ? Math.floor(raw / 500) * 500 : Math.floor(raw);
  const ratio = allowance > 0 ? spentToday / allowance : spentToday > 0 ? Infinity : 0;

  let level = 'ok';
  if (totals.income === 0 && totals.remaining <= 0) level = 'none';
  else if (totals.remaining < 0 || ratio > 1) level = 'over';
  else if (ratio >= WARN_AT) level = 'warn';

  return {
    ...totals,
    daysTotal,
    daysLeft,
    daysElapsed,
    timeRatio: daysElapsed / daysTotal,
    spentToday,
    allowance,
    todayLeft: allowance - spentToday,
    todayRatio: ratio,
    level,
    // jatah per hari kalau mulai besok (setelah pengeluaran hari ini)
    allowanceTomorrow: daysLeft > 1 ? Math.max(0, Math.floor(totals.remaining / (daysLeft - 1))) : 0,
  };
}

/** Pengeluaran per hari untuk n hari terakhir (untuk grafik kecil di beranda). */
export function lastDays(data, n = 7, today = todayISO()) {
  const r = { start: addDays(today, -(n - 1)), end: today };
  return dailyTrend(data, r).map((d) => ({ ...d, label: DAYS[parseISO(d.date).getDay()].slice(0, 3) }));
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
export function rangeInsight(data, r, today = todayISO()) {
  const { income, expense, remaining } = totalsIn(data, r);
  const word = r.kind === 'period' ? 'periode ini' : 'bulan ini';
  const isCurrent = inRange(today, r);
  const isFuture = r.start > today;

  if (isFuture) return { tone: 'neutral', text: `${capitalize(word)} belum dimulai. Sampai jumpa nanti!` };
  if (income === 0 && expense === 0) {
    return isCurrent
      ? { tone: 'neutral', text: `Belum ada catatan ${word}. Mulai dari yang kecil, misalnya sarapan tadi pagi.` }
      : { tone: 'neutral', text: `Tidak ada catatan di ${word}.` };
  }

  if (isCurrent) {
    const p = pace(data, r, today);
    if (remaining > 0) {
      const perDay = Math.floor(p.allowanceTomorrow / 500) * 500;
      if (p.daysLeft <= 1) return { tone: 'good', text: `Hari terakhir ${word}, dan masih ada sisa. Keren! 🌿` };
      return {
        tone: 'good',
        text: `Masih ${p.daysLeft} hari lagi. Mulai besok, kira-kira ${formatRupiah(perDay)} per hari supaya aman sampai akhir ${word.split(' ')[0]}.`,
      };
    }
    if (income === 0) {
      return { tone: 'neutral', text: `Belum ada pemasukan yang dicatat ${word}. Kiriman atau gaji bisa dicatat lewat tombol +.` };
    }
    return {
      tone: 'care',
      text: 'Pengeluaran sudah menyusul pemasukan. Tidak apa-apa, yuk lihat pos mana yang bisa dikurangi pelan-pelan.',
    };
  }

  if (remaining > 0) {
    return { tone: 'good', text: `${capitalize(word.replace('ini', 'itu'))} kamu menyisakan ${formatRupiah(remaining)}. Keren! 🌿` };
  }
  return { tone: 'care', text: `${capitalize(word.replace('ini', 'itu'))} cukup berat. Semoga berikutnya lebih ringan.` };
}

function capitalize(t) {
  return t.charAt(0).toUpperCase() + t.slice(1);
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
