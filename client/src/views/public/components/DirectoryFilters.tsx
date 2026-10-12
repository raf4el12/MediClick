'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { PublicClinic, PublicSpecialty } from '../types';

interface DirectoryFiltersProps {
  clinics: PublicClinic[];
  specialties: PublicSpecialty[];
  current: { clinicId?: number; specialtyId?: number; q?: string };
}

/** Filtros del directorio: viven en la URL para que el resultado se pueda compartir e indexar. */
export default function DirectoryFilters({ clinics, specialties, current }: DirectoryFiltersProps) {
  const router = useRouter();
  const [q, setQ] = useState(current.q ?? '');

  const go = (next: { clinicId?: number; specialtyId?: number; q?: string }) => {
    const params = new URLSearchParams();
    if (next.q) params.set('q', next.q);
    if (next.clinicId) params.set('clinicId', String(next.clinicId));
    if (next.specialtyId) params.set('specialtyId', String(next.specialtyId));
    const qs = params.toString();
    router.push(qs ? `/medicos?${qs}` : '/medicos');
  };

  return (
    <form
      role='search'
      className='flex flex-wrap items-center gap-4'
      onSubmit={(e) => {
        e.preventDefault();
        go({ ...current, q: q.trim() || undefined });
      }}
    >
      <TextField size='small' id='directorio-buscar' label='Buscar médico' value={q} onChange={(e) => setQ(e.target.value)} className='is-full sm:is-64' />
      <TextField
        select
        size='small'
        id='directorio-especialidad'
        label='Especialidad'
        value={current.specialtyId ?? ''}
        onChange={(e) => go({ ...current, specialtyId: e.target.value ? Number(e.target.value) : undefined })}
        className='is-full sm:is-56'
      >
        <MenuItem value=''>Todas</MenuItem>
        {specialties.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size='small'
        id='directorio-sede'
        label='Sede'
        value={current.clinicId ?? ''}
        onChange={(e) => go({ ...current, clinicId: e.target.value ? Number(e.target.value) : undefined })}
        className='is-full sm:is-56'
      >
        <MenuItem value=''>Todas</MenuItem>
        {clinics.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>
      <Button type='submit' variant='contained'>
        Buscar
      </Button>
    </form>
  );
}
