import BlankLayout from '@/@layouts/BlankLayout';

export default function BlankLayoutPagesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <BlankLayout>{children}</BlankLayout>;
}
