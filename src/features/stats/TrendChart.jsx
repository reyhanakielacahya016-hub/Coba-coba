import { useId, useMemo, useRef, useState } from 'react';
import { formatRupiah, formatShort } from '../../lib/format.js';

const H = 180; // tinggi area plot
const PAD_TOP = 12;
const AXIS_W = 40;

function niceMax(v) {
  if (v <= 0) return 10000;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/**
 * Grafik kolom pengeluaran (harian / mingguan).
 * Arahkan kursor, sentuh, atau pakai tombol panah untuk melihat detail tiap kolom.
 */
export function TrendChart({ points, mode, todayIndex, average }) {
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const wrapRef = useRef(null);
  const tableId = useId();

  const max = useMemo(() => niceMax(Math.max(...points.map((p) => p.amount), average || 0)), [points, average]);
  const n = points.length;
  const slot = 100 / n; // persen lebar per kolom
  const barW = mode === 'daily' ? 0.62 : 0.5;
  const y = (v) => PAD_TOP + H - (v / max) * H;
  const ticks = [0, max / 2, max];

  const label = (p) => p.long ?? p.label;
  const showLabel = (i) => {
    if (mode === 'weekly' || i === todayIndex) return true;
    if (todayIndex >= 0 && Math.abs(i - todayIndex) <= 2) return false; // beri ruang untuk label "Hari ini"
    const step = n > 40 ? 10 : 5;
    return i === 0 || (i + 1) % step === 0;
  };

  const pickFromPointer = (clientX) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const x = clientX - rect.left - AXIS_W;
    const w = rect.width - AXIS_W;
    const i = Math.floor((x / w) * n);
    setActive(i >= 0 && i < n ? i : null);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const start = active ?? (todayIndex >= 0 ? todayIndex : n - 1);
      const next = active === null ? start : start + (e.key === 'ArrowRight' ? 1 : -1);
      setActive(Math.max(0, Math.min(n - 1, next)));
    }
    if (e.key === 'Escape') setActive(null);
  };

  const a = active !== null ? points[active] : null;
  const tipLeft = active !== null ? `calc(${AXIS_W}px + (100% - ${AXIS_W}px) * ${(active + 0.5) / n})` : 0;

  return (
    <div className="trend">
      <div
        ref={wrapRef}
        className="trend__plot"
        tabIndex={0}
        role="img"
        aria-label={`Grafik pengeluaran ${mode === 'daily' ? 'harian' : 'mingguan'}. Gunakan panah kiri dan kanan untuk melihat detail.`}
        onPointerMove={(e) => pickFromPointer(e.clientX)}
        onPointerDown={(e) => pickFromPointer(e.clientX)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {/* sumbu Y */}
        <div className="trend__axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ top: y(t) }}>
              {formatShort(t)}
            </span>
          ))}
        </div>
        <svg className="trend__svg" viewBox={`0 0 100 ${H + PAD_TOP + 24}`} preserveAspectRatio="none" aria-hidden="true">
          {ticks.map((t) => (
            <line key={t} x1="0" x2="100" y1={y(t)} y2={y(t)} className={t === 0 ? 'trend__base' : 'trend__grid'} vectorEffect="non-scaling-stroke" />
          ))}
          {points.map((p, i) => {
            const h = Math.max(0, (p.amount / max) * H);
            const x = i * slot + (slot * (1 - barW)) / 2;
            const w = slot * barW;
            return (
              <g key={p.key}>
                {active === i && <rect x={i * slot} y={PAD_TOP} width={slot} height={H} className="trend__hover" />}
                {h > 0 && (
                  <path
                    className={`trend__bar ${i === todayIndex ? 'is-today' : ''} ${active !== null && active !== i ? 'is-dim' : ''}`}
                    d={roundedTop(x, y(p.amount), w, h)}
                    style={{ animationDelay: `${i * 12}ms` }}
                  />
                )}
              </g>
            );
          })}
          {average > 0 && (
            <line x1="0" x2="100" y1={y(average)} y2={y(average)} className="trend__avg" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {average > 0 && (
          <span className="trend__avg-label" style={{ top: y(average) }} aria-hidden="true">
            rata-rata
          </span>
        )}
        {/* label sumbu X */}
        <div className="trend__xlabels" aria-hidden="true">
          {points.map((p, i) => (
            <span key={p.key} style={{ left: `${(i + 0.5) * slot}%` }} className={i === todayIndex ? 'is-today' : ''}>
              {showLabel(i) ? (i === todayIndex && mode === 'daily' ? 'Hari ini' : p.label) : ''}
            </span>
          ))}
        </div>

        {a && (
          <div className="trend__tip" style={{ left: tipLeft }} role="status">
            <span className="trend__tip-label">{label(a)}</span>
            <strong className="num">{formatRupiah(a.amount)}</strong>
          </div>
        )}
      </div>

      <button type="button" className="link-btn trend__table-btn" aria-expanded={showTable} aria-controls={tableId} onClick={() => setShowTable((s) => !s)}>
        {showTable ? 'Sembunyikan tabel' : 'Lihat sebagai tabel'}
      </button>
      {showTable && (
        <table id={tableId} className="trend__table">
          <thead>
            <tr>
              <th scope="col">{mode === 'daily' ? 'Tanggal' : 'Minggu (tanggal)'}</th>
              <th scope="col">Pengeluaran</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key}>
                <td>{p.label}</td>
                <td className="num">{formatRupiah(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Kolom dengan sudut atas membulat dan dasar rata menempel di garis nol. */
function roundedTop(x, top, w, h) {
  // viewBox tidak proporsional (lebar 100 unit, tinggi dalam px), jadi radius x & y dihitung terpisah (~4px)
  const rx = Math.min(w / 2, 1.3);
  const ry = Math.min(4, h);
  const bottom = top + h;
  return `M${x},${bottom} L${x},${top + ry} Q${x},${top} ${x + rx},${top} L${x + w - rx},${top} Q${x + w},${top} ${x + w},${top + ry} L${x + w},${bottom} Z`;
}
