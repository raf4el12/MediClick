'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Pagination from '@mui/material/Pagination';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { alpha } from '@mui/material/styles';
import { paymentsService } from '@/services/payments.service';
import type { PaginatedPayments, PaymentStatus, PaymentQueryParams } from './types';

const PAGE_SIZE = 20;

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  PAID:      { label: 'Pagado',    color: '#10b981' },
  PENDING:   { label: 'Pendiente', color: '#f59e0b' },
  PARTIAL:   { label: 'Parcial',   color: '#6366f1' },
  REFUNDED:  { label: 'Reembolso', color: '#3b82f6' },
  FAILED:    { label: 'Fallido',   color: '#ef4444' },
  CANCELLED: { label: 'Cancelado', color: '#6b7280' },
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CREDIT_CARD: 'Tarjeta crédito',
  DEBIT_CARD: 'Tarjeta débito',
  TRANSFER: 'Transferencia',
  INSURANCE: 'Seguro',
  OTHER: 'Otro',
};

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PaymentsView() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [data, setData] = useState<PaginatedPayments | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: PaymentQueryParams = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const res = await paymentsService.listPayments(params);
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as PaymentStatus | '');
    setPage(1);
  };

  const transactions = data?.data ?? [];

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
            }}
          >
            <i className="ri-bank-card-line" style={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Pagos</Typography>
            <Typography variant="body2" color="text.secondary">
              {data ? `${data.total} transacciones` : 'Cargando...'}
            </Typography>
          </Box>
        </Box>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Estado</InputLabel>
          <Select
            label="Estado"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {(Object.keys(STATUS_CONFIG) as PaymentStatus[]).map((s) => (
              <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Table card */}
      <Card
        sx={{
          borderRadius: '12px',
          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.04)',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        {/* Column headers */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr 120px 140px 120px 120px',
            px: 3,
            py: 1.5,
            bgcolor: 'action.hover',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {['#Cita', 'Pagador', 'Monto', 'Método', 'Estado', 'Fecha'].map((h) => (
            <Typography key={h} variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {h}
            </Typography>
          ))}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={32} />
          </Box>
        ) : transactions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <i className="ri-bank-card-line" style={{ fontSize: 56, opacity: 0.15 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600} sx={{ mt: 2 }}>
              Sin transacciones
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              {statusFilter ? 'No hay pagos con ese estado' : 'Aún no hay pagos registrados'}
            </Typography>
          </Box>
        ) : (
          transactions.map((tx, idx) => {
            const cfg = STATUS_CONFIG[tx.status] ?? { label: tx.status, color: '#6b7280' };
            return (
              <Box key={tx.id}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 120px 140px 120px 120px',
                    px: 3,
                    py: 1.75,
                    alignItems: 'center',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 150ms',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    #{tx.appointmentId}
                  </Typography>
                  <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.payerEmail ?? '—'}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatAmount(tx.amount, tx.currency)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tx.paymentMethod ? (METHOD_LABELS[tx.paymentMethod] ?? tx.paymentMethod) : '—'}
                  </Typography>
                  <Chip
                    label={cfg.label}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      bgcolor: alpha(cfg.color, 0.1),
                      color: cfg.color,
                      border: 'none',
                      width: 'fit-content',
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(tx.createdAt)}
                  </Typography>
                </Box>
                {idx < transactions.length - 1 && <Divider />}
              </Box>
            );
          })
        )}

        {data && data.totalPages > 1 && (
          <>
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Pagination
                count={data.totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
                shape="rounded"
                size="small"
              />
            </Box>
          </>
        )}
      </Card>
    </Box>
  );
}
