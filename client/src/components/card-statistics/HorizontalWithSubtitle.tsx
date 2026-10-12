// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { ThemeColor } from '@core/types'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

export type UserDataType = {
  title: string
  stats: string
  avatarIcon: string
  avatarColor?: ThemeColor
  subtitle: string
  /** Mientras carga, el valor se reemplaza por un esqueleto. */
  loading?: boolean
}

// Adaptada de Materio: sin la variación (`trend`), que ningún reporte de MediClick informa.
const HorizontalWithSubtitle = (props: UserDataType) => {
  // Props
  const { title, stats, avatarIcon, avatarColor, subtitle, loading } = props

  return (
    <Card className='bs-full'>
      <CardContent className='flex justify-between gap-1'>
        <div className='flex flex-col gap-1 flex-grow min-is-0'>
          <Typography color='text.primary'>{title}</Typography>
          {loading ? <Skeleton variant='text' width={80} height={40} /> : <Typography variant='h4' className='break-words'>{stats}</Typography>}
          <Typography variant='body2'>{subtitle}</Typography>
        </div>
        <CustomAvatar color={avatarColor} skin='light' variant='rounded' size={42}>
          <i className={classnames(avatarIcon, 'text-[26px]')} aria-hidden />
        </CustomAvatar>
      </CardContent>
    </Card>
  )
}

export default HorizontalWithSubtitle
