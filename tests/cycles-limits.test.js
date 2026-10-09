import { describe, expect, it } from 'vitest';
import { everyWindow, monthWindow, nextWindow, weekWindow, windowAt } from '../src/lib/windows.js';
import { applyCycles, cycleRangeFrom, defaultAnchor, previewCycle, validateCycleInput } from '../src/state/cycles.js';
import { periodLedger } from '../src/state/ledger.js';
import {
  baseAmount,
  categoryLimitsVsIncome,
  effectiveAmount,
  limitStatus,
  limitWindow,
  validateLimitInput,
  windowLabel,
} from '../src/state/limits.js';
import { reducer } from '../src/state/reducer.js';
import { emptyData, normalizeData, SCHEMA_VERSION } from '../src/state/storage.js';
import { totalsIn } from '../src/state/selectors.js';

const tx = (over) => ({
  id: Math.random().toString(36).slice(2), type: 'expense', amount: 10000, categoryId: 'lainnya-out',
  date: '2026-10-05', note: '', recurringId: null, periodId: null, auto: false, createdAt: 1, ...over,
});

const cycle = (over) => ({
  id: 'c1', name: 'Uang bulanan', kind: 'monthly', weekStart: 0, monthDay: 25, count: 1, unit: 'month',
  anchor: '2026-09-25', repeat: true, income: null, carry: 'ignore', goalId: null, active: true, until: null, createdAt: 1, ...over,
});

const limit = (over) => ({
  id: 'l1', name: '', target: 'total', window: { kind: 'day' }, mode: 'fixed', amount: 30000, percent: null,
  rollover: 'reset', warnAt: 0.8, active: true, since: '2026-10-01', createdAt: 1, ...over,
});

describe('jendela bulanan', () => {
  it('mulai tanggal 25: 25 Okt – 24 Nov', () => {
    expect(monthWindow('2026-10-30', 25)).toEqual({ start: '2026-10-25', end: '2026-11-24' });
    expect(monthWindow('2026-10-09', 25)).toEqual({ start: '2026-09-25', end: '2026-10-24' });
  });

  it('bulan 28/30/31 hari dengan tanggal mulai 31', () => {
    // Januari 31 hari → Februari 28 hari (2026 bukan kabisat)
    expect(monthWindow('2026-02-10', 31)).toEqual({ start: '2026-01-31', end: '2026-02-27' });
    expect(monthWindow('2026-02-28', 31)).toEqual({ start: '2026-02-28', end: '2026-03-30' });
    expect(monthWindow('2026-03-31', 31)).toEqual({ start: '2026-03-31', end: '2026-04-29' });
    // April 30 hari → mulai 30 Apr
    expect(monthWindow('2026-04-30', 31)).toEqual({ start: '2026-04-30', end: '2026-05-30' });
    expect(monthWindow('2026-09-15', 30)).toEqual({ start: '2026-08-30', end: '2026-09-29' });
  });

  it('tahun kabisat (Februari 2028 punya 29 hari)', () => {
    expect(monthWindow('2028-02-29', 31)).toEqual({ start: '2028-02-29', end: '2028-03-30' });
    expect(monthWindow('2028-02-15', 29)).toEqual({ start: '2028-01-29', end: '2028-02-28' });
    expect(monthWindow('2028-02-29', 29)).toEqual({ start: '2028-02-29', end: '2028-03-28' });
    expect(monthWindow('2027-02-28', 29)).toEqual({ start: '2027-02-28', end: '2027-03-28' });
  });

  it('melewati pergantian tahun', () => {
    expect(monthWindow('2027-01-05', 25)).toEqual({ start: '2026-12-25', end: '2027-01-24' });
    expect(monthWindow('2026-12-31', 1)).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });
});

