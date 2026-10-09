import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import Providers from '@/components/Providers';
import 'remixicon/fonts/remixicon.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediClick',
  description: 'Sistema médico MediClick',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html id="__next" lang="es" suppressHydrationWarning>
      <body className="flex is-full min-bs-full flex-auto flex-col" suppressHydrationWarning>
        <InitColorSchemeScript attribute="data" />
        <AppRouterCacheProvider options={{ key: 'mui' }}>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
