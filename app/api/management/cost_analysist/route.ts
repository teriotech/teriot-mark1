import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase";

// Hindari cache GET di production
export const dynamic = "force-dynamic";

const TABLE = "cost_analysis";
const VIEW = "v_cost_analysis_summary";
const PAGE_SIZE = 1000; // batas default Supabase per request

type EntryType = "income" | "expense" | "allocation";
const ENTRY_TYPES: EntryType[] = ["income", "expense", "allocation"];

// Pemasukan = kategori tetap, Pengeluaran & Alokasi = nama bebas (mengikuti alokasi)
const INCOME_CATEGORIES = ["DOWN_PAYMENT", "TERMIN_PAYMENT", "FINAL_PAYMENT", "OTHER_INCOME"];
const ALLOC_GROUPS = ["RAW_MATERIAL", "TRANSPORT", "DIVIDEN", "OTHER"];
const MAX_CATEGORY_LEN = 80;

const SUMMARY_FIELDS = [
  "quotation_total",
  "bom_cost_total",
  "bom_count",
  "allocation_total",
  "total_income",
  "total_expense",
  "entry_count",
  "net_profit",
  "net_profit_projected",
  "income_remaining",
  "overrun",
  "cash_balance",
] as const;

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

const bool = (v: unknown): boolean => v === true || v === "true" || v === 1 || v === "1";

const errorResponse = (msg: string, error: any, status = 500) => {
  const detail = error?.message || String(error);
  const code = error?.code ?? null;
  console.error(`[cost_analysis] ${msg}:`, error);

  // Mapping error PostgreSQL -> pesan yang jelas
  if (code === "23505") {
    return NextResponse.json(
      { message: "Nama kategori alokasi sudah ada di project ini. Gunakan nama lain.", error: detail, code },
      { status: 409 }
    );
  }
  if (code === "23514") {
    return NextResponse.json(
      { message: "Data ditolak constraint database. Pastikan SQL migrasi alokasi fleksibel sudah dijalankan.", error: detail, code },
      { status: 400 }
    );
  }
  if (code === "42703" || code === "PGRST204") {
    return NextResponse.json(
      { message: "Kolom alloc_group / percent / is_auto belum ada. Jalankan SQL migrasi terlebih dahulu.", error: detail, code },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: `${msg}: ${detail}`, error: detail, code }, { status });
};

const normalizeSummary = (project_name: string, row: any) => {
  const out: Record<string, any> = { project_name };
  for (const f of SUMMARY_FIELDS) out[f] = Number(row?.[f] ?? 0) || 0;
  return out;
};

const buildRow = (body: any) => {
  const project_name = str(body?.project_name);
  if (!project_name) throw new ValidationError("project_name wajib diisi.");

  const entry_type = str(body?.entry_type) as EntryType | null;
  if (!entry_type || !ENTRY_TYPES.includes(entry_type)) {
    throw new ValidationError("entry_type harus income / expense / allocation.");
  }

  let category = str(body?.category);
  if (!category) throw new ValidationError("Kategori wajib diisi.");

  if (entry_type === "income") {
    category = category.toUpperCase();
    if (!INCOME_CATEGORIES.includes(category)) {
      throw new ValidationError(`Kategori pemasukan '${category}' tidak valid.`);
    }
  } else if (category.length > MAX_CATEGORY_LEN) {
    throw new ValidationError(`Nama kategori maksimal ${MAX_CATEGORY_LEN} karakter.`);
  }

  const amount = num(body?.amount, NaN);
  if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError("Amount harus lebih dari 0.");

  const entry_date = str(body?.entry_date);
  if (entry_date && Number.isNaN(Date.parse(entry_date))) throw new ValidationError("Format tanggal tidak valid.");

  const isAlloc = entry_type === "allocation";
  const group = str(body?.alloc_group)?.toUpperCase() ?? "";

  let percent: number | null = null;
  if (isAlloc && body?.percent !== undefined && body?.percent !== null && body?.percent !== "") {
    percent = num(body.percent, NaN);
    if (!Number.isFinite(percent) || percent < 0) throw new ValidationError("Persentase alokasi tidak valid.");
  }

  return {
    project_id: str(body?.project_id),
    project_name,
    entry_type,
    category,
    amount: Math.round(amount * 100) / 100,
    entry_date: (entry_date ?? new Date().toISOString()).slice(0, 10),
    reference_no: str(body?.reference_no),
    description: str(body?.description),
    alloc_group: isAlloc ? (ALLOC_GROUPS.includes(group) ? group : "OTHER") : null,
    percent,
    is_auto: isAlloc ? bool(body?.is_auto) : false,
  };
};

