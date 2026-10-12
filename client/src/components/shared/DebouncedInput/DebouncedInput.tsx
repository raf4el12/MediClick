'use client';

import { memo, useEffect, useState } from 'react';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

interface DebouncedInputProps extends Omit<TextFieldProps, 'onChange'> {
  value?: string;
  onChange: (value: string) => void;
  debounce?: number;
}

export const DebouncedInput = memo(function DebouncedInput({
  value: initialValue = '',
  onChange,
  debounce = 500,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    // Sin cambio respecto del valor recibido no hay nada que emitir: al montarse, emitir '' devolvía
    // la tabla a la página 1 aunque el usuario ya hubiera avanzado.
    if (value === initialValue) return;
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, initialValue, onChange, debounce]);

  return (
    <TextField
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      size="small"
    />
  );
});
