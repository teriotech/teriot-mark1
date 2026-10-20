"use client";

import React, { useState, useEffect, useCallback, useMemo, useDeferredValue, useRef } from "react";
import ExcelJS from "exceljs";
import type { Workbook, Worksheet, CellValue, CellFormulaValue } from "exceljs";

/* =========================================================================
 * TYPES
 * ========================================================================= */
interface MasterMaterial {
  id: number;
  part_number: string;
  description: string;
  technical_specification: string;
  qty: number;
  unit: string;
  margin: number;
  price: number;
  price_margin?: number;
  supplier: string;
  markup: number;
  date_updated?: string;
}

type MaterialPayload = Omit<MasterMaterial, "id" | "price_margin" | "date_updated">;

interface MaterialFormData {
  part_number: string;
  description: string;
  technical_specification: string;
  qty: number; // hidden di UI, default 1
  unit: string;
  margin: number | "";
  price: number | "";
  supplier: string;
  markup: number | "";
}

type ModalTab = "single" | "mass";

interface RawRow {
  rowNumber: number;
  values: Partial<Record<TemplateKey, string | number>>;
}

interface UploadRow {
  rowNumber: number;
  action: "INSERT" | "UPDATE";
  existingId?: number;
  autoPN: boolean;
  errors: string[];
  data: MaterialPayload;
}

interface RowResult {
  status: "success" | "failed";
  message?: string;
}

/* =========================================================================
 * CONSTANTS
 * ========================================================================= */
const API_URL = "/api/management/master_material";
const UPLOAD_CONCURRENCY = 5;
const TABLE_COLS = 12;
const TEMPLATE_FORMULA_ROWS = 300; // jumlah baris yang diberi formula markup di template

// Template kolom = struktur kolom database (dipakai untuk Export & Mass Upload)
const TEMPLATE_COLUMNS = [
  { key: "part_number", width: 18, required: false, note: "Isi 'Automatic' atau kosongkan → auto-generate berurutan berdasarkan description (contoh: Hardware & Computing → HAR-001, HAR-002, ...). Jika diisi & sudah ada di database (mode upsert) → data di-update." },
  { key: "description", width: 32, required: true, note: "Nama / kategori material (WAJIB, minimal 3 karakter). 3 huruf pertama dipakai sebagai prefix Part Number." },
  { key: "technical_specification", width: 46, required: false, note: "Spesifikasi teknis material." },
  { key: "qty", width: 8, required: false, note: "Default 1 jika kosong." },
  { key: "unit", width: 10, required: false, note: "Pcs, Box, Meter, dll. Default Pcs jika kosong." },
  { key: "price", width: 16, required: false, note: "Harga dasar (angka saja, contoh: 2576000)." },
  { key: "margin", width: 10, required: false, note: "Margin dalam % (contoh: 0 atau 15)." },
  { key: "markup", width: 16, required: false, note: "Formula otomatis: price + (price x margin%). Saat upload nilai ini dihitung ulang oleh sistem." },
  { key: "supplier", width: 40, required: false, note: "Nama toko atau URL link." },
] as const;

type TemplateKey = (typeof TEMPLATE_COLUMNS)[number]["key"];
const TEMPLATE_KEYS: readonly string[] = TEMPLATE_COLUMNS.map((c) => c.key);

// Contoh baris di template mass upload
const TEMPLATE_SAMPLE_ROWS: Array<Omit<Record<TemplateKey, string | number>, "markup"> & { price: number; margin: number }> = [
  {
    part_number: "Automatic",
    description: "Hardware & Computing",
    technical_specification: "Corsair 5000D Airflow Tempered Glass (White)",
    qty: 1,
    unit: "Pcs",
    price: 2576000,
    margin: 0,
    supplier: "",
  },
];

// Nilai part_number yang dianggap "generate otomatis"
const AUTO_PN_TOKENS = new Set(["", "-", "AUTO", "AUTOMATIC", "AUTOGENERATE", "AUTO-GENERATE", "AUTO GENERATE", "OTOMATIS"]);
const isAutoPN = (v: unknown) => AUTO_PN_TOKENS.has(String(v ?? "").trim().toUpperCase());

const HEADER_ALIASES: Record<string, TemplateKey> = {
  part_no: "part_number",
  partnumber: "part_number",
  pn: "part_number",
  desc: "description",
  tech_spec: "technical_specification",
  technical_spec: "technical_specification",
  spec: "technical_specification",
  quantity: "qty",
  uom: "unit",
  price_rp: "price",
  base_price: "price",
  base_price_rp: "price",
  margin_percent: "margin",
  markup_rp: "markup",
  vendor: "supplier",
  supplier_url: "supplier",
};

const InitialFormState: MaterialFormData = {
  part_number: "",
  description: "",
  technical_specification: "",
  qty: 1,
  unit: "Pcs",
  margin: "",
  price: "",
  supplier: "",
  markup: "",
};

/* =========================================================================
 * STYLE TOKENS
 * ========================================================================= */
const inputCls =
  "w-full p-2 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";
const labelCls = "text-slate-600 text-[10px] uppercase font-bold";
const cardCls = "bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4";
const cardTitleCls = "text-teal-600 font-bold uppercase tracking-wider border-b border-slate-200 pb-2 mb-3";
const btnPrimary =
  "flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold font-mono text-xs uppercase px-4 py-2.5 rounded transition-colors shadow-md shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed";
