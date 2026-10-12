'use client';

import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type DataTablePagination } from '@/components/shared/DataTable';
import { doctorsService } from '@/services/doctors.service';
import { reviewsService } from '@/services/reviews.service';
import { extractApiError } from '@/utils/extractApiError';
import { formatDate } from '@/utils/formatDate';
import { getInitials } from '@/utils/getInitials';
import { notify } from '@/utils/notify';
import type { Review, ReviewModerationParams } from '../types';
import ReviewsStatistics from './ReviewsStatistics';
import TotalReviews from './TotalReviews';

type Visibility = 'all' | 'visible' | 'hidden';

const fullName = (p: { name: string; lastName: string }) => `${p.name} ${p.lastName}`;

/** Moderación de reseñas de la sede (patrón `manage-reviews` de Materio sobre `DataTable`). */
export default function ReviewsModerationView() {
  const queryClient = useQueryClient();
  const [visibility, setVisibility] = useState<Visibility>('all');
  const [rating, setRating] = useState<number | ''>('');
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [page, setPage] = useState<DataTablePagination>({ pageIndex: 0, pageSize: 10 });
  const [target, setTarget] = useState<Review | null>(null);

  const params: ReviewModerationParams = {
    ...(visibility !== 'all' ? { isVisible: visibility === 'visible' } : {}),
    ...(rating !== '' ? { rating } : {}),
    ...(doctorId !== '' ? { doctorId } : {}),
    currentPage: page.pageIndex + 1,
    pageSize: page.pageSize,
  };

  const reviews = useQuery({
    queryKey: ['reviews', 'moderation', params],
    queryFn: () => reviewsService.listForModeration(params),
    placeholderData: keepPreviousData,
  });
  // Los agregados siguen el filtro de médico; estado y calificación solo acotan la tabla.
  const stats = useQuery({
    queryKey: ['reviews', 'moderation', 'stats', doctorId],
    queryFn: () => reviewsService.getStats(doctorId !== '' ? { doctorId } : {}),
    placeholderData: keepPreviousData,
  });
  const doctors = useQuery({
    queryKey: ['reviews', 'moderation', 'doctors'],
    queryFn: async () => (await doctorsService.findAllPaginated({ pageSize: 100, currentPage: 1 })).rows,
    staleTime: 5 * 60_000,
  });

  const toggle = useMutation({
    mutationFn: (review: Review) => reviewsService.setVisibility(review.id, !review.isVisible),
    onSuccess: (updated) => {
      notify(updated.isVisible ? 'Reseña visible' : 'Reseña ocultada');
      void queryClient.invalidateQueries({ queryKey: ['reviews', 'moderation'] });
    },
    onError: (err) => notify(extractApiError(err, 'No se pudo cambiar la visibilidad').message, 'error'),
  });

  // Cambiar un filtro vuelve a la primera página.
  const filter = <T,>(set: (v: T) => void) => (value: T) => {
    set(value);
    setPage((p) => ({ ...p, pageIndex: 0 }));
  };

  const columns = useMemo<ColumnDef<Review>[]>(
    () => [
      {
        id: 'patient',
        header: 'Paciente',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <CustomAvatar skin='light' color='primary' size={34}>
              {getInitials(fullName(row.original.patient))}
            </CustomAvatar>
            <Typography color='text.primary' className='font-medium'>
              {fullName(row.original.patient)}
            </Typography>
          </div>
        ),
      },
      { id: 'doctor', header: 'Médico', meta: { hiddenOnMobile: true }, cell: ({ row }) => fullName(row.original.doctor) },
      {
        id: 'rating',
        header: 'Calificación',
        cell: ({ row }) => <Rating value={row.original.rating} readOnly size='small' getLabelText={(v) => `${v} de 5 estrellas`} />,
      },
      {
        id: 'comment',
        header: 'Comentario',
        meta: { hiddenOnMobile: true },
        cell: ({ row }) => (
          <Typography variant='body2' className='max-is-[320px] whitespace-normal'>
            {row.original.comment ?? 'Sin comentario'}
          </Typography>
        ),
      },
      { id: 'createdAt', header: 'Fecha', meta: { hiddenOnMobile: true }, cell: ({ row }) => formatDate(row.original.createdAt) },
      {
        id: 'visibility',
        header: 'Estado',
        cell: ({ row }) => (
          <Chip size='small' variant='tonal' color={row.original.isVisible ? 'success' : 'secondary'} label={row.original.isVisible ? 'Visible' : 'Reseña oculta'} />
        ),
      },
      {
        id: 'actions',
        header: 'Acción',
        cell: ({ row: { original: r } }) => (
          <Button
            size='small'
            variant='outlined'
            onClick={() => setTarget(r)}
            aria-label={`${r.isVisible ? 'Ocultar' : 'Mostrar'} la reseña de ${fullName(r.patient)}`}
            startIcon={<i className={r.isVisible ? 'ri-eye-off-line' : 'ri-eye-line'} aria-hidden />}
          >
            {r.isVisible ? 'Ocultar' : 'Mostrar'}
          </Button>
        ),
      },
    ],
    [],
  );

  const hiding = target?.isVisible ?? true;

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Reseñas
        </Typography>
        <Typography color='text.secondary'>Reseñas de los médicos de la sede. Una reseña oculta no se muestra ni cuenta en la calificación del médico.</Typography>
      </div>
      <div className='grid gap-6 lg:grid-cols-2'>
        <TotalReviews stats={stats.data} loading={stats.isLoading} />
        <ReviewsStatistics stats={stats.data} loading={stats.isLoading} />
      </div>
      <Card>
        <div className='flex flex-wrap items-center gap-4 p-5'>
          <TextField select size='small' id='resenas-estado' label='Estado' value={visibility} onChange={(e) => filter(setVisibility)(e.target.value as Visibility)} className='is-40'>
            <MenuItem value='all'>Todas</MenuItem>
            <MenuItem value='visible'>Visibles</MenuItem>
            <MenuItem value='hidden'>Ocultas</MenuItem>
          </TextField>
          <TextField
            select
            size='small'
            id='resenas-calificacion'
            label='Calificación'
            value={rating}
            onChange={(e) => filter(setRating)(e.target.value === '' ? '' : Number(e.target.value))}
            className='is-44'
          >
            <MenuItem value=''>Todas</MenuItem>
            {[5, 4, 3, 2, 1].map((n) => (
              <MenuItem key={n} value={n}>
                {n} {n === 1 ? 'estrella' : 'estrellas'}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size='small'
            id='resenas-medico'
            label='Médico'
            value={doctorId}
            onChange={(e) => filter(setDoctorId)(e.target.value === '' ? '' : Number(e.target.value))}
            className='is-60'
          >
            <MenuItem value=''>Todos</MenuItem>
            {(doctors.data ?? []).map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.profile.name} {d.profile.lastName}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <Divider />
        {reviews.error && (
          <Alert severity='error' className='m-5'>
            No se pudieron cargar las reseñas. Vuelve a intentarlo.
          </Alert>
        )}
        <DataTable
          label='Reseñas'
          columns={columns}
          rows={reviews.data?.rows ?? []}
          totalRows={reviews.data?.totalRows ?? 0}
          isLoading={reviews.isLoading}
          pagination={page}
          onPaginationChange={setPage}
          emptyMessage='No hay reseñas con estos filtros.'
        />
      </Card>
      <ConfirmDialog
        open={!!target}
        title={hiding ? 'Ocultar la reseña' : 'Mostrar la reseña'}
        description={
          target
            ? hiding
              ? `La reseña de ${fullName(target.patient)} deja de mostrarse y de contar en la calificación de ${fullName(target.doctor)}.`
              : `La reseña de ${fullName(target.patient)} vuelve a mostrarse y a contar en la calificación de ${fullName(target.doctor)}.`
            : undefined
        }
        confirmLabel={hiding ? 'Ocultar' : 'Mostrar'}
        destructive={false}
        onCancel={() => setTarget(null)}
        onConfirm={() => {
          if (target) toggle.mutate(target);
          setTarget(null);
        }}
      />
    </div>
  );
}
