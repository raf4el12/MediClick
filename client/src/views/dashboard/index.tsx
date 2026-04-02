'use client';

import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { AdminDashboard } from './components/AdminDashboard';
import DoctorDashboardView from '@/views/doctor';

const DashboardView = () => {
  const user = useAppSelector(selectUser);

  if (user?.role === 'DOCTOR') {
    return <DoctorDashboardView />;
  }

  return <AdminDashboard />;
};

export default DashboardView;
