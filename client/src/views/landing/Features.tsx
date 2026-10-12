import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';

const FEATURES = [
  { icon: 'ri-calendar-check-line', title: 'Reserva en línea', text: 'Ve los cupos libres de cada médico y reserva en pocos pasos, a cualquier hora.' },
  { icon: 'ri-notification-3-line', title: 'Recordatorios', text: 'Te avisamos antes de tu cita y puedes confirmarla o cancelarla desde el enlace.' },
  { icon: 'ri-bank-card-line', title: 'Pago en línea', text: 'Paga tu cita con Mercado Pago y descarga el comprobante cuando lo necesites.' },
  { icon: 'ri-file-user-line', title: 'Tu expediente', text: 'Antecedentes, citas y notas de tus consultas en un solo lugar.' },
  { icon: 'ri-medicine-bottle-line', title: 'Recetas', text: 'Consulta e imprime las recetas que te deja tu médico.' },
  { icon: 'ri-time-line', title: 'Lista de espera', text: 'Si no hay cupos, anótate y te ofrecemos el primero que se libere.' },
];

/** Qué ofrece MediClick (patrón `UsefulFeature` de Materio). */
export default function Features() {
  return (
    <section aria-labelledby='funciones-titulo' className='max-is-[1200px] mli-auto pli-6 plb-14'>
      <div className='flex flex-col items-center gap-2 text-center mbe-10'>
        <Typography id='funciones-titulo' variant='h3' component='h2'>
          Todo lo de tu cita, en un solo lugar
        </Typography>
        <Typography color='text.secondary'>Desde la reserva hasta la receta, sin llamadas ni filas.</Typography>
      </div>
      <ul className='grid gap-8 m-0 p-0 list-none sm:grid-cols-2 lg:grid-cols-3'>
        {FEATURES.map((f) => (
          <li key={f.title} className='flex flex-col items-center gap-3 text-center'>
            <CustomAvatar skin='light' color='primary' size={56} variant='rounded'>
              <i className={`${f.icon} text-[28px]`} aria-hidden />
            </CustomAvatar>
            <Typography variant='h5' component='h3'>
              {f.title}
            </Typography>
            <Typography color='text.secondary' className='max-is-[300px]'>
              {f.text}
            </Typography>
          </li>
        ))}
      </ul>
    </section>
  );
}
