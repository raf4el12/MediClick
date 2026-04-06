'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { usePatientRecord } from './hooks/usePatientRecord';
import RecordProfileHeader from './components/RecordProfileHeader';
import RecordGeneralInfo from './components/RecordGeneralInfo';
import RecordMedicalHistory from './components/RecordMedicalHistory';
import RecordAppointments from './components/RecordAppointments';
import RecordVitalSigns from './components/RecordVitalSigns';

interface Props {
  patientId?: number;
}

const tabs = [
  { key: 'general', label: 'Información General', short: 'General', icon: 'ri-user-line' },
  { key: 'history', label: 'Historial Médico', short: 'Historial', icon: 'ri-file-list-3-line' },
  { key: 'vitals', label: 'Signos Vitales', short: 'Vitales', icon: 'ri-pulse-line' },
  { key: 'appointments', label: 'Citas', short: 'Citas', icon: 'ri-calendar-check-line' },
  { key: 'notes', label: 'Notas Médicas', short: 'Notas', icon: 'ri-file-text-line' },
];

export default function ExpedienteView({ patientId }: Props) {
  const theme = useTheme();
  const { record, isLoading, error } = usePatientRecord({ patientId });
  const [activeTab, setActiveTab] = useState('general');

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Skeleton variant="rounded" height={180} sx={{ borderRadius: '16px' }} />
        <Skeleton variant="rounded" height={52} sx={{ borderRadius: '12px' }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: '16px' }} />
      </Box>
    );
  }

  if (error || !record) {
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
        <Alert severity="error" sx={{ borderRadius: '16px' }}>
          {error ?? 'No se pudo cargar el expediente clínico.'}
        </Alert>
      </Box>
    );
  }

  const appointments = record.appointments ?? [];
  const notesAppointments = appointments.filter(
    (a) => a.clinicalNotes && a.clinicalNotes.length > 0,
  );

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <RecordProfileHeader record={record} />

      {/* Card-style Tabs */}
      <Card
        sx={{
          mt: 3,
          mb: 3,
          borderRadius: '12px',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            p: 0.5,
            gap: 0.5,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Box
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.8,
                  px: { xs: 1.5, sm: 2 },
                  py: 1,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                  color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                  '&:hover': {
                    bgcolor: isActive
                      ? alpha(theme.palette.primary.main, 0.1)
                      : alpha(theme.palette.action.hover, 0.6),
                  },
                }}
              >
                <i className={tab.icon} style={{ fontSize: 16 }} />
                <Typography
                  variant="body2"
                  fontWeight={isActive ? 700 : 500}
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.84rem' },
                    whiteSpace: 'nowrap',
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  {tab.label}
                </Typography>
                {/* Short label for mobile */}
                <Typography
                  variant="body2"
                  fontWeight={isActive ? 700 : 500}
                  sx={{
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    display: { xs: 'block', sm: 'none' },
                  }}
                >
                  {tab.short}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Card>

      {/* Tab Content */}
      <Box sx={{ minHeight: 300 }}>
        {activeTab === 'general' && <RecordGeneralInfo record={record} />}
        {activeTab === 'history' && <RecordMedicalHistory history={record.medicalHistory ?? []} />}
        {activeTab === 'vitals' && <RecordVitalSigns />}
        {activeTab === 'appointments' && <RecordAppointments appointments={appointments} />}
        {activeTab === 'notes' && <RecordAppointments appointments={notesAppointments} showNotesExpanded />}
      </Box>
    </Box>
  );
}
