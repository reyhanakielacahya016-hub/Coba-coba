import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { todayISO } from '../lib/dates.js';
import { reducer } from './reducer.js';
import { resolveRange } from './scope.js';
import { loadData, saveData } from './storage.js';

const DataContext = createContext(null);
const UiContext = createContext(null);

/**
 * Menyimpan seluruh data aplikasi + state tampilan bersama (periode/bulan yang
 * dilihat, sheet catat cepat, form periode). Data otomatis tersimpan ke localStorage.
 */
export function AppProvider({ children }) {
  const [data, dispatch] = useReducer(reducer, null, () => reducer(loadData(), { type: 'RUN_RECURRING', today: todayISO() }));

  // simpan dengan jeda singkat supaya tidak menulis berkali-kali saat mengetik
  const timer = useRef();
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveData(data), 250);
    return () => clearTimeout(timer.current);
  }, [data]);

  // simpan segera saat tab ditutup / disembunyikan, dan cek jadwal rutin saat kembali
  const latest = useRef(data);
  latest.current = data;
  useEffect(() => {
    const onHide = () => saveData(latest.current);
    const onVisible = () => {
      if (document.visibilityState === 'visible') dispatch({ type: 'RUN_RECURRING', today: todayISO() });
      else onHide();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // scope = periode/bulan yang sedang dilihat. null = otomatis (periode berjalan, atau bulan ini)
  const [scope, setScope] = useState(null);
  const today = todayISO();
  const range = useMemo(() => resolveRange(data, scope, today), [data, scope, today]);
  const [quickAdd, setQuickAdd] = useState(null); // null = tertutup, objek = terbuka (bisa berisi transaksi untuk diedit)

  const openQuickAdd = useCallback((preset = {}) => setQuickAdd({ ...preset }), []);
  const closeQuickAdd = useCallback(() => setQuickAdd(null), []);

  // form periode & lembar "Ganti periode" bisa dibuka dari halaman mana pun
  const [periodForm, setPeriodForm] = useState(null); // null | { period } | { preset }
  const [scopeSheet, setScopeSheet] = useState(false);
  const openPeriodForm = useCallback((arg = {}) => setPeriodForm({ ...arg }), []);
  const closePeriodForm = useCallback(() => setPeriodForm(null), []);
  const openScopeSheet = useCallback(() => setScopeSheet(true), []);
  const closeScopeSheet = useCallback(() => setScopeSheet(false), []);

  const dataValue = useMemo(() => ({ data, dispatch }), [data]);
  const uiValue = useMemo(
    () => ({
      scope,
      setScope,
      range,
      quickAdd,
      openQuickAdd,
      closeQuickAdd,
      periodForm,
      openPeriodForm,
      closePeriodForm,
      scopeSheet,
      openScopeSheet,
      closeScopeSheet,
    }),
    [scope, range, quickAdd, openQuickAdd, closeQuickAdd, periodForm, openPeriodForm, closePeriodForm, scopeSheet, openScopeSheet, closeScopeSheet],
  );

  return (
    <DataContext.Provider value={dataValue}>
      <UiContext.Provider value={uiValue}>{children}</UiContext.Provider>
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

export function useUi() {
  return useContext(UiContext);
}
