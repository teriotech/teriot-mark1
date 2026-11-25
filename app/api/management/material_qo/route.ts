import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase";

const INVOICE_BUCKET = process.env.SUPABASE_INVOICE_BUCKET || "invoice-pdfs";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_HISTORY_FILES = 1000;

// QO/PO/BAST memakai bucket dan endpoint terpisah. Seluruh konstanta serta
// handler invoice di atas/bawah tetap dipakai persis seperti sebelumnya.
const QO_DOCUMENT_BUCKET = process.env.SUPABASE_QO_DOCUMENT_BUCKET || "qo-po-bast-pdfs";
const QO_DOCUMENT_TYPES = new Set(["qo", "po", "bast"]);

type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type InvoiceSnapshot = {
  version?: number;
  invoiceNo?: string;
  invoiceRevision?: string | number;
  documentHtml?: string;
  [key: string]: unknown;
};

type QoDocumentType = "qo" | "po" | "bast";
type QoDocumentSnapshot = {
  version?: number;
  html?: string;
  form?: Record<string, unknown>;
  [key: string]: unknown;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error || "Internal Server Error");

const safePathSegment = (value: string, fallback = "unknown") => {
  const clean = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return clean || fallback;
};

const toRevision = (value: FormDataEntryValue | null) => {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const invoiceFolder = (qoNumber: string) => `invoices/${safePathSegment(qoNumber, "qo")}`;

const parseRevisionFromName = (name: string) => {
  const match = /^rev-(\d+)_/.exec(name);
  return match ? Number.parseInt(match[1], 10) : 0;
};

async function ensureInvoiceBucket(supabase: SupabaseServerClient) {
  const { data, error } = await supabase.storage.getBucket(INVOICE_BUCKET);
  if (data && !error) return;

  const created = await supabase.storage.createBucket(INVOICE_BUCKET, {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf", "application/json"],
  });

  if (created.error) {
    // Handle a race where another request created the bucket first.
    const retry = await supabase.storage.getBucket(INVOICE_BUCKET);
    if (retry.error || !retry.data) throw created.error;
  }
}

async function getMaterialQoByNumber(supabase: SupabaseServerClient, qoNumber: string) {
  const { data, error } = await supabase
    .from("material_qo")
    .select("*")
    .eq("qo_number", qoNumber)
    .single();

  if (error || !data) throw new Error(error?.message || `Data QO "${qoNumber}" tidak ditemukan.`);
  return data;
}

async function readSnapshot(supabase: SupabaseServerClient, jsonPath: string): Promise<InvoiceSnapshot | null> {
  const { data, error } = await supabase.storage.from(INVOICE_BUCKET).download(jsonPath);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as InvoiceSnapshot;
  } catch {
    return null;
  }
}

