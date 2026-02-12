'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import type { Doctor } from '@/views/doctors/types';

interface DoctorSelectorProps {
  doctors: Doctor[];
  selectedDoctorId: number | '';
  onDoctorChange: (id: number | '') => void;
  selectedDoctor: Doctor | null;
  selectedSpecialtyId: number | '';
  onSpecialtyChange: (id: number | '') => void;
  doctorSpecialties: Array<{ id: number; name: string }>;
}

export function DoctorSelector({
  doctors,
  selectedDoctorId,
  onDoctorChange,
  selectedDoctor,
  selectedSpecialtyId,
  onSpecialtyChange,
  doctorSpecialties,
}: DoctorSelectorProps) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <i className="ri-stethoscope-line" style={{ fontSize: 18, color: 'var(--mui-palette-primary-main)' }} />
          <Typography variant="subtitle1" fontWeight={600}>
            Seleccionar Doctor
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Elige al doctor para configurar su disponibilidad.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 300 }}>
            <InputLabel id="doctor-select-label">Selecciona un doctor...</InputLabel>
            <Select
              labelId="doctor-select-label"
              label="Selecciona un doctor..."
              value={selectedDoctorId === '' ? '' : String(selectedDoctorId)}
              onChange={(e) => {
                const val = e.target.value;
                onDoctorChange(val === '' ? '' : Number(val));
                onSpecialtyChange('');
              }}
            >
              <MenuItem value="">
                <em>Selecciona un doctor...</em>
              </MenuItem>
              {doctors.map((doc) => (
                <MenuItem key={doc.id} value={doc.id}>
                  {doc.profile.name} {doc.profile.lastName} — {doc.specialties.map((s) => s.name).join(', ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedDoctor && doctorSpecialties.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="specialty-avail-label">Especialidad</InputLabel>
              <Select
                labelId="specialty-avail-label"
                label="Especialidad"
                value={selectedSpecialtyId === '' ? '' : String(selectedSpecialtyId)}
                onChange={(e) => {
                  const val = e.target.value;
                  onSpecialtyChange(val === '' ? '' : Number(val));
                }}
              >
                <MenuItem value="">
                  <em>Seleccione especialidad</em>
                </MenuItem>
                {doctorSpecialties.map((spec) => (
                  <MenuItem key={spec.id} value={spec.id}>
                    {spec.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {selectedDoctor && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem',
                opacity: 0.85,
              }}
            >
              {selectedDoctor.profile.name[0]}{selectedDoctor.profile.lastName[0]}
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {selectedDoctor.profile.name} {selectedDoctor.profile.lastName}
              </Typography>
              <Box sx={{ mt: 0.25 }}>
                {selectedDoctor.specialties.map((spec) => (
                  <Chip
                    key={spec.id}
                    label={spec.name}
                    size="small"
                    variant="filled"
                    color="default"
                    sx={{ fontSize: '0.7rem', height: 22, mr: 0.5 }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
