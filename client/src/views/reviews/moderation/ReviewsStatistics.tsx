'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from 'recharts';
import AppRecharts from '@/libs/styles/AppRecharts';
import type { ReviewRating, ReviewStats } from '../types';

const RATINGS: ReviewRating[] = [1, 2, 3, 4, 5];

/** Reseñas visibles con 4 o 5 estrellas, como porcentaje de las visibles. */
export function positiveShare(stats: ReviewStats): number | null {
  if (stats.visible === 0) return null;
  return Math.round(((stats.distribution[4] + stats.distribution[5]) / stats.visible) * 100);
}

/** Reseñas positivas y barras por calificación (patrón `ReviewsStatistics` de Materio, en recharts). */
export default function ReviewsStatistics({ stats, loading }: { stats?: ReviewStats; loading: boolean }) {
  const positive = stats ? positiveShare(stats) : null;
  const data = RATINGS.map((rating) => ({ rating, label: String(rating), count: stats?.distribution[rating] ?? 0 }));
  const max = Math.max(...data.map((d) => d.count));
  const description = stats
    ? `Reseñas visibles por calificación: ${data.map((d) => `${d.count} con ${d.rating}`).join(', ')}.`
    : '';

  return (
    <Card component='section' aria-labelledby='resenas-estadisticas-titulo' className='bs-full'>
      <CardContent>
        <div className='grid gap-6 sm:grid-cols-2'>
          <div className='flex flex-col items-start justify-between gap-6'>
            <div className='flex flex-col items-start gap-2'>
              <Typography id='resenas-estadisticas-titulo' variant='h5'>
                Estadísticas de reseñas
              </Typography>
              {loading || !stats ? (
                <Skeleton variant='text' width={160} />
              ) : (
                <div className='flex items-center gap-2'>
                  <Typography>{stats.visible === 1 ? '1 reseña visible' : `${stats.visible} reseñas visibles`}</Typography>
                  {stats.hidden > 0 && <Chip label={`${stats.hidden} sin publicar`} variant='tonal' size='small' color='secondary' />}
                </div>
              )}
            </div>
            <div className='flex flex-col items-start gap-2'>
              {loading || !stats ? (
                <Skeleton variant='text' width={200} />
              ) : (
                <Typography color='text.primary'>
                  {positive === null ? 'Sin reseñas visibles todavía' : <><Typography component='span' variant='h5' className='tabular-nums'>{positive} %</Typography> de reseñas positivas (4 o 5 estrellas)</>}
                </Typography>
              )}
              <Typography variant='body2'>Reseñas visibles de los médicos de la sede</Typography>
            </div>
          </div>
          <div className='flex justify-center'>
            {loading || !stats ? (
              <Skeleton variant='rounded' height={156} className='is-full' />
            ) : (
              <AppRecharts className='is-full' style={{ height: 156 }}>
                <figure className='m-0 bs-full' role='img' aria-label={description}>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap='30%'>
                      <XAxis dataKey='label' axisLine={false} tickLine={false} tick={{ fill: 'var(--mui-palette-text-secondary)', fontSize: 13 }} />
                      <Bar dataKey='count' radius={[7, 7, 7, 7]} isAnimationActive={false}>
                        {data.map((d) => (
                          <Cell key={d.rating} fill={d.count === max && max > 0 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-success-lightOpacity)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </figure>
              </AppRecharts>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
