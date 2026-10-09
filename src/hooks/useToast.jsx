import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Toast } from '../components/ui/Toast.jsx';

const ToastContext = createContext(() => {});

/**
 * Notifikasi singkat di bawah layar, opsional dengan tombol aksi (mis. "Urungkan").
 * toast({ message, action: { label, onClick }, duration })
 */
export function ToastProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const timer = useRef();

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setCurrent((c) => (c ? { ...c, leaving: true } : c));
    setTimeout(() => setCurrent((c) => (c?.leaving ? null : c)), 200);
  }, []);

  const toast = useCallback(
    (opts) => {
      clearTimeout(timer.current);
      const t = typeof opts === 'string' ? { message: opts } : opts;
      setCurrent({ ...t, key: Date.now(), leaving: false });
      timer.current = setTimeout(dismiss, t.duration ?? (t.action ? 5500 : 3000));
    },
    [dismiss],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-region" aria-live="polite" role="status">
        {current && <Toast {...current} onDismiss={dismiss} />}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
