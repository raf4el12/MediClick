import { RoleGuard } from '@/components/shared/RoleGuard';
import PaymentsView from '@/views/payments';

export default function PaymentsPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'PAYMENTS' }]}>
      <PaymentsView />
    </RoleGuard>
  );
}
