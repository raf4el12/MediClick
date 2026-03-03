'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Pagination from '@mui/material/Pagination';
import Tooltip from '@mui/material/Tooltip';
import Fade from '@mui/material/Fade';
import { alpha } from '@mui/material/styles';

import { notificationsService } from '@/services/notifications.service';
import type { PaginatedNotifications } from './types';
import { NotificationType } from './types';

const PAGE_SIZE = 10;

const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
    [NotificationType.APPOINTMENT_CONFIRMED]: {
        icon: 'ri-check-double-line',
        color: '#10b981',
        label: 'Confirmada',
    },
    [NotificationType.APPOINTMENT_CANCELLED]: {
        icon: 'ri-close-circle-line',
        color: '#ef4444',
        label: 'Cancelada',
    },
    [NotificationType.APPOINTMENT_REMINDER]: {
        icon: 'ri-alarm-line',
        color: '#f59e0b',
        label: 'Recordatorio',
    },
    [NotificationType.APPOINTMENT_RESCHEDULED]: {
        icon: 'ri-calendar-event-line',
        color: '#6366f1',
        label: 'Reprogramada',
    },
    [NotificationType.NEW_APPOINTMENT]: {
        icon: 'ri-calendar-check-line',
        color: '#3b82f6',
        label: 'Nueva cita',
    },
    [NotificationType.GENERAL]: {
        icon: 'ri-information-line',
        color: '#8b5cf6',
        label: 'General',
    },
};

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} minutos`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Hace ${diffH} horas`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Hace ${diffD} días`;

    return date.toLocaleDateString('es-PE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

type TabFilter = 'all' | 'unread' | 'read';

export default function NotificationsView() {
    const [tab, setTab] = useState<TabFilter>('all');
    const [page, setPage] = useState(1);
    const [data, setData] = useState<PaginatedNotifications | null>(null);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const isReadParam = tab === 'unread' ? false : tab === 'read' ? true : undefined;
            const res = await notificationsService.getMyNotifications({
                page,
                limit: PAGE_SIZE,
                isRead: isReadParam,
            });
            setData(res);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [tab, page]);

    const fetchUnread = useCallback(async () => {
        try {
            const res = await notificationsService.getUnreadCount();
            setUnreadCount(res.count);
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        void fetchNotifications();
        void fetchUnread();
    }, [fetchNotifications, fetchUnread]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: TabFilter) => {
        setTab(newValue);
        setPage(1);
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await notificationsService.markAsRead(id);
            // Optimistic update
            setData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    data: prev.data.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
                };
            });
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            // ignore
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsService.markAllAsRead();
            setData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    data: prev.data.map((n) => ({ ...n, isRead: true })),
                };
            });
            setUnreadCount(0);
        } catch {
            // ignore
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await notificationsService.deleteNotification(id);
            // Remove from list
            setData((prev) => {
                if (!prev) return prev;
                const updated = prev.data.filter((n) => n.id !== id);
                return { ...prev, data: updated, total: prev.total - 1 };
            });
            void fetchUnread();
        } catch {
            // ignore
        }
    };

    const notifications = data?.data ?? [];

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 3,
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                        }}
                    >
                        <i className="ri-notification-4-line" style={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" fontWeight={700}>
                            Notificaciones
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {unreadCount > 0
                                ? `${unreadCount} sin leer`
                                : 'Todas leídas'}
                        </Typography>
                    </Box>
                </Box>
                {unreadCount > 0 && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<i className="ri-check-double-line" />}
                        onClick={handleMarkAllAsRead}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                    >
                        Marcar todas como leídas
                    </Button>
                )}
            </Box>

            {/* Tabs */}
            <Card
                sx={{
                    borderRadius: '12px',
                    boxShadow: (theme) =>
                        theme.palette.mode === 'dark'
                            ? '0 2px 12px rgba(0,0,0,0.3)'
                            : '0 2px 12px rgba(0,0,0,0.04)',
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ px: 2, pt: 1 }}>
                    <Tabs
                        value={tab}
                        onChange={handleTabChange}
                        sx={{
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                minHeight: 44,
                            },
                        }}
                    >
                        <Tab label="Todas" value="all" />
                        <Tab
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    No leídas
                                    {unreadCount > 0 && (
                                        <Chip
                                            label={unreadCount}
                                            size="small"
                                            color="error"
                                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                        />
                                    )}
                                </Box>
                            }
                            value="unread"
                        />
                        <Tab label="Leídas" value="read" />
                    </Tabs>
                </Box>

                <Divider />

                {/* List */}
                {loading ? (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            py: 8,
                        }}
                    >
                        <CircularProgress size={32} />
                    </Box>
                ) : notifications.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
                        <i
                            className="ri-notification-off-line"
                            style={{ fontSize: 56, opacity: 0.15 }}
                        />
                        <Typography
                            variant="h6"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ mt: 2 }}
                        >
                            {tab === 'unread'
                                ? 'No tienes notificaciones sin leer'
                                : tab === 'read'
                                    ? 'No tienes notificaciones leídas'
                                    : 'No tienes notificaciones'}
                        </Typography>
                        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                            Las notificaciones aparecerán aquí cuando haya actividad
                        </Typography>
                    </Box>
                ) : (
                    notifications.map((n, idx) => {
                        const config = typeConfig[n.type] ?? { icon: 'ri-information-line', color: '#8b5cf6', label: 'General' };
                        return (
                            <Fade in key={n.id} timeout={200 + idx * 50}>
                                <Box>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 2,
                                            px: 3,
                                            py: 2,
                                            bgcolor: (theme) =>
                                                n.isRead
                                                    ? 'transparent'
                                                    : alpha(theme.palette.primary.main, 0.03),
                                            borderLeft: n.isRead
                                                ? '3px solid transparent'
                                                : `3px solid ${config.color}`,
                                            transition: 'background-color 200ms',
                                            '&:hover': { bgcolor: 'action.hover' },
                                        }}
                                    >
                                        {/* Icon */}
                                        <Box
                                            sx={{
                                                width: 42,
                                                height: 42,
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: alpha(config.color, 0.12),
                                                color: config.color,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <i className={config.icon} style={{ fontSize: 20 }} />
                                        </Box>

                                        {/* Content */}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    mb: 0.25,
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={n.isRead ? 500 : 700}
                                                    sx={{ fontSize: '0.875rem' }}
                                                >
                                                    {n.title}
                                                </Typography>
                                                <Chip
                                                    label={config.label}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.65rem',
                                                        fontWeight: 600,
                                                        bgcolor: alpha(config.color, 0.1),
                                                        color: config.color,
                                                    }}
                                                />
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}
                                            >
                                                {n.message}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.disabled"
                                                sx={{ mt: 0.5, display: 'block', fontSize: '0.75rem' }}
                                            >
                                                {formatDate(n.createdAt)}
                                            </Typography>
                                        </Box>

                                        {/* Actions */}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {!n.isRead && (
                                                <Tooltip title="Marcar como leída">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => void handleMarkAsRead(n.id)}
                                                        sx={{ color: 'primary.main' }}
                                                    >
                                                        <i
                                                            className="ri-check-line"
                                                            style={{ fontSize: 18 }}
                                                        />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Eliminar">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => void handleDelete(n.id)}
                                                    sx={{
                                                        color: 'text.disabled',
                                                        '&:hover': { color: 'error.main' },
                                                    }}
                                                >
                                                    <i
                                                        className="ri-delete-bin-7-line"
                                                        style={{ fontSize: 16 }}
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                    {idx < notifications.length - 1 && <Divider />}
                                </Box>
                            </Fade>
                        );
                    })
                )}

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                    <>
                        <Divider />
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                py: 2,
                            }}
                        >
                            <Pagination
                                count={data.totalPages}
                                page={page}
                                onChange={(_, value) => setPage(value)}
                                color="primary"
                                shape="rounded"
                                size="small"
                            />
                        </Box>
                    </>
                )}
            </Card>
        </Box>
    );
}
