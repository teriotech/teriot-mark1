import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase";

// Hindari cache GET di production
export const dynamic = "force-dynamic";

const TABLE = "create_bom";
const PAGE_SIZE = 1000; // batas default Supabase per request

// Jangan di-export: file route hanya boleh export handler / config
type CreateBomPayload = {
  bom_code?: string | null;
  qo_number?: string | null;
  customer: string;
  project_name?: string | null;
  mother_part: string;
  part_number: string;
  description?: string | null;
  technical_specification?: string | null;
  qty?: number | string;
  unit?: string | null;
  price?: number | string;
  margin?: number | string;
  markup?: number | string;
};

class ValidationError extends Error {}

// ================= HELPERS =================
const str = (v: unknown): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

const num = (v: unknown, fallback = 0): number => {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Bersihkan karakter yang merusak filter .or() / ilike PostgREST
const sanitizeLike = (v: string) => v.replace(/[,()*%\\]/g, " ").trim();

const errorResponse = (msg: string, error: any, status = 500) => {
  const detail = error?.message || String(error);
  console.error(`[create_bom] ${msg}:`, error);
  return NextResponse.json(
    { message: `${msg}: ${detail}`, error: detail, code: error?.code ?? null },
    { status }
  );
};

const buildInsertRow = (body: CreateBomPayload, index?: number) => {
  const label = index !== undefined ? ` (baris ${index + 1})` : "";
  const customer = str(body?.customer);
  const mother_part = str(body?.mother_part);
  const part_number = str(body?.part_number);

  if (!customer || !mother_part || !part_number) {
    throw new ValidationError(`Customer, Mother Part, dan Part Number wajib diisi${label}.`);
  }

  const qty = num(body.qty, 1);
  if (qty <= 0) throw new ValidationError(`Qty untuk part '${part_number}' harus lebih dari 0${label}.`);

  const price = num(body.price, 0);
  const margin = num(body.margin, 0);
  const markup =
    body.markup !== undefined && body.markup !== null && body.markup !== ""
      ? num(body.markup, 0)
      : price * (margin / 100) * qty;

  return {
    bom_code: str(body.bom_code),
    qo_number: str(body.qo_number),
    customer,
    project_name: str(body.project_name),
    mother_part,
    part_number,
    description: str(body.description),
    technical_specification: str(body.technical_specification),
    qty,
    unit: str(body.unit) || "Pcs",
    price,
    margin,
    markup,
  };
};

// ================= GET =================
/**
 * GET /api/management/create_bom
 * Query: id | bom_code | qo_number | customer | project_name | search
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const bom_code = searchParams.get("bom_code");
    const qo_number = searchParams.get("qo_number");
    const customer = searchParams.get("customer");
    const project_name = searchParams.get("project_name");
    const search = searchParams.get("search");

    // Ambil 1 data berdasarkan ID
    if (id) {
      const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) {
        return NextResponse.json({ message: `Data BOM dengan ID ${id} tidak ditemukan.` }, { status: 404 });
      }
      return NextResponse.json({ data }, { status: 200 });
    }

    const applyFilters = (q: any) => {
      if (bom_code) q = q.eq("bom_code", bom_code.trim());
      if (qo_number) q = q.ilike("qo_number", `%${sanitizeLike(qo_number)}%`);
      if (customer) q = q.ilike("customer", `%${sanitizeLike(customer)}%`);
      if (project_name) q = q.ilike("project_name", `%${sanitizeLike(project_name)}%`);
      if (search) {
        const s = sanitizeLike(search);
        if (s) {
          q = q.or(
            [
              `bom_code.ilike.%${s}%`,
              `qo_number.ilike.%${s}%`,
              `customer.ilike.%${s}%`,
              `project_name.ilike.%${s}%`,
              `mother_part.ilike.%${s}%`,
              `part_number.ilike.%${s}%`,
              `description.ilike.%${s}%`,
              `technical_specification.ilike.%${s}%`,
            ].join(",")
          );
        }
      }
      return q;
    };

    // Ambil semua data per halaman (lebih dari 1000 baris)
    const all: any[] = [];
    let from = 0;
    while (true) {
      let q = supabase
        .from(TABLE)
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      q = applyFilters(q);

      const { data, error } = await q;
      if (error) throw error;

      all.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return NextResponse.json({ data: all, total: all.length }, { status: 200 });
  } catch (error: any) {
    return errorResponse("Gagal mengambil data BOM", error);
  }
}

// ================= POST =================
/**
 * POST /api/management/create_bom
 * Body: 1 object  |  array object  |  { items: [...] }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ message: "Body request tidak valid (bukan JSON)." }, { status: 400 });
    }

    const isBulk = Array.isArray(body) || Array.isArray(body?.items);
    const rawItems: CreateBomPayload[] = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [body];

    if (rawItems.length === 0) {
      return NextResponse.json({ message: "Tidak ada item BOM untuk disimpan." }, { status: 400 });
    }

    const rows = rawItems.map((item, idx) => buildInsertRow(item, isBulk ? idx : undefined));

    const { data, error } = await supabase.from(TABLE).insert(rows).select();
    if (error) throw error;

    return NextResponse.json(
      {
        message: `${data?.length ?? 0} data BOM berhasil disimpan`,
        data: isBulk ? data : data?.[0] ?? null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ message: error.message, error: error.message }, { status: 400 });
    }
    return errorResponse("Terjadi kesalahan saat menyimpan BOM", error);
  }
}

// ================= PUT =================
/**
 * PUT /api/management/create_bom?id=123   (atau id di body)
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) ?? {};

    const id = searchParams.get("id") || body.id;
    if (!id) {
      return NextResponse.json({ message: "ID BOM wajib disertakan untuk update." }, { status: 400 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

    // Field string opsional (boleh null)
    for (const f of ["bom_code", "qo_number", "project_name", "description", "technical_specification"] as const) {
      if (body[f] !== undefined) updateData[f] = str(body[f]);
    }

    // Field string wajib (tidak boleh kosong)
    for (const f of ["customer", "mother_part", "part_number"] as const) {
      if (body[f] !== undefined) {
        const v = str(body[f]);
        if (!v) return NextResponse.json({ message: `${f} tidak boleh kosong.` }, { status: 400 });
        updateData[f] = v;
      }
    }

    if (body.unit !== undefined) updateData.unit = str(body.unit) || "Pcs";

    if (body.qty !== undefined) {
      const qty = num(body.qty, 0);
      if (qty <= 0) return NextResponse.json({ message: "Qty harus lebih dari 0." }, { status: 400 });
      updateData.qty = qty;
    }
    if (body.price !== undefined) updateData.price = num(body.price, 0);
    if (body.margin !== undefined) updateData.margin = num(body.margin, 0);
    if (body.markup !== undefined) updateData.markup = num(body.markup, 0);

    const { data, error } = await supabase.from(TABLE).update(updateData).eq("id", id).select().maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { message: `Data BOM dengan ID ${id} tidak ditemukan / tidak diizinkan (cek RLS).` },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Data BOM berhasil diperbarui", data }, { status: 200 });
  } catch (error: any) {
    return errorResponse("Terjadi kesalahan saat memperbarui BOM", error);
  }
}

// ================= DELETE =================
/**
 * DELETE /api/management/create_bom?id=123
 * DELETE /api/management/create_bom?ids=1,2,3
 * DELETE /api/management/create_bom?bom_code=BOM-xxxx   (hapus 1 BOM penuh)
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const idsParam = searchParams.get("ids");
    const bom_code = searchParams.get("bom_code");

    if (!id && !idsParam && !bom_code) {
      return NextResponse.json(
        { message: "Sertakan id, ids, atau bom_code untuk penghapusan." },
        { status: 400 }
      );
    }

    let q: any = supabase.from(TABLE).delete();

    if (bom_code) {
      q = q.eq("bom_code", bom_code.trim());
    } else if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) {
        return NextResponse.json({ message: "Parameter ids tidak valid." }, { status: 400 });
      }
      q = q.in("id", ids);
    } else {
      q = q.eq("id", id);
    }

    const { data, error } = await q.select("id");
    if (error) throw error;

    const deleted = data?.length ?? 0;
    if (deleted === 0) {
      return NextResponse.json(
        { message: "Tidak ada data yang terhapus (data tidak ditemukan atau diblokir RLS)." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: `${deleted} data BOM berhasil dihapus.`, deleted, ids: data.map((r: any) => r.id) },
      { status: 200 }
    );
  } catch (error: any) {
    return errorResponse("Terjadi kesalahan saat menghapus BOM", error);
  }
}