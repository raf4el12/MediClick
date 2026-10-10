'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { extractApiError } from '@/utils/extractApiError';
import { notify } from '@/utils/notify';
import { blockImpactQuery, useBlockMutations, useRestrictionImpact } from '../hooks/useRestrictions';
import type { BlockDraft } from '../types/restrictions';
import ImpactList from './ImpactList';

interface BlockDrawerProps {
  doctorId: number;
  doctorName: string;
  /** Borrador inicial: desde una selección del calendario o un bloqueo existente. */
  initial: BlockDraft | null;
  onClose: () => void;
}

/** Alta y edición de un bloqueo de agenda con la vista previa de impacto (patrón AddEventSidebar). */
export default function BlockDrawer({ doctorId, doctorName, initial, onClose }: BlockDrawerProps) {
  return (
    <Drawer
      anchor='right'
      open={!!initial}
      onClose={onClose}
      slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-label': 'Bloqueo de agenda', className: 'is-[460px] max-is-full' } }}
    >
      {initial && <BlockForm key={`${initial.id ?? 'nuevo'}-${initial.startDate}-${initial.timeFrom}`} doctorId={doctorId} doctorName={doctorName} initial={initial} onClose={onClose} />}
    </Drawer>
  );
}

function BlockForm({ doctorId, doctorName, initial, onClose }: BlockDrawerProps & { initial: BlockDraft }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const impact = useRestrictionImpact(blockImpactQuery(doctorId, draft));
  const { save, remove } = useBlockMutations(doctorId);
  const editing = !!draft.id;
  const set = (patch: Partial<BlockDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const submit = () => {
    if (!draft.reason.trim()) return setError('Escribe el motivo del bloqueo.');
    if (!blockImpactQuery(doctorId, draft)) return setError('Revisa las fechas y las horas: el fin debe ser posterior al inicio.');
    setError(null);
    save.mutate(draft, {
      onSuccess: () => {
        notify(editing ? 'Bloqueo actualizado' : 'Bloqueo creado');
        onClose();
      },
      onError: (err) => setError(extractApiError(err, 'No se pudo guardar el bloqueo').message),
    });
  };

  return (
    <div className='flex flex-col gap-5 p-6'>
      <div className='flex items-start justify-between gap-2'>
        <div>
          <Typography variant='h5' component='h2'>
            {editing ? 'Editar bloqueo de agenda' : 'Nuevo bloqueo de agenda'}
          </Typography>
          <Typography color='text.secondary'>{doctorName} · hora de la sede</Typography>
        </div>
        <Button onClick={onClose}>Cancelar</Button>
      </div>
      {error && <Alert severity='error'>{error}</Alert>}
      <RadioGroup row value={draft.type} onChange={(_, type) => set({ type: type as BlockDraft['type'] })} aria-label='Tipo de bloqueo'>
        <FormControlLabel value='FULL_DAY' control={<Radio />} label='Día completo' />
        <FormControlLabel value='TIME_RANGE' control={<Radio />} label='Por horas' />
      </RadioGroup>
      <div className='grid gap-3 grid-cols-2'>
        <TextField id='bloqueo-desde' size='small' type='date' label='Desde' value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField id='bloqueo-hasta' size='small' type='date' label='Hasta' value={draft.endDate} onChange={(e) => set({ endDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        {draft.type === 'TIME_RANGE' && (
          <>
            <TextField id='bloqueo-hora-inicio' size='small' type='time' label='Hora de inicio' value={draft.timeFrom} onChange={(e) => set({ timeFrom: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField id='bloqueo-hora-fin' size='small' type='time' label='Hora de fin' value={draft.timeTo} onChange={(e) => set({ timeTo: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </>
        )}
      </div>
      <TextField id='bloqueo-motivo' size='small' label='Motivo' value={draft.reason} onChange={(e) => set({ reason: e.target.value })} placeholder='Congreso, vacaciones, capacitación…' />
      <Divider />
      <Typography variant='h6' component='h3'>
        Citas afectadas
      </Typography>
      <ImpactList rows={impact.data?.appointments} loading={impact.isFetching} cancels empty='Ninguna cita queda dentro de este bloqueo.' />
      <div className='flex flex-wrap gap-2'>
        <Button variant='contained' disabled={save.isPending} onClick={submit}>
          {editing ? 'Guardar cambios' : 'Crear bloqueo'}
        </Button>
        {editing && (
          <Button variant='outlined' disabled={remove.isPending} onClick={() => setConfirmDelete(true)}>
            Eliminar bloqueo
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title='Eliminar el bloqueo'
        description='La agenda vuelve a ofrecer los cupos de este rango.'
        destructive={false}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(draft.id!, {
            onSuccess: () => {
              setConfirmDelete(false);
              notify('Bloqueo eliminado');
              onClose();
            },
            onError: (err) => {
              setConfirmDelete(false);
              setError(extractApiError(err, 'No se pudo eliminar el bloqueo').message);
            },
          })
        }
      />
    </div>
  );
}
