import { RoleGuard } from '@/components/shared/RoleGuard';
import ClinicsView from '@/views/clinics';

export default function ClinicsPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'CLINICS' }]}>
      <ClinicsView />
    </RoleGuard>
  );
}
