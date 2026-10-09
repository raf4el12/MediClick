import { RoleGuard } from '@/components/shared/RoleGuard';
import CategoriesView from '@/views/categories';

export default function CategoriesPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'CATEGORIES' }]}>
      <CategoriesView />
    </RoleGuard>
  );
}
