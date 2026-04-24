import { Suspense } from 'react';
import PaymentSuccessView from '@/views/payment/Success';

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccessView />
    </Suspense>
  );
}
