/**
 * Rol del `accessToken` sin verificar la firma. Solo decide redirecciones y enlaces de navegación;
 * la autoridad sobre los datos es siempre el servidor.
 */
export function roleFromAccessToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1] as string));
    return (payload.roleName as string) ?? null;
  } catch {
    return null;
  }
}
