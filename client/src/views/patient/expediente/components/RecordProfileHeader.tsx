'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import { alpha, useTheme } from '@mui/material/styles';
import type { PatientRecord } from '../types';

interface Props {
  record: PatientRecord;
}

export default function RecordProfileHeader({ record }: Props) {
  const theme = useTheme();
  const profile = record.profile;
  const initials = profile
    ? `${profile.name[0]}${profile.lastName[0]}`.toUpperCase()
    : '?';

  const infoItems = [
    { icon: 'ri-mail-line', label: 'Email', value: profile?.email },
    { icon: 'ri-phone-line', label: 'Teléfono', value: profile?.phone },
    { icon: 'ri-id-card-line', label: 'Documento', value: profile?.typeDocument && profile?.numberDocument ? `${profile.typeDocument} ${profile.numberDocument}` : undefined },
    { icon: 'ri-drop-line', label: 'Tipo de Sangre', value: record.bloodType },
  ];

  return (
    <Card sx={{ borderRadius: '24px' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
          <Avatar
            sx={{
              width: 72,
              height: 72,
              fontSize: '1.5rem',
              fontWeight: 700,
              bgcolor: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.main,
            }}
          >
            {initials}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {profile ? `${profile.name} ${profile.lastName}` : 'Paciente'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Expediente Clínico #{record.id}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {infoItems.map((item) =>
            item.value ? (
              <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '10px',
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    }}
                  >
                    <i className={item.icon} style={{ fontSize: 18, color: theme.palette.primary.main }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {item.value}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ) : null,
          )}
        </Grid>

        {(record.allergies || record.chronicConditions) && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {record.allergies && (
              <Chip
                icon={<i className="ri-alert-line" style={{ fontSize: 16 }} />}
                label={`Alergias: ${record.allergies}`}
                color="warning"
                variant="outlined"
                size="small"
              />
            )}
            {record.chronicConditions && (
              <Chip
                icon={<i className="ri-heart-pulse-line" style={{ fontSize: 16 }} />}
                label={`Condiciones crónicas: ${record.chronicConditions}`}
                color="info"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
