export class UserEntity {
  id: number;
  name: string;
  email: string;
  password: string;
  photo: string | null;
  roleId: number | null;
  roleName: string | null;
  isActive: boolean;
  validateEmail: boolean;
  clinicId: number | null;
  clinicName: string | null;
  clinicTimezone: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
