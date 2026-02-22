'use client';

import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { useSettings } from '@/@core/hooks/useSettings';
import themeConfig from '@/configs/themeConfig';

interface VerticalLayoutProps {
  navbar?: React.ReactNode;
  navigation?: React.ReactElement<{ mobileOpen?: boolean; onMobileClose?: () => void }>;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const VerticalLayout = ({ navbar, navigation, footer, children }: VerticalLayoutProps) => {
  const { settings } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMobileToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const contentMaxWidth =
    settings.contentWidth === 'compact' ? themeConfig.compactContentWidth : '100%';

  // Clone navigation element to inject mobileOpen and onMobileClose props
  const navigationWithProps = navigation
    ? (() => {
      const { type, props } = navigation;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Component = type as React.ComponentType<any>;
      return <Component {...props} mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />;
    })()
    : null;

  return (
    <Box sx={{ display: 'flex', flex: '1 1 auto', minHeight: '100vh' }}>
      {navigationWithProps}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Mobile hamburger + navbar wrapper */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            aria-label="Abrir menú de navegación"
            onClick={handleMobileToggle}
            sx={{
              display: { xs: 'flex', md: 'none' },
              ml: 1,
              mt: 0.5,
              color: 'text.primary',
              width: 40,
              height: 40,
            }}
          >
            <i className="ri-menu-line" style={{ fontSize: 22 }} />
          </IconButton>
          <Box sx={{ flex: 1 }}>{navbar || null}</Box>
        </Box>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: `${themeConfig.layoutPadding}px` },
            maxWidth: contentMaxWidth,
            mx: 'auto',
            width: '100%',
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
        {footer || null}
      </Box>
    </Box>
  );
};

export default VerticalLayout;
