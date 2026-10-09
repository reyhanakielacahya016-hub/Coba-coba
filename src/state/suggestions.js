import { uid } from '../lib/id.js';

// Kategori di sini hanya REKOMENDASI. Pengguna bebas memilih, mengubah,
// atau membuat kategori sendiri. Yang selalu ada hanya "Lainnya".

export const EXPENSE_SUGGESTIONS = [
  { key: 'makan', name: 'Makan', emoji: '🍚', preselect: true },
  { key: 'kos', name: 'Kos', emoji: '🏠', preselect: true },
  { key: 'transport', name: 'Transportasi', emoji: '🛵', preselect: true },
  { key: 'pulsa', name: 'Pulsa/Internet', emoji: '📶', preselect: true },
  { key: 'jajan', name: 'Jajan', emoji: '🧋', preselect: true },
  { key: 'belajar', name: 'Belajar', emoji: '📚', preselect: false },
  { key: 'hiburan', name: 'Hiburan', emoji: '🎬', preselect: false },
  { key: 'laundry', name: 'Laundry', emoji: '🧺', preselect: false },
  { key: 'kesehatan', name: 'Kesehatan', emoji: '💊', preselect: false },
];

export const INCOME_SUGGESTIONS = [
  { key: 'kiriman', name: 'Kiriman Ortu', emoji: '💌', preselect: true },
  { key: 'beasiswa', name: 'Beasiswa', emoji: '🎓', preselect: false },
  { key: 'sampingan', name: 'Kerja Sampingan', emoji: '💼', preselect: false },
];

export const ALL_SUGGESTIONS = [
  ...EXPENSE_SUGGESTIONS.map((s) => ({ ...s, type: 'expense' })),
  ...INCOME_SUGGESTIONS.map((s) => ({ ...s, type: 'income' })),
];

/** Dua kategori cadangan yang tidak bisa dihapus. */
export function makeFallbackCategories() {
  return [
    { id: 'lainnya-out', name: 'Lainnya', emoji: '📦', type: 'expense', locked: true },
    { id: 'lainnya-in', name: 'Lainnya', emoji: '✨', type: 'income', locked: true },
  ];
}

export function categoryFromSuggestion(s) {
  return { id: uid(), name: s.name, emoji: s.emoji, type: s.type, locked: false };
}

/** Saran yang belum dipakai (berdasarkan nama, tidak peka huruf besar). */
export function unusedSuggestions(categories, type) {
  const used = new Set(categories.filter((c) => c.type === type).map((c) => c.name.toLowerCase()));
  return ALL_SUGGESTIONS.filter((s) => s.type === type && !used.has(s.name.toLowerCase()));
}

export const EMOJI_CHOICES = [
  '🍚', '🍜', '🍗', '☕', '🧋', '🍞', '🏠', '🛵', '🚌', '⛽', '📶', '📱', '📚', '✏️', '🖨️',
  '🎬', '🎮', '🎧', '🧺', '🧴', '💊', '👕', '🎁', '💇', '🐱', '🙏', '💡', '💧', '📦', '✨',
  '💌', '🎓', '💼', '💰', '🪙', '🏦',
];
