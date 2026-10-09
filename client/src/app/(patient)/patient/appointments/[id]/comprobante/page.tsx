import { RoleGuard } from '@/components/shared/RoleGuard';
import { ReceiptPreview } from '@/views/patient/printables/ReceiptPreview';
import { PrintableMessage } from '@/views/patient/printables/PrintableLayout';

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);

  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'APPOINTMENTS' }]}>
      {Number.isInteger(id) && id > 0 ? <ReceiptPreview appointmentId={id} /> : <PrintableMessage>No encontramos esta cita.</PrintableMessage>}
    </RoleGuard>
  );
}
