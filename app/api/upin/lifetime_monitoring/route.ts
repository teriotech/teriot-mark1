import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

// ==========================================
// 1. GET: Mengambil Semua Data / Single Data
// ==========================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const [rows]: any = await db.query(
        'SELECT * FROM lifetime_monitoring WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { message: 'Data tidak ditemukan' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: rows[0] }, { status: 200 });
    }

    const [rows]: any = await db.query(
      'SELECT * FROM lifetime_monitoring ORDER BY id DESC'
    );

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Gagal mengambil data', error: error.message },
      { status: 500 }
    );
  }
}

// ==========================================
// 2. POST: Menambah Data Baru
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      product_type,
      main_machine,
      part_machine,
      ongoing_qty = 0,
      lifetime_qty = 0,
      last_reset_qty = 0, 
      submit_at,          
      created_at,
      user,
      user_teknisi,
      remark,
    } = body;

    const currentDate = created_at || new Date().toISOString().split('T')[0];
    const defaultSubmitDate = submit_at || currentDate;

    const query = `
      INSERT INTO lifetime_monitoring 
      (product_type, main_machine, part_machine, ongoing_qty, lifetime_qty, last_reset_qty, submit_at, created_at, updated_at, user, user_teknisi, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      product_type || null,
      main_machine || null,
      part_machine || null,
      ongoing_qty,
      lifetime_qty,
      last_reset_qty,
      defaultSubmitDate,
      currentDate,
      currentDate,
      user || null,
      user_teknisi || null,
      remark || null,
    ];

    const [result]: any = await db.query(query, values);

    return NextResponse.json(
      {
        message: 'Data berhasil ditambahkan',
        insertedId: result.insertId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Gagal menambahkan data', error: error.message },
      { status: 500 }
    );
  }
}

// ==========================================
// 3. PUT: Memperbarui Data Berdasarkan ID
// ==========================================
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      product_type,
      main_machine,
      part_machine,
      ongoing_qty,
      lifetime_qty,
      last_reset_qty, 
      submit_at,      
      updated_at,
      user,
      user_teknisi,
      remark,
    } = body;

    if (!id) {
      return NextResponse.json(
        { message: 'ID wajib diikutsertakan untuk pembaruan data' },
        { status: 400 }
      );
    }

    const currentDate = updated_at || new Date().toISOString().split('T')[0];

    const query = `
      UPDATE lifetime_monitoring 
      SET product_type = ?, 
          main_machine = ?, 
          part_machine = ?, 
          ongoing_qty = ?, 
          lifetime_qty = ?, 
          last_reset_qty = ?, 
          submit_at = ?, 
          updated_at = ?, 
          user = ?, 
          user_teknisi = ?, 
          remark = ?
      WHERE id = ?
    `;

    const values = [
      product_type || null,
      main_machine || null,
      part_machine || null,
      ongoing_qty ?? 0,
      lifetime_qty ?? 0,
      last_reset_qty ?? null, 
      submit_at || null,      
      currentDate,
      user || null,
      user_teknisi || null,
      remark || null,
      id,
    ];

    const [result]: any = await db.query(query, values);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: 'Data tidak ditemukan atau tidak ada perubahan' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Data berhasil diperbarui' },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Gagal memperbarui data', error: error.message },
      { status: 500 }
    );
  }
}

// ==========================================
// 4. DELETE: Menghapus Data Berdasarkan ID
// ==========================================
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'ID diperlukan pada query parameter' },
        { status: 400 }
      );
    }

    const [result]: any = await db.query(
      'DELETE FROM lifetime_monitoring WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Data berhasil dihapus' },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Gagal menghapus data', error: error.message },
      { status: 500 }
    );
  }
}