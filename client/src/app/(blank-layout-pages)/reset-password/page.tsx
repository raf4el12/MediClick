import { Suspense } from 'react';
import ResetPasswordView from '@/views/ResetPassword';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  );
}