describe('jendela mingguan & per-N', () => {
  it('minggu mulai Senin dan Sabtu', () => {
    // 9 Okt 2026 = Jumat
    expect(weekWindow('2026-10-09', 0)).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(weekWindow('2026-10-09', 5)).toEqual({ start: '2026-10-03', end: '2026-10-09' });
    expect(weekWindow('2026-10-10', 5)).toEqual({ start: '2026-10-10', end: '2026-10-16' });
    // lintas tahun
    expect(weekWindow('2027-01-01', 0)).toEqual({ start: '2026-12-28', end: '2027-01-03' });
  });

  it('per 3 hari dari tanggal acuan, termasuk sebelum acuan', () => {
    const spec = { anchor: '2026-10-01', count: 3, unit: 'day' };
    expect(everyWindow('2026-10-01', spec)).toEqual({ start: '2026-10-01', end: '2026-10-03' });
    expect(everyWindow('2026-10-05', spec)).toEqual({ start: '2026-10-04', end: '2026-10-06' });
    expect(everyWindow('2026-09-30', spec)).toEqual({ start: '2026-09-28', end: '2026-09-30' });
    expect(everyWindow('2026-12-31', { anchor: '2026-12-30', count: 3, unit: 'day' })).toEqual({ start: '2026-12-30', end: '2027-01-01' });
  });

  it('per N bulan dari tanggal 31 tidak bergeser', () => {
    const spec = { kind: 'every', anchor: '2026-01-31', count: 1, unit: 'month' };
    let w = windowAt(spec, '2026-01-31');
    const starts = [];
    for (let i = 0; i < 5; i++) {
      starts.push(w.start);
      w = nextWindow(spec, w);
    }
    expect(starts).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
    expect(everyWindow('2026-11-10', { anchor: '2026-10-25', count: 3, unit: 'month' })).toEqual({ start: '2026-10-25', end: '2027-01-24' });
  });
});

