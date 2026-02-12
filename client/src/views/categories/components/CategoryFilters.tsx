'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { DebouncedInput } from '@/components/shared/DebouncedInput';

interface CategoryFiltersProps {
  onSearch: (value: string) => void;
  onAddClick: () => void;
}

export function CategoryFilters({
  onSearch,
  onAddClick,
}: CategoryFiltersProps) {
  return (
    <Box sx={{ mb: 4 }}>
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
            Categorías
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona las categorías de especialidades médicas
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<i className="ri-add-line" />}
          onClick={onAddClick}
        >
          Nueva Categoría
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <DebouncedInput
          placeholder="Buscar categorías..."
          onChange={onSearch}
          sx={{ minWidth: 250 }}
        />
      </Box>
    </Box>
  );
}
