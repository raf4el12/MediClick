import dynamic from 'next/dynamic';
import LayoutWrapper from '@/@layouts/LayoutWrapper';
import VerticalLayout from '@/@layouts/VerticalLayout';
import Navigation from '@/@layouts/components/Navigation';
import Navbar from '@/@layouts/components/Navbar';
import Footer from '@/@layouts/components/Footer';

const Customizer = dynamic(() => import('@/@core/components/customizer'));

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
          <Customizer />
          {children}
        </VerticalLayout>
      }
    />
  );
}
