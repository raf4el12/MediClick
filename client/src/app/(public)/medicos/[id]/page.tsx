import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { publicDirectoryService } from '@/services/public-directory.service';
import { roleFromAccessToken } from '@/utils/sessionRole';
import DoctorProfile from '@/views/public/DoctorProfile';
import { bookingHref, toDoctorProfileView } from '@/views/public/functions/doctorProfile';
import { readId } from '@/views/public/functions/searchParams';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = readId((await params).id);
  const doctor = id ? await publicDirectoryService.getDoctor(id).catch(() => null) : null;
  if (!doctor) return { title: 'Médico no encontrado · MediClick' };
  const view = toDoctorProfileView(doctor);

  return {
    title: `${view.fullName} · ${view.specialties} · MediClick`,
    description: doctor.resume ?? `${view.fullName}, ${view.specialties} en ${doctor.clinic.name}. Reserva tu cita en línea.`,
  };
}

/** Perfil público del médico; inexistente, inactivo o de una sede inactiva → 404. */
export default async function DoctorProfilePage({ params, searchParams }: Props) {
  const id = readId((await params).id);
  if (!id) notFound();
  const doctor = await publicDirectoryService.getDoctor(id);
  if (!doctor) notFound();

  const page = readId((await searchParams).pagina) ?? 1;
  const reviews = (await publicDirectoryService.getDoctorReviews(id, page, 5).catch(() => null)) ?? {
    rows: [],
    totalRows: 0,
    ratingAvg: doctor.ratingAvg,
    ratingCount: doctor.ratingCount,
  };
  const signedIn = !!roleFromAccessToken((await cookies()).get('accessToken')?.value);

  return <DoctorProfile doctor={doctor} reviews={reviews} page={page} bookHref={bookingHref(doctor.id, { signedIn })} />;
}
