// Data contoh: dua bulan kehidupan anak kos, dibuat relatif terhadap hari ini
// supaya selalu terlihat "segar" kapan pun aplikasi dibuka.

import { addDays, addMonths, monthOf, todayISO } from '../lib/dates.js';
import { uid } from '../lib/id.js';
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

  const thisMonth = monthOf(today);
  const prevMonth = addMonths(thisMonth, -1);
  const start = `${prevMonth}-01`;
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
      auto: false,
      createdAt: Date.now(),
    });
  };

  const meals = ['Nasi padang', 'Warteg', 'Mie ayam', 'Nasi goreng', 'Ayam geprek', 'Soto', 'Nasi uduk', 'Gado-gado'];
  const snacks = ['Es teh', 'Kopi susu', 'Gorengan', 'Martabak', 'Boba', 'Roti bakar'];
  const rides = ['Ojol ke kampus', 'Bensin', 'Ojol pulang', 'Angkot'];

  for (let d = start; d <= today; d = addDays(d, 1)) {
    const dayNum = Number(d.slice(8, 10));
    // makan 1–2x sehari
    add('makan', between(12000, 22000), d, pick(meals));
    if (rand() < 0.55) add('makan', between(10000, 18000), d, pick(meals));
    if (rand() < 0.5) add('jajan', between(6000, 18000), d, pick(snacks));
    if (rand() < 0.4) add('transport', between(9000, 20000), d, pick(rides));
    if (dayNum === 3) add('pulsa', 75000, d, 'Paket data bulanan');
    if (dayNum === 6 || dayNum === 20) add('laundry', between(25000, 35000, 1000), d, 'Laundry kiloan');
    if (rand() < 0.08) add('belajar', between(5000, 30000), d, pick(['Fotokopi modul', 'Print tugas', 'Buku catatan']));
    if (rand() < 0.07) add('hiburan', between(30000, 55000, 1000), d, pick(['Nonton bioskop', 'Futsal', 'Karaoke']));
  }

  // bulan lalu ada pemasukan tambahan dari kerja sampingan
  add('sampingan', 400000, `${prevMonth}-18`, 'Jaga stand acara kampus', 'income');

  // pastikan bulan ini ada contoh anggaran "hampir habis" & "lewat batas"
  add('jajan', 35000, `${thisMonth}-01` <= today ? `${thisMonth}-01` : today, 'Traktir teman ulang tahun');
  add('hiburan', 45000, today, 'Nonton bareng anak kos');

  data.transactions = tx;

  // jadwal rutin: kiriman ortu & bayar kos tiap tanggal 1
  data.recurring = [
    {
      id: uid(), type: 'income', amount: 2500000, categoryId: cats.kiriman.id, note: 'Kiriman bulanan',
      dayOfMonth: 1, startMonth: prevMonth, lastGenerated: null, active: true,
    },
    {
      id: uid(), type: 'expense', amount: 850000, categoryId: cats.kos.id, note: 'Bayar kos',
      dayOfMonth: 1, startMonth: prevMonth, lastGenerated: null, active: true,
    },
  ];

  // anggaran: dibuat berdasarkan pengeluaran bulan ini supaya semua warna terlihat
  const spentNow = (key) =>
    tx.filter((t) => t.categoryId === cats[key].id && monthOf(t.date) === thisMonth).reduce((s, t) => s + t.amount, 0);
  const roundUp = (n, step = 10000) => Math.max(step, Math.ceil(n / step) * step);
  cats.makan.budget = 900000;
  cats.transport.budget = 250000;
  cats.pulsa.budget = 100000;
  cats.jajan.budget = roundUp(spentNow('jajan') * 0.85); // sedikit lewat batas
  cats.hiburan.budget = roundUp(spentNow('hiburan') / 0.88, 5000); // hampir habis

  // target tabungan
  const laptop = { id: uid(), name: 'Laptop baru', emoji: '💻', target: 7000000, deadline: addDays(today, 240), createdAt: Date.now(), achievedAt: null };
  const mudik = { id: uid(), name: 'Mudik lebaran', emoji: '🚆', target: 1200000, deadline: addDays(today, 150), createdAt: Date.now(), achievedAt: null };
  data.goals = [laptop, mudik];
  const dep = (goal, amount, date, note = '') => data.deposits.push({ id: uid(), goalId: goal.id, amount, date, note });
  dep(laptop, 500000, `${prevMonth}-02`, 'Sisihkan dari kiriman');
  dep(laptop, 250000, `${prevMonth}-19`, 'Dari kerja sampingan');
  dep(mudik, 200000, `${prevMonth}-05`);
  dep(mudik, 150000, `${prevMonth}-25`);
  dep(laptop, 300000, `${thisMonth}-02` <= today ? `${thisMonth}-02` : today, 'Sisihkan dari kiriman');

  data.settings = { theme: 'system', onboarded: true, lastBackup: null };
  return applyRecurring(data, today);
}
