import { formatRupiah } from '../../lib/format.js';

/**
 * Proporsi pengeluaran per kategori sebagai bar horizontal berurutan.
 * Satu warna (aksen) untuk semua bar: yang dibandingkan adalah besarnya,
 * identitas kategori dibawa oleh label teks + emoji.
 */
export function CategoryBars({ rows }) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <>
      <ul className="cat-bars">
        {rows.map((r, i) => (
          <li key={r.category.id} className="cat-bar" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="cat-bar__line">
              <span className="cat-bar__name">
                <span aria-hidden="true">{r.category.emoji}</span> {r.category.name}
              </span>
              <span className="cat-bar__val num">
                {formatRupiah(r.amount)} <span className="cat-bar__pct">{Math.round(r.share * 100)}%</span>
              </span>
            </div>
            <div className="cat-bar__track" aria-hidden="true">
              <span className="cat-bar__fill" style={{ '--w': `${(r.amount / max) * 100}%`, animationDelay: `${i * 60}ms` }} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
