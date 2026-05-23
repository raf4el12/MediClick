'use client';

import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import type { SelectChangeEvent } from '@mui/material/Select';
import { DebouncedInput } from '@/components/shared/DebouncedInput';
import type { Category } from '../types';

interface SpecialtyFiltersProps {
  categories: Category[];
  selectedCategory: number | undefined;
  onCategoryChange: (categoryId: number | undefined) => void;
  onSearch: (value: string) => void;
}

export function SpecialtyFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  onSearch,
}: SpecialtyFiltersProps) {
  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    onCategoryChange(value === 'all' ? undefined : Number(value));
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
      <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
        <InputLabel id="category-filter-label">
          Filtrar por Categoría
        </InputLabel>
        <Select
          labelId="category-filter-label"
          value={selectedCategory?.toString() ?? 'all'}
          onChange={handleCategoryChange}
          label="Filtrar por Categoría"
        >
          <MenuItem value="all">Todas</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id.toString()}>
              {cat.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <DebouncedInput
        placeholder="Buscar especialidades..."
        onChange={onSearch}
        sx={{ minWidth: { xs: '100%', sm: 250 } }}
      />
    </Box>
  );
}
