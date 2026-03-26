import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import UsersView from '@/views/users';

export default function UsersPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN]}>
      <UsersView />
    </RoleGuard>
  );
}
