'use client';

import type { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import classnames from 'classnames';
import CustomAvatar from '@core/components/mui/Avatar';

type StatusColor = 'success' | 'error' | 'warning';

interface PaymentResultShellProps {
  color: StatusColor;
  icon: string;
  title: string;
  description: string;
  body?: ReactNode;
  actions: ReactNode;
}

/** Resultado de un pago con la presentación de la confirmación del checkout de Materio. */
export function PaymentResultShell({ color, icon, title, description, body, actions }: PaymentResultShellProps) {
  return (
    <main className='flex items-center justify-center min-bs-[100dvh] p-6'>
      <Card className='is-full max-is-[640px]'>
        <CardContent className='flex flex-col items-center text-center gap-5 sm:p-10'>
          <CustomAvatar color={color} skin='light' size={72} aria-hidden='true'>
            <i className={classnames(icon, 'text-4xl')} />
          </CustomAvatar>
          <div className='flex flex-col gap-2'>
            <Typography variant='h4' component='h1'>
              {title}
            </Typography>
            <Typography color='text.secondary' className='max-is-[52ch]'>
              {description}
            </Typography>
          </div>
          {body}
          <div className='flex flex-wrap justify-center gap-3'>{actions}</div>
        </CardContent>
      </Card>
    </main>
  );
}

/** Datos del pago en columnas con borde, como el resumen de la confirmación de Materio. */
export function PaymentDetails({ items }: { items: { icon: string; label: string; value: string }[] }) {
  return (
    <dl className='flex flex-col sm:flex-row is-full border rounded m-0'>
      {items.map((item) => (
        <div
          key={item.label}
          className='flex flex-col flex-1 gap-1 p-4 items-center sm:items-start max-sm:[&:not(:last-child)]:border-be sm:[&:not(:last-child)]:border-ie'
        >
          <Typography component='dt' variant='body2' color='text.secondary' className='flex items-center gap-2'>
            <i className={classnames(item.icon, 'text-lg')} aria-hidden='true' />
            {item.label}
          </Typography>
          <Typography component='dd' color='text.primary' className='m-0 font-medium break-all'>
            {item.value}
          </Typography>
        </div>
      ))}
    </dl>
  );
}