async function listInvoiceHistory(supabase: SupabaseServerClient, qoNumber: string) {
  await ensureInvoiceBucket(supabase);
  const folder = invoiceFolder(qoNumber);
  const { data: files, error } = await supabase.storage.from(INVOICE_BUCKET).list(folder, {
    limit: MAX_HISTORY_FILES,
    offset: 0,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw error;

  const pdfFiles = (files || []).filter((file) => file.name.toLowerCase().endsWith(".pdf"));
  const history = await Promise.all(
    pdfFiles.map(async (file) => {
      const pdfPath = `${folder}/${file.name}`;
      const jsonPath = pdfPath.replace(/\.pdf$/i, ".json");
      const [signedResult, snapshot] = await Promise.all([
        supabase.storage.from(INVOICE_BUCKET).createSignedUrl(pdfPath, SIGNED_URL_TTL_SECONDS),
        readSnapshot(supabase, jsonPath),
      ]);

      const savedAt =
        String(snapshot?.savedAt || "") ||
        String(file.created_at || file.updated_at || new Date(0).toISOString());
      const revision = Number(snapshot?.invoiceRevision ?? parseRevisionFromName(file.name)) || 0;

      return {
        pdfPath,
        jsonPath,
        fileName: file.name,
        invoiceNo: String(snapshot?.invoiceNo || ""),
        revision,
        savedAt,
        size: Number(file.metadata?.size || 0),
        signedUrl: signedResult.data?.signedUrl || null,
        sourceRevision:
          snapshot?.sourceRevision === undefined || snapshot?.sourceRevision === null
            ? null
            : Number(snapshot.sourceRevision),
      };
    })
  );

  return history.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

async function saveInvoicePdf(request: Request) {
  const supabase = await createServerSupabaseClient();
  const form = await request.formData();
  const action = String(form.get("action") || "");
  const qoNumber = String(form.get("qo_number") || "").trim();
  const invoiceNo = String(form.get("invoice_no") || "").trim();
  const pdf = form.get("pdf");

  if (action !== "save_invoice_pdf") {
    return NextResponse.json({ error: "Action multipart tidak didukung." }, { status: 400 });
  }
  if (!qoNumber || !invoiceNo) {
    return NextResponse.json({ error: "qo_number dan invoice_no wajib diisi." }, { status: 400 });
  }
  if (!(pdf instanceof File) || pdf.type !== "application/pdf" || pdf.size === 0) {
    return NextResponse.json({ error: "File PDF invoice tidak valid." }, { status: 400 });
  }
  if (pdf.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran PDF melebihi batas 20 MB." }, { status: 413 });
  }

  let snapshot: InvoiceSnapshot = {};
  try {
    snapshot = JSON.parse(String(form.get("editor_state") || "{}")) as InvoiceSnapshot;
  } catch {
    return NextResponse.json({ error: "editor_state harus berupa JSON yang valid." }, { status: 400 });
  }
  if (typeof snapshot.documentHtml !== "string" || !snapshot.documentHtml.trim()) {
    return NextResponse.json({ error: "Snapshot HTML invoice wajib tersedia." }, { status: 400 });
  }
  if (snapshot.documentHtml.length > 2_000_000) {
    return NextResponse.json({ error: "Snapshot HTML invoice melebihi batas 2 MB." }, { status: 413 });
  }

  const materialQo = await getMaterialQoByNumber(supabase, qoNumber);
  await ensureInvoiceBucket(supabase);

  const folder = invoiceFolder(qoNumber);
  const { data: existing, error: listError } = await supabase.storage.from(INVOICE_BUCKET).list(folder, {
    limit: MAX_HISTORY_FILES,
    offset: 0,
    sortBy: { column: "name", order: "desc" },
  });
  if (listError) throw listError;

  const existingRevisions = (existing || [])
    .filter((file) => file.name.toLowerCase().endsWith(".pdf"))
    .map((file) => parseRevisionFromName(file.name));
  const requestedRevision = toRevision(form.get("revision"));
  const maxRevision = existingRevisions.length ? Math.max(...existingRevisions) : -1;
  const effectiveRevision = existingRevisions.includes(requestedRevision)
    ? maxRevision + 1
    : requestedRevision;

  const now = new Date();
  const savedAt = now.toISOString();
  const stamp = savedAt.replace(/[-:.TZ]/g, "").slice(0, 14);
  const unique = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const baseName = `rev-${String(effectiveRevision).padStart(4, "0")}_${stamp}_${unique}_${safePathSegment(invoiceNo, "invoice")}`;
  const pdfPath = `${folder}/${baseName}.pdf`;
  const jsonPath = `${folder}/${baseName}.json`;

  const normalizedSnapshot: InvoiceSnapshot = {
    ...snapshot,
    version: 1,
    qoNumber,
    invoiceNo,
    invoiceRevision: effectiveRevision,
    sourceRevision:
      form.get("source_revision") === null ? null : toRevision(form.get("source_revision")),
    savedAt,
    pdfPath,
    jsonPath,
  };

  const uploadPdf = await supabase.storage.from(INVOICE_BUCKET).upload(pdfPath, pdf, {
    contentType: "application/pdf",
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadPdf.error) throw uploadPdf.error;

  const snapshotBytes = new TextEncoder().encode(JSON.stringify(normalizedSnapshot));
  const uploadJson = await supabase.storage.from(INVOICE_BUCKET).upload(jsonPath, snapshotBytes, {
    contentType: "application/json",
    cacheControl: "0",
    upsert: false,
  });
  if (uploadJson.error) {
    await supabase.storage.from(INVOICE_BUCKET).remove([pdfPath]);
    throw uploadJson.error;
  }

  const revisionForDb = effectiveRevision;
  const { error: updateError } = await supabase
    .from("material_qo")
    .update({
      invoice_no: invoiceNo,
      attn_invoice: snapshot.invoiceAttn ?? materialQo.attn_invoice,
      revision_invoice: revisionForDb,
      payment_method_invoice: snapshot.invoicePaymentMethod ?? materialQo.payment_method_invoice,
      approved_by_invoice: snapshot.invoiceApprovedBy ?? materialQo.approved_by_invoice,
      updated_at: savedAt,
    })
    .eq("id", materialQo.id);

  if (updateError) {
    await supabase.storage.from(INVOICE_BUCKET).remove([pdfPath, jsonPath]);
    throw updateError;
  }

  const signedResult = await supabase.storage
    .from(INVOICE_BUCKET)
    .createSignedUrl(pdfPath, SIGNED_URL_TTL_SECONDS);
  if (signedResult.error) throw signedResult.error;

  return NextResponse.json(
    {
      message: `Invoice revision ${effectiveRevision} berhasil disimpan.`,
      data: {
        pdfPath,
        jsonPath,
        fileName: `${baseName}.pdf`,
        invoiceNo,
        revision: effectiveRevision,
        savedAt,
        size: pdf.size,
        signedUrl: signedResult.data.signedUrl,
      },
    },
    { status: 201 }
  );
}

async function deleteInvoiceRevision(
  supabase: SupabaseServerClient,
  qoNumber: string,
  pdfPath: string,
  jsonPath: string
) {
  if (!qoNumber) {
    return NextResponse.json({ error: "qo_number diperlukan untuk menghapus revision invoice." }, { status: 400 });
  }

  const folder = invoiceFolder(qoNumber);
  const allowedPrefix = `${folder}/`;
  const pdfName = pdfPath.startsWith(allowedPrefix) ? pdfPath.slice(allowedPrefix.length) : "";
  const jsonName = jsonPath.startsWith(allowedPrefix) ? jsonPath.slice(allowedPrefix.length) : "";
  const expectedJsonPath = pdfPath.replace(/\.pdf$/i, ".json");

  // Hanya izinkan sepasang file revision di folder QO yang diminta. Tidak boleh
  // ada nested path, traversal, atau JSON milik revision lain.
  if (
    !pdfName ||
    !jsonName ||
    pdfName.includes("/") ||
    jsonName.includes("/") ||
    pdfName.includes("..") ||
    jsonName.includes("..") ||
    !pdfName.toLowerCase().endsWith(".pdf") ||
    !jsonName.toLowerCase().endsWith(".json") ||
    jsonPath !== expectedJsonPath
  ) {
    return NextResponse.json({ error: "Path revision invoice tidak valid." }, { status: 400 });
  }

  const materialQo = await getMaterialQoByNumber(supabase, qoNumber);
  await ensureInvoiceBucket(supabase);

  const { data: folderFiles, error: listError } = await supabase.storage.from(INVOICE_BUCKET).list(folder, {
    limit: MAX_HISTORY_FILES,
    offset: 0,
    sortBy: { column: "name", order: "desc" },
  });
  if (listError) throw listError;

  const fileNames = new Set((folderFiles || []).map((file) => file.name));
  if (!fileNames.has(pdfName)) {
    return NextResponse.json({ error: "PDF revision yang dipilih tidak ditemukan." }, { status: 404 });
  }

  const pathsToDelete = [pdfPath];
  if (fileNames.has(jsonName)) pathsToDelete.push(jsonPath);
  const { error: removeError } = await supabase.storage.from(INVOICE_BUCKET).remove(pathsToDelete);
  if (removeError) throw removeError;

  const { data: filesAfterDelete, error: verifyError } = await supabase.storage.from(INVOICE_BUCKET).list(folder, {
    limit: MAX_HISTORY_FILES,
    offset: 0,
    sortBy: { column: "name", order: "desc" },
  });
  if (verifyError) throw verifyError;
  const remainingNames = new Set((filesAfterDelete || []).map((file) => file.name));
  if (remainingNames.has(pdfName) || remainingNames.has(jsonName)) {
    throw new Error("Supabase belum menghapus seluruh pasangan file revision.");
  }

  // Revision lain tidak diubah/direnumber. Hanya pointer revision terbaru pada
  // material_qo yang diselaraskan dengan history yang masih tersisa.
  const remainingHistory = await listInvoiceHistory(supabase, qoNumber);
  const latestRevision = remainingHistory.length
    ? Math.max(...remainingHistory.map((item) => Number(item.revision) || 0))
    : 0;
  const { error: updateError } = await supabase
    .from("material_qo")
    .update({ revision_invoice: latestRevision, updated_at: new Date().toISOString() })
    .eq("id", materialQo.id);

  return NextResponse.json(
    {
      message: updateError
        ? "Revision PDF dan snapshot berhasil dihapus, tetapi pointer revision pada material_qo belum diperbarui."
        : "Revision PDF dan snapshot editable berhasil dihapus.",
      data: {
        deleted: pathsToDelete,
        latestRevision,
        history: remainingHistory,
        databaseWarning: updateError?.message || null,
      },
    },
    { status: 200 }
  );
}


/* ========================================================================== */
/* QO / PO / BAST PDF STORAGE — TERPISAH DARI SELURUH LOGIC INVOICE           */
/* ========================================================================== */

const qoDocumentFolder = (qoNumber: string, documentType: QoDocumentType) =>
  `qo-documents/${safePathSegment(qoNumber, "qo")}/${documentType}`;

const parseQoDocumentRevision = (name: string) => {
  const match = /^rev-(\d+)_/.exec(name);
  return match ? Number.parseInt(match[1], 10) : 0;
};

const getQoDocumentRequest = (searchParams: URLSearchParams) => {
  const action = String(searchParams.get("storage_action") || "").toLowerCase();
  const qoNumber = searchParams.get("qo_number")?.trim() || "";
  const rawType = String(searchParams.get("document_type") || "").toLowerCase();
  if (!qoNumber) throw new Error("qo_number wajib diisi untuk operasi PDF QO/PO/BAST.");
  if (!QO_DOCUMENT_TYPES.has(rawType)) throw new Error("document_type QO/PO/BAST tidak valid.");
  return { action, qoNumber, documentType: rawType as QoDocumentType };
};

async function ensureQoDocumentBucket(supabase: SupabaseServerClient) {
  const { data, error } = await supabase.storage.getBucket(QO_DOCUMENT_BUCKET);
  if (data && !error) return;

  const created = await supabase.storage.createBucket(QO_DOCUMENT_BUCKET, {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf", "application/json"],
  });
  if (created.error) {
    const retry = await supabase.storage.getBucket(QO_DOCUMENT_BUCKET);
    if (retry.error || !retry.data) throw created.error;
  }
}

async function readQoDocumentSnapshot(
  supabase: SupabaseServerClient,
  jsonPath: string
): Promise<QoDocumentSnapshot | null> {
  const { data, error } = await supabase.storage.from(QO_DOCUMENT_BUCKET).download(jsonPath);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as QoDocumentSnapshot;
  } catch {
    return null;
  }
}

async function listQoDocumentHistory(
  supabase: SupabaseServerClient,
  qoNumber: string,
  documentType: QoDocumentType
) {
  await ensureQoDocumentBucket(supabase);
  const folder = qoDocumentFolder(qoNumber, documentType);
  const { data: files, error } = await supabase.storage.from(QO_DOCUMENT_BUCKET).list(folder, {
    limit: MAX_HISTORY_FILES,
    offset: 0,
    sortBy: { column: "name", order: "desc" },
  });
  if (error) throw error;

  return (files || [])
    .filter((file) => file.name.toLowerCase().endsWith(".pdf"))
    .map((file) => ({
      revision: parseQoDocumentRevision(file.name),
      path: `${folder}/${file.name}`,
      fileName: file.name,
      createdAt: String(file.created_at || file.updated_at || new Date(0).toISOString()),
      size: Number(file.metadata?.size || 0),
    }))
    .sort(
      (a, b) =>
        b.revision - a.revision || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

function validateQoDocumentPdfPath(
  path: string,
  qoNumber: string,
  documentType: QoDocumentType
) {
  const folder = qoDocumentFolder(qoNumber, documentType);
  const allowedPrefix = `${folder}/`;
  const name = path.startsWith(allowedPrefix) ? path.slice(allowedPrefix.length) : "";
  if (
    !name ||
    name.includes("/") ||
    name.includes("..") ||
    !/^rev-\d+_.*\.pdf$/i.test(name)
  ) {
    throw new Error("Path revision PDF QO/PO/BAST tidak valid.");
  }
  return { folder, name, jsonPath: path.replace(/\.pdf$/i, ".json") };
}

async function handleQoDocumentGet(
  supabase: SupabaseServerClient,
  searchParams: URLSearchParams
) {
  const { action, qoNumber, documentType } = getQoDocumentRequest(searchParams);

  if (action === "history") {
    const history = await listQoDocumentHistory(supabase, qoNumber, documentType);
    return NextResponse.json({ data: history }, { status: 200 });
  }

  const path = searchParams.get("path") || "";
  validateQoDocumentPdfPath(path, qoNumber, documentType);
  await ensureQoDocumentBucket(supabase);

  if (action === "open") {
    const signed = await supabase.storage
      .from(QO_DOCUMENT_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signed.error) throw signed.error;
    return NextResponse.json({ data: { url: signed.data.signedUrl } }, { status: 200 });
  }

  if (action === "snapshot") {
    const snapshot = await readQoDocumentSnapshot(supabase, path.replace(/\.pdf$/i, ".json"));
    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot editable QO/PO/BAST tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ data: snapshot }, { status: 200 });
  }

  return NextResponse.json({ error: "storage_action GET QO/PO/BAST tidak didukung." }, { status: 400 });
}

async function saveQoDocumentPdf(request: Request, searchParams: URLSearchParams) {
  const supabase = await createServerSupabaseClient();
  const { action, qoNumber, documentType } = getQoDocumentRequest(searchParams);
  if (action !== "save_revision") {
    return NextResponse.json({ error: "storage_action POST QO/PO/BAST tidak didukung." }, { status: 400 });
  }

  const form = await request.formData();
  const pdf = form.get("pdf");
  const requestedName = String(form.get("file_name") || `${documentType}-${qoNumber}.pdf`);
  if (!(pdf instanceof File) || pdf.type !== "application/pdf" || pdf.size === 0) {
    return NextResponse.json({ error: "File PDF QO/PO/BAST tidak valid." }, { status: 400 });
  }
  if (pdf.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran PDF QO/PO/BAST melebihi batas 20 MB." }, { status: 413 });
  }

  let snapshot: QoDocumentSnapshot = {};
  try {
    snapshot = JSON.parse(String(form.get("snapshot") || "{}")) as QoDocumentSnapshot;
  } catch {
    return NextResponse.json({ error: "Snapshot QO/PO/BAST harus berupa JSON valid." }, { status: 400 });
  }
  if (typeof snapshot.html !== "string" || !snapshot.html.trim()) {
    return NextResponse.json({ error: "Snapshot HTML editable QO/PO/BAST wajib tersedia." }, { status: 400 });
  }
  if (snapshot.html.length > 2_000_000) {
    return NextResponse.json({ error: "Snapshot HTML QO/PO/BAST melebihi batas 2 MB." }, { status: 413 });
  }
  if (/<\s*(script|iframe|object|embed|link|meta|base)\b|\son\w+\s*=|javascript\s*:/i.test(snapshot.html)) {
    return NextResponse.json({ error: "Snapshot mengandung HTML aktif yang tidak diizinkan." }, { status: 400 });
  }

  // QO/PO/BAST hanya boleh disimpan untuk QO yang benar-benar ada.
  await getMaterialQoByNumber(supabase, qoNumber);
  await ensureQoDocumentBucket(supabase);
  const history = await listQoDocumentHistory(supabase, qoNumber, documentType);
  const revision = history.reduce((max, item) => Math.max(max, item.revision), 0) + 1;
  const savedAt = new Date().toISOString();
  const stamp = savedAt.replace(/[-:.TZ]/g, "").slice(0, 14);
  const unique = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const cleanFileName = safePathSegment(requestedName.replace(/\.pdf$/i, ""), documentType);
  const baseName = `rev-${String(revision).padStart(4, "0")}_${stamp}_${unique}_${cleanFileName}`;
  const folder = qoDocumentFolder(qoNumber, documentType);
  const pdfPath = `${folder}/${baseName}.pdf`;
  const jsonPath = `${folder}/${baseName}.json`;

  const uploadPdf = await supabase.storage.from(QO_DOCUMENT_BUCKET).upload(pdfPath, pdf, {
    contentType: "application/pdf",
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadPdf.error) throw uploadPdf.error;

  const normalizedSnapshot: QoDocumentSnapshot = {
    ...snapshot,
    version: 1,
    qoNumber,
    documentType,
    revision,
    savedAt,
    pdfPath,
    jsonPath,
  };
  const snapshotBytes = new TextEncoder().encode(JSON.stringify(normalizedSnapshot));
  const uploadJson = await supabase.storage.from(QO_DOCUMENT_BUCKET).upload(jsonPath, snapshotBytes, {
    contentType: "application/json",
    cacheControl: "0",
    upsert: false,
  });
  if (uploadJson.error) {
    await supabase.storage.from(QO_DOCUMENT_BUCKET).remove([pdfPath]);
    throw uploadJson.error;
  }

  return NextResponse.json(
    {
      message: `PDF ${documentType.toUpperCase()} revision ${revision} berhasil disimpan.`,
      data: {
        revision,
        path: pdfPath,
        fileName: `${baseName}.pdf`,
        createdAt: savedAt,
        size: pdf.size,
      },
    },
    { status: 201 }
  );
}

async function deleteQoDocumentRevision(
  supabase: SupabaseServerClient,
  searchParams: URLSearchParams
) {
  const { action, qoNumber, documentType } = getQoDocumentRequest(searchParams);
  if (action !== "delete_revision") {
    return NextResponse.json({ error: "storage_action DELETE QO/PO/BAST tidak didukung." }, { status: 400 });
  }

  const pdfPath = searchParams.get("path") || "";
  const { folder, name, jsonPath } = validateQoDocumentPdfPath(pdfPath, qoNumber, documentType);
  const jsonName = jsonPath.slice(`${folder}/`.length);
  await ensureQoDocumentBucket(supabase);

  const { data: files, error: listError } = await supabase.storage.from(QO_DOCUMENT_BUCKET).list(folder, {
    limit: MAX_HISTORY_FILES,
    offset: 0,
    sortBy: { column: "name", order: "desc" },
  });
  if (listError) throw listError;
  const names = new Set((files || []).map((file) => file.name));
  if (!names.has(name)) {
    return NextResponse.json({ error: "PDF revision QO/PO/BAST tidak ditemukan." }, { status: 404 });
  }

  const paths = [pdfPath];
  if (names.has(jsonName)) paths.push(jsonPath);
  const removed = await supabase.storage.from(QO_DOCUMENT_BUCKET).remove(paths);
  if (removed.error) throw removed.error;

  const history = await listQoDocumentHistory(supabase, qoNumber, documentType);
  return NextResponse.json(
    { message: "PDF dan snapshot editable QO/PO/BAST berhasil dihapus.", data: history },
    { status: 200 }
  );
}

// GET: material_qo, invoice history, atau editable snapshot.
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const qoNumber = searchParams.get("qo_number")?.trim() || "";
    const historyRequested = searchParams.get("invoice_history") === "1";
    const snapshotPath = searchParams.get("invoice_snapshot") || "";

    // Routing khusus QO/PO/BAST. Tidak memakai atau mengubah endpoint invoice.
    if (searchParams.get("storage_action")) {
      return await handleQoDocumentGet(supabase, searchParams);
    }

    if (historyRequested) {
      if (!qoNumber) {
        return NextResponse.json({ error: "qo_number diperlukan untuk invoice_history." }, { status: 400 });
      }
      await getMaterialQoByNumber(supabase, qoNumber);
      const history = await listInvoiceHistory(supabase, qoNumber);
      return NextResponse.json({ data: history }, { status: 200 });
    }

    if (snapshotPath) {
      if (!qoNumber) {
        return NextResponse.json({ error: "qo_number diperlukan untuk invoice_snapshot." }, { status: 400 });
      }
      const allowedPrefix = `${invoiceFolder(qoNumber)}/`;
      if (!snapshotPath.startsWith(allowedPrefix) || !snapshotPath.toLowerCase().endsWith(".json")) {
        return NextResponse.json({ error: "Path snapshot tidak valid." }, { status: 400 });
      }
      await ensureInvoiceBucket(supabase);
      const snapshot = await readSnapshot(supabase, snapshotPath);
      if (!snapshot) {
        return NextResponse.json({ error: "Snapshot invoice tidak ditemukan atau rusak." }, { status: 404 });
      }
      return NextResponse.json({ data: snapshot }, { status: 200 });
    }

    if (id) {
      const { data, error } = await supabase.from("material_qo").select("*").eq("id", id).single();
      if (error) return NextResponse.json({ error: error.message }, { status: 404 });
      return NextResponse.json({ data }, { status: 200 });
    }

    if (qoNumber) {
      const { data, error } = await supabase
        .from("material_qo")
        .select("*")
        .eq("qo_number", qoNumber)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 404 });
      return NextResponse.json({ data }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("material_qo")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

// POST: upload revision PDF (multipart) atau membuat material_qo (JSON).
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Multipart QO/PO/BAST dikenali dari query storage_action. Multipart lain
    // tetap masuk ke saveInvoicePdf dengan perilaku invoice yang sama.
    if (searchParams.get("storage_action")) return await saveQoDocumentPdf(request, searchParams);

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) return await saveInvoicePdf(request);

    const supabase = await createServerSupabaseClient();
    const body = await request.json();
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

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ message: "Material QO berhasil dibuat", data }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

// PUT: memperbarui material_qo berdasarkan ID.
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
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ message: "Material QO berhasil diperbarui", data }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

// DELETE: menghapus satu revision invoice, atau material_qo berdasarkan ID.
export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    // Delete history QO/PO/BAST terpisah; delete invoice tetap memakai flag lama.
    if (searchParams.get("storage_action")) {
      return await deleteQoDocumentRevision(supabase, searchParams);
    }

    const deleteInvoice = searchParams.get("delete_invoice_revision") === "1";
    if (deleteInvoice) {
      return await deleteInvoiceRevision(
        supabase,
        searchParams.get("qo_number")?.trim() || "",
        searchParams.get("pdf_path") || "",
        searchParams.get("json_path") || ""
      );
    }

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

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ message: "Material QO berhasil dihapus", data }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
