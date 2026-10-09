'use client';

import Link from 'next/link';
import Button from '@mui/material/Button';
import MiscLayout, { useHomePath } from './MiscLayout';

const NotAuthorized = () => {
  const homePath = useHomePath();

  return (
    <MiscLayout
      fullPage
      code='401'
      title='No tienes acceso'
      description='Tu usuario no tiene permiso para ver esta página.'
      image='/images/illustrations/characters/8.png'
    >
      <Button href={homePath} component={Link} variant='contained'>
        Volver al inicio
      </Button>
    </MiscLayout>
  );
};

export default NotAuthorized;
