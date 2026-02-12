'use client';

import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import type { Doctor } from '@/views/doctors/types';

interface ScheduleFiltersProps {
  doctors: Doctor[];
  selectedDoctorId: number | '';
  onDoctorChange: (id: number | '') => void;
  selectedSpecialtyId: number | '';
  onSpecialtyChange: (id: number | '') => void;
  doctorSpecialties: Array<{ id: number; name: string }>;
}

export function ScheduleFilters({
  doctors,
  selectedDoctorId,
  onDoctorChange,
  selectedSpecialtyId,
  onSpecialtyChange,
  doctorSpecialties,
}: ScheduleFiltersProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 260 }}>
        <InputLabel id="sch-doctor-label">Doctor</InputLabel>
        <Select
          labelId="sch-doctor-label"
          label="Doctor"
          value={selectedDoctorId === '' ? '' : String(selectedDoctorId)}
          onChange={(e) => {
            const val = e.target.value;
            onDoctorChange(val === '' ? '' : Number(val));
            onSpecialtyChange('');
          }}
        >
          <MenuItem value="">
            <em>Todos los doctores</em>
          </MenuItem>
          {doctors.map((doc) => (
            <MenuItem key={doc.id} value={doc.id}>
              {doc.profile.name} {doc.profile.lastName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {doctorSpecialties.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="sch-specialty-label">Especialidad</InputLabel>
          <Select
            labelId="sch-specialty-label"
            label="Especialidad"
            value={selectedSpecialtyId === '' ? '' : String(selectedSpecialtyId)}
            onChange={(e) => {
              const val = e.target.value;
              onSpecialtyChange(val === '' ? '' : Number(val));
            }}
          >
            <MenuItem value="">
              <em>Todas</em>
            </MenuItem>
            {doctorSpecialties.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
}
