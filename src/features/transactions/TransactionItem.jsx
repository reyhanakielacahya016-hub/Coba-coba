import { Repeat } from 'lucide-react';
import { formatRupiah } from '../../lib/format.js';
import './TransactionItem.css';

export function TransactionItem({ tx, category, onClick, meta }) {
  const isIncome = tx.type === 'income';
  const title = tx.note || category?.name || 'Transaksi';
  return (
    <li>
      <button type="button" className="tx" onClick={onClick}>
        <span className="tx__avatar" aria-hidden="true">
          {category?.emoji ?? '📦'}
        </span>
        <span className="tx__text">
          <span className="tx__title">{title}</span>
          <span className="tx__meta">
            {category?.name}
            {meta && <> · {meta}</>}
            {tx.recurringId && (
              <span className="tx__rec" title="Transaksi rutin">
                <Repeat size={12} aria-hidden="true" />
                <span className="sr-only">, rutin</span>
              </span>
            )}
          </span>
        </span>
        <span className={`tx__amount num ${isIncome ? 'is-income' : ''}`}>
          {formatRupiah(isIncome ? tx.amount : -tx.amount, { sign: true })}
        </span>
      </button>
    </li>
  );
}
