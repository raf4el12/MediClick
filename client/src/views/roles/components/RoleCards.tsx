'use client';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CustomAvatar from '@core/components/mui/Avatar';
import { isFullAccess, moduleCount, roleVisual } from '../permissionsMeta';
import type { RoleDto } from '../types';

/** Resumen de permisos de un rol, como lo mostraba la tabla anterior. */
export const permissionSummary = (role: RoleDto) => {
  if (isFullAccess(role.permissions)) return 'Acceso total al sistema';
  if (role.permissions.length === 0) return 'Sin permisos';
  const n = role.permissions.length;
  const m = moduleCount(role.permissions);
  return `${n} permiso${n !== 1 ? 's' : ''} · ${m} módulo${m !== 1 ? 's' : ''}`;
};

interface RoleCardsProps {
  roles: RoleDto[];
  loading: boolean;
  onOpen: (role: RoleDto) => void;
  onAdd: () => void;
}

/** Tarjetas por rol y tarjeta para agregar uno (patrón `views/apps/roles/RoleCards` de Materio). */
export function RoleCards({ roles, loading, onOpen, onAdd }: RoleCardsProps) {
  return (
    <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
      {loading
        ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} variant='rounded' height={150} />)
        : roles.map((role) => {
            const visual = roleVisual(role);
            return (
              <Card key={role.id}>
                <CardContent className='flex flex-col gap-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <Typography>{permissionSummary(role)}</Typography>
                    <CustomAvatar skin='light' color={visual.color} variant='rounded' size={40}>
                      <i className={`${visual.icon} text-[22px]`} aria-hidden />
                    </CustomAvatar>
                  </div>
                  <div className='flex flex-col items-start gap-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Typography variant='h5' component='h2'>
                        {role.name}
                      </Typography>
                      <Chip size='small' variant='tonal' color={role.isSystem ? 'info' : 'primary'} label={role.isSystem ? 'Sistema' : 'Personalizado'} />
                    </div>
                    <Button
                      size='small'
                      className='pli-0 min-is-0'
                      onClick={() => onOpen(role)}
                      aria-label={role.isSystem ? `Ver los permisos del rol ${role.name}` : `Editar el rol ${role.name}`}
                    >
                      {role.isSystem ? 'Ver permisos' : 'Editar rol'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      <Card>
        <div className='grid grid-cols-[2fr_3fr] bs-full'>
          <div className='flex items-end justify-center'>
            <img alt='' src='/images/illustrations/characters/1.png' className='max-bs-[130px] max-is-full' />
          </div>
          <CardContent className='flex flex-col items-end justify-center gap-3 text-end'>
            <Button variant='contained' size='small' onClick={onAdd}>
              Agregar rol
            </Button>
            <Typography>Crea un rol con los permisos que necesita tu equipo.</Typography>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
