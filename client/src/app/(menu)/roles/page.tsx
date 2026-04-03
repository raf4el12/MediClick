import { RoleGuard } from '@/components/shared/RoleGuard';
import RolesView from '@/views/roles';

export default function RolesPage() {
  return (
    <RoleGuard permissions={[{ action: 'MANAGE', subject: 'ROLES' }]}>
      <RolesView />
    </RoleGuard>
  );
}
