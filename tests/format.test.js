import { describe, expect, it } from 'vitest';
import { formatRupiah, formatShort, parseNominal, formatMonth, formatDateLong } from '../src/lib/format.js';
import { addMonths, dateInMonth, daysInMonth, relativeDayLabel } from '../src/lib/dates.js';
import { computeStreak } from '../src/lib/streak.js';

describe('format', () => {
  it('memformat rupiah dengan titik ribuan', () => {
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000');
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatRupiah(-50000)).toBe('−Rp 50.000');
    expect(formatRupiah(25000, { sign: true })).toBe('+Rp 25.000');
  });
  it('mem-parse teks nominal', () => {
    expect(parseNominal('Rp 25.000')).toBe(25000);
    expect(parseNominal('')).toBe(0);
    expect(parseNominal('abc')).toBe(0);
  });
  it('format ringkas', () => {
    expect(formatShort(25000)).toBe('25rb');
    expect(formatShort(1200000)).toBe('1,2jt');
  });
  it('format bulan & tanggal', () => {
    expect(formatMonth('2026-10')).toBe('Oktober 2026');
    expect(formatDateLong('2026-10-09')).toBe('Jumat, 9 Oktober 2026');
  });
});

describe('dates', () => {
  it('geser bulan melewati tahun', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
  });
  it('tanggal 31 dipotong ke akhir bulan', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28');
    expect(dateInMonth('2028-02', 31)).toBe('2028-02-29');
  });
  it('label hari relatif', () => {
    expect(relativeDayLabel('2026-10-09', '2026-10-09')).toBe('Hari ini');
    expect(relativeDayLabel('2026-10-08', '2026-10-09')).toBe('Kemarin');
    expect(relativeDayLabel('2026-10-05', '2026-10-09')).toBe('Senin, 5 Okt');
  });
});

describe('streak', () => {
  it('menghitung hari berturut-turut', () => {
    expect(computeStreak(['2026-10-07', '2026-10-08', '2026-10-09'], '2026-10-09')).toEqual({ count: 3, todayDone: true });
  });
  it('tetap hidup bila hari ini belum mencatat', () => {
    expect(computeStreak(['2026-10-07', '2026-10-08'], '2026-10-09')).toEqual({ count: 2, todayDone: false });
  });
  it('putus bila ada hari bolong', () => {
    expect(computeStreak(['2026-10-06', '2026-10-09'], '2026-10-09').count).toBe(1);
    expect(computeStreak([], '2026-10-09').count).toBe(0);
  });
});
