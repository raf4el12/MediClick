import LayoutWrapper from '@/@layouts/LayoutWrapper';
import VerticalLayout from '@/@layouts/VerticalLayout';
import Navigation from '@/@layouts/components/Navigation';
import Navbar from '@/@layouts/components/Navbar';
import Footer from '@/@layouts/components/Footer';

export default function MenuLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LayoutWrapper
      verticalLayout={
        <VerticalLayout
          navigation={<Navigation />}
          navbar={<Navbar />}
          footer={<Footer />}
        >
          {children}
        </VerticalLayout>
      }
    />
  );
}
