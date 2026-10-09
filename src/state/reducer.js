// Semua perubahan data lewat sini. Setiap aksi mengembalikan data baru
// (tidak mengubah yang lama), sehingga fitur "Urungkan" mudah dibuat.

import { applyCycles } from './cycles.js';
import { applyRecurring } from './recurring.js';
import { normalizeData } from './storage.js';

const fallbackFor = (type) => (type === 'income' ? 'lainnya-in' : 'lainnya-out');

export function savedForGoal(deposits, goalId) {
  return deposits.filter((d) => d.goalId === goalId).reduce((s, d) => s + d.amount, 0);
}

/** Tandai target tercapai / belum tercapai setelah setoran berubah. */
function syncAchieved(state) {
  let changed = false;
  const goals = state.goals.map((g) => {
    const reached = savedForGoal(state.deposits, g.id) >= g.target;
    if (reached && !g.achievedAt) {
      changed = true;
      return { ...g, achievedAt: Date.now() };
    }
    if (!reached && g.achievedAt) {
      changed = true;
      return { ...g, achievedAt: null };
    }
    return g;
  });
  return changed ? { ...state, goals } : state;
}

export function reducer(state, action) {
  switch (action.type) {
    // ——— Data umum ———
    case 'REPLACE_ALL':
      return action.data;

    case 'MERGE_ALL': {
      const incoming = action.data;
      const mergeById = (a, b) => {
        const map = new Map(a.map((x) => [x.id, x]));
        for (const x of b) map.set(x.id, x);
        return [...map.values()];
      };
      return normalizeData({
        ...state,
        categories: mergeById(state.categories, incoming.categories),
        transactions: mergeById(state.transactions, incoming.transactions),
        recurring: mergeById(state.recurring, incoming.recurring),
        goals: mergeById(state.goals, incoming.goals),
        deposits: mergeById(state.deposits, incoming.deposits),
        checkins: [...new Set([...state.checkins, ...incoming.checkins])],
        periods: mergeById(state.periods, incoming.periods || []),
        cycles: mergeById(state.cycles, incoming.cycles || []),
        limits: mergeById(state.limits, incoming.limits || []),
      });
    }

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'RUN_RECURRING':
      // jadwal rutin + periode berulang yang sudah waktunya
      return applyCycles(applyRecurring(state, action.today), action.today);

    // ——— Transaksi ———
    case 'ADD_TX':
      return { ...state, transactions: [...state.transactions, action.tx] };

    case 'ADD_TX_RECURRING': {
      // transaksi + jadwal rutinnya sekaligus
      return {
        ...state,
        recurring: [...state.recurring, action.recurring],
        transactions: [...state.transactions, action.tx],
      };
    }

    case 'UPDATE_TX':
      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === action.tx.id ? { ...t, ...action.tx } : t)),
      };

    case 'DELETE_TX':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) };

    case 'TOGGLE_CHECKIN': {
      const has = state.checkins.includes(action.date);
      return {
        ...state,
        checkins: has ? state.checkins.filter((d) => d !== action.date) : [...state.checkins, action.date],
      };
    }

    // ——— Kategori ———
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.category] };

    case 'ADD_CATEGORIES':
      return { ...state, categories: [...state.categories, ...action.categories] };

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.category.id ? { ...c, ...action.category, locked: c.locked } : c,
        ),
      };

    case 'SET_BUDGET': {
      // pintasan lama: batas bulanan bernominal tetap untuk satu kategori
      const existing = state.limits.find((l) => l.target === action.id && l.mode === 'fixed' && l.window?.kind === 'month');
      if (!(action.budget > 0)) return existing ? { ...state, limits: state.limits.filter((l) => l !== existing) } : state;
      if (existing) {
        return { ...state, limits: state.limits.map((l) => (l === existing ? { ...l, amount: action.budget, active: true } : l)) };
      }
      const limit = {
        id: `lim-${action.id}-${Date.now().toString(36)}`, name: '', target: action.id, window: { kind: 'month', monthDay: 1 },
        mode: 'fixed', amount: action.budget, percent: null, rollover: 'reset', warnAt: 0.8, active: true,
        since: action.today || new Date().toISOString().slice(0, 10), createdAt: Date.now(),
      };
      return { ...state, limits: [...state.limits, limit] };
    }

    case 'DELETE_CATEGORY': {
      const cat = state.categories.find((c) => c.id === action.id);
      if (!cat || cat.locked) return state;
      const to = fallbackFor(cat.type);
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        transactions: state.transactions.map((t) => (t.categoryId === action.id ? { ...t, categoryId: to } : t)),
        recurring: state.recurring.map((r) => (r.categoryId === action.id ? { ...r, categoryId: to } : r)),
        // batas khusus kategori ini ikut dihapus; batas total tetap
        limits: state.limits.filter((l) => l.target !== action.id),
        cycles: state.cycles.map((c) => (c.income?.categoryId === action.id ? { ...c, income: { ...c.income, categoryId: 'lainnya-in' } } : c)),
      };
    }

    // ——— Rutin ———
    case 'ADD_RECURRING':
      return { ...state, recurring: [...state.recurring, action.recurring] };

    case 'UPDATE_RECURRING':
      return {
        ...state,
        recurring: state.recurring.map((r) => (r.id === action.recurring.id ? { ...r, ...action.recurring } : r)),
      };

    case 'DELETE_RECURRING':
      // transaksi yang sudah terbuat tetap ada, hanya jadwalnya yang dihapus
      return {
        ...state,
        recurring: state.recurring.filter((r) => r.id !== action.id),
        transactions: state.transactions.map((t) =>
          t.recurringId === action.id ? { ...t, recurringId: null } : t,
        ),
      };

    // ——— Periode pemasukan ———
    // Periode hanya "jendela waktu"; transaksi tidak ikut terhapus bila periode dihapus.
    case 'ADD_PERIOD':
      return { ...state, periods: [...state.periods, action.period] };

    case 'UPDATE_PERIOD':
      return {
        ...state,
        periods: state.periods.map((p) => (p.id === action.period.id ? { ...p, ...action.period } : p)),
      };

    case 'DELETE_PERIOD':
      return { ...state, periods: state.periods.filter((p) => p.id !== action.id) };

    // ——— Periode berulang ———
    // Setelah aturan dibuat/diubah, periode yang sudah waktunya langsung dibuat.
    case 'ADD_CYCLE':
      return applyCycles({ ...state, cycles: [...state.cycles, action.cycle] }, action.today);

    case 'UPDATE_CYCLE': {
      const c = action.cycle;
      const today = action.today;
      return applyCycles(
        {
          ...state,
          cycles: state.cycles.map((x) => (x.id === c.id ? { ...x, ...c } : x)),
          // aturan sisa uang ikut berlaku untuk periode siklus ini yang belum selesai
          periods: state.periods.map((p) =>
            p.cycleId === c.id && p.end >= today && !p.settled ? { ...p, carry: c.carry ?? p.carry, goalId: c.goalId ?? null } : p,
          ),
        },
        today,
      );
    }

    case 'DELETE_CYCLE': {
      // purge: hapus juga periode, pemasukan otomatis, dan setoran otomatis dari siklus ini (dipakai untuk "Urungkan")
      if (!action.purge) {
        return {
          ...state,
          cycles: state.cycles.filter((c) => c.id !== action.id),
          periods: state.periods.map((p) => (p.cycleId === action.id ? { ...p, cycleId: null } : p)),
        };
      }
      const ids = new Set(state.periods.filter((p) => p.cycleId === action.id).map((p) => p.id));
      return {
        ...state,
        cycles: state.cycles.filter((c) => c.id !== action.id),
        periods: state.periods.filter((p) => !ids.has(p.id)),
        transactions: state.transactions.filter((t) => !(t.auto && ids.has(t.periodId))),
        deposits: state.deposits.filter((d) => !(d.auto && ids.has(d.periodId))),
      };
    }

    // ——— Batasan ———
    case 'ADD_LIMIT':
      return { ...state, limits: [...state.limits, action.limit] };

    case 'UPDATE_LIMIT':
      return { ...state, limits: state.limits.map((l) => (l.id === action.limit.id ? { ...l, ...action.limit } : l)) };

    case 'DELETE_LIMIT':
      return { ...state, limits: state.limits.filter((l) => l.id !== action.id) };

    case 'RESTORE_LIMIT': {
      // kembalikan ke posisi semula (untuk "Urungkan" hapus)
      const limits = [...state.limits];
      limits.splice(Math.min(action.index ?? limits.length, limits.length), 0, action.limit);
      return { ...state, limits };
    }

    // ——— Tabungan ———
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.goal] };

    case 'UPDATE_GOAL':
      return syncAchieved({
        ...state,
        goals: state.goals.map((g) => (g.id === action.goal.id ? { ...g, ...action.goal } : g)),
      });

    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.id),
        deposits: state.deposits.filter((d) => d.goalId !== action.id),
        // sisa periode yang tadinya ke target ini kembali "diabaikan"
        cycles: state.cycles.map((c) => (c.goalId === action.id ? { ...c, goalId: null, carry: c.carry === 'save' ? 'ignore' : c.carry } : c)),
        periods: state.periods.map((p) =>
          p.goalId === action.id ? { ...p, goalId: null, carry: p.carry === 'save' && !p.settled ? 'ignore' : p.carry } : p,
        ),
      };

    case 'ADD_DEPOSIT':
      return syncAchieved({ ...state, deposits: [...state.deposits, action.deposit] });

    case 'DELETE_DEPOSIT':
      return syncAchieved({ ...state, deposits: state.deposits.filter((d) => d.id !== action.id) });

    default:
      console.warn('Aksi tidak dikenal:', action.type);
      return state;
  }
}
