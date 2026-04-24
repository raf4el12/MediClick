'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { StatusBadge } from '@/@core/components/mui/StatusBadge';
import { paymentsService } from '@/services/payments.service';
import type { PaymentStatus } from '@/views/payment/types';

type ChipColor = 'warning' | 'info' | 'primary' | 'success' | 'error' | 'default';

const PAYMENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: ChipColor }
> = {
  PENDING: { label: 'Pago pendiente', color: 'warning' },
  PAID: { label: 'Pagado', color: 'success' },
  PARTIAL: { label: 'Pago parcial', color: 'warning' },
  REFUNDED: { label: 'Reembolsado', color: 'default' },
  FAILED: { label: 'Pago fallido', color: 'error' },
  CANCELLED: { label: 'Pago cancelado', color: 'default' },
};

interface PaymentStatusBadgeProps {
  paymentStatus: PaymentStatus | string;
  /** ISO string del deadline. Si es null o expiró, no se muestra el botón de pago. */
  pendingUntil?: string | null;
  /** Requerido si `showActions` es true. */
  appointmentId?: number;
  /** Habilita los botones "Pagar ahora" / "Reintentar". Usar en la vista del paciente. */
  showActions?: boolean;
  size?: 'small' | 'medium';
}

/**
 * Badge de estado de pago de una cita.
 * Si `showActions` está activo y el estado permite pagar, muestra un botón
 * que genera una preference en Mercado Pago y redirige al checkout.
 */
export function PaymentStatusBadge({
  paymentStatus,
  pendingUntil,
  appointmentId,
  showActions = false,
  size = 'small',
}: PaymentStatusBadgeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config =
    PAYMENT_STATUS_CONFIG[paymentStatus] ??
    ({ label: paymentStatus, color: 'default' } as const);

  const canPayNow =
    showActions &&
    appointmentId != null &&
    (paymentStatus === 'PENDING' || paymentStatus === 'FAILED') &&
    (!pendingUntil || new Date(pendingUntil).getTime() > Date.now());

  const handlePay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!appointmentId) return;
    setLoading(true);
    setError(null);
    try {
      const preference = await paymentsService.createPreference(appointmentId);
      window.location.href = preference.initPoint;
    } catch (err: unknown) {
      const { extractApiError } = await import('@/utils/extractApiError');
      const { message } = extractApiError(err, 'No se pudo iniciar el pago.');
      setError(message);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <StatusBadge label={config.label} color={config.color} size={size} />
      {canPayNow && (
        <Tooltip title={error ?? ''} placement="top" arrow>
          <span>
            <Button
              size="small"
              variant="contained"
              color={paymentStatus === 'FAILED' ? 'error' : 'primary'}
              onClick={handlePay}
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <i
                    className={
                      paymentStatus === 'FAILED'
                        ? 'ri-refresh-line'
                        : 'ri-bank-card-line'
                    }
                  />
                )
              }
              sx={{ textTransform: 'none', py: 0.25, minHeight: 28 }}
            >
              {paymentStatus === 'FAILED' ? 'Reintentar' : 'Pagar ahora'}
            </Button>
          </span>
        </Tooltip>
      )}
    </Box>
  );
}
