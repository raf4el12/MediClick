'use client';

import { useSessionValidator } from '@/hooks/useSessionValidator';

export default function SessionValidator() {
  useSessionValidator();
  return null;
}
