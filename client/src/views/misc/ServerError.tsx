'use client';

import Link from 'next/link';
import Button from '@mui/material/Button';
import MiscLayout, { useHomePath } from './MiscLayout';

interface ServerErrorProps {
  reset: () => void;
  fullPage?: boolean;
}

const ServerError = ({ reset, fullPage }: ServerErrorProps) => {
  const homePath = useHomePath();

  return (
    <MiscLayout
      fullPage={fullPage}
      code='500'
      title='Algo salió mal'
      description='Ocurrió un error inesperado. Puedes reintentar o volver al inicio.'
      image='/images/illustrations/characters/6.png'
    >
      <Button variant='contained' onClick={reset}>
        Reintentar
      </Button>
      <Button href={homePath} component={Link} variant='outlined'>
        Ir al inicio
      </Button>
    </MiscLayout>
  );
};

export default ServerError;
