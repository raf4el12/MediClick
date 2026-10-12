'use client';

import Link from 'next/link';
import Pagination from '@mui/material/Pagination';
import PaginationItem from '@mui/material/PaginationItem';

interface LinkPaginationProps {
  count: number;
  page: number;
  pathname: string;
  /** Parámetros que se conservan en cada enlace (filtros). */
  query?: Record<string, string>;
  param?: string;
  label: string;
}

/** Paginación con enlaces reales (indexables, sin estado en el cliente). */
export default function LinkPagination({ count, page, pathname, query = {}, param = 'pagina', label }: LinkPaginationProps) {
  if (count <= 1) return null;
  const hrefFor = (p: number) => {
    const params = new URLSearchParams(query);
    if (p > 1) params.set(param, String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <nav aria-label={label}>
      <Pagination
        count={count}
        page={page}
        color='primary'
        getItemAriaLabel={(type, p) => (type === 'page' ? `Página ${p}` : type === 'next' ? 'Página siguiente' : type === 'previous' ? 'Página anterior' : type)}
        // La ampliación del tema agrega `tonal` a Pagination pero no a PaginationItem.
        renderItem={(item) => <PaginationItem component={Link} href={hrefFor(item.page ?? 1)} {...item} variant={item.variant as 'text' | 'outlined'} />}
      />
    </nav>
  );
}
