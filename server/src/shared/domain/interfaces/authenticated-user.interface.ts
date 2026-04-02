export interface AuthenticatedUser {
  id: number;
  email: string;
  roleId: number;
  roleName: string;
  clinicId: number | null;
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}
