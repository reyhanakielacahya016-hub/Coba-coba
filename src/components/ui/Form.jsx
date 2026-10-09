import { forwardRef, useId } from 'react';
import { formatNumber, parseNominal } from '../../lib/format.js';
import './Form.css';

/** Kolom nominal besar dengan format otomatis "25.000". Nilai yang dikirim berupa angka. */
export const AmountInput = forwardRef(function AmountInput(
  { value, onChange, label = 'Nominal', tone = 'expense', onEnter, ...props },
  ref,
) {
  const id = useId();
  return (
    <div className={`amount amount--${tone}`}>
      <label htmlFor={id} className="amount__label">
        {label}
      </label>
      <div className="amount__row">
        <span className="amount__rp" aria-hidden="true">
          Rp
        </span>
        <input
          ref={ref}
          id={id}
          className="amount__input num"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={value ? formatNumber(value) : ''}
          onChange={(e) => onChange(parseNominal(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          {...props}
        />
      </div>
    </div>
  );
});

export function Field({ label, hint, children, id }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export const TextInput = forwardRef(function TextInput({ className = '', ...props }, ref) {
  return <input ref={ref} className={`input ${className}`} {...props} />;
});

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`input select ${className}`} {...props}>
      {children}
    </select>
  );
}

/** Chip pilihan (kategori, filter, nominal cepat). */
export function Chip({ selected, children, className = '', ...props }) {
  return (
    <button type="button" className={`chip ${selected ? 'is-selected' : ''} ${className}`} aria-pressed={selected} {...props}>
      {children}
    </button>
  );
}

/** Pilihan 2–3 opsi berdampingan, misal Pengeluaran | Pemasukan. */
export function Segmented({ value, onChange, options, label, size = 'md' }) {
  return (
    <div className={`segmented segmented--${size}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`segmented__opt ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, description }) {
  const id = useId();
  return (
    <label className="switch" htmlFor={id}>
      <span className="switch__text">
        <span className="switch__label">{label}</span>
        {description && <span className="switch__desc">{description}</span>}
      </span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
    </label>
  );
}
