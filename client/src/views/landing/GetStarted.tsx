import Typography from '@mui/material/Typography';
import LinkButton from '@/components/shared/LinkButton';

/** Llamado final a crear la cuenta (patrón `GetStarted` de Materio). */
export default function GetStarted({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby='empezar-titulo' className='max-is-[1200px] mli-auto pli-6 plb-14'>
      <div className='flex flex-wrap items-center justify-between gap-6 rounded p-8' style={{ backgroundColor: 'var(--mui-palette-primary-lightOpacity)' }}>
        <div className='flex flex-col gap-2'>
          <Typography id='empezar-titulo' variant='h4' component='h2'>
            Tu próxima cita, a unos clics
          </Typography>
          <Typography color='text.primary'>Reserva en línea y recibe la confirmación al instante.</Typography>
        </div>
        <LinkButton href={signedIn ? '/patient/book' : '/register'} variant='contained' size='large'>
          {signedIn ? 'Reservar cita' : 'Crear mi cuenta'}
        </LinkButton>
      </div>
    </section>
  );
}
