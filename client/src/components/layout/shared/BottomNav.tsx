'use client'

// Next Imports
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// MUI Imports
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Paper from '@mui/material/Paper'

// Hook Imports
import { useActorNavigation } from './useActorNavigation'

/** Accesos principales del paciente en pantallas chicas (debajo de md). */
const BottomNav = () => {
  const pathname = usePathname()
  const { bottomNav } = useActorNavigation()

  if (!bottomNav?.length) return null

  const active = bottomNav.find(link => link.path === pathname)?.path ?? false

  return (
    <Paper
      component='nav'
      aria-label='Navegación principal'
      elevation={8}
      className='cb-target'
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        insetInline: 0,
        insetBlockEnd: 0,
        zIndex: 'appBar',
        pb: 'env(safe-area-inset-bottom)'
      }}
    >
      <BottomNavigation showLabels value={active}>
        {bottomNav.map(link => (
          <BottomNavigationAction
            key={link.path}
            value={link.path}
            label={link.title}
            icon={<i className={link.icon} />}
            component={Link}
            href={link.path}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}

export default BottomNav
