import { RoleGuard } from '@/components/shared/RoleGuard';
import { BACK_TO_PAYMENTS, ReceiptPreview } from '@/views/patient/printables/ReceiptPreview';
import { PrintableMessage } from '@/views/patient/printables/PrintableLayout';

/** Comprobante de pago de una cita de la sede, para el personal (misma vista imprimible que el paciente). */
export default async function StaffReceiptPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const id = Number((await params).appointmentId);

  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'PAYMENTS' }]} actors={['STAFF', 'DOCTOR']}>
      {Number.isInteger(id) && id > 0 ? <ReceiptPreview appointmentId={id} source='staff' /> : <PrintableMessage back={BACK_TO_PAYMENTS}>No encontramos esta cita.</PrintableMessage>}
    </RoleGuard>
  );
}
