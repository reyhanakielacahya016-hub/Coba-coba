import { addMonths, dateInMonth, monthOf } from '../lib/dates.js';
import { uid } from '../lib/id.js';

/**
 * Buat transaksi dari setiap jadwal rutin yang sudah jatuh tempo.
 * Contoh: bayar kos tiap tanggal 1. Kalau aplikasi baru dibuka tanggal 5,
 * transaksi tanggal 1 otomatis dibuat. Kalau sebulan tidak dibuka, bulan
 * yang terlewat ikut diisi. Tidak pernah membuat transaksi ganda.
 *
 * Fungsi ini murni: mengembalikan data baru (atau data yang sama kalau tidak ada perubahan).
 */
export function applyRecurring(data, today) {
  const thisMonth = monthOf(today);
  const newTx = [];
  let changed = false;

  const recurring = data.recurring.map((r) => {
    if (!r.active) return r;
    let month = r.lastGenerated ? addMonths(r.lastGenerated, 1) : r.startMonth;
    let lastGenerated = r.lastGenerated;

    while (month <= thisMonth) {
      const date = dateInMonth(month, r.dayOfMonth);
      if (date > today) break;
      const exists = data.transactions.some(
        (t) => t.recurringId === r.id && monthOf(t.date) === month,
      );
      if (!exists) {
        newTx.push({
          id: uid(),
          type: r.type,
          amount: r.amount,
          categoryId: r.categoryId,
          date,
          note: r.note,
          recurringId: r.id,
          auto: true,
          createdAt: Date.now(),
        });
      }
      lastGenerated = month;
      month = addMonths(month, 1);
    }

    if (lastGenerated !== r.lastGenerated) {
      changed = true;
      return { ...r, lastGenerated };
    }
    return r;
  });

  if (!changed) return data;
  return { ...data, recurring, transactions: [...data.transactions, ...newTx] };
}
