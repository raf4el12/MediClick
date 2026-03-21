'use client';

import { forwardRef } from 'react';
import PhoneInput from 'react-phone-number-input';
import type { Value } from 'react-phone-number-input';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';

import 'react-phone-number-input/style.css';

interface InternationalPhoneInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  error?: string;
  label?: string;
  disabled?: boolean;
}

const MuiPhoneTextField = forwardRef<HTMLDivElement, React.ComponentProps<typeof TextField>>(
  function MuiPhoneTextField(props, ref) {
    return (
      <TextField
        {...props}
        ref={ref}
        variant="outlined"
        fullWidth
        size="medium"
      />
    );
  },
);

export const InternationalPhoneInput = forwardRef<HTMLDivElement, InternationalPhoneInputProps>(
  function InternationalPhoneInput({ value, onChange, error, label = 'Teléfono', disabled }, ref) {
    return (
      <FormControl fullWidth error={!!error} ref={ref}>
        <PhoneInput
          international
          defaultCountry="PE"
          countryCallingCodeEditable={false}
          value={value as Value | undefined}
          onChange={onChange as (value: Value | undefined) => void}
          disabled={disabled}
          inputComponent={MuiPhoneTextField}
          numberInputProps={{
            label,
            error: !!error,
          }}
          style={{
            '--PhoneInputCountryFlag-height': '1.2em',
            '--PhoneInputCountrySelectArrow-marginLeft': '0.5em',
            '--PhoneInput-color--focus': '#3b82f6',
          } as React.CSSProperties}
        />
        {error && <FormHelperText>{error}</FormHelperText>}
      </FormControl>
    );
  },
);
