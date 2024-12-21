export type ServiceCategory = 'laboratory' | 'consultation' | 'imaging' | 'other';

export interface Service {
  id: number;
  name: string;
  code: string;
  category: ServiceCategory;
  price: number;
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface CreateServiceData {
  name: string;
  code: string;
  category: ServiceCategory;
  price: number;
  description?: string;
} 