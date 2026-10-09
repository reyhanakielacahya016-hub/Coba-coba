import { CalendarClock, Check, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { DateField } from '../../components/ui/DateField.jsx';
import { Select, TextInput } from '../../components/ui/Form.jsx';
import { Sheet } from '../../components/ui/Sheet.jsx';
import { useConfirm } from '../../hooks/useConfirm.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { addDays, daysInclusive, todayISO } from '../../lib/dates.js';
import { formatDateShort } from '../../lib/format.js';
import { uid } from '../../lib/id.js';
import { lengthLabel, overlapping, periodTitle, rangeLabel } from '../../lib/period.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { CARRY_OPTIONS, cycleRuleLabel, cycleSpec, validateCycleInput } from '../../state/cycles.js';
import { windowAt } from '../../lib/windows.js';
import { categoriesByUsage } from '../../state/selectors.js';
import { limitFromTemplate, PERIOD_TEMPLATES } from '../../state/templates.js';
import { PeriodTimeline } from './PeriodFields.jsx';
import { emptyPlan, planFromCycle, planPreview, planToCycle } from './plan.js';
import { PlanFields } from './PlanFields.jsx';

/** Catatan bertumpuk yang ramah (bukan error, hanya info). */
export function overlapText(periods, start, end, ignoreId) {
  if (!start || !end) return '';
  const hits = overlapping(periods, start, end, ignoreId);
  if (!hits.length) return '';
  const names = hits.slice(0, 2).map(periodTitle).join(', ') + (hits.length > 2 ? `, dan ${hits.length - 2} lainnya` : '');
  return `Bertumpuk dengan ${names}. Tidak apa-apa, Saku memakai periode yang mulainya paling akhir untuk hari-hari yang sama.`;
}

/** Ubah "preset" lama (start, count, unit) menjadi isian rencana. */
function presetToPlan(preset = {}) {
  if (!preset.start && !preset.count) return {};
  return {
    kind: 'custom',
    customMode: preset.mode === 'end' ? 'end' : 'length',
    count: String(preset.count ?? '1'),
    unit: preset.unit ?? 'month',
    end: preset.end ?? '',
    anchor: preset.start,
    anchorAuto: !preset.start,
    repeat: false,
  };
}

/**
 * Satu lembar untuk tiga keperluan:
 * - buat periode baru (dengan template cepat),
 * - ubah aturan periode berulang ({ cycle }),
 * - ubah satu periode ({ period }).
 */
export function PeriodFormSheet() {
  const { periodForm, closePeriodForm } = useUi();
  const mode = !periodForm ? null : periodForm.period ? 'period' : periodForm.cycle ? 'cycle' : 'create';
  return (
    <>
      <PlanSheet open={mode === 'create' || mode === 'cycle'} form={periodForm} onClose={closePeriodForm} />
      <SinglePeriodSheet open={mode === 'period'} period={periodForm?.period} onClose={closePeriodForm} />
    </>
  );
}

// ——— Buat / ubah rencana periode ———

function PlanSheet({ open, form, onClose }) {
  const { data, dispatch } = useData();
  const { setScope } = useUi();
  const toast = useToast();
  const confirm = useConfirm();
  const today = todayISO();
  const cycle = form?.cycle ?? null;

  const incomeCategories = useMemo(() => categoriesByUsage(data, 'income', today), [data, today]);
  const defaultIncomeCat = incomeCategories.find((c) => !c.locked)?.id ?? 'lainnya-in';

  const [plan, setPlan] = useState(() => emptyPlan(today));
  const [template, setTemplate] = useState(null);
  const [pickedLimits, setPickedLimits] = useState([]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (cycle) {
      setTemplate(null);
      setPlan(planFromCycle(cycle));
      return;
    }
    const tpl = form?.template ? PERIOD_TEMPLATES.find((t) => t.id === form.template) : null;
    applyTemplate(tpl, { ...presetToPlan(form?.preset), ...(form?.plan ?? {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form]);

  function applyTemplate(tpl, extra = {}) {
    setTemplate(tpl);
    setPickedLimits(tpl ? tpl.limits.map((l) => l.key) : []);
    const over = { incomeCategoryId: defaultIncomeCat, goalId: data.goals[0]?.id ?? '__new', ...(tpl ? tpl.plan(today) : {}), ...extra };
    setPlan(emptyPlan(today, over));
  }

  const { errors, warnings } = validateCycleInput({ ...plan, mode: plan.customMode, goalId: plan.goalId });
  const shownErrors = touched ? errors : {};
  const preview = planPreview(plan, today);

  const overlapNote = useMemo(() => {
    if (!preview || cycle) return '';
    return overlapText(data.periods, preview.first.start, preview.first.end);
  }, [preview, cycle, data.periods]);

  const ensureGoal = () => {
    if (plan.carry !== 'save' || plan.goalId !== '__new') return { goalId: plan.goalId, goal: null };
    const goal = { id: uid(), name: 'Sisa periode', emoji: '🐷', target: 1000000, deadline: null, createdAt: Date.now(), achievedAt: null };
    return { goalId: goal.id, goal };
  };

  const save = () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    const { goalId, goal } = ensureGoal();
    if (goal) dispatch({ type: 'ADD_GOAL', goal });
    const p = { ...plan, goalId };

    if (cycle) {
      const before = cycle;
      // aturan kustom dihitung ulang dari awal periode berikutnya
      const next = planToCycle(p, { id: cycle.id, createdAt: cycle.createdAt, until: cycle.until, active: cycle.active });
      if (next.kind === 'custom') next.anchor = cycle.until ? addDays(cycle.until, 1) : cycle.anchor;
      else next.anchor = cycle.anchor;
      dispatch({ type: 'UPDATE_CYCLE', cycle: next, today });
      toast({
        message: 'Aturan periode diperbarui. Berlaku mulai periode berikutnya.',
        icon: <Check size={16} />,
        action: { label: 'Urungkan', onClick: () => dispatch({ type: 'UPDATE_CYCLE', cycle: before, today }) },
      });
      onClose();
      return;
    }

    const c = planToCycle(p, { id: uid() });
    if (!c.name) c.name = template?.plan(today).name ?? (c.income ? data.categories.find((x) => x.id === c.income.categoryId)?.name : '') ?? '';
    dispatch({ type: 'ADD_CYCLE', cycle: c, today });

    const limits = template
      ? template.limits
          .filter((l) => pickedLimits.includes(l.key))
          .map((l) => limitFromTemplate(data, l, { id: uid(), today }))
          .filter(Boolean)
      : [];
    for (const limit of limits) dispatch({ type: 'ADD_LIMIT', limit });

    setScope(null);
    toast({
      message: `${c.repeat ? 'Periode berulang' : 'Periode'} dibuat${limits.length ? ` dengan ${limits.length} batasan` : ''}.`,
      icon: '🗓️',
      action: {
        label: 'Urungkan',
        onClick: () => {
          dispatch({ type: 'DELETE_CYCLE', id: c.id, purge: true });
          for (const l of limits) dispatch({ type: 'DELETE_LIMIT', id: l.id });
          if (goal) dispatch({ type: 'DELETE_GOAL', id: goal.id });
          setScope(null);
        },
      },
    });
    onClose();
  };

  const toggleActive = () => {
    const next = { ...cycle, active: !cycle.active };
    // dilanjutkan setelah lama berhenti: mulai dari periode yang memuat hari ini, tanpa mengisi yang terlewat
    if (next.active && next.until && addDays(next.until, 1) < today) {
      const w = windowAt(cycleSpec(next), today);
      if (w && addDays(w.start, -1) > next.until) next.until = addDays(w.start, -1);
      if (next.kind === 'custom') next.anchor = addDays(next.until, 1);
    }
    dispatch({ type: 'UPDATE_CYCLE', cycle: next, today });
    toast({
      message: next.active ? 'Pengulangan dilanjutkan.' : 'Pengulangan dihentikan. Periode yang sudah ada tetap tersimpan.',
      action: { label: 'Urungkan', onClick: () => dispatch({ type: 'UPDATE_CYCLE', cycle, today }) },
    });
    onClose();
  };

  const removeCycle = async () => {
    const ok = await confirm({
      title: `Hapus rencana ${cycle.name || 'periode'}?`,
      message: 'Tidak ada periode baru yang dibuat lagi. Periode, transaksi, dan tabungan yang sudah ada tetap aman.',
      confirmLabel: 'Hapus rencana',
      danger: true,
    });
    if (!ok) return;
    const before = data;
    dispatch({ type: 'DELETE_CYCLE', id: cycle.id });
    toast({ message: 'Rencana dihapus.', icon: <Trash2 size={16} />, action: { label: 'Urungkan', onClick: () => dispatch({ type: 'REPLACE_ALL', data: before }) } });
    onClose();
  };

  const title = cycle ? 'Ubah aturan periode' : 'Atur periode';
  const nextStart = cycle?.until ? addDays(cycle.until, 1) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={
        cycle
          ? `${cycleRuleLabel(cycle)}. Perubahan berlaku mulai periode berikutnya${nextStart ? ` (${formatDateShort(nextStart)})` : ''}.`
          : 'Sesuaikan dengan ritme uangmu: kapan uang datang dan berapa lama harus cukup.'
      }
      footer={
        <>
          {cycle && (
            <>
              <Button variant="danger" onClick={removeCycle} aria-label="Hapus rencana">
                <Trash2 size={18} />
              </Button>
              <Button variant="soft" onClick={toggleActive}>
                {cycle.active ? <PauseCircle size={18} /> : <PlayCircle size={18} />} {cycle.active ? 'Hentikan' : 'Lanjutkan'}
              </Button>
            </>
          )}
          <Button onClick={save}>{cycle ? 'Simpan aturan' : 'Buat periode'}</Button>
        </>
      }
    >
      <div className="stack">
        {!cycle && (
          <section aria-labelledby="tpl-title">
            <h3 id="tpl-title" className="plan__section-title">
              Mulai dari template
            </h3>
            <div className="tpl-row" role="radiogroup" aria-labelledby="tpl-title">
              {PERIOD_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={template?.id === t.id}
                  className={`tpl ${template?.id === t.id ? 'is-selected' : ''}`}
                  onClick={() => (template?.id === t.id ? applyTemplate(null) : applyTemplate(t))}
                >
                  <span className="tpl__emoji" aria-hidden="true">
                    {t.emoji}
                  </span>
                  <span className="tpl__title">{t.title}</span>
                  <span className="tpl__desc">{t.desc}</span>
                </button>
              ))}
            </div>
            {template && <p className="field__hint">Semua isian di bawah tetap bisa kamu ubah.</p>}
          </section>
        )}

        <PlanFields
          value={plan}
          onChange={setPlan}
          errors={shownErrors}
          warnings={warnings}
          incomeCategories={incomeCategories}
          goals={data.goals}
          mode={cycle ? 'edit' : 'create'}
          overlapNote={overlapNote}
        />

        {template && (
          <section className="tpl-limits" aria-labelledby="tpl-lim">
            <h3 id="tpl-lim" className="plan__section-title">
              Batasan yang disarankan
            </h3>
            <p className="field__hint">Centang yang mau ikut dibuat. Bisa diubah nanti di Rencana → Batasan.</p>
            <div className="tpl-limits__list">
              {template.limits.map((l) => {
                const on = pickedLimits.includes(l.key);
                const missing = !limitFromTemplate(data, l, { id: 'x', today });
                return (
                  <label key={l.key} className={`tpl-limit ${on && !missing ? 'is-on' : ''} ${missing ? 'is-missing' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on && !missing}
                      disabled={missing}
                      onChange={(e) => setPickedLimits((xs) => (e.target.checked ? [...xs, l.key] : xs.filter((k) => k !== l.key)))}
                    />
                    <span>
                      {l.label}
                      {missing && <span className="tpl-limit__note"> · kategorinya belum ada</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Sheet>
  );
}

// ——— Ubah satu periode ———

function SinglePeriodSheet({ open, period, onClose }) {
  const { data, dispatch } = useData();
  const { setScope, openPeriodForm } = useUi();
  const toast = useToast();
  const confirm = useConfirm();
  const id = useId();
  const [v, setV] = useState({ name: '', start: '', end: '', carry: 'ignore', goalId: '' });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open || !period) return;
    setTouched(false);
    setV({ name: period.name, start: period.start, end: period.end, carry: period.carry ?? 'ignore', goalId: period.goalId ?? '' });
  }, [open, period]);

  const errors = {};
  if (!v.start) errors.start = 'Pilih tanggal mulai dulu ya.';
  if (!v.end) errors.end = 'Pilih tanggal berakhir.';
  else if (v.start && v.end < v.start) errors.end = 'Tanggal berakhir tidak boleh sebelum tanggal mulai.';
  else if (v.start && daysInclusive(v.start, v.end) > 731) errors.end = 'Maksimal 2 tahun untuk satu periode.';
  if (v.carry === 'save' && !v.goalId) errors.goalId = 'Pilih target tabungan untuk menampung sisanya.';
  const shown = touched ? errors : {};
  const cycle = period?.cycleId ? data.cycles.find((c) => c.id === period.cycleId) : null;
  const settled = period?.settled;

  const save = () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    const before = period;
    dispatch({
      type: 'UPDATE_PERIOD',
      period: { id: period.id, name: v.name.trim(), start: v.start, end: v.end, carry: v.carry, goalId: v.carry === 'save' ? v.goalId : null },
    });
    toast({ message: 'Periode diperbarui.', action: { label: 'Urungkan', onClick: () => dispatch({ type: 'UPDATE_PERIOD', period: before }) } });
    onClose();
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Hapus ${periodTitle(period)}?`,
      message: 'Hanya jendela periodenya yang dihapus. Semua transaksi, batasan, dan tabungan tetap aman.',
      confirmLabel: 'Hapus periode',
      danger: true,
    });
    if (!ok) return;
    const p = period;
    dispatch({ type: 'DELETE_PERIOD', id: p.id });
    setScope(null);
    toast({ message: 'Periode dihapus. Transaksinya tetap ada.', icon: <Trash2 size={16} />, action: { label: 'Urungkan', onClick: () => dispatch({ type: 'ADD_PERIOD', period: p }) } });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ubah periode"
      description="Perubahan hanya untuk periode ini."
      footer={
        <>
          <Button variant="danger" onClick={remove}>
            <Trash2 size={18} /> Hapus
          </Button>
          <Button onClick={save}>Simpan perubahan</Button>
        </>
      }
    >
      {period && (
        <div className="pf">
          {cycle && (
            <div className="plan__cycle-note">
              <CalendarClock size={18} aria-hidden="true" />
              <span>
                Bagian dari rencana <strong>{cycle.name || 'periode'}</strong> ({cycleRuleLabel(cycle).toLowerCase()}).
              </span>
              <button type="button" className="link-btn" onClick={() => openPeriodForm({ cycle })}>
                Ubah aturan
              </button>
            </div>
          )}
          <div className="field">
            <label className="field__label" htmlFor={`${id}-name`}>
              Nama <span className="pf__opt">(opsional)</span>
            </label>
            <TextInput id={`${id}-name`} value={v.name} maxLength={60} placeholder="mis. Kiriman Oktober" onChange={(e) => setV({ ...v, name: e.target.value })} />
          </div>
          <div className="pf__range">
            <DateField passInvalid label="Mulai" value={v.start} onChange={(start) => setV({ ...v, start })} error={shown.start} rangeStart={v.start} rangeEnd={v.end} />
            <DateField
                passInvalid
              label="Berakhir"
              value={v.end}
              onChange={(end) => setV({ ...v, end })}
              error={shown.end}
              min={v.start || undefined}
              minMessage="Tanggal berakhir tidak boleh sebelum tanggal mulai."
              rangeStart={v.start}
              rangeEnd={v.end}
            />
          </div>
          {v.start && v.end && v.end >= v.start && (
            <div className="pf__preview">
              <div className="pf__preview-top">
                <span className="pf__preview-range">{rangeLabel(v.start, v.end)}</span>
                <span className="pf__preview-len">{lengthLabel(v.start, v.end)}</span>
              </div>
              <PeriodTimeline start={v.start} end={v.end} />
              {overlapText(data.periods, v.start, v.end, period.id) && <p className="pf__overlap">{overlapText(data.periods, v.start, v.end, period.id)}</p>}
            </div>
          )}
          {settled ? (
            <p className="field__hint">Sisa periode ini sudah diproses saat periode selesai, jadi aturan sisanya tidak bisa diubah lagi.</p>
          ) : (
            <div className="field">
              <label className="field__label" htmlFor={`${id}-carry`}>
                Kalau ada sisa uang di akhir periode
              </label>
              <Select id={`${id}-carry`} value={v.carry} onChange={(e) => setV({ ...v, carry: e.target.value })}>
                {CARRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              {v.carry === 'save' && (
                <Select aria-label="Target tabungan" value={v.goalId} onChange={(e) => setV({ ...v, goalId: e.target.value })}>
                  <option value="">Pilih target…</option>
                  {data.goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.emoji} {g.name}
                    </option>
                  ))}
                </Select>
              )}
              {shown.goalId && <p className="datefield__error">{shown.goalId}</p>}
              {v.carry === 'save' && data.goals.length === 0 && <p className="field__hint">Belum ada target tabungan. Buat dulu di Rencana → Tabungan.</p>}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
