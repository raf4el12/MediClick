'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import type { Appointment } from '@/views/appointments/types';
import type { Prescription, CreatePrescriptionPayload } from '../types';
import { PrescriptionForm } from './PrescriptionForm';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);

  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface PrescriptionPanelProps {
  appointment: Appointment | null;
  prescription: Prescription | null;
  loadingPrescription: boolean;
  loadingCreate: boolean;
  panelError: string | null;
  onClose: () => void;
  onCreatePrescription: (payload: CreatePrescriptionPayload) => Promise<void>;
}

export function PrescriptionPanel({
  appointment,
  prescription,
  loadingPrescription,
  loadingCreate,
  panelError,
  onClose,
  onCreatePrescription,
}: PrescriptionPanelProps) {
  if (!appointment) {
    return (
      <Card sx={{ position: 'sticky', top: 80, height: '100%' }}>
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            textAlign: 'center',
          }}
        >
          <i className="ri-medicine-bottle-line" style={{ fontSize: 48, opacity: 0.3 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Selecciona una cita para ver su receta
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ position: 'sticky', top: 80 }}>
      <CardHeader
        title={
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {appointment.patient.name} {appointment.patient.lastName}
          </Typography>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            {appointment.schedule.specialty.name} — {appointment.schedule.scheduleDate}
          </Typography>
        }
        action={
          <IconButton size="small" onClick={onClose}>
            <i className="ri-close-line" style={{ fontSize: 18 }} />
          </IconButton>
        }
      />

      <Divider />

      <CardContent>
        {panelError ? (
          <Alert severity="error">{panelError}</Alert>
        ) : loadingPrescription ? (
          <>
            <Skeleton variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 1 }} />
            <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
          </>
        ) : prescription ? (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Receta existente
            </Typography>

            {prescription.instructions && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Instrucciones
                </Typography>
                <Typography variant="body2">{prescription.instructions}</Typography>
              </Box>
            )}

            {prescription.validUntil && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Válida hasta
                </Typography>
                <Typography variant="body2">{formatDate(prescription.validUntil)}</Typography>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Medicamentos ({prescription.items.length})
            </Typography>

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Medicamento</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Dosis</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Frecuencia</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>Duración</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prescription.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontSize: 12 }}>{item.medication}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{item.dosage}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{item.frequency}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{item.duration}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        ) : (
          <PrescriptionForm
            appointmentId={appointment.id}
            loading={loadingCreate}
            onSubmit={onCreatePrescription}
          />
        )}
      </CardContent>
    </Card>
  );
}
