'use client';

import Grid from '@mui/material/Grid';
import { useCategories } from './hooks/useCategories';
import { CategoriesTable } from './components/CategoriesTable';

export default function CategoriesView() {
  const controller = useCategories();

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <CategoriesTable {...controller} />
      </Grid>
    </Grid>
  );
}