describe('periode berulang (siklus)', () => {
  it('periode pertama boleh terpotong, berikutnya rapi', () => {
    const c = cycle({ anchor: '2026-10-10' });
    expect(previewCycle(c, 3)).toEqual([
      { start: '2026-10-10', end: '2026-10-24' },
      { start: '2026-10-25', end: '2026-11-24' },
      { start: '2026-11-25', end: '2026-12-24' },
    ]);
  });

  it('tanggal mulai bawaan mengikuti jenis periode', () => {
    expect(defaultAnchor(cycle(), '2026-10-09')).toBe('2026-09-25');
    expect(defaultAnchor(cycle({ kind: 'weekly', weekStart: 5 }), '2026-10-09')).toBe('2026-10-03');
    expect(defaultAnchor(cycle({ kind: 'daily' }), '2026-10-09')).toBe('2026-10-09');
    expect(cycleRangeFrom(cycle({ kind: 'custom', anchor: '2026-10-01', count: 10, unit: 'day' }), '2026-10-01')).toEqual({ start: '2026-10-01', end: '2026-10-10' });
  });

  it('membuat periode yang terlewat + pemasukan otomatis, tanpa dobel', () => {
    const d = { ...emptyData(), cycles: [cycle({ income: { amount: 1500000, categoryId: 'lainnya-in', auto: true, note: '' } })] };
    const once = applyCycles(d, '2026-12-01');
    expect(once.periods.map((p) => p.start)).toEqual(['2026-09-25', '2026-10-25', '2026-11-25']);
    expect(once.periods[2].name).toBe('Uang bulanan November');
    expect(once.transactions.filter((t) => t.type === 'income')).toHaveLength(3);
    expect(once.cycles[0].until).toBe('2026-12-24');
    const twice = applyCycles(once, '2026-12-01');
    expect(twice).toBe(once);
  });

  it('sekali saja: hanya satu periode', () => {
    const d = { ...emptyData(), cycles: [cycle({ repeat: false })] };
    expect(applyCycles(d, '2027-03-01').periods).toHaveLength(1);
  });

  it('periode pertama di masa depan tetap dibuat sebagai "akan datang"', () => {
    const d = { ...emptyData(), cycles: [cycle({ anchor: '2026-10-25' })] };
    const out = applyCycles(d, '2026-10-09');
    expect(out.periods).toHaveLength(1);
    expect(out.periods[0].start).toBe('2026-10-25');
  });

  it('siklus yang dihentikan tidak membuat periode baru', () => {
    const d = { ...emptyData(), cycles: [cycle({ active: false })] };
    expect(applyCycles(d, '2026-12-01').periods).toHaveLength(0);
  });

  it('mingguan mulai Sabtu melewati pergantian tahun', () => {
    const d = { ...emptyData(), cycles: [cycle({ kind: 'weekly', weekStart: 5, anchor: '2026-12-26' })] };
    const out = applyCycles(d, '2027-01-03');
    expect(out.periods.map((p) => [p.start, p.end])).toEqual([
      ['2026-12-26', '2027-01-01'],
      ['2027-01-02', '2027-01-08'],
    ]);
  });

  it('sisa dibawa ke periode berikutnya (hanya yang positif)', () => {
    let d = { ...emptyData(), cycles: [cycle({ carry: 'carry', income: { amount: 1000000, categoryId: 'lainnya-in', auto: true, note: '' } })] };
    d = applyCycles(d, '2026-10-30');
    d.transactions.push(tx({ amount: 800000, date: '2026-10-01' }));
    const [sep, okt] = [...d.periods].sort((a, b) => a.start.localeCompare(b.start));
    const ledger = periodLedger(d);
    expect(ledger.get(sep.id)).toMatchObject({ remaining: 200000, carryOut: 200000 });
    expect(ledger.get(okt.id)).toMatchObject({ carryIn: 200000, income: 1000000, remaining: 1200000 });
    expect(totalsIn(d, okt).remaining).toBe(1200000);

    // periode lalu minus → tidak ada yang dibawa
    const minus = { ...d, transactions: [...d.transactions, tx({ amount: 500000, date: '2026-10-02' })] };
    expect(periodLedger(minus).get(okt.id).carryIn).toBe(0);
  });

  it('sisa dipindah ke tabungan saat periode selesai, satu kali', () => {
    let d = { ...emptyData(), goals: [{ id: 'g', name: 'Laptop', emoji: '💻', target: 5000000, deadline: null, createdAt: 1, achievedAt: null }] };
    d.cycles = [cycle({ carry: 'save', goalId: 'g', income: { amount: 1000000, categoryId: 'lainnya-in', auto: true, note: '' } })];
    d = applyCycles(d, '2026-10-10');
    d.transactions.push(tx({ amount: 700000, date: '2026-10-01' }));
    d = applyCycles(d, '2026-10-26');
    expect(d.deposits).toHaveLength(1);
    expect(d.deposits[0]).toMatchObject({ goalId: 'g', amount: 300000, date: '2026-10-24', auto: true });
    const sep = d.periods.find((p) => p.start === '2026-09-25');
    expect(sep.settled.amount).toBe(300000);
    expect(periodLedger(d).get(sep.id).remaining).toBe(0);
    expect(applyCycles(d, '2026-10-27').deposits).toHaveLength(1);
  });

  it('validasi ramah', () => {
    expect(validateCycleInput({ kind: 'custom', anchor: '2026-10-10', mode: 'end', end: '2026-10-01' }).errors.end).toMatch(/tidak boleh sebelum/);
    expect(validateCycleInput({ kind: 'custom', anchor: '2026-10-10', mode: 'length', count: '0', unit: 'day' }).errors.count).toBeTruthy();
    expect(validateCycleInput({ kind: 'monthly', anchor: '2026-10-10', monthDay: 31 }).warnings.monthDay).toMatch(/hari terakhir/);
    expect(validateCycleInput({ kind: 'monthly', anchor: '2026-10-10', monthDay: 25, incomeOn: true, incomeAmount: 0 }).errors.incomeAmount).toMatch(/tidak boleh nol/);
    expect(validateCycleInput({ kind: 'daily', anchor: '2026-10-10', carry: 'save' }).errors.goalId).toBeTruthy();
  });

  it('reducer: tambah siklus langsung membuat periode, hapus dengan purge membersihkan', () => {
    const c = cycle({ income: { amount: 1500000, categoryId: 'lainnya-in', auto: true, note: '' } });
    let d = reducer(emptyData(), { type: 'ADD_CYCLE', cycle: c, today: '2026-10-09' });
    expect(d.periods).toHaveLength(1);
    expect(d.transactions).toHaveLength(1);
    d = reducer(d, { type: 'DELETE_CYCLE', id: 'c1', purge: true });
    expect(d.periods).toHaveLength(0);
    expect(d.transactions).toHaveLength(0);
  });
});

