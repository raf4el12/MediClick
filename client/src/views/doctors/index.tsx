'use client';

import Grid from '@mui/material/Grid';
import { useDoctors } from './hooks/useDoctors';
import { DoctorsTable } from './components/DoctorsTable';
import { DoctorDetailDialog } from './components/DoctorDetailDialog';

export default function DoctorsView() {
  const controller = useDoctors();

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DoctorsTable {...controller} />
      </Grid>

      <DoctorDetailDialog
        doctor={controller.detailDoctor}
        onClose={controller.closeDetail}
      />
    </Grid>
  );
}
