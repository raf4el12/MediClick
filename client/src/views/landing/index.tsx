'use client';

import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useTheme, alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

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

const stats = [
  { value: '99.9%', label: 'Disponibilidad' },
  { value: '10k+', label: 'Citas gestionadas' },
  { value: '500+', label: 'Profesionales' },
  { value: '24/7', label: 'Soporte' },
];

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
  }),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const LandingView = () => {
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
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
              <Button component={Link} href="/login" variant="contained" size="small" sx={{ px: 3, borderRadius: 2 }}>
                Iniciar Sesión
              </Button>
            </Box>
          </Container>
        </Box>
      </motion.div>

      {/* ── Hero ── */}
      <Box
        sx={{
          pt: { xs: 12, md: 16 },
          pb: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background image */}
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Image src="/images/hero-landing.jpg" alt="" fill style={{ objectFit: 'cover' }} priority unoptimized={true} />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.85)} 0%, ${alpha(theme.palette.primary.main, 0.7)} 50%, ${alpha('#000', 0.5)} 100%)`,
            }}
          />
        </Box>

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            {/* Text */}
            <Grid size={{ xs: 12, md: 7 }}>
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 800,
                    mb: 2.5,
                    lineHeight: 1.1,
                    fontSize: { xs: '2rem', sm: '2.75rem', md: '3.5rem' },
                    letterSpacing: '-0.5px',
                    color: 'common.white',
                  }}
                >
                  Gestión médica simplificada
                </Typography>
              </motion.div>
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 4,
                    opacity: 0.85,
                    fontWeight: 400,
                    maxWidth: 520,
                    lineHeight: 1.6,
                    fontSize: { xs: '1rem', md: '1.15rem' },
                    color: 'common.white',
                  }}
                >
                  Optimiza tu consultorio con una plataforma integral diseñada para profesionales de
                  la salud. Citas, historiales, reportes y más en un solo lugar.
                </Typography>
              </motion.div>
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
                      '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.9) },
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
                      color: 'common.white',
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
              </motion.div>
            </Grid>

            {/* Stats card */}
            <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
                <Box
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    bgcolor: alpha(theme.palette.common.white, 0.12),
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${alpha(theme.palette.common.white, 0.15)}`,
                  }}
                >
                  <Grid container spacing={3}>
                    {stats.map((stat, i) => (
                      <Grid key={stat.label} size={6}>
                        <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={i + 4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography
                              variant="h4"
                              sx={{ fontWeight: 800, color: 'common.white', mb: 0.5 }}
                            >
                              {stat.value}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: alpha(theme.palette.common.white, 0.7) }}
                            >
                              {stat.label}
                            </Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Features ── */}
      <Box id="features" sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.default', flex: 1 }}>
        <Container maxWidth="lg">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} custom={0}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, textAlign: 'center', mb: 1.5, letterSpacing: '-0.3px' }}
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
          </motion.div>

          <Grid container spacing={3}>
            {features.map((feature, i) => (
              <Grid key={feature.title} size={{ xs: 12, sm: 6, md: 4 }}>
                <motion.div
                  variants={scaleIn}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  custom={i}
                  style={{ height: '100%' }}
                >
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
                        transform: 'translateY(-4px)',
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
                      <i className={feature.icon} style={{ fontSize: 24, color: theme.palette.primary.main }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {feature.description}
                    </Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── About / Image Section ── */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            {/* Image */}
            <Grid size={{ xs: 12, md: 6 }}>
              <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 4,
                    overflow: 'hidden',
                    aspectRatio: '1 / 1',
                    boxShadow: `0 20px 60px ${alpha('#000', 0.15)}`,
                  }}
                >
                  <Image
                    src="/images/doctors-team.jpg"
                    alt="Equipo médico profesional"
                    fill
                    style={{ objectFit: 'cover' }}
                    unoptimized={true}
                  />
                </Box>
              </motion.div>
            </Grid>

            {/* Text */}
            <Grid size={{ xs: 12, md: 6 }}>
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} custom={0}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, letterSpacing: '-0.3px' }}>
                  Diseñado por y para profesionales de la salud
                </Typography>
              </motion.div>
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} custom={1}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                  MediClick nace de la necesidad de simplificar los procesos administrativos en
                  consultorios y clínicas. Nuestra plataforma integra todas las herramientas que
                  necesitas para enfocarte en lo que realmente importa: tus pacientes.
                </Typography>
              </motion.div>
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} custom={2}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { icon: 'ri-shield-check-line', text: 'Seguridad y privacidad de datos garantizada' },
                    { icon: 'ri-speed-up-line', text: 'Interfaz rápida e intuitiva' },
                    { icon: 'ri-device-line', text: 'Accesible desde cualquier dispositivo' },
                  ].map((item) => (
                    <Box key={item.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <i className={item.icon} style={{ fontSize: 18, color: theme.palette.primary.main }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Showcase image ── */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center" direction={{ xs: 'column-reverse', md: 'row' }}>
            {/* Text */}
            <Grid size={{ xs: 12, md: 6 }}>
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} custom={0}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, letterSpacing: '-0.3px' }}>
                  Tecnología al servicio de la medicina
                </Typography>
              </motion.div>
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} custom={1}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                  Automatiza tareas repetitivas, reduce errores administrativos y mejora la
                  experiencia tanto de tu equipo médico como de tus pacientes con herramientas
                  modernas y confiables.
                </Typography>
              </motion.div>
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} custom={2}>
                <Button
                  component={Link}
                  href="/login"
                  variant="contained"
                  size="large"
                  sx={{ px: 4, py: 1.5, borderRadius: 2.5, fontWeight: 600 }}
                >
                  Explorar la plataforma
                </Button>
              </motion.div>
            </Grid>

            {/* Image */}
            <Grid size={{ xs: 12, md: 6 }}>
              <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 4,
                    overflow: 'hidden',
                    aspectRatio: '2 / 3',
                    maxHeight: 480,
                    boxShadow: `0 20px 60px ${alpha('#000', 0.15)}`,
                  }}
                >
                  <Image
                    src="/images/medical-tech.jpg"
                    alt="Tecnología médica moderna"
                    fill
                    style={{ objectFit: 'cover' }}
                    unoptimized={true}
                  />
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Box
        sx={{
          py: { xs: 8, md: 10 },
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          color: 'common.white',
          textAlign: 'center',
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -60,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.common.white, 0.06),
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.common.white, 0.04),
          }}
        />

        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} custom={0}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, letterSpacing: '-0.3px' }}>
              Comienza a gestionar tu consultorio hoy
            </Typography>
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} custom={1}>
            <Typography variant="body1" sx={{ mb: 4, opacity: 0.85 }}>
              Accede al sistema y descubre cómo MediClick puede transformar tu práctica médica.
            </Typography>
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} custom={2}>
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
                color: 'primary.main',
                fontWeight: 600,
                '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.9) },
              }}
            >
              Acceder al Sistema
            </Button>
          </motion.div>
        </Container>
      </Box>

      {/* ── Footer ── */}
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
