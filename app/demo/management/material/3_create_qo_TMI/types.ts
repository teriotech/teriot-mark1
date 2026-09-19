// types.ts

export interface MasterMaterial {
  id: number;
  customer?: string;
  mother_part?: string;
  part_number: string;
  description?: string;
  technical_specification?: string;
  qty: number;
  unit?: string;
  margin?: number;
  price: number;
  price_margin?: number;
  supplier?: string;
  markup?: number;
  date_updated?: string;
}

export interface BomItem {
  qo_number?: string;
  id: number;
  customer: string;
  mother_part: string;
  part_number: string;
  description?: string;
  technical_specification?: string;
  qty: number;
  unit?: string;
  price: number;
  margin?: number;
  markup?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FormChildPart {
  id: string;
  material_id?: number;
  part_number: string;
  description: string;
  technical_specification: string;
  qty: number;
  unit: string;
  price: number;
  margin: number;
  markup: number;
}

export interface FormMotherPart {
  id: string;
  mother_part_name: string;
  children: FormChildPart[];
}

export interface BomGroup {
  qo_number?: string; // <-- Ditambahkan di sini untuk mengatasi error TypeScript
  customer: string;
  date_created: string;
  total_mother_parts: number;
  total_items: number;
  total_cost: number;
  items: BomItem[];
}

export type PrintType = "QO" | "PO";