import { PageHeader, SettingsLink } from '../../components/layout/AppShell.jsx';
import { Segmented } from '../../components/ui/Form.jsx';
import { BudgetList } from './budget/BudgetList.jsx';
import { GoalList } from './goals/GoalList.jsx';
import './Plan.css';

/** Halaman Rencana: tab Anggaran dan Tabungan. Tab tersimpan di URL (#/rencana/tabungan). */
export function PlanPage({ route }) {
  const tab = route.split('/')[1] === 'tabungan' ? 'tabungan' : 'anggaran';
  return (
    <div className="plan">
      <PageHeader title="Rencana" actions={<SettingsLink />} />
      <Segmented
        label="Bagian rencana"
        value={tab}
        onChange={(v) => {
          window.location.hash = v === 'tabungan' ? '/rencana/tabungan' : '/rencana';
        }}
        options={[
          { value: 'anggaran', label: 'Anggaran' },
          { value: 'tabungan', label: 'Tabungan' },
        ]}
      />
      <div className="plan__body" key={tab}>
        {tab === 'anggaran' ? <BudgetList /> : <GoalList />}
      </div>
    </div>
  );
}
