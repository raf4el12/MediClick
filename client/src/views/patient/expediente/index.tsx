'use client';

import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import { usePatientRecord } from './hooks/usePatientRecord';
import RecordOverview from './components/RecordOverview';
import RecordTabs from './components/RecordTabs';

interface Props {
  /** Expediente de otro paciente (personal); sin él, el paciente ve el suyo. */
  patientId?: number;
}

/** Expediente clínico con la vista de usuario de Materio: resumen a la izquierda, pestañas a la derecha. */
export default function ExpedienteView({ patientId }: Props) {
  const { record, isLoading, error } = usePatientRecord({ patientId });

  if (isLoading) {
    return (
      <Grid container spacing={6} aria-busy>
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <Skeleton variant='rounded' height={520} />
        </Grid>
        <Grid size={{ xs: 12, md: 7, lg: 8 }} className='flex flex-col gap-6'>
          <Skeleton variant='rounded' height={44} />
          <Skeleton variant='rounded' height={320} />
        </Grid>
      </Grid>
    );
  }

  if (error || !record) {
    return <Alert severity='error'>{error ?? 'No se pudo cargar el expediente clínico.'}</Alert>;
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 5, lg: 4 }}>
        <RecordOverview record={record} own={patientId === undefined} />
      </Grid>
      <Grid size={{ xs: 12, md: 7, lg: 8 }}>
        <RecordTabs record={record} />
      </Grid>
    </Grid>
  );
}
