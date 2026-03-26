import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function NotFound() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
        textAlign: 'center',
        px: 3,
      }}
    >
      <Typography variant="h1" fontWeight={700} color="primary" sx={{ fontSize: 120, lineHeight: 1 }}>
        404
      </Typography>
      <Typography variant="h5" fontWeight={600}>
        Pagina no encontrada
      </Typography>
      <Typography variant="body1" color="text.secondary" maxWidth={480}>
        La pagina que buscas no existe o fue movida.
      </Typography>
      <Button variant="contained" href="/dashboard" sx={{ mt: 2 }}>
        Volver al inicio
      </Button>
    </Box>
  );
}
