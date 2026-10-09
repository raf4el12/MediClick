'use client';

import ServerError from '@/views/misc/ServerError';

export default function BlankError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ServerError reset={reset} fullPage />;
}
