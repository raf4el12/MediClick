'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Design tokens – Aligned with MediClick system palette (colorSchemes.ts)
// ---------------------------------------------------------------------------
const PRIMARY = '#2563EB';
const PRIMARY_DARK = '#1D4ED8';
const PRIMARY_LIGHT = '#EFF6FF';
const DARK = '#1B2537';
const GRAY_BODY = '#64748B';
const GRAY_LIGHT = '#F0F4F8';
const RADIUS = '16px';
const RADIUS_PILL = '100px';

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: EASE_OUT },
  }),
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, delay: i * 0.1, ease: EASE_OUT },
  }),
};

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const features = [
  {
    icon: 'ri-calendar-check-line',
    title: 'Gestión de Citas Inteligente',
    desc: 'Flujo completo de citas desde PENDIENTE hasta COMPLETADA. Soporte de overbooking, generación automática de horarios, feriados y bloqueos de agenda.',
    color: PRIMARY,
    mockup: 'ehr',
  },
  {
    icon: 'ri-stethoscope-line',
    title: 'Workspace del Doctor',
    desc: 'Vista diaria de citas, notas clínicas con diagnóstico y plan de tratamiento, creación de recetas digitales descargables en PDF.',
    color: '#6366F1',
    mockup: 'cie10',
  },
  {
    icon: 'ri-user-heart-line',
    title: 'Portal del Paciente',
    desc: 'Reserva multi-paso: Categoría → Especialidad → Doctor → Horario → Slot. Acceso a recetas, notas clínicas y expediente clínico propio.',
    color: '#F59E0B',
    mockup: 'calendar',
  },
  {
    icon: 'ri-capsule-line',
    title: 'Recetas y Expediente Clínico',
    desc: 'Genera recetas en PDF con datos detallados (medicamento, dosis, frecuencia). Expediente clínico consolidado con GraphQL para consultas profundas.',
    color: '#EC4899',
    mockup: 'prescription',
  },
];

const testimonials = [
  {
    text: 'Desde que usamos MediClick, el flujo de citas es impecable. Mis pacientes reservan solos desde el portal y yo solo me enfoco en atenderlos. Las recetas en PDF son un plus increíble.',
    name: 'Dr. Andrés Gutiérrez',
    clinic: 'Clínica Salud Integral',
    avatar: 'A',
  },
  {
    text: 'La gestión multi-sede nos cambió la vida. Administrar dos clínicas con horarios, doctores y pacientes distintos desde un solo panel es exactamente lo que necesitábamos.',
    name: 'Dra. María Fernández',
    clinic: 'Centro Médico Vitalis',
    avatar: 'M',
  },
  {
    text: 'Como recepcionista, puedo gestionar la agenda, registrar pacientes y ver los pagos pendientes sin depender de nadie. La interfaz es rapidísima y muy intuitiva.',
    name: 'Laura Méndez',
    clinic: 'MediCenter Lima',
    avatar: 'L',
  },
];

const plans = [
  {
    name: 'Starter',
    price: '19',
    period: '/mes',
    description: 'Ideal para consultorios independientes',
    features: ['1 sede / clínica', 'Hasta 2 doctores', 'Gestión de citas completa', 'Portal del paciente', 'Recetas en PDF', 'Notificaciones por email'],
    cta: 'Empieza gratis',
    highlighted: false,
  },
  {
    name: 'Profesional',
    price: '49',
    period: '/mes',
    description: 'Para clínicas en crecimiento',
    features: ['Todo lo de Starter', 'Hasta 3 sedes', 'Doctores ilimitados', 'Notas clínicas avanzadas', 'Dashboard de analítica', 'Expediente clínico (GraphQL)', 'Roles PBAC personalizables'],
    cta: 'Comenzar ahora',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '99',
    period: '/mes',
    description: 'Centros médicos y redes de salud',
    features: ['Todo lo de Profesional', 'Sedes ilimitadas', 'API REST + GraphQL', 'Soporte multi-timezone', 'Reportes avanzados', 'Onboarding dedicado', 'SLA garantizado'],
    cta: 'Contactar ventas',
    highlighted: false,
  },
];

