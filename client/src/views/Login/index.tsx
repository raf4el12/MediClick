'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';
import { LoginForm } from './LoginForm';

const features = [
  {
    icon: 'ri-calendar-check-line',
    title: 'Gestión de Citas',
    description: 'Administra y organiza citas médicas de forma eficiente.',
  },
  {
    icon: 'ri-user-heart-line',
    title: 'Historial Clínico',
    description: 'Accede al historial completo de tus pacientes.',
  },
  {
    icon: 'ri-bar-chart-box-line',
    title: 'Reportes y Métricas',
    description: 'Visualiza estadísticas y genera reportes detallados.',
  },
];

const LoginView = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
      }}
    >
      {/* Left panel - Branding */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.primary.light} 100%)`,
          color: 'primary.contrastText',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.common.white, 0.06),
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 220,
            height: 220,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.common.white, 0.04),
          }}
        />

        <Box sx={{ maxWidth: 480, position: 'relative', zIndex: 1 }}>
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
            sx={{ mb: 6, opacity: 0.85, lineHeight: 1.7 }}
          >
            Optimiza la gestión de tu consultorio con herramientas diseñadas para
            profesionales de la salud.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {features.map((feature) => (
              <Box
                key={feature.title}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.1),
                  backdropFilter: 'blur(4px)',
                  border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                  transition: 'all 200ms ease',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.common.white, 0.15),
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.common.white, 0.2),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i
                    className={feature.icon}
                    style={{ fontSize: 22, color: '#fff' }}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.25 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, fontSize: '0.8125rem' }}>
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right panel - Login Form */}
      <Box
        sx={{
          flex: { xs: 1, md: '0 0 520px' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
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
  );
};

export default LoginView;
