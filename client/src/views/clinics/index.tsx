'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { notify } from '@/utils/notify';
import { useClinics } from './hooks/useClinics';
import { ClinicsTable } from './components/ClinicsTable';

export default function ClinicsView() {
  const controller = useClinics();

  const handleSaved = () => {
    controller.refreshData();
    notify(controller.drawerData.action === 'Update' ? 'Sede actualizada' : 'Sede creada', 'success');
  };

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader title='Sedes' subtitle='Administra las sedes, su zona horaria y su moneda' />
      <ClinicsTable {...controller} onSaved={handleSaved} />
    </div>
  );
}
