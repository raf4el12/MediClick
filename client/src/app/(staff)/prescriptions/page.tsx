import { RoleGuard } from '@/components/shared/RoleGuard';
import PrescriptionsView from '@/views/prescriptions';

export default function PrescriptionsPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'PRESCRIPTIONS' }]}>
      <PrescriptionsView />
    </RoleGuard>
  );
}
