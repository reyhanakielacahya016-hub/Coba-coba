// Data contoh: dua periode uang bulanan anak kos (mulai tanggal 25), dibuat relatif terhadap hari ini
// supaya selalu terlihat "segar" kapan pun aplikasi dibuka.

import { addDays, addMonths, addMonthsToDate, monthOf, todayISO } from '../lib/dates.js';
import { uid } from '../lib/id.js';
import { everyWindow, monthWindow } from '../lib/windows.js';
import { applyCycles } from './cycles.js';
import { applyRecurring } from './recurring.js';
import { emptyData } from './storage.js';
import { ALL_SUGGESTIONS, categoryFromSuggestion } from './suggestions.js';

// Pengacak dengan "benih" tetap, jadi data contoh selalu sama.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function buildSeedData(today = todayISO()) {
  const rand = rng(20261009);
  const between = (min, max, step = 500) => Math.round((min + rand() * (max - min)) / step) * step;
  const pick = (list) => list[Math.floor(rand() * list.length)];

  const data = emptyData();
  const cats = {};
  for (const s of ALL_SUGGESTIONS) {
    const c = categoryFromSuggestion(s);
    cats[s.key] = c;
    data.categories.push(c);
  }

  // uang bulanan datang tiap tanggal 25: periode berjalan + satu periode sebelumnya
  const current = monthWindow(today, 25);
  const anchor = addMonthsToDate(current.start, -1);
  const tx = [];
  const add = (key, amount, date, note, type = 'expense') => {
    tx.push({
      id: uid(),
      type,
      amount,
      categoryId: cats[key].id,
      date,
      note,
      recurringId: null,
      periodId: null,
      auto: false,
      createdAt: Date.now(),
    });
  };

  const meals = ['Nasi padang', 'Warteg', 'Mie ayam', 'Nasi goreng', 'Ayam geprek', 'Soto', 'Nasi uduk', 'Gado-gado'];
  const snacks = ['Es teh', 'Kopi susu', 'Gorengan', 'Martabak', 'Boba', 'Roti bakar'];
  const rides = ['Ojol ke kampus', 'Bensin', 'Ojol pulang', 'Angkot'];

  for (let d = anchor; d < today; d = addDays(d, 1)) {
    const dayNum = Number(d.slice(8, 10));
    // makan 1–2x sehari
    add('makan', between(12000, 22000), d, pick(meals));
    if (rand() < 0.55) add('makan', between(10000, 18000), d, pick(meals));
    if (rand() < 0.45) add('jajan', between(6000, 16000), d, pick(snacks));
    if (rand() < 0.4) add('transport', between(9000, 20000), d, pick(rides));
    if (dayNum === 3) add('pulsa', 75000, d, 'Paket data bulanan');
    if (dayNum === 6 || dayNum === 20) add('laundry', between(25000, 35000, 1000), d, 'Laundry kiloan');
    if (rand() < 0.08) add('belajar', between(5000, 30000), d, pick(['Fotokopi modul', 'Print tugas', 'Buku catatan']));
    if (rand() < 0.07) add('hiburan', between(30000, 55000, 1000), d, pick(['Nonton bioskop', 'Futsal', 'Karaoke']));
  }

  // hari ini baru sarapan, supaya jatah harian terlihat "aman"
  add('makan', 14000, today, 'Bubur ayam');
  // periode lalu ada pemasukan tambahan dari kerja sampingan
  add('sampingan', 400000, addDays(anchor, 20), 'Jaga stand acara kampus', 'income');
  const yesterday = addDays(today, -1) >= current.start ? addDays(today, -1) : today;
  add('hiburan', 45000, yesterday, 'Nonton bareng anak kos');

  data.transactions = tx;

  // bayar kos tiap tanggal 1 (jadwal rutin bulanan biasa)
  const firstKos = Number(anchor.slice(8, 10)) === 1 ? monthOf(anchor) : addMonths(monthOf(anchor), 1);
  data.recurring = [
    {
      id: uid(), type: 'expense', amount: 850000, categoryId: cats.kos.id, note: 'Bayar kos',
      dayOfMonth: 1, startMonth: firstKos, lastGenerated: null, active: true,
    },
  ];

  // target tabungan
  const laptop = { id: uid(), name: 'Laptop baru', emoji: '💻', target: 7000000, deadline: addDays(today, 240), createdAt: Date.now(), achievedAt: null };
  const mudik = { id: uid(), name: 'Mudik lebaran', emoji: '🚆', target: 1200000, deadline: addDays(today, 150), createdAt: Date.now(), achievedAt: null };
  data.goals = [laptop, mudik];
  const dep = (goal, amount, date, note = '') => data.deposits.push({ id: uid(), goalId: goal.id, amount, date, note, periodId: null, auto: false });
  dep(laptop, 200000, addDays(anchor, 1), 'Sisihkan dari kiriman');
  dep(mudik, 100000, addDays(anchor, 10));
  dep(laptop, 150000, addDays(anchor, 21), 'Dari kerja sampingan');
  dep(laptop, 200000, addDays(current.start, 1) <= today ? addDays(current.start, 1) : today, 'Sisihkan dari kiriman');

  // periode berulang: uang bulanan tiap tanggal 25, dicatat otomatis, sisa dibawa
  data.cycles = [
    {
      id: uid(), name: 'Uang bulanan', kind: 'monthly', weekStart: 0, monthDay: 25, count: 1, unit: 'month',
      anchor, repeat: true, income: { amount: 2500000, categoryId: cats.kiriman.id, auto: true, note: 'Kiriman ortu' },
      carry: 'carry', goalId: null, active: true, until: null, createdAt: Date.now(),
    },
  ];

  const ready = applyCycles(applyRecurring(data, today), today);

  // batasan: contoh dari setiap jenis, dibuat supaya semua warna terlihat
  const spentIn = (key, r) =>
    ready.transactions.filter((t) => t.type === 'expense' && t.categoryId === cats[key].id && t.date >= r.start && t.date <= r.end).reduce((s, t) => s + t.amount, 0);
  const roundUp = (n, step = 5000) => Math.max(step, Math.ceil(n / step) * step);
  const limit = (over) => ({
    id: uid(), name: '', target: 'total', window: { kind: 'day' }, mode: 'fixed', amount: 0, percent: null,
    rollover: 'reset', warnAt: 0.8, active: true, since: anchor, createdAt: Date.now(), ...over,
  });

  // jajan 10% dari pemasukan periode — sengaja sedikit lewat lewat satu traktiran
  const income = 2500000;
  const jajanCap = income * 0.1;
  const jajanNow = spentIn('jajan', { start: current.start, end: today });
  const treat = Math.max(30000, Math.round((jajanCap * 1.06 - jajanNow) / 1000) * 1000);
  ready.transactions.push({
    id: uid(), type: 'expense', amount: treat, categoryId: cats.jajan.id, date: current.start, note: 'Traktir teman ulang tahun',
    recurringId: null, periodId: null, auto: false, createdAt: Date.now(),
  });

  // hiburan per 2 minggu — hampir habis
  const hib = limit({ target: cats.hiburan.id, window: { kind: 'ndays', count: 14, anchor }, mode: 'fixed' });
  const hibWin = everyWindow(today, { anchor, count: 14, unit: 'day' });
  hib.amount = roundUp(Math.max(spentIn('hiburan', hibWin), 45000) / 0.88);

  ready.limits = [
    limit({ name: 'Jatah harian', mode: 'auto', skipRecurring: true }),
    limit({ target: cats.makan.id, amount: 35000 }),
    limit({ target: cats.jajan.id, window: { kind: 'period' }, mode: 'percent', percent: 10 }),
    limit({ target: cats.transport.id, window: { kind: 'ndays', count: 3, anchor }, amount: 25000, rollover: 'carry' }),
    hib,
  ];

  ready.settings = { theme: 'system', onboarded: true, lastBackup: null };
  return ready;
}
