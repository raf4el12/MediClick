import Link from 'next/link';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import { toDoctorProfileView } from '../functions/doctorProfile';
import type { PublicDoctorSummary } from '../types';

/** Tarjeta de un médico del directorio público (patrón `OurTeam` de Materio). */
export default function DoctorCard({ doctor, headingLevel = 'h3' }: { doctor: PublicDoctorSummary; headingLevel?: 'h2' | 'h3' }) {
  const view = toDoctorProfileView(doctor);

  return (
    <Card className='bs-full'>
      <CardContent className='flex flex-col items-center gap-3 text-center'>
        <CustomAvatar src={view.photo ?? undefined} alt='' skin='light' color='primary' size={88}>
          <span className='text-2xl'>{view.initials}</span>
        </CustomAvatar>
        <Link href={`/medicos/${doctor.id}`} className='no-underline'>
          <Typography variant='h5' component={headingLevel} color='primary.main' className='hover:underline'>
            {view.fullName}
          </Typography>
        </Link>
        <div className='flex flex-wrap justify-center gap-1'>
          {doctor.specialties.map((s) => (
            <Chip key={s.id} size='small' variant='tonal' color='primary' label={s.name} />
          ))}
        </div>
        <Typography variant='body2' color='text.secondary'>
          {doctor.clinic.name}
        </Typography>
        <Typography variant='body2' className='flex items-center gap-1'>
          <i className='ri-star-fill text-warning' aria-hidden />
          {view.ratingLabel}
        </Typography>
      </CardContent>
    </Card>
  );
}
