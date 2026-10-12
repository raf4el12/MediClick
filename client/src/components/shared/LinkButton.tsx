'use client';

import Link from 'next/link';
import Button, { type ButtonProps } from '@mui/material/Button';

/** Botón de MUI que navega con `next/link`; usable desde componentes de servidor. */
export default function LinkButton({ href, ...props }: Omit<ButtonProps, 'href'> & { href: string }) {
  return <Button component={Link} href={href} {...props} />;
}
