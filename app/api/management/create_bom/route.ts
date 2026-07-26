import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase";

// Interface untuk payload yang diterima dari frontend
export interface CreateBomPayload {
  customer: string;
  mother_part: string;
  part_number: string;
  description?: string;
  technical_specification?: string; // <-- Ditambahkan di sini
  qty: number;
  unit?: string;
  price?: number;
  margin?: number;
  markup?: number;
}

/**
 * GET: Mengambil daftar BOM
 * Bisa difilter berdasarkan customer atau pencarian umum.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const customer = searchParams.get("customer");
    const search = searchParams.get("search");

    // Jika mencari ID spesifik
    if (id) {
      const { data, error } = await supabase
        .from("create_bom")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return NextResponse.json({ data }, { status: 200 });
    }

    // Query dasar
    let query = supabase
      .from("create_bom")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter berdasarkan customer
    if (customer) {
      query = query.ilike("customer", `%${customer}%`);
    }

    // Filter pencarian umum (part_number, description, atau technical_specification)
    if (search) {
      query = query.or(
        `part_number.ilike.%${search}%,description.ilike.%${search}%,technical_specification.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Gagal mengambil data BOM", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Menyimpan data BOM baru (Child Part beserta relasi Customer & Mother Part)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body: CreateBomPayload = await request.json();

    // Validasi field wajib
    if (!body.customer || !body.mother_part || !body.part_number) {
      return NextResponse.json(
        { message: "Customer, Mother Part, dan Part Number wajib diisi." },
        { status: 400 }
      );
    }

    const insertData = {
      customer: body.customer.trim(),
      mother_part: body.mother_part.trim(),
      part_number: body.part_number.trim(),
      description: body.description?.trim() || null,
      technical_specification: body.technical_specification?.trim() || null, // <-- Ditambahkan di sini
      qty: body.qty !== undefined ? Number(body.qty) : 1,
      unit: body.unit?.trim() || "Pcs",
      price: body.price !== undefined ? Number(body.price) : 0,
      margin: body.margin !== undefined ? Number(body.margin) : 0,
      markup: body.markup !== undefined ? Number(body.markup) : 0,
    };

    const { data, error } = await supabase
      .from("create_bom")
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { message: "Data BOM berhasil disimpan", data },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyimpan BOM", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT: Memperbarui data BOM yang sudah ada berdasarkan ID
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const body = await request.json();
    
    const id = searchParams.get("id") || body.id;

    if (!id) {
      return NextResponse.json(
        { message: "ID BOM wajib disertakan untuk update." },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.customer !== undefined) updateData.customer = body.customer.trim();
    if (body.mother_part !== undefined) updateData.mother_part = body.mother_part.trim();
    if (body.part_number !== undefined) updateData.part_number = body.part_number.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.technical_specification !== undefined) {
      updateData.technical_specification = body.technical_specification.trim(); // <-- Ditambahkan di sini
    }
    if (body.qty !== undefined) updateData.qty = Number(body.qty);
    if (body.unit !== undefined) updateData.unit = body.unit.trim();
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.margin !== undefined) updateData.margin = Number(body.margin);
    if (body.markup !== undefined) updateData.markup = Number(body.markup);

    const { data, error } = await supabase
      .from("create_bom")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { message: "Data BOM berhasil diperbarui", data },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memperbarui BOM", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Menghapus data BOM berdasarkan ID
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID BOM wajib disertakan untuk penghapusan." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("create_bom")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json(
      { message: `Data BOM dengan ID ${id} berhasil dihapus.` },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus BOM", error: error.message },
      { status: 500 }
    );
  }
}