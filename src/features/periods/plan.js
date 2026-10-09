// Isian form "rencana periode" ⇄ objek siklus yang disimpan.

import { addDays, daysInclusive, todayISO } from '../../lib/dates.js';
import { describeLength } from '../../lib/period.js';
import { cycleRangeFrom, defaultAnchor, previewCycle } from '../../state/cycles.js';

export function emptyPlan(today = todayISO(), over = {}) {
  const base = {
    kind: 'monthly',
    weekStart: 0,
    monthDay: 1,
    count: '10',
    unit: 'day',
    customMode: 'length',
    end: '',
    anchor: '',
    anchorAuto: true,
    repeat: true,
    incomeOn: false,
    incomeAmount: 0,
    incomeCategoryId: 'lainnya-in',
    incomeAuto: true,
    carry: 'carry',
    goalId: '',
    name: '',
    ...over,
  };
  if (base.anchorAuto || !base.anchor) base.anchor = defaultAnchor(planRule(base), today);
  return base;
}

/** Bagian aturan saja (tanpa id) — cukup untuk menghitung rentang. */
export function planRule(plan) {
  let { count, unit } = plan;
  if (plan.kind === 'custom' && plan.customMode === 'end' && plan.anchor && plan.end && plan.end >= plan.anchor) {
    const len = describeLength(plan.anchor, plan.end);
    count = len.count;
    unit = len.unit;
  }
  return {
    kind: plan.kind,
    weekStart: Number(plan.weekStart) || 0,
    monthDay: Number(plan.monthDay) || 1,
    count: Math.max(1, Math.floor(Number(count)) || 1),
    unit: unit || 'day',
    anchor: plan.anchor,
  };
}

/** Isian lengkap → objek siklus siap simpan. */
export function planToCycle(plan, { id, createdAt = Date.now(), until = null, active = true } = {}) {
  return {
    id,
    name: plan.name.trim(),
    ...planRule(plan),
    repeat: Boolean(plan.repeat),
    income:
      plan.incomeOn && plan.incomeAmount > 0
        ? { amount: plan.incomeAmount, categoryId: plan.incomeCategoryId, auto: plan.repeat ? plan.incomeAuto : true, note: '' }
        : null,
    carry: plan.carry,
    goalId: plan.carry === 'save' ? plan.goalId || null : null,
    active,
    until,
    createdAt,
  };
}

export function planFromCycle(c) {
  return {
    kind: c.kind,
    weekStart: c.weekStart,
    monthDay: c.monthDay,
    count: String(c.count),
    unit: c.unit,
    customMode: 'length',
    end: '',
    anchor: c.until ? addDays(c.until, 1) : c.anchor,
    anchorAuto: false,
    repeat: c.repeat,
    incomeOn: Boolean(c.income),
    incomeAmount: c.income?.amount ?? 0,
    incomeCategoryId: c.income?.categoryId ?? 'lainnya-in',
    incomeAuto: c.income?.auto ?? true,
    carry: c.carry,
    goalId: c.goalId ?? '',
    name: c.name,
  };
}

/** Rentang periode pertama, dan beberapa berikutnya untuk pratinjau. */
export function planPreview(plan, today = todayISO()) {
  if (!plan.anchor) return null;
  if (plan.kind === 'custom' && plan.customMode === 'end' && (!plan.end || plan.end < plan.anchor)) return null;
  if (plan.kind === 'custom' && plan.customMode !== 'end' && !(Number(plan.count) > 0)) return null;
  const rule = planRule(plan);
  const first = plan.kind === 'custom' && plan.customMode === 'end' ? { start: plan.anchor, end: plan.end } : cycleRangeFrom(rule, plan.anchor);
  const days = daysInclusive(first.start, first.end);
  const next = plan.repeat ? previewCycle({ ...rule, anchor: addDays(first.end, 1) }, 3) : [];
  // berapa periode yang akan langsung dibuat (kalau tanggal mulai jauh di belakang)
  let catchUp = 1;
  if (plan.repeat) {
    let s = addDays(first.end, 1);
    while (s <= today && catchUp < 400) {
      catchUp++;
      s = addDays(cycleRangeFrom(rule, s).end, 1);
    }
  }
  const raw = plan.incomeOn && plan.incomeAmount > 0 ? plan.incomeAmount / days : 0;
  const allowance = raw >= 1000 ? Math.floor(raw / 500) * 500 : Math.floor(raw);
  return { first, days, next, catchUp, allowance };
}