// ================= GET =================
/**
 * GET /api/management/cost_analysist                    -> list project + summary
 * GET /api/management/cost_analysist?project_name=XXX   -> entries + summary 1 project
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const project_name = str(searchParams.get("project_name"));

    // ---------- DETAIL 1 PROJECT ----------
    if (project_name) {
      const entries: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from(TABLE)
          .select("*")
          .eq("project_name", project_name)
          .order("entry_date", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        entries.push(...(data ?? []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const { data: sumRow, error: sumErr } = await supabase
        .from(VIEW)
        .select("*")
        .eq("project_name", project_name)
        .maybeSingle();
      if (sumErr) throw sumErr;

      const normalizedEntries = entries.map((e: any) => ({
        ...e,
        amount: Number(e.amount ?? 0) || 0,
        percent: e.percent === null || e.percent === undefined ? null : Number(e.percent),
        is_auto: !!e.is_auto,
        alloc_group: e.alloc_group ?? null,
      }));

      return NextResponse.json(
        { entries: normalizedEntries, summary: normalizeSummary(project_name, sumRow) },
        { status: 200 }
      );
    }

    // ---------- LIST PROJECT ----------
    const [projRes, sumRes] = await Promise.all([
      supabase
        .from("project_management")
        .select("id, project_name, client_company, status, current_stage")
        .order("created_at", { ascending: false }),
      supabase.from(VIEW).select("*"),
    ]);
    if (projRes.error) throw projRes.error;
    if (sumRes.error) throw sumRes.error;

    const sumMap = new Map<string, any>();
    (sumRes.data ?? []).forEach((r: any) => {
      const name = String(r.project_name ?? "").trim();
      if (name) sumMap.set(name, r);
    });

    const seen = new Set<string>();
    const projects: any[] = [];

    (projRes.data ?? []).forEach((p: any) => {
      const name = String(p.project_name ?? "").trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      projects.push({
        id: p.id ?? null,
        project_name: name,
        client_company: p.client_company ?? null,
        status: p.status ?? null,
        current_stage: p.current_stage ?? null,
        source: "project",
        summary: normalizeSummary(name, sumMap.get(name)),
      });
    });

    // Project yang hanya ada di create_bom / cost_analysis
    sumMap.forEach((row, name) => {
      if (seen.has(name)) return;
      projects.push({
        id: null,
        project_name: name,
        client_company: null,
        status: null,
        current_stage: null,
        source: "bom",
        summary: normalizeSummary(name, row),
      });
    });

    return NextResponse.json(
      { projects, categories: { income: INCOME_CATEGORIES, alloc_groups: ALLOC_GROUPS } },
      { status: 200 }
    );
  } catch (error: any) {
    return errorResponse("Gagal mengambil data cost analysis", error);
  }
}

// ================= POST =================
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ message: "Body request tidak valid (bukan JSON)." }, { status: 400 });

    const row = { ...buildRow(body), created_by: str(body?.created_by) };
    const { data, error } = await supabase.from(TABLE).insert(row).select().single();
    if (error) throw error;

    return NextResponse.json({ message: "Data berhasil disimpan", data }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ message: error.message, error: error.message }, { status: 400 });
    }
    return errorResponse("Terjadi kesalahan saat menyimpan data", error);
  }
}

// ================= PUT =================
export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) ?? {};

    const id = searchParams.get("id") || body.id;
    if (!id) return NextResponse.json({ message: "ID wajib disertakan untuk update." }, { status: 400 });

    const row = buildRow(body);
    const { data, error } = await supabase.from(TABLE).update(row).eq("id", id).select().maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { message: `Data dengan ID ${id} tidak ditemukan / tidak diizinkan (cek RLS).` },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Data berhasil diperbarui", data }, { status: 200 });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ message: error.message, error: error.message }, { status: 400 });
    }
    return errorResponse("Terjadi kesalahan saat memperbarui data", error);
  }
}

// ================= DELETE =================
/**
 * DELETE ?id=1  |  ?ids=1,2,3
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const idsParam = searchParams.get("ids");

    if (!id && !idsParam) {
      return NextResponse.json({ message: "Sertakan id atau ids untuk penghapusan." }, { status: 400 });
    }

    let q: any = supabase.from(TABLE).delete();
    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) return NextResponse.json({ message: "Parameter ids tidak valid." }, { status: 400 });
      q = q.in("id", ids);
    } else {
      q = q.eq("id", id);
    }

    const { data, error } = await q.select("id");
    if (error) throw error;

    const deleted = data?.length ?? 0;
    if (deleted === 0) {
      return NextResponse.json(
        { message: "Tidak ada data yang terhapus (tidak ditemukan atau diblokir RLS)." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: `${deleted} data berhasil dihapus.`, deleted }, { status: 200 });
  } catch (error: any) {
    return errorResponse("Terjadi kesalahan saat menghapus data", error);
  }
}