'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { usePatientRecord } from './hooks/usePatientRecord';
import RecordProfileHeader from './components/RecordProfileHeader';
import RecordMedicalHistory from './components/RecordMedicalHistory';
import RecordAppointments from './components/RecordAppointments';

interface Props {
  patientId?: number;
}

export default function ExpedienteView({ patientId }: Props) {
  const { record, isLoading, error } = usePatientRecord({ patientId });

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: '24px' }} />
        <Skeleton variant="rounded" height={160} sx={{ borderRadius: '24px' }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: '24px' }} />
      </Box>
    );
  }

  if (error || !record) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <Alert severity="error" sx={{ borderRadius: '16px' }}>
          {error ?? 'No se pudo cargar el expediente clínico.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
        Expediente Clínico
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Resumen completo de tu historial médico y atenciones.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <RecordProfileHeader record={record} />
        <RecordMedicalHistory history={record.medicalHistory ?? []} />
        <RecordAppointments appointments={record.appointments ?? []} />
      </Box>
    </Box>
  );
}
