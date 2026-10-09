import { AlertTriangle, ArrowDownLeft, CalendarClock, CalendarPlus, CheckCircle2, CircleDashed, Wallet } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { AnimatedRupiah } from '../../components/ui/AnimatedNumber.jsx';
import { formatRupiah } from '../../lib/format.js';

export const LEVEL = {
  ok: { label: 'Aman', icon: CheckCircle2 },
  warn: { label: 'Hampir batas', icon: AlertTriangle },
  over: { label: 'Lewat batas', icon: AlertTriangle },
  none: { label: 'Belum ada pemasukan', icon: CircleDashed },
};

/**
 * Kartu utama beranda. Saat periode berjalan: sisa uang, jatah harian, sisa hari,
 * dan perbandingan "waktu berjalan" vs "uang terpakai". Saat periode lain: ringkasan.
 */
export function PeriodHero({ range, totals, pace, insight, onAddIncome, onNewPeriod, hasPeriods }) {
  const negative = totals.remaining < 0;
  const word = range.kind === 'period' ? 'periode' : 'bulan';
  const used = totals.income ? Math.min(1, (totals.expense + totals.saved) / totals.income) : 0;
  const lvl = pace ? LEVEL[pace.level] : null;

  return (
    <section className={`hero card ${negative ? 'is-negative' : ''}`} aria-labelledby="hero-label">
      <div className="hero__top">
        <p id="hero-label" className="hero__label">
          <Wallet size={16} aria-hidden="true" /> Sisa uang {word} ini
        </p>
        {lvl && (
          <span className={`status status--${pace.level}`}>
            <lvl.icon size={14} aria-hidden="true" /> {lvl.label}
          </span>
        )}
        {!pace && range.status === 'done' && <span className="status status--muted">Sudah selesai</span>}
        {!pace && range.status === 'upcoming' && <span className="status status--muted">Belum mulai</span>}
      </div>

      <AnimatedRupiah value={totals.remaining} className="hero__amount" />

      {totals.income === 0 && totals.expense === 0 && range.status !== 'upcoming' ? (
        <div className="hero__start">
          <p className="hero__start-title">Mulai dari sini 👇</p>
          <ol className="hero__steps">
            <li>
              <span className="hero__step-n">1</span>
              <span>
                <strong>Catat pemasukan</strong> — kiriman, gaji, atau beasiswa.
              </span>
            </li>
            <li>
              <span className="hero__step-n">2</span>
              <span>
                <strong>Tentukan periodenya</strong> — sampai kapan uang itu harus cukup.
              </span>
            </li>
            <li>
              <span className="hero__step-n">3</span>
              <span>
                <strong>Lihat jatah harianmu</strong> — Saku menghitungnya otomatis.
              </span>
            </li>
          </ol>
          <div className="hero__start-actions">
            <Button onClick={onAddIncome}>
              <ArrowDownLeft size={18} /> Catat pemasukan
            </Button>
            {!hasPeriods && (
              <Button variant="ghost" onClick={onNewPeriod}>
                <CalendarPlus size={18} /> Buat periode saja
              </Button>
            )}
          </div>
        </div>
      ) : pace ? (
        <div className="hero__stats">
          <div className="hero__stat hero__stat--main">
            <span className="hero__stat-label">Jatah harian</span>
            <AnimatedRupiah value={pace.allowance} className="hero__stat-value" />
            <span className="hero__stat-sub">sisa uang ÷ sisa hari</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-label">Sisa hari</span>
            <span className="hero__stat-value num">
              {pace.daysLeft}
              <small> hari</small>
            </span>
            <span className="hero__stat-sub">
              <CalendarClock size={12} aria-hidden="true" /> hari ke-{pace.daysElapsed} dari {pace.daysTotal}
            </span>
          </div>
        </div>
      ) : (
        <div className="hero__stats">
          <div className="hero__stat">
            <span className="hero__stat-label">Rata-rata per hari</span>
            <span className="hero__stat-value num">{formatRupiah(Math.round(totals.expense / range.days))}</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-label">Lama {word}</span>
            <span className="hero__stat-value num">
              {range.days}
              <small> hari</small>
            </span>
          </div>
        </div>
      )}

      {totals.income > 0 && (
        <div className="hero__pace" aria-label="Perbandingan waktu dan uang">
          {pace && (
            <div className="pace-row">
              <span className="pace-row__label">Waktu berjalan</span>
              <div className="pace-row__bar">
                <span className="pace-row__fill pace-row__fill--time" style={{ width: `${pace.timeRatio * 100}%` }} />
              </div>
              <span className="pace-row__pct num">{Math.round(pace.timeRatio * 100)}%</span>
            </div>
          )}
          <div className="pace-row">
            <span className="pace-row__label">Uang terpakai</span>
            <div className="pace-row__bar">
              <span
                className={`pace-row__fill pace-row__fill--money ${pace && used > pace.timeRatio + 0.1 ? 'is-ahead' : ''}`}
                style={{ width: `${used * 100}%` }}
              />
            </div>
            <span className="pace-row__pct num">{Math.round(used * 100)}%</span>
          </div>
        </div>
      )}

      {!(totals.income === 0 && totals.expense === 0) && <p className={`hero__insight tone-${insight.tone}`}>{insight.text}</p>}
    </section>
  );
}
