import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { PublicDoctor } from '../types';

/** «Acerca de» (patrón `AboutOverview` de Materio): solo datos profesionales. */
export default function DoctorAbout({ doctor }: { doctor: PublicDoctor }) {
  const rows = [
    { icon: 'ri-shield-user-line', label: 'Colegiatura', value: doctor.licenseNumber },
    { icon: 'ri-stethoscope-line', label: 'Especialidades', value: doctor.specialties.map((s) => s.name).join(', ') },
    { icon: 'ri-building-line', label: 'Sede', value: doctor.clinic.name },
    ...(doctor.clinic.address ? [{ icon: 'ri-map-pin-line', label: 'Dirección', value: doctor.clinic.address }] : []),
  ];

  return (
    <Card component='section' aria-labelledby='acerca-titulo'>
      <CardContent className='flex flex-col gap-5'>
        <Typography id='acerca-titulo' variant='h5' component='h2'>
          Acerca de
        </Typography>
        {doctor.resume && <Typography color='text.primary'>{doctor.resume}</Typography>}
        <dl className='flex flex-col gap-3 m-0'>
          {rows.map((r) => (
            <div key={r.label} className='flex items-start gap-2'>
              <i className={`${r.icon} text-xl text-textSecondary`} aria-hidden />
              <dt className='font-medium'>{r.label}:</dt>
              <dd className='m-0'>{r.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
