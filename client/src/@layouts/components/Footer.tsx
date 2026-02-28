'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import themeConfig from '@/configs/themeConfig';
import { useSettings } from '@/@core/hooks/useSettings';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  const { settings } = useSettings();

  const contentMaxWidth =
    settings.contentWidth === 'compact' ? themeConfig.compactContentWidth : '100%';

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: `${themeConfig.layoutPadding}px`,
        mt: 'auto',
      }}
    >
      <Box
        sx={{
          maxWidth: contentMaxWidth,
          mx: 'auto',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          © {CURRENT_YEAR} {themeConfig.templateName}. Todos los derechos reservados.
        </Typography>
        <Typography variant="caption" color="text.disabled">
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );
}
