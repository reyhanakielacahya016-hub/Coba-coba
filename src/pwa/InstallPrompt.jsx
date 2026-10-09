import { Download, RefreshCw, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, IconButton } from '../components/ui/Button.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { applyUpdate, promptInstall, usePwa } from './pwa.js';
import './InstallPrompt.css';

const DISMISS_KEY = 'saku:install-dismissed';

/**
 * Kartu "Pasang aplikasi". Hanya muncul kalau browser mendukung instalasi
 * (Chrome/Edge/Android), atau berupa petunjuk singkat di iPhone/iPad.
 * variant "card" untuk beranda (bisa ditutup), "row" untuk Pengaturan.
 */
export function InstallPrompt({ variant = 'card' }) {
  const { canInstall, installed, ios, standalone } = usePwa();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (installed || standalone) {
    return variant === 'row' ? <p className="install__done">✅ Saku sudah terpasang di perangkat ini.</p> : null;
  }
  if (variant === 'card' && dismissed) return null;

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') toast({ message: 'Saku terpasang! Cari ikonnya di layar utama.', icon: '🎉' });
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* abaikan */
    }
  };

  if (canInstall) {
    return (
      <section className={`install install--${variant}`} aria-label="Pasang aplikasi">
        <span className="install__icon" aria-hidden="true">
          <Download size={20} />
        </span>
        <div className="install__text">
          <p className="install__title">Pasang Saku di perangkatmu</p>
          <p className="install__sub">Buka langsung dari layar utama, tetap jalan walau sedang offline.</p>
        </div>
        <Button size="sm" onClick={install}>
          Pasang aplikasi
        </Button>
        {variant === 'card' && (
          <IconButton label="Tutup saran pasang aplikasi" onClick={dismiss} className="install__close">
            <X size={16} />
          </IconButton>
        )}
      </section>
    );
  }

  if (ios) {
    return (
      <section className={`install install--${variant}`} aria-label="Pasang aplikasi di iPhone">
        <span className="install__icon" aria-hidden="true">
          <Share size={20} />
        </span>
        <div className="install__text">
          <p className="install__title">Pasang Saku di iPhone</p>
          <p className="install__sub">
            Di Safari, ketuk tombol <strong>Bagikan</strong> lalu pilih <strong>Tambahkan ke Layar Utama</strong>.
          </p>
        </div>
        {variant === 'card' && (
          <IconButton label="Tutup petunjuk" onClick={dismiss} className="install__close">
            <X size={16} />
          </IconButton>
        )}
      </section>
    );
  }

  return variant === 'row' ? (
    <p className="install__done">
      Browser ini belum menawarkan pemasangan. Coba buka di Chrome atau Edge, lalu cari tombol pasang di bilah alamat.
    </p>
  ) : null;
}

/** Notifikasi saat versi baru Saku sudah siap. */
export function UpdateNotice() {
  const { updateReady } = usePwa();
  const toast = useToast();
  useEffect(() => {
    if (!updateReady) return;
    toast({
      message: 'Versi baru Saku sudah siap.',
      icon: <RefreshCw size={16} />,
      action: { label: 'Muat ulang', onClick: applyUpdate },
      duration: 60000,
    });
  }, [updateReady, toast]);
  return null;
}
