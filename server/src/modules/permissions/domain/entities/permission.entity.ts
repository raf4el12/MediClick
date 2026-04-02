export class PermissionEntity {
  id: number;
  action: string;
  subject: string;
  description: string | null;
}
