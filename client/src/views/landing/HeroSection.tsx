import Image from 'next/image';
import Typography from '@mui/material/Typography';
import LinkButton from '@/components/shared/LinkButton';

/** Portada de la landing (patrón `HeroSection` de Materio, sin imágenes pesadas). */
export default function HeroSection() {
  return (
    <section
      aria-labelledby='portada-titulo'
      className='-mbs-[70px] pbs-[110px] pbe-14'
      style={{ background: 'linear-gradient(180deg, var(--mui-palette-primary-lightOpacity) 0%, var(--mui-palette-background-default) 100%)' }}
    >
      <div className='grid items-center gap-10 max-is-[1200px] mli-auto pli-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
        <div className='flex flex-col gap-5 max-md:text-center'>
          <Typography id='portada-titulo' variant='h2' component='h1' className='font-bold' color='text.primary'>
            Reserva tu cita médica en línea
          </Typography>
          <Typography className='text-lg' color='text.secondary'>
            Elige sede, especialidad y médico, y reserva el cupo que te quede mejor. Recibe recordatorios, paga en línea y consulta tu expediente y tus recetas cuando
            quieras.
          </Typography>
          <div className='flex flex-wrap gap-3 max-md:justify-center'>
            <LinkButton href='/patient/book' variant='contained' size='large'>
              Reservar cita
            </LinkButton>
            <LinkButton href='/medicos' variant='outlined' size='large'>
              Conocer a los médicos
            </LinkButton>
          </div>
        </div>
        <Image src='/images/front-pages/sitting-girl-with-laptop.png' alt='' width={642} height={680} priority className='max-is-full bs-auto mli-auto max-md:hidden' />
      </div>
    </section>
  );
}
