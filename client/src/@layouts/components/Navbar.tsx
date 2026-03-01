'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import { styled } from '@mui/material/styles';

import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import { logoutThunk } from '@/redux-store/thunks/auth.thunks';
import { selectUser } from '@/redux-store/slices/auth';
import themeConfig from '@/configs/themeConfig';
import { useSettings } from '@/@core/hooks/useSettings';
import { ProfileDrawer } from '@/views/profile/components/ProfileDrawer';

const BadgeContentSpan = styled('span')(({ theme }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: theme.palette.success.main,
  boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
}));

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/appointments': 'Citas',
  '/patients': 'Pacientes',
  '/doctors': 'Doctores',
  '/clinical-notes': 'Notas Clínicas',
  '/prescriptions': 'Recetas',
  '/schedules': 'Horarios',
  '/availability': 'Disponibilidad',
  '/specialties': 'Especialidades',
  '/categories': 'Categorías',
  '/users': 'Usuarios',
  '/reports': 'Reportes',
};

export default function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const user = useAppSelector(selectUser);
  const { settings, updateSettings } = useSettings();
  const pageTitle = pageTitles[pathname] ?? 'MediClick';

  const [modeAnchorEl, setModeAnchorEl] = useState<null | HTMLElement>(null);
  const [avatarAnchorEl, setAvatarAnchorEl] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleModeOpen = (event: React.MouseEvent<HTMLElement>) => {
    setModeAnchorEl(event.currentTarget);
  };
  const handleModeClose = () => {
    setModeAnchorEl(null);
  };
  const handleModeChange = (newMode: 'light' | 'dark' | 'system') => {
    updateSettings({ mode: newMode });
    handleModeClose();
  };

  const handleAvatarOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAvatarAnchorEl(event.currentTarget);
  };
  const handleAvatarClose = () => {
    setAvatarAnchorEl(null);
  };

  const handleLogout = () => {
    handleAvatarClose();
    void dispatch(logoutThunk());
  };

  const isFloating = themeConfig.navbar.floating;

  const modeIcon = settings.mode === 'system'
    ? 'ri-computer-line'
    : settings.mode === 'dark'
      ? 'ri-moon-clear-line'
      : 'ri-sun-line';

  return (
    <>
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(15, 23, 42, 0.8)'
            : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: themeConfig.navbar.blur ? 'blur(9px)' : undefined,
        color: 'text.primary',
        borderBottom: isFloating ? 'none' : '1px solid',
        borderColor: 'divider',
        width: isFloating ? 'auto' : '100%',
        ...(isFloating && {
          mx: `${themeConfig.layoutPadding}px`,
          mt: `${themeConfig.layoutPadding / 2}px`,
          borderRadius: '10px',
          width: `calc(100% - ${themeConfig.layoutPadding * 2}px)`,
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 2px 8px rgba(0, 0, 0, 0.2)'
              : '0 2px 8px rgba(0, 0, 0, 0.04)',
          border: '1px solid',
          borderColor: 'divider',
        }),
        transition: 'all 200ms ease',
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          minHeight: '56px !important',
          px: { xs: 2, md: 3 },
        }}
      >
        {/* Breadcrumbs */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="body2"
            color="text.disabled"
            sx={{ fontSize: '0.8125rem' }}
          >
            {themeConfig.templateName}
          </Typography>
          <i
            className="ri-arrow-right-s-line"
            style={{ fontSize: 16, opacity: 0.4 }}
            aria-hidden="true"
          />
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ fontSize: '0.875rem' }}
          >
            {pageTitle}
          </Typography>
        </Box>

        {/* Right side */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* System Mode */}
          <IconButton onClick={handleModeOpen} size="small" sx={{ color: 'text.secondary' }}>
            <i className={modeIcon} style={{ fontSize: 22 }} />
          </IconButton>
          <Menu
            anchorEl={modeAnchorEl}
            open={Boolean(modeAnchorEl)}
            onClose={handleModeClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            sx={{ '& .MuiMenuItem-root': { gap: 2 } }}
          >
            <MenuItem
              selected={settings.mode === 'light'}
              onClick={() => handleModeChange('light')}
            >
              <i className="ri-sun-line" /> Light
            </MenuItem>
            <MenuItem
              selected={settings.mode === 'dark'}
              onClick={() => handleModeChange('dark')}
            >
              <i className="ri-moon-clear-line" /> Dark
            </MenuItem>
            <MenuItem
              selected={settings.mode === 'system'}
              onClick={() => handleModeChange('system')}
            >
              <i className="ri-computer-line" /> System
            </MenuItem>
          </Menu>

          {/* Notifications */}
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            <Badge color="error" variant="dot" invisible={false}>
              <i className="ri-notification-4-line" style={{ fontSize: 22 }} />
            </Badge>
          </IconButton>

          {/* User Avatar */}
          <Badge
            overlap="circular"
            sx={{ ml: 1, cursor: 'pointer' }}
            badgeContent={<BadgeContentSpan />}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            onClick={handleAvatarOpen}
          >
            <Avatar
              alt={user?.name || 'User Avatar'}
              src={user?.avatarUrl || "/images/avatarSidebar.jpg"}
              sx={{ width: 38, height: 38 }}
            />
          </Badge>
          <Menu
            anchorEl={avatarAnchorEl}
            open={Boolean(avatarAnchorEl)}
            onClose={handleAvatarClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            sx={{ '& .MuiMenu-paper': { width: 230, mt: 1.5 }, '& .MuiMenuItem-root': { gap: 2 } }}
          >
            <Box sx={{ pt: 2, pb: 2, px: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Badge
                overlap="circular"
                badgeContent={<BadgeContentSpan />}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              >
                <Avatar
                  alt={user?.name || 'User Avatar'}
                  src={user?.avatarUrl || "/images/avatarSidebar.jpg"}
                  sx={{ width: 40, height: 40 }}
                />
              </Badge>
              <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Typography fontWeight={600} variant="body2" noWrap>
                  {user?.name || 'John Doe'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user?.email || 'admin@materio.com'}
                </Typography>
              </Box>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                handleAvatarClose();
                setProfileOpen(true);
              }}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                <i className="ri-user-settings-line" style={{ fontSize: 20 }} />
              </ListItemIcon>
              Mi Perfil
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleAvatarClose();
                router.push('/settings/account');
              }}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 'auto !important' }}>
                <i className="ri-settings-4-line" style={{ fontSize: 20 }} />
              </ListItemIcon>
              Configuración
            </MenuItem>
            <Box sx={{ px: 2, pt: 1, pb: 1 }}>
              <MenuItem
                onClick={handleLogout}
                sx={{
                  py: 1,
                  px: 2,
                  bgcolor: 'error.main',
                  color: 'error.contrastText',
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  '&:hover': {
                    bgcolor: 'error.dark',
                  }
                }}
              >
                Cerrar Sesión
                <i className="ri-logout-box-r-line" style={{ fontSize: 18, marginLeft: 8 }} />
              </MenuItem>
            </Box>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>

    <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