const roles = [
  {
    icon: 'ri-shield-user-line',
    title: 'Administrador',
    desc: 'Control total: gestión de clínicas, usuarios, doctores, disponibilidad, feriados, bloqueos y reportes de analítica.',
    color: PRIMARY,
  },
  {
    icon: 'ri-stethoscope-line',
    title: 'Doctor',
    desc: 'Workspace con citas del día, creación de notas clínicas y recetas. Dashboard personal con métricas propias.',
    color: '#6366F1',
  },
  {
    icon: 'ri-customer-service-2-line',
    title: 'Recepcionista',
    desc: 'Gestiona pacientes, administra la agenda de citas y coordina el flujo diario de la clínica.',
    color: '#F59E0B',
  },
  {
    icon: 'ri-user-heart-line',
    title: 'Paciente',
    desc: 'Reserva citas por especialidad, accede a su expediente clínico, descarga recetas en PDF y gestiona su perfil.',
    color: '#EC4899',
  },
];

// ---------------------------------------------------------------------------
// Mockup Components (CSS-only faux-UI)
// ---------------------------------------------------------------------------
const EhrMockup = () => {
  return (
    <Box sx={{ p: 0, borderRadius: RADIUS, bgcolor: '#fff', border: `1px solid ${alpha('#000', 0.08)}`, boxShadow: `0 24px 48px -12px ${alpha('#000', 0.1)}`, overflow: 'hidden' }}>
      {/* Top bar */}
      <Box sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${alpha('#000', 0.06)}`, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {['#FF5F56', '#FFBD2E', '#27C93F'].map(c => <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />)}
        </Box>
        <Box sx={{ flex: 1, ml: 2, height: 24, borderRadius: 12, bgcolor: alpha('#000', 0.04) }} />
      </Box>
      {/* Content */}
      <Box sx={{ display: 'flex', minHeight: 300 }}>
        {/* Sidebar */}
        <Box sx={{ width: 180, borderRight: `1px solid ${alpha('#000', 0.06)}`, p: 2, display: { xs: 'none', sm: 'block' } }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
            <i className="ri-heart-pulse-line" style={{ fontSize: 20, color: '#fff' }} />
          </Box>
          {['Dashboard', 'Citas', 'Pacientes', 'Doctores', 'Reportes'].map((item, i) => (
            <Box key={item} sx={{ py: 1, px: 1.5, borderRadius: 2, mb: 0.5, bgcolor: i === 1 ? alpha(PRIMARY, 0.1) : 'transparent', color: i === 1 ? PRIMARY : GRAY_BODY, fontSize: '0.8rem', fontWeight: i === 1 ? 700 : 500, cursor: 'pointer' }}>
              {item}
            </Box>
          ))}
        </Box>
        {/* Main area */}
        <Box sx={{ flex: 1, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: alpha(PRIMARY, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY, fontWeight: 800, fontSize: '1rem' }}>CL</Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: DARK }}>Clínica San Rafael</Typography>
                <Typography variant="caption" sx={{ color: GRAY_BODY }}>Hoy — 3 citas pendientes</Typography>
              </Box>
            </Box>
          </Box>
          <Grid container spacing={2}>
            <Grid size={6}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: GRAY_LIGHT }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Citas Hoy</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: DARK }}>12</Typography>
              </Box>
            </Grid>
            <Grid size={6}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: GRAY_LIGHT }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Completadas</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: DARK }}>8</Typography>
              </Box>
            </Grid>
            <Grid size={6}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: GRAY_LIGHT }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Doctores Activos</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: DARK }}>5</Typography>
              </Box>
            </Grid>
            <Grid size={6}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: GRAY_LIGHT }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Ocupación</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: DARK }}>87%</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

const Cie10Mockup = () => (
  <Box sx={{ p: 3, borderRadius: RADIUS, bgcolor: '#fff', border: `1px solid ${alpha('#000', 0.08)}`, boxShadow: `0 24px 48px -12px ${alpha('#000', 0.1)}` }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: DARK }}>Citas del día — Dr. Gutiérrez</Typography>
      <Chip label="EN PROGRESO" size="small" sx={{ bgcolor: alpha('#6366F1', 0.1), color: '#6366F1', fontWeight: 700, fontSize: '0.7rem' }} />
    </Box>
    {[
      { patient: 'Carlos Bravo', status: 'COMPLETADA', type: 'Consulta General', color: PRIMARY },
      { patient: 'Sofía Méndez', status: 'EN PROGRESO', type: 'Control prenatal', color: '#6366F1' },
      { patient: 'Roberto Carle', status: 'PENDIENTE', type: 'Ecografía', color: '#F59E0B' },
    ].map((apt, i) => (
      <Box key={i} sx={{ p: 2, borderRadius: 2, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: i === 1 ? alpha('#6366F1', 0.05) : 'transparent', border: i === 1 ? `1px solid ${alpha('#6366F1', 0.15)}` : '1px solid transparent' }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: DARK, fontSize: '0.85rem' }}>{apt.patient}</Typography>
          <Typography variant="caption" sx={{ color: GRAY_BODY }}>{apt.type}</Typography>
        </Box>
        <Chip label={apt.status} size="small" sx={{ bgcolor: alpha(apt.color, 0.1), color: apt.color, fontWeight: 700, fontSize: '0.65rem' }} />
      </Box>
    ))}
  </Box>
);

const CalendarMockup = () => (
  <Box sx={{ p: 3, borderRadius: RADIUS, bgcolor: '#fff', border: `1px solid ${alpha('#000', 0.08)}`, boxShadow: `0 24px 48px -12px ${alpha('#000', 0.1)}` }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: DARK }}>Hoy — 15 Abril</Typography>
      <Chip label="3 citas" size="small" sx={{ bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B', fontWeight: 700 }} />
    </Box>
    {[
      { time: '09:00', patient: 'Carlos Bravo', type: 'Consulta General', color: PRIMARY },
      { time: '10:30', patient: 'Sofía Méndez', type: 'Control prenatal', color: '#EC4899' },
      { time: '14:00', patient: 'Roberto Carle', type: 'Ecografía', color: '#6366F1' },
    ].map((apt, i) => (
      <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'stretch' }}>
        <Typography variant="caption" sx={{ width: 40, pt: 1, fontWeight: 700, color: GRAY_BODY }}>{apt.time}</Typography>
        <Box sx={{ width: 3, borderRadius: 4, bgcolor: apt.color, flexShrink: 0 }} />
        <Box sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: alpha(apt.color, 0.06) }}>
          <Typography variant="body2" fontWeight={700} sx={{ color: DARK }}>{apt.patient}</Typography>
          <Typography variant="caption" sx={{ color: GRAY_BODY }}>{apt.type}</Typography>
        </Box>
      </Box>
    ))}
  </Box>
);

const PrescriptionMockup = () => (
  <Box sx={{ p: 3, borderRadius: RADIUS, bgcolor: '#fff', border: `1px solid ${alpha('#000', 0.08)}`, boxShadow: `0 24px 48px -12px ${alpha('#000', 0.1)}` }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
      <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: alpha('#EC4899', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="ri-capsule-line" style={{ fontSize: 18, color: '#EC4899' }} />
      </Box>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: DARK }}>Receta Médica — PDF</Typography>
    </Box>
    <Box sx={{ p: 2.5, borderRadius: 3, border: `1px dashed ${alpha('#EC4899', 0.3)}`, bgcolor: alpha('#EC4899', 0.03), mb: 2 }}>
      <Typography variant="body2" fontWeight={700} sx={{ color: DARK, mb: 2 }}>Paracetamol 500mg</Typography>
      <Grid container spacing={1.5}>
        {[
          { label: 'Cantidad', value: '1 Tab' },
          { label: 'Vía', value: 'Oral' },
          { label: 'Frecuencia', value: 'C/8h' },
          { label: 'Duración', value: '8 días' },
        ].map((f) => (
          <Grid size={3} key={f.label}>
            <Typography variant="caption" sx={{ color: GRAY_BODY, fontSize: '0.65rem' }}>{f.label}</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: DARK, fontSize: '0.8rem' }}>{f.value}</Typography>
          </Grid>
        ))}
      </Grid>
    </Box>
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Chip icon={<i className="ri-file-pdf-2-line" />} label="Descargar PDF" size="small" sx={{ bgcolor: alpha('#EC4899', 0.1), color: '#EC4899', fontWeight: 600 }} />
      <Chip icon={<i className="ri-mail-send-line" />} label="Enviar por email" size="small" sx={{ bgcolor: alpha('#6366F1', 0.1), color: '#6366F1', fontWeight: 600 }} />
    </Box>
  </Box>
);

const mockupMap: Record<string, React.FC> = {
  ehr: EhrMockup,
  cie10: Cie10Mockup,
  calendar: CalendarMockup,
  prescription: PrescriptionMockup,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const noMotion = { hidden: {}, visible: {} };

const LandingView = () => {
  const [billingAnnual, setBillingAnnual] = useState(true);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const mFadeUp = prefersReducedMotion ? noMotion : fadeUp;
  const mScaleUp = prefersReducedMotion ? noMotion : scaleUp;
  const mSlideInLeft = prefersReducedMotion ? noMotion : slideInLeft;
  const mSlideInRight = prefersReducedMotion ? noMotion : slideInRight;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: GRAY_LIGHT, overflowX: 'hidden' }}>

      {/* ══════════════════════════════════ HEADER ══════════════════════════════════ */}
      <motion.div initial={prefersReducedMotion ? false : { y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}>
        <Box
          component="header"
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            bgcolor: alpha('#fff', 0.85),
            backdropFilter: 'blur(24px)',
            borderBottom: `1px solid ${alpha('#000', 0.05)}`,
          }}
        >
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
              {/* Logo */}
              <Box component={Link} href="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', color: 'inherit' }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${alpha(PRIMARY, 0.35)}` }}>
                  <i className="ri-heart-pulse-line" style={{ fontSize: 20, color: '#fff' }} />
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px', color: DARK }}>MediClick</Typography>
              </Box>

              {/* Nav */}
              <Box component="nav" aria-label="Navegación principal" sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
                {[
                  { label: 'Funciones', href: '#features' },
                  { label: 'Testimonios', href: '#testimonials' },
                  { label: 'Precios', href: '#pricing' },
                ].map(l => (
                  <Box key={l.label} component="a" href={l.href} sx={{ color: GRAY_BODY, fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', cursor: 'pointer', transition: 'color 0.2s', '&:hover': { color: DARK }, '&:focus-visible': { outline: `2px solid ${PRIMARY}`, outlineOffset: 4, borderRadius: '4px' } }}>{l.label}</Box>
                ))}
              </Box>

              {/* CTA */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Button component={Link} href="/login" size="small" sx={{ color: DARK, fontWeight: 700, fontSize: '0.875rem', borderRadius: RADIUS_PILL, px: 2.5, display: { xs: 'none', sm: 'inline-flex' }, '&:hover': { bgcolor: alpha(PRIMARY, 0.06) } }}>
                  Ingresa
                </Button>
                <Button component={Link} href="/register" variant="contained" size="small" sx={{ bgcolor: PRIMARY, color: '#fff', fontWeight: 700, fontSize: '0.875rem', borderRadius: RADIUS_PILL, px: 3, py: 1, boxShadow: `0 4px 14px ${alpha(PRIMARY, 0.4)}`, '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: `0 6px 20px ${alpha(PRIMARY, 0.5)}` } }}>
                  Regístrate
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>
      </motion.div>

      {/* ══════════════════════════════════ HERO ══════════════════════════════════ */}
      <Box component="section" aria-label="Hero" sx={{ pt: { xs: 16, md: 22 }, pb: { xs: 6, md: 8 }, position: 'relative', bgcolor: GRAY_LIGHT }}>
        {/* Background gradient blobs */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <Box sx={{ position: 'absolute', top: '-10%', right: '-5%', width: '50%', height: '70%', background: `radial-gradient(circle, ${alpha(PRIMARY, 0.08)} 0%, transparent 70%)`, borderRadius: '50%' }} />
          <Box sx={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '40%', height: '60%', background: `radial-gradient(circle, ${alpha('#6366F1', 0.05)} 0%, transparent 70%)`, borderRadius: '50%' }} />
        </Box>

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <motion.div variants={mFadeUp} initial="hidden" animate="visible" custom={0}>
            <Chip icon={<i className="ri-sparkling-2-fill" style={{ color: PRIMARY, fontSize: 16 }} />} label="Sistema de Gestión de Citas Médicas" sx={{ mb: 3, bgcolor: alpha(PRIMARY, 0.1), color: PRIMARY, fontWeight: 700, fontSize: '0.85rem', px: 1, '& .MuiChip-label': { px: 1 }, '& .MuiChip-icon': { ml: 1 } }} />
          </motion.div>

          <motion.div variants={mFadeUp} initial="hidden" animate="visible" custom={1}>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' }, lineHeight: 1.1, letterSpacing: '-1.5px', color: DARK, mb: 3 }}>
              Gestiona tus citas, pacientes y clínicas en
              {' '}
              <Box component="span" sx={{ color: PRIMARY }}>
                un solo lugar.
              </Box>
            </Typography>
          </motion.div>

          <motion.div variants={mFadeUp} initial="hidden" animate="visible" custom={2}>
            <Typography sx={{ color: GRAY_BODY, fontSize: { xs: '1rem', md: '1.2rem' }, lineHeight: 1.7, maxWidth: 580, mx: 'auto', mb: 5 }}>
              Plataforma multi-tenant con DDD, JWT, notificaciones por email, recetas en PDF y dashboard de analítica. El sistema completo para tu clínica.
            </Typography>
          </motion.div>

          <motion.div variants={mFadeUp} initial="hidden" animate="visible" custom={3}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button component={Link} href="/register" variant="contained" size="large" sx={{ bgcolor: PRIMARY, color: '#fff', fontWeight: 700, fontSize: '1rem', borderRadius: RADIUS_PILL, px: 5, py: 1.8, boxShadow: `0 8px 30px ${alpha(PRIMARY, 0.35)}`, transition: 'all 0.3s', '&:hover': { bgcolor: PRIMARY_DARK, transform: 'translateY(-2px)', boxShadow: `0 12px 40px ${alpha(PRIMARY, 0.45)}` } }}>
                Crea tu cuenta gratis
              </Button>
              <Button href="#features" variant="outlined" size="large" sx={{ fontWeight: 700, fontSize: '1rem', borderRadius: RADIUS_PILL, px: 5, py: 1.8, borderColor: alpha(DARK, 0.2), color: DARK, borderWidth: 2, '&:hover': { borderWidth: 2, borderColor: DARK, bgcolor: alpha(DARK, 0.03) } }}>
                Agenda una demo
              </Button>
            </Box>
          </motion.div>
        </Container>

        {/* Hero Mockup */}
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div variants={mScaleUp} initial="hidden" animate="visible" custom={4}>
            <Box sx={{ mt: { xs: 6, md: 10 }, mx: 'auto', maxWidth: 960, borderRadius: '20px', overflow: 'hidden', bgcolor: '#fff', border: `1px solid ${alpha('#000', 0.08)}`, boxShadow: `0 60px 120px -20px ${alpha('#000', 0.12)}, 0 0 0 1px ${alpha('#000', 0.04)}`, transform: 'perspective(2000px) rotateX(4deg)', transition: 'transform 0.6s ease', '&:hover': { transform: 'perspective(2000px) rotateX(0deg)' } }}>
              <EhrMockup />
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ══════════════════════════════════ SOCIAL PROOF STRIPE ══════════════════════════════════ */}
      <Box component="section" aria-label="Métricas del sistema" sx={{ py: 5, bgcolor: '#fff', borderTop: `1px solid ${alpha('#000', 0.04)}`, borderBottom: `1px solid ${alpha('#000', 0.04)}` }}>
        <Container maxWidth="lg">
          <Typography variant="body2" textAlign="center" sx={{ color: GRAY_BODY, mb: 4, fontWeight: 500 }}>
            Arquitectura empresarial que respalda cada interacción
          </Typography>
          <Grid container spacing={4} justifyContent="center" textAlign="center">
            {[
              { value: '18', label: 'Módulos DDD' },
              { value: '20', label: 'Modelos Prisma' },
              { value: '4', label: 'Roles PBAC' },
            ].map((s, i) => (
              <Grid size={{ xs: 6, md: 4 }} key={i}>
                <motion.div variants={mFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}>
                  <Typography sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 900, color: PRIMARY, letterSpacing: '-1px' }}>{s.value}</Typography>
                  <Typography variant="body2" sx={{ color: GRAY_BODY, fontWeight: 500, mt: 0.5 }}>{s.label}</Typography>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ══════════════════════════════════ FEATURES (Alternating) ══════════════════════════════════ */}
      <Box component="section" id="features" aria-label="Funcionalidades" sx={{ py: { xs: 10, md: 16 } }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={{ xs: 8, md: 12 }}>
            <motion.div variants={mFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Chip label="Funcionalidades" sx={{ mb: 2, bgcolor: alpha(PRIMARY, 0.1), color: PRIMARY, fontWeight: 700, fontSize: '0.8rem' }} />
              <Typography sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '2.75rem' }, color: DARK, letterSpacing: '-1px', mb: 2 }}>
                Todo en un mismo lugar
              </Typography>
              <Typography sx={{ color: GRAY_BODY, fontSize: '1.1rem', maxWidth: 550, mx: 'auto' }}>
                Citas, notas clínicas, recetas, expedientes, notificaciones y analítica. Todas las herramientas para tu clínica.
              </Typography>
            </motion.div>
          </Box>

          {features.map((feature, idx) => {
            const isReversed = idx % 2 === 1;
            const MockupComponent = mockupMap[feature.mockup];
            return (
              <Grid
                container
                key={feature.title}
                spacing={{ xs: 4, md: 8 }}
                alignItems="center"
                direction={isReversed ? { xs: 'column-reverse', md: 'row-reverse' } : 'row'}
                sx={{ mb: { xs: 8, md: 14 } }}
              >
                {/* Text */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <motion.div variants={isReversed ? mSlideInRight : mSlideInLeft} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
                    <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: alpha(feature.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                      <i className={feature.icon} style={{ fontSize: 26, color: feature.color }} />
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '2rem' }, color: DARK, letterSpacing: '-0.5px', mb: 2 }}>
                      {feature.title}
                    </Typography>
                    <Typography sx={{ color: GRAY_BODY, fontSize: '1.05rem', lineHeight: 1.7 }}>
                      {feature.desc}
                    </Typography>
                  </motion.div>
                </Grid>
                {/* Mockup */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <motion.div variants={isReversed ? mSlideInLeft : mSlideInRight} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
                    {MockupComponent && <MockupComponent />}
                  </motion.div>
                </Grid>
              </Grid>
            );
          })}
        </Container>
      </Box>

      {/* ══════════════════════════════════ ROLES ══════════════════════════════════ */}
      <Box component="section" aria-label="Roles y permisos" sx={{ py: { xs: 10, md: 14 }, bgcolor: '#fff' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <motion.div variants={mFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '2.75rem' }, color: DARK, letterSpacing: '-1px', mb: 2 }}>
                Control de acceso basado en permisos
              </Typography>
              <Typography sx={{ color: GRAY_BODY, fontSize: '1.1rem', maxWidth: 600, mx: 'auto' }}>
                4 roles diferenciados con permisos granulares. Multi-tenancy real con TenantGuard y aislamiento por clínica.
              </Typography>
            </motion.div>
          </Box>
          <Grid container spacing={3}>
            {roles.map((role, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={role.title}>
                <motion.div variants={mScaleUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}>
                  <Box sx={{ p: 4, borderRadius: RADIUS, bgcolor: GRAY_LIGHT, border: `1px solid ${alpha('#000', 0.06)}`, height: '100%', willChange: 'transform, box-shadow', transition: 'transform 0.3s, box-shadow 0.3s', '&:hover': { transform: 'translateY(-6px)', boxShadow: `0 20px 40px ${alpha('#000', 0.08)}` } }}>
                    <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: alpha(role.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                      <i className={role.icon} style={{ fontSize: 28, color: role.color }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: DARK, mb: 1.5 }}>{role.title}</Typography>
                    <Typography variant="body2" sx={{ color: GRAY_BODY, lineHeight: 1.7 }}>{role.desc}</Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ══════════════════════════════════ TESTIMONIALS ══════════════════════════════════ */}
      <Box component="section" id="testimonials" aria-label="Testimonios" sx={{ py: { xs: 10, md: 14 }, bgcolor: PRIMARY_LIGHT }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <motion.div variants={mFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '2.75rem' }, color: DARK, letterSpacing: '-1px', mb: 2 }}>
                A nuestros clientes les encanta
              </Typography>
              <Typography sx={{ color: GRAY_BODY, fontSize: '1.1rem' }}>
                Descubre por qué miles de doctores confían en MediClick.
              </Typography>
            </motion.div>
          </Box>
          <Grid container spacing={4}>
            {testimonials.map((t, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={i}>
                <motion.div variants={mFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}>
                  <Box sx={{ p: 4, borderRadius: RADIUS, bgcolor: '#fff', border: `1px solid ${alpha('#000', 0.06)}`, height: '100%', display: 'flex', flexDirection: 'column', willChange: 'transform, box-shadow', transition: 'transform 0.3s, box-shadow 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 16px 32px ${alpha('#000', 0.06)}` } }}>
                    {/* Stars */}
                    <Box sx={{ display: 'flex', gap: 0.3, mb: 3 }}>
                      {[1,2,3,4,5].map(s => <i key={s} className="ri-star-fill" style={{ color: '#F59E0B', fontSize: 18 }} />)}
                    </Box>
                    <Typography sx={{ color: DARK, lineHeight: 1.7, flex: 1, mb: 3, fontSize: '0.95rem' }}>
                      &ldquo;{t.text}&rdquo;
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 2, borderTop: `1px solid ${alpha('#000', 0.06)}` }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: alpha(PRIMARY, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: PRIMARY, fontWeight: 800, fontSize: '1rem' }}>{t.avatar}</Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: DARK }}>{t.name}</Typography>
                        <Typography variant="caption" sx={{ color: GRAY_BODY }}>{t.clinic}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ══════════════════════════════════ PRICING ══════════════════════════════════ */}
      <Box component="section" id="pricing" aria-label="Precios y planes" sx={{ py: { xs: 10, md: 16 }, bgcolor: GRAY_LIGHT }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={3}>
            <motion.div variants={mFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '2.75rem' }, color: DARK, letterSpacing: '-1px', mb: 2 }}>
                Precios y planes
              </Typography>
              <Typography sx={{ color: GRAY_BODY, fontSize: '1.1rem', mb: 4, maxWidth: 500, mx: 'auto' }}>
                El mejor compañero tecnológico, al mejor precio.
              </Typography>
            </motion.div>
          </Box>

          {/* Billing Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mb: 8 }}>
            <Typography variant="body2" sx={{ fontWeight: billingAnnual ? 400 : 700, color: billingAnnual ? GRAY_BODY : DARK, cursor: 'pointer' }} onClick={() => setBillingAnnual(false)}>Mensual</Typography>
            <Box
              role="switch"
              aria-checked={billingAnnual}
              aria-label="Cambiar a facturación anual"
              tabIndex={0}
              onClick={() => setBillingAnnual(!billingAnnual)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBillingAnnual(!billingAnnual); } }}
              sx={{ width: 52, height: 28, borderRadius: 14, bgcolor: PRIMARY, position: 'relative', cursor: 'pointer', transition: 'all 0.3s', '&:focus-visible': { outline: `2px solid ${PRIMARY}`, outlineOffset: 2 } }}
            >
              <Box sx={{ position: 'absolute', top: 3, left: billingAnnual ? 27 : 3, width: 22, height: 22, borderRadius: '50%', bgcolor: '#fff', transition: 'left 0.3s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: billingAnnual ? 700 : 400, color: billingAnnual ? DARK : GRAY_BODY, cursor: 'pointer' }} onClick={() => setBillingAnnual(!billingAnnual)}>Anual</Typography>
            {billingAnnual && <Chip label="Ahorra 10%" size="small" sx={{ bgcolor: alpha(PRIMARY, 0.1), color: PRIMARY, fontWeight: 700, fontSize: '0.75rem', ml: 1 }} />}
          </Box>

          <Grid container spacing={4} alignItems="stretch">
            {plans.map((plan, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={i}>
                <motion.div variants={mScaleUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} style={{ height: '100%' }}>
                  <Box sx={{
                    p: plan.highlighted ? 5 : 4,
                    borderRadius: RADIUS,
                    bgcolor: '#fff',
                    border: plan.highlighted ? `2px solid ${PRIMARY}` : `1px solid ${alpha('#000', 0.08)}`,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: plan.highlighted ? `0 24px 48px ${alpha(PRIMARY, 0.15)}` : 'none',
                    willChange: 'transform, box-shadow',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': { transform: 'translateY(-6px)', boxShadow: plan.highlighted ? `0 32px 64px ${alpha(PRIMARY, 0.2)}` : `0 16px 32px ${alpha('#000', 0.06)}` },
                  }}>
                    {plan.highlighted && (
                      <Box sx={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', bgcolor: PRIMARY, color: '#fff', px: 2.5, py: 0.5, borderRadius: RADIUS_PILL, fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                        MÁS POPULAR
                      </Box>
                    )}
                    <Typography variant="h6" sx={{ fontWeight: 800, color: plan.highlighted ? PRIMARY : DARK, mb: 0.5 }}>{plan.name}</Typography>
                    <Typography variant="body2" sx={{ color: GRAY_BODY, mb: 3 }}>{plan.description}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 4 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: '3rem', color: DARK, letterSpacing: '-2px', lineHeight: 1 }}>
                        ${billingAnnual ? Math.round(Number(plan.price) * 0.9) : plan.price}
                      </Typography>
                      <Typography variant="body2" sx={{ color: GRAY_BODY }}>{plan.period}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, mb: 4 }}>
                      {plan.features.map((f, fi) => (
                        <Box key={fi} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                          <i className="ri-check-line" style={{ color: plan.highlighted ? PRIMARY : GRAY_BODY, fontSize: 18, flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ fontWeight: plan.highlighted ? 600 : 500, color: plan.highlighted ? DARK : GRAY_BODY }}>{f}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Button
                      fullWidth
                      variant={plan.highlighted ? 'contained' : 'outlined'}
                      size="large"
                      sx={{
                        borderRadius: RADIUS_PILL,
                        fontWeight: 700,
                        py: 1.5,
                        ...(plan.highlighted
                          ? { bgcolor: PRIMARY, '&:hover': { bgcolor: PRIMARY_DARK } }
                          : { borderColor: alpha(DARK, 0.2), color: DARK, borderWidth: 2, '&:hover': { borderWidth: 2, borderColor: DARK } }),
                      }}
                    >
                      {plan.cta}
                    </Button>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ══════════════════════════════════ CTA ══════════════════════════════════ */}
      <Box component="section" aria-label="Llamada a la acción" sx={{ py: { xs: 10, md: 14 }, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${PRIMARY_DARK} 0%, ${PRIMARY} 60%, #2DD4C0 100%)` }}>
        {/* Decorative */}
        <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', bgcolor: alpha('#fff', 0.06) }} />
        <Box sx={{ position: 'absolute', bottom: -150, left: -100, width: 500, height: 500, borderRadius: '50%', bgcolor: alpha('#fff', 0.04) }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <motion.div variants={mFadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '3rem' }, color: '#fff', letterSpacing: '-1px', mb: 3 }}>
              Maneja tu atención médica con herramientas poderosas.
            </Typography>
            <Typography sx={{ color: alpha('#fff', 0.85), fontSize: '1.15rem', mb: 5 }}>
              Únete a cientos de profesionales que ya están modernizando su práctica médica.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button component={Link} href="/register" variant="contained" size="large" sx={{ bgcolor: '#fff', color: PRIMARY_DARK, fontWeight: 800, fontSize: '1.05rem', borderRadius: RADIUS_PILL, px: 5, py: 1.8, '&:hover': { bgcolor: alpha('#fff', 0.9) } }}>
                Regístrate
              </Button>
              <Button variant="outlined" size="large" sx={{ color: '#fff', borderColor: alpha('#fff', 0.4), fontWeight: 700, fontSize: '1.05rem', borderRadius: RADIUS_PILL, px: 5, py: 1.8, borderWidth: 2, '&:hover': { borderWidth: 2, borderColor: '#fff', bgcolor: alpha('#fff', 0.1) } }}>
                Contáctanos
              </Button>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ══════════════════════════════════ FOOTER ══════════════════════════════════ */}
      <Box component="footer" sx={{ py: { xs: 6, md: 8 }, bgcolor: '#fff', borderTop: `1px solid ${alpha('#000', 0.06)}` }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ri-heart-pulse-line" style={{ fontSize: 18, color: '#fff' }} />
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: DARK }}>MediClick</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: GRAY_BODY, lineHeight: 1.7, maxWidth: 280, mb: 3 }}>
                La plataforma médica inteligente diseñada para potenciar tu consultorio.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {[
                  { icon: 'twitter-x', label: 'Twitter' },
                  { icon: 'instagram', label: 'Instagram' },
                  { icon: 'linkedin', label: 'LinkedIn' },
                  { icon: 'facebook-circle', label: 'Facebook' },
                ].map(({ icon, label }) => (
                  <Box component="a" href="#" key={icon} aria-label={label} sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: GRAY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GRAY_BODY, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: alpha(PRIMARY, 0.1), color: PRIMARY }, '&:focus-visible': { outline: `2px solid ${PRIMARY}`, outlineOffset: 2 } }}>
                    <i className={`ri-${icon}-fill`} style={{ fontSize: 18 }} />
                  </Box>
                ))}
              </Box>
            </Grid>
            {[
              { title: 'Información', links: ['Sobre nosotros', 'Blog'] },
              { title: 'Legal', links: ['Términos y condiciones', 'Políticas de privacidad', 'Política de cookies'] },
              { title: 'Recursos', links: ['Preguntas frecuentes', 'Solicita una demo', 'Soporte'] },
            ].map((col, i) => (
              <Grid size={{ xs: 6, md: 2 }} key={i}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: DARK, mb: 2.5, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col.title}</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {col.links.map(l => (
                    <Box component="a" href="#" key={l} sx={{ color: GRAY_BODY, textDecoration: 'none', fontSize: '0.9rem', cursor: 'pointer', transition: 'color 0.2s', '&:hover': { color: PRIMARY }, '&:focus-visible': { outline: `2px solid ${PRIMARY}`, outlineOffset: 2, borderRadius: '4px' } }}>{l}</Box>
                  ))}
                </Box>
              </Grid>
            ))}
            <Grid size={{ xs: 12, md: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: DARK, mb: 2.5, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contacto</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: GRAY_BODY, mb: 1 }}>
                <i className="ri-mail-line" style={{ fontSize: 16 }} />
                <Typography variant="body2">info@mediclick.com</Typography>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 8, pt: 4, borderTop: `1px solid ${alpha('#000', 0.06)}`, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: GRAY_BODY }}>© {new Date().getFullYear()} MediClick, Inc. Todos los derechos reservados.</Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingView;
