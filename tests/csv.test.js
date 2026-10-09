import { describe, expect, it } from 'vitest';
import { csvToTransactions, parseCSV, transactionsToCSV } from '../src/lib/csv.js';
import { buildSeedData } from '../src/state/seed.js';

describe('csv', () => {
  it('round-trip ekspor lalu impor menghasilkan transaksi yang sama', () => {
    const seed = buildSeedData('2026-10-09');
    seed.transactions[0].note = 'Nasi "padang", pedas';
    const text = transactionsToCSV(seed);
    const { transactions, categories, skipped } = csvToTransactions(text, seed.categories);
    expect(skipped).toBe(0);
    expect(categories).toHaveLength(0);
    expect(transactions).toHaveLength(seed.transactions.length);
    const sum = (list) => list.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    expect(sum(transactions)).toBe(sum(seed.transactions));
    expect(transactions.some((t) => t.note === 'Nasi "padang", pedas')).toBe(true);
  });

  it('memahami titik koma, format tanggal dd/mm/yyyy, dan nominal bertitik', () => {
    const text = 'tanggal;jenis;kategori;nominal;catatan\n09/10/2026;pengeluaran;Kopi;Rp 18.000;latte\n;;;;\nbukan;tanggal;x;1;';
    const { transactions, categories, skipped } = csvToTransactions(text, []);
    expect(transactions).toEqual([expect.objectContaining({ date: '2026-10-09', amount: 18000, note: 'latte', type: 'expense' })]);
    expect(categories[0].name).toBe('Kopi');
    expect(skipped).toBe(1);
  });

  it('menolak CSV tanpa kolom wajib', () => {
    expect(() => csvToTransactions('a,b\n1,2', [])).toThrow();
  });

  it('parser menangani baris baru di dalam tanda kutip', () => {
    expect(parseCSV('a,b\n"x\ny",2')).toEqual([['a', 'b'], ['x\ny', '2']]);
  });
});
