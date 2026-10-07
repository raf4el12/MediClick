'use client'

// React Imports
import { useCallback, useSyncExternalStore } from 'react'

// Suscripción al tamaño de ventana sin setState dentro de un efecto.
const useMediaQuery = (breakpoint?: string): boolean => {
  const query = breakpoint && breakpoint !== 'always' ? `(max-width: ${breakpoint})` : null

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!query) return () => {}
      const media = window.matchMedia(query)

      media.addEventListener('change', onChange)

      return () => media.removeEventListener('change', onChange)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    () => (query ? window.matchMedia(query).matches : breakpoint === 'always'),
    () => breakpoint === 'always'
  )
}

export default useMediaQuery
