'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/redux-store/hooks';
import { useSettings } from '@/@core/hooks/useSettings';

/** Exige sesión antes de mostrar un shell autenticado. */
export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { settings } = useSettings();
  // false en el servidor y en la hidratación, true después: evita mostrar el
  // shell antes de conocer la sesión persistida.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="flex flex-col flex-auto" data-skin={settings.skin}>
      {children}
    </div>
  );
}
