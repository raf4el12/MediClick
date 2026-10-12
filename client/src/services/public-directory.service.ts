import type { PublicDoctor, PublicDoctorReviews, PublicDoctorSummary, PublicDoctorsPage, PublicReview } from '@/views/public/types';

// Páginas públicas renderizadas en el servidor: piden al API sin cookies ni `Authorization`.
// `API_INTERNAL_URL` permite otra dirección de servidor a servidor (p. ej. en Docker o en las pruebas).
const baseUrl = () => process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';
const REVALIDATE_SECONDS = 300;

type Query = Record<string, string | number | undefined>;

async function get<T>(path: string, query: Query = {}): Promise<T | null> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
  const qs = params.toString();
  const response = await fetch(`${baseUrl()}${path}${qs ? `?${qs}` : ''}`, {
    credentials: 'omit',
    headers: { Accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS },
  } as RequestInit);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Directorio público: ${response.status} en ${path}`);

  return (await response.json()) as T;
}

export interface PublicDoctorsQuery {
  clinicId?: number;
  specialtyId?: number;
  searchValue?: string;
  currentPage?: number;
  pageSize?: number;
}

export const publicDirectoryService = {
  listDoctors: async (query: PublicDoctorsQuery = {}): Promise<PublicDoctorsPage> =>
    (await get<PublicDoctorsPage>('/public/doctors', { ...query })) ?? { rows: [], totalRows: 0, currentPage: 1, totalPages: 0 },
  getDoctor: (id: number) => get<PublicDoctor>(`/public/doctors/${id}`),
  getDoctorReviews: (id: number, currentPage = 1, pageSize = 5) => get<PublicDoctorReviews>(`/public/doctors/${id}/reviews`, { currentPage, pageSize }),
};

/** Médicos destacados de la landing: si el directorio falla, la sección se oculta y la página sigue. */
export async function featuredDoctors(count = 4): Promise<PublicDoctorSummary[]> {
  try {
    return (await publicDirectoryService.listDoctors({ pageSize: count })).rows;
  } catch {
    return [];
  }
}

/**
 * Reseñas para la landing: la más reciente de cada médico destacado que tiene reseñas (hasta tres),
 * con el nombre del médico y nunca el del paciente. Si una consulta falla, se omite.
 */
export async function landingReviews(doctors: PublicDoctorSummary[], count = 3): Promise<(PublicReview & { doctorName: string })[]> {
  const withReviews = doctors.filter((d) => d.ratingCount > 0).slice(0, count);
  const pages = await Promise.all(withReviews.map((d) => publicDirectoryService.getDoctorReviews(d.id, 1, 1).catch(() => null)));

  return pages.flatMap((page, i) => {
    const review = page?.rows[0];
    return review ? [{ ...review, doctorName: `${withReviews[i]!.name} ${withReviews[i]!.lastName}` }] : [];
  });
}
