'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { notify } from '@/utils/notify';
import { useCategories } from './hooks/useCategories';
import { CategoriesTable } from './components/CategoriesTable';

export default function CategoriesView() {
  const controller = useCategories();

  const handleSaved = () => {
    controller.refreshData();
    notify(controller.drawerData.action === 'Update' ? 'Categoría actualizada' : 'Categoría creada', 'success');
  };

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title='Categorías' subtitle='Organiza las especialidades por categorías médicas' />
      <CategoriesTable {...controller} onSaved={handleSaved} />
    </div>
  );
}
