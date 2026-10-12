'use client';

import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import tableStyles from '@core/styles/table.module.css';
import { rolesService } from '@/services/roles.service';
import { extractApiError } from '@/utils/extractApiError';
import { actionLabel, subjectLabel } from '../permissionsMeta';
import { fromPermissionMatrix, rowState, toPermissionMatrix, toggleAll, togglePermission, toggleSubject } from '../functions/permissionMatrix';
import type { PermissionDto, RoleDto } from '../types';

interface RoleDialogProps {
  /** `null`: rol nuevo. */
  role: RoleDto | null;
  permissions: PermissionDto[];
  onClose: () => void;
  onSaved: (created: boolean) => void;
}

/** Nombre del rol y matriz de permisos (adapta `components/dialogs/role-dialog` de Materio). Los roles de sistema se ven en solo lectura. */
export function RoleDialog({ role, permissions, onClose, onSaved }: RoleDialogProps) {
  const readOnly = !!role?.isSystem;
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [matrix, setMatrix] = useState(() => toPermissionMatrix(permissions, role?.permissions.map((p) => p.id) ?? []));
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = readOnly ? `Permisos de ${role!.name}` : role ? 'Editar rol' : 'Nuevo rol';
  const selectedIds = fromPermissionMatrix(matrix);
  const allSelected = permissions.length > 0 && selectedIds.length === permissions.length;
  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? matrix.rows.filter((r) => subjectLabel(r.subject).toLowerCase().includes(q)) : matrix.rows;
  }, [matrix.rows, query]);

  const save = async () => {
    if (!name.trim()) {
      setError('El nombre del rol es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = { name: name.trim(), description: description.trim() || undefined, permissionIds: selectedIds };
    try {
      if (role) await rolesService.update(role.id, payload);
      else await rolesService.create(payload);
      onSaved(!role);
    } catch (err) {
      setError(extractApiError(err, 'No se pudo guardar el rol').message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open fullWidth maxWidth='md' scroll='body' onClose={onClose} aria-labelledby='rol-titulo'>
      <DialogTitle id='rol-titulo' variant='h4' className='flex flex-col gap-1 text-center sm:pbs-12 sm:pli-12'>
        {title}
        <Typography component='span'>
          {readOnly ? 'Los roles de sistema no se pueden modificar.' : 'Elige qué puede hacer este rol en cada módulo.'}
        </Typography>
      </DialogTitle>
      <DialogContent className='flex flex-col gap-5 overflow-visible pbs-0 sm:pli-12'>
        <IconButton onClick={onClose} aria-label='Cerrar' className='absolute block-start-4 inline-end-4'>
          <i className='ri-close-line' aria-hidden />
        </IconButton>
        {error && <Alert severity='error'>{error}</Alert>}
        {!readOnly && (
          <div className='grid gap-4 sm:grid-cols-2'>
            <TextField id='rol-nombre' label='Nombre del rol' value={name} onChange={(e) => setName(e.target.value)} placeholder='Enfermería, caja…' />
            <TextField id='rol-descripcion' label='Descripción (opcional)' value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        )}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Typography variant='h5' component='h2'>
            Permisos del rol
          </Typography>
          <TextField
            id='rol-buscar'
            size='small'
            placeholder='Buscar módulo…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': 'Buscar módulo' },
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='ri-search-line' aria-hidden />
                  </InputAdornment>
                ),
              },
            }}
          />
        </div>
        <div className='overflow-x-auto'>
          <table className={tableStyles.table} aria-label='Permisos por módulo'>
            <thead>
              <tr>
                <th scope='col'>Módulo</th>
                <th scope='col'>
                  {readOnly ? (
                    'Todas'
                  ) : (
                    <FormControlLabel
                      className='mie-0'
                      label='Todas'
                      control={
                        <Checkbox
                          checked={allSelected}
                          indeterminate={selectedIds.length > 0 && !allSelected}
                          onChange={() => setMatrix((m) => toggleAll(m))}
                          slotProps={{ input: { 'aria-label': 'Seleccionar todos los permisos' } }}
                        />
                      }
                    />
                  )}
                </th>
                {matrix.actions.map((action) => (
                  <th key={action} scope='col' align='center'>
                    {actionLabel(action)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={matrix.actions.length + 2} className='text-center'>
                    Ningún módulo coincide con «{query}».
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const label = subjectLabel(row.subject);
                  const state = rowState(row);
                  return (
                    <tr key={row.subject}>
                      <th scope='row' className='text-start'>
                        <Typography className='font-medium' color='text.primary'>
                          {label}
                        </Typography>
                      </th>
                      <td>
                        <Checkbox
                          checked={state.all}
                          indeterminate={state.some}
                          disabled={readOnly}
                          onChange={() => setMatrix((m) => toggleSubject(m, row.subject))}
                          slotProps={{ input: { 'aria-label': `${label}: todas las acciones` } }}
                        />
                      </td>
                      {matrix.actions.map((action) => {
                        const cell = row.cells[action];
                        return (
                          <td key={action} align='center'>
                            {cell ? (
                              <Checkbox
                                checked={cell.checked}
                                disabled={readOnly}
                                onChange={() => setMatrix((m) => togglePermission(m, cell.permissionId))}
                                slotProps={{ input: { 'aria-label': `${label}: ${actionLabel(action)}` } }}
                              />
                            ) : (
                              <span aria-hidden className='text-textSecondary'>
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
      <DialogActions className='justify-center sm:pbe-12 sm:pli-12'>
        {readOnly ? (
          <Button variant='contained' onClick={onClose}>
            Cerrar
          </Button>
        ) : (
          <>
            <Button variant='contained' disabled={saving} onClick={() => void save()}>
              {role ? 'Guardar' : 'Crear rol'}
            </Button>
            <Button variant='outlined' onClick={onClose}>
              Cancelar
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
