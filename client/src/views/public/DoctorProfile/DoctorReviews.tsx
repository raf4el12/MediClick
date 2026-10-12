import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import LinkPagination from '@/components/shared/LinkPagination';
import ReadOnlyRating from '@/components/shared/ReadOnlyRating';
import type { PublicDoctorReviews } from '../types';

const PAGE_SIZE = 5;

const dateLabel = (iso: string) => new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' }).format(new Date(iso));

/** Reseñas visibles del médico, sin datos del paciente, paginadas con enlaces. */
export default function DoctorReviews({ doctorId, reviews, page }: { doctorId: number; reviews: PublicDoctorReviews; page: number }) {
  return (
    <Card component='section' aria-labelledby='resenas-titulo'>
      <CardContent className='flex flex-col gap-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Typography id='resenas-titulo' variant='h5' component='h2'>
            Reseñas de pacientes
          </Typography>
          {reviews.ratingAvg !== null && reviews.ratingCount > 0 && (
            <div className='flex items-center gap-2'>
              <ReadOnlyRating value={Math.round(reviews.ratingAvg * 2) / 2} />
              <Typography color='text.secondary'>
                {reviews.ratingAvg.toFixed(1)} de 5 ({reviews.ratingCount} {reviews.ratingCount === 1 ? 'reseña' : 'reseñas'})
              </Typography>
            </div>
          )}
        </div>
        {reviews.rows.length === 0 ? (
          <Typography color='text.secondary'>Este médico todavía no tiene reseñas.</Typography>
        ) : (
          <ul className='flex flex-col m-0 p-0 list-none'>
            {reviews.rows.map((r) => (
              <li key={r.id} className='flex flex-col gap-1 plb-4' style={{ borderBlockStart: '1px solid var(--mui-palette-divider)' }}>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <ReadOnlyRating value={r.rating} />
                  <Typography variant='body2' color='text.secondary'>
                    {dateLabel(r.createdAt)}
                  </Typography>
                </div>
                <Typography color='text.primary'>{r.comment ?? 'Sin comentario.'}</Typography>
              </li>
            ))}
          </ul>
        )}
        <LinkPagination count={Math.ceil(reviews.totalRows / PAGE_SIZE)} page={page} pathname={`/medicos/${doctorId}`} label='Páginas de reseñas' />
      </CardContent>
    </Card>
  );
}
