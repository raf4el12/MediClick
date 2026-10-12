import Typography from '@mui/material/Typography';
import LinkButton from '@/components/shared/LinkButton';
import DoctorCard from '@/views/public/components/DoctorCard';
import type { PublicDoctorSummary } from '@/views/public/types';

/** Médicos destacados (patrón `OurTeam` de Materio) con datos del directorio público. */
export default function FeaturedDoctors({ doctors }: { doctors: PublicDoctorSummary[] }) {
  return (
    <section aria-labelledby='destacados-titulo' className='plb-14' style={{ backgroundColor: 'var(--mui-palette-background-paper)' }}>
      <div className='max-is-[1200px] mli-auto pli-6'>
        <div className='flex flex-col items-center gap-2 text-center mbe-10'>
          <Typography id='destacados-titulo' variant='h3' component='h2'>
            Médicos destacados
          </Typography>
          <Typography color='text.secondary'>Profesionales de nuestras sedes, con las reseñas de sus pacientes.</Typography>
        </div>
        <ul className='grid gap-6 m-0 p-0 list-none sm:grid-cols-2 lg:grid-cols-4'>
          {doctors.map((d) => (
            <li key={d.id}>
              <DoctorCard doctor={d} />
            </li>
          ))}
        </ul>
        <div className='flex justify-center mbs-8'>
          <LinkButton href='/medicos' variant='outlined'>
            Ver todos los médicos
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
