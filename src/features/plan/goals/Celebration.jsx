import { useEffect, useMemo, useRef } from 'react';
import { Button } from '../../../components/ui/Button.jsx';
import { formatRupiah } from '../../../lib/format.js';

const MESSAGES = [
  'Kamu hebat! Sedikit demi sedikit, akhirnya sampai juga.',
  'Konsisten itu keren, dan kamu membuktikannya.',
  'Satu mimpi tercapai. Rayakan sebentar, kamu pantas!',
];

/** Perayaan singkat saat target tabungan tercapai. */
export function Celebration({ goal, onClose }) {
  const btnRef = useRef(null);
  const message = useMemo(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)], []);
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.8 + Math.random() * 1.4,
        rot: Math.random() * 360,
        kind: i % 4,
      })),
    [],
  );

  useEffect(() => {
    // tunggu sheet setoran selesai menutup sebelum memindah fokus
    const t = setTimeout(() => btnRef.current?.focus(), 260);
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="celebrate" role="dialog" aria-modal="true" aria-labelledby="celebrate-title" onClick={onClose}>
      <div className="celebrate__confetti" aria-hidden="true">
        {pieces.map((p, i) => (
          <span
            key={i}
            className={`confetti confetti--${p.kind}`}
            style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, '--rot': `${p.rot}deg` }}
          />
        ))}
      </div>
      <div className="celebrate__card" onClick={(e) => e.stopPropagation()}>
        <div className="celebrate__emoji" aria-hidden="true">
          {goal.emoji}
        </div>
        <p className="celebrate__eyebrow">Target tercapai!</p>
        <h2 id="celebrate-title" className="celebrate__title">
          {goal.name}
        </h2>
        <p className="celebrate__amount num">{formatRupiah(goal.target)}</p>
        <p className="celebrate__msg">{message}</p>
        <Button ref={btnRef} size="lg" block onClick={onClose}>
          Yeay, terima kasih!
        </Button>
      </div>
    </div>
  );
}
