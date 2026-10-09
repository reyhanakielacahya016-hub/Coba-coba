// Buku besar per periode: pemasukan, pengeluaran, ditabung, sisa yang dibawa
// dari periode sebelumnya, dan sisa akhirnya. Dihitung ulang dari transaksi
// setiap kali data berubah, jadi tetap benar walaupun transaksi lama diedit.

import { sortedPeriods } from './scope.js';

const cache = new WeakMap();

/** Pemasukan, pengeluaran, dan setoran tabungan dalam satu rentang (tanpa sisa bawaan). */
export function rawTotals(data, r) {
  let income = 0;
  let expense = 0;
  for (const t of data.transactions) {
    if (t.date < r.start || t.date > r.end) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  let saved = 0;
  for (const d of data.deposits) if (d.date >= r.start && d.date <= r.end) saved += d.amount;
  return { income, expense, saved };
}

/** Periode yang tepat sebelum `p`: yang berakhir paling akhir sebelum `p` dimulai. */
export function previousPeriod(data, p) {
  let best = null;
  for (const q of data.periods) {
    if (q.id === p.id || q.end >= p.start) continue;
    if (!best || q.end > best.end || (q.end === best.end && q.start > best.start)) best = q;
  }
  return best;
}

/**
 * Map id periode → { carryIn, income, expense, saved, remaining, carryOut }.
 * Sisa positif dari periode ber-aturan "dibawa" masuk sebagai `carryIn` periode berikutnya.
 * Sisa minus tidak ikut dibawa.
 */
export function periodLedger(data) {
  const hit = cache.get(data);
  if (hit) return hit;
  const out = new Map();
  for (const p of sortedPeriods(data)) {
    const prev = previousPeriod(data, p);
    const prevRow = prev ? out.get(prev.id) : null;
    const carryIn = prevRow ? prevRow.carryOut : 0;
    const { income, expense, saved } = rawTotals(data, p);
    const remaining = carryIn + income - expense - saved;
    out.set(p.id, {
      carryIn,
      carryFrom: carryIn > 0 ? prev.id : null,
      income,
      expense,
      saved,
      remaining,
      carryOut: p.carry === 'carry' ? Math.max(0, remaining) : 0,
    });
  }
  cache.set(data, out);
  return out;
}

export function periodRow(data, id) {
  return periodLedger(data).get(id) ?? null;
}
