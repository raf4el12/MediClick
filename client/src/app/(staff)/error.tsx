'use client';

import ServerError from '@/views/misc/ServerError';

export default function GroupError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ServerError reset={reset} />;
}
