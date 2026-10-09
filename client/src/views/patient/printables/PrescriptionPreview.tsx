'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { appointmentsService } from '@/services/appointments.service';
import { prescriptionsService } from '@/services/prescriptions.service';
import { DetailList, PrintableLayout, PrintableMessage, appointmentWhen } from './PrintableLayout';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));

/** Receta médica de una cita, imprimible y descargable en PDF. */
export function PrescriptionPreview({ appointmentId }: { appointmentId: number }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const appointmentQuery = useQuery({
    queryKey: ['patient', 'appointment', appointmentId],
    queryFn: () => appointmentsService.getMyAppointment(appointmentId),
    retry: false,
  });
  const prescriptionQuery = useQuery({
    queryKey: ['patient', 'prescription', appointmentId],
    queryFn: () => prescriptionsService.getMyPrescription(appointmentId),
    enabled: appointmentQuery.isSuccess,
    retry: false,
  });

  if (appointmentQuery.isLoading || prescriptionQuery.isLoading) return <CircularProgress aria-label='Cargando la receta' />;
  if (appointmentQuery.isError || !appointmentQuery.data) return <PrintableMessage>No encontramos esta cita.</PrintableMessage>;
  if (prescriptionQuery.isError || !prescriptionQuery.data) return <PrintableMessage>Esta cita no tiene receta.</PrintableMessage>;

  const appointment = appointmentQuery.data;
  const prescription = prescriptionQuery.data;

  const download = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      await prescriptionsService.downloadMyPdf(appointmentId);
    } catch {
      setDownloadError('No se pudo descargar el PDF. Intenta de nuevo.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PrintableLayout
      title='Receta médica'
      reference={`Cita #${appointment.id}`}
      appointment={appointment}
      actions={
        <>
          <Button variant='outlined' onClick={download} disabled={downloading} startIcon={<i className='ri-download-2-line' />}>
            Descargar PDF
          </Button>
          {downloadError && <Alert severity='error'>{downloadError}</Alert>}
        </>
      }
    >
      <DetailList
        items={[
          ['Paciente', `${prescription.patient.name} ${prescription.patient.lastName}`],
          ['Médico', `${prescription.doctor.name} ${prescription.doctor.lastName}`],
          ['Especialidad', prescription.specialtyName],
          ['Fecha de la cita', appointmentWhen(appointment)],
          ['Vigencia', prescription.validUntil ? `Hasta el ${formatDate(prescription.validUntil)}` : 'Sin fecha de vencimiento'],
        ]}
      />

      <div className='overflow-x-auto rounded' style={{ border: '1px solid var(--mui-palette-divider)' }}>
        <table className='is-full text-start' style={{ borderCollapse: 'collapse' }}>
          <caption className='sr-only'>Medicamentos indicados</caption>
          <thead>
            <tr>
              {['Medicamento', 'Dosis', 'Frecuencia', 'Duración', 'Notas'].map((h) => (
                <th key={h} scope='col' className='p-4 text-start text-sm font-medium' style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prescription.items.map((item) => (
              <tr key={item.id}>
                <td className='p-4 font-medium'>{item.medication}</td>
                <td className='p-4'>{item.dosage}</td>
                <td className='p-4'>{item.frequency}</td>
                <td className='p-4'>{item.duration}</td>
                <td className='p-4'>{item.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {prescription.instructions && (
        <div className='flex flex-col gap-1'>
          <Typography className='font-medium' color='text.primary'>
            Indicaciones
          </Typography>
          <Typography>{prescription.instructions}</Typography>
        </div>
      )}
    </PrintableLayout>
  );
}
