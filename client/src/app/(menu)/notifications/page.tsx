import { RoleGuard } from '@/components/shared/RoleGuard';
import NotificationsView from '@/views/notifications';

export default function NotificationsPage() {
  return (
    <RoleGuard permissions={[{ action: 'READ', subject: 'NOTIFICATIONS' }]}>
      <NotificationsView />
    </RoleGuard>
  );
}
