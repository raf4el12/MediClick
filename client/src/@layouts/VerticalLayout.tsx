'use client';

import Box from '@mui/material/Box';
import { useSettings } from '@/@core/hooks/useSettings';
import themeConfig from '@/configs/themeConfig';

interface VerticalLayoutProps {
  navbar?: React.ReactNode;
  navigation?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const VerticalLayout = ({ navbar, navigation, footer, children }: VerticalLayoutProps) => {
  const { settings } = useSettings();

  const contentMaxWidth =
    settings.contentWidth === 'compact' ? themeConfig.compactContentWidth : '100%';

  return (
    <Box sx={{ display: 'flex', flex: '1 1 auto', minHeight: '100vh' }}>
      {navigation || null}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {navbar || null}
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
