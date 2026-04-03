'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import { alpha, useTheme } from '@mui/material/styles';
import type { PatientRecordMedicalHistory } from '../types';

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'info' }> = {
  ACTIVE: { label: 'Activo', color: 'warning' },
  CHRONIC: { label: 'Crónico', color: 'info' },
  RESOLVED: { label: 'Resuelto', color: 'success' },
};

interface Props {
  history: PatientRecordMedicalHistory[];
}

export default function RecordMedicalHistory({ history }: Props) {
  const theme = useTheme();

  return (
    <Card sx={{ borderRadius: '24px' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              bgcolor: alpha(theme.palette.info.main, 0.1),
            }}
          >
            <i className="ri-file-list-3-line" style={{ fontSize: 20, color: theme.palette.info.main }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            Historial Médico
          </Typography>
        </Box>

        {history.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No hay historial médico registrado.
          </Typography>
        ) : (
          <List disablePadding>
            {history.map((item, index) => {
              const config = statusConfig[item.status ?? ''] ?? { label: item.status ?? 'Sin estado', color: 'default' as const };
              return (
                <Box key={index}>
                  {index > 0 && <Divider />}
                  <ListItem sx={{ px: 0, py: 1.5 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight={600}>
                            {item.condition}
                          </Typography>
                          <Chip label={config.label} color={config.color} size="small" variant="outlined" />
                        </Box>
                      }
                      secondary={item.notes}
                    />
                  </ListItem>
                </Box>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
