'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useAppDispatch, useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { logoutThunk } from '@/redux-store/thunks/auth.thunks';
import themeConfig from '@/configs/themeConfig';
import CustomAvatar from '@/@core/components/mui/Avatar';
import { getInitials } from '@/utils/getInitials';
import { getDefaultAvatarDataUri } from '@/utils/avatar';

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
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] ?? 'MediClick';
  const defaultAvatar = useMemo(
    () => getDefaultAvatarDataUri(user?.email ?? user?.name ?? 'user'),
    [user?.email, user?.name],
  );

  const handleLogout = () => {
    void dispatch(logoutThunk());
  };

  const isFloating = themeConfig.navbar.floating;

  return (
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
          {/* User info */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 0.5,
              px: 1.5,
              borderRadius: '10px',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
              transition: 'background-color 150ms ease',
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <CustomAvatar
                color="primary"
                skin="filled"
                size={34}
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
                  borderColor: 'background.paper',
                }}
              />
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ lineHeight: 1.2, fontSize: '0.8125rem' }}
              >
                {user?.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.7rem' }}
              >
                {user?.role}
              </Typography>
            </Box>
          </Box>

          {/* Logout */}
          <Tooltip title="Cerrar Sesión">
            <IconButton
              onClick={handleLogout}
              size="small"
              aria-label="Cerrar sesión"
              sx={{
                color: 'text.secondary',
                width: 36,
                height: 36,
                '&:hover': {
                  bgcolor: 'error.main',
                  color: 'white',
                },
                transition: 'all 200ms ease',
              }}
            >
              <i className="ri-logout-box-r-line" style={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
