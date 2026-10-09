'use client';

import dynamic from 'next/dynamic';
import LayoutWrapper from '@/@layouts/LayoutWrapper';
import VerticalLayout from '@/@layouts/VerticalLayout';
import HorizontalLayout from '@/@layouts/HorizontalLayout';
import Navigation from '@components/layout/vertical/Navigation';
import Navbar from '@components/layout/vertical/Navbar';
import VerticalFooter from '@components/layout/vertical/Footer';
import Header from '@components/layout/horizontal/Header';
import HorizontalFooter from '@components/layout/horizontal/Footer';
import BottomNav from '@components/layout/shared/BottomNav';
import SkipToContent from '@/@core/components/accessibility/SkipToContent';
import { usePermissions } from '@/hooks/usePermissions';
import { actorFor } from '@configs/navigation';

const Customizer = dynamic(() => import('@/@core/components/customizer'));

/** Personal de sede: layout vertical de Materio con el menú por permisos. */
export function StaffShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipToContent />
      <LayoutWrapper>
        <VerticalLayout navigation={<Navigation />} navbar={<Navbar />} footer={<VerticalFooter />}>
          {children}
        </VerticalLayout>
      </LayoutWrapper>
      <Customizer />
    </>
  );
}

/** Portal del paciente: layout horizontal y barra inferior en pantallas chicas. */
export function PatientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipToContent />
      <LayoutWrapper>
        <HorizontalLayout header={<Header />} footer={<HorizontalFooter />}>
          {/* Espacio para que la barra inferior no tape el final del contenido */}
          <div className="max-md:pbe-20">{children}</div>
        </HorizontalLayout>
        <BottomNav />
      </LayoutWrapper>
      <Customizer />
    </>
  );
}

/** Rutas que comparten ambos actores (/notifications, /settings/account). */
export default function ActorShell({ children }: { children: React.ReactNode }) {
  const { roleName } = usePermissions();

  return actorFor(roleName) === 'PATIENT' ? (
    <PatientShell>{children}</PatientShell>
  ) : (
    <StaffShell>{children}</StaffShell>
  );
}