describe('batasan', () => {
  const base = () => {
    const d = emptyData();
    d.categories.push({ id: 'makan', name: 'Makan', emoji: '🍚', type: 'expense', locked: false });
    d.categories.push({ id: 'jajan', name: 'Jajan', emoji: '🧋', type: 'expense', locked: false });
    d.periods = [{ id: 'p', name: 'Kiriman', start: '2026-09-25', end: '2026-10-24', cycleId: null, carry: 'ignore', goalId: null, settled: null, createdAt: 1 }];
    d.transactions = [tx({ type: 'income', amount: 1500000, categoryId: 'lainnya-in', date: '2026-09-25' })];
    return d;
  };

  it('nominal tetap per hari: sisa hari ini & aman dipakai', () => {
    const d = base();
    d.transactions.push(tx({ categoryId: 'makan', amount: 25000, date: '2026-10-09' }));
    const st = limitStatus(d, limit({ target: 'makan' }), '2026-10-09');
    expect(st).toMatchObject({ amount: 30000, spent: 25000, left: 5000, level: 'warn', todayLeft: 5000, safeToday: 5000 });
    expect(limitStatus(d, limit({ target: 'makan', warnAt: 0.9 }), '2026-10-09').level).toBe('ok');
  });

  it('per 3 hari: jatah hari ini = sisa ÷ sisa hari', () => {
    const d = base();
    const l = limit({ target: 'makan', window: { kind: 'ndays', count: 3, anchor: '2026-10-01' }, amount: 90000 });
    d.transactions.push(tx({ categoryId: 'makan', amount: 20000, date: '2026-10-07' }));
    // jendela 7–9 Okt; hari ini 8 Okt, sisa 70.000 untuk 2 hari → 35.000
    const st = limitStatus(d, l, '2026-10-08');
    expect(st.window).toEqual({ start: '2026-10-07', end: '2026-10-09' });
    expect(st).toMatchObject({ left: 70000, daysLeft: 2, todayCap: 35000, safeToday: 35000 });
  });

  it('persen dari pemasukan periode, disesuaikan untuk jendela lebih pendek', () => {
    const d = base();
    expect(baseAmount(d, limit({ mode: 'percent', percent: 10, target: 'jajan', window: { kind: 'period' } }), { start: '2026-09-25', end: '2026-10-24' })).toBe(150000);
    // per minggu = 10% × 1.500.000 × 7/30 = 35.000
    expect(baseAmount(d, limit({ mode: 'percent', percent: 10, target: 'jajan', window: { kind: 'week' } }), { start: '2026-10-05', end: '2026-10-11' })).toBe(35000);
  });

  it('hitung otomatis = sisa uang ÷ sisa hari', () => {
    const d = base();
    d.transactions.push(tx({ amount: 900000, date: '2026-10-01' }));
    // 9–24 Okt = 16 hari, sisa 600.000 → 37.500/hari
    const st = limitStatus(d, limit({ mode: 'auto' }), '2026-10-09');
    expect(st.amount).toBe(37500);
  });

  it('sisa batas dibawa ke rentang berikutnya', () => {
    const d = base();
    const l = limit({ target: 'makan', rollover: 'carry', since: '2026-10-07' });
    d.transactions.push(tx({ categoryId: 'makan', amount: 10000, date: '2026-10-07' })); // sisa 20.000
    d.transactions.push(tx({ categoryId: 'makan', amount: 40000, date: '2026-10-08' })); // 50.000 - 40.000 = 10.000
    const r = effectiveAmount(d, l, { start: '2026-10-09', end: '2026-10-09' }, '2026-10-09');
    expect(r).toEqual({ amount: 40000, base: 30000, carriedIn: 10000 });
    // tanpa carry: tetap 30.000
    expect(effectiveAmount(d, { ...l, rollover: 'reset' }, { start: '2026-10-09', end: '2026-10-09' }, '2026-10-09').amount).toBe(30000);
  });

  it('ikut periode, rentang tanggal tetap, dan label', () => {
    const d = base();
    expect(limitWindow(d, limit({ window: { kind: 'period' } }), '2026-10-09')).toMatchObject({ start: '2026-09-25', end: '2026-10-24' });
    expect(limitWindow(d, limit({ window: { kind: 'period' } }), '2026-11-09')).toBeNull();
    const r = limit({ window: { kind: 'range', start: '2026-10-20', end: '2026-10-31' } });
    expect(limitStatus(d, r, '2026-10-09').state).toBe('upcoming');
    expect(windowLabel(limit({ window: { kind: 'ndays', count: 3 } }))).toBe('per 3 hari');
    expect(windowLabel(limit({ window: { kind: 'week', weekStart: 5 } }))).toBe('per minggu (mulai Sabtu)');
    expect(windowLabel(limit({ window: { kind: 'month', monthDay: 25 } }))).toBe('per bulan (mulai tgl 25)');
  });

  it('validasi & peringatan', () => {
    const d = base();
    const v = (over) => validateLimitInput(d, limit(over), '2026-10-09');
    expect(v({ amount: 0 }).errors.amount).toMatch(/tidak boleh nol/);
    expect(v({ mode: 'percent', percent: 120 }).errors.percent).toMatch(/maksimal/i);
    expect(v({ mode: 'auto', target: 'makan' }).errors.mode).toBeTruthy();
    expect(v({ window: { kind: 'range', start: '2026-10-10', end: '2026-10-01' } }).errors.end).toMatch(/tidak boleh sebelum/);
    expect(v({ window: { kind: 'ndays', count: 0 } }).errors.count).toBeTruthy();
    // 60.000/hari × 30 hari = 1.800.000 > pemasukan 1.500.000
    expect(v({ target: 'makan', amount: 60000 }).warnings.amount).toMatch(/lebih besar dari pemasukan/);
    expect(v({ target: 'makan', amount: 30000 }).warnings.amount).toBeUndefined();

    d.limits = [limit({ id: 'a', target: 'makan', amount: 40000 }), limit({ id: 'b', target: 'jajan', amount: 15000 })];
    expect(categoryLimitsVsIncome(d, '2026-10-09')).toMatchObject({ sum: 1650000, over: true });
  });

  it('nonaktif tetap terhitung tapi levelnya "off"', () => {
    expect(limitStatus(base(), limit({ active: false }), '2026-10-09').level).toBe('off');
  });
});

