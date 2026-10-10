'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppSelector } from '@/redux-store/hooks';
import { selectUser } from '@/redux-store/slices/auth';
import { clinicsService } from '@/services/clinics.service';
import { holidaysService } from '@/services/holidays.service';
import { extractApiError } from '@/utils/extractApiError';
import { notify } from '@/utils/notify';
import { getTodayInTimezone } from '@/utils/timezone';
import ImpactList from '@/views/availability/components/ImpactList';
import { useRestrictionImpact } from '@/views/availability/hooks/useRestrictions';
import { holidaySchema } from './functions/holiday.schema';
import type { Holiday } from './types';

interface HolidayDraft {
  id?: number;
  name: string;
  date: string;
  isRecurring: boolean;
  clinicId: number | '';
}

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));

/** Feriados del año (decisión 4 de UI-17): globales y de la sede, con la carga de feriados de Perú. */
export default function HolidaysView() {
  const user = useAppSelector(selectUser);
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const timezone = user?.clinicTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [thisYear] = useState(() => Number(getTodayInTimezone(timezone).slice(0, 4)));
  const [year, setYear] = useState(thisYear);
  const [draft, setDraft] = useState<HolidayDraft | null>(null);
  const [toDelete, setToDelete] = useState<Holiday | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Solo un administrador sin sede elige el alcance; para el personal de sede lo fija el servidor.
  const globalAdmin = hasPermission('MANAGE', 'ALL') && !user?.clinicName;
  const canCreate = hasPermission('CREATE', 'HOLIDAYS');
  const canUpdate = hasPermission('UPDATE', 'HOLIDAYS');
  const canDelete = hasPermission('DELETE', 'HOLIDAYS');

  const holidays = useQuery({
    queryKey: ['holidays', year],
    queryFn: async () => (await holidaysService.findAll({ year, pageSize: 100, currentPage: 1 })).rows,
  });
  const clinics = useQuery({ queryKey: ['clinics', 'all'], queryFn: clinicsService.findAll, enabled: globalAdmin });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['holidays'] });
    void queryClient.invalidateQueries({ queryKey: ['agenda'] });
  };
  const seed = useMutation({
    mutationFn: () => holidaysService.seed(year),
    onSuccess: (r) => {
      notify(`Se cargaron ${r.seeded} feriados de Perú de ${year}`);
      refresh();
    },
    onError: (err) => setError(extractApiError(err, 'No se pudieron cargar los feriados').message),
  });
  const remove = useMutation({
    mutationFn: (id: number) => holidaysService.remove(id),
    onSuccess: () => {
      notify('Feriado eliminado');
      refresh();
    },
    onError: (err) => setError(extractApiError(err, 'No se pudo eliminar el feriado').message),
  });

  const rows = [...(holidays.data ?? [])].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <Typography variant='h4' component='h1'>
            Feriados
          </Typography>
          <Typography color='text.secondary'>Se ven en la agenda y en la disponibilidad de cada médico; ese día no se ofrecen cupos.</Typography>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <TextField select id='feriados-anio' size='small' label='Año' value={year} onChange={(e) => setYear(Number(e.target.value))} className='is-28'>
            {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
          {canCreate && (
            <>
              <Button variant='outlined' disabled={seed.isPending} onClick={() => seed.mutate()}>
                Cargar feriados de Perú
              </Button>
              <Button variant='contained' startIcon={<i className='ri-add-line' aria-hidden />} onClick={() => setDraft({ name: '', date: '', isRecurring: false, clinicId: '' })}>
                Nuevo feriado
              </Button>
            </>
          )}
        </div>
      </div>
      {error && (
        <Alert severity='error' onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Card>
        <CardContent>
          {holidays.isLoading ? (
            <Skeleton variant='rounded' height={160} />
          ) : rows.length === 0 ? (
            <Typography color='text.secondary'>No hay feriados en {year}. Puedes cargar los feriados nacionales de Perú.</Typography>
          ) : (
            <ul className='flex flex-col m-0 p-0 list-none'>
              {rows.map((h) => (
                <li key={h.id} className='flex flex-wrap items-center gap-3 plb-3' style={{ borderBlockStart: '1px solid var(--mui-palette-divider)' }}>
                  <Typography className='font-medium is-56 first-letter:uppercase'>{dayLabel(h.date)}</Typography>
                  <Typography className='flex-1 min-is-40'>{h.name}</Typography>
                  <span className='flex gap-1'>
                    <Chip size='small' variant='outlined' label={h.clinicId === null ? 'Global' : 'De la sede'} />
                    {h.isRecurring && <Chip size='small' variant='outlined' label='Cada año' />}
                  </span>
                  <span className='flex'>
                    {canUpdate && (
                      <IconButton
                        aria-label={`Editar ${h.name}`}
                        onClick={() => setDraft({ id: h.id, name: h.name, date: h.date.slice(0, 10), isRecurring: h.isRecurring, clinicId: h.clinicId ?? '' })}
                      >
                        <i className='ri-pencil-line' aria-hidden />
                      </IconButton>
                    )}
                    {canDelete && (
                      <IconButton aria-label={`Eliminar ${h.name}`} onClick={() => setToDelete(h)}>
                        <i className='ri-delete-bin-line' aria-hidden />
                      </IconButton>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {draft && (
        <HolidayDialog
          key={draft.id ?? 'nuevo'}
          initial={draft}
          globalAdmin={globalAdmin}
          clinics={clinics.data ?? []}
          onClose={() => setDraft(null)}
          onSaved={(created) => {
            notify(created ? 'Feriado creado' : 'Feriado actualizado');
            setDraft(null);
            refresh();
          }}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        title='Eliminar el feriado'
        description={toDelete ? `${toDelete.name}: la agenda vuelve a ofrecer los cupos de ese día.` : undefined}
        destructive={false}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}

function HolidayDialog({
  initial,
  globalAdmin,
  clinics,
  onClose,
  onSaved,
}: {
  initial: HolidayDraft;
  globalAdmin: boolean;
  clinics: { id: number; name: string }[];
  onClose: () => void;
  onSaved: (created: boolean) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(draft.date);
  const impact = useRestrictionImpact(
    valid
      ? {
          type: 'HOLIDAY',
          ...(globalAdmin && draft.clinicId !== '' ? { clinicId: draft.clinicId } : {}),
          startDate: draft.date,
          endDate: draft.date,
          ...(draft.id ? { excludeRestrictionId: draft.id } : {}),
        }
      : null,
  );
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: draft.name.trim(),
        date: draft.date,
        isRecurring: draft.isRecurring,
        ...(globalAdmin && draft.clinicId !== '' ? { clinicId: draft.clinicId } : {}),
      };
      return draft.id ? holidaysService.update(draft.id, payload) : holidaysService.create(payload);
    },
    onSuccess: () => onSaved(!draft.id),
    onError: (err) => setError(extractApiError(err, 'No se pudo guardar el feriado').message),
  });

  const submit = () => {
    const parsed = holidaySchema.safeParse({ name: draft.name.trim(), date: draft.date, isRecurring: draft.isRecurring });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Revisa los datos del feriado.');
    setError(null);
    save.mutate();
  };

  return (
    <Dialog open onClose={onClose} maxWidth='sm' fullWidth aria-labelledby='feriado-titulo'>
      <DialogTitle id='feriado-titulo'>{initial.id ? 'Editar feriado' : 'Nuevo feriado'}</DialogTitle>
      <DialogContent className='flex flex-col gap-4'>
        {error && <Alert severity='error'>{error}</Alert>}
        <TextField id='feriado-nombre' size='small' label='Nombre' value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className='mbs-2' />
        <TextField id='feriado-fecha' size='small' type='date' label='Fecha' value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
        <FormControlLabel
          label='Se repite cada año'
          control={<Checkbox checked={draft.isRecurring} onChange={(_, v) => setDraft((d) => ({ ...d, isRecurring: v }))} />}
        />
        {globalAdmin && (
          <TextField select id='feriado-alcance' size='small' label='Alcance' value={draft.clinicId} onChange={(e) => setDraft((d) => ({ ...d, clinicId: e.target.value === '' ? '' : Number(e.target.value) }))}>
            <MenuItem value=''>Global (todas las sedes)</MenuItem>
            {clinics.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        {valid && (
          <>
            <Typography variant='h6' component='h3'>
              Citas afectadas
            </Typography>
            <ImpactList rows={impact.data?.appointments} loading={impact.isFetching} cancels withDoctor empty='Ninguna cita cae en ese día.' />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant='contained' disabled={save.isPending} onClick={submit}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
