import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

/**
 * 1. GET: Mengambil data
 * - Ambil semua: /api/machine_press/machine_1
 * - Filter per ID: /api/machine_press/machine_1?id=1
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const [rows]: any = await db.execute(
        'SELECT * FROM `17_fg_machine_trf2000` WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Data tidak ditemukan' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: rows[0] });
    }

    const [rows] = await db.execute(
      'SELECT * FROM `17_fg_machine_trf2000` ORDER BY id DESC'
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 2. PUT: Memperbarui data berdasarkan ID
 * Body JSON: { "id": 1, "is_fg": 1, "product_type": "Type A" }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, is_fg, product_type } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Parameter "id" wajib diisi' },
        { status: 400 }
      );
    }

    const [result]: any = await db.execute(
      `UPDATE \`17_fg_machine_trf2000\` 
       SET is_fg = ?, product_type = ?, timestamp = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [is_fg ?? null, product_type ?? null, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Data dengan ID tersebut tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Data berhasil diperbarui',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 3. DELETE: Menghapus data berdasarkan ID
 * URL Query: /api/machine_press/machine_1?id=1
 * atau Request Body: { "id": 1 }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {
        // Body kosong/bukan JSON
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Parameter "id" wajib diisi' },
        { status: 400 }
      );
    }

    const [result]: any = await db.execute(
      'DELETE FROM `17_fg_machine_trf2000` WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Data dengan ID tersebut tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Data ID ${id} berhasil dihapus`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}