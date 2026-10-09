import { useEffect, useRef } from 'react';
import { AppShell } from './components/layout/AppShell.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useTheme } from './hooks/useTheme.js';
import { useData, useUi } from './state/AppProvider.jsx';
import { DashboardPage } from './features/dashboard/DashboardPage.jsx';
import { Onboarding } from './features/onboarding/Onboarding.jsx';
import { SettingsPage } from './features/settings/SettingsPage.jsx';
import { HistoryPage } from './features/transactions/HistoryPage.jsx';
import { PlanPage } from './features/plan/PlanPage.jsx';
import { StatsPage } from './features/stats/StatsPage.jsx';
import { QuickAddSheet } from './features/transactions/QuickAddSheet.jsx';
import { UpdateNotice } from './pwa/InstallPrompt.jsx';
import { PeriodFormSheet } from './features/periods/PeriodFormSheet.jsx';
import { ScopeSheet } from './features/periods/PeriodSwitcher.jsx';

const TITLES = { '': 'Beranda', riwayat: 'Riwayat', rencana: 'Rencana', statistik: 'Statistik', pengaturan: 'Pengaturan' };

const PAGES = {
  '': DashboardPage,
  riwayat: HistoryPage,
  rencana: PlanPage,
  statistik: StatsPage,
  pengaturan: SettingsPage,
};

export default function App() {
  const { data } = useData();
  const { openQuickAdd } = useUi();
  const [route, navigate] = useHashRoute();
  useTheme(data.settings.theme);

  const section = route.split('/')[0];
  const first = useRef(true);

  // judul tab + pindahkan fokus ke konten saat ganti halaman (membantu pembaca layar)
  useEffect(() => {
    document.title = `${TITLES[section] ?? 'Beranda'} · Saku`;
    if (first.current) {
      first.current = false;
      return;
    }
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [section]);

  // pintasan dari ikon aplikasi (#/catat): buka sheet catat lalu kembali ke beranda
  useEffect(() => {
    if (section === 'catat' && data.settings.onboarded) {
      navigate('');
      openQuickAdd();
    }
  }, [section, data.settings.onboarded, navigate, openQuickAdd]);

  if (!data.settings.onboarded) return <Onboarding />;

  const Page = PAGES[section] ?? DashboardPage;

  return (
    <>
      <AppShell route={route}>
        <div className="page" key={section}>
          <Page route={route} />
        </div>
      </AppShell>
      <QuickAddSheet />
      <ScopeSheet />
      <PeriodFormSheet />
      <UpdateNotice />
    </>
  );
}
