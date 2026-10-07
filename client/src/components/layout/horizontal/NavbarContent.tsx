// Next Imports
import Link from 'next/link'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import NavToggle from './NavToggle'
import Logo from '@components/layout/shared/Logo'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import NotificationsDropdown from '@components/layout/shared/NotificationsDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'

// Hook Imports
import useHorizontalNav from '@menu/hooks/useHorizontalNav'
import { useActorNavigation } from '@components/layout/shared/useActorNavigation'

// Util Imports
import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'
import { homePathFor } from '@configs/navigation'

const NavbarContent = () => {
  // Hooks
  const { isBreakpointReached } = useHorizontalNav()
  const { actor } = useActorNavigation()

  return (
    <div
      className={classnames(horizontalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}
    >
      <div className='flex items-center gap-4'>
        <NavToggle />
        {/* En pantallas chicas el logo queda en el menú lateral */}
        {!isBreakpointReached && (
          <Link href={homePathFor(actor)} aria-label='Ir al inicio'>
            <Logo />
          </Link>
        )}
      </div>

      <div className='flex items-center'>
        <ModeDropdown />
        <NotificationsDropdown />
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
