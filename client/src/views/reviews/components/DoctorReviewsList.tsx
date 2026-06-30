'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { reviewsService } from '@/services/reviews.service';
import { DoctorRatingBadge } from './DoctorRatingBadge';

interface DoctorReviewsListProps {
  doctorId: number;
  /** Título de la sección (con el badge agregado al lado). */
  label?: string;
  /** Modo moderación: incluye ocultas y muestra toggle de visibilidad. */
  moderatable?: boolean;
}

export function DoctorReviewsList({
  doctorId,
  label = 'Reseñas',
  moderatable = false,
}: DoctorReviewsListProps) {
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reviews', 'doctor', doctorId, moderatable ? 'all' : 'visible'],
    queryFn: () =>
      moderatable
        ? reviewsService.getDoctorReviewsAll(doctorId)
        : reviewsService.getDoctorReviews(doctorId),
    staleTime: 2 * 60 * 1000,
  });

  const toggleVisibility = async (id: number, current: boolean) => {
    setTogglingId(id);
    try {
      await reviewsService.setVisibility(id, !current);
      await queryClient.invalidateQueries({ queryKey: ['reviews', 'doctor', doctorId] });
      await queryClient.invalidateQueries({ queryKey: ['doctors'] });
    } finally {
      setTogglingId(null);
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Box>
      );
    }

    if (isError) {
      return (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          No se pudieron cargar las reseñas.
        </Alert>
      );
    }

    if (!data || data.reviews.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          Este doctor aún no tiene reseñas.
        </Typography>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {data.reviews.map((review, idx) => (
          <Box key={review.id} sx={{ opacity: review.isVisible ? 1 : 0.55 }}>
            {idx > 0 && <Divider sx={{ mb: 1.5 }} />}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Rating value={review.rating} readOnly size="small" />
                {moderatable && !review.isVisible && (
                  <Chip label="Oculta" size="small" color="default" />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {new Date(review.createdAt).toLocaleDateString('es-PE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Typography>
            </Box>
            {review.comment && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {review.comment}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {review.patient.name} {review.patient.lastName}
              </Typography>
              {moderatable && (
                <Button
                  size="small"
                  color={review.isVisible ? 'error' : 'success'}
                  disabled={togglingId === review.id}
                  onClick={() => toggleVisibility(review.id, review.isVisible)}
                  startIcon={
                    <i className={review.isVisible ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  }
                >
                  {review.isVisible ? 'Ocultar' : 'Mostrar'}
                </Button>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box>
      {/* El badge agregado deriva del MISMO query que la lista, por eso se
          mantiene en sync al moderar (a diferencia del prop cacheado). */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
        {data && (
          <DoctorRatingBadge
            ratingAvg={data.ratingAvg}
            ratingCount={data.ratingCount}
          />
        )}
      </Box>
      {renderBody()}
    </Box>
  );
}
