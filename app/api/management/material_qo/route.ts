    import { NextResponse } from "next/server";
    import { createServerSupabaseClient } from "@/app/lib/supabase";

    // ==========================================
    // 1. GET: Ambil Semua QO atau Spesifik Berdasarkan ID / qo_number
    // ==========================================
    export async function GET(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const qo_number = searchParams.get("qo_number");

        // Jika filter berdasarkan ID
        if (id) {
        const { data, error } = await supabase
            .from("material_qo")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ data }, { status: 200 });
        }

        // Jika filter berdasarkan QO Number
        if (qo_number) {
        const { data, error } = await supabase
            .from("material_qo")
            .select("*")
            .eq("qo_number", qo_number)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json({ data }, { status: 200 });
        }

        // Ambil Semua Data (default)
        const { data, error } = await supabase
        .from("material_qo")
        .select("*")
        .order("created_at", { ascending: false });

        if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json(
        { error: error.message || "Internal Server Error" },
        { status: 500 }
        );
    }
    }

    // ==========================================
    // 2. POST: Membuat Record Baru
    // ==========================================
    export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const body = await request.json();

        // Validasi input wajib
        if (!body.qo_number || !body.customer) {
        return NextResponse.json(
            { error: "Field 'qo_number' dan 'customer' wajib diisi" },
            { status: 400 }
        );
        }

        const { data, error } = await supabase
        .from("material_qo")
        .insert([
            {
            qo_number: body.qo_number,
            customer: body.customer,
            address: body.address,
            shipment: body.shipment,
            contact: body.contact,
            subject: body.subject,
            term_and_condition: body.term_and_condition,
            checked_by: body.checked_by,
            approved_by: body.approved_by,
            project_name: body.project_name,
            responsible_name_bast: body.responsible_name_bast,
            po_number_invoice: body.po_number_invoice,
            attn_invoice: body.attn_invoice,
            invoice_no: body.invoice_no,
            approved_by_invoice: body.approved_by_invoice,
            revision_invoice: body.revision_invoice ?? 0,
            payment_method_invoice: body.payment_method_invoice,
            },
        ])
        .select()
        .single();

        if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
        { message: "Material QO berhasil dibuat", data },
        { status: 201 }
        );
    } catch (error: any) {
        return NextResponse.json(
        { error: error.message || "Internal Server Error" },
        { status: 500 }
        );
    }
    }

    // ==========================================
    // 3. PUT: Memperbarui Record Berdasarkan ID
    // ==========================================
    export async function PUT(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
        return NextResponse.json(
            { error: "Query parameter 'id' diperlukan untuk memperbarui data" },
            { status: 400 }
        );
        }

        const body = await request.json();

        const { data, error } = await supabase
        .from("material_qo")
        .update({
            ...body,
            updated_at: new Date().toISOString(), // Update timestamp manual jika tidak menggunakan trigger DB
        })
        .eq("id", id)
        .select()
        .single();

        if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
        { message: "Material QO berhasil diperbarui", data },
        { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json(
        { error: error.message || "Internal Server Error" },
        { status: 500 }
        );
    }
    }

    // ==========================================
    // 4. DELETE: Menghapus Record Berdasarkan ID
    // ==========================================
    export async function DELETE(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
        return NextResponse.json(
            { error: "Query parameter 'id' diperlukan untuk menghapus data" },
            { status: 400 }
        );
        }

        const { data, error } = await supabase
        .from("material_qo")
        .delete()
        .eq("id", id)
        .select()
        .single();

        if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
        { message: "Material QO berhasil dihapus", data },
        { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json(
        { error: error.message || "Internal Server Error" },
        { status: 500 }
        );
    }
    }