'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import { isAxiosError } from 'axios';
import { reviewsService } from '@/services/reviews.service';
import type { Review } from '@/views/reviews/types';

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  appointmentId: number;
  doctorName: string;
  onSubmitted: (review: Review) => void;
}

const MAX_COMMENT = 1000;

export function ReviewDialog({
  open,
  onClose,
  appointmentId,
  doctorName,
  onSubmitted,
}: ReviewDialogProps) {
  const [rating, setRating] = useState<number | null>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setRating(0);
    setComment('');
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!rating) {
      setError('Selecciona una calificación de 1 a 5 estrellas.');

      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const review = await reviewsService.create({
        appointmentId,
        rating,
        comment: comment.trim() || undefined,
      });

      reset();
      onSubmitted(review);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError('Ya dejaste una reseña para esta cita.');
      } else {
        setError('No se pudo enviar la reseña. Intenta de nuevo.');
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Calificar atención
        <IconButton size="small" aria-label="Cerrar" onClick={handleClose} disabled={submitting}>
          <i className="ri-close-line" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          ¿Cómo fue tu consulta con Dr. {doctorName}?
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Rating
            value={rating}
            onChange={(_, value) => setRating(value)}
            size="large"
          />
        </Box>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Comentario (opcional)"
          placeholder="Cuéntanos sobre tu experiencia"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          helperText={`${comment.length}/${MAX_COMMENT}`}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting || !rating}>
          {submitting ? 'Enviando...' : 'Enviar reseña'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
