'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import classnames from 'classnames';
import CustomAvatar from '@core/components/mui/Avatar';
import OptionMenu from '@core/components/option-menu';
import { formatRelativeTime } from '@/utils/formatDate';
import { useNotificationActions, useNotificationList, useUnreadCount } from './hooks/useNotifications';
import { typeOf } from './notificationTypes';

const PAGE_SIZE = 10;

type TabFilter = 'all' | 'unread' | 'read';

const EMPTY: Record<TabFilter, string> = {
  all: 'No tienes notificaciones',
  unread: 'No tienes notificaciones sin leer',
  read: 'No tienes notificaciones leídas',
};

/** Bandeja de notificaciones a página completa (estilo del `NotificationsDropdown` de Materio). */
export default function NotificationsView() {
  const [tab, setTab] = useState<TabFilter>('all');
  const [page, setPage] = useState(1);
  const isRead = tab === 'unread' ? false : tab === 'read' ? true : undefined;
  const list = useNotificationList({ page, limit: PAGE_SIZE, ...(isRead === undefined ? {} : { isRead }) });
  const unread = useUnreadCount();
  const { markAsRead, markAllAsRead, remove } = useNotificationActions();
  const unreadCount = unread.data ?? 0;
  const rows = list.data?.data ?? [];

  return (
    <div className='flex flex-col gap-6 max-is-[860px] mli-auto is-full'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <Typography variant='h4' component='h1'>
            Notificaciones
          </Typography>
          <Typography color='text.secondary'>{unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}</Typography>
        </div>
        {unreadCount > 0 && (
          <Button variant='outlined' startIcon={<i className='ri-check-double-line' aria-hidden />} onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
            Marcar todas como leídas
          </Button>
        )}
      </div>
      <Card>
        <Tabs
          value={tab}
          onChange={(_, value: TabFilter) => {
            setTab(value);
            setPage(1);
          }}
          aria-label='Filtrar notificaciones'
          className='pli-4'
        >
          <Tab label='Todas' value='all' />
          <Tab
            value='unread'
            label={
              <span className='flex items-center gap-2'>
                Sin leer
                {unreadCount > 0 && <Chip size='small' variant='tonal' color='primary' label={unreadCount} />}
              </span>
            }
          />
          <Tab label='Leídas' value='read' />
        </Tabs>
        <Divider />
        {list.isLoading ? (
          <CardContent className='flex flex-col gap-3'>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} variant='rounded' height={64} />
            ))}
          </CardContent>
        ) : rows.length === 0 ? (
          <CardContent className='flex flex-col items-center gap-2 plb-12 text-center'>
            <i className='ri-notification-off-line text-5xl' aria-hidden style={{ color: 'var(--mui-palette-text-secondary)' }} />
            <Typography variant='h6' component='p'>
              {EMPTY[tab]}
            </Typography>
            <Typography color='text.secondary'>Las notificaciones aparecerán aquí cuando haya actividad en tus citas.</Typography>
          </CardContent>
        ) : (
          <ul className='m-0 p-0 list-none'>
            {rows.map((n, index) => {
              const type = typeOf(n.type);
              return (
                <li key={n.id} className={classnames('flex gap-4 pli-5 plb-4', { 'border-be': index < rows.length - 1 })}>
                  <CustomAvatar color={type.color} skin='light-static' aria-hidden>
                    <i className={type.icon} />
                  </CustomAvatar>
                  <div className='flex flex-col gap-1 flex-auto min-is-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Typography className={n.isRead ? 'font-normal' : 'font-medium'} color='text.primary'>
                        {n.title}
                      </Typography>
                      {!n.isRead && <Chip size='small' variant='tonal' color='primary' label='Sin leer' />}
                    </div>
                    <Typography variant='body2' color='text.secondary'>
                      {n.message}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {type.label} · {formatRelativeTime(n.createdAt)}
                    </Typography>
                  </div>
                  <OptionMenu
                    iconButtonProps={{ 'aria-label': `Acciones de «${n.title}»` }}
                    options={[
                      ...(n.isRead
                        ? []
                        : [{ text: 'Marcar como leída', icon: 'ri-check-line', menuItemProps: { className: 'gap-2', onClick: () => markAsRead.mutate(n) } }]),
                      { text: 'Eliminar', icon: 'ri-delete-bin-7-line', menuItemProps: { className: 'gap-2', onClick: () => remove.mutate(n) } },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        )}
        {list.data && list.data.totalPages > 1 && (
          <>
            <Divider />
            <div className='flex justify-center plb-4'>
              <Pagination count={list.data.totalPages} page={page} onChange={(_, value) => setPage(value)} color='primary' shape='rounded' />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
