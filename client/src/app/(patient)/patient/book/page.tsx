import { z } from 'zod';
import Typography from '@mui/material/Typography';
import { RoleGuard } from '@/components/shared/RoleGuard';
import { BookingWizard } from '@/views/booking/components/BookingWizard';
import type { BookingPreset } from '@/views/booking/model/types';

const presetId = z.coerce.number().int().positive();

// Un valor inválido se ignora: el flujo empieza por el primer paso sin resolver.
function parsePreset(params: Record<string, string | string[] | undefined>): BookingPreset {
  const read = (key: string) => {
    const parsed = presetId.safeParse(params[key]);
    return parsed.success ? parsed.data : undefined;
  };
  const preset = { clinicId: read('clinicId'), specialtyId: read('specialtyId'), doctorId: read('doctorId') };
  return Object.fromEntries(Object.entries(preset).filter(([, v]) => v !== undefined));
}

export default async function PatientBookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const preset = parsePreset(await searchParams);

  return (
    <RoleGuard permissions={[{ action: 'CREATE', subject: 'APPOINTMENTS' }]}>
      <div className='flex flex-col gap-4'>
        <div>
          <Typography variant='h4' component='h1'>
            Reservar cita
          </Typography>
          <Typography color='text.secondary'>Elige sede, especialidad, médico y el cupo que te quede mejor.</Typography>
        </div>
        <BookingWizard preset={Object.keys(preset).length > 0 ? preset : undefined} />
      </div>
    </RoleGuard>
  );
}
