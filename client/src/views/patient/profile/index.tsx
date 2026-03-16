'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';

export default function PatientProfileView() {
  const user = useAppSelector(selectUser);

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
        Mi Perfil
      </Typography>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 3 }}>
          <Avatar
            src={user?.avatarUrl || '/images/avatarSidebar.jpg'}
            sx={{ width: 80, height: 80 }}
          />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={600}>
              {user?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
            <Chip label="Paciente" color="primary" size="small" sx={{ mt: 1 }} />
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 2, mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Información de Cuenta
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Nombre</Typography>
              <Typography variant="body2" fontWeight={500}>{user?.name}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Email</Typography>
              <Typography variant="body2" fontWeight={500}>{user?.email}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Rol</Typography>
              <Typography variant="body2" fontWeight={500}>{user?.role}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
