'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { ReviewRating, ReviewStats } from '../types';

const RATINGS: ReviewRating[] = [5, 4, 3, 2, 1];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Promedio y distribución por calificación de las reseñas visibles (patrón `TotalReviews` de Materio). */
export default function TotalReviews({ stats, loading }: { stats?: ReviewStats; loading: boolean }) {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const visible = stats?.visible ?? 0;

  return (
    <Card component='section' aria-labelledby='resenas-total-titulo' className='bs-full'>
      <CardContent>
        <Typography id='resenas-total-titulo' variant='h5' className='mbe-4'>
          Calificación de la sede
        </Typography>
        {loading || !stats ? (
          <Skeleton variant='rounded' height={140} aria-label='Cargando la calificación' />
        ) : (
          <div className='flex max-sm:flex-col items-center gap-6'>
            <div className='flex flex-col items-start gap-2 is-full sm:is-6/12'>
              <div className='flex items-center gap-2'>
                <Typography variant='h3' component='p' color='primary.main' aria-label={stats.averageRating === null ? 'Sin calificación' : `Promedio ${stats.averageRating.toFixed(1)} de 5`}>
                  {stats.averageRating === null ? '—' : stats.averageRating.toFixed(1)}
                </Typography>
                <i className='ri-star-smile-line text-[32px] text-primary' aria-hidden />
              </div>
              <Typography className='font-medium' color='text.primary'>
                {plural(stats.total, 'reseña en total', 'reseñas en total')}
              </Typography>
              <Typography>Promedio de las reseñas visibles. Una reseña oculta no cuenta.</Typography>
              <Chip label={plural(stats.hidden, 'oculta', 'ocultas')} variant='tonal' size='small' color={stats.hidden > 0 ? 'secondary' : 'primary'} />
            </div>
            <Divider orientation={isSmallScreen ? 'horizontal' : 'vertical'} flexItem />
            <ul aria-label='Reseñas visibles por calificación' className='flex flex-col gap-3 is-full sm:is-6/12 m-0 p-0 list-none'>
              {RATINGS.map((rating) => {
                const count = stats.distribution[rating];
                const percent = visible === 0 ? 0 : Math.round((count / visible) * 100);
                return (
                  <li key={rating} className='flex items-center gap-2'>
                    <Typography variant='body2' className='text-nowrap is-16'>
                      {plural(rating, 'estrella', 'estrellas')}
                    </Typography>
                    <LinearProgress color='primary' value={percent} variant='determinate' className='bs-2 is-full' aria-label={`${plural(rating, 'estrella', 'estrellas')}: ${count} de ${visible}`} />
                    <Typography variant='body2' className='tabular-nums is-6 text-end'>
                      {count}
                    </Typography>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
