import { PatientShell } from '@/@layouts/components/ActorShell';

export default function PatientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PatientShell>{children}</PatientShell>;
}
