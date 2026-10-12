'use client';

import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LinkButton from '@/components/shared/LinkButton';
import { DataTable, type DataTablePagination } from '@/components/shared/DataTable';
import { paymentsService } from '@/services/payments.service';
import { formatPrice } from '@/views/booking/format';
import type { PaymentQueryParams, PaymentStatus, Transaction } from './types';

type ChipColor = 'success' | 'warning' | 'info' | 'secondary' | 'error';

/** Estado de una transacción de pago (no de la cita). */
const STATUS: Record<PaymentStatus, { label: string; color: ChipColor }> = {
  PAID: { label: 'Aprobada', color: 'success' },
  PENDING: { label: 'Pendiente', color: 'warning' },
  PARTIAL: { label: 'Seña', color: 'info' },
  REFUNDED: { label: 'Reembolsada', color: 'secondary' },
  FAILED: { label: 'Rechazada', color: 'error' },
  CANCELLED: { label: 'Cancelada', color: 'secondary' },
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito',
  TRANSFER: 'Transferencia',
  INSURANCE: 'Seguro',
  OTHER: 'Otro',
};

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const columns: ColumnDef<Transaction>[] = [
  {
    id: 'appointment',
    header: 'Cita',
    cell: ({ row }) => <Typography color='text.primary' className='font-medium'>#{row.original.appointmentId}</Typography>,
  },
  {
    id: 'payer',
    header: 'Pagador',
    cell: ({ row }) => row.original.payerEmail ?? '—',
  },
  {
    id: 'amount',
    header: 'Monto',
    meta: { align: 'right' },
    cell: ({ row }) => (
      <Typography color='text.primary' className='font-medium tabular-nums'>
        {formatPrice(row.original.amount, row.original.currency)}
      </Typography>
    ),
  },
  {
    id: 'method',
    header: 'Método',
    meta: { hiddenOnMobile: true },
    cell: ({ row }) => (row.original.paymentMethod ? (METHOD_LABELS[row.original.paymentMethod] ?? row.original.paymentMethod) : '—'),
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = STATUS[row.original.status] ?? { label: row.original.status, color: 'secondary' as const };
      return <Chip size='small' variant='tonal' color={status.color} label={status.label} />;
    },
  },
  {
    id: 'date',
    header: 'Fecha',
    meta: { hiddenOnMobile: true },
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    id: 'receipt',
    header: 'Comprobante',
    // Solo una transacción aprobada tiene comprobante; el documento lista todas las aprobadas de la cita.
    cell: ({ row }) =>
      row.original.status === 'PAID' ? (
        <LinkButton
          href={`/payments/${row.original.appointmentId}/comprobante`}
          size='small'
          variant='outlined'
          aria-label={`Ver comprobante de la cita #${row.original.appointmentId}`}
          startIcon={<i className='ri-file-text-line' aria-hidden />}
        >
          Ver
        </LinkButton>
      ) : (
        '—'
      ),
  },
];

/** Transacciones de pago de la sede (patrón `invoice/list` de Materio), solo para el personal. */
export default function PaymentsView() {
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pagination, setPagination] = useState<DataTablePagination>({ pageIndex: 0, pageSize: 10 });

  // El servidor acepta `limit` hasta 100: es el mayor tamaño de página ofrecido.
  const params = useMemo<PaymentQueryParams>(
    () => ({
      ...(status ? { status } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
    }),
    [status, dateFrom, dateTo, pagination],
  );

  const payments = useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentsService.listPayments(params),
    placeholderData: keepPreviousData,
  });

  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Pagos
        </Typography>
        <Typography color='text.secondary'>Transacciones de pago de las citas de la sede.</Typography>
      </div>
      <Card>
        <CardContent className='flex flex-wrap gap-4'>
          <TextField
            select
            id='pagos-estado'
            size='small'
            label='Estado'
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PaymentStatus | '');
              resetPage();
            }}
            className='is-full sm:is-48'
          >
            <MenuItem value=''>Todas</MenuItem>
            {(Object.keys(STATUS) as PaymentStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS[s].label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            id='pagos-desde'
            size='small'
            type='date'
            label='Desde'
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              resetPage();
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            className='is-full sm:is-44'
          />
          <TextField
            id='pagos-hasta'
            size='small'
            type='date'
            label='Hasta'
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              resetPage();
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            className='is-full sm:is-44'
          />
        </CardContent>
        {payments.isError && (
          <Alert severity='error' className='mli-5 mbe-4'>
            No se pudieron cargar las transacciones. Vuelve a intentarlo en unos minutos.
          </Alert>
        )}
        <DataTable
          label='Transacciones de pago'
          columns={columns}
          rows={payments.data?.data ?? []}
          totalRows={payments.data?.total ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageSizeOptions={[10, 25, 50, 100]}
          isLoading={payments.isLoading}
          emptyMessage={status || dateFrom || dateTo ? 'No hay transacciones con esos filtros.' : 'Todavía no hay transacciones de pago.'}
        />
      </Card>
    </div>
  );
}
