import './Button.css';

/**
 * Tombol serbaguna.
 * variant: "primary" (aksen) | "soft" | "ghost" | "danger"
 * size: "md" | "lg" | "sm"
 */
export function Button({ variant = 'primary', size = 'md', block = false, className = '', children, ...props }) {
  const cls = ['btn', `btn--${variant}`, `btn--${size}`, block ? 'btn--block' : '', className].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}

export function IconButton({ label, className = '', children, ...props }) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
