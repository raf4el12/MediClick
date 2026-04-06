'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { alpha, useTheme } from '@mui/material/styles';
import type { PatientRecord } from '../types';

interface Props {
  record: PatientRecord;
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.3, fontSize: '0.68rem' }}
      >
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} sx={{ color: value ? 'text.primary' : 'text.disabled' }}>
        {value || 'Sin registrar'}
      </Typography>
    </Box>
  );
}

const genderMap: Record<string, string> = {
  M: 'Masculino',
  F: 'Femenino',
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  male: 'Masculino',
  female: 'Femenino',
};

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'info' }> = {
  ACTIVE: { label: 'Activo', color: 'warning' },
  CHRONIC: { label: 'Crónico', color: 'info' },
  RESOLVED: { label: 'Resuelto', color: 'success' },
};

export default function RecordGeneralInfo({ record }: Props) {
  const theme = useTheme();
  const profile = record.profile;
  const fullName = profile ? `${profile.name} ${profile.lastName}` : undefined;
  const document =
    profile?.typeDocument && profile?.numberDocument
      ? `${profile.typeDocument} ${profile.numberDocument}`
      : undefined;
  const gender = profile?.gender ? (genderMap[profile.gender] ?? profile.gender) : undefined;

  const chronicConditions = record.chronicConditions
    ? record.chronicConditions.split(',').map((c) => c.trim()).filter(Boolean)
    : [];
  const allergiesList = record.allergies
    ? record.allergies.split(',').map((a) => a.trim()).filter(Boolean)
    : [];

  const medicalHistory = record.medicalHistory ?? [];
  const activeHistory = medicalHistory.filter((h) => h.status !== 'RESOLVED');

  const cardSx = {
    borderRadius: '16px',
    height: '100%',
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid container spacing={3}>
        {/* Datos Personales */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 3.5 }}>
              <SectionTitle icon="ri-user-3-line" color={theme.palette.primary.main}>
                Datos Personales
              </SectionTitle>
              <InfoField label="Nombre Completo" value={fullName} />
              <InfoField label="Documento" value={document} />
              <InfoField label="Género" value={gender} />
              <InfoField label="Dirección" value={profile?.address} />
              <InfoField label="Contacto de Emergencia" value={record.emergencyContact} />
            </CardContent>
          </Card>
        </Grid>

        {/* Información Médica */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={cardSx}>
            <CardContent sx={{ p: 3.5 }}>
              <SectionTitle icon="ri-heart-pulse-line" color="#ef4444">
                Información Médica
              </SectionTitle>

              <InfoField label="Tipo de Sangre" value={record.bloodType} />

              {/* Alergias */}
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.8, fontSize: '0.68rem' }}
                >
                  Alergias
                </Typography>
                {allergiesList.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                    {allergiesList.map((a) => (
                      <Chip
                        key={a}
                        label={a}
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.73rem', borderRadius: '8px' }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight={500} color="text.disabled">
                    Sin alergias registradas
                  </Typography>
                )}
              </Box>

              {/* Condiciones Crónicas */}
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.8, fontSize: '0.68rem' }}
                >
                  Condiciones Crónicas
                </Typography>
                {chronicConditions.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                    {chronicConditions.map((c) => (
                      <Chip
                        key={c}
                        label={c}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.73rem', borderRadius: '8px' }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight={500} color="text.disabled">
                    Sin condiciones crónicas
                  </Typography>
                )}
              </Box>

              {/* Historial Activo */}
              {activeHistory.length > 0 && (
                <>
                  <Divider sx={{ mb: 2 }} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1, fontSize: '0.68rem' }}
                  >
                    Condiciones Activas
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                    {activeHistory.slice(0, 5).map((h, idx) => {
                      const config = statusConfig[h.status ?? ''] ?? { label: h.status ?? '', color: 'info' as const };
                      return (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {h.condition}
                          </Typography>
                          <Chip
                            label={config.label}
                            size="small"
                            color={config.color}
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.66rem', fontWeight: 600 }}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function SectionTitle({
  icon,
  color,
  children,
}: {
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '10px',
          bgcolor: alpha(color, 0.1),
        }}
      >
        <i className={icon} style={{ fontSize: 18, color }} />
      </Box>
      <Typography variant="subtitle1" fontWeight={700}>
        {children}
      </Typography>
    </Box>
  );
}
