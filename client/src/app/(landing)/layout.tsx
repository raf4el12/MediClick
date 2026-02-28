import BlankLayout from '@/@layouts/BlankLayout';

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <BlankLayout>{children}</BlankLayout>;
}
