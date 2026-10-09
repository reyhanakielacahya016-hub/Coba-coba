// Urusan PWA di sisi aplikasi: daftar service worker, tawarkan pembaruan,
// dan simpan event "beforeinstallprompt" untuk tombol "Pasang aplikasi".
// Event dipasang sedini mungkin (saat modul dimuat), sebelum React tampil.

import { useSyncExternalStore } from 'react';

const state = {
  installEvent: null, // event beforeinstallprompt yang ditunda
  installed: false,
  updateReady: false,
};
const listeners = new Set();
let snapshot = { ...state };

function set(patch) {
  Object.assign(state, patch);
  snapshot = { ...state };
  listeners.forEach((l) => l());
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

export const isIOS = () =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !/crios|fxios|edgios/i.test(navigator.userAgent);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // tahan pop-up bawaan browser; kita tampilkan tombol sendiri yang lebih ramah
    e.preventDefault();
    set({ installEvent: e });
  });
  window.addEventListener('appinstalled', () => set({ installEvent: null, installed: true }));
}

let waitingWorker = null;
let updateRequested = false;

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(`${base}sw.js`, { scope: base });

      const onWaiting = (worker) => {
        // hanya tawarkan pembaruan kalau sudah ada versi lama yang berjalan
        if (worker && navigator.serviceWorker.controller) {
          waitingWorker = worker;
          set({ updateReady: true });
        }
      };

      if (reg.waiting) onWaiting(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed') onWaiting(nw);
        });
      });

      // cek versi baru saat aplikasi dibuka lagi
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    } catch (err) {
      console.warn('Service worker gagal didaftarkan', err);
    }
  });

  // setelah versi baru aktif (karena pengguna menekan "Muat ulang"), muat ulang sekali.
  // Saat kunjungan pertama service worker juga mengambil alih halaman; itu TIDAK perlu reload.
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested || reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

export function applyUpdate() {
  updateRequested = true;
  if (waitingWorker) waitingWorker.postMessage('SKIP_WAITING');
  else window.location.reload();
}

export async function promptInstall() {
  const e = state.installEvent;
  if (!e) return 'unavailable';
  e.prompt();
  const { outcome } = await e.userChoice;
  set({ installEvent: null, installed: outcome === 'accepted' });
  return outcome;
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Hook React: { canInstall, installed, updateReady, standalone, ios } */
export function usePwa() {
  const s = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  const standalone = isStandalone();
  return {
    canInstall: Boolean(s.installEvent) && !standalone,
    installed: s.installed || standalone,
    updateReady: s.updateReady,
    standalone,
    ios: isIOS(),
  };
}
