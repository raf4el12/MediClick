export interface ProfileResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string | null;
  profile: {
    id: number;
    name: string;
    lastName: string;
    email: string;
    phone: string | null;
    typeDocument: string | null;
    numberDocument: string | null;
    address: string | null;
    state: string | null;
    country: string | null;
  } | null;
}

export interface UpdateProfileData {
  name?: string;
  lastName?: string;
  phone?: string;
  typeDocument?: string;
  numberDocument?: string;
  address?: string;
  state?: string;
  country?: string;
}
