import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase";

// GET: Mengambil daftar material ATAU detail 1 material (jika ada ?id=...)
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const search = searchParams.get("search");

    // 1. Jika ada ID di parameter, ambil detail 1 material
    if (id) {
      const { data, error } = await supabase
        .from("master_material")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return NextResponse.json(
          { message: "Material tidak ditemukan", error: error.message },
          { status: 404 }
        );
      }

      return NextResponse.json({ data }, { status: 200 });
    }

    // 2. Jika tidak ada ID, ambil seluruh daftar (dengan opsional search)
    let query = supabase
      .from("master_material")
      .select("*")
      .order("date_updated", { ascending: false });

    if (search) {
      query = query.or(`part_number.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { message: "Gagal mengambil data material", error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST: Menambahkan data master material baru
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      part_number,
      description,
      technical_specification,
      qty,
      unit,
      margin,
      price,
      supplier,
      markup,
    } = body;

    if (!part_number) {
      return NextResponse.json(
        { message: "Part Number wajib diisi" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("master_material")
      .insert([
        {
          part_number,
          description,
          technical_specification,
          qty: qty ?? 0,
          unit,
          margin: margin ?? 0,
          price: price ?? 0,
          supplier,
          markup: markup ?? 0,
          date_updated: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Part Number sudah terdaftar" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: "Gagal menambahkan material", error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Material berhasil ditambahkan", data },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT: Mengubah data material berdasarkan query param ?id=... (atau id dari body)
export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const body = await request.json();

    // Mengambil ID dari query parameter (?id=1) atau fallback ke body payload
    const id = searchParams.get("id") || body.id;

    if (!id) {
      return NextResponse.json(
        { message: "ID material wajib disertakan (?id=... atau di body)" },
        { status: 400 }
      );
    }

    const {
      part_number,
      description,
      technical_specification,
      qty,
      unit,
      margin,
      price,
      supplier,
      markup,
    } = body;

    const updateData: Record<string, any> = {
      date_updated: new Date().toISOString(),
    };

    if (part_number !== undefined) updateData.part_number = part_number;
    if (description !== undefined) updateData.description = description;
    if (technical_specification !== undefined)
      updateData.technical_specification = technical_specification;
    if (qty !== undefined) updateData.qty = qty;
    if (unit !== undefined) updateData.unit = unit;
    if (margin !== undefined) updateData.margin = margin;
    if (price !== undefined) updateData.price = price;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (markup !== undefined) updateData.markup = markup;

    const { data, error } = await supabase
      .from("master_material")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Part Number sudah digunakan material lain" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: "Gagal memperbarui material", error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Material berhasil diperbarui", data },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus data material berdasarkan query param ?id=...
export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID material wajib disertakan dalam parameter URL (?id=...)" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("master_material")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { message: "Gagal menghapus material", error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Material berhasil dihapus" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: (error as Error).message },
      { status: 500 }
    );
  }
}