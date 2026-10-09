import { AppShell } from './components/layout/AppShell.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useTheme } from './hooks/useTheme.js';
import { useData } from './state/AppProvider.jsx';
import { DashboardPage } from './features/dashboard/DashboardPage.jsx';
import { Onboarding } from './features/onboarding/Onboarding.jsx';
import { SettingsPage } from './features/settings/SettingsPage.jsx';
import { EmptyState } from './components/ui/EmptyState.jsx';
import { HistoryPage } from './features/transactions/HistoryPage.jsx';
import { PlanPage } from './features/plan/PlanPage.jsx';
import { StatsPage } from './features/stats/StatsPage.jsx';
import { QuickAddSheet } from './features/transactions/QuickAddSheet.jsx';

function ComingSoon() {
  return <EmptyState emoji="🛠️" title="Sedang disiapkan">Halaman ini akan hadir di tahap berikutnya.</EmptyState>;
}

const PAGES = {
  '': DashboardPage,
  riwayat: HistoryPage,
  rencana: PlanPage,
  statistik: StatsPage,
  pengaturan: SettingsPage,
};

export default function App() {
  const { data } = useData();
  const [route] = useHashRoute();
  useTheme(data.settings.theme);

  if (!data.settings.onboarded) return <Onboarding />;

  const section = route.split('/')[0];
  const Page = PAGES[section] ?? DashboardPage;

  return (
    <>
      <AppShell route={route}>
        <Page key={section} route={route} />
      </AppShell>
      <QuickAddSheet />
    </>
  );
}