const btnOutline =
  "flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold font-mono text-xs uppercase px-4 py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const btnIconExcel =
  "flex items-center justify-center w-full sm:w-10 h-10 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/* =========================================================================
 * HELPERS
 * ========================================================================= */
const idrFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const fmtIDR = (n: number) => idrFormatter.format(Number(n) || 0);

const calcMarkup = (price: number, margin: number) => Math.round((price + (price * margin) / 100) * 100) / 100;

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

// Parse angka yang aman untuk format ID (1.500.000 / 0,00) & EN (1,500,000 / 0.00)
const toNum = (v: unknown, fallback = 0): number => {
  if (v === "" || v === null || v === undefined) return fallback;
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  let s = String(v).trim().replace(/[^\d.,-]/g, "");
  if ((s.match(/,/g) || []).length > 1) s = s.replace(/,/g, "");
  if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.indexOf(",") > s.indexOf(".") ? s.replace(".", "").replace(",", ".") : s.replace(",", "");
  } else {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
};

// Normalisasi data API (PostgreSQL NUMERIC sering dikirim sebagai string)
const normalizeMaterial = (m: MasterMaterial): MasterMaterial => ({
  ...m,
  part_number: m.part_number ?? "",
  description: m.description ?? "",
  technical_specification: m.technical_specification ?? "",
  supplier: m.supplier ?? "",
  unit: m.unit ?? "",
  qty: toNum(m.qty, 1),
  price: toNum(m.price),
  margin: toNum(m.margin),
  markup: toNum(m.markup),
  price_margin: m.price_margin !== undefined && m.price_margin !== null ? toNum(m.price_margin) : undefined,
});

// Auto Generate Part Number: PREFIX(3 huruf dari description)-NNN (berurutan)
const nextPartNumber = (desc: string, existing: Iterable<string>): string => {
  const d = desc.trim();
  if (d.length < 3) return "";
  const prefix = d.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  let max = 0;
  for (const pn of existing) {
    const up = pn.toUpperCase();
    if (up.startsWith(`${prefix}-`)) {
      const n = parseInt(up.slice(prefix.length + 1), 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
};

const resolveHeader = (raw: string): TemplateKey | null => {
  const n = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (TEMPLATE_KEYS.includes(n)) return n as TemplateKey;
  return HEADER_ALIASES[n] ?? null;
};

// Ambil nilai cell ExcelJS (support formula, rich text, hyperlink)
const cellToValue = (v: CellValue): string | number => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  const o = v as unknown as Record<string, unknown>;
  if (o.result !== undefined && o.result !== null) return cellToValue(o.result as CellValue);
  if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join("");
  if (typeof o.hyperlink === "string") return o.hyperlink;
  if (typeof o.text === "string") return o.text;
  return "";
};

const toTemplateRow = (m: MasterMaterial): Record<TemplateKey, string | number> => ({
  part_number: m.part_number,
  description: m.description,
  technical_specification: m.technical_specification,
  qty: m.qty,
  unit: m.unit,
  price: m.price,
  margin: m.margin,
  markup: m.markup,
  supplier: m.supplier,
});

const addTemplateSheet = (wb: Workbook, name: string): Worksheet => {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = TEMPLATE_COLUMNS.map((c) => ({ header: c.key, key: c.key, width: c.width }));
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getColumn("price").numFmt = "#,##0";
  ws.getColumn("markup").numFmt = "#,##0";
  ws.getColumn("margin").numFmt = "0.00";
  ws.getColumn("technical_specification").alignment = { wrapText: true, vertical: "top" };
  return ws;
};

const downloadWorkbook = async (wb: Workbook, filename: string) => {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const dateStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

// Build workbook template mass upload (berisi contoh row + formula markup)
const buildMassUploadTemplate = (): Workbook => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Master Material Management";
  const ws = addTemplateSheet(wb, "Template");

  const P = ws.getColumn("price").letter;
  const M = ws.getColumn("margin").letter;
  const markupFormula = (r: number, result?: number) =>
    ({ formula: `IF(${P}${r}="","",${P}${r}+(${P}${r}*N(${M}${r})/100))`, result }) as CellFormulaValue;

  // Contoh baris
  TEMPLATE_SAMPLE_ROWS.forEach((s) => {
    const row = ws.addRow(s);
    row.getCell("markup").value = markupFormula(row.number, calcMarkup(s.price, s.margin));
    row.getCell("part_number").font = { italic: true, color: { argb: "FF64748B" } };
  });

  // Formula markup untuk baris kosong berikutnya
  const start = ws.rowCount + 1;
  for (let r = start; r < start + TEMPLATE_FORMULA_ROWS; r++) {
    ws.getRow(r).getCell("markup").value = markupFormula(r);
  }

  // Sheet petunjuk
  const info = wb.addWorksheet("Petunjuk");
  info.columns = [
    { header: "Kolom", key: "col", width: 26 },
    { header: "Wajib", key: "req", width: 8 },
    { header: "Keterangan", key: "note", width: 110 },
  ];
  info.getRow(1).font = { bold: true };
  TEMPLATE_COLUMNS.forEach((c) => info.addRow({ col: c.key, req: c.required ? "Ya" : "Tidak", note: c.note }));
  info.addRow({});
  info.addRow({
    col: "Catatan",
    note: "Isi data di sheet 'Template' (sheet pertama). Jangan ubah nama header. Ganti/hapus baris contoh sebelum upload. Hasil Export Excel juga bisa langsung di-upload ulang.",
  });
  return wb;
};

const parseExcelFile = async (file: File): Promise<RawRow[]> => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Sheet tidak ditemukan di file.");

  const headerMap: Record<number, TemplateKey> = {};
  ws.getRow(1).eachCell((cell, col) => {
    const key = resolveHeader(String(cellToValue(cell.value)));
    if (key) headerMap[col] = key;
  });
  if (!Object.values(headerMap).includes("description")) {
    throw new Error("Kolom 'description' tidak ditemukan. Gunakan template yang disediakan (Download Template).");
  }

  const rows: RawRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: RawRow["values"] = {};
    let hasValue = false;
    row.eachCell((cell, col) => {
      const key = headerMap[col];
      if (!key) return;
      const v = cellToValue(cell.value);
      // markup (formula) tidak dihitung sebagai data → baris kosong berformula diabaikan
      if (v !== "" && key !== "markup") hasValue = true;
      values[key] = typeof v === "string" ? v.trim() : v;
    });
    if (hasValue) rows.push({ rowNumber, values });
  });
  return rows;
};

