'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';

import { notificationsService } from '@/services/notifications.service';
import { useSnackbar } from '@/hooks/useSnackbar';
import { SuccessSnackbar } from '@/components/shared/SuccessSnackbar';
import type { Notification } from '@/views/notifications/types';
import { NotificationType } from '@/views/notifications/types';

const POLLING_INTERVAL = 30_000; // 30 seconds

const typeConfig: Record<
    string,
    { icon: string; color: string }
> = {
    [NotificationType.APPOINTMENT_CONFIRMED]: {
        icon: 'ri-check-double-line',
        color: '#10b981',
    },
    [NotificationType.APPOINTMENT_CANCELLED]: {
        icon: 'ri-close-circle-line',
        color: '#ef4444',
    },
    [NotificationType.APPOINTMENT_REMINDER]: {
        icon: 'ri-alarm-line',
        color: '#f59e0b',
    },
    [NotificationType.APPOINTMENT_RESCHEDULED]: {
        icon: 'ri-calendar-event-line',
        color: '#6366f1',
    },
    [NotificationType.NEW_APPOINTMENT]: {
        icon: 'ri-calendar-check-line',
        color: '#3b82f6',
    },
    [NotificationType.GENERAL]: {
        icon: 'ri-information-line',
        color: '#8b5cf6',
    },
};

function getRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Hace ${diffD}d`;
    return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

export default function NotificationDropdown() {
    const router = useRouter();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await notificationsService.getUnreadCount();
            setUnreadCount(res.count);
        } catch {
            // silently ignore – user might not be logged in
        }
    }, []);

    const fetchRecent = useCallback(async () => {
        setLoading(true);
        try {
            const res = await notificationsService.getMyNotifications({
                page: 1,
                limit: 5,
            });
            setNotifications(res.data);
            // Also refresh unread count
            const countRes = await notificationsService.getUnreadCount();
            setUnreadCount(countRes.count);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll unread count
    useEffect(() => {
        void fetchUnreadCount();
        intervalRef.current = setInterval(() => {
            void fetchUnreadCount();
        }, POLLING_INTERVAL);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchUnreadCount]);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
        void fetchRecent();
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await notificationsService.markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            showSnackbar('Error al marcar la notificación como leída', 'error');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsService.markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch {
            showSnackbar('Error al marcar todas como leídas', 'error');
        }
    };

    const handleViewAll = () => {
        handleClose();
        router.push('/settings/account?tab=notifications');
    };

    const open = Boolean(anchorEl);

    return (
        <>
            <Tooltip title="Notificaciones">
                <IconButton
                    size="small"
                    sx={{ color: 'text.secondary' }}
                    onClick={handleOpen}
                    id="notification-bell-btn"
                >
                    <Badge
                        badgeContent={unreadCount}
                        color="error"
                        max={99}
                        invisible={unreadCount === 0}
                        sx={{
                            '& .MuiBadge-badge': {
                                fontSize: '0.65rem',
                                height: 18,
                                minWidth: 18,
                            },
                        }}
                    >
                        <i className="ri-notification-4-line" style={{ fontSize: 22 }} />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            width: 380,
                            maxHeight: 480,
                            mt: 1.5,
                            borderRadius: '12px',
                            boxShadow: (theme) =>
                                theme.palette.mode === 'dark'
                                    ? '0 8px 32px rgba(0,0,0,0.4)'
                                    : '0 8px 32px rgba(0,0,0,0.08)',
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                        },
                    },
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2.5,
                        py: 2,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={700} fontSize="1rem">
                            Notificaciones
                        </Typography>
                        {unreadCount > 0 && (
                            <Chip
                                label={unreadCount}
                                size="small"
                                color="error"
                                sx={{
                                    height: 22,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                }}
                            />
                        )}
                    </Box>
                    {unreadCount > 0 && (
                        <Button
                            size="small"
                            onClick={handleMarkAllAsRead}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                            }}
                        >
                            Marcar todas leídas
                        </Button>
                    )}
                </Box>

                <Divider />

                {/* Notifications list */}
                <Box
                    sx={{
                        maxHeight: 320,
                        overflowY: 'auto',
                        '&::-webkit-scrollbar': { width: 4 },
                        '&::-webkit-scrollbar-thumb': {
                            borderRadius: 2,
                            bgcolor: 'action.disabled',
                        },
                    }}
                >
                    {loading ? (
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                py: 5,
                            }}
                        >
                            <CircularProgress size={28} />
                        </Box>
                    ) : notifications.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 5, px: 2 }}>
                            <i
                                className="ri-notification-off-line"
                                style={{ fontSize: 40, opacity: 0.3 }}
                            />
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 1 }}
                            >
                                No tienes notificaciones
                            </Typography>
                        </Box>
                    ) : (
                        notifications.map((notification) => {
                            const config = typeConfig[notification.type] ?? { icon: 'ri-information-line', color: '#8b5cf6' };
                            return (
                                <Box
                                    key={notification.id}
                                    onClick={() => {
                                        if (!notification.isRead) {
                                            void handleMarkAsRead(notification.id);
                                        }
                                    }}
                                    sx={{
                                        display: 'flex',
                                        gap: 1.5,
                                        px: 2.5,
                                        py: 1.5,
                                        cursor: 'pointer',
                                        transition: 'background-color 150ms',
                                        bgcolor: (theme) =>
                                            notification.isRead
                                                ? 'transparent'
                                                : alpha(theme.palette.primary.main, 0.04),
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                        },
                                        borderLeft: notification.isRead
                                            ? '3px solid transparent'
                                            : `3px solid ${config.color}`,
                                    }}
                                >
                                    {/* Icon */}
                                    <Box
                                        sx={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: alpha(config.color, 0.12),
                                            color: config.color,
                                            flexShrink: 0,
                                            mt: 0.25,
                                        }}
                                    >
                                        <i className={config.icon} style={{ fontSize: 18 }} />
                                    </Box>

                                    {/* Content */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            fontWeight={notification.isRead ? 500 : 700}
                                            noWrap
                                            sx={{ fontSize: '0.8125rem' }}
                                        >
                                            {notification.title}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                lineHeight: 1.4,
                                                mt: 0.25,
                                            }}
                                        >
                                            {notification.message}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.disabled"
                                            sx={{ fontSize: '0.6875rem', mt: 0.5, display: 'block' }}
                                        >
                                            {getRelativeTime(notification.createdAt)}
                                        </Typography>
                                    </Box>

                                    {/* Unread dot */}
                                    {!notification.isRead && (
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor: 'primary.main',
                                                flexShrink: 0,
                                                mt: 1,
                                            }}
                                        />
                                    )}
                                </Box>
                            );
                        })
                    )}
                </Box>

                <Divider />

                {/* Footer */}
                <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
                    <Button
                        fullWidth
                        size="small"
                        onClick={handleViewAll}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            borderRadius: '8px',
                        }}
                    >
                        Ver todas las notificaciones
                    </Button>
                </Box>
            </Popover>

            <SuccessSnackbar snackbar={snackbar} onClose={closeSnackbar} />
        </>
    );
}
