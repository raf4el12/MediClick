import { Suspense } from 'react';
import { RoleGuard } from '@/components/shared/RoleGuard';
import PatientBookView from '@/views/patient/book';
// PROTOTIPO UI-06: con `?variant=` se muestran las variantes del flujo de reserva.
import BookPrototype from '@/views/patient/book/prototype/BookPrototype';

export default async function PatientBookPage({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  const { variant } = await searchParams;

  return (
    <RoleGuard permissions={[{ action: 'CREATE', subject: 'APPOINTMENTS' }]}>
      {variant ? (
        <Suspense>
          <BookPrototype />
        </Suspense>
      ) : (
        <PatientBookView />
      )}
    </RoleGuard>
  );
}
