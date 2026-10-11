import { notFound } from 'next/navigation';
import { RoleGuard } from '@/components/shared/RoleGuard';
import ExpedienteView from '@/views/patient/expediente';

/** Expediente de un paciente para el personal. El paciente también tiene READ:PATIENTS: se filtra por actor. */
export default async function PatientRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isInteger(patientId) || patientId <= 0) notFound();

  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'PATIENTS' }]} actors={['DOCTOR', 'STAFF']}>
      <ExpedienteView patientId={patientId} />
    </RoleGuard>
  );
}
