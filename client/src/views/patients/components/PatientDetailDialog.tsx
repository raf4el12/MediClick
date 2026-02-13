'use client';

import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import { useTheme, alpha } from '@mui/material/styles';
import type { Patient } from '../types';

interface PatientDetailDialogProps {
  patient: Patient | null;
  onClose: () => void;
}

function formatGender(gender: string | null): string {
  if (!gender) return 'No especificado';
  if (gender === 'M') return 'Masculino';
  if (gender === 'F') return 'Femenino';
  return gender;
}

function getAge(birthday: string | null): string {
  if (!birthday) return 'N/A';
  const diff = Date.now() - new Date(birthday).getTime();
  return `${Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))} años`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name: string, lastName: string): string {
  return `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function PatientDetailDialog({ patient, onClose }: PatientDetailDialogProps) {
  const theme = useTheme();

  if (!patient) return null;

  const infoItems = [
    {
      icon: 'ri-mail-line',
      label: 'Email',
      value: patient.profile.email,
    },
    {
      icon: 'ri-phone-line',
      label: 'Teléfono',
      value: patient.profile.phone ?? 'No registrado',
    },
    {
      icon: 'ri-calendar-line',
      label: 'Edad',
      value: getAge(patient.profile.birthday),
    },
    {
      icon: 'ri-user-line',
      label: 'Género',
      value: formatGender(patient.profile.gender),
    },
    {
      icon: 'ri-drop-line',
      label: 'Tipo de sangre',
      value: patient.bloodType,
      isChip: true,
    },
    {
      icon: 'ri-alarm-warning-line',
      label: 'Contacto de emergencia',
      value: patient.emergencyContact,
    },
  ];

  return (
    <Card
      sx={{
        height: 'fit-content',
        position: 'sticky',
        top: 80,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Detalle del Paciente
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <i className="ri-close-line" style={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <Divider />

      {/* Patient Card */}
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Avatar
            sx={{
              width: 72,
              height: 72,
              fontSize: 28,
              fontWeight: 600,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: theme.palette.primary.main,
              mb: 1.5,
            }}
          >
            {getInitials(patient.profile.name, patient.profile.lastName)}
          </Avatar>
          <Typography variant="h6" fontWeight={600}>
            {patient.profile.name} {patient.profile.lastName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Chip
              label={patient.isActive ? 'Activo' : 'Inactivo'}
              size="small"
              color={patient.isActive ? 'success' : 'warning'}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Registrado el {formatDate(patient.createdAt)}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Info Items */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {infoItems.map((item) => (
            <Box
              key={item.label}
              sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                <i className={item.icon} style={{ fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {item.label}
                </Typography>
                {item.isChip ? (
                  <Box sx={{ mt: 0.25 }}>
                    <Chip
                      label={item.value}
                      size="small"
                      variant="outlined"
                      color="error"
                    />
                  </Box>
                ) : (
                  <Typography variant="body2">{item.value}</Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Additional info */}
        {(patient.allergies || patient.chronicConditions) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {patient.allergies && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <i
                      className="ri-heart-pulse-line"
                      style={{ fontSize: 16, color: theme.palette.error.main }}
                    />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Alergias
                    </Typography>
                  </Box>
                  <Typography variant="body2">{patient.allergies}</Typography>
                </Box>
              )}
              {patient.chronicConditions && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <i
                      className="ri-stethoscope-line"
                      style={{ fontSize: 16, color: theme.palette.warning.main }}
                    />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Condiciones crónicas
                    </Typography>
                  </Box>
                  <Typography variant="body2">{patient.chronicConditions}</Typography>
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Document info */}
        {patient.profile.typeDocument && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.info.main, 0.08),
                  color: theme.palette.info.main,
                  flexShrink: 0,
                }}
              >
                <i className="ri-id-card-line" style={{ fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Documento
                </Typography>
                <Typography variant="body2">
                  {patient.profile.typeDocument}: {patient.profile.numberDocument}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Card>
  );
}
