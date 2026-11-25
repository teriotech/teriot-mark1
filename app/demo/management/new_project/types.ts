// app/demo/management/new_project/types.ts

export type PrintType = "QO" | "PO";

export interface BomItem {
  id?: number | string;

  customer?: string | null;
  mother_part?: string | null;
  part_number?: string | null;
  description?: string | null;
  technical_specification?: string | null;
  unit?: string | null;

  qty?: number | string | null;
  price?: number | string | null;
  margin?: number | string | null;

  bom_code?: string | null;
  qo_number?: string | null;
  project_name?: string | null;
  created_at?: string;
}

export interface BomGroup {
  customer: string;
  date_created: string;

  total_mother_parts: number;
  total_items: number;
  total_cost: number;

  items: BomItem[];

  group_key?: string;
  bom_code?: string | null;
  qo_number?: string;
  po_number?: string | null;
  project_name?: string | null;
}