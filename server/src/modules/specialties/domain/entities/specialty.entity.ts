export class SpecialtyEntity {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  duration: number | null;
  price: number | null;
  requirements: string | null;
  icon: string | null;
  isActive: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}
