'use client';

import { useEffect, useState } from 'react';
import { getTodayInTimezone, nowInTimezone } from '@/utils/timezone';
import type { SedeNow } from '../model/attentionActions';

const read = (tz: string): SedeNow => {
  const wall = nowInTimezone(tz);

  return {
    date: getTodayInTimezone(tz),
    time: `${String(wall.getHours()).padStart(2, '0')}:${String(wall.getMinutes()).padStart(2, '0')}`,
  };
};

/** Reloj de pared de la sede, actualizado cada minuto. */
export function useSedeNow(tz: string): SedeNow {
  const [now, setNow] = useState(() => read(tz));

  useEffect(() => {
    const id = setInterval(() => setNow(read(tz)), 60_000);

    return () => clearInterval(id);
  }, [tz]);

  return now;
}
