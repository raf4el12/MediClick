import PatientLayout from '@/@layouts/components/PatientLayout';

export default function PatientRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PatientLayout>{children}</PatientLayout>;
}
