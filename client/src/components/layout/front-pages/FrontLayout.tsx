import Footer from './Footer';
import Header from './Header';

/** Layout de las páginas públicas (patrón `front-pages` de Materio). */
export default function FrontLayout({ portalHref, children }: { portalHref: string | null; children: React.ReactNode }) {
  return (
    <div className='flex flex-col min-bs-[100dvh]'>
      <Header portalHref={portalHref} />
      <main id='main-content' className='flex-1'>
        {children}
      </main>
      <Footer />
    </div>
  );
}
