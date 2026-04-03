'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { usePermissions } from '@/hooks/usePermissions';
import { useSettings } from '@/@core/hooks/useSettings';

const DRAWER_WIDTH = 260;
const KEEP_MOUNTED = { keepMounted: true };

interface NavPermission {
  action: string;
  subject: string;
}

interface NavItem {
  title: string;
  path: string;
  icon: string;
  /** Si se especifica, el usuario necesita al menos uno de estos permisos */
  permissions?: NavPermission[];
  /** Si true, solo visible para pacientes (rol PATIENT) */
  patientOnly?: boolean;
  /** Si true, visible para cualquier staff (no paciente) */
  staffOnly?: boolean;
  /** Si true, solo visible para doctores */
  doctorOnly?: boolean;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const navigationItems: NavSection[] = [
  // ── Sección exclusiva para pacientes ──
  {
    section: 'Mi Portal',
    items: [
      {
        title: 'Inicio',
        path: '/patient',
        icon: 'ri-home-4-line',
        patientOnly: true,
      },
      {
        title: 'Mis Citas',
        path: '/patient/appointments',
        icon: 'ri-calendar-check-line',
        patientOnly: true,
      },
      {
        title: 'Reservar Cita',
        path: '/patient/book',
        icon: 'ri-add-circle-line',
        patientOnly: true,
      },
      {
        title: 'Mi Expediente',
        path: '/patient/expediente',
        icon: 'ri-file-chart-line',
        patientOnly: true,
      },
      {
        title: 'Mi Perfil',
        path: '/patient/profile',
        icon: 'ri-user-line',
        patientOnly: true,
      },
    ],
  },
  // ── Secciones para staff ──
  {
    section: 'General',
    items: [
      {
        title: 'Dashboard',
        path: '/dashboard',
        icon: 'ri-dashboard-line',
        staffOnly: true,
      },
    ],
  },
  {
    section: 'Gestión Médica',
    items: [
      {
        title: 'Mis Citas Hoy',
        path: '/doctor/appointments',
        icon: 'ri-calendar-todo-line',
        doctorOnly: true,
      },
      {
        title: 'Citas',
        path: '/appointments',
        icon: 'ri-calendar-check-line',
        permissions: [{ action: 'READ', subject: 'APPOINTMENTS' }],
        staffOnly: true,
      },
      {
        title: 'Pacientes',
        path: '/patients',
        icon: 'ri-user-heart-line',
        permissions: [{ action: 'READ', subject: 'PATIENTS' }],
      },
      {
        title: 'Doctores',
        path: '/doctors',
        icon: 'ri-stethoscope-line',
        permissions: [{ action: 'READ', subject: 'DOCTORS' }],
      },
      {
        title: 'Notas Clínicas',
        path: '/clinical-notes',
        icon: 'ri-file-text-line',
        permissions: [{ action: 'READ', subject: 'CLINICAL_NOTES' }],
      },
      {
        title: 'Recetas',
        path: '/prescriptions',
        icon: 'ri-medicine-bottle-line',
        permissions: [{ action: 'READ', subject: 'PRESCRIPTIONS' }],
      },
      {
        title: 'Historial Médico',
        path: '/medical-history',
        icon: 'ri-file-list-3-line',
        permissions: [{ action: 'READ', subject: 'MEDICAL_HISTORY' }],
      },
    ],
  },
  {
    section: 'Programación',
    items: [
      {
        title: 'Horarios',
        path: '/schedules',
        icon: 'ri-time-line',
        permissions: [{ action: 'READ', subject: 'SCHEDULES' }],
        staffOnly: true,
      },
      {
        title: 'Disponibilidad',
        path: '/availability',
        icon: 'ri-calendar-event-line',
        permissions: [{ action: 'READ', subject: 'AVAILABILITY' }],
        staffOnly: true,
      },
      {
        title: 'Bloqueos',
        path: '/schedule-blocks',
        icon: 'ri-calendar-close-line',
        permissions: [{ action: 'READ', subject: 'SCHEDULE_BLOCKS' }],
      },
      {
        title: 'Feriados',
        path: '/holidays',
        icon: 'ri-calendar-2-line',
        permissions: [{ action: 'READ', subject: 'HOLIDAYS' }],
      },
    ],
  },
  {
    section: 'Configuración',
    items: [
      {
        title: 'Sedes',
        path: '/clinics',
        icon: 'ri-building-line',
        permissions: [{ action: 'MANAGE', subject: 'CLINICS' }],
      },
      {
        title: 'Especialidades',
        path: '/specialties',
        icon: 'ri-heart-pulse-line',
        permissions: [{ action: 'MANAGE', subject: 'SPECIALTIES' }],
      },
      {
        title: 'Categorías',
        path: '/categories',
        icon: 'ri-folder-line',
        permissions: [{ action: 'MANAGE', subject: 'CATEGORIES' }],
      },
      {
        title: 'Usuarios',
        path: '/users',
        icon: 'ri-group-line',
        permissions: [{ action: 'READ', subject: 'USERS' }],
      },
      {
        title: 'Roles y Permisos',
        path: '/roles',
        icon: 'ri-shield-keyhole-line',
        permissions: [{ action: 'MANAGE', subject: 'ROLES' }],
      },
      {
        title: 'Reportes',
        path: '/reports',
        icon: 'ri-bar-chart-box-line',
        permissions: [{ action: 'READ', subject: 'REPORTS' }],
      },
    ],
  },
];

interface NavigationProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Navigation({ mobileOpen = false, onMobileClose }: NavigationProps) {
  const pathname = usePathname();
  const { hasAnyPermission, roleName } = usePermissions();
  const { settings, updateSettings } = useSettings();

