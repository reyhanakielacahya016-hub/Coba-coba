import { describe, expect, it } from 'vitest';
import { computeEnd, describeLength, lengthLabel, overlapping, rangeLabel, resolveEnd, validatePeriodInput } from '../src/lib/period.js';
import { addMonthsToDate, isISODate, makeISO } from '../src/lib/dates.js';
import { emptyData, normalizeData, SCHEMA_VERSION } from '../src/state/storage.js';
import { reducer } from '../src/state/reducer.js';
import { adjacentScope, defaultScope, periodForDate, rangeForDate, resolveRange } from '../src/state/scope.js';
import { pace, totalsIn, weeklyTrend } from '../src/state/selectors.js';

const tx = (over) => ({
  id: Math.random().toString(36).slice(2), type: 'expense', amount: 10000, categoryId: 'lainnya-out',
  date: '2026-10-05', note: '', recurringId: null, auto: false, createdAt: 1, ...over,
});

describe('tanggal', () => {
  it('makeISO menolak tanggal yang tidak ada', () => {
    expect(makeISO(2026, 2, 30)).toBeNull();
    expect(makeISO(2028, 2, 29)).toBe('2028-02-29');
    expect(makeISO(2026, 13, 1)).toBeNull();
    expect(isISODate('2026-10-09')).toBe(true);
    expect(isISODate('2026-02-31')).toBe(false);
  });
  it('tambah bulan memotong ke akhir bulan', () => {
    expect(addMonthsToDate('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDate('2026-10-25', 1)).toBe('2026-11-25');
  });
});

describe('periode', () => {
  it('menghitung tanggal akhir dari hari, minggu, bulan', () => {
    expect(computeEnd('2026-10-01', 10, 'day')).toBe('2026-10-10');
    expect(computeEnd('2026-10-01', 3, 'week')).toBe('2026-10-21');
    expect(computeEnd('2026-10-01', 1, 'month')).toBe('2026-10-31');
    expect(computeEnd('2026-10-25', 1, 'month')).toBe('2026-11-24');
    expect(computeEnd('2026-10-25', 2, 'month')).toBe('2026-12-24');
    expect(computeEnd('2026-10-01', 0, 'day')).toBeNull();
  });

  it('mengenali panjang periode', () => {
    expect(describeLength('2026-10-25', '2026-11-24')).toMatchObject({ count: 1, unit: 'month', days: 31 });
    expect(describeLength('2026-10-01', '2026-10-14')).toMatchObject({ count: 2, unit: 'week' });
    expect(lengthLabel('2026-10-01', '2026-10-10')).toBe('10 hari');
  });

  it('label rentang ringkas', () => {
    expect(rangeLabel('2026-10-01', '2026-10-31')).toBe('1–31 Okt 2026');
    expect(rangeLabel('2026-10-25', '2026-11-24')).toBe('25 Okt – 24 Nov 2026');
    expect(rangeLabel('2026-12-20', '2027-01-05')).toBe('20 Des 2026 – 5 Jan 2027');
  });

  it('validasi ramah dalam Bahasa Indonesia', () => {
    expect(validatePeriodInput({ start: '', mode: 'length', count: '1', unit: 'month' }).start).toMatch(/tanggal mulai/i);
    expect(validatePeriodInput({ start: '2026-10-01', mode: 'length', count: '0', unit: 'day' }).count).toMatch(/lebih dari 0/);
    expect(validatePeriodInput({ start: '2026-10-01', mode: 'length', count: '', unit: 'day' }).count).toBeTruthy();
    expect(validatePeriodInput({ start: '2026-10-10', mode: 'end', end: '2026-10-01' }).end).toMatch(/tidak boleh sebelum/);
    expect(validatePeriodInput({ start: '2026-10-01', mode: 'end', end: '2026-10-01' })).toEqual({});
    expect(resolveEnd({ start: '2026-10-01', mode: 'length', count: '2', unit: 'week' })).toBe('2026-10-14');
  });

  it('mendeteksi periode yang bertumpuk', () => {
    const ps = [{ id: 'a', start: '2026-10-01', end: '2026-10-31' }];
    expect(overlapping(ps, '2026-10-25', '2026-11-24')).toHaveLength(1);
    expect(overlapping(ps, '2026-11-01', '2026-11-30')).toHaveLength(0);
    expect(overlapping(ps, '2026-10-25', '2026-11-24', 'a')).toHaveLength(0);
  });
});

describe('migrasi data lama', () => {
  it('data versi 1 (tanpa periode) tetap terbaca dan dinaikkan ke versi terbaru', () => {
    const v1 = {
      version: 1,
      settings: { theme: 'dark', onboarded: true },
      categories: [{ id: 'jajan', name: 'Jajan', emoji: '🧋', type: 'expense', budget: 100000 }],
      transactions: [tx({ categoryId: 'jajan' })],
      recurring: [],
      goals: [],
      deposits: [],
      checkins: ['2026-10-01'],
    };
    const out = normalizeData(v1);
    expect(out.version).toBe(SCHEMA_VERSION);
    expect(out.periods).toEqual([]);
    expect(out.transactions).toHaveLength(1);
    expect(out.limits[0]).toMatchObject({ target: 'jajan', amount: 100000 });
    expect(out.settings.theme).toBe('dark');
  });

  it('periode yang rusak dibuang, yang valid dipertahankan', () => {
    const out = normalizeData({
      periods: [
        { id: 'ok', name: 'Kiriman', start: '2026-10-01', end: '2026-10-31' },
        { id: 'terbalik', start: '2026-10-31', end: '2026-10-01' },
        { start: '2026-10-01' },
      ],
    });
    expect(out.periods.map((p) => p.id)).toEqual(['ok']);
  });
});

describe('scope & jatah harian', () => {
  const base = () => {
    const d = emptyData();
    d.periods = [
      { id: 'sep', name: 'Kiriman September', start: '2026-09-25', end: '2026-10-24', createdAt: 1 },
      { id: 'okt', name: 'Kiriman Oktober', start: '2026-10-25', end: '2026-11-24', createdAt: 2 },
    ];
    return d;
  };

  it('memilih periode yang sedang berjalan', () => {
    const d = base();
    expect(periodForDate(d, '2026-10-09').id).toBe('sep');
    expect(defaultScope(d, '2026-10-30')).toEqual({ kind: 'period', id: 'okt' });
    expect(defaultScope(emptyData(), '2026-10-09')).toEqual({ kind: 'month', month: '2026-10' });
    const r = resolveRange(d, { kind: 'period', id: 'sep' }, '2026-10-09');
    expect(r).toMatchObject({ start: '2026-09-25', end: '2026-10-24', days: 30, status: 'active' });
    expect(adjacentScope(d, r, 1)).toEqual({ kind: 'period', id: 'okt' });
    expect(adjacentScope(d, r, -1)).toBeNull();
    expect(rangeForDate(d, '2026-11-01').id).toBe('okt');
  });

  it('periode yang dihapus kembali ke bulan kalender, transaksi tetap ada', () => {
    let d = base();
    d.transactions = [tx({ date: '2026-10-01' })];
    d = reducer(d, { type: 'DELETE_PERIOD', id: 'sep' });
    expect(d.transactions).toHaveLength(1);
    expect(resolveRange(d, { kind: 'period', id: 'sep' }, '2026-10-09').kind).toBe('month');
  });

  it('jatah harian = sisa uang ÷ sisa hari, dengan status aman/hampir/lewat', () => {
    const d = base();
    const r = resolveRange(d, { kind: 'period', id: 'sep' }, '2026-10-15');
    d.transactions = [tx({ type: 'income', amount: 1000000, date: '2026-09-25', categoryId: 'lainnya-in' }), tx({ amount: 400000, date: '2026-10-01' })];
    // sisa 600.000, sisa hari 15–24 Okt = 10 hari -> 60.000/hari
    let p = pace(d, r, '2026-10-15');
    expect(p).toMatchObject({ remaining: 600000, daysLeft: 10, allowance: 60000, level: 'ok' });

    d.transactions.push(tx({ amount: 50000, date: '2026-10-15' }));
    p = pace(d, r, '2026-10-15');
    expect(p.allowance).toBe(60000); // jatah hari ini tidak ikut turun
    expect(p.level).toBe('warn');

    d.transactions.push(tx({ amount: 20000, date: '2026-10-15' }));
    expect(pace(d, r, '2026-10-15').level).toBe('over');
    expect(pace(d, r, '2026-11-01')).toBeNull(); // di luar rentang
  });

  it('tanpa pemasukan statusnya "none"', () => {
    const d = base();
    const r = resolveRange(d, { kind: 'period', id: 'sep' }, '2026-10-15');
    expect(pace(d, r, '2026-10-15').level).toBe('none');
  });

  it('total dan tren mingguan mengikuti rentang', () => {
    const d = base();
    d.transactions = [tx({ date: '2026-09-25', amount: 5000 }), tx({ date: '2026-10-24', amount: 7000 }), tx({ date: '2026-10-25', amount: 9999 })];
    const r = { start: '2026-09-25', end: '2026-10-24' };
    expect(totalsIn(d, r).expense).toBe(12000);
    const w = weeklyTrend(d, r);
    expect(w).toHaveLength(5);
    expect(w[0].amount).toBe(5000);
    expect(w[4].amount).toBe(7000);
  });
});
