import { RoleGuard } from '@/components/shared/RoleGuard';
import UsersView from '@/views/users';

export default function UsersPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'USERS' }]}>
      <UsersView />
    </RoleGuard>
  );
}
