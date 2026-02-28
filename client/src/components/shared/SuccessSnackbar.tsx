'use client';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Slide from '@mui/material/Slide';
import type { SnackbarState, SnackbarSeverity } from '@/hooks/useSnackbar';

const SNACKBAR_ANCHOR = { vertical: 'bottom' as const, horizontal: 'right' as const };

interface SuccessSnackbarProps {
    snackbar: SnackbarState;
    onClose: () => void;
    autoHideDuration?: number;
}

function SlideTransition(props: Parameters<typeof Slide>[0]) {
    return <Slide {...props} direction="up" />;
}

export function SuccessSnackbar({
    snackbar,
    onClose,
    autoHideDuration = 3500,
}: SuccessSnackbarProps) {
    const iconMap: Record<SnackbarSeverity, string> = {
        success: 'ri-checkbox-circle-line',
        error: 'ri-error-warning-line',
        warning: 'ri-alert-line',
        info: 'ri-information-line',
    };

    return (
        <Snackbar
            open={snackbar.open}
            autoHideDuration={autoHideDuration}
            onClose={onClose}
            anchorOrigin={SNACKBAR_ANCHOR}
            TransitionComponent={SlideTransition}
        >
            <Alert
                severity={snackbar.severity}
                variant="filled"
                onClose={onClose}
                icon={<i className={iconMap[snackbar.severity]} style={{ fontSize: 20 }} />}
                sx={(theme) => ({
                    width: '100%',
                    minWidth: 280,
                    boxShadow: `0 8px 32px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.18)'}`,
                    borderRadius: 2,
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    alignItems: 'center',
                    '& .MuiAlert-action': {
                        pt: 0,
                    },
                })}
            >
                {snackbar.message}
            </Alert>
        </Snackbar>
    );
}