// Concurrency pool untuk mass upload (lebih cepat, tidak membanjiri server)
async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

const saveMaterial = async (payload: MaterialPayload, id?: number | null) => {
  const isEdit = id !== undefined && id !== null;
  const res = await fetch(isEdit ? `${API_URL}?id=${id}` : API_URL, {
    method: isEdit ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: { message?: string } = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Gagal menyimpan (HTTP ${res.status})`);
  return json;
};

/* =========================================================================
 * SMALL COMPONENTS
 * ========================================================================= */
const ICONS = {
  material: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  plus: "M12 4v16m8-8H4",
  download: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3",
  upload: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 8l5-5 5 5M12 3v12",
  template: "M9 13h6M9 17h6M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z",
  excel: "M3 9h18M3 15h18M9 3v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z",
  external: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",
} as const;

const Icon = ({ d, className = "w-4 h-4", sw = 2 }: { d: string; className?: string; sw?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d={d} />
  </svg>
);

const SupplierCell = ({ value }: { value: string }) => {
  const v = (value || "").trim();
  if (!v) return <>-</>;
  if (/^https?:\/\//i.test(v)) {
    try {
      const urlObj = new URL(v);
      const segs = urlObj.pathname.split("/").filter(Boolean);
      const shortCode = (segs[segs.length - 1] || "link").replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "link";
      return (
        <a
          href={v}
          target="_blank"
          rel="noopener noreferrer"
          title={v}
          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 underline underline-offset-2 font-mono text-[11px]"
        >
          <span>{`Link [${shortCode}]`}</span>
          <Icon d={ICONS.external} className="w-3 h-3" />
        </a>
      );
    } catch {
      return <span title={v}>{v.length > 10 ? `${v.substring(0, 10)}...` : v}</span>;
    }
  }
  return <span title={v}>{v.length > 15 ? `${v.substring(0, 15)}...` : v}</span>;
};

interface ComboInputProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  emptyText: string;
  className?: string;
}

// Searchable dropdown reusable (Description & Unit)
const ComboInput = ({ label, value, options, onChange, placeholder, required, emptyText, className = "" }: ComboInputProps) => {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = value.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 50);
  }, [options, value]);

  return (
    <div className={`space-y-1 relative ${className}`}>
      <label className={labelCls}>
        {label}
        {required && " *"}
      </label>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        className={inputCls}
      />
      {open && (
        <ul className="absolute z-30 w-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded shadow-xl">
          {filtered.length > 0 ? (
            filtered.map((o) => (
              <li
                key={o}
                onMouseDown={(e) => {
                  e.preventDefault(); // cegah blur sebelum klik
                  onChange(o);
                  setOpen(false);
                }}
                className="px-3 py-2 hover:bg-teal-50 cursor-pointer text-slate-700 transition-colors"
              >
                {o}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-slate-500 italic">{emptyText}</li>
          )}
        </ul>
      )}
    </div>
  );
};

const CHIP_TONES = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
} as const;

const Chip = ({ label, value, tone }: { label: string; value: number; tone: keyof typeof CHIP_TONES }) => (
  <span className={`px-2 py-1 border rounded text-[10px] font-bold uppercase ${CHIP_TONES[tone]}`}>
    {label}: {value}
  </span>
);

/* =========================================================================
 * PAGE
 * ========================================================================= */
export default function MasterMaterialPage() {
  const [materials, setMaterials] = useState<MasterMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const deferredSearch = useDeferredValue(search);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDownloadingTpl, setIsDownloadingTpl] = useState<boolean>(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<ModalTab>("single");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MaterialFormData>(InitialFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Mass Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFileName, setUploadFileName] = useState<string>("");
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [snapshot, setSnapshot] = useState<MasterMaterial[]>([]);
  const [upsertMode, setUpsertMode] = useState<boolean>(true);
  const [uploadResults, setUploadResults] = useState<Record<number, RowResult>>({});
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");

  // Delete State
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  /* ---------------- FETCH (sekali load, search di client = lebih cepat) ---------------- */
  const fetchMaterials = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, { signal, cache: "no-store" });
      const json: { data?: MasterMaterial[]; message?: string } = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal memuat data");
      setMaterials((json.data ?? []).map(normalizeMaterial));
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") console.error("Failed to fetch materials:", err);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchMaterials(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchMaterials]);

  /* ---------------- DERIVED DATA ---------------- */
  const filteredMaterials = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter((m) =>
      [m.part_number, m.description, m.technical_specification, m.supplier].some((f) => (f || "").toLowerCase().includes(q))
    );
  }, [materials, deferredSearch]);

  const partNumbers = useMemo(() => materials.map((m) => m.part_number), [materials]);
  const uniqueDescriptions = useMemo(() => Array.from(new Set(materials.map((m) => m.description).filter(Boolean))), [materials]);
  const uniqueUnits = useMemo(() => Array.from(new Set(["Pcs", ...materials.map((m) => m.unit).filter(Boolean)])), [materials]);

  /* ---------------- SINGLE FORM HANDLERS ---------------- */
  const updateForm = useCallback((patch: Partial<MaterialFormData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...patch };
      if ("price" in patch || "margin" in patch) {
        next.markup = calcMarkup(Number(next.price) || 0, Number(next.margin) || 0);
      }
      return next;
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const parsed = type === "number" ? (value === "" ? "" : parseFloat(value)) : value;
    updateForm({ [name]: parsed } as Partial<MaterialFormData>);
  };

  const handleDescriptionChange = (value: string) => {
    const patch: Partial<MaterialFormData> = { description: value };
    if (editingId === null) {
      const pn = nextPartNumber(value, partNumbers);
      if (pn) patch.part_number = pn;
    }
    updateForm(patch);
  };

  /* ---------------- MODAL CONTROL ---------------- */
  const resetMassUpload = () => {
    setRawRows([]);
    setSnapshot([]);
    setUploadFileName("");
    setUploadResults({});
    setUploadProgress(null);
    setUploadError("");
  };

  const openAddModal = (tab: ModalTab = "single") => {
    setEditingId(null);
    setFormData(InitialFormState);
    setErrorMessage("");
    resetMassUpload();
    setModalTab(tab);
    setIsModalOpen(true);
  };

  const openEditModal = (m: MasterMaterial) => {
    setEditingId(m.id);
    setFormData({
      part_number: m.part_number,
      description: m.description,
      technical_specification: m.technical_specification,
      qty: m.qty || 1,
      unit: m.unit || "Pcs",
      margin: m.margin ?? "",
      price: m.price ?? "",
      supplier: m.supplier,
      markup: m.markup ?? "",
    });
    setErrorMessage("");
    setModalTab("single");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    resetMassUpload();
  };

  /* ---------------- SINGLE SUBMIT ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const pn = formData.part_number.trim();
    const duplicate = materials.some((m) => m.part_number.toUpperCase() === pn.toUpperCase() && m.id !== editingId);
    if (duplicate) {
      setErrorMessage(`Part Number "${pn}" sudah digunakan.`);
      return;
    }

    const price = Number(formData.price) || 0;
    const margin = Number(formData.margin) || 0;
    const payload: MaterialPayload = {
      part_number: pn,
      description: formData.description.trim(),
      technical_specification: formData.technical_specification.trim(),
      qty: formData.qty || 1,
      unit: formData.unit.trim() || "Pcs",
      price,
      margin,
      markup: calcMarkup(price, margin),
      supplier: formData.supplier.trim(),
    };

    setIsSubmitting(true);
    try {
      await saveMaterial(payload, editingId);
      setIsModalOpen(false);
      await fetchMaterials();
    } catch (err) {
      setErrorMessage(errMsg(err) || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------------- EXPORT & TEMPLATE ---------------- */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Master Material Management";
      const ws = addTemplateSheet(wb, "Master Material");
      filteredMaterials.forEach((m) => ws.addRow(toTemplateRow(m)));
      await downloadWorkbook(wb, `master_material_${dateStamp()}.xlsx`);
    } catch (err) {
      alert(`Export gagal: ${errMsg(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Export template mass upload (icon button header & tombol di modal)
  const handleDownloadTemplate = async () => {
    setIsDownloadingTpl(true);
    try {
      await downloadWorkbook(buildMassUploadTemplate(), `template_mass_upload_material_${dateStamp()}.xlsx`);
    } catch (err) {
      alert(`Download template gagal: ${errMsg(err)}`);
    } finally {
      setIsDownloadingTpl(false);
    }
  };

  /* ---------------- MASS UPLOAD ---------------- */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // agar file yang sama bisa dipilih ulang
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      setUploadError("Format file harus .xlsx (Excel 2007+).");
      return;
    }
    setIsParsing(true);
    setUploadError("");
    setUploadResults({});
    setUploadProgress(null);
    try {
      const rows = await parseExcelFile(file);
      if (rows.length === 0) throw new Error("File tidak berisi data.");
      setSnapshot(materials);
      setRawRows(rows);
      setUploadFileName(file.name);
    } catch (err) {
      setRawRows([]);
      setUploadFileName("");
      setUploadError(errMsg(err));
    } finally {
      setIsParsing(false);
    }
  };

  // Validasi + mapping row (pakai snapshot DB saat file dipilih)
  const previewRows = useMemo<UploadRow[]>(() => {
    if (rawRows.length === 0) return [];
    const existing = new Map(snapshot.map((m) => [m.part_number.trim().toUpperCase(), m.id]));

    // Kumpulkan PN yang sudah terpakai (DB + PN manual di file) agar auto-generate tidak bentrok
    const usedPN = new Set<string>(existing.keys());
    rawRows.forEach((r) => {
      const raw = String(r.values.part_number ?? "").trim();
      if (!isAutoPN(raw)) usedPN.add(raw.toUpperCase());
    });
    const seenInFile = new Set<string>();

    return rawRows.map((r) => {
      const v = r.values;
      const errors: string[] = [];
      const description = String(v.description ?? "").trim();
      const rawPN = String(v.part_number ?? "").trim();
      const autoPN = isAutoPN(rawPN);
      let pn = autoPN ? "" : rawPN;

      if (!description) errors.push("Description wajib diisi");
      if (autoPN && description) {
        // Generate berurutan sesuai urutan baris & description (HAR-001, HAR-002, ...)
        pn = nextPartNumber(description, usedPN);
        if (pn) usedPN.add(pn.toUpperCase());
        else errors.push("Description < 3 karakter, Part Number tidak bisa di-generate");
      }

      const key = pn.toUpperCase();
      if (key) {
        if (seenInFile.has(key)) errors.push("Part Number duplikat di file");
        seenInFile.add(key);
      }

      const existingId = key ? existing.get(key) : undefined;
      if (existingId !== undefined && !upsertMode) errors.push("Part Number sudah ada di database");

      const price = toNum(v.price);
      const margin = toNum(v.margin);
      if (price < 0) errors.push("Price tidak boleh negatif");

      return {
        rowNumber: r.rowNumber,
        existingId,
        autoPN,
        action: existingId !== undefined ? "UPDATE" : "INSERT",
        errors,
        data: {
          part_number: pn,
          description,
          technical_specification: String(v.technical_specification ?? "").trim(),
          qty: toNum(v.qty, 1) || 1,
          unit: String(v.unit ?? "").trim() || "Pcs",
          price,
          margin,
          markup: calcMarkup(price, margin),
          supplier: String(v.supplier ?? "").trim(),
        },
      };
    });
  }, [rawRows, snapshot, upsertMode]);

  const uploadStats = useMemo(() => {
    const s = { total: previewRows.length, valid: 0, invalid: 0, insert: 0, update: 0, auto: 0, success: 0, failed: 0 };
    for (const r of previewRows) {
      if (r.errors.length) {
        s.invalid++;
        continue;
      }
      s.valid++;
      if (r.autoPN) s.auto++;
      if (r.action === "INSERT") s.insert++;
      else s.update++;
      const st = uploadResults[r.rowNumber]?.status;
      if (st === "success") s.success++;
      else if (st === "failed") s.failed++;
    }
    return { ...s, pending: s.valid - s.success };
  }, [previewRows, uploadResults]);

  const handleMassUpload = async () => {
    const rows = previewRows.filter((r) => r.errors.length === 0 && uploadResults[r.rowNumber]?.status !== "success");
    if (rows.length === 0) return;

    setIsSubmitting(true);
    setUploadError("");
    let done = 0;
    setUploadProgress({ done, total: rows.length });

    await runPool(rows, UPLOAD_CONCURRENCY, async (row) => {
      try {
        await saveMaterial(row.data, row.existingId);
        setUploadResults((p) => ({ ...p, [row.rowNumber]: { status: "success" } }));
      } catch (err) {
        setUploadResults((p) => ({ ...p, [row.rowNumber]: { status: "failed", message: errMsg(err) } }));
      } finally {
        done++;
        setUploadProgress({ done, total: rows.length });
      }
    });

    setIsSubmitting(false);
    await fetchMaterials();
  };

  /* ---------------- DELETE ---------------- */
  const deletingMaterial = useMemo(() => materials.find((m) => m.id === deletingId), [materials, deletingId]);

  const handleDelete = async () => {
    if (deletingId === null) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}?id=${deletingId}`, { method: "DELETE" });
      if (!res.ok) {
        const json: { message?: string } = await res.json().catch(() => ({}));
        throw new Error(json.message || "Gagal menghapus material");
      }
      setDeletingId(null);
      await fetchMaterials();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setIsDeleting(false);
    }
  };

  /* =========================================================================
   * RENDER
   * ========================================================================= */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500/30 p-3 md:p-6 flex flex-col gap-4 md:gap-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <header className="bg-white border border-slate-200 rounded shadow-sm px-4 md:px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-teal-50 border border-teal-200 rounded">
            <Icon d={ICONS.material} className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-sm md:text-md font-bold tracking-wider text-slate-800 uppercase">Master Material Management</h1>
            <p className="text-[11px] md:text-xs font-mono text-slate-500 mt-0.5">Kelola inventaris suku cadang dan material produksi</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
          {/* ICON: Export Template Mass Upload */}
          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTpl}
            className={btnIconExcel}
            title="Download Template Mass Upload (Excel)"
            aria-label="Download Template Mass Upload"
          >
            {isDownloadingTpl ? (
              <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon d={ICONS.excel} className="w-5 h-5" />
            )}
            <span className="sm:hidden ml-2 font-mono text-xs font-bold uppercase">Template Upload</span>
          </button>
          <button onClick={handleExport} disabled={isExporting || loading || filteredMaterials.length === 0} className={btnOutline}>
            <Icon d={ICONS.download} />
            {isExporting ? "Exporting..." : "Export Excel"}
          </button>
          <button onClick={() => openAddModal("mass")} className={btnOutline}>
            <Icon d={ICONS.upload} />
            Mass Upload
          </button>
          <button onClick={() => openAddModal("single")} className={btnPrimary}>
            <Icon d={ICONS.plus} sw={3} />
            Add Material
          </button>
        </div>
      </header>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white border border-slate-200 rounded shadow-sm p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon d={ICONS.search} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Part Number / Description / Spec / Supplier..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded font-mono text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>
        <div className="text-xs font-mono text-slate-500 w-full sm:w-auto text-right">
          Total Items: <span className="text-teal-600 font-bold">{filteredMaterials.length}</span>
          {deferredSearch && <span className="text-slate-400"> / {materials.length}</span>}
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="md:hidden bg-slate-50/80 px-4 py-1.5 border-b border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>← Geser tabel ke kanan/kiri →</span>
          <span className="text-teal-600 font-semibold">Mobile Scroll</span>
        </div>

        <div className="overflow-x-auto touch-pan-x w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase font-bold text-slate-600 tracking-wider">
                <th className="p-3">Part Number</th>
                <th className="p-3">Description</th>
                <th className="p-3">Tech Spec</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3">Unit</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-right">Margin (%)</th>
                <th className="p-3 text-right">Price Margin</th>
                <th className="p-3 text-right">Markup</th>
                <th className="p-3 max-w-[120px]">Supplier</th>
                <th className="p-3">Updated</th>
                <th className="p-3 text-center sticky right-0 bg-slate-50/95 backdrop-blur-md border-l border-slate-200 z-10 w-[90px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={TABLE_COLS} className="text-center py-8 text-slate-500">Loading material data...</td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLS} className="text-center py-8 text-slate-500">Data material tidak ditemukan.</td>
                </tr>
              ) : (
                filteredMaterials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-teal-600 whitespace-nowrap">{mat.part_number}</td>
                    <td className="p-3 text-slate-800 min-w-[140px] max-w-[200px] truncate" title={mat.description}>{mat.description || "-"}</td>
                    <td className="p-3 text-slate-500 text-[11px] max-w-[180px] truncate" title={mat.technical_specification}>{mat.technical_specification || "-"}</td>
                    <td className="p-3 text-right text-slate-800">{mat.qty}</td>
                    <td className="p-3 text-slate-600">{mat.unit || "-"}</td>
                    <td className="p-3 text-right text-slate-800 whitespace-nowrap">{fmtIDR(mat.price)}</td>
                    <td className="p-3 text-right text-amber-600">{mat.margin}%</td>
                    <td className="p-3 text-right text-teal-600 font-semibold whitespace-nowrap">
                      {fmtIDR(mat.price_margin ?? calcMarkup(mat.price, mat.margin))}
                    </td>
                    <td className="p-3 text-right text-slate-700 whitespace-nowrap">{fmtIDR(mat.markup)}</td>
                    <td className="p-3 text-slate-700 whitespace-nowrap max-w-[120px] truncate">
                      <SupplierCell value={mat.supplier} />
                    </td>
                    <td className="p-3 text-[10px] text-slate-500 whitespace-nowrap">
                      {mat.date_updated ? new Date(mat.date_updated).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="p-3 text-center sticky right-0 bg-white/95 backdrop-blur-md border-l border-slate-200 z-10">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(mat)}
                          className="p-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded hover:bg-amber-100 transition-colors"
                          title="Edit Material"
                        >
                          <Icon d={ICONS.edit} />
                        </button>
                        <button
                          onClick={() => setDeletingId(mat.id)}
                          className="p-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded hover:bg-rose-100 transition-colors"
                          title="Delete Material"
                        >
                          <Icon d={ICONS.trash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ADD / EDIT / MASS UPLOAD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`bg-white border border-slate-200 rounded-lg shadow-2xl w-full max-h-[90vh] overflow-y-auto transition-all ${
              modalTab === "mass" ? "max-w-6xl" : "max-w-3xl"
            }`}
          >
            {/* Modal Header + Tabs */}
            <div className="px-6 pt-4 pb-3 border-b border-slate-200 sticky top-0 bg-white z-20 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold font-mono text-teal-600 uppercase tracking-wider">
                  {editingId !== null ? "Edit Material" : modalTab === "single" ? "Add New Material" : "Mass Upload Material"}
                </h3>
                <button onClick={closeModal} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 font-mono text-lg disabled:opacity-40">
                  ✕
                </button>
              </div>

              {editingId === null && (
                <div className="flex gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg font-mono">
                  {(["single", "mass"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setModalTab(t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold uppercase text-[11px] transition-colors disabled:cursor-not-allowed ${
                        modalTab === t ? "bg-white text-teal-700 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Icon d={t === "single" ? ICONS.plus : ICONS.upload} className="w-3.5 h-3.5" />
                      {t === "single" ? "Single Input" : "Mass Upload (Excel)"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ================= SINGLE INPUT ================= */}
            {modalTab === "single" && (
              <form onSubmit={handleSubmit} className="p-6 space-y-6 font-mono text-xs">
                {errorMessage && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded">{errorMessage}</div>}

                {/* CARD 1: Material Details */}
                <div className={cardCls}>
                  <h4 className={cardTitleCls}>1. Material Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ComboInput
                      label="Description"
                      required
                      value={formData.description}
                      options={uniqueDescriptions}
                      onChange={handleDescriptionChange}
                      placeholder="Ketik atau pilih description..."
                      emptyText="Tekan simpan untuk membuat description baru"
                      className="md:col-span-2"
                    />

                    <div className="space-y-1">
                      <label className={labelCls}>Part Number *</label>
                      <input
                        type="text"
                        name="part_number"
                        required
                        value={formData.part_number}
                        onChange={handleInputChange}
                        placeholder="Auto-generated..."
                        className={`${inputCls} !text-teal-600 font-bold`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={labelCls}>Supplier / URL</label>
                      <input
                        type="text"
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleInputChange}
                        placeholder="Nama Toko atau Paste URL Link..."
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className={labelCls}>Technical Specification</label>
                      <textarea
                        name="technical_specification"
                        rows={2}
                        value={formData.technical_specification}
                        onChange={handleInputChange}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* CARD 2: Inventory (Unit saja, Qty default 1) */}
                <div className={cardCls}>
                  <h4 className={cardTitleCls}>2. Inventory</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <ComboInput
                      label="Unit"
                      value={formData.unit}
                      options={uniqueUnits}
                      onChange={(v) => updateForm({ unit: v })}
                      placeholder="Pcs, Box, Meter, dll."
                      emptyText="Ketik untuk membuat unit baru"
                    />
                    <p className="text-[10px] text-slate-500 pb-2">
                      Qty otomatis: <span className="font-bold text-teal-600">{formData.qty || 1}</span> {formData.unit || "Pcs"}
                    </p>
                  </div>
                </div>

                {/* CARD 3: Pricing */}
                <div className={cardCls}>
                  <h4 className={cardTitleCls}>3. Pricing & Commercials</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className={labelCls}>Base Price (Rp)</label>
                      <input
                        type="number"
                        min={0}
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="Masukkan harga..."
                        className={inputCls}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Margin (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="margin"
                        value={formData.margin}
                        onChange={handleInputChange}
                        placeholder="0"
                        className={inputCls}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Markup (Rp) - Auto</label>
                      <input
                        type="text"
                        readOnly
                        value={formData.markup === "" ? "" : fmtIDR(Number(formData.markup))}
                        placeholder="Otomatis..."
                        className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-teal-700 font-bold focus:outline-none cursor-not-allowed"
                        title="Dihitung otomatis: Base Price + (Base Price x Margin %)"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white py-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded transition-colors disabled:opacity-50">
                    {isSubmitting ? "Saving..." : "Save Material"}
                  </button>
                </div>
              </form>
            )}

            {/* ================= MASS UPLOAD ================= */}
            {modalTab === "mass" && editingId === null && (
              <div className="p-6 space-y-5 font-mono text-xs">
                {uploadError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded">{uploadError}</div>}

                {/* STEP 1 */}
                <div className={cardCls}>
                  <h4 className={cardTitleCls}>1. Template & File Excel</h4>
                  <div className="flex flex-col md:flex-row gap-3">
                    <button type="button" onClick={handleDownloadTemplate} disabled={isDownloadingTpl} className={btnOutline}>
                      <Icon d={ICONS.excel} />
                      {isDownloadingTpl ? "Preparing..." : "Download Template"}
                    </button>
                    <label
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded font-bold transition-colors ${
                        isSubmitting || isParsing
                          ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "border-teal-300 bg-white text-teal-700 hover:bg-teal-50 cursor-pointer"
                      }`}
                    >
                      <Icon d={ICONS.upload} />
                      <span className="truncate">{isParsing ? "Membaca file..." : uploadFileName || "Pilih file Excel (.xlsx)"}</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isSubmitting || isParsing}
                      />
                    </label>
                  </div>

                  <label className="flex items-start gap-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={upsertMode}
                      disabled={isSubmitting}
                      onChange={(e) => setUpsertMode(e.target.checked)}
                      className="mt-0.5 accent-teal-600"
                    />
                    <span>
                      <b>Mode Upsert</b> — update data jika Part Number sudah ada di database. Jika tidak dicentang, baris duplikat ditandai error.
                    </span>
                  </label>

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Kolom template: {TEMPLATE_COLUMNS.map((c) => c.key).join(", ")}. Isi part_number dengan <b>Automatic</b> (atau kosongkan) →
                    Part Number di-generate berurutan berdasarkan description (contoh: Hardware &amp; Computing → HAR-001, HAR-002). Qty kosong → 1,
                    Unit kosong → Pcs, Markup dihitung ulang otomatis.
                  </p>
                </div>

                {/* STEP 2: PREVIEW */}
                {previewRows.length > 0 && (
                  <div className={cardCls}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <h4 className="text-teal-600 font-bold uppercase tracking-wider">2. Preview & Validasi</h4>
                      <div className="flex flex-wrap gap-1.5">
                        <Chip label="Total" value={uploadStats.total} tone="slate" />
                        <Chip label="Valid" value={uploadStats.valid} tone="teal" />
                        <Chip label="Error" value={uploadStats.invalid} tone="rose" />
                        <Chip label="Insert" value={uploadStats.insert} tone="sky" />
                        <Chip label="Update" value={uploadStats.update} tone="amber" />
                        <Chip label="Auto PN" value={uploadStats.auto} tone="teal" />
                        {uploadProgress && <Chip label="Sukses" value={uploadStats.success} tone="teal" />}
                        {uploadProgress && <Chip label="Gagal" value={uploadStats.failed} tone="rose" />}
                      </div>
                    </div>

                    {uploadProgress && (
              <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{isSubmitting ? "Uploading..." : "Selesai"}</span>
                          <span>
                            {uploadProgress.done}/{uploadProgress.total}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded overflow-hidden">
                          <div
                            className="h-full bg-teal-500 transition-all duration-300"
                            style={{ width: `${uploadProgress.total ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="max-h-[42vh] overflow-auto border border-slate-200 rounded bg-white">
                      <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                            <th className="p-2">Row</th>
                            <th className="p-2">Action</th>
                            <th className="p-2">Part Number</th>
                            <th className="p-2">Description</th>
                            <th className="p-2">Tech Spec</th>
                            <th className="p-2">Unit</th>
                            <th className="p-2 text-right">Price</th>
                            <th className="p-2 text-right">Margin</th>
                            <th className="p-2 text-right">Markup</th>
                            <th className="p-2">Supplier</th>
                            <th className="p-2 min-w-[180px]">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewRows.map((r) => {
                            const result = uploadResults[r.rowNumber];
                            const hasError = r.errors.length > 0;
                            const rowTone =
                              hasError || result?.status === "failed"
                                ? "bg-rose-50/60"
                                : result?.status === "success"
                                ? "bg-teal-50/60"
                                : "";
                            return (
                              <tr key={r.rowNumber} className={rowTone}>
                                <td className="p-2 text-slate-400">{r.rowNumber}</td>
                                <td className="p-2">
                                  <span
                                    className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${
                                      r.action === "INSERT" ? CHIP_TONES.sky : CHIP_TONES.amber
                                    }`}
                                  >
                                    {r.action}
                                  </span>
                                </td>
                                <td className="p-2 font-bold text-teal-600 whitespace-nowrap">
                                  {r.data.part_number || "-"}
                                  {r.autoPN && r.data.part_number && (
                                    <span className="ml-1.5 px-1 py-0.5 rounded border text-[8px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                                      AUTO
                                    </span>
                                  )}
                                </td>
                                <td className="p-2 max-w-[180px] truncate" title={r.data.description}>
                                  {r.data.description || "-"}
                                </td>
                                <td className="p-2 max-w-[200px] truncate text-slate-500" title={r.data.technical_specification}>
                                  {r.data.technical_specification || "-"}
                                </td>
                                <td className="p-2">{r.data.unit}</td>
                                <td className="p-2 text-right whitespace-nowrap">{fmtIDR(r.data.price)}</td>
                                <td className="p-2 text-right text-amber-600">{r.data.margin}%</td>
                                <td className="p-2 text-right whitespace-nowrap">{fmtIDR(r.data.markup)}</td>
                                <td className="p-2 max-w-[120px] truncate">
                                  <SupplierCell value={r.data.supplier} />
                                </td>
                                <td className="p-2 text-[10px]">
                                  {hasError ? (
                                    <span className="text-rose-600">✗ {r.errors.join("; ")}</span>
                                  ) : result?.status === "success" ? (
                                    <span className="text-teal-600 font-bold">✓ Berhasil</span>
                                  ) : result?.status === "failed" ? (
                                    <span className="text-rose-600">✗ {result.message}</span>
                                  ) : (
                                    <span className="text-slate-500">Ready</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 sticky bottom-0 bg-white py-2">
                  <button
                    type="button"
                    onClick={resetMassUpload}
                    disabled={isSubmitting || previewRows.length === 0}
                    className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold rounded transition-colors disabled:opacity-40"
                  >
                    Reset File
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded transition-colors disabled:opacity-50"
                    >
                      {uploadProgress && !isSubmitting ? "Close" : "Cancel"}
                    </button>
                    <button
                      type="button"
                      onClick={handleMassUpload}
                      disabled={isSubmitting || uploadStats.pending === 0}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded transition-colors disabled:opacity-50"
                    >
                      {isSubmitting
                        ? "Uploading..."
                        : uploadStats.failed > 0
                        ? `Retry ${uploadStats.pending} Row`
                        : `Upload ${uploadStats.pending} Row`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl w-full max-w-md p-6 space-y-4 font-mono">
            <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider">Confirm Delete</h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus material{" "}
              <span className="text-amber-600 font-bold">{deletingMaterial?.part_number ?? `#${deletingId}`}</span>
              {deletingMaterial?.description ? ` (${deletingMaterial.description})` : ""}? Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}