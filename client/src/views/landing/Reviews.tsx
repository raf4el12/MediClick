import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import ReadOnlyRating from '@/components/shared/ReadOnlyRating';
import type { PublicReview } from '@/views/public/types';

/** Reseñas visibles de pacientes (patrón `CustomerReviews` de Materio), sin datos del paciente y sin carrusel. */
export default function Reviews({ reviews }: { reviews: (PublicReview & { doctorName: string })[] }) {
  return (
    <section aria-labelledby='resenas-titulo' className='max-is-[1200px] mli-auto pli-6 plb-14'>
      <div className='flex flex-col items-center gap-2 text-center mbe-10'>
        <Typography id='resenas-titulo' variant='h3' component='h2'>
          Lo que dicen los pacientes
        </Typography>
        <Typography color='text.secondary'>Reseñas de pacientes que ya se atendieron.</Typography>
      </div>
      <ul className='grid gap-6 m-0 p-0 list-none md:grid-cols-3'>
        {reviews.map((r) => (
          <li key={r.id}>
            <Card className='bs-full'>
              <CardContent className='flex flex-col gap-3'>
                <ReadOnlyRating value={r.rating} />
                <Typography color='text.primary'>{r.comment ?? 'Sin comentario.'}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Sobre {r.doctorName}
                </Typography>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
