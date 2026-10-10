'use client';

import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { AdminDashboard } from './components/AdminDashboard';
import JornadaView from '@/views/doctor/jornada';

const DashboardView = () => {
  const user = useAppSelector(selectUser);

  if (user?.role === 'DOCTOR') {
    return <JornadaView />;
  }

  return <AdminDashboard />;
};

export default DashboardView;
