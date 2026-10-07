'use client'

// MUI Imports
import IconButton from '@mui/material/IconButton'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

const NavToggle = () => {
  // Hooks
  const { toggleVerticalNav, isBreakpointReached } = useVerticalNav()

  const handleClick = () => {
    toggleVerticalNav()
  }

  return (
    <>
      {isBreakpointReached && (
        <IconButton onClick={handleClick} aria-label='Abrir menú de navegación' className='!text-textPrimary'>
          <i className='ri-menu-line' />
        </IconButton>
      )}
    </>
  )
}

export default NavToggle
