import { describe, expect, it } from 'vitest';
import { applyRecurring } from '../src/state/recurring.js';
import { emptyData, normalizeData } from '../src/state/storage.js';
import { reducer } from '../src/state/reducer.js';
import { budgetStatus, monthTotals, goalProgress, monthInsight } from '../src/state/selectors.js';
import { buildSeedData } from '../src/state/seed.js';

const tx = (over) => ({
  id: Math.random().toString(36).slice(2), type: 'expense', amount: 10000, categoryId: 'lainnya-out',
  date: '2026-10-05', note: '', recurringId: null, auto: false, createdAt: 1, ...over,
});

describe('recurring', () => {
  const base = () => ({
    ...emptyData(),
    recurring: [{ id: 'kos', type: 'expense', amount: 850000, categoryId: 'lainnya-out', note: 'Kos', dayOfMonth: 31, startMonth: '2026-01', lastGenerated: null, active: true }],
  });

  it('mengisi bulan yang terlewat, dengan tanggal dipotong ke akhir bulan', () => {
    const out = applyRecurring(base(), '2026-03-15');
    const dates = out.transactions.map((t) => t.date).sort();
    expect(dates).toEqual(['2026-01-31', '2026-02-28']);
    expect(out.recurring[0].lastGenerated).toBe('2026-02');
  });

  it('tidak membuat transaksi ganda saat dijalankan ulang', () => {
    const once = applyRecurring(base(), '2026-03-31');
    const twice = applyRecurring(once, '2026-03-31');
    expect(twice.transactions).toHaveLength(3);
    expect(twice).toBe(once);
  });

  it('melewati jadwal nonaktif', () => {
    const d = base();
    d.recurring[0].active = false;
    expect(applyRecurring(d, '2026-05-01').transactions).toHaveLength(0);
  });
});

describe('selectors', () => {
  it('sisa = pemasukan − pengeluaran − ditabung', () => {
    const d = emptyData();
    d.goals = [{ id: 'g', name: 'Laptop', emoji: '💻', target: 1000000, deadline: null, createdAt: 1, achievedAt: null }];
    d.deposits = [{ id: 'd', goalId: 'g', amount: 100000, date: '2026-10-02', note: '' }];
    d.transactions = [
      tx({ type: 'income', amount: 2000000, categoryId: 'lainnya-in' }),
      tx({ amount: 300000 }),
      tx({ amount: 999, date: '2026-09-30' }),
    ];
    expect(monthTotals(d, '2026-10')).toEqual({ income: 2000000, expense: 300000, saved: 100000, remaining: 1600000 });
  });

  it('level anggaran ok / warn / over', () => {
    const d = emptyData();
    d.categories.push(
      { id: 'a', name: 'A', emoji: '🍚', type: 'expense', budget: 100000, locked: false },
      { id: 'b', name: 'B', emoji: '🍚', type: 'expense', budget: 100000, locked: false },
      { id: 'c', name: 'C', emoji: '🍚', type: 'expense', budget: 100000, locked: false },
    );
    d.transactions = [tx({ categoryId: 'a', amount: 50000 }), tx({ categoryId: 'b', amount: 85000 }), tx({ categoryId: 'c', amount: 120000 })];
    const levels = Object.fromEntries(budgetStatus(d, '2026-10').map((b) => [b.category.id, b.level]));
    expect(levels).toEqual({ a: 'ok', b: 'warn', c: 'over' });
  });

  it('progres target dan saran setoran per minggu', () => {
    const d = emptyData();
    const goal = { id: 'g', name: 'Mudik', emoji: '🚆', target: 700000, deadline: '2026-10-29', createdAt: 1, achievedAt: null };
    d.goals = [goal];
    d.deposits = [{ id: 'd', goalId: 'g', amount: 100000, date: '2026-10-01', note: '' }];
    const p = goalProgress(d, goal, '2026-10-01');
    expect(p.left).toBe(600000);
    expect(p.perWeek).toBe(150000);
  });
});

describe('reducer', () => {
  it('menghapus kategori memindahkan transaksinya ke Lainnya', () => {
    const d = emptyData();
    d.categories.push({ id: 'jajan', name: 'Jajan', emoji: '🧋', type: 'expense', budget: null, locked: false });
    d.transactions = [tx({ categoryId: 'jajan' })];
    const out = reducer(d, { type: 'DELETE_CATEGORY', id: 'jajan' });
    expect(out.categories.some((c) => c.id === 'jajan')).toBe(false);
    expect(out.transactions[0].categoryId).toBe('lainnya-out');
  });

  it('kategori Lainnya tidak bisa dihapus', () => {
    const d = emptyData();
    expect(reducer(d, { type: 'DELETE_CATEGORY', id: 'lainnya-out' })).toBe(d);
  });

  it('menandai target tercapai setelah setoran', () => {
    const d = emptyData();
    d.goals = [{ id: 'g', name: 'X', emoji: '🎯', target: 1000, deadline: null, createdAt: 1, achievedAt: null }];
    const out = reducer(d, { type: 'ADD_DEPOSIT', deposit: { id: 'd', goalId: 'g', amount: 1000, date: '2026-10-01', note: '' } });
    expect(out.goals[0].achievedAt).toBeTruthy();
  });
});

describe('storage & seed', () => {
  it('normalisasi memperbaiki data yang rusak', () => {
    const out = normalizeData({ transactions: [{ id: 'x', amount: '5000', date: '2026-10-01', categoryId: 'tidak-ada' }, { bad: true }] });
    expect(out.transactions).toHaveLength(1);
    expect(out.transactions[0].categoryId).toBe('lainnya-out');
    expect(out.categories.some((c) => c.id === 'lainnya-in')).toBe(true);
  });

  it('menolak data yang bukan objek', () => {
    expect(() => normalizeData([])).toThrow();
  });

  it('data contoh valid dan punya anggaran warn & over', () => {
    const seed = buildSeedData('2026-10-09');
    expect(normalizeData(seed).transactions.length).toBe(seed.transactions.length);
    const levels = budgetStatus(seed, '2026-10').map((b) => b.level);
    expect(levels).toContain('over');
    expect(levels).toContain('warn');
    expect(monthInsight(seed, '2026-10', '2026-10-09').text.length).toBeGreaterThan(0);
  });
});
