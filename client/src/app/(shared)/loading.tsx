import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export default function MenuLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
