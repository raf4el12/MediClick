export interface JwtPayload {
  sub: number;
  email: string;
  roleId: number;
  roleName: string;
  clinicId: number | null;
}
