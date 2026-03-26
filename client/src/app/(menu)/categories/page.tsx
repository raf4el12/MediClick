import { RoleGuard } from '@/components/shared/RoleGuard';
import { UserRole } from '@/types/auth.types';
import CategoriesView from '@/views/categories';

export default function CategoriesPage() {
  return (
    <RoleGuard roles={[UserRole.ADMIN]}>
      <CategoriesView />
    </RoleGuard>
  );
}
