import { cookies } from 'next/headers';
import BlankLayout from '@/@layouts/BlankLayout';
import FrontLayout from '@/components/layout/front-pages/FrontLayout';
import { actorFor, homePathFor } from '@/configs/navigation';
import { roleFromAccessToken } from '@/utils/sessionRole';

/** Páginas públicas: landing y directorio de médicos, renderizadas en el servidor. */
export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const role = roleFromAccessToken((await cookies()).get('accessToken')?.value);

  return (
    <BlankLayout>
      <FrontLayout portalHref={role ? homePathFor(actorFor(role)) : null}>{children}</FrontLayout>
    </BlankLayout>
  );
}
