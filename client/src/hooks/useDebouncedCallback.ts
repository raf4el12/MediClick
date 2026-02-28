import { useMemo, useEffect, useRef } from 'react';
import { debounce } from '@/utils/debounce';

export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number,
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const debounced = useMemo(
    () => debounce((...args: Parameters<T>) => fnRef.current(...args), delay),
    [delay],
  );

  useEffect(() => () => debounced.cancel(), [debounced]);

  return debounced;
}
