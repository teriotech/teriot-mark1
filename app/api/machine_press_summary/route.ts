import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase";

// ==========================================
// GET: Mengambil semua data dari tabel
// ==========================================
export async function GET() {
  try {
    // Inisialisasi Supabase client dari lib
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("machine_press_summary")
      .select("*")
      .order("id", { ascending: false }); // Urutkan dari data terbaru

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// POST: Menambahkan data baru ke tabel
// ==========================================
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    
    // Insert data ke Supabase
    const { data, error } = await supabase
      .from("machine_press_summary")
      .insert([
        {
          machine_no: body.machine_no,
          product_name: body.product_name,
          production_date: body.production_date,
          user: body.user,
          demand_sales_qty: body.demand_sales_qty || 0,
          production_qty_target: body.production_qty_target || 0,
          production_qty_actual: body.production_qty_actual || 0,
          status: body.status,
        }
      ])
      .select(); // .select() digunakan agar mengembalikan data yang baru saja di-insert

    if (error) throw error;

    return NextResponse.json({ message: "Data berhasil ditambahkan", data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// PUT: Memperbarui data yang sudah ada (berdasarkan ID)
// ==========================================
export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    // Validasi apakah ID dikirimkan
    if (!id) {
      return NextResponse.json({ error: "ID diperlukan untuk melakukan update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("machine_press_summary")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({ message: "Data berhasil diperbarui", data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// DELETE: Menghapus data (berdasarkan ID)
// ==========================================
export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Mengambil ID dari URL parameter, contoh: /api/machine_press_summary?id=1
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID diperlukan untuk melakukan delete" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("machine_press_summary")
      .delete()
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({ message: "Data berhasil dihapus", data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}