'use client'

// React Imports
import type { HTMLAttributes, KeyboardEvent, ReactElement } from 'react'

// Hook Imports
import useVerticalNav from '../../hooks/useVerticalNav'

// Icon Imports
import CloseIcon from '../../svg/Close'
import RadioCircleIcon from '../../svg/RadioCircle'
import RadioCircleMarkedIcon from '../../svg/RadioCircleMarked'

type NavCollapseIconsProps = HTMLAttributes<HTMLSpanElement> & {
  closeIcon?: ReactElement
  lockedIcon?: ReactElement
  unlockedIcon?: ReactElement
  onClick?: () => void
  onClose?: () => void
}

const NavCollapseIcons = (props: NavCollapseIconsProps) => {
  // Props
  const { closeIcon, lockedIcon, unlockedIcon, onClick, onClose, ...rest } = props

  // Hooks
  const { isCollapsed, collapseVerticalNav, isBreakpointReached, toggleVerticalNav } = useVerticalNav()

  // Handle Lock / Unlock Icon Buttons click
  const handleClick = (action: 'lock' | 'unlock') => {
    // Setup the verticalNav to be locked or unlocked
    const collapse = action === 'lock' ? false : true

    // Tell the verticalNav to lock or unlock
    collapseVerticalNav(collapse)

    // Call onClick function if passed
    onClick && onClick()
  }

  // Handle Close button click
  const handleClose = () => {
    // Close verticalNav using toggle verticalNav function
    toggleVerticalNav(false)

    // Call onClose function if passed
    onClose && onClose()
  }

  // role='button' en un span: Enter y Espacio también lo activan (WCAG 2.1.1)
  const onActivate = (action: () => void) => (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      action()
    }
  }

  return (
    <>
      {isBreakpointReached ? (
        <span
          role='button'
          tabIndex={0}
          aria-label='Cerrar menú'
          style={{ display: 'flex', cursor: 'pointer' }}
          onClick={handleClose}
          onKeyDown={onActivate(handleClose)}
          {...rest}
        >
          {closeIcon ?? <CloseIcon />}
        </span>
      ) : isCollapsed ? (
        <span
          role='button'
          tabIndex={0}
          aria-label='Fijar el menú expandido'
          style={{ display: 'flex', cursor: 'pointer' }}
          onClick={() => handleClick('lock')}
          onKeyDown={onActivate(() => handleClick('lock'))}
          {...rest}
        >
          {unlockedIcon ?? <RadioCircleIcon />}
        </span>
      ) : (
        <span
          role='button'
          tabIndex={0}
          aria-label='Colapsar el menú'
          style={{ display: 'flex', cursor: 'pointer' }}
          onClick={() => handleClick('unlock')}
          onKeyDown={onActivate(() => handleClick('unlock'))}
          {...rest}
        >
          {lockedIcon ?? <RadioCircleMarkedIcon />}
        </span>
      )}
    </>
  )
}

export default NavCollapseIcons
