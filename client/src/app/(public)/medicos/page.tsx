import type { Metadata } from 'next';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import LinkPagination from '@/components/shared/LinkPagination';
import { publicDirectoryService } from '@/services/public-directory.service';
import DirectoryFilters from '@/views/public/components/DirectoryFilters';
import DoctorCard from '@/views/public/components/DoctorCard';
import { readId, readText } from '@/views/public/functions/searchParams';
import type { PublicClinic, PublicDoctorsPage, PublicSpecialty } from '@/views/public/types';

export const metadata: Metadata = {
  title: 'Médicos · MediClick',
  description: 'Conoce a los médicos de nuestras sedes, sus especialidades y las reseñas de sus pacientes.',
};

const PAGE_SIZE = 12;

/** Opciones de los filtros: no hay listados públicos de sedes ni especialidades, salen de los médicos públicos. */
function filterOptions(page: PublicDoctorsPage) {
  const clinics = new Map<number, PublicClinic>();
  const specialties = new Map<number, PublicSpecialty>();
  for (const d of page.rows) {
    clinics.set(d.clinic.id, d.clinic);
    for (const s of d.specialties) specialties.set(s.id, s);
  }
  const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'es');
  return { clinics: [...clinics.values()].sort(byName), specialties: [...specialties.values()].sort(byName) };
}

export default async function DoctorsDirectoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const current = { clinicId: readId(sp.clinicId), specialtyId: readId(sp.specialtyId), q: readText(sp.q) };
  const page = readId(sp.pagina) ?? 1;

  let result: PublicDoctorsPage | null = null;
  let options = { clinics: [] as PublicClinic[], specialties: [] as PublicSpecialty[] };
  try {
    const [filtered, all] = await Promise.all([
      publicDirectoryService.listDoctors({ ...current, searchValue: current.q, currentPage: page, pageSize: PAGE_SIZE }),
      publicDirectoryService.listDoctors({ pageSize: 50 }),
    ]);
    result = filtered;
    options = filterOptions(all);
  } catch {
    result = null;
  }

  const query = Object.fromEntries(
    Object.entries({ q: current.q, clinicId: current.clinicId, specialtyId: current.specialtyId })
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  );

  return (
    <div className='flex flex-col gap-8 max-is-[1200px] mli-auto pli-6 pbs-12 pbe-16'>
      <div className='flex flex-col gap-2'>
        <Typography variant='h3' component='h1'>
          Médicos
        </Typography>
        <Typography color='text.secondary'>Busca por nombre, especialidad o sede y reserva con el médico que prefieras.</Typography>
      </div>
      <DirectoryFilters clinics={options.clinics} specialties={options.specialties} current={current} />
      {result === null ? (
        <Alert severity='error'>No pudimos cargar el directorio de médicos. Vuelve a intentarlo en unos minutos.</Alert>
      ) : result.rows.length === 0 ? (
        <Typography color='text.secondary'>No encontramos médicos con esos filtros.</Typography>
      ) : (
        <>
          <Typography color='text.secondary' aria-live='polite'>
            {result.totalRows} {result.totalRows === 1 ? 'médico' : 'médicos'}
          </Typography>
          <ul aria-label='Médicos' className='grid gap-6 m-0 p-0 list-none sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {result.rows.map((d) => (
              <li key={d.id}>
                <DoctorCard doctor={d} headingLevel='h2' />
              </li>
            ))}
          </ul>
          <div className='flex justify-center'>
            <LinkPagination count={result.totalPages} page={page} pathname='/medicos' query={query} label='Páginas del directorio' />
          </div>
        </>
      )}
    </div>
  );
}
