'use client';

import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';
import { LoginForm } from './LoginForm';

const LoginView = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
      }}
    >
      {/* Left panel - Hero image */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Image
          src="/images/login-hero.jpg"
          alt=""
          fill
          style={{ objectFit: 'cover' }}
          priority
          unoptimized={true}
        />
        {/* Dark overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.75)} 0%, ${alpha(theme.palette.primary.main, 0.55)} 50%, ${alpha('#000', 0.45)} 100%)`,
          }}
        />

        {/* Content over image */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            p: 6,
            color: 'common.white',
          }}
        >
          <Box sx={{ maxWidth: 480 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 6 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.2),
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i
                  className="ri-heart-pulse-line"
                  style={{ fontSize: 28, color: '#fff' }}
                />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
                MediClick
              </Typography>
            </Box>

            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, lineHeight: 1.2 }}>
              Tu plataforma médica integral
            </Typography>
            <Typography
              variant="body1"
              sx={{ opacity: 0.85, lineHeight: 1.7 }}
            >
              Optimiza la gestión de tu consultorio con herramientas diseñadas para
              profesionales de la salud.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right panel - Login Form */}
      <Box
        sx={{
          flex: { xs: 1, md: '0 0 520px' },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          position: 'relative',
        }}
      >
        {/* Back button */}
        <Box sx={{ p: 2 }}>
          <IconButton
            component={Link}
            href="/"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
              },
            }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: 22 }} />
          </IconButton>
        </Box>

        {/* Form centered */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 3, sm: 6 },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: 420,
              p: { xs: 3, sm: 5 },
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3.5,
                  bgcolor: 'primary.main',
                  display: { xs: 'flex', md: 'none' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <i
                  className="ri-heart-pulse-line"
                  style={{ fontSize: 28, color: '#fff' }}
                />
              </Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Iniciar Sesión
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ingresa tus credenciales para acceder al sistema
              </Typography>
            </Box>

            <LoginForm />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginView;
