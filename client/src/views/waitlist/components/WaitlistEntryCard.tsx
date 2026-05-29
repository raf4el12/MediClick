'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { TIME_PREFERENCE_LABELS } from '../functions/waitlist.schema';
import { WaitlistEntryStatus, type WaitlistEntry } from '../types';

interface WaitlistEntryCardProps {
  entry: WaitlistEntry;
  onLeave: (entryId: number) => void;
  leaving: boolean;
}

const STATUS_CONFIG: Record<
  WaitlistEntryStatus,
  { label: string; color: 'success' | 'info' | 'default' | 'warning' }
> = {
  [WaitlistEntryStatus.ACTIVE]: { label: 'En espera', color: 'success' },
  [WaitlistEntryStatus.FULFILLED]: { label: 'Cumplida', color: 'info' },
  [WaitlistEntryStatus.CANCELLED]: { label: 'Cancelada', color: 'default' },
  [WaitlistEntryStatus.EXPIRED]: { label: 'Expirada', color: 'warning' },
};

function formatRange(dateFrom: string, dateTo: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' };
  const from = new Date(dateFrom).toLocaleDateString('es-PE', opts);
  const to = new Date(dateTo).toLocaleDateString('es-PE', opts);
  return `${from} – ${to}`;
}

export function WaitlistEntryCard({ entry, onLeave, leaving }: WaitlistEntryCardProps) {
  const status = STATUS_CONFIG[entry.status];
  const isActive = entry.status === WaitlistEntryStatus.ACTIVE;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: 'primary.lighter',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <i className="ri-stethoscope-line" style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {entry.specialtyName}
            </Typography>
            <Chip label={status.label} color={status.color} size="small" />
          </Box>
          <Typography variant="caption" color="text.secondary" display="block">
            <i className="ri-calendar-line" style={{ fontSize: 13, marginRight: 4 }} />
            {formatRange(entry.dateFrom, entry.dateTo)}
            {' · '}
            {TIME_PREFERENCE_LABELS[entry.timePreference]}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            <i className="ri-user-heart-line" style={{ fontSize: 13, marginRight: 4 }} />
            {entry.doctorName ?? 'Cualquier doctor'}
          </Typography>
        </Box>

        {isActive && (
          <Button
            color="error"
            size="small"
            onClick={() => onLeave(entry.id)}
            disabled={leaving}
            startIcon={leaving ? <CircularProgress size={16} /> : <i className="ri-logout-box-line" />}
            sx={{ flexShrink: 0 }}
          >
            Salir
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
