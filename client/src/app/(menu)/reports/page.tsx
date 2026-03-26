import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import ReportsView from '@/views/reports';

export default function ReportsPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN]}>
      <ReportsView />
    </RoleGuard>
  );
}
