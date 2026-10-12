import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import LinkButton from '@/components/shared/LinkButton';
import { toDoctorProfileView } from '../functions/doctorProfile';
import type { PublicDoctor } from '../types';

/** Encabezado del perfil (patrón `UserProfileHeader` de Materio, con banda de color en lugar de foto de portada). */
export default function DoctorProfileHeader({ doctor, bookHref }: { doctor: PublicDoctor; bookHref: string }) {
  const view = toDoctorProfileView(doctor);

  return (
    <Card>
      <div className='bs-[120px]' style={{ background: 'linear-gradient(90deg, var(--mui-palette-primary-main) 0%, var(--mui-palette-primary-lightOpacity) 100%)' }} />
      <CardContent className='flex flex-wrap items-end justify-between gap-6'>
        <div className='flex flex-wrap items-end gap-5'>
          {/* Solo el avatar se monta sobre la banda; el nombre queda sobre el fondo de la tarjeta. */}
          {/* Contenedor opaco: el fondo tonal del avatar es translúcido y no debe mezclarse con la banda. */}
          <div className='self-start -mbs-16 rounded p-1' style={{ backgroundColor: 'var(--mui-palette-background-paper)' }}>
            <CustomAvatar src={view.photo ?? undefined} alt='' skin='light' color='primary' size={104} variant='rounded'>
              <span className='text-4xl'>{view.initials}</span>
            </CustomAvatar>
          </div>
          <div className='flex flex-col gap-2'>
            <Typography variant='h4' component='h1'>
              {view.fullName}
            </Typography>
            <div className='flex flex-wrap gap-1'>
              {doctor.specialties.map((s) => (
                <Chip key={s.id} size='small' variant='tonal' color='primary' label={s.name} />
              ))}
            </div>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-1'>
              <Typography className='flex items-center gap-1' color='text.secondary'>
                <i className='ri-building-line' aria-hidden />
                {doctor.clinic.name}
              </Typography>
              <Typography className='flex items-center gap-1' color='text.secondary'>
                <i className='ri-star-fill text-warning' aria-hidden />
                {view.ratingLabel}
              </Typography>
            </div>
          </div>
        </div>
        <LinkButton href={bookHref} variant='contained' size='large' startIcon={<i className='ri-calendar-check-line' aria-hidden />}>
          Reservar con este médico
        </LinkButton>
      </CardContent>
    </Card>
  );
}
