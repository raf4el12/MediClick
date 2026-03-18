'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

interface ClinicFiltersProps {
  onSearch: (value: string) => void;
  onAddClick: () => void;
}

export function ClinicFilters({ onSearch, onAddClick }: ClinicFiltersProps) {
  const [searchValue, setSearchValue] = useState('');

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        mb: 3,
        flexWrap: 'wrap',
      }}
    >
      <TextField
        size="small"
        placeholder="Buscar sedes..."
        value={searchValue}
        onChange={(e) => {
          setSearchValue(e.target.value);
          onSearch(e.target.value);
        }}
        sx={{ minWidth: 250 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <i className="ri-search-line" style={{ fontSize: 18 }} />
              </InputAdornment>
            ),
          },
        }}
      />
      <Button
        variant="contained"
        startIcon={<i className="ri-add-line" />}
        onClick={onAddClick}
      >
        Nueva Sede
      </Button>
    </Box>
  );
}
