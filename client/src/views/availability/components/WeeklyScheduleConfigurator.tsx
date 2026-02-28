'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

const SNACKBAR_ANCHOR = { vertical: 'bottom' as const, horizontal: 'right' as const };
import Snackbar from '@mui/material/Snackbar';
import {
  type DayOfWeek,
  type WeeklySchedule,
  DAY_LABELS,
  ORDERED_DAYS,
  generateHours,
} from '../types';

const HOURS = generateHours(6, 20);

interface WeeklyScheduleConfiguratorProps {
  schedule: WeeklySchedule;
  dateRange: { startDate: string; endDate: string };
  onDateRangeChange: (range: { startDate: string; endDate: string }) => void;
  saving: boolean;
  saveSuccess: boolean;
  onSaveSuccessClose: () => void;
  error: string | null;
  hasDoctor: boolean;
  hasSpecialty: boolean;
  onToggleDay: (day: DayOfWeek) => void;
  onAddSlot: (day: DayOfWeek) => void;
  onRemoveSlot: (day: DayOfWeek, index: number) => void;
  onUpdateSlot: (day: DayOfWeek, index: number, field: 'start' | 'end', value: string) => void;
  onSave: () => void;
}

export function WeeklyScheduleConfigurator({
  schedule,
  dateRange,
  onDateRangeChange,
  saving,
  saveSuccess,
  onSaveSuccessClose,
  error,
  hasDoctor,
  hasSpecialty,
  onToggleDay,
  onAddSlot,
  onRemoveSlot,
  onUpdateSlot,
  onSave,
}: WeeklyScheduleConfiguratorProps) {
  const canSave = hasDoctor && hasSpecialty && dateRange.startDate && dateRange.endDate;

  return (
    <>
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 0.5,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <i className="ri-time-line" style={{ fontSize: 18, color: 'var(--mui-palette-primary-main)' }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  Horario Base Semanal
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Activa los días laborales y define los bloques horarios.
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="small"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <i className="ri-save-line" style={{ fontSize: 14 }} />}
              onClick={onSave}
              disabled={!canSave || saving}
              sx={{ textTransform: 'none', fontSize: '0.8rem' }}
            >
              Guardar
            </Button>
          </Box>

          {/* Date range */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2.5, mb: 2.5 }}>
            <TextField
              type="date"
              label="Fecha inicio"
              value={dateRange.startDate}
              onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
              sx={{ width: 180 }}
            />
            <TextField
              type="date"
              label="Fecha fin"
              value={dateRange.endDate}
              onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
              sx={{ width: 180 }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!hasDoctor && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Selecciona un doctor para configurar su disponibilidad
            </Alert>
          )}

          {hasDoctor && !hasSpecialty && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Selecciona una especialidad para continuar
            </Alert>
          )}

          {/* Days */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {ORDERED_DAYS.map((day) => {
              const dayData = schedule[day];
              const isEnabled = dayData.enabled;

              return (
                <Box
                  key={day}
                  sx={{
                    border: '1px solid',
                    borderColor: isEnabled ? 'divider' : 'action.disabledBackground',
                    borderRadius: 2,
                    bgcolor: isEnabled ? 'background.paper' : 'action.hover',
                    p: 2,
                    opacity: hasDoctor && hasSpecialty ? 1 : 0.5,
                    pointerEvents: hasDoctor && hasSpecialty ? 'auto' : 'none',
                    transition: 'all 200ms ease',
                  }}
                >
                  {/* Day header */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: isEnabled && dayData.slots.length > 0 ? 1.5 : 0,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Switch
                        checked={isEnabled}
                        onChange={() => onToggleDay(day)}
                        size="small"
                      />
                      <Typography
                        variant="body2"
                        fontWeight={isEnabled ? 600 : 400}
                        color={isEnabled ? 'text.primary' : 'text.secondary'}
                      >
                        {DAY_LABELS[day]}
                      </Typography>
                    </Box>

                    {isEnabled && (
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<i className="ri-add-line" style={{ fontSize: 14 }} />}
                        onClick={() => onAddSlot(day)}
                        sx={{ textTransform: 'none', fontSize: '0.75rem', height: 28 }}
                      >
                        Bloque
                      </Button>
                    )}
                  </Box>

                  {/* Slots */}
                  {isEnabled && dayData.slots.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 5.5 }}>
                      {dayData.slots.map((slot, idx) => (
                        <Box
                          key={idx}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <FormControl size="small" sx={{ width: 110 }}>
                            <Select
                              value={slot.start}
                              onChange={(e) => onUpdateSlot(day, idx, 'start', e.target.value)}
                              sx={{ fontSize: '0.8rem' }}
                            >
                              {HOURS.map((h) => (
                                <MenuItem key={h} value={h} sx={{ fontSize: '0.8rem' }}>
                                  {h}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          <Typography variant="caption" color="text.secondary">
                            a
                          </Typography>

                          <FormControl size="small" sx={{ width: 110 }}>
                            <Select
                              value={slot.end}
                              onChange={(e) => onUpdateSlot(day, idx, 'end', e.target.value)}
                              sx={{ fontSize: '0.8rem' }}
                            >
                              {HOURS.map((h) => (
                                <MenuItem key={h} value={h} sx={{ fontSize: '0.8rem' }}>
                                  {h}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          {dayData.slots.length > 1 && (
                            <IconButton
                              size="small"
                              aria-label="Eliminar horario"
                              onClick={() => onRemoveSlot(day, idx)}
                              sx={{
                                minWidth: 44,
                                minHeight: 44,
                                color: 'error.light',
                                '&:hover': { color: 'error.main' },
                              }}
                            >
                              <i className="ri-delete-bin-line" style={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={onSaveSuccessClose}
        anchorOrigin={SNACKBAR_ANCHOR}
      >
        <Alert severity="success" variant="filled" onClose={onSaveSuccessClose}>
          Disponibilidad guardada correctamente
        </Alert>
      </Snackbar>
    </>
  );
}
