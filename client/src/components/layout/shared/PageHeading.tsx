'use client'

// Next Imports
import { usePathname } from 'next/navigation'

// MUI Imports
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Hook Imports
import { useAppSelector } from '@/redux-store/hooks'
import { selectUser } from '@/redux-store/slices/auth'

// Config Imports
import themeConfig from '@configs/themeConfig'
import { pageTitle } from '@configs/navigation'

/** Título de la ruta actual con migas y, para el personal, la sede activa. */
export const PageTitle = () => {
  const pathname = usePathname()

  return (
    <div className='flex items-center gap-1 min-is-0'>
      <Typography variant='body2' color='text.secondary' className='max-sm:hidden'>
        {themeConfig.templateName}
      </Typography>
      <i className='ri-arrow-right-s-line text-base opacity-40 max-sm:hidden' aria-hidden='true' />
      <Typography variant='body2' color='text.primary' className='font-semibold truncate' component='h1'>
        {pageTitle(pathname)}
      </Typography>
    </div>
  )
}

export const ClinicChip = () => {
  const user = useAppSelector(selectUser)

  if (!user?.clinicName) return null

  return (
    <Chip
      icon={<i className='ri-hospital-line text-base' />}
      label={user.clinicName}
      size='small'
      variant='outlined'
      color='primary'
      className='mie-2 max-sm:hidden'
    />
  )
}
