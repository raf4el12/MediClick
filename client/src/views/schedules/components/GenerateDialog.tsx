'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import type { Doctor } from '@/views/doctors/types';
import type { GenerateSchedulesPayload, GenerateSchedulesResponse } from '../types';
import { MONTH_NAMES } from '../types';

interface GenerateDialogProps {
  open: boolean;
  onClose: () => void;
  doctors: Doctor[];
  generating: boolean;
  generateResult: GenerateSchedulesResponse | null;
  onGenerate: (payload: GenerateSchedulesPayload) => Promise<void>;
  onClearResult: () => void;
  defaultMonth: number;
  defaultYear: number;
}

export function GenerateDialog({
  open,
  onClose,
  doctors,
  generating,
  generateResult,
  onGenerate,
  onClearResult,
  defaultMonth,
  defaultYear,
}: GenerateDialogProps) {
  const [month, setMonth] = useState(defaultMonth + 1); // API uses 1-12
  const [year, setYear] = useState(defaultYear);
  const [doctorId, setDoctorId] = useState<number | ''>('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  const handleGenerate = async () => {
    const payload: GenerateSchedulesPayload = { month, year };
    if (doctorId !== '') payload.doctorId = doctorId;
    await onGenerate(payload);
  };

  const handleClose = () => {
    onClearResult();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className="ri-magic-line" style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
          <Typography variant="h6" fontWeight={600}>
            Generar Horarios
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Genera los bloques horarios automáticamente a partir de las reglas de disponibilidad.
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel id="gen-month">Mes</InputLabel>
              <Select
                labelId="gen-month"
                label="Mes"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <MenuItem key={idx} value={idx + 1}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="gen-year">Año</InputLabel>
              <Select
                labelId="gen-year"
                label="Año"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <FormControl size="small" fullWidth>
            <InputLabel id="gen-doctor">Doctor (opcional)</InputLabel>
            <Select
              labelId="gen-doctor"
              label="Doctor (opcional)"
              value={doctorId === '' ? '' : String(doctorId)}
              onChange={(e) => {
                const val = e.target.value;
                setDoctorId(val === '' ? '' : Number(val));
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

          {generateResult && (
            <Alert severity="success" sx={{ mt: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {generateResult.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Generados: {generateResult.generated} · Omitidos: {generateResult.skipped}
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="text" size="small">
          Cerrar
        </Button>
        <Button
          onClick={() => void handleGenerate()}
          variant="contained"
          size="small"
          disabled={generating}
          startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <i className="ri-magic-line" style={{ fontSize: 14 }} />}
          sx={{ textTransform: 'none' }}
        >
          {generating ? 'Generando...' : 'Generar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
