'use client';

import type { SyntheticEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import TabContext from '@mui/lab/TabContext';
import TabPanel from '@mui/lab/TabPanel';
import { useQuery } from '@tanstack/react-query';
import CustomTabList from '@core/components/mui/TabList';
import { authService } from '@/services/auth.service';
import AccountTab from './account/AccountTab';
import SecurityTab from './security/SecurityTab';

const TABS = ['cuenta', 'seguridad'] as const;
type SettingsTab = (typeof TABS)[number];

/** Pestaña pedida en `?tab=`; una desconocida abre "Cuenta". */
const tabFrom = (value: string | null): SettingsTab => (TABS as readonly string[]).includes(value ?? '') ? (value as SettingsTab) : 'cuenta';

function AccountSkeleton() {
  return (
    <Card>
      <CardContent className='flex flex-col gap-6'>
        <div className='flex items-center gap-6'>
          <Skeleton variant='rounded' width={100} height={100} />
          <div className='flex flex-col gap-2 flex-1'>
            <Skeleton variant='text' width={200} height={28} />
            <Skeleton variant='text' width={240} />
          </div>
        </div>
        <div className='grid gap-5 sm:grid-cols-2'>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} variant='rounded' height={56} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Cuenta del usuario (patrón `account-settings` de Materio): datos personales y seguridad del acceso. */
export default function AccountSettings() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = tabFrom(searchParams.get('tab'));

  const { data: userData, isLoading } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authService.getProfile(),
    staleTime: 2 * 60 * 1000,
  });

  const handleChange = (_: SyntheticEvent, value: SettingsTab) => {
    router.replace(`${pathname}?tab=${value}`, { scroll: false });
  };

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Typography variant='h4' component='h1'>
          Mi cuenta
        </Typography>
        <Typography color='text.secondary'>Tus datos personales y la seguridad de tu acceso.</Typography>
      </div>
      <TabContext value={tab}>
        <CustomTabList onChange={handleChange} variant='scrollable' pill='true' aria-label='Secciones de la cuenta'>
          <Tab label='Cuenta' icon={<i className='ri-user-3-line' aria-hidden />} iconPosition='start' value='cuenta' />
          <Tab label='Seguridad' icon={<i className='ri-lock-password-line' aria-hidden />} iconPosition='start' value='seguridad' />
        </CustomTabList>
        <TabPanel value='cuenta' className='p-0'>
          {isLoading || !userData ? <AccountSkeleton /> : <AccountTab userData={userData} />}
        </TabPanel>
        <TabPanel value='seguridad' className='p-0'>
          <SecurityTab />
        </TabPanel>
      </TabContext>
    </div>
  );
}
