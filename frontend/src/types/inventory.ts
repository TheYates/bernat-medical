export interface Drug {
  id: number;
  name: string;
  category: string;
  purchaseForm: string;
  purchaseFormId: number;
  saleForm: string;
  saleFormId: number;
  strength: string;
  unit: string;
  stock: number;
  minStock: number;
  expiryDate: string;
  active: boolean;
  purchasePrice: number;
  unitsPerPurchase: number;
  posMarkup: number;
  prescriptionMarkup: number;
  unitCost: number;
  posPrice: number;
  prescriptionPrice: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Form {
  id: number;
  name: string;
  description?: string;
} 