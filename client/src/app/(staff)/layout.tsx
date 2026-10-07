import { StaffShell } from '@/@layouts/components/ActorShell';

export default function StaffLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <StaffShell>{children}</StaffShell>;
}
