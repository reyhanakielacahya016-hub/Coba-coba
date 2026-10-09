import { PageHeader, SettingsLink } from '../../components/layout/AppShell.jsx';
import { Segmented } from '../../components/ui/Form.jsx';
import { PeriodsTab } from '../periods/PeriodsTab.jsx';
import { LimitList } from './limits/LimitList.jsx';
import { GoalList } from './goals/GoalList.jsx';
import './Plan.css';

const TABS = [
  { value: 'batasan', label: 'Batasan', path: '/rencana' },
  { value: 'tabungan', label: 'Tabungan', path: '/rencana/tabungan' },
  { value: 'periode', label: 'Periode', path: '/rencana/periode' },
];

/** Halaman Rencana: tab Batasan, Tabungan, dan Periode. Tab tersimpan di URL (#/rencana/periode). */
export function PlanPage({ route }) {
  const sub = route.split('/')[1];
  const tab = TABS.some((t) => t.value === sub) ? sub : 'batasan';
  return (
    <div className="plan">
      <PageHeader title="Rencana" actions={<SettingsLink />} />
      <Segmented
        label="Bagian rencana"
        value={tab}
        onChange={(v) => {
          window.location.hash = TABS.find((t) => t.value === v).path;
        }}
        options={TABS}
      />
      <div className="plan__body" key={tab}>
        {tab === 'batasan' && <LimitList />}
        {tab === 'tabungan' && <GoalList />}
        {tab === 'periode' && <PeriodsTab />}
      </div>
    </div>
  );
}
