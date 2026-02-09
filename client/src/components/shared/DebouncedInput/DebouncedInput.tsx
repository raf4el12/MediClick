'use client';

import { useEffect, useState } from 'react';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

interface DebouncedInputProps extends Omit<TextFieldProps, 'onChange'> {
  value?: string;
  onChange: (value: string) => void;
  debounce?: number;
}

export function DebouncedInput({
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
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, onChange, debounce]);

  return (
    <TextField
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      size="small"
    />
  );
}
