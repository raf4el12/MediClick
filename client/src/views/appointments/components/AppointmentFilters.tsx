'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTheme, alpha } from '@mui/material/styles';
import { DebouncedInput } from '@/components/shared/DebouncedInput';
import { AppointmentStatus } from '../types';

interface AppointmentFiltersProps {
  onSearch: (value: string) => void;
  onAddClick: () => void;
  totalAppointments: number;
  filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: AppointmentStatus;
  };
  onFilterChange: (updates: Record<string, string | undefined>) => void;
}

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: AppointmentStatus.PENDING, label: 'Pendiente' },
  { value: AppointmentStatus.CONFIRMED, label: 'Confirmada' },
  { value: AppointmentStatus.IN_PROGRESS, label: 'En progreso' },
  { value: AppointmentStatus.COMPLETED, label: 'Completada' },
  { value: AppointmentStatus.CANCELLED, label: 'Cancelada' },
  { value: AppointmentStatus.NO_SHOW, label: 'No asistió' },
];

export function AppointmentFilters({
  onSearch,
  onAddClick,
  totalAppointments,
  filters,
  onFilterChange,
}: AppointmentFiltersProps) {
  const theme = useTheme();

  const stats = [
    {
      label: 'Total citas',
      value: totalAppointments,
      icon: 'ri-calendar-check-line',
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.1),
    },
  ];

  return (
    <Box sx={{ mb: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Citas Médicas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión y seguimiento de citas médicas
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<i className="ri-add-line" />}
          onClick={onAddClick}
        >
          Nueva Cita
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
            <Card
              variant="outlined"
              sx={{
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: stat.bgColor,
                  color: stat.color,
                  flexShrink: 0,
                }}
              >
                <i className={stat.icon} style={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Table Header with Search and Filters */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Listado de Citas
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            type="date"
            size="small"
            label="Desde"
            value={filters.dateFrom ?? ''}
            onChange={(e) =>
              onFilterChange({ dateFrom: e.target.value || undefined })
            }
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 150 }}
          />

          <TextField
            type="date"
            size="small"
            label="Hasta"
            value={filters.dateTo ?? ''}
            onChange={(e) =>
              onFilterChange({ dateTo: e.target.value || undefined })
            }
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 150 }}
          />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={filters.status ?? ''}
              onChange={(e) =>
                onFilterChange({
                  status: e.target.value || undefined,
                })
              }
              displayEmpty
            >
              {statusOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <DebouncedInput
            placeholder="Buscar..."
            onChange={onSearch}
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <i
                  className="ri-search-line"
                  style={{
                    fontSize: 18,
                    marginRight: 8,
                    color: theme.palette.text.secondary,
                  }}
                />
              ),
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
