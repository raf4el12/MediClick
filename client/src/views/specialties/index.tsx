'use client';

import Grid from '@mui/material/Grid';
import { useSpecialties } from './hooks/useSpecialties';
import { SpecialtiesTable } from './components/SpecialtiesTable';

export default function SpecialtiesView() {
  const controller = useSpecialties();

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <SpecialtiesTable {...controller} />
      </Grid>
    </Grid>
  );
}
