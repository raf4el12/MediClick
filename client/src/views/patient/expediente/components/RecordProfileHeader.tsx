'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import type { PatientRecord } from '../types';

interface Props {
  record: PatientRecord;
}

function calculateAge(birthday: string): number {
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatBirthday(birthday: string): string {
  const date = new Date(birthday);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const genderMap: Record<string, string> = {
  M: 'Masculino',
  F: 'Femenino',
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  male: 'Masculino',
  female: 'Femenino',
};

const allergyColors = ['#dc2626', '#ea580c', '#d97706', '#e11d48', '#be185d'];

export default function RecordProfileHeader({ record }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const avatarSrc = user?.avatarUrl || '/images/avatarSidebar.jpg';
  const profile = record.profile;
  const initials = profile
    ? `${profile.name[0]}${profile.lastName[0]}`.toUpperCase()
    : '?';

  const fullName = profile ? `${profile.name} ${profile.lastName}` : 'Paciente';
  const gender = profile?.gender ? (genderMap[profile.gender] ?? profile.gender) : null;
  const age = profile?.birthday ? calculateAge(profile.birthday) : null;
  const birthdayFormatted = profile?.birthday ? formatBirthday(profile.birthday) : null;

  const allergiesList = record.allergies
    ? record.allergies.split(',').map((a) => a.trim()).filter(Boolean)
    : [];

  return (
    <Card
      sx={{
        borderRadius: '16px',
        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 2, md: 3 },
          }}
        >
          {/* Avatar */}
          <Avatar
            alt={fullName}
            src={avatarSrc}
            sx={{
              width: 80,
              height: 80,
              fontSize: '1.75rem',
              fontWeight: 700,
              bgcolor: theme.palette.primary.main,
              color: '#fff',
              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>

          {/* Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Row 1: Name + Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.8 }}>
              <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                {fullName}
              </Typography>
              <Chip
                label={record.isActive ? 'Activo' : 'Inactivo'}
                size="small"
                sx={{
                  bgcolor: record.isActive ? alpha('#10b981', 0.15) : alpha('#94a3b8', 0.15),
                  color: record.isActive ? '#059669' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  height: 24,
                  borderRadius: '12px',
                }}
              />
            </Box>

            {/* Row 2: DOB/Age/Gender · Phone · Email */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 1.5, md: 2.5 }, mb: 0.5 }}>
              {birthdayFormatted && (
                <InfoItem icon="ri-calendar-line">
                  {birthdayFormatted}{age !== null && ` (${age} años)`}
                  {gender && ` · ${gender}`}
                </InfoItem>
              )}
              {profile?.phone && <InfoItem icon="ri-phone-line">{profile.phone}</InfoItem>}
              {profile?.email && <InfoItem icon="ri-mail-line">{profile.email}</InfoItem>}
            </Box>

            {/* Row 3: Address · Blood Type · Document */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 1.5, md: 2.5 }, mb: allergiesList.length > 0 ? 1.5 : 0 }}>
              {profile?.address && <InfoItem icon="ri-map-pin-line">{profile.address}</InfoItem>}
              {record.bloodType && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tipo de Sangre:
                  </Typography>
                  <Chip
                    label={record.bloodType}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 24,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                    }}
                  />
                </Box>
              )}
              {profile?.typeDocument && profile?.numberDocument && (
                <InfoItem icon="ri-id-card-line">
                  {profile.typeDocument}: {profile.numberDocument}
                </InfoItem>
              )}
            </Box>

            {/* Row 4: Allergies */}
            {allergiesList.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mr: 0.3 }}>
                  Alergias:
                </Typography>
                {allergiesList.map((allergy, idx) => (
                  <Chip
                    key={allergy}
                    label={allergy}
                    size="small"
                    sx={{
                      bgcolor: allergyColors[idx % allergyColors.length],
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 26,
                      borderRadius: '13px',
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Action Button */}
          <Box sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', md: 'flex-start' } }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => router.push('/patient/book')}
              startIcon={<i className="ri-calendar-todo-line" style={{ fontSize: 16 }} />}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, width: { xs: '100%', md: 'auto' } }}
            >
              Nueva Cita
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function InfoItem({ icon, children }: { icon: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <i className={icon} style={{ fontSize: 15, color: theme.palette.text.secondary }} />
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Box>
  );
}
