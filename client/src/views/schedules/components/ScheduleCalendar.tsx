'use client';

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';
import Skeleton from '@mui/material/Skeleton';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import type { Schedule } from '../types';
import type { Doctor } from '@/views/doctors/types';
import {
  WEEKDAY_FULL,
  MONTH_SHORT,
  MONTH_NAMES,
  HOUR_SLOTS,
  formatDateKey,
  formatWeekRange,
  parseTime,
  getDoctorColor,
  isSameDay,
} from '../types';

// ── Constants ──
const TIME_COL_WIDTH = 56;
const ROW_HEIGHT = 60; // px per hour
const FIRST_HOUR = 6;
const TOTAL_HOURS = HOUR_SLOTS.length; // 15

// ── Props ──
interface ScheduleCalendarProps {
  weekDays: Date[];
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  schedulesByDate: Record<string, Schedule[]>;
  loading: boolean;
  // filters
  doctors: Doctor[];
  selectedDoctorId: number | '';
  onDoctorChange: (id: number | '') => void;
  // KPIs
  totalSchedules: number;
  uniqueDoctors: number;
  scheduledDays: number;
  // Day mode (all-doctors)
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
}

// ── Shared: time column ──
function TimeColumn() {
  return (
    <Box sx={{ width: TIME_COL_WIDTH, flexShrink: 0 }}>
      <Box sx={{ height: 52, borderBottom: '1px solid', borderColor: 'divider' }} />
      <Box sx={{ position: 'relative', height: ROW_HEIGHT * TOTAL_HOURS }}>
        {HOUR_SLOTS.map((hour) => (
          <Typography
            key={hour}
            variant="caption"
            color="text.secondary"
            sx={{
              position: 'absolute',
              top: (hour - FIRST_HOUR) * ROW_HEIGHT - 8,
              right: 8,
              fontSize: '0.7rem',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            {String(hour).padStart(2, '0')}:00
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

// ── Shared: hour grid lines ──
function HourGridLines() {
  return (
    <>
      {HOUR_SLOTS.map((hour) => (
        <Box
          key={hour}
          sx={{
            position: 'absolute',
            top: (hour - FIRST_HOUR) * ROW_HEIGHT,
            left: 0,
            right: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        />
      ))}
    </>
  );
}

// ── Shared: schedule block ──
function ScheduleBlock({ sch }: { sch: Schedule }) {
  const startH = parseTime(sch.timeFrom);
  const endH = parseTime(sch.timeTo);
  const topPx = (startH - FIRST_HOUR) * ROW_HEIGHT;
  const heightPx = (endH - startH) * ROW_HEIGHT;
  const colors = getDoctorColor(sch.doctorId);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: topPx + 1,
        left: 4,
        right: 4,
        height: Math.max(heightPx - 2, 18),
        bgcolor: colors.bg,
        border: '1px solid',
        borderColor: colors.border,
        borderRadius: 1.5,
        px: 1,
        py: 0.5,
        overflow: 'hidden',
        cursor: 'default',
        transition: 'box-shadow 150ms',
        '&:hover': { boxShadow: 2, zIndex: 2 },
        zIndex: 1,
      }}
    >
      <Typography
        sx={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: colors.text,
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {sch.doctor.name}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.62rem',
          color: colors.text,
          opacity: 0.8,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        {sch.timeFrom} – {sch.timeTo}
      </Typography>
    </Box>
  );
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export function ScheduleCalendar({
  weekDays,
  weekStart,
  onPrevWeek,
  onNextWeek,
  onToday,
  schedulesByDate,
  loading,
  doctors,
  selectedDoctorId,
  onDoctorChange,
  totalSchedules,
  uniqueDoctors,
  scheduledDays,
  selectedDate,
  onSelectDate,
  onPrevDay,
  onNextDay,
}: ScheduleCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const isAllDoctors = selectedDoctorId === '';

  // ── Doctors with schedules on the selected date (for "all-doctors" mode) ──
  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDaySchedules = useMemo(
    () => schedulesByDate[selectedDateKey] ?? [],
    [schedulesByDate, selectedDateKey],
  );

  const doctorsForDay = useMemo(() => {
    if (!isAllDoctors) return [];
    // Unique doctors that have schedules on selectedDate
    const docMap = new Map<number, { id: number; name: string; lastName: string }>();
    for (const sch of selectedDaySchedules) {
      if (!docMap.has(sch.doctorId)) {
        docMap.set(sch.doctorId, { id: sch.doctorId, name: sch.doctor.name, lastName: sch.doctor.lastName });
      }
    }
    return Array.from(docMap.values()).sort((a, b) => a.id - b.id);
  }, [isAllDoctors, selectedDaySchedules]);

  // Group selectedDaySchedules by doctorId
  const schedulesByDoctor = useMemo(() => {
    const map = new Map<number, Schedule[]>();
    for (const sch of selectedDaySchedules) {
      const arr = map.get(sch.doctorId);
      if (arr) {
        arr.push(sch);
      } else {
        map.set(sch.doctorId, [sch]);
      }
    }
    return map;
  }, [selectedDaySchedules]);

  // ── Format selected date label ──
  const selectedDayOfWeek = selectedDate.getDay();
  const selectedWeekdayIdx = selectedDayOfWeek === 0 ? 6 : selectedDayOfWeek - 1;
  const selectedDateLabel = `${WEEKDAY_FULL[selectedWeekdayIdx]} ${selectedDate.getDate()} de ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ─── TOOLBAR ─── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          px: 3,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Left – Doctor filter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className="ri-stethoscope-line" style={{ fontSize: 20, opacity: 0.5 }} />
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="cal-doctor-label">Doctor</InputLabel>
            <Select
              labelId="cal-doctor-label"
              label="Doctor"
              value={selectedDoctorId === '' ? '' : String(selectedDoctorId)}
              onChange={(e) => {
                const val = e.target.value;
                onDoctorChange(val === '' ? '' : Number(val));
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
        </Box>

        {/* Right – Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" aria-label="Período anterior" onClick={isAllDoctors ? onPrevDay : onPrevWeek}>
            <i className="ri-arrow-left-s-line" style={{ fontSize: 20 }} />
          </IconButton>
          <IconButton size="small" aria-label="Período siguiente" onClick={isAllDoctors ? onNextDay : onNextWeek}>
            <i className="ri-arrow-right-s-line" style={{ fontSize: 20 }} />
          </IconButton>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{ mx: 1, whiteSpace: 'nowrap', userSelect: 'none' }}
          >
            {isAllDoctors ? selectedDateLabel : formatWeekRange(weekStart)}
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={onToday}
            sx={{ textTransform: 'none', fontWeight: 600, minWidth: 'auto' }}
          >
            Hoy
          </Button>
        </Box>
      </Box>

      {/* ─── DAY PICKER (all-doctors mode) ─── */}
      {isAllDoctors && (
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            px: 3,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            overflowX: 'auto',
          }}
        >
          {weekDays.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isSameDay(day, today);
            const dayKey = formatDateKey(day);
            const hasData = (schedulesByDate[dayKey]?.length ?? 0) > 0;
            const dayOfWeek = day.getDay();
            const weekdayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

            return (
              <Box
                key={idx}
                onClick={() => onSelectDate(day)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectDate(day);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${(WEEKDAY_FULL[weekdayIdx] ?? '')} ${day.getDate()}`}
                sx={{
                  minWidth: 56,
                  py: 0.75,
                  px: 1,
                  borderRadius: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? 'primary.main' : isDayToday ? 'action.selected' : 'transparent',
                  transition: 'all 150ms',
                  '&:hover': { bgcolor: isSelected ? 'primary.dark' : 'action.hover' },
                  position: 'relative',
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{
                    color: isSelected ? 'primary.contrastText' : 'text.primary',
                    fontSize: '0.7rem',
                    display: 'block',
                    lineHeight: 1.3,
                  }}
                >
                  {(WEEKDAY_FULL[weekdayIdx] ?? '').slice(0, 3)}
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={isSelected ? 700 : 400}
                  sx={{
                    color: isSelected ? 'primary.contrastText' : 'text.secondary',
                    fontSize: '0.75rem',
                    display: 'block',
                    lineHeight: 1.3,
                  }}
                >
                  {day.getDate()}
                </Typography>
                {hasData && !isSelected && (
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      mx: 'auto',
                      mt: 0.25,
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* ─── KPI CHIPS ─── */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          px: 3,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
        }}
      >
        <Chip
          label={`Disponible: ${totalSchedules} bloques`}
          size="small"
          sx={{
            bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
            color: 'success.dark',
            fontWeight: 600,
            fontSize: '0.75rem',
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.success.main, 0.3),
          }}
        />
        <Chip
          label={`Doctores: ${uniqueDoctors}`}
          size="small"
          sx={{
            bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
            color: 'info.dark',
            fontWeight: 600,
            fontSize: '0.75rem',
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.info.main, 0.3),
          }}
        />
        <Chip
          label={`Días: ${scheduledDays}`}
          size="small"
          sx={{
            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.1),
            color: 'warning.dark',
            fontWeight: 600,
            fontSize: '0.75rem',
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.warning.main, 0.3),
          }}
        />
      </Box>

      {/* ─── GRID ─── */}
      {loading ? (
        <Box sx={{ p: 3 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={ROW_HEIGHT} sx={{ mb: 0.5 }} />
          ))}
        </Box>
      ) : isAllDoctors ? (
        /* ════════════ ALL-DOCTORS MODE: columns = doctors ════════════ */
        doctorsForDay.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <i className="ri-calendar-close-line" style={{ fontSize: 40, opacity: 0.25 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Sin horarios para este día
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ display: 'flex', minWidth: Math.max(800, doctorsForDay.length * 140 + TIME_COL_WIDTH) }}>
              <TimeColumn />

              {doctorsForDay.map((doc) => {
                const docSchedules = schedulesByDoctor.get(doc.id) ?? [];
                const colors = getDoctorColor(doc.id);

                return (
                  <Box
                    key={doc.id}
                    sx={{
                      flex: 1,
                      minWidth: 120,
                      borderLeft: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {/* Doctor header */}
                    <Box
                      sx={{
                        height: 52,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: colors.bg,
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{
                          color: colors.text,
                          fontSize: '0.75rem',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                          px: 0.5,
                        }}
                      >
                        {doc.name} {doc.lastName}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: colors.text, opacity: 0.7, fontSize: '0.65rem', lineHeight: 1.2 }}
                      >
                        {docSchedules.length} bloque{docSchedules.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>

                    {/* Time body */}
                    <Box sx={{ position: 'relative', height: ROW_HEIGHT * TOTAL_HOURS }}>
                      <HourGridLines />
                      {docSchedules.map((sch) => (
                        <ScheduleBlock key={sch.id} sch={sch} />
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )
      ) : (
        /* ════════════ SINGLE-DOCTOR MODE: columns = days (weekly) ════════════ */
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ display: 'flex', minWidth: 800 }}>
            <TimeColumn />

            {weekDays.map((day, dayIdx) => {
              const dateKey = formatDateKey(day);
              const daySchedules = schedulesByDate[dateKey] ?? [];
              const isDayToday = isSameDay(day, today);

              return (
                <Box
                  key={dayIdx}
                  sx={{
                    flex: 1,
                    minWidth: 100,
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {/* Day header */}
                  <Box
                    sx={{
                      height: 52,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: isDayToday ? 'primary.main' : 'transparent',
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{
                        color: isDayToday ? 'primary.contrastText' : 'text.primary',
                        fontSize: '0.75rem',
                        lineHeight: 1.2,
                      }}
                    >
                      {WEEKDAY_FULL[dayIdx]}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: isDayToday ? 'primary.contrastText' : 'text.secondary',
                        fontSize: '0.7rem',
                        lineHeight: 1.2,
                      }}
                    >
                      {day.getDate()} {MONTH_SHORT[day.getMonth()]}
                    </Typography>
                  </Box>

                  {/* Time body */}
                  <Box sx={{ position: 'relative', height: ROW_HEIGHT * TOTAL_HOURS }}>
                    <HourGridLines />
                    {daySchedules.map((sch) => (
                      <ScheduleBlock key={sch.id} sch={sch} />
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
