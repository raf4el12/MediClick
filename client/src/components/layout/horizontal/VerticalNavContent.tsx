// React Imports
import { useRef } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import { styled } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import NavHeader from '@menu/components/vertical-menu/NavHeader'
import Logo from '@components/layout/shared/Logo'
import NavCollapseIcons from '@menu/components/vertical-menu/NavCollapseIcons'

// Hook Imports
import useHorizontalNav from '@menu/hooks/useHorizontalNav'
import { useActorNavigation } from '@components/layout/shared/useActorNavigation'

// Util Imports
import { mapHorizontalToVerticalMenu } from '@menu/utils/menuUtils'
import { homePathFor } from '@configs/navigation'

const StyledBoxForShadow = styled('div')(({ theme }) => ({
  top: 60,
  left: -8,
  zIndex: 2,
  opacity: 0,
  position: 'absolute',
  pointerEvents: 'none',
  width: 'calc(100% + 15px)',
  height: theme.mixins.toolbar.minHeight,
  transition: 'opacity .15s ease-in-out',
  background: `linear-gradient(var(--mui-palette-background-default) ${
    theme.direction === 'rtl' ? '95%' : '5%'
  }, rgb(var(--mui-palette-background-defaultChannel) / 0.85) 30%, rgb(var(--mui-palette-background-defaultChannel) / 0.5) 65%, rgb(var(--mui-palette-background-defaultChannel) / 0.3) 75%, transparent)`,
  '&.scrolled': {
    opacity: 1
  }
}))

const VerticalNavContent = ({ children }: ChildrenType) => {
  // Hooks
  const { isBreakpointReached } = useHorizontalNav()
  const { actor } = useActorNavigation()

  // Refs
  const shadowRef = useRef<HTMLDivElement>(null)

  const scrollMenu = (container: HTMLElement | Event, isPerfectScrollbar: boolean) => {
    const target = (
      isBreakpointReached || !isPerfectScrollbar ? (container as Event).target : container
    ) as HTMLElement

    shadowRef.current?.classList.toggle('scrolled', target.scrollTop > 0)
  }

  return (
    <>
      <NavHeader>
        <Link href={homePathFor(actor)} aria-label='Ir al inicio'>
          <Logo />
        </Link>
        <NavCollapseIcons
          lockedIcon={<i className='ri-radio-button-line text-xl' />}
          unlockedIcon={<i className='ri-checkbox-blank-circle-line text-xl' />}
          closeIcon={<i className='ri-close-line text-xl' />}
          className='text-textSecondary'
        />
      </NavHeader>
      <StyledBoxForShadow ref={shadowRef} />
      {isBreakpointReached ? (
        <div
          className='bs-full overflow-y-auto overflow-x-hidden'
          onScroll={event => scrollMenu(event.nativeEvent, false)}
        >
          {mapHorizontalToVerticalMenu(children)}
        </div>
      ) : (
        <PerfectScrollbar
          options={{ wheelPropagation: false, suppressScrollX: true }}
          onScrollY={container => scrollMenu(container, true)}
        >
          {mapHorizontalToVerticalMenu(children)}
        </PerfectScrollbar>
      )}
    </>
  )
}

export default VerticalNavContent
