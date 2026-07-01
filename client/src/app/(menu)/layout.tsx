import dynamic from 'next/dynamic';
import LayoutWrapper from '@/@layouts/LayoutWrapper';
import VerticalLayout from '@/@layouts/VerticalLayout';
import Navigation from '@/@layouts/components/Navigation';
import Navbar from '@/@layouts/components/Navbar';
import Footer from '@/@layouts/components/Footer';
import SkipToContent from '@/@core/components/accessibility/SkipToContent';

const Customizer = dynamic(() => import('@/@core/components/customizer'));

export default function MenuLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SkipToContent />
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
      <Customizer />
    </>
  );
}
