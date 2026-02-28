'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';

const features = [
  {
    icon: 'ri-calendar-check-line',
    title: 'Gestión de Citas',
    description: 'Programa, modifica y administra citas médicas de forma rápida y eficiente.',
  },
  {
    icon: 'ri-user-heart-line',
    title: 'Historial Clínico',
    description: 'Accede al historial completo de tus pacientes en un solo lugar.',
  },
  {
    icon: 'ri-bar-chart-box-line',
    title: 'Reportes y Métricas',
    description: 'Visualiza estadísticas clave y genera reportes detallados.',
  },
  {
    icon: 'ri-medicine-bottle-line',
    title: 'Recetas Médicas',
    description: 'Crea y gestiona recetas médicas de manera digital y organizada.',
  },
  {
    icon: 'ri-time-line',
    title: 'Gestión de Horarios',
    description: 'Configura horarios y disponibilidad de doctores fácilmente.',
  },
  {
    icon: 'ri-group-line',
    title: 'Acceso Multi-rol',
    description: 'Roles diferenciados para administradores, doctores, pacientes y más.',
  },
];

const LandingView = () => {
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          bgcolor: alpha(theme.palette.background.default, 0.8),
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  bgcolor: theme.palette.primary.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="ri-heart-pulse-line" style={{ fontSize: 22, color: '#fff' }} />
              </Box>
              <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.3px' }}>
                MediClick
              </Typography>
            </Box>
            <Button
              component={Link}
              href="/login"
              variant="contained"
              size="small"
              sx={{ px: 3, borderRadius: 2 }}
            >
              Iniciar Sesión
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Hero */}
      <Box
        sx={{
          pt: { xs: 14, md: 18 },
          pb: { xs: 8, md: 12 },
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.primary.light} 100%)`,
          color: 'primary.contrastText',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.common.white, 0.06),
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 280,
            height: 280,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.common.white, 0.04),
          }}
        />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              mb: 2.5,
              lineHeight: 1.15,
              fontSize: { xs: '2rem', sm: '2.75rem', md: '3.5rem' },
              letterSpacing: '-0.5px',
            }}
          >
            Gestión médica simplificada
          </Typography>
          <Typography
            variant="h6"
            sx={{
              mb: 5,
              opacity: 0.85,
              fontWeight: 400,
              maxWidth: 560,
              mx: 'auto',
              lineHeight: 1.6,
              fontSize: { xs: '1rem', md: '1.15rem' },
            }}
          >
            Optimiza tu consultorio con una plataforma integral diseñada para profesionales de la
            salud. Citas, historiales, reportes y más en un solo lugar.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href="/login"
              variant="contained"
              size="large"
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2.5,
                bgcolor: 'common.white',
                color: 'primary.main',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.9),
                },
              }}
            >
              Comenzar
            </Button>
            <Button
              href="#features"
              variant="outlined"
              size="large"
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2.5,
                borderColor: alpha(theme.palette.common.white, 0.5),
                color: 'inherit',
                fontWeight: 600,
                '&:hover': {
                  borderColor: 'common.white',
                  bgcolor: alpha(theme.palette.common.white, 0.1),
                },
              }}
            >
              Conocer más
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features */}
      <Box
        id="features"
        sx={{
          py: { xs: 8, md: 12 },
          bgcolor: 'background.default',
          flex: 1,
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: 'center',
              mb: 1.5,
              letterSpacing: '-0.3px',
            }}
          >
            Todo lo que necesitas
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ textAlign: 'center', mb: 6, maxWidth: 520, mx: 'auto' }}
          >
            Herramientas diseñadas para optimizar cada aspecto de la gestión médica.
          </Typography>

          <Grid container spacing={3}>
            {features.map((feature) => (
              <Grid key={feature.title} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box
                  sx={{
                    p: 3.5,
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                    bgcolor: 'background.paper',
                    height: '100%',
                    transition: 'all 200ms ease',
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2.5,
                    }}
                  >
                    <i
                      className={feature.icon}
                      style={{ fontSize: 24, color: theme.palette.primary.main }}
                    />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA */}
      <Box
        sx={{
          py: { xs: 6, md: 8 },
          background: `linear-gradient(135deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'secondary.contrastText',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, mb: 2, letterSpacing: '-0.3px' }}
          >
            Comienza a gestionar tu consultorio hoy
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, opacity: 0.85 }}>
            Accede al sistema y descubre cómo MediClick puede transformar tu práctica médica.
          </Typography>
          <Button
            component={Link}
            href="/login"
            variant="contained"
            size="large"
            sx={{
              px: 5,
              py: 1.5,
              borderRadius: 2.5,
              bgcolor: 'common.white',
              color: 'secondary.main',
              fontWeight: 600,
              '&:hover': {
                bgcolor: alpha(theme.palette.common.white, 0.9),
              },
            }}
          >
            Acceder al Sistema
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          textAlign: 'center',
          bgcolor: 'background.paper',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} MediClick. Todos los derechos reservados.
        </Typography>
      </Box>
    </Box>
  );
};

export default LandingView;
