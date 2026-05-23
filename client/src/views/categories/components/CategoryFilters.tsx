'use client';

import Box from '@mui/material/Box';
import { DebouncedInput } from '@/components/shared/DebouncedInput';

interface CategoryFiltersProps {
  onSearch: (value: string) => void;
}

export function CategoryFilters({ onSearch }: CategoryFiltersProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
      <DebouncedInput
        placeholder="Buscar categorías..."
        onChange={onSearch}
        sx={{ minWidth: 250 }}
      />
    </Box>
  );
}
