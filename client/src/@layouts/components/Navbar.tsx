'use client';

import { usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useAppDispatch } from '@/redux-store/hooks';
import { logoutThunk } from '@/redux-store/thunks/auth.thunks';
import themeConfig from '@/configs/themeConfig';

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
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] ?? 'MediClick';

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
