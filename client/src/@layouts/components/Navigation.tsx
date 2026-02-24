'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { UserRole } from '@/types/auth.types';
import { useSettings } from '@/@core/hooks/useSettings';
import CustomAvatar from '@/@core/components/mui/Avatar';
import { getInitials } from '@/utils/getInitials';
import { getDefaultAvatarDataUri } from '@/utils/avatar';

const DRAWER_WIDTH = 260;

interface NavItem {
  title: string;
  path: string;
  icon: string;
  roles?: UserRole[];
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const navigationItems: NavSection[] = [
  {
    section: 'General',
    items: [
      {
        title: 'Dashboard',
        path: '/',
        icon: 'ri-dashboard-line',
      },
    ],
  },
  {
    section: 'Gestión Médica',
    items: [
      {
        title: 'Citas',
        path: '/appointments',
        icon: 'ri-calendar-check-line',
      },
      {
        title: 'Pacientes',
        path: '/patients',
        icon: 'ri-user-heart-line',
        roles: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST],
      },
      {
        title: 'Doctores',
        path: '/doctors',
        icon: 'ri-stethoscope-line',
        roles: [UserRole.ADMIN, UserRole.RECEPTIONIST],
      },
      {
        title: 'Notas Clínicas',
        path: '/clinical-notes',
        icon: 'ri-file-text-line',
        roles: [UserRole.ADMIN, UserRole.DOCTOR],
      },
      {
        title: 'Recetas',
        path: '/prescriptions',
        icon: 'ri-medicine-bottle-line',
        roles: [UserRole.ADMIN, UserRole.DOCTOR],
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
        roles: [UserRole.ADMIN, UserRole.DOCTOR],
      },
      {
        title: 'Disponibilidad',
        path: '/availability',
        icon: 'ri-calendar-event-line',
        roles: [UserRole.ADMIN, UserRole.DOCTOR],
      },
    ],
  },
  {
    section: 'Configuración',
    items: [
      {
        title: 'Especialidades',
        path: '/specialties',
        icon: 'ri-heart-pulse-line',
        roles: [UserRole.ADMIN],
      },
      {
        title: 'Categorías',
        path: '/categories',
        icon: 'ri-folder-line',
        roles: [UserRole.ADMIN],
      },
      {
        title: 'Usuarios',
        path: '/users',
        icon: 'ri-group-line',
        roles: [UserRole.ADMIN],
      },
      {
        title: 'Reportes',
        path: '/reports',
        icon: 'ri-bar-chart-box-line',
        roles: [UserRole.ADMIN],
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
  const user = useAppSelector(selectUser);
  const { settings } = useSettings();
  const userRole = user?.role;
  const defaultAvatar = useMemo(
    () => getDefaultAvatarDataUri(user?.email ?? user?.name ?? 'user'),
    [user?.email, user?.name],
  );

  const isDark = settings.semiDark || settings.mode === 'dark';

  const bgColor = isDark ? '#0F1B2D' : 'background.paper';
  const textColor = isDark ? 'rgba(255, 255, 255, 0.9)' : 'text.primary';
  const secondaryText = isDark ? 'rgba(255, 255, 255, 0.5)' : 'text.secondary';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'divider';
  const hoverBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'action.hover';
  const activeBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'action.selected';

  const filteredSections = navigationItems
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.roles || (userRole && item.roles.includes(userRole)),
      ),
    }))
    .filter((section) => section.items.length > 0);

  const drawerContent = (
    <>
      {/* Logo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 3,
          py: 2.5,
          minHeight: 64,
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '8px',
            bgcolor: settings.primaryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i
            className="ri-heart-pulse-line"
            style={{ fontSize: 20, color: '#fff' }}
          />
        </Box>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ color: textColor, letterSpacing: '-0.3px' }}
        >
          MediClick
        </Typography>
      </Box>

      <Divider sx={{ borderColor: dividerColor, mx: 2, opacity: 0.6 }} />

      {/* Navigation Items */}
      <Box sx={{ overflow: 'auto', py: 1.5, flex: 1, px: 0.5 }}>
        {filteredSections.map((section) => (
          <Box key={section.section} sx={{ mb: 0.5 }}>
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
              }}
            >
              {section.section}
            </Typography>
            <List disablePadding>
              {section.items.map((item) => {
                const isActive = pathname === item.path;

                return (
                  <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: '2px' }}>
                    <ListItemButton
                      component={Link}
                      href={item.path}
                      selected={isActive}
                      onClick={onMobileClose}
                      sx={{
                        borderRadius: '8px',
                        py: 0.75,
                        px: 2,
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
                          minWidth: 34,
                          color: isActive ? 'inherit' : secondaryText,
                          transition: 'color 200ms ease',
                        }}
                      >
                        <i className={item.icon} style={{ fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.title}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: isActive ? 600 : 400,
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: dividerColor, mx: 2, opacity: 0.6 }} />

      {/* User Info at Bottom */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            borderRadius: '10px',
            bgcolor: activeBg,
            transition: 'background-color 200ms ease',
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <CustomAvatar
              color="primary"
              skin="filled"
              size={38}
              src={user?.avatarUrl ?? defaultAvatar}
              sx={{
                borderRadius: '10px',
                fontWeight: 700,
                animation: 'avatarFloat 3.2s ease-in-out infinite',
                '@keyframes avatarFloat': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-2px)' },
                },
                '@media (prefers-reduced-motion: reduce)': {
                  animation: 'none',
                },
              }}
            >
              {user?.name ? getInitials(user.name) : 'U'}
            </CustomAvatar>
            <Box
              sx={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'success.main',
                border: '2px solid',
                borderColor: bgColor,
              }}
            />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ color: textColor, lineHeight: 1.3 }}
            >
              {user?.name ?? 'Usuario'}
            </Typography>
            <Chip
              label={user?.role ?? 'N/A'}
              size="small"
              color="primary"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                mt: 0.25,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : undefined,
                color: isDark ? 'rgba(255, 255, 255, 0.7)' : undefined,
              }}
            />
          </Box>
        </Box>
      </Box>
    </>
  );

  const drawerPaperStyles = {
    width: DRAWER_WIDTH,
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
        ModalProps={{ keepMounted: true }}
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
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': drawerPaperStyles,
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
