'use client';

import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import { reviewsService } from '@/services/reviews.service';

interface DoctorReviewsListProps {
  doctorId: number;
}

export function DoctorReviewsList({ doctorId }: DoctorReviewsListProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reviews', 'doctor', doctorId],
    queryFn: () => reviewsService.getDoctorReviews(doctorId),
    staleTime: 2 * 60 * 1000,
  });

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
        <Box key={review.id}>
          {idx > 0 && <Divider sx={{ mb: 1.5 }} />}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Rating value={review.rating} readOnly size="small" />
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
          <Typography variant="caption" color="text.secondary">
            {review.patient.name} {review.patient.lastName}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
