'use client';

import Link from 'next/link';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import type { PatientRecord } from '../types';

const GENDER: Record<string, string> = { M: 'Masculino', F: 'Femenino', MALE: 'Masculino', FEMALE: 'Femenino', male: 'Masculino', female: 'Femenino' };

/** Edad cumplida a hoy, con la fecha de nacimiento como día (sin hora ni zona). */
function ageOf(birthday: string): number {
  const [y, m, d] = birthday.slice(0, 10).split('-').map(Number) as [number, number, number];
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age;
}

const birthdayLabel = (birthday: string) =>
  new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(birthday));

interface RecordOverviewProps {
  record: PatientRecord;
  /** El paciente mirando su propio expediente: ofrece reservar una cita. */
  own: boolean;
}

/** Resumen del paciente (patrón `user-left-overview/UserDetails` de Materio). */
export default function RecordOverview({ record, own }: RecordOverviewProps) {
  const profile = record.profile;
  const fullName = profile ? `${profile.name} ${profile.lastName}` : 'Paciente';
  const initials = profile ? `${profile.name.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() : '?';
  const appointments = record.appointments?.length ?? 0;
  const history = record.medicalHistory?.length ?? 0;

  const details: { label: string; value: string | null | undefined }[] = [
    { label: 'Documento', value: profile?.typeDocument && profile.numberDocument ? `${profile.typeDocument} ${profile.numberDocument}` : null },
    { label: 'Nacimiento', value: profile?.birthday ? `${birthdayLabel(profile.birthday)} (${ageOf(profile.birthday)} años)` : null },
    { label: 'Género', value: profile?.gender ? (GENDER[profile.gender] ?? profile.gender) : null },
    { label: 'Tipo de sangre', value: record.bloodType },
    { label: 'Teléfono', value: profile?.phone },
    { label: 'Correo', value: profile?.email },
    { label: 'Dirección', value: profile?.address },
    { label: 'Contacto de emergencia', value: record.emergencyContact },
  ];

  return (
    <Card>
      <CardContent className='flex flex-col gap-6 pbs-12'>
        <div className='flex flex-col items-center gap-4'>
          <CustomAvatar variant='rounded' skin='light' color='primary' size={120} aria-hidden>
            <span className='text-4xl font-medium'>{initials}</span>
          </CustomAvatar>
          <Typography variant='h5' component='h2' className='text-center'>
            {fullName}
          </Typography>
          <Chip size='small' variant='tonal' color={record.isActive ? 'success' : 'secondary'} label={record.isActive ? 'Paciente activo' : 'Paciente inactivo'} />
        </div>
        <div className='flex items-center justify-around flex-wrap gap-4'>
          {[
            { icon: 'ri-calendar-check-line', value: appointments, label: appointments === 1 ? 'Cita' : 'Citas' },
            { icon: 'ri-file-list-3-line', value: history, label: history === 1 ? 'Antecedente' : 'Antecedentes' },
          ].map((stat) => (
            <div key={stat.icon} className='flex items-center gap-4'>
              <CustomAvatar variant='rounded' color='primary' skin='light' aria-hidden>
                <i className={stat.icon} />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{stat.value}</Typography>
                <Typography>{stat.label}</Typography>
              </div>
            </div>
          ))}
        </div>
        <div>
          <Typography variant='h5' component='h3'>
            Datos
          </Typography>
          <Divider className='mlb-4' />
          <dl className='flex flex-col gap-2 m-0'>
            {details.map(({ label, value }) => (
              <div key={label} className='flex flex-wrap gap-x-1.5'>
                <Typography component='dt' className='font-medium' color='text.primary'>
                  {label}:
                </Typography>
                <Typography component='dd' className='m-0' color={value ? 'text.primary' : 'text.secondary'}>
                  {value || 'Sin registrar'}
                </Typography>
              </div>
            ))}
          </dl>
        </div>
        {own && (
          <Button component={Link} href='/patient/book' variant='contained' startIcon={<i className='ri-calendar-todo-line' aria-hidden />}>
            Reservar cita
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
