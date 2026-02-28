'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { useAppSelector, useAppDispatch } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { logoutThunk } from '@/redux-store/thunks/auth.thunks';
import { UserRole } from '@/types/auth.types';
import { useSettings } from '@/@core/hooks/useSettings';

const DRAWER_WIDTH = 260;
const KEEP_MOUNTED = { keepMounted: true };
const MENU_ANCHOR_ORIGIN = { vertical: 'top' as const, horizontal: 'right' as const };
const MENU_TRANSFORM_ORIGIN = { vertical: 'bottom' as const, horizontal: 'left' as const };
const MENU_PAPER_PROPS = {
  paper: {
    sx: {
      minWidth: 180,
      mt: -1,
      borderRadius: 2,
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    },
  },
};

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
        path: '/dashboard',
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
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const { settings, updateSettings } = useSettings();
  const userRole = user?.role;

  const [isHovered, setIsHovered] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const isCollapsed = settings.layout === 'collapsed';
  const showText = !isCollapsed || isHovered;
  const currentWidth = isCollapsed && !isHovered ? 80 : DRAWER_WIDTH;

  const isDark = settings.semiDark || settings.mode === 'dark';

  const bgColor = isDark ? '#0F1B2D' : 'background.paper';
  const textColor = isDark ? 'rgba(255, 255, 255, 0.9)' : 'text.primary';
  const secondaryText = isDark ? 'rgba(255, 255, 255, 0.5)' : 'text.secondary';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'divider';
  const hoverBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'action.hover';

  const handleLogout = async () => {
    setMenuAnchor(null);
    await dispatch(logoutThunk());
    router.push('/login');
  };

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    DOCTOR: 'Doctor',
    RECEPTIONIST: 'Recepcionista',
    PATIENT: 'Paciente',
  };

  const avatarSrc = user?.avatarUrl || '/images/avatarSidebar.jpg';

  const filteredSections = navigationItems
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.roles || (userRole && item.roles.includes(userRole)),
      ),
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

      {/* User Profile */}
      <Divider sx={{ borderColor: dividerColor, mx: showText ? 2 : 1, opacity: 0.6 }} />
      <Box sx={{ p: showText ? 1.5 : 1 }}>
        <Box
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: showText ? 1.5 : 1,
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'background-color 200ms ease',
            justifyContent: showText ? 'flex-start' : 'center',
            '&:hover': {
              bgcolor: hoverBg,
            },
          }}
        >
          <Tooltip title={!showText ? (user?.name ?? 'Usuario') : ''} placement="right">
            <Avatar
              src={avatarSrc}
              alt={user?.name ?? 'Usuario'}
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                border: '2px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'divider',
              }}
            />
          </Tooltip>
          {showText && (
            <>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  noWrap
                  sx={{ color: textColor, lineHeight: 1.3 }}
                >
                  {user?.name ?? 'Usuario'}
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    color: secondaryText,
                    fontSize: '0.7rem',
                    lineHeight: 1.3,
                    display: 'block',
                  }}
                >
                  {roleLabels[user?.role ?? ''] ?? user?.role ?? 'Sin rol'}
                </Typography>
              </Box>
              <IconButton
                size="small"
                sx={{
                  color: secondaryText,
                  flexShrink: 0,
                  '&:hover': { color: textColor },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAnchor(e.currentTarget);
                }}
              >
                <i className="ri-more-2-fill" style={{ fontSize: 18 }} />
              </IconButton>
            </>
          )}
        </Box>

        {/* Context Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={MENU_ANCHOR_ORIGIN}
          transformOrigin={MENU_TRANSFORM_ORIGIN}
          slotProps={MENU_PAPER_PROPS}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" fontWeight={600}>
              {user?.name ?? 'Usuario'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email ?? ''}
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              void handleLogout();
            }}
            sx={{
              gap: 1.5,
              py: 1,
              color: 'error.main',
              '&:hover': { bgcolor: 'error.lighter' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
              <i className="ri-logout-box-r-line" style={{ fontSize: 18 }} />
            </ListItemIcon>
            <Typography variant="body2" fontWeight={500}>
              Cerrar Sesión
            </Typography>
          </MenuItem>
        </Menu>
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
