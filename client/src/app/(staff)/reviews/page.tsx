import { RoleGuard } from '@/components/shared/RoleGuard';
import ReviewsModerationView from '@/views/reviews/moderation';

export default function ReviewsModerationPage() {
  return (
    <RoleGuard permissions={[{ action: 'UPDATE', subject: 'REVIEWS' }]} actors={['STAFF']}>
      <ReviewsModerationView />
    </RoleGuard>
  );
}
