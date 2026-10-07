'use client'

// React Imports
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import useMediaQuery from '@mui/material/useMediaQuery'
import Button from '@mui/material/Button'
import type { Theme } from '@mui/material/styles'

// Third Party Components
import classnames from 'classnames'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { toast } from 'react-toastify'

// Type Imports
import type { ThemeColor } from '@core/types'
import type { Notification } from '@/views/notifications/types'
import { NotificationType } from '@/views/notifications/types'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// Service Imports
import { notificationsService } from '@/services/notifications.service'

const POLLING_INTERVAL = 30_000

const typeAvatar: Record<string, { icon: string; color: ThemeColor }> = {
  [NotificationType.APPOINTMENT_CONFIRMED]: { icon: 'ri-check-double-line', color: 'success' },
  [NotificationType.APPOINTMENT_CANCELLED]: { icon: 'ri-close-circle-line', color: 'error' },
  [NotificationType.APPOINTMENT_REMINDER]: { icon: 'ri-alarm-line', color: 'warning' },
  [NotificationType.APPOINTMENT_RESCHEDULED]: { icon: 'ri-calendar-event-line', color: 'info' },
  [NotificationType.NEW_APPOINTMENT]: { icon: 'ri-calendar-check-line', color: 'primary' },
  [NotificationType.GENERAL]: { icon: 'ri-information-line', color: 'secondary' }
}

function relativeTime(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)

  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)

  if (diffH < 24) return `Hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)

  if (diffD < 7) return `Hace ${diffD} d`

  return new Date(dateStr).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

const ScrollWrapper = ({ children, hidden }: { children: ReactNode; hidden: boolean }) =>
  hidden ? (
    <div className='overflow-x-hidden bs-full'>{children}</div>
  ) : (
    <PerfectScrollbar className='bs-full' options={{ wheelPropagation: false, suppressScrollX: true }}>
      {children}
    </PerfectScrollbar>
  )

const NotificationsDropdown = () => {
  // States
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  // Refs
  const anchorRef = useRef<HTMLButtonElement>(null)

  // Hooks
  const router = useRouter()
  const hidden = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))
  const { settings } = useSettings()

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsService.getUnreadCount()

      setUnreadCount(res.count)
    } catch {
      // El sondeo no interrumpe al usuario si falla
    }
  }, [])

  const fetchRecent = useCallback(async () => {
    setLoading(true)

    try {
      const [res, countRes] = await Promise.all([
        notificationsService.getMyNotifications({ page: 1, limit: 5 }),
        notificationsService.getUnreadCount()
      ])

      setNotifications(res.data)
      setUnreadCount(countRes.count)
    } catch {
      toast.error('No se pudieron cargar las notificaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchUnreadCount()
    const interval = setInterval(() => void fetchUnreadCount(), POLLING_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  const handleToggle = () => {
    if (!open) void fetchRecent()
    setOpen(prev => !prev)
  }

  const handleMarkAsRead = async (event: MouseEvent<HTMLElement>, notification: Notification) => {
    event.stopPropagation()
    if (notification.isRead) return

    try {
      await notificationsService.markAsRead(notification.id)
      setNotifications(prev => prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n)))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      toast.error('Error al marcar la notificación como leída')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      toast.error('Error al marcar todas como leídas')
    }
  }

  const handleViewAll = () => {
    setOpen(false)
    router.push('/notifications')
  }

  return (
    <>
      <Tooltip title='Notificaciones'>
        <IconButton
          ref={anchorRef}
          onClick={handleToggle}
          className='!text-textPrimary'
          aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
          id='notification-bell-btn'
        >
          <Badge
            color='error'
            badgeContent={unreadCount}
            max={99}
            invisible={unreadCount === 0}
            overlap='circular'
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <i className='ri-notification-2-line' />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        {...(isSmallScreen
          ? {
              className: 'is-full !mbs-4 z-[1] max-bs-[550px]',
              modifiers: [{ name: 'preventOverflow', options: { padding: themeConfig.layoutPadding } }]
            }
          : { className: 'is-96 !mbs-4 z-[1] max-bs-[550px]' })}
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper className={classnames('bs-full', settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg')}>
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <div className='bs-full flex flex-col'>
                  <div className='flex items-center justify-between plb-2 pli-4 is-full gap-4'>
                    <Typography variant='h5' className='flex-auto'>
                      Notificaciones
                    </Typography>
                    {unreadCount > 0 && (
                      <Chip size='small' variant='tonal' color='primary' label={`${unreadCount} sin leer`} />
                    )}
                    {unreadCount > 0 && (
                      <Tooltip title='Marcar todas como leídas'>
                        <IconButton size='small' onClick={handleMarkAllAsRead} className='text-textPrimary'>
                          <i className='ri-mail-open-line' />
                        </IconButton>
                      </Tooltip>
                    )}
                  </div>
                  <Divider />
                  <ScrollWrapper hidden={hidden}>
                    {loading ? (
                      <div className='flex justify-center p-6'>
                        <CircularProgress size={24} aria-label='Cargando notificaciones' />
                      </div>
                    ) : notifications.length === 0 ? (
                      <Typography className='p-6 text-center' color='text.secondary'>
                        No tienes notificaciones
                      </Typography>
                    ) : (
                      notifications.map((notification, index) => {
                        const avatar = typeAvatar[notification.type] ?? typeAvatar[NotificationType.GENERAL]!

                        return (
                          <div
                            key={notification.id}
                            className={classnames('flex plb-3 pli-4 gap-3 cursor-pointer hover:bg-actionHover', {
                              'border-be': index !== notifications.length - 1
                            })}
                            onClick={e => handleMarkAsRead(e, notification)}
                          >
                            <CustomAvatar color={avatar.color} skin='light-static'>
                              <i className={avatar.icon} />
                            </CustomAvatar>
                            <div className='flex flex-col flex-auto'>
                              <Typography className='font-medium mbe-1' color='text.primary'>
                                {notification.title}
                              </Typography>
                              <Typography variant='caption' color='text.secondary' className='mbe-2'>
                                {notification.message}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {relativeTime(notification.createdAt)}
                              </Typography>
                            </div>
                            {!notification.isRead && (
                              <Badge variant='dot' color='primary' className='mbs-1 mie-1' aria-label='Sin leer' />
                            )}
                          </div>
                        )
                      })
                    )}
                  </ScrollWrapper>
                  <Divider />
                  <div className='p-4'>
                    <Button fullWidth variant='contained' size='small' onClick={handleViewAll}>
                      Ver todas las notificaciones
                    </Button>
                  </div>
                </div>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default NotificationsDropdown
