import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

// Import object bucket dari lokasi yang Anda berikan
import { bucket } from '@/app/lib/bucket'; 

const imageColumns = [
  'bucket_picture1', 'bucket_picture2', 'bucket_picture3', 'bucket_picture4', 'bucket_picture5',
  'bucket_picture1_after', 'bucket_picture2_after', 'bucket_picture3_after', 'bucket_picture4_after', 'bucket_picture5_after'
];

// Helper untuk mengubah string kosong ("") menjadi null agar MySQL tidak error
const sanitize = (val: any) => (val === "" ? null : val);

// Fungsi helper untuk menghapus file dari MinIO
async function cleanupMinioFiles(files: (string | null)[]) {
  for (const file of files) {
    if (file) {
      try {
        // Memanggil fungsi delete dari object bucket
        await bucket.delete(file);
        console.log(`Berhasil menghapus file dari MinIO: ${file}`);
      } catch (err) {
        console.error(`Gagal menghapus file ${file} dari MinIO:`, err);
      }
    }
  }
}

// GET: Mengambil riwayat lifetime monitoring (semua / spesifik per id / per machine_product_id)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const machineProductId = searchParams.get('machine_product_id');

    let query = 'SELECT * FROM lifetime_monitoring_history';
    const params: any[] = [];
    const conditions: string[] = [];

    if (id) {
      conditions.push('id = ?');
      params.push(id);
    }

    if (machineProductId) {
      conditions.push('machine_product_id = ?');
      params.push(machineProductId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query<RowDataPacket[]>(query, params);

    return NextResponse.json({
      success: true,
      data: id ? rows[0] || null : rows,
    });
  } catch (error: any) {
    console.error('Error fetching lifetime monitoring history:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengambil data' },
      { status: 500 }
    );
  }
}

// POST: Menambahkan catatan riwayat baru
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      machine_product_id,
      user_teknisi,
      last_reset_qty = 0,
      category_broken = null,
      remark = null,
      // Pictures Before
      bucket_picture1 = null,
      bucket_picture2 = null,
      bucket_picture3 = null,
      bucket_picture4 = null,
      bucket_picture5 = null,
      // Pictures After
      bucket_picture1_after = null,
      bucket_picture2_after = null,
      bucket_picture3_after = null,
      bucket_picture4_after = null,
      bucket_picture5_after = null,
    } = body;

    // Validasi field wajib
    if (!machine_product_id || !user_teknisi) {
      return NextResponse.json(
        {
          success: false,
          message: 'machine_product_id dan user_teknisi wajib diisi',
        },
        { status: 400 }
      );
    }

    const insertQuery = `
      INSERT INTO lifetime_monitoring_history (
        machine_product_id,
        user_teknisi,
        last_reset_qty,
        category_broken,
        remark,
        bucket_picture1,
        bucket_picture2,
        bucket_picture3,
        bucket_picture4,
        bucket_picture5,
        bucket_picture1_after,
        bucket_picture2_after,
        bucket_picture3_after,
        bucket_picture4_after,
        bucket_picture5_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Gunakan fungsi sanitize() untuk mencegah error MySQL karena string kosong ""
    const values = [
      machine_product_id,
      user_teknisi,
      Number(last_reset_qty) || 0,
      sanitize(category_broken),
      sanitize(remark),
      sanitize(bucket_picture1),
      sanitize(bucket_picture2),
      sanitize(bucket_picture3),
      sanitize(bucket_picture4),
      sanitize(bucket_picture5),
      sanitize(bucket_picture1_after),
      sanitize(bucket_picture2_after),
      sanitize(bucket_picture3_after),
      sanitize(bucket_picture4_after),
      sanitize(bucket_picture5_after),
    ];

    const [result] = await db.execute<ResultSetHeader>(insertQuery, values);

    return NextResponse.json(
      {
        success: true,
        message: 'Data riwayat berhasil ditambahkan',
        insertedId: result.insertId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error inserting lifetime monitoring history:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menambahkan data' },
      { status: 500 }
    );
  }
}

// PUT: Memperbarui data riwayat berdasarkan ID & Hapus file lama jika diganti
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json();

    const id = searchParams.get('id') || body.id;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID wajib disertakan untuk memperbarui data' },
        { status: 400 }
      );
    }

    // 1. Ambil data lama untuk membandingkan nama file gambar
    const [existingRows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM lifetime_monitoring_history WHERE id = ?',
      [id]
    );

    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }
    const existingData = existingRows[0];

    // 2. Siapkan field yang akan diupdate dan cari file yang harus dihapus
    const allowedFields = [
      'machine_product_id', 'user_teknisi', 'last_reset_qty', 'category_broken', 'remark',
      ...imageColumns
    ];

    const updateFields: string[] = [];
    const values: any[] = [];
    const filesToDelete: string[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Sanitize input untuk PUT juga
        const val = sanitize(body[field]);
        
        updateFields.push(`${field} = ?`);
        values.push(field === 'last_reset_qty' ? (Number(val) || 0) : val);

        // Jika field adalah gambar, dan nilainya berubah (diganti gambar baru atau dihapus/null)
        if (imageColumns.includes(field)) {
          if (existingData[field] && existingData[field] !== val) {
            filesToDelete.push(existingData[field]);
          }
        }
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada data yang dikirim untuk diperbarui' },
        { status: 400 }
      );
    }

    values.push(id);

    // 3. Eksekusi Update Database
    const updateQuery = `
      UPDATE lifetime_monitoring_history
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    const [result] = await db.execute<ResultSetHeader>(updateQuery, values);

    // 4. Jika update berhasil, hapus file fisik lama di MinIO
    if (result.affectedRows > 0 && filesToDelete.length > 0) {
      await cleanupMinioFiles(filesToDelete);
    }

    return NextResponse.json({
      success: true,
      message: 'Data riwayat berhasil diperbarui',
    });
  } catch (error: any) {
    console.error('Error updating lifetime monitoring history:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memperbarui data' },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus data riwayat berdasarkan ID & Hapus semua file terkait
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID wajib disertakan untuk menghapus data' },
        { status: 400 }
      );
    }

    // 1. Ambil data lama untuk mendapatkan nama-nama file gambar
    const [existingRows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM lifetime_monitoring_history WHERE id = ?',
      [id]
    );

    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }
    const existingData = existingRows[0];

    // 2. Eksekusi Delete Database
    const deleteQuery = 'DELETE FROM lifetime_monitoring_history WHERE id = ?';
    const [result] = await db.execute<ResultSetHeader>(deleteQuery, [id]);

    // 3. Jika delete berhasil, hapus semua file fisik di MinIO
    if (result.affectedRows > 0) {
      const filesToDelete = imageColumns.map(col => existingData[col]).filter(Boolean);
      if (filesToDelete.length > 0) {
        await cleanupMinioFiles(filesToDelete);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data riwayat dan file terkait berhasil dihapus',
    });
  } catch (error: any) {
    console.error('Error deleting lifetime monitoring history:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menghapus data' },
      { status: 500 }
    );
  }
}