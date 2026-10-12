'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { notify } from '@/utils/notify';
import { useSpecialties } from './hooks/useSpecialties';
import { SpecialtiesTable } from './components/SpecialtiesTable';

export default function SpecialtiesView() {
  const controller = useSpecialties();

  const handleSaved = () => {
    controller.refreshData();
    notify(controller.drawerData.action === 'Update' ? 'Especialidad actualizada' : 'Especialidad creada', 'success');
  };

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title='Especialidades' subtitle='Gestiona las especialidades médicas, su duración y su precio' />
      <SpecialtiesTable {...controller} onSaved={handleSaved} />
    </div>
  );
}
