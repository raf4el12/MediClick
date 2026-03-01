'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import AccountTab from './account/AccountTab';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `settings-tab-${index}`,
        'aria-controls': `settings-tabpanel-${index}`,
    };
}

function AccountTabSkeleton() {
    return (
        <Card sx={{ p: { xs: 3, md: 4 }, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 3 }}>
                <Skeleton variant="rounded" width={100} height={100} />
                <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width={200} height={28} />
                    <Skeleton variant="text" width={250} height={20} />
                    <Skeleton variant="rounded" width={100} height={24} sx={{ mt: 1 }} />
                </Box>
            </Box>
            <Divider sx={{ mb: 4 }} />
            <Grid container spacing={4}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={i}>
                        <Skeleton variant="rounded" height={56} />
                    </Grid>
                ))}
            </Grid>
        </Card>
    );
}

export default function AccountSettings() {
    const [value, setValue] = useState(0);

    const { data: userData, isLoading } = useQuery({
        queryKey: ['auth', 'profile'],
        queryFn: () => authService.getProfile(),
        staleTime: 2 * 60 * 1000,
    });

    const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    aria-label="settings tabs"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTabs-indicator': {
                            backgroundColor: 'primary.main',
                        },
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            minHeight: 48,
                            color: 'text.secondary',
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 1,
                            '&.Mui-selected': {
                                color: 'primary.main',
                            },
                        }
                    }}
                >
                    <Tab
                        icon={<i className="ri-user-3-line" style={{ fontSize: 18 }} />}
                        label="Cuenta"
                        {...a11yProps(0)}
                    />
                    <Tab
                        icon={<i className="ri-lock-password-line" style={{ fontSize: 18 }} />}
                        label="Seguridad"
                        {...a11yProps(1)}
                    />
                    <Tab
                        icon={<i className="ri-notification-4-line" style={{ fontSize: 18 }} />}
                        label="Notificaciones"
                        {...a11yProps(2)}
                    />
                </Tabs>
            </Box>

            {/* Account Tab */}
            <CustomTabPanel value={value} index={0}>
                {isLoading || !userData ? (
                    <AccountTabSkeleton />
                ) : (
                    <AccountTab userData={userData} />
                )}
            </CustomTabPanel>

            {/* Security Tab */}
            <CustomTabPanel value={value} index={1}>
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                        Configuración de Seguridad (Próximamente)
                    </Typography>
                </Box>
            </CustomTabPanel>

            {/* Notifications Tab */}
            <CustomTabPanel value={value} index={2}>
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                        Notificaciones (Próximamente)
                    </Typography>
                </Box>
            </CustomTabPanel>
        </Box>
    );
}
