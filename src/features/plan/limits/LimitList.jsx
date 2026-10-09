import { Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AnimatedRupiah } from '../../../components/ui/AnimatedNumber.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { ProgressBar } from '../../../components/ui/ProgressBar.jsx';
import { useToast } from '../../../hooks/useToast.jsx';
import { monthOf, todayISO } from '../../../lib/dates.js';
import { formatDateShort, formatRupiah } from '../../../lib/format.js';
import { uid } from '../../../lib/id.js';
import { rangeLabel } from '../../../lib/period.js';
import { useData, useUi } from '../../../state/AppProvider.jsx';
import {
  allLimitStatus,
  categoryLimitsVsIncome,
  limitMessage,
  limitTitle,
  modeLabel,
  targetEmoji,
  windowLabel,
} from '../../../state/limits.js';
import { averageSpending, pace as computePace } from '../../../state/selectors.js';
import { resolveTarget } from '../../../state/templates.js';
import { PeriodSwitcher } from '../../periods/PeriodSwitcher.jsx';
import { emptyLimit, LimitFormSheet } from './LimitFormSheet.jsx';
import './Limits.css';

const LEVEL_BADGE = { warn: 'Hampir batas', over: 'Lewat batas', off: 'Nonaktif' };

/** Ide batasan siap pakai (membuka form yang sudah terisi). */
const IDEAS = [
  { label: 'Jatah harian otomatis', preset: { name: 'Jatah harian', target: 'total', window: { kind: 'day' }, mode: 'auto' } },
  { label: 'Makan Rp 30.000/hari', preset: { target: '@makan', window: { kind: 'day' }, mode: 'fixed', amount: 30000 } },
  { label: 'Jajan maks. 10%', preset: { target: '@jajan', window: { kind: 'period' }, mode: 'percent', percent: 10 } },
  { label: 'Transport Rp 100.000 per 3 hari', preset: { target: '@transport', window: { kind: 'ndays', count: 3 }, mode: 'fixed', amount: 100000 } },
  { label: 'Hiburan Rp 150.000/bulan', preset: { target: '@hiburan', window: { kind: 'month', monthDay: 1 }, mode: 'fixed', amount: 150000, rollover: 'carry' } },
];