describe('migrasi ke versi 3', () => {
  it('anggaran kategori lama menjadi batasan bulanan', () => {
    const v2 = {
      version: 2,
      categories: [{ id: 'jajan', name: 'Jajan', emoji: '🧋', type: 'expense', budget: 300000 }],
      transactions: [tx({ categoryId: 'jajan' })],
      periods: [{ id: 'p', name: 'Kiriman', start: '2026-09-25', end: '2026-10-24', createdAt: 1 }],
    };
    const out = normalizeData(v2);
    expect(out.version).toBe(SCHEMA_VERSION);
    expect(out.limits).toHaveLength(1);
    expect(out.limits[0]).toMatchObject({ target: 'jajan', mode: 'fixed', amount: 300000, window: { kind: 'month', monthDay: 25 }, active: true });
    expect(out.periods[0]).toMatchObject({ carry: 'ignore', cycleId: null });
    expect(out.cycles).toEqual([]);
    expect('budget' in out.categories.find((c) => c.id === 'jajan')).toBe(false);
  });

  it('data versi 1 tanpa periode: batas mulai tanggal 1', () => {
    const out = normalizeData({ version: 1, categories: [{ id: 'jajan', name: 'Jajan', type: 'expense', budget: 100000 }] });
    expect(out.limits[0].window).toEqual({ kind: 'month', monthDay: 1 });
    expect(out.periods).toEqual([]);
  });

  it('data v3 tidak dimigrasi ulang dan batas yang rusak dibuang', () => {
    const out = normalizeData({
      version: 3,
      categories: [{ id: 'jajan', name: 'Jajan', type: 'expense', budget: 100000 }],
      limits: [
        limit({ id: 'ok', target: 'jajan', window: { kind: 'ndays', count: 3 } }),
        limit({ id: 'hilang', target: 'tidak-ada' }),
        limit({ id: 'auto-kat', target: 'jajan', mode: 'auto' }),
      ],
    });
    expect(out.limits.map((l) => l.id)).toEqual(['ok', 'auto-kat']);
    expect(out.limits[0].window.anchor).toBe('2026-10-01');
    expect(out.limits[1].mode).toBe('fixed');
  });
});
