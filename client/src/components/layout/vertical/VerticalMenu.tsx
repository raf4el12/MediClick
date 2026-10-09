// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, MenuItem, MenuSection } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useActorNavigation } from '@components/layout/shared/useActorNavigation'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  scrollMenu: (container: HTMLElement | Event, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const { sections } = useActorNavigation()

  // Vars
  const { isBreakpointReached, transitionDuration } = verticalNavOptions

  const menu = (
    <Menu
      popoutMenuOffset={{ mainAxis: 10 }}
      menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
      renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
      renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
      menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
    >
      {sections.map(section => (
        <MenuSection key={section.title} label={section.title}>
          {section.items.map(item => (
            <MenuItem key={item.path} href={item.path} icon={<i className={item.icon} />}>
              {item.title}
            </MenuItem>
          ))}
        </MenuSection>
      ))}
    </Menu>
  )

  // En pantallas chicas el menú usa el scroll del navegador; en escritorio, el de Materio.
  return isBreakpointReached ? (
    <div className='bs-full overflow-y-auto overflow-x-hidden' onScroll={event => scrollMenu(event.nativeEvent, false)}>
      {menu}
    </div>
  ) : (
    <PerfectScrollbar
      options={{ wheelPropagation: false, suppressScrollX: true }}
      onScrollY={container => scrollMenu(container, true)}
    >
      {menu}
    </PerfectScrollbar>
  )
}

export default VerticalMenu
