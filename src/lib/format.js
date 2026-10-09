// Semua urusan format angka & tanggal dalam gaya Indonesia.

const numberFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** 1250000 -> "Rp 1.250.000". Opsi `sign` menambahkan "+" untuk angka positif. */
export function formatRupiah(value, { sign = false } = {}) {
  const n = Math.round(Number(value) || 0);
  const abs = numberFmt.format(Math.abs(n));
  let prefix = '';
  if (n < 0) prefix = '−';
  else if (sign && n > 0) prefix = '+';
  return `${prefix}Rp ${abs}`;
}

/** 1250000 -> "1.250.000" (tanpa "Rp"), dipakai di kolom input. */
export function formatNumber(value) {
  if (value === '' || value === null || value === undefined) return '';
  return numberFmt.format(Math.round(Number(value) || 0));
}

/** Versi ringkas untuk sumbu grafik: 25000 -> "25rb", 1200000 -> "1,2jt". */
export function formatShort(value) {
  const n = Math.round(Number(value) || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}${v.toLocaleString('id-ID', { maximumFractionDigits: v < 10 ? 1 : 0 })}jt`;
  }
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}rb`;
  return `${sign}${abs}`;
}

/**
 * Mengubah teks bebas menjadi angka bulat rupiah.
 * "Rp 25.000" -> 25000, "25000" -> 25000, "" -> 0.
 */
export function parseNominal(text) {
  if (typeof text === 'number') return Math.max(0, Math.round(text));
  const digits = String(text ?? '').replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Number(digits.slice(0, 13));
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export { MONTHS, MONTHS_SHORT, DAYS };

/** "2026-10" -> "Oktober 2026" */
export function formatMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "2026-10-09" -> "Jumat, 9 Oktober 2026" */
export function formatDateLong(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return `${DAYS[day]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-10-09" -> "9 Okt 2026" */
export function formatDateShort(iso, { withYear = true } = {}) {
  const [y, m, d] = iso.split('-').map(Number);
  return withYear ? `${d} ${MONTHS_SHORT[m - 1]} ${y}` : `${d} ${MONTHS_SHORT[m - 1]}`;
}
