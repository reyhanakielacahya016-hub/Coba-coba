import { BarChart3, Home, ListOrdered, Plus, Settings, Target } from 'lucide-react';
import { useEffect } from 'react';
import { useUi } from '../../state/AppProvider.jsx';
import { Logo } from './Logo.jsx';
import './AppShell.css';

export const NAV = [
  { path: '', label: 'Beranda', icon: Home },
  { path: 'riwayat', label: 'Riwayat', icon: ListOrdered },
  { path: 'rencana', label: 'Rencana', icon: Target },
  { path: 'statistik', label: 'Statistik', icon: BarChart3 },
];

const isTyping = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

export function AppShell({ route, children }) {
  const { openQuickAdd, quickAdd } = useUi();
  const section = route.split('/')[0];

  // pintasan keyboard: tekan "N" untuk catat transaksi baru
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(document.activeElement) || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      openQuickAdd();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openQuickAdd]);

  const link = (item) => {
    const Icon = item.icon;
    const active = section === item.path;
    return (
      <a key={item.path} href={`#/${item.path}`} className={`nav-link ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
        <span className="nav-link__icon">
          <Icon size={22} strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className="nav-link__label">{item.label}</span>
      </a>
    );
  };

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Lompat ke konten
      </a>

      <aside className="sidebar" aria-label="Navigasi utama">
        <a href="#/" className="sidebar__brand" aria-label="Saku, ke beranda">
          <Logo size={36} />
        </a>
        <button type="button" className="sidebar__add" onClick={() => openQuickAdd()} aria-expanded={Boolean(quickAdd)}>
          <Plus size={20} strokeWidth={2.6} />
          Catat transaksi
          <kbd>N</kbd>
        </button>
        <nav className="sidebar__nav">
          {NAV.map(link)}
          <span className="sidebar__sep" />
          {link({ path: 'pengaturan', label: 'Pengaturan', icon: Settings })}
        </nav>
      </aside>

      <main id="main" className="main" tabIndex={-1}>
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Navigasi utama">
        {NAV.slice(0, 2).map(link)}
        <div className="bottom-nav__fab-slot">
          <button
            type="button"
            className="fab"
            onClick={() => openQuickAdd()}
            aria-label="Catat transaksi"
            aria-expanded={Boolean(quickAdd)}
          >
            <Plus size={28} strokeWidth={2.6} />
          </button>
        </div>
        {NAV.slice(2).map(link)}
      </nav>
    </div>
  );
}

/** Kepala halaman: judul besar + aksi di kanan. */
export function PageHeader({ eyebrow, title, actions }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        {eyebrow && <p className="page-head__eyebrow">{eyebrow}</p>}
        <h1 className="page-head__title">{title}</h1>
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  );
}

/** Tombol gear menuju Pengaturan (hanya terlihat di HP; desktop punya sidebar). */
export function SettingsLink() {
  return (
    <a href="#/pengaturan" className="icon-btn settings-link" aria-label="Pengaturan" title="Pengaturan">
      <Settings size={21} />
    </a>
  );
}
