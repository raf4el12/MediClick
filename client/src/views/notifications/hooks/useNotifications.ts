'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications.service';
import { notify } from '@/utils/notify';
import type { Notification, NotificationQueryParams, PaginatedNotifications } from '../types';

/**
 * Claves compartidas por el desplegable de la barra y la página de notificaciones: cualquier cambio
 * invalida `['notifications']` y los dos se actualizan juntos.
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  lists: ['notifications', 'list'] as const,
  list: (params: NotificationQueryParams) => ['notifications', 'list', params] as const,
};

const POLLING_INTERVAL = 30_000;

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => (await notificationsService.getUnreadCount()).count,
    refetchInterval: POLLING_INTERVAL,
  });
}

export function useNotificationList(params: NotificationQueryParams, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsService.getMyNotifications(params),
    enabled,
    placeholderData: (previous) => previous,
  });
}

type Snapshot = { lists: [readonly unknown[], PaginatedNotifications | undefined][]; count: number | undefined };

/** Guarda el estado de las listas y del contador para deshacer una actualización optimista. */
async function snapshot(queryClient: QueryClient): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: notificationKeys.all });

  return {
    lists: queryClient.getQueriesData<PaginatedNotifications>({ queryKey: notificationKeys.lists }),
    count: queryClient.getQueryData<number>(notificationKeys.unreadCount),
  };
}

function restore(queryClient: QueryClient, previous: Snapshot | undefined) {
  if (!previous) return;
  previous.lists.forEach(([key, data]) => queryClient.setQueryData(key, data));
  queryClient.setQueryData(notificationKeys.unreadCount, previous.count);
}

const updateLists = (queryClient: QueryClient, update: (rows: Notification[]) => Notification[]) =>
  queryClient.setQueriesData<PaginatedNotifications>({ queryKey: notificationKeys.lists }, (page) => {
    if (!page) return page;
    const data = update(page.data);
    return { ...page, data, total: page.total - (page.data.length - data.length) };
  });

/** Marcar como leída, marcar todas y eliminar, con actualización optimista en lista y contador. */
export function useNotificationActions() {
  const queryClient = useQueryClient();
  const settle = () => void queryClient.invalidateQueries({ queryKey: notificationKeys.all });

  const markAsRead = useMutation({
    mutationFn: (notification: Notification) => notificationsService.markAsRead(notification.id),
    onMutate: async (notification) => {
      const previous = await snapshot(queryClient);
      updateLists(queryClient, (rows) => rows.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
      if (!notification.isRead) queryClient.setQueryData<number>(notificationKeys.unreadCount, (c) => Math.max(0, (c ?? 0) - 1));
      return previous;
    },
    onError: (_err, _vars, previous) => {
      restore(queryClient, previous);
      notify('No se pudo marcar la notificación como leída', 'error');
    },
    onSettled: settle,
  });

  const markAllAsRead = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onMutate: async () => {
      const previous = await snapshot(queryClient);
      updateLists(queryClient, (rows) => rows.map((n) => ({ ...n, isRead: true })));
      queryClient.setQueryData(notificationKeys.unreadCount, 0);
      return previous;
    },
    onError: (_err, _vars, previous) => {
      restore(queryClient, previous);
      notify('No se pudieron marcar todas como leídas', 'error');
    },
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (notification: Notification) => notificationsService.deleteNotification(notification.id),
    onMutate: async (notification) => {
      const previous = await snapshot(queryClient);
      updateLists(queryClient, (rows) => rows.filter((n) => n.id !== notification.id));
      if (!notification.isRead) queryClient.setQueryData<number>(notificationKeys.unreadCount, (c) => Math.max(0, (c ?? 0) - 1));
      return previous;
    },
    onError: (_err, _vars, previous) => {
      restore(queryClient, previous);
      notify('No se pudo eliminar la notificación', 'error');
    },
    onSettled: settle,
  });

  return { markAsRead, markAllAsRead, remove };
}
