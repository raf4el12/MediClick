import { Suspense } from 'react';
import LoginView from '@/views/Login';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
