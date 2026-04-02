import { RoleGuard } from '@/components/shared/RoleGuard';
import PatientBookView from '@/views/patient/book';

export default function PatientBookPage() {
  return (
    <RoleGuard permissions={[{ action: 'CREATE', subject: 'APPOINTMENTS' }]}>
      <PatientBookView />
    </RoleGuard>
  );
}
