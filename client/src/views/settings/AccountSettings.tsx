'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
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

export default function AccountSettings() {
    const [value, setValue] = useState(0);

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
                <AccountTab />
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
