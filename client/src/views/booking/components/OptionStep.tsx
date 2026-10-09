'use client';

import Typography from '@mui/material/Typography';
import CustomInputHorizontal from '@core/components/custom-inputs/Horizontal';
import type { BookingOption } from '../model/types';

interface OptionStepProps {
  name: string;
  options: BookingOption[];
  selected?: BookingOption;
  onSelect: (option: BookingOption) => void;
  loading: boolean;
  empty: string;
  describe?: (option: BookingOption) => { meta?: React.ReactNode; content?: React.ReactNode };
}

/** Tarjetas seleccionables (custom inputs de Materio) para sede, especialidad y médico. */
export function OptionStep({ name, options, selected, onSelect, loading, empty, describe }: OptionStepProps) {
  if (loading) return <Typography color='text.secondary'>Cargando…</Typography>;
  if (options.length === 0) return <Typography color='text.secondary'>{empty}</Typography>;

  return (
    <div role='radiogroup' className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {options.map((option) => (
        <CustomInputHorizontal
          key={option.id}
          name={name}
          selected={selected ? String(selected.id) : ''}
          handleChange={() => onSelect(option)}
          data={{ value: String(option.id), title: option.label, ...describe?.(option) }}
        />
      ))}
    </div>
  );
}
