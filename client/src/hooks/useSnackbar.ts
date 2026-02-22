'use client';

import { useState, useCallback } from 'react';

export type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

export interface SnackbarState {
    open: boolean;
    message: string;
    severity: SnackbarSeverity;
}

export function useSnackbar() {
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: '',
        severity: 'success',
    });

    const showSnackbar = useCallback(
        (message: string, severity: SnackbarSeverity = 'success') => {
            setSnackbar({ open: true, message, severity });
        },
        [],
    );

    const closeSnackbar = useCallback(() => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    }, []);

    return { snackbar, showSnackbar, closeSnackbar };
}
