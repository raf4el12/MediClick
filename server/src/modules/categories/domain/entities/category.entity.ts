export class CategoryEntity {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number | null;
  isActive: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}
