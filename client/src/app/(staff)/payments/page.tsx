import { RoleGuard } from '@/components/shared/RoleGuard';
import PaymentsView from '@/views/payments';

export default function PaymentsPage() {
  return (
    // El paciente nunca entra: `GET /payments` no se acota al paciente (SDD §9).
    <RoleGuard permissions={[{ action: 'READ', subject: 'PAYMENTS' }]} actors={['STAFF', 'DOCTOR']}>
      <PaymentsView />
    </RoleGuard>
  );
}
