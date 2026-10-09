// Template cepat untuk periode (dan batasan yang menyertainya).
// Semua isian tetap bisa diubah setelah template dipilih.

import { addDays, addMonths, monthOf } from '../lib/dates.js';
import { EXPENSE_SUGGESTIONS } from './suggestions.js';

const endOfMonth = (today) => addDays(`${addMonths(monthOf(today), 1)}-01`, -1);

export const PERIOD_TEMPLATES = [
  {
    id: 'kos',
    emoji: '🏠',
    title: 'Uang bulanan anak kos',
    desc: 'Tiap tanggal 25 · Rp 1.500.000 · sisa dibawa',
    plan: () => ({
      kind: 'monthly',
      monthDay: 25,
      repeat: true,
      incomeOn: true,
      incomeAmount: 1500000,
      incomeAuto: true,
      carry: 'carry',
      name: 'Uang bulanan',
    }),
    limits: [
      { key: 'harian', label: 'Jatah harian otomatis', target: 'total', window: { kind: 'day' }, mode: 'auto', name: 'Jatah harian' },
      { key: 'makan', label: 'Makan Rp 30.000/hari', target: '@makan', window: { kind: 'day' }, mode: 'fixed', amount: 30000 },
      { key: 'jajan', label: 'Jajan maks. 10%', target: '@jajan', window: { kind: 'period' }, mode: 'percent', percent: 10 },
    ],
  },
  {
    id: 'mingguan',
    emoji: '💼',
    title: 'Gaji mingguan',
    desc: 'Tiap Sabtu · Rp 400.000 · sisa ke tabungan',
    plan: () => ({
      kind: 'weekly',
      weekStart: 5,
      repeat: true,
      incomeOn: true,
      incomeAmount: 400000,
      incomeAuto: true,
      carry: 'save',
      name: 'Gaji mingguan',
    }),
    limits: [
      { key: 'harian', label: 'Jatah harian otomatis', target: 'total', window: { kind: 'day' }, mode: 'auto', name: 'Jatah harian' },
      { key: 'jajan', label: 'Jajan Rp 50.000/minggu', target: '@jajan', window: { kind: 'week', weekStart: 5 }, mode: 'fixed', amount: 50000 },
    ],
  },
  {
    id: 'hemat',
    emoji: '🌱',
    title: 'Hemat akhir bulan',
    desc: 'Hari ini sampai akhir bulan · batas ketat',
    plan: (today) => ({
      kind: 'custom',
      customMode: 'end',
      end: endOfMonth(today),
      anchor: today,
      anchorAuto: false,
      repeat: false,
      incomeOn: false,
      carry: 'ignore',
      name: 'Hemat akhir bulan',
    }),
    limits: [
      { key: 'harian', label: 'Jatah harian otomatis', target: 'total', window: { kind: 'day' }, mode: 'auto', name: 'Jatah harian' },
      { key: 'jajan', label: 'Jajan Rp 20.000 per 3 hari', target: '@jajan', window: { kind: 'ndays', count: 3 }, mode: 'fixed', amount: 20000 },
    ],
  },
];

/** Cari kategori pengeluaran untuk kunci saran ("@makan" → kategori "Makan" milik pengguna). */
export function resolveTarget(data, target) {
  if (!target.startsWith('@')) return target;
  const key = target.slice(1);
  const name = EXPENSE_SUGGESTIONS.find((s) => s.key === key)?.name.toLowerCase() ?? key;
  const cat = data.categories.find((c) => c.type === 'expense' && c.name.toLowerCase() === name);
  return cat?.id ?? null;
}

/** Ubah saran batasan dari template menjadi batasan siap simpan (null kalau kategorinya tidak ada). */
export function limitFromTemplate(data, t, { id, today }) {
  const target = resolveTarget(data, t.target);
  if (!target) return null;
  const window = { ...t.window };
  if (window.kind === 'ndays') window.anchor = today;
  return {
    id,
    name: t.name ?? '',
    target,
    window,
    mode: t.mode,
    amount: t.amount ?? 0,
    percent: t.percent ?? null,
    rollover: 'reset',
    warnAt: 0.8,
    skipRecurring: target === 'total',
    active: true,
    since: today,
    createdAt: Date.now(),
  };
}
