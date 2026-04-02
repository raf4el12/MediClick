import { RoleGuard } from '@/components/shared/RoleGuard';
import ReportsView from '@/views/reports';

export default function ReportsPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'REPORTS' }]}>
      <ReportsView />
    </RoleGuard>
  );
}
