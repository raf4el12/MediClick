'use client';

import { useState, useMemo } from 'react';
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
import TextField from '@mui/material/TextField';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import type { Doctor } from '@/views/doctors/types';
import type { GenerateSchedulesPayload, GenerateSchedulesResponse } from '../types';
import { MONTH_NAMES } from '../types';

type RangeMode = 'month' | 'range';

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

/** Format Date to YYYY-MM-DD for input[type=date] */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  const [rangeMode, setRangeMode] = useState<RangeMode>('month');
  const [month, setMonth] = useState(defaultMonth + 1); // API uses 1-12
  const [year, setYear] = useState(defaultYear);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [specialtyId, setSpecialtyId] = useState<number | ''>('');
  const [overwrite, setOverwrite] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  // Get specialties for the selected doctor
  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorId) ?? null,
    [doctors, doctorId],
  );
  const specialties = selectedDoctor?.specialties ?? [];

  // Reset specialty when doctor changes
  const handleDoctorChange = (val: number | '') => {
    setDoctorId(val);
    setSpecialtyId('');
  };

  // Compute date range label for summary
  const rangeSummary = useMemo(() => {
    if (rangeMode === 'month') {
      return `${MONTH_NAMES[month - 1]} ${year}`;
    }
    if (dateFrom && dateTo) {
      return `${dateFrom} al ${dateTo}`;
    }
    return null;
  }, [rangeMode, month, year, dateFrom, dateTo]);

  const canGenerate = useMemo(() => {
    if (rangeMode === 'month') return true;
    return dateFrom !== '' && dateTo !== '' && dateTo >= dateFrom;
  }, [rangeMode, dateFrom, dateTo]);

  const handleGenerate = async () => {
    const payload: GenerateSchedulesPayload = {};

    if (rangeMode === 'month') {
      payload.month = month;
      payload.year = year;
    } else {
      payload.dateFrom = dateFrom;
      payload.dateTo = dateTo;
    }

    if (doctorId !== '') payload.doctorId = doctorId;
    if (specialtyId !== '') payload.specialtyId = specialtyId;
    if (overwrite) payload.overwrite = true;

    await onGenerate(payload);
  };

  const handleClose = () => {
    onClearResult();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className="ri-magic-line" style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
          <Typography component="span" variant="h6" fontWeight={600}>
            Generar Horarios
          </Typography>
        </Box>
        <Typography component="p" variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Genera los bloques horarios automáticamente a partir de las reglas de disponibilidad.
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
          {/* ── Período ── */}
          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Período
            </Typography>
            <ToggleButtonGroup
              value={rangeMode}
              exclusive
              onChange={(_, val) => { if (val) setRangeMode(val as RangeMode); }}
              size="small"
              fullWidth
              sx={{ mb: 1.5 }}
            >
              <ToggleButton value="month" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                <i className="ri-calendar-line" style={{ fontSize: 16, marginRight: 6 }} />
                Mes completo
              </ToggleButton>
              <ToggleButton value="range" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                <i className="ri-calendar-event-line" style={{ fontSize: 16, marginRight: 6 }} />
                Rango de fechas
              </ToggleButton>
            </ToggleButtonGroup>

            {rangeMode === 'month' ? (
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
                      <MenuItem key={idx} value={idx + 1}>{name}</MenuItem>
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
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Desde"
                  type="date"
                  size="small"
                  fullWidth
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  inputProps={{ min: toDateStr(new Date()) }}
                />
                <TextField
                  label="Hasta"
                  type="date"
                  size="small"
                  fullWidth
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  inputProps={{ min: dateFrom || toDateStr(new Date()) }}
                />
              </Box>
            )}
          </Box>

          <Divider />

          {/* ── Filtros ── */}
          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Filtros (opcional)
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel id="gen-doctor">Doctor</InputLabel>
                <Select
                  labelId="gen-doctor"
                  label="Doctor"
                  value={doctorId === '' ? '' : String(doctorId)}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleDoctorChange(val === '' ? '' : Number(val));
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

              {specialties.length > 0 && (
                <FormControl size="small" fullWidth>
                  <InputLabel id="gen-specialty">Especialidad</InputLabel>
                  <Select
                    labelId="gen-specialty"
                    label="Especialidad"
                    value={specialtyId === '' ? '' : String(specialtyId)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSpecialtyId(val === '' ? '' : Number(val));
                    }}
                  >
                    <MenuItem value="">
                      <em>Todas las especialidades</em>
                    </MenuItem>
                    {specialties.map((sp) => (
                      <MenuItem key={sp.id} value={sp.id}>{sp.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </Box>

          <Divider />

          {/* ── Opciones ── */}
          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Opciones
            </Typography>
            <Tooltip
              title="Elimina los horarios sin citas reservadas en el rango seleccionado antes de generar nuevos. Los horarios con citas activas se conservan."
              placement="top"
              arrow
            >
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    Regenerar (reemplazar horarios existentes)
                  </Typography>
                }
              />
            </Tooltip>
            {overwrite && (
              <Alert severity="warning" sx={{ mt: 1 }} variant="outlined">
                <Typography variant="caption">
                  Se eliminarán los horarios <strong>sin citas</strong> en el período seleccionado antes de generar nuevos.
                  Los horarios con citas activas se conservan.
                </Typography>
              </Alert>
            )}
          </Box>

          {/* ── Resumen pre-generación ── */}
          {rangeSummary && !generateResult && (
            <Alert severity="info" variant="outlined" icon={<i className="ri-information-line" style={{ fontSize: 18 }} />}>
              <Typography variant="caption">
                Generará horarios para <strong>{rangeSummary}</strong>
                {doctorId !== '' && selectedDoctor
                  ? ` · ${selectedDoctor.profile.name} ${selectedDoctor.profile.lastName}`
                  : ' · Todos los doctores'}
                {specialtyId !== '' ? ` · ${specialties.find((s) => s.id === specialtyId)?.name}` : ''}
                {overwrite ? ' · Regenerando' : ''}
              </Typography>
            </Alert>
          )}

          {/* ── Resultado ── */}
          {generateResult && (
            <Alert
              severity={generateResult.generated > 0 ? 'success' : 'info'}
              sx={{ mt: 0 }}
            >
              <Typography variant="body2" fontWeight={600}>
                {generateResult.message}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <i className="ri-add-circle-line" style={{ fontSize: 14, color: 'var(--mui-palette-success-main)' }} />
                  Generados: {generateResult.generated}
                </Typography>
                {generateResult.skipped > 0 && (
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <i className="ri-skip-forward-line" style={{ fontSize: 14, color: 'var(--mui-palette-warning-main)' }} />
                    Omitidos: {generateResult.skipped}
                  </Typography>
                )}
                {generateResult.deleted > 0 && (
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <i className="ri-delete-bin-line" style={{ fontSize: 14, color: 'var(--mui-palette-error-main)' }} />
                    Eliminados: {generateResult.deleted}
                  </Typography>
                )}
              </Box>
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
          disabled={generating || !canGenerate}
          startIcon={
            generating
              ? <CircularProgress size={14} color="inherit" />
              : <i className="ri-magic-line" style={{ fontSize: 14 }} />
          }
          sx={{ textTransform: 'none' }}
        >
          {generating ? 'Generando...' : 'Generar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
