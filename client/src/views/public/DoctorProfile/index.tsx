import type { PublicDoctor, PublicDoctorReviews } from '../types';
import DoctorAbout from './DoctorAbout';
import DoctorProfileHeader from './DoctorProfileHeader';
import DoctorReviews from './DoctorReviews';

/** Perfil público del médico (patrón `user-profile` de Materio). */
export default function DoctorProfile({ doctor, reviews, page, bookHref }: { doctor: PublicDoctor; reviews: PublicDoctorReviews; page: number; bookHref: string }) {
  return (
    <div className='flex flex-col gap-6 max-is-[1200px] mli-auto pli-6 pbs-10 pbe-16'>
      <DoctorProfileHeader doctor={doctor} bookHref={bookHref} />
      <div className='grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start'>
        <DoctorAbout doctor={doctor} />
        <DoctorReviews doctorId={doctor.id} reviews={reviews} page={page} />
      </div>
    </div>
  );
}
