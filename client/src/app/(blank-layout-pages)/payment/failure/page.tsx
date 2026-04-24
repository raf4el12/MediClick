import { Suspense } from 'react';
import PaymentFailureView from '@/views/payment/Failure';

export default function PaymentFailurePage() {
  return (
    <Suspense>
      <PaymentFailureView />
    </Suspense>
  );
}
