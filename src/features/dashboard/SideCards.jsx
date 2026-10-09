import { ArrowRight, CalendarPlus, Lightbulb } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Illustration } from '../../components/ui/Illustration.jsx';
import { ProgressBar } from '../../components/ui/ProgressBar.jsx';
import { diffDays, todayISO } from '../../lib/dates.js';
import { formatRupiah } from '../../lib/format.js';
import { useData, useUi } from '../../state/AppProvider.jsx';
import { goalProgress } from '../../state/selectors.js';

/** Target tabungan terdekat. */
export function GoalsPreview() {
  const { data } = useData();
  const goals = useMemo(
    () =>
      data.goals
        .map((g) => ({ g, p: goalProgress(data, g) }))
        .filter((x) => !x.p.done)
        .sort((a, b) => (a.g.deadline || '9999').localeCompare(b.g.deadline || '9999'))
        .slice(0, 2),
    [data],
  );

  return (
    <section className="card section" aria-labelledby="gp-title">
      <div className="section__head">
        <h2 id="gp-title" className="section__title">
          Tabungan
        </h2>
        <a className="link-btn" href="#/rencana/tabungan">
          {goals.length ? 'Lihat' : 'Buat target'}
        </a>
      </div>
      {goals.length === 0 ? (
        <div className="mini-empty">
          <Illustration name="piggy" size={72} />
          <p className="muted">Punya keinginan? Laptop, mudik, atau dana darurat. Jadikan target, sisihkan sedikit-sedikit.</p>
        </div>
      ) : (
        <ul className="gp">
          {goals.map(({ g, p }) => (
            <li key={g.id} className="gp__row">
              <span className="gp__emoji" aria-hidden="true">
                {g.emoji}
              </span>
              <div className="gp__main">
                <div className="gp__line">
                  <span className="gp__name">{g.name}</span>
                  <span className="gp__pct num">{Math.floor(p.ratio * 100)}%</span>
                </div>
                <ProgressBar ratio={p.ratio} size="sm" label={`Progres ${g.name}`} />
                <span className="gp__sub num">
                  <span>
                    {formatRupiah(p.saved)} / {formatRupiah(g.target)}
                  </span>
                  {p.perWeek ? <span>±{formatRupiah(p.perWeek)}/minggu</span> : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const TIPS = [
  { t: 'Masak nasi sendiri', d: 'Rice cooker kecil + lauk dari warung bisa hemat sampai separuh biaya makan.' },
  { t: 'Aturan 24 jam', d: 'Mau jajan atau beli barang yang tidak mendesak? Tunggu sehari. Sering kali keinginannya hilang.' },
  { t: 'Sisihkan di awal', d: 'Begitu kiriman masuk, langsung setor ke target tabungan. Yang tersisa baru dipakai.' },
  { t: 'Bawa botol minum', d: 'Es teh Rp 5.000 sehari = Rp 150.000 sebulan. Air putih dari kos gratis.' },
  { t: 'Cek jatah harian', d: 'Lihat angka jatah harian sebelum keluar kos. Jadi tahu batas aman hari ini.' },
  { t: 'Patungan ojol', d: 'Searah dengan teman? Bagi ongkos, lebih hemat dan tetap tepat waktu.' },
  { t: 'Catat yang kecil', d: 'Parkir, fotokopi, gorengan. Yang kecil-kecil ini sering jadi "bocor halus".' },
];

/** Satu tips hemat, berganti setiap hari. */
export function TipCard() {
  const today = todayISO();
  const tip = TIPS[Math.abs(diffDays('2026-01-01', today)) % TIPS.length];
  return (
    <section className="tip card" aria-label="Tips hari ini">
      <span className="tip__icon" aria-hidden="true">
        <Lightbulb size={18} />
      </span>
      <div>
        <p className="tip__eyebrow">Tips hari ini</p>
        <p className="tip__title">{tip.t}</p>
        <p className="tip__text">{tip.d}</p>
      </div>
    </section>
  );
}

/** Ajakan membuat periode, muncul saat belum ada periode yang berjalan. */
export function PeriodCta() {
  const { openPeriodForm } = useUi();
  return (
    <section className="cta card" aria-labelledby="cta-title">
      <Illustration name="calendar" size={92} />
      <div className="cta__text">
        <h2 id="cta-title" className="section__title">
          Atur periode pemasukanmu
        </h2>
        <p className="muted">
          Kiriman datang tanggal 25? Buat periode 25 sampai 24 bulan depan. Saku akan menghitung sisa uang & jatah harian sampai kiriman berikutnya.
        </p>
        <Button size="sm" onClick={() => openPeriodForm()}>
          <CalendarPlus size={16} /> Buat periode <ArrowRight size={16} />
        </Button>
      </div>
    </section>
  );
}

/** Info periode yang berakhir dalam beberapa hari. */
export function useEndingSoon(range) {
  const today = todayISO();
  if (range.kind !== 'period' || range.status !== 'active') return null;
  const left = diffDays(today, range.end);
  return left <= 3 ? left : null;
}
