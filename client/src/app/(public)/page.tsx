import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { featuredDoctors, landingReviews } from '@/services/public-directory.service';
import { roleFromAccessToken } from '@/utils/sessionRole';
import Faqs from '@/views/landing/Faqs';
import FeaturedDoctors from '@/views/landing/FeaturedDoctors';
import Features from '@/views/landing/Features';
import GetStarted from '@/views/landing/GetStarted';
import HeroSection from '@/views/landing/HeroSection';
import Reviews from '@/views/landing/Reviews';

export const metadata: Metadata = {
  title: 'MediClick · Reserva tu cita médica en línea',
  description: 'Reserva tu cita con médicos de nuestras sedes, paga en línea y consulta tu expediente y tus recetas.',
};

/** Landing renderizada en el servidor: si el directorio falla, solo se ocultan médicos y reseñas. */
export default async function LandingPage() {
  const signedIn = !!roleFromAccessToken((await cookies()).get('accessToken')?.value);
  const doctors = await featuredDoctors(4);
  const reviews = await landingReviews(doctors);

  return (
    <>
      <HeroSection />
      <Features />
      {doctors.length > 0 && <FeaturedDoctors doctors={doctors} />}
      {reviews.length > 0 && <Reviews reviews={reviews} />}
      <Faqs />
      <GetStarted signedIn={signedIn} />
    </>
  );
}
