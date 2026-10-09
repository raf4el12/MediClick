'use client';

import useMediaQuery from '@mui/material/useMediaQuery';
import { styled, useTheme } from '@mui/material/styles';
import { useImageVariant } from '@core/hooks/useImageVariant';

const MaskImg = styled('img')({
  inlineSize: '100%',
  position: 'absolute',
  insetBlockEnd: 0,
  zIndex: -1,
});

interface IllustrationsProps {
  /** Árboles de las esquinas inferiores; `null` oculta el de ese lado. */
  leftTree?: string | null;
  rightTree?: string | null;
  maskImg?: string;
}

/** Decoración de fondo de las páginas de acceso y de error (oculta en celular). */
const Illustrations = ({
  leftTree = '/images/illustrations/objects/tree-1.png',
  rightTree = '/images/illustrations/objects/tree-2.png',
  maskImg,
}: IllustrationsProps) => {
  const theme = useTheme();
  const hidden = useMediaQuery(theme.breakpoints.down('md'));
  const miscMask = useImageVariant('/images/pages/misc-mask-light.png', '/images/pages/misc-mask-dark.png');

  if (hidden) return null;

  return (
    <>
      {leftTree && <img alt='' src={leftTree} className='absolute inline-start-0 block-end-0' height={200} />}
      <MaskImg alt='' src={maskImg ?? miscMask} />
      {rightTree && <img alt='' src={rightTree} className='absolute inline-end-0 block-end-0' height={200} />}
    </>
  );
};

export default Illustrations;
