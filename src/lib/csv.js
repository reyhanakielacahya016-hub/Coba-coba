// Ekspor & impor transaksi dalam format CSV (bisa dibuka di Excel / Google Sheets).

import { parseNominal } from './format.js';
import { uid } from './id.js';

export const CSV_HEADER = ['tanggal', 'jenis', 'kategori', 'nominal', 'catatan'];

const escape = (v) => {
  const s = String(v ?? '');
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Ubah transaksi menjadi teks CSV, urut dari yang terbaru. */
export function transactionsToCSV(data) {
  const cats = new Map(data.categories.map((c) => [c.id, c]));
  const rows = [...data.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => [t.date, t.type === 'income' ? 'pemasukan' : 'pengeluaran', cats.get(t.categoryId)?.name ?? 'Lainnya', t.amount, t.note]);
  return [CSV_HEADER, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
}

/** Parser CSV sederhana yang paham tanda kutip. Pemisah koma atau titik koma dideteksi otomatis. */
export function parseCSV(text) {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** "2026-10-09" atau "09/10/2026" -> "2026-10-09" */
function normalizeDate(v) {
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

/**
 * Ubah baris CSV menjadi transaksi. Kategori yang belum ada dibuat otomatis.
 * @returns {{ transactions, categories, skipped }}
 */
export function csvToTransactions(text, existingCategories) {
  const rows = parseCSV(text);
  if (!rows.length) throw new Error('File CSV kosong.');
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name) => header.indexOf(name);
  const idx = { date: col('tanggal'), type: col('jenis'), cat: col('kategori'), amount: col('nominal'), note: col('catatan') };
  if (idx.date < 0 || idx.amount < 0) throw new Error('Kolom "tanggal" dan "nominal" wajib ada.');

  const byName = new Map(existingCategories.map((c) => [`${c.type}:${c.name.toLowerCase()}`, c]));
  const categories = [];
  const transactions = [];
  let skipped = 0;

  for (const r of rows.slice(1)) {
    const date = normalizeDate(r[idx.date] ?? '');
    const amount = parseNominal(r[idx.amount] ?? '');
    if (!date || !amount) {
      skipped++;
      continue;
    }
    const rawType = (r[idx.type] ?? '').trim().toLowerCase();
    const type = ['pemasukan', 'masuk', 'income'].includes(rawType) ? 'income' : 'expense';
    const catName = (r[idx.cat] ?? '').trim() || 'Lainnya';
    const key = `${type}:${catName.toLowerCase()}`;
    let cat = byName.get(key);
    if (!cat) {
      cat = { id: uid(), name: catName.slice(0, 40), emoji: type === 'income' ? '💰' : '🏷️', type, budget: null, locked: false };
      byName.set(key, cat);
      categories.push(cat);
    }
    transactions.push({
      id: uid(),
      type,
      amount,
      categoryId: cat.id,
      date,
      note: idx.note >= 0 ? (r[idx.note] ?? '').trim().slice(0, 120) : '',
      recurringId: null,
      auto: false,
      createdAt: Date.now(),
    });
  }
  return { transactions, categories, skipped };
}
