import { useAnimatedNumber } from '../../hooks/useAnimatedNumber.js';
import { formatRupiah } from '../../lib/format.js';

/** Rupiah yang beranimasi saat nilainya berubah. Pembaca layar langsung mendapat nilai akhir. */
export function AnimatedRupiah({ value, className = '', sign = false }) {
  const shown = useAnimatedNumber(value);
  return (
    <span className={`num ${className}`}>
      <span aria-hidden="true">{formatRupiah(shown, { sign })}</span>
      <span className="sr-only">{formatRupiah(value, { sign })}</span>
    </span>
  );
}
