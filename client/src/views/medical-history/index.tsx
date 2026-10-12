'use client';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { notify } from '@/utils/notify';
import { MedicalHistoryDetail } from './components/MedicalHistoryDetail';
import { MedicalHistoryForm } from './components/MedicalHistoryForm';
import { MedicalHistoryStats } from './components/MedicalHistoryStats';
import { MedicalHistoryTable } from './components/MedicalHistoryTable';
import type { MedicalHistoryFormValues } from './functions/medical-history.schema';
import { useMedicalHistory } from './hooks/useMedicalHistory';
import { HISTORY_STATUS, HISTORY_STATUSES } from './status';
import type { MedicalHistory, MedicalHistoryStatus } from './types';

const fail = (err: unknown, fallback: string) => notify(err instanceof Error ? err.message : fallback, 'error');

/** Historial médico (antecedentes) de un paciente: tarjetas de resumen, lista y drawers de alta, edición y detalle. */
export default function MedicalHistoryView() {
  const ctrl = useMedicalHistory();

  const handleFormSubmit = async (values: MedicalHistoryFormValues) => {
    try {
      if (ctrl.editEntry) {
        await ctrl.handleUpdate(ctrl.editEntry.id, {
          condition: values.condition,
          description: values.description || undefined,
          diagnosedDate: values.diagnosedDate || undefined,
          notes: values.notes || undefined,
        });
        notify('Entrada actualizada');
      } else {
        await ctrl.handleCreate({
          patientId: values.patientId,
          condition: values.condition,
          description: values.description || undefined,
          diagnosedDate: values.diagnosedDate || undefined,
          status: values.status as MedicalHistoryStatus | undefined,
          notes: values.notes || undefined,
        });
        notify('Entrada creada');
      }
    } catch (err) {
      fail(err, 'No se pudo guardar la entrada');
    }
  };

  const handleStatusChange = async (entry: MedicalHistory, status: MedicalHistoryStatus) => {
    try {
      await ctrl.handleUpdateStatus(entry.id, status);
      notify(`${entry.condition}: ${HISTORY_STATUS[status].label.toLowerCase()}`);
    } catch (err) {
      fail(err, 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!ctrl.deleteEntry) return;
    try {
      await ctrl.handleDelete(ctrl.deleteEntry.id);
      notify('Entrada eliminada');
    } catch (err) {
      fail(err, 'No se pudo eliminar la entrada');
    }
  };

  const patientLabel = (p: { profile: { name: string; lastName: string } }) => `${p.profile.name} ${p.profile.lastName}`;

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <Typography variant='h4' component='h1'>
            Historial médico
          </Typography>
          <Typography color='text.secondary'>Antecedentes de cada paciente: condiciones activas, crónicas y resueltas.</Typography>
        </div>
        <Button variant='contained' startIcon={<i className='ri-add-line' aria-hidden />} onClick={() => ctrl.setCreateOpen(true)} disabled={!ctrl.selectedPatient}>
          Nueva entrada
        </Button>
      </div>

      <Card>
        <CardContent className='grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
          <Autocomplete
            id='historial-buscar-paciente'
            options={ctrl.patients}
            getOptionLabel={patientLabel}
            value={ctrl.selectedPatient}
            onChange={(_, value) => ctrl.handleSelectPatient(value)}
            loading={ctrl.loadingPatients}
            loadingText='Cargando pacientes…'
            noOptionsText='Sin pacientes con ese nombre'
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            renderInput={(params) => <TextField {...params} label='Paciente' size='small' placeholder='Nombre del paciente' />}
          />
          <TextField
            id='historial-filtro-estado'
            select
            label='Estado'
            value={ctrl.statusFilter}
            onChange={(e) => ctrl.handleStatusFilter(e.target.value as MedicalHistoryStatus | '')}
            size='small'
            disabled={!ctrl.selectedPatient}
          >
            <MenuItem value=''>Todos los estados</MenuItem>
            {HISTORY_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {HISTORY_STATUS[s].label}
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

      {!ctrl.selectedPatient ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-2 plb-10 text-center'>
            <i className='ri-user-search-line text-4xl' aria-hidden />
            <Typography color='text.primary'>Elige un paciente para ver su historial médico.</Typography>
            <Typography variant='body2' color='text.secondary'>
              Después podrás agregar, editar o cambiar el estado de sus antecedentes.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <MedicalHistoryStats entries={ctrl.data.data} total={ctrl.data.total} />
          {ctrl.error && <Alert severity='error'>{ctrl.error}</Alert>}
          <Card>
            <MedicalHistoryTable
              entries={ctrl.data.data}
              total={ctrl.data.total}
              loading={ctrl.loading}
              page={ctrl.page}
              limit={ctrl.limit}
              onPageChange={ctrl.handlePageChange}
              onLimitChange={ctrl.handleLimitChange}
              onDetail={ctrl.setDetailEntry}
              onEdit={ctrl.setEditEntry}
              onStatusChange={(entry, status) => void handleStatusChange(entry, status)}
              onDelete={ctrl.setDeleteEntry}
            />
          </Card>
        </>
      )}

      <MedicalHistoryDetail entry={ctrl.detailEntry} onClose={() => ctrl.setDetailEntry(null)} />
      <MedicalHistoryForm
        open={ctrl.createOpen || !!ctrl.editEntry}
        onClose={() => {
          ctrl.setCreateOpen(false);
          ctrl.setEditEntry(null);
        }}
        onSubmit={(values) => void handleFormSubmit(values)}
        entry={ctrl.editEntry}
        patients={ctrl.patients}
        selectedPatientId={ctrl.selectedPatient?.id}
        submitting={ctrl.submitting}
      />
      <ConfirmDialog
        open={!!ctrl.deleteEntry}
        title='Eliminar la entrada'
        description={ctrl.deleteEntry ? `Se elimina «${ctrl.deleteEntry.condition}» del historial del paciente.` : undefined}
        destructive={false}
        onCancel={() => ctrl.setDeleteEntry(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
