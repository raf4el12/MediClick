/**
 * Enlace "saltar al contenido" — WCAG 2.4.1 (Bypass Blocks).
 *
 * Permite a usuarios de teclado/lectores de pantalla evitar la navegación
 * repetitiva y saltar directo al landmark principal (#main-content en
 * VerticalLayout). Ancla nativa: debe funcionar sin JS/hidratación.
 */
export default function SkipToContent() {
  return (
    <a href="#main-content" className="skip-to-content">
      Saltar al contenido
    </a>
  );
}
