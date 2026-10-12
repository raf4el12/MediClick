'use client';

import type { ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { formatDate } from '@/utils/formatDate';
import { HISTORY_STATUS, diagnosedLabel } from '../status';
import type { MedicalHistory } from '../types';

interface MedicalHistoryDetailProps {
  entry: MedicalHistory | null;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <Typography variant='caption' color='text.secondary' className='font-medium'>
        {label}
      </Typography>
      <Typography className='whitespace-pre-wrap'>{children}</Typography>
    </div>
  );
}

/** Detalle de un antecedente en un drawer lateral. */
export function MedicalHistoryDetail({ entry, onClose }: MedicalHistoryDetailProps) {
  return (
    <Drawer
      open={!!entry}
      anchor='right'
      onClose={onClose}
      slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-label': 'Detalle del antecedente', className: 'is-full sm:is-[440px]' } }}
    >
      {entry && (
        <>
          <div className='flex items-start justify-between gap-2 pli-5 plb-4'>
            <div className='flex flex-col gap-2 min-is-0'>
              <Typography variant='h5' component='h2'>
                {entry.condition}
              </Typography>
              <Chip size='small' variant='tonal' color={HISTORY_STATUS[entry.status].color} label={HISTORY_STATUS[entry.status].label} className='self-start' />
            </div>
            <IconButton size='small' aria-label='Cerrar' onClick={onClose}>
              <i className='ri-close-line text-2xl' aria-hidden />
            </IconButton>
          </div>
          <Divider />
          <div className='flex flex-col gap-4 p-5'>
            <Field label='Paciente'>
              {entry.patient.name} {entry.patient.lastName}
            </Field>
            <Field label='Descripción'>{entry.description || 'Sin descripción'}</Field>
            <Field label='Fecha de diagnóstico'>{entry.diagnosedDate ? diagnosedLabel(entry.diagnosedDate, 'long') : 'No especificada'}</Field>
            <Field label='Notas'>{entry.notes || 'Sin notas'}</Field>
            <Divider />
            <div className='flex flex-wrap gap-6'>
              <Field label='Creado'>{formatDate(entry.createdAt, { time: true })}</Field>
              {entry.updatedAt && <Field label='Actualizado'>{formatDate(entry.updatedAt, { time: true })}</Field>}
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
}
