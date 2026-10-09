import { RoleGuard } from '@/components/shared/RoleGuard';
import ExpedienteView from '@/views/patient/expediente';

export default function ExpedientePage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'PATIENTS' }]}>
      <ExpedienteView />
    </RoleGuard>
  );
}
