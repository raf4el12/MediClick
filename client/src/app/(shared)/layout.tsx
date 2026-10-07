import ActorShell from '@/@layouts/components/ActorShell';

export default function SharedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ActorShell>{children}</ActorShell>;
}
