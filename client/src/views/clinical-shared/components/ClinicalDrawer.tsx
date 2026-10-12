'use client';

import type { ReactNode } from 'react';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

interface ClinicalDrawerProps {
  open: boolean;
  /** Nombre accesible del drawer ("Notas clínicas", "Receta"). */
  label: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

/** Drawer lateral derecho (patrón `AddUserDrawer` de Materio); en celular ocupa la pantalla. */
export default function ClinicalDrawer({ open, label, title, subtitle, onClose, children }: ClinicalDrawerProps) {
  return (
    <Drawer
      open={open}
      anchor='right'
      onClose={onClose}
      slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-label': label, className: 'is-full sm:is-[480px]' } }}
    >
      <div className='flex items-start justify-between gap-2 pli-5 plb-4'>
        <div className='min-is-0'>
          <Typography variant='h5' component='h2'>
            {title}
          </Typography>
          {subtitle && <Typography color='text.secondary'>{subtitle}</Typography>}
        </div>
        <IconButton size='small' aria-label='Cerrar' onClick={onClose}>
          <i className='ri-close-line text-2xl' aria-hidden />
        </IconButton>
      </div>
      <Divider />
      <div className='p-5'>{children}</div>
    </Drawer>
  );
}