  const [isHovered, setIsHovered] = useState(false);
  const isCollapsed = settings.layout === 'collapsed';
  const showText = !isCollapsed || isHovered;
  const currentWidth = isCollapsed && !isHovered ? 80 : DRAWER_WIDTH;

  const isDark = true; // Mantenemos el estado 'dark' para las sombras y contrastes
  const isPatient = roleName === 'PATIENT';

  const bgColor = '#001849';
  const textColor = '#FFFFFF';
  const secondaryText = 'rgba(255, 255, 255, 0.8)';
  const dividerColor = 'rgba(255, 255, 255, 0.2)';
  const hoverBg = 'rgba(255, 255, 255, 0.1)';

  const filteredSections = navigationItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // Filtrar por patientOnly / staffOnly / doctorOnly
        if (item.patientOnly && !isPatient) return false;
        if (item.staffOnly && isPatient) return false;
        if (item.doctorOnly && roleName !== 'DOCTOR') return false;
        // Filtrar por permisos
        if (item.permissions) return hasAnyPermission(item.permissions);
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const drawerContent = (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* Logo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: showText ? 'space-between' : 'center',
          px: showText ? 3 : 0,
          py: 2.5,
          minHeight: 64,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              bgcolor: settings.primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <i
              className="ri-heart-pulse-line"
              style={{ fontSize: 20, color: '#fff' }}
            />
          </Box>
          {showText && (
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ color: textColor, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}
            >
              MediClick
            </Typography>
          )}
        </Box>
        {showText && (
          <IconButton
            size="small"
            onClick={() => updateSettings({ layout: isCollapsed ? 'vertical' : 'collapsed' })}
            sx={{ color: secondaryText, '&:hover': { color: textColor } }}
          >
            <i className={isCollapsed ? 'ri-checkbox-blank-circle-line' : 'ri-record-circle-line'} style={{ fontSize: 20 }} />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: dividerColor, mx: showText ? 2 : 1, opacity: 0.6 }} />

      {/* Navigation Items */}
      <Box sx={{ overflow: 'auto', py: 1.5, flex: 1, px: showText ? 0.5 : 1 }}>
        {filteredSections.map((section) => (
          <Box key={section.section} sx={{ mb: 0.5 }}>
            {showText ? (
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  px: 3,
                  py: 1.5,
                  display: 'block',
                  color: secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  fontSize: '0.68rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {section.section}
              </Typography>
            ) : (
              <Box sx={{ py: 1.5, display: 'flex', justifyContent: 'center' }}>
                <Divider sx={{ width: 24, borderColor: dividerColor }} />
              </Box>
            )}
            <List disablePadding>
              {section.items.map((item) => {
                const isActive = pathname === item.path;

                return (
                  <ListItem key={item.path} disablePadding sx={{ px: showText ? 1.5 : 0, mb: '2px', display: 'flex', justifyContent: 'center' }}>
                    <Tooltip title={!showText ? item.title : ''} placement="right">
                      <ListItemButton
                        component={Link}
                        href={item.path}
                        selected={isActive}
                        onClick={onMobileClose}
                        sx={{
                          borderRadius: '8px',
                          py: 0.75,
                          px: showText ? 2 : 1,
                          justifyContent: showText ? 'flex-start' : 'center',
                          color: textColor,
                          transition: 'all 200ms ease',
                          '&.Mui-selected': {
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.16)',
                            '&:hover': {
                              bgcolor: 'primary.dark',
                            },
                            '& .MuiListItemIcon-root': {
                              color: 'primary.contrastText',
                            },
                          },
                          '&:not(.Mui-selected):hover': {
                            bgcolor: hoverBg,
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: showText ? 34 : 0,
                            color: isActive ? 'inherit' : secondaryText,
                            transition: 'color 200ms ease',
                            justifyContent: 'center',
                          }}
                        >
                          <i className={item.icon} style={{ fontSize: 20 }} />
                        </ListItemIcon>
                        {showText && (
                          <ListItemText
                            primary={item.title}
                            primaryTypographyProps={{
                              fontSize: '0.875rem',
                              fontWeight: isActive ? 600 : 400,
                              whiteSpace: 'nowrap',
                            }}
                          />
                        )}
                      </ListItemButton>
                    </Tooltip>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

    </Box>
  );

  const drawerPaperStyles = {
    width: currentWidth,
    overflowX: 'hidden' as const,
    boxSizing: 'border-box',
    borderRight: '0 none',
    bgcolor: bgColor,
    color: textColor,
    boxShadow: isDark ? '4px 0 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
    transition: 'background-color 300ms ease, box-shadow 300ms ease',
  };

  return (
    <>
      {/* Mobile Drawer (temporary) — xs and sm */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={KEEP_MOUNTED}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': drawerPaperStyles,
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer (permanent) — md and up */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: currentWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': drawerPaperStyles,
          transition: 'width 300ms ease',
        }}
      >
        {drawerContent}
      </Drawer>

    </>
  );
}
