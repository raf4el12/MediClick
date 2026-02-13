export interface UserProfile {
  id: number;
  name: string;
  lastName: string;
  email: string;
  phone: string | null;
  typeDocument: string | null;
  numberDocument: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  profile: UserProfile | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: string;
  profile: {
    name: string;
    lastName: string;
    email: string;
    phone?: string;
    typeDocument?: string;
    numberDocument?: string;
  };
}

export interface UpdateUserPayload {
  role?: string;
  isActive?: boolean;
  profile?: {
    name?: string;
    lastName?: string;
    phone?: string;
    typeDocument?: string;
    numberDocument?: string;
  };
}
