'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useTheme, alpha } from '@mui/material/styles';
import { DebouncedInput } from '@/components/shared/DebouncedInput';

interface PatientFiltersProps {
  onSearch: (value: string) => void;
  onAddClick: () => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
  totalPatients: number;
  activeCount: number;
  inactiveCount: number;
}

export function PatientFilters({
  onSearch,
  onAddClick,
  statusFilter,
  onStatusFilterChange,
  totalPatients,
  activeCount,
  inactiveCount,
}: PatientFiltersProps) {
  const theme = useTheme();

  const stats = [
    {
      label: 'Total pacientes',
      value: totalPatients,
      icon: 'ri-group-line',
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.1),
    },
    {
      label: 'Activos',
      value: activeCount,
      icon: 'ri-checkbox-circle-line',
      color: theme.palette.success.main,
      bgColor: alpha(theme.palette.success.main, 0.1),
    },
    {
      label: 'Inactivos',
      value: inactiveCount,
      icon: 'ri-file-list-line',
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.1),
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
            Pacientes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Registro y gestión de pacientes
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<i className="ri-add-line" />}
          onClick={onAddClick}
        >
          Registrar Paciente
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

      {/* Table Header with Search and Filter */}
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
          Listado de Pacientes
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={statusFilter}
              onChange={(e) =>
                onStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')
              }
              displayEmpty
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="active">Activos</MenuItem>
              <MenuItem value="inactive">Inactivos</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
    </Box>
  );
}
