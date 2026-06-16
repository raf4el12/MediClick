'use client';

import { useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha } from '@mui/material/styles';
import type { RoleDto } from '../types';
import {
  actionColor,
  actionLabel,
  groupByDomain,
  isFullAccess,
  moduleCount,
  roleVisual,
  subjectIcon,
  subjectLabel,
} from '../permissionsMeta';

interface PermissionsDialogProps {
  role: RoleDto | null;
  onClose: () => void;
}

export function PermissionsDialog({ role, onClose }: PermissionsDialogProps) {
  // El estado de búsqueda se reinicia por rol vía `key` en el componente padre.
  const [query, setQuery] = useState('');

  const fullAccess = role ? isFullAccess(role.permissions) : false;
  const visual = role ? roleVisual(role) : { icon: 'ri-shield-line', color: 'primary' as const };

  const domains = useMemo(
    () => (role ? groupByDomain(role.permissions) : []),
    [role],
  );

  const filteredDomains = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return domains;
    return domains
      .map((d) => ({
        ...d,
        subjects: d.subjects.filter((s) =>
          subjectLabel(s.subject).toLowerCase().includes(q),
        ),
      }))
      .filter((d) => d.subjects.length > 0);
  }, [domains, query]);

  if (!role) return null;

  const totalModules = moduleCount(role.permissions);
  const noMatches = !fullAccess && filteredDomains.length === 0;

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 3,
          background: (theme) =>
            `linear-gradient(135deg, ${alpha(
              theme.palette[visual.color].main,
              0.12,
            )} 0%, ${alpha(theme.palette[visual.color].main, 0.02)} 100%)`,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: (theme) => theme.palette[visual.color].main,
            bgcolor: (theme) => alpha(theme.palette[visual.color].main, 0.16),
          }}
        >
          <i className={visual.icon} style={{ fontSize: 26 }} />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" fontWeight={700} noWrap>
            {role.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {fullAccess
              ? 'Acceso total al sistema'
              : `${role.permissions.length} permiso${
                  role.permissions.length !== 1 ? 's' : ''
                } · ${totalModules} módulo${totalModules !== 1 ? 's' : ''}`}
          </Typography>
        </Box>

        <IconButton onClick={onClose} aria-label="Cerrar" sx={{ flexShrink: 0 }}>
          <i className="ri-close-line" style={{ fontSize: 22 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3, bgcolor: 'action.hover' }}>
        {fullAccess ? (
          <FullAccessHero />
        ) : (
          <>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar módulo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ mb: 3, bgcolor: 'background.paper', borderRadius: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <i className="ri-search-line" style={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />

            {noMatches ? (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <i
                  className="ri-search-eye-line"
                  style={{ fontSize: 40, display: 'block', marginBottom: 8 }}
                />
                <Typography variant="body2">
                  Ningún módulo coincide con “{query}”.
                </Typography>
              </Box>
            ) : (
              filteredDomains.map(({ domain, subjects }) => (
                <Box key={domain.key} sx={{ mb: 3, '&:last-of-type': { mb: 0 } }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1.5,
                      color: 'text.secondary',
                    }}
                  >
                    <i className={domain.icon} style={{ fontSize: 16 }} />
                    <Typography
                      variant="overline"
                      sx={{ fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1 }}
                    >
                      {domain.label}
                    </Typography>
                    <Box
                      sx={{
                        flex: 1,
                        height: '1px',
                        bgcolor: 'divider',
                        ml: 1,
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 1.5,
                    }}
                  >
                    {subjects.map((sg) => (
                      <SubjectCard
                        key={sg.subject}
                        subject={sg.subject}
                        actions={sg.permissions.map((p) => p.action)}
                      />
                    ))}
                  </Box>
                </Box>
              ))
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubjectCard({ subject, actions }: { subject: string; actions: string[] }) {
  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'border-color .15s, box-shadow .15s',
        '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            flexShrink: 0,
          }}
        >
          <i className={subjectIcon(subject)} style={{ fontSize: 17 }} />
        </Box>
        <Typography variant="subtitle2" fontWeight={600} noWrap>
          {subjectLabel(subject)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {actions.map((action) => {
          const color = actionColor(action);
          return (
            <Chip
              key={action}
              label={actionLabel(action)}
              size="small"
              sx={{
                fontSize: '0.7rem',
                height: 22,
                fontWeight: 600,
                color: (theme) => theme.palette[color].main,
                bgcolor: (theme) => alpha(theme.palette[color].main, 0.12),
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}

function FullAccessHero() {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 6,
        px: 3,
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '1px dashed',
        borderColor: (theme) => alpha(theme.palette.warning.main, 0.5),
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          mx: 'auto',
          mb: 2,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'warning.main',
          bgcolor: (theme) => alpha(theme.palette.warning.main, 0.14),
        }}
      >
        <i className="ri-shield-star-line" style={{ fontSize: 38 }} />
      </Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Acceso total al sistema
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
        Este rol tiene el permiso <strong>Gestionar todo</strong>, que concede
        control completo sobre cada módulo de MediClick. No requiere permisos
        individuales.
      </Typography>
    </Box>
  );
}
