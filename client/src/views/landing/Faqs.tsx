import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';

const FAQS = [
  { q: '¿Necesito una cuenta para reservar?', a: 'Sí. Crear tu cuenta toma un par de minutos y te permite ver tus citas, pagar en línea y recibir recordatorios.' },
  { q: '¿Cómo pago mi cita?', a: 'Con Mercado Pago. El cupo queda reservado mientras completas el pago y, al terminar, puedes descargar el comprobante.' },
  { q: '¿Puedo cancelar o reagendar?', a: 'Sí, desde «Mis citas». Antes de confirmar te mostramos si la cancelación tiene alguna penalización.' },
  { q: '¿Qué pasa si no hay cupos con el médico que quiero?', a: 'Puedes anotarte en la lista de espera y te ofrecemos el primer cupo que se libere, o elegir otro médico.' },
];

/** Preguntas frecuentes (patrón `Faqs` de Materio). */
export default function Faqs() {
  return (
    <section aria-labelledby='preguntas-titulo' className='plb-14' style={{ backgroundColor: 'var(--mui-palette-background-paper)' }}>
      <div className='max-is-[900px] mli-auto pli-6'>
        <Typography id='preguntas-titulo' variant='h3' component='h2' className='text-center mbe-8'>
          Preguntas frecuentes
        </Typography>
        {FAQS.map((f, i) => (
          <Accordion key={f.q} defaultExpanded={i === 0}>
            <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' aria-hidden />} id={`pregunta-${i}`} aria-controls={`respuesta-${i}`}>
              <Typography component='h3' className='font-medium'>
                {f.q}
              </Typography>
            </AccordionSummary>
            <AccordionDetails id={`respuesta-${i}`}>
              <Typography color='text.secondary'>{f.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </div>
    </section>
  );
}