/** Tab Rencana → Batasan. */
export function LimitList() {
  const { data, dispatch } = useData();
  const { range } = useUi();
  const toast = useToast();
  const today = todayISO();
  const [form, setForm] = useState(null);

  // periode lain yang dipilih: tampilkan keadaan batasan di akhir periode itu
  const ref = range.status === 'done' ? range.end : range.status === 'upcoming' ? range.start : today;
  const isToday = ref === today;
  const list = useMemo(() => allLimitStatus(data, ref), [data, ref]);
  const vsIncome = useMemo(() => categoryLimitsVsIncome(data, ref), [data, ref]);

  const activeToday = list.filter((s) => s.limit.active && s.state === 'active');
  const totals = activeToday.filter((s) => s.limit.target === 'total' && s.safeToday !== null);
  const pace = isToday ? computePace(data, range, today) : null;
  const safe = totals.length ? Math.min(...totals.map((s) => s.safeToday)) : pace ? Math.max(0, pace.todayLeft) : null;
  const catSafe = activeToday.filter((s) => s.limit.target !== 'total' && s.safeToday !== null).slice(0, 4);
  const warnCount = list.filter((s) => s.level === 'warn').length;
  const overCount = list.filter((s) => s.level === 'over').length;

  // saran dari rata-rata 3 bulan terakhir untuk kategori yang belum punya batasan
  const suggestions = useMemo(() => {
    const has = new Set(data.limits.map((l) => l.target));
    return data.categories
      .filter((c) => c.type === 'expense' && !c.locked && !has.has(c.id))
      .map((c) => ({ c, avg: averageSpending(data, c.id, monthOf(today)) }))
      .filter((x) => x.avg > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3);
  }, [data, today]);

  const applySuggestions = () => {
    const created = suggestions.map(({ c, avg }) => ({
      ...emptyLimit(today),
      id: uid(),
      target: c.id,
      window: { kind: 'month', monthDay: 1 },
      amount: Math.ceil(avg / 10000) * 10000,
      skipRecurring: false,
      createdAt: Date.now(),
    }));
    for (const limit of created) dispatch({ type: 'ADD_LIMIT', limit });
    toast({
      message: `${created.length} batasan bulanan dipasang dari rata-rata pengeluaranmu.`,
      icon: <Sparkles size={16} />,
      action: { label: 'Urungkan', onClick: () => created.forEach((l) => dispatch({ type: 'DELETE_LIMIT', id: l.id })) },
    });
  };

  const toggle = (limit) => {
    dispatch({ type: 'UPDATE_LIMIT', limit: { id: limit.id, active: !limit.active } });
    toast({
      message: limit.active ? 'Batasan dinonaktifkan sementara.' : 'Batasan diaktifkan lagi.',
      action: { label: 'Urungkan', onClick: () => dispatch({ type: 'UPDATE_LIMIT', limit: { id: limit.id, active: limit.active } }) },
    });
  };

  const openIdea = (preset) => {
    const target = resolveTarget(data, preset.target);
    setForm({ preset: { ...preset, target: target ?? 'total', mode: target === 'total' || target ? preset.mode : 'fixed' } });
  };

  return (
    <div className="stack">
      <PeriodSwitcher />

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            illustration="target"
            title="Belum ada batasan"
            action={
              <Button onClick={() => setForm({})}>
                <Plus size={18} /> Buat batasan
              </Button>
            }
            secondary={
              suggestions.length > 0 && (
                <Button variant="ghost" onClick={applySuggestions}>
                  <Sparkles size={18} /> Pasang dari rata-rata ({suggestions.length})
                </Button>
              )
            }
          >
            Batasan membantu uangmu cukup sampai akhir periode. Bisa untuk semua pengeluaran atau satu kategori, per hari, per minggu, per bulan, atau per
            berapa hari sesukamu.
          </EmptyState>
        </div>
      ) : (
        <section className="card safe" aria-labelledby="safe-title">
          <div className="safe__head">
            <span className="safe__icon" aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            <p id="safe-title" className="safe__label">
              {isToday ? 'Aman dipakai hari ini' : `Keadaan batasan pada ${formatDateShort(ref)}`}
            </p>
          </div>
          {isToday && safe !== null ? (
            <AnimatedRupiah value={safe} className="safe__amount" />
          ) : (
            <p className="muted">{isToday ? 'Pasang batas total atau buat periode untuk melihat angka aman hari ini.' : 'Angka “hari ini” hanya muncul untuk periode yang sedang berjalan.'}</p>
          )}
          {isToday && catSafe.length > 0 && (
            <ul className="safe__cats">
              {catSafe.map((s) => (
                <li key={s.limit.id} className={`safe__cat level-${s.level}`}>
                  <span aria-hidden="true">{targetEmoji(data, s.limit)}</span> {limitTitle(data, s.limit)} <strong className="num">{formatRupiah(s.safeToday)}</strong>
                </li>
              ))}
            </ul>
          )}
          <p className="safe__summary">
            {list.filter((s) => s.limit.active).length} batasan aktif
            {warnCount > 0 && <> · {warnCount} hampir batas</>}
            {overCount > 0 && <> · {overCount} lewat batas</>}
          </p>
        </section>
      )}

      {vsIncome.over && (
        <p className="lf__warning" role="status">
          Kalau dijumlah satu periode, batas per kategori sekitar <strong className="num">{formatRupiah(vsIncome.sum)}</strong>, lebih besar dari pemasukanmu (
          <span className="num">{formatRupiah(vsIncome.income)}</span>). Tidak salah, tapi mungkin ada yang perlu dikecilkan sedikit.
        </p>
      )}

      {list.length > 0 && (
        <section className="section" aria-labelledby="lim-title">
          <div className="section__head">
            <h2 id="lim-title" className="section__title plan__subtitle">
              Batasanmu
            </h2>
            <Button size="sm" variant="soft" onClick={() => setForm({})}>
              <Plus size={16} /> Tambah
            </Button>
          </div>
          <ul className="limit-list enter-stagger">
            {list.map((s) => (
              <li key={s.limit.id}>
                <LimitCard st={s} isToday={isToday} onEdit={() => setForm({ limit: s.limit })} onToggle={() => toggle(s.limit)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card section ideas" aria-labelledby="idea-title">
        <h2 id="idea-title" className="section__title">
          Ide batasan
        </h2>
        <p className="muted">Ketuk untuk membuka form yang sudah terisi. Semua angka bisa kamu ubah.</p>
        <div className="chip-row">
          {IDEAS.map((i) => (
            <button key={i.label} type="button" className="chip" onClick={() => openIdea(i.preset)}>
              {i.label}
            </button>
          ))}
        </div>
      </section>

      {list.length > 0 && suggestions.length > 0 && (
        <button type="button" className="suggest-banner" onClick={applySuggestions}>
          <Sparkles size={18} aria-hidden="true" />
          <span>
            <strong>Saran:</strong> pasang batas bulanan untuk {suggestions.map((x) => x.c.name).join(', ')} dari rata-rata pengeluaranmu.
          </span>
        </button>
      )}

      <section className="card explain" aria-labelledby="lexp-title">
        <h2 id="lexp-title" className="section__title">
          Cara kerja batasan
        </h2>
        <ol className="explain__list">
          <li>
            <strong>Pilih untuk apa</strong>: semua pengeluaran, atau satu kategori seperti makan atau jajan.
          </li>
          <li>
            <strong>Pilih rentangnya</strong>: per hari, minggu, bulan, per N hari, tanggal tertentu, atau ikut periode. Tidak harus sama dengan periodemu.
          </li>
          <li>
            <strong>Tentukan besarnya</strong>: nominal tetap, persen dari pemasukan, atau otomatis dari sisa uang ÷ sisa hari.
          </li>
        </ol>
      </section>

      <LimitFormSheet value={form} onClose={() => setForm(null)} />
    </div>
  );
}

/** Satu kartu batasan. */
export function LimitCard({ st, isToday, onEdit, onToggle }) {
  const { data } = useData();
  const { limit } = st;
  const title = limitTitle(data, limit);
  const sub = [windowLabel(limit), modeLabel(limit)];
  if (limit.target === 'total' && limit.name) sub.unshift('Semua pengeluaran');
  const multiDay = st.window && st.daysTotal > 1;

  return (
    <article className={`limit card level-${st.level} ${limit.active ? '' : 'is-off'}`}>
      <div className="limit__top">
        <span className="budget-row__emoji" aria-hidden="true">
          {targetEmoji(data, limit)}
        </span>
        <button type="button" className="limit__name" onClick={onEdit}>
          <span className="limit__title">{title}</span>
          <span className="limit__sub">{sub.join(' · ')}</span>
        </button>
        {LEVEL_BADGE[st.level] && <span className={`badge badge--${st.level === 'off' ? 'muted' : st.level}`}>{LEVEL_BADGE[st.level]}</span>}
        <button type="button" role="switch" aria-checked={limit.active} aria-label={`Batasan ${title} aktif`} className="mini-switch" onClick={onToggle}>
          <span className="mini-switch__thumb" />
        </button>
      </div>

      {st.window ? (
        <button type="button" className="limit__body" onClick={onEdit} aria-label={`Ubah batasan ${title}`}>
          <div className="limit__bar" style={{ '--warn-at': `${st.warnAt * 100}%` }}>
            <ProgressBar ratio={st.ratio} level={st.level === 'off' ? 'ok' : st.level} label={`Batasan ${title} terpakai`} />
            <span className="limit__marker" aria-hidden="true" />
          </div>
          <span className="limit__nums">
            <span className="num">
              <strong>{formatRupiah(st.spent)}</strong> / {formatRupiah(st.amount)}
            </span>
            <span className="limit__range">{multiDay ? rangeLabel(st.window.start, st.window.end) : formatDateShort(st.window.start)}</span>
          </span>
          {st.carriedIn > 0 && <span className="carry-badge is-in">+{formatRupiah(st.carriedIn)} sisa rentang sebelumnya</span>}
          {isToday && st.state === 'active' && limit.active && (
            <span className="limit__today">
              {multiDay ? (
                <>
                  Sisa hari ini <strong className="num">{formatRupiah(Math.max(0, st.todayLeft))}</strong> · aman dipakai{' '}
                  <strong className="num">{formatRupiah(st.safeToday)}</strong>
                </>
              ) : (
                <>
                  Sisa batas hari ini <strong className="num">{formatRupiah(Math.max(0, st.left))}</strong>
                </>
              )}
            </span>
          )}
          <span className="limit__msg">{limitMessage(st)}</span>
        </button>
      ) : (
        <p className="limit__msg limit__msg--idle">{limitMessage(st)}</p>
      )}
    </article>
  );
}
