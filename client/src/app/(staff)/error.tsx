'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function MenuError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 2,
        textAlign: 'center',
        px: 3,
      }}
    >
      <i className="ri-error-warning-line" style={{ fontSize: 64, color: '#ef4444' }} />
      <Typography variant="h5" fontWeight={600}>
        Algo salio mal
      </Typography>
      <Typography variant="body1" color="text.secondary" maxWidth={480}>
        Ocurrio un error inesperado. Puedes intentar recargar la pagina o volver al inicio.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <Button variant="contained" onClick={reset}>
          Reintentar
        </Button>
        <Button variant="outlined" href="/dashboard">
          Ir al inicio
        </Button>
      </Box>
    </Box>
  );
}
