'use client';

import type { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import AppRecharts from '@/libs/styles/AppRecharts';

export const CHART_HEIGHT = 280;

interface ChartCardProps {
  title: string;
  subheader?: ReactNode;
  loading: boolean;
  empty: boolean;
  /**
   * Descripción del gráfico para lectores de pantalla: el SVG se expone como una imagen con este
   * nombre, porque sus barras y sectores no son legibles por sí solos.
   */
  description: string;
  children: ReactNode;
}

/** Tarjeta de gráfico de Materio (recharts + `AppRecharts`) con carga, vacío y nombre accesible. */
export default function ChartCard({ title, subheader, loading, empty, description, children }: ChartCardProps) {
  return (
    <Card className='bs-full'>
      <CardHeader title={title} subheader={subheader} />
      <CardContent>
        {loading ? (
          <Skeleton variant='rounded' height={CHART_HEIGHT} />
        ) : empty ? (
          <div className='flex items-center justify-center' style={{ blockSize: CHART_HEIGHT }}>
            <Typography color='text.secondary'>Sin datos para este período</Typography>
          </div>
        ) : (
          <AppRecharts role='img' aria-label={description} style={{ blockSize: CHART_HEIGHT }}>
            {children}
          </AppRecharts>
        )}
      </CardContent>
    </Card>
  );
}
