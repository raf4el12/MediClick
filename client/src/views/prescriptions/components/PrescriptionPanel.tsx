'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { formatDate } from '@/utils/formatDate';
import type { Prescription, CreatePrescriptionPayload } from '../types';
import { PrescriptionForm } from './PrescriptionForm';

interface PrescriptionPanelProps {
  appointmentId: number;
  prescription: Prescription | null;
  loadingPrescription: boolean;
  loadingCreate: boolean;
  panelError: string | null;
  createError: string | null;
  onCreatePrescription: (payload: CreatePrescriptionPayload) => Promise<unknown>;
  onDownloadPdf: () => void;
  loadingDownload: boolean;
}

/** Contenido del drawer de receta: la receta de la cita o el formulario para crearla. */
export function PrescriptionPanel({
  appointmentId,
  prescription,
  loadingPrescription,
  loadingCreate,
  panelError,
  createError,
  onCreatePrescription,
  onDownloadPdf,
  loadingDownload,
}: PrescriptionPanelProps) {
  if (loadingPrescription) {
    return (
      <div className='flex flex-col gap-3'>
        <Skeleton variant='rounded' height={100} />
        <Skeleton variant='rounded' height={60} />
      </div>
    );
  }

  if (panelError && !prescription) return <Alert severity='error'>{panelError}</Alert>;

  if (!prescription) {
    return (
      <div className='flex flex-col gap-4'>
        {createError && <Alert severity='error'>{createError}</Alert>}
        <PrescriptionForm key={appointmentId} appointmentId={appointmentId} loading={loadingCreate} onSubmit={onCreatePrescription} />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      {panelError && <Alert severity='error'>{panelError}</Alert>}
      <Typography variant='h6' component='h3'>
        Receta del {formatDate(prescription.createdAt)}
      </Typography>
      {prescription.instructions && (
        <div>
          <Typography variant='caption' color='text.secondary'>
            Instrucciones
          </Typography>
          <Typography>{prescription.instructions}</Typography>
        </div>
      )}
      {prescription.validUntil && (
        <div>
          <Typography variant='caption' color='text.secondary'>
            Válida hasta
          </Typography>
          <Typography>{formatDate(prescription.validUntil)}</Typography>
        </div>
      )}
      <section aria-labelledby='receta-medicamentos' className='flex flex-col gap-2'>
        <Typography id='receta-medicamentos' variant='subtitle2'>
          Medicamentos ({prescription.items.length})
        </Typography>
        <ol className='flex flex-col gap-2 m-0 ps-5'>
          {prescription.items.map((item) => (
            <li key={item.id}>
              <Typography variant='body2' color='text.primary' className='font-medium'>
                {item.medication}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {item.dosage} · {item.frequency} · {item.duration}
                {item.notes ? ` · ${item.notes}` : ''}
              </Typography>
            </li>
          ))}
        </ol>
      </section>
      <Button variant='outlined' className='self-start' startIcon={<i className='ri-download-2-line' aria-hidden />} onClick={onDownloadPdf} disabled={loadingDownload}>
        Descargar PDF
      </Button>
    </div>
  );
}
