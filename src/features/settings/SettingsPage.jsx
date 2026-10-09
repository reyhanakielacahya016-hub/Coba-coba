import { Monitor, Moon, Sun, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useConfirm } from '../../hooks/useConfirm.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { useData } from '../../state/AppProvider.jsx';
import { emptyData } from '../../state/storage.js';
import { formatDateShort } from '../../lib/format.js';
import { CategoryManager } from './CategoryManager.jsx';
import { DataExportImport } from './DataExportImport.jsx';
import { RecurringManager } from './RecurringManager.jsx';
import { InstallPrompt } from '../../pwa/InstallPrompt.jsx';
import './Settings.css';

const THEMES = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Ikuti sistem', icon: Monitor },
];

export function SettingsPage() {
  const { data, dispatch } = useData();
  const confirm = useConfirm();
  const toast = useToast();

  const resetAll = async () => {
    const ok = await confirm({
      title: 'Hapus semua data?',
      message: 'Semua transaksi, kategori, anggaran, dan tabungan akan dihapus dari perangkat ini. Sebaiknya ekspor cadangan dulu.',
      confirmLabel: 'Ya, hapus semua',
      danger: true,
    });
    if (!ok) return;
    const before = data;
    dispatch({ type: 'REPLACE_ALL', data: emptyData() });
    toast({
      message: 'Semua data dihapus.',
      action: { label: 'Urungkan', onClick: () => dispatch({ type: 'REPLACE_ALL', data: before }) },
      duration: 8000,
    });
  };

  return (
    <div className="settings">
      <PageHeader title="Pengaturan" back />

      <section className="card data-summary" aria-label="Ringkasan data">
        {[
          ['Transaksi', data.transactions.length],
          ['Kategori', data.categories.length],
          ['Periode', data.periods.length],
          ['Target', data.goals.length],
        ].map(([label, n]) => (
          <div key={label} className="data-summary__item">
            <span className="data-summary__n num">{n}</span>
            <span className="data-summary__label">{label}</span>
          </div>
        ))}
        <p className="data-summary__note">
          {data.transactions.length
            ? `Mencatat sejak ${formatDateShort(data.transactions.reduce((m, t) => (t.date < m ? t.date : m), data.transactions[0].date))}. Semua tersimpan di perangkat ini.`
            : 'Semua data tersimpan di perangkat ini saja, tanpa akun.'}
        </p>
      </section>

      <section className="card section" aria-labelledby="theme-title">
        <h2 id="theme-title" className="section__title">
          Tampilan
        </h2>
        <div className="theme-opts" role="radiogroup" aria-label="Tema">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={data.settings.theme === value}
              className={`theme-opt ${data.settings.theme === value ? 'is-active' : ''}`}
              onClick={() => dispatch({ type: 'SET_SETTINGS', patch: { theme: value } })}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card section" aria-labelledby="install-title">
        <h2 id="install-title" className="section__title">
          Aplikasi
        </h2>
        <InstallPrompt variant="row" />
      </section>

      <CategoryManager />

      <RecurringManager />

      <DataExportImport />

      <section className="card section" aria-labelledby="danger-title">
        <h2 id="danger-title" className="section__title">
          Mulai ulang
        </h2>
        <p className="muted">Menghapus semua data dan kembali ke layar sambutan.</p>
        <div>
          <Button variant="danger" onClick={resetAll}>
            <Trash2 size={18} /> Hapus semua data
          </Button>
        </div>
      </section>

      <p className="settings-foot">Saku v1.0 · Dibuat dengan 💚 untuk anak kos · Tanpa akun, tanpa server</p>
    </div>
  );
}
