'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import Badge from '@mui/material/Badge';
import ListItemIcon from '@mui/material/ListItemIcon';
import { styled } from '@mui/material/styles';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { logoutThunk } from '@/redux-store/thunks/auth.thunks';
import { useSettings } from '@/@core/hooks/useSettings';

const BadgeContentSpan = styled('span')(({ theme }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: theme.palette.success.main,
  boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
}));

const navItems = [
  { label: 'Inicio', path: '/patient', icon: 'ri-home-4-line' },
  { label: 'Mis Citas', path: '/patient/appointments', icon: 'ri-calendar-check-line' },
  { label: 'Reservar', path: '/patient/book', icon: 'ri-add-circle-line' },
  { label: 'Perfil', path: '/patient/profile', icon: 'ri-user-line' },
];

const pageTitles: Record<string, string> = {
  '/patient': 'Inicio',
  '/patient/appointments': 'Mis Citas',
  '/patient/book': 'Reservar Cita',
  '/patient/profile': 'Mi Perfil',
};

interface PatientLayoutProps {
  children: React.ReactNode;
}

export default function PatientLayout({ children }: PatientLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { settings, updateSettings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [avatarAnchorEl, setAvatarAnchorEl] = useState<null | HTMLElement>(null);
  const [modeAnchorEl, setModeAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return null;

  const currentNavIndex = navItems.findIndex((item) => pathname === item.path);
  const pageTitle = pageTitles[pathname] ?? 'MediClick';

  const handleLogout = () => {
    setAvatarAnchorEl(null);
    void dispatch(logoutThunk());
  };

  const modeIcon =
    settings.mode === 'system'
      ? 'ri-computer-line'
      : settings.mode === 'dark'
        ? 'ri-moon-clear-line'
        : 'ri-sun-line';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
      data-skin={settings.skin}
    >
      {/* Top AppBar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(15, 23, 42, 0.9)'
              : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(9px)',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: '56px !important', px: { xs: 2, sm: 3 } }}>
          {/* Logo / Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: settings.primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="ri-heart-pulse-line" style={{ fontSize: 18, color: '#fff' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {pageTitle}
            </Typography>
          </Box>

          {/* Right side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={(e) => setModeAnchorEl(e.currentTarget)}
              sx={{ color: 'text.secondary' }}
            >
              <i className={modeIcon} style={{ fontSize: 20 }} />
            </IconButton>
            <Menu
              anchorEl={modeAnchorEl}
              open={Boolean(modeAnchorEl)}
              onClose={() => setModeAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem selected={settings.mode === 'light'} onClick={() => { updateSettings({ mode: 'light' }); setModeAnchorEl(null); }}>
                <i className="ri-sun-line" style={{ marginRight: 8 }} /> Light
              </MenuItem>
              <MenuItem selected={settings.mode === 'dark'} onClick={() => { updateSettings({ mode: 'dark' }); setModeAnchorEl(null); }}>
                <i className="ri-moon-clear-line" style={{ marginRight: 8 }} /> Dark
              </MenuItem>
              <MenuItem selected={settings.mode === 'system'} onClick={() => { updateSettings({ mode: 'system' }); setModeAnchorEl(null); }}>
                <i className="ri-computer-line" style={{ marginRight: 8 }} /> System
              </MenuItem>
            </Menu>

            <Badge
              overlap="circular"
              sx={{ cursor: 'pointer' }}
              badgeContent={<BadgeContentSpan />}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              onClick={(e) => setAvatarAnchorEl(e.currentTarget)}
            >
              <Avatar
                alt={user?.name}
                src={user?.avatarUrl || '/images/avatarSidebar.jpg'}
                sx={{ width: 34, height: 34 }}
              />
            </Badge>
            <Menu
              anchorEl={avatarAnchorEl}
              open={Boolean(avatarAnchorEl)}
              onClose={() => setAvatarAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              sx={{ '& .MuiMenu-paper': { width: 220, mt: 1.5 } }}
            >
              <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar src={user?.avatarUrl || '/images/avatarSidebar.jpg'} sx={{ width: 36, height: 36 }} />
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography fontWeight={600} variant="body2" noWrap>{user?.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{user?.email}</Typography>
                </Box>
              </Box>
              <Divider />
              <MenuItem onClick={() => { setAvatarAnchorEl(null); router.push('/patient/profile'); }} sx={{ py: 1.5 }}>
                <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                  <i className="ri-user-settings-line" style={{ fontSize: 18 }} />
                </ListItemIcon>
                Mi Perfil
              </MenuItem>
              <Box sx={{ px: 2, pt: 0.5, pb: 1 }}>
                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    py: 1,
                    bgcolor: 'error.main',
                    color: 'error.contrastText',
                    borderRadius: 1,
                    justifyContent: 'center',
                    '&:hover': { bgcolor: 'error.dark' },
                  }}
                >
                  Cerrar Sesión
                  <i className="ri-logout-box-r-line" style={{ fontSize: 16, marginLeft: 8 }} />
                </MenuItem>
              </Box>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'auto',
          pb: '72px', // space for bottom nav
          px: { xs: 2, sm: 3 },
          py: 2,
        }}
      >
        {children}
      </Box>

      {/* Bottom Navigation */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
        elevation={3}
      >
        <BottomNavigation
          value={currentNavIndex >= 0 ? currentNavIndex : false}
          sx={{
            height: 64,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              py: 1,
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
          }}
        >
          {navItems.map((item) => (
            <BottomNavigationAction
              key={item.path}
              component={Link}
              href={item.path}
              label={item.label}
              icon={<i className={item.icon} style={{ fontSize: 22 }} />}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
