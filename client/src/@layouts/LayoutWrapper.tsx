'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/redux-store/hooks';
import { useSettings } from '@/@core/hooks/useSettings';
import Box from '@mui/material/Box';

interface LayoutWrapperProps {
  verticalLayout: React.ReactNode;
}

export default function LayoutWrapper({ verticalLayout }: LayoutWrapperProps) {
  const router = useRouter();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return null;

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto' }}
      data-skin={settings.skin}
    >
      {verticalLayout}
    </Box>
  );
}
