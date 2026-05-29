'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { PageHeader } from '@/components/shared/PageHeader';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';
import { extractApiError } from '@/utils/extractApiError';
import { waitlistService } from '@/services/waitlist.service';
import { paymentsService } from '@/services/payments.service';
import { JoinWaitlistDialog } from './components/JoinWaitlistDialog';
import { OfferCard } from './components/OfferCard';
import { WaitlistEntryCard } from './components/WaitlistEntryCard';
import { OFFERS_POLL_INTERVAL_MS } from './functions/waitlist.constants';
import { WaitlistEntryStatus } from './types';
import type { JoinWaitlistFormValues } from './functions/waitlist.schema';

export default function WaitlistView() {
  const queryClient = useQueryClient();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [pendingOfferId, setPendingOfferId] = useState<number | null>(null);

  const {
    data: entries = [],
    isLoading: loadingEntries,
    isError: entriesError,
  } = useQuery({
    queryKey: ['waitlist', 'my-entries'],
    queryFn: () => waitlistService.getMyEntries(),
    staleTime: 30 * 1000,
  });

  const { data: offers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ['waitlist', 'my-offers'],
    queryFn: () => waitlistService.getMyOffers(),
    refetchInterval: OFFERS_POLL_INTERVAL_MS,
    staleTime: 0,
  });

  const refetchAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['waitlist', 'my-entries'] });
    void queryClient.invalidateQueries({ queryKey: ['waitlist', 'my-offers'] });
  };

  const joinMutation = useMutation({
    mutationFn: (payload: JoinWaitlistFormValues) =>
      waitlistService.join({
        specialtyId: payload.specialtyId,
        doctorId: payload.doctorId,
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
        timePreference: payload.timePreference,
        notes: payload.notes || undefined,
      }),
    onSuccess: () => {
      setDialogOpen(false);
      setJoinError(null);
      showSnackbar('Te uniste a la lista de espera', 'success');
      void queryClient.invalidateQueries({ queryKey: ['waitlist', 'my-entries'] });
    },
    onError: (err) => {
      setJoinError(extractApiError(err, 'No se pudo unir a la lista de espera').message);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (entryId: number) => waitlistService.leave(entryId),
    onSuccess: () => {
      showSnackbar('Saliste de la lista de espera', 'success');
      void queryClient.invalidateQueries({ queryKey: ['waitlist', 'my-entries'] });
    },
    onError: (err) => {
      showSnackbar(extractApiError(err, 'No se pudo salir de la lista').message, 'error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (offerId: number) => waitlistService.rejectOffer(offerId),
    onSuccess: () => {
      showSnackbar('Oferta rechazada', 'info');
      refetchAll();
    },
    onError: (err) => {
      showSnackbar(extractApiError(err, 'No se pudo rechazar la oferta').message, 'error');
      refetchAll();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (offerId: number) => waitlistService.acceptOffer(offerId),
    onSuccess: async (result) => {
      setRedirecting(true);
      try {
        const preference = await paymentsService.createPreference(result.appointmentId);
        window.location.href = preference.initPoint;
      } catch (err) {
        setRedirecting(false);
        showSnackbar(
          extractApiError(err, 'La cita se reservó pero no se pudo iniciar el pago').message,
          'error',
        );
      }
    },
    onError: (err) => {
      const { message, status } = extractApiError(err, 'No se pudo aceptar la oferta');
      showSnackbar(
        status === 409 ? 'La oferta ya no está disponible' : message,
        'error',
      );
      refetchAll();
    },
  });

  const handleAccept = (offerId: number) => {
    setPendingOfferId(offerId);
    acceptMutation.mutate(offerId);
  };

  const handleReject = (offerId: number) => {
    setPendingOfferId(offerId);
    rejectMutation.mutate(offerId);
  };

  if (redirecting) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: 8 }}>
        <CircularProgress size={48} />
        <Typography variant="h6" fontWeight={600} textAlign="center">
          Redirigiendo a Mercado Pago…
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Tu cupo fue reservado. Te llevamos al checkout para completar el pago en los próximos 15 minutos.
        </Typography>
      </Box>
    );
  }

  const activeEntries = entries.filter((e) => e.status === WaitlistEntryStatus.ACTIVE);
  const pastEntries = entries.filter((e) => e.status !== WaitlistEntryStatus.ACTIVE);

  return (
    <Box>
      <PageHeader
        title="Lista de espera"
        subtitle="Te avisamos cuando se libere un cupo que coincida con lo que buscas"
      >
        <Button
          variant="contained"
          startIcon={<i className="ri-add-line" />}
          onClick={() => {
            setJoinError(null);
            setDialogOpen(true);
          }}
        >
          Unirme a la lista
        </Button>
      </PageHeader>

      {/* Ofertas vigentes */}
      {!loadingOffers && offers.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            Cupos disponibles para ti
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onAccept={handleAccept}
                onReject={handleReject}
                accepting={acceptMutation.isPending && pendingOfferId === offer.id}
                rejecting={rejectMutation.isPending && pendingOfferId === offer.id}
                onExpire={refetchAll}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Mis entradas */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
        Mis búsquedas activas
      </Typography>

      {loadingEntries ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={92} />
          ))}
        </Box>
      ) : entriesError ? (
        <Alert severity="error">No se pudieron cargar tus entradas en la lista de espera.</Alert>
      ) : activeEntries.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 2, borderStyle: 'dashed' }}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <i className="ri-time-line" style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
            <Typography variant="body1" fontWeight={600} sx={{ mt: 1 }}>
              No estás en ninguna lista de espera
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Únete a una para recibir un cupo en cuanto se libere.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {activeEntries.map((entry) => (
            <WaitlistEntryCard
              key={entry.id}
              entry={entry}
              onLeave={(id) => leaveMutation.mutate(id)}
              leaving={leaveMutation.isPending && leaveMutation.variables === entry.id}
            />
          ))}
        </Box>
      )}

      {/* Historial */}
      {pastEntries.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            Historial
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pastEntries.map((entry) => (
              <WaitlistEntryCard
                key={entry.id}
                entry={entry}
                onLeave={() => undefined}
                leaving={false}
              />
            ))}
          </Box>
        </Box>
      )}

      <JoinWaitlistDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={async (values) => {
          await joinMutation.mutateAsync(values);
        }}
        submitting={joinMutation.isPending}
        error={joinError}
      />

      <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
