export interface Drug {
  id: number;
  name: string;
  category_id: number;
  purchase_form_id: number;
  sale_form_id: number;
  purchase_price: number;
  units_per_purchase: number;
  pos_markup: number;
  prescription_markup: number;
  unit_cost: number;
  pos_price: number;
  prescription_price: number;
  strength: string;
  unit: string;
  min_stock: number;
  stock: number;
  expiry_date: string;
  active: boolean;
  created_at: string;
}
