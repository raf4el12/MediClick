import { RoleGuard } from '@/components/shared/RoleGuard';
import { PrescriptionPreview } from '@/views/patient/printables/PrescriptionPreview';
import { PrintableMessage } from '@/views/patient/printables/PrintableLayout';

export default async function PrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);

  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      {Number.isInteger(id) && id > 0 ? (
        <PrescriptionPreview appointmentId={id} />
      ) : (
        <PrintableMessage>No encontramos esta cita.</PrintableMessage>
      )}
    </RoleGuard>
  );
}
