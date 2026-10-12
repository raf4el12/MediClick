'use client';

import { useCallback } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { DataTablePagination, DataTableSorting } from '@/components/shared/DataTable';
import { notify } from '@/utils/notify';
import { AddPatientDrawer } from './components/AddPatientDrawer';
import { EditPatientDrawer } from './components/EditPatientDrawer';
import { PatientFilters } from './components/PatientFilters';
import { PatientsTable } from './components/PatientsTable';
import { usePatients } from './hooks/usePatients';

/** Gestión de pacientes con el patrón `user/list` de Materio: tarjetas, filtros y tabla. */
export default function PatientsView() {
  const c = usePatients();
  const active = c.data.activeCount ?? 0;
  const inactive = c.data.inactiveCount ?? 0;
  const { setPagination } = c;

  const onPaginationChange = useCallback(
    ({ pageIndex, pageSize }: DataTablePagination) => setPagination((p) => ({ ...p, currentPage: pageIndex + 1, pageSize })),
    [setPagination],
  );
  const onSortingChange = useCallback(
    ({ id, desc }: DataTableSorting) => setPagination((p) => ({ ...p, orderBy: id, orderByMode: desc ? 'desc' : 'asc', currentPage: 1 })),
    [setPagination],
  );

  const cards = [
    { title: 'Pacientes', value: active + inactive, icon: 'ri-group-line', color: 'primary' as const },
    { title: 'Activos', value: active, icon: 'ri-user-follow-line', color: 'success' as const },
    { title: 'Inactivos', value: inactive, icon: 'ri-user-unfollow-line', color: 'secondary' as const },
  ];

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Pacientes
        </Typography>
        <Typography color='text.secondary'>Pacientes registrados en la sede, con acceso a su expediente.</Typography>
      </div>
      <section aria-label='Resumen de pacientes' className='grid gap-6 sm:grid-cols-3'>
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className='flex justify-between gap-2'>
              <div className='flex flex-col gap-1'>
                <Typography color='text.primary'>{card.title}</Typography>
                <Typography variant='h4' className='tabular-nums'>
                  {card.value}
                </Typography>
              </div>
              <CustomAvatar color={card.color} skin='light' variant='rounded' size={42}>
                <i className={`${card.icon} text-[26px]`} aria-hidden />
              </CustomAvatar>
            </CardContent>
          </Card>
        ))}
      </section>
      <Card>
        <PatientFilters
          searchValue={c.pagination.searchValue}
          onSearch={c.debouncedSearch}
          status={c.pagination.statusFilter}
          onStatusChange={c.setStatusFilter}
          onCreate={c.openCreateDrawer}
        />
        <Divider />
        {c.error && (
          <Alert
            severity='error'
            className='m-5'
            action={
              <Button color='inherit' size='small' onClick={c.refreshData}>
                Reintentar
              </Button>
            }
          >
            {c.error}
          </Alert>
        )}
        <PatientsTable
          rows={c.data.rows}
          totalRows={c.data.totalRows}
          loading={c.loading}
          pagination={c.pagination}
          onPaginationChange={onPaginationChange}
          onSortingChange={onSortingChange}
          onEdit={c.openEditDrawer}
          onDelete={c.openDeleteDialog}
        />
      </Card>

      <AddPatientDrawer
        open={c.drawerOpen}
        onClose={c.closeDrawer}
        onSuccess={() => {
          c.refreshData();
          notify('Paciente registrado');
        }}
      />
      <EditPatientDrawer
        open={!!c.editPatient}
        patient={c.editPatient}
        onClose={c.closeEditDrawer}
        onSuccess={() => {
          c.closeEditDrawer();
          c.refreshData();
          notify('Paciente actualizado');
        }}
      />
      <ConfirmDialog
        open={!!c.deletePatient}
        title='Eliminar paciente'
        description={c.deletePatient ? `¿Eliminar a ${c.deletePatient.profile.name} ${c.deletePatient.profile.lastName}? Esta acción no se puede deshacer.` : undefined}
        destructive={false}
        onCancel={c.closeDeleteDialog}
        onConfirm={async () => {
          const ok = await c.confirmDelete();
          notify(ok ? 'Paciente eliminado' : 'No se pudo eliminar el paciente', ok ? 'success' : 'error');
        }}
      />
    </div>
  );
}
