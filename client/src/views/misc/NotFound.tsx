'use client';

import Link from 'next/link';
import Button from '@mui/material/Button';
import MiscLayout, { useHomePath } from './MiscLayout';

const NotFound = () => {
  const homePath = useHomePath();

  return (
    <MiscLayout
      fullPage
      code='404'
      title='Página no encontrada'
      description='La página que buscas no existe o fue movida.'
      image='/images/illustrations/characters/5.png'
    >
      <Button href={homePath} component={Link} variant='contained'>
        Volver al inicio
      </Button>
    </MiscLayout>
  );
};

export default NotFound;
