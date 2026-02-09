'use client';

import Box from '@mui/material/Box';
import { useSettings } from '@/@core/hooks/useSettings';

interface BlankLayoutProps {
  children: React.ReactNode;
}

const BlankLayout = ({ children }: BlankLayoutProps) => {
  const { settings } = useSettings();

  return (
    <Box sx={{ width: '100%', minHeight: '100vh' }} data-skin={settings.skin}>
      {children}
    </Box>
  );
};

export default BlankLayout;
