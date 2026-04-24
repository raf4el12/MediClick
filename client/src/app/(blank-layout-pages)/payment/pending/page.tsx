import { Suspense } from 'react';
import PaymentPendingView from '@/views/payment/Pending';

export default function PaymentPendingPage() {
  return (
    <Suspense>
      <PaymentPendingView />
    </Suspense>
  );
}
