import { useEffect, useState } from 'react';

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Terapkan tema (light/dark/system) ke <html data-theme>. */
export function useTheme(setting) {
  const [systemDark, setSystemDark] = useState(() => media().matches);

  useEffect(() => {
    const m = media();
    const onChange = (e) => setSystemDark(e.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  const resolved = setting === 'system' ? (systemDark ? 'dark' : 'light') : setting;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#111513' : '#f7f3ec');
  }, [resolved]);

  return resolved;
}
