export interface Clinic {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateClinicPayload {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  currency: string;
}

export interface UpdateClinicPayload {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  isActive?: boolean;
}
