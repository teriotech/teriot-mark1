"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Receipt, X, Printer, Loader2, FileText, Plus, Trash2, RotateCcw, Calculator, FileSpreadsheet } from "lucide-react";
import { BomGroup } from "./types";
import { asBlob } from "html-docx-js-typescript";
import { saveAs } from "file-saver";

interface ModalInvoiceProps {
  config: { group: BomGroup } | null;
  onClose: () => void;
}

/* ===================== TYPES & CONSTANTS ===================== */
type CalcKind = "discount" | "dpp" | "tax" | "custom";
type CalcMode = "percent" | "amount" | "factor";
type CalcBase = "subtotal" | "afterDiscount" | "dpp";
type CalcEffect = "add" | "subtract" | "info";

interface CalcRow {
  id: string;
  kind: CalcKind;
  label: string;
  enabled: boolean;
  mode: CalcMode;
  value: string;
  base: CalcBase;
  effect: CalcEffect;
  round: boolean;
}

interface SummaryLine {
  key: string;
  label: string;
  amount: number;
  variant: "normal" | "sub" | "grand";
}

const DEFAULT_PAYMENT = "a. Direct Payment to PT. Transindo Multi Industri\nb. Term of Payment 14 days";
const DEFAULT_APPROVER = "Meita Surya";
const STORAGE_PREFIX = "invoice_calc_";

const DEFAULT_ROWS: CalcRow[] = [
  { id: "disc", kind: "discount", label: "Diskon", enabled: true, mode: "percent", value: "0", base: "subtotal", effect: "subtract", round: false },
  { id: "dpp", kind: "dpp", label: "DPP", enabled: true, mode: "factor", value: "11/12", base: "afterDiscount", effect: "info", round: false },
  { id: "vat", kind: "tax", label: "VAT (PPN) 12%", enabled: true, mode: "percent", value: "12", base: "dpp", effect: "add", round: true },
  { id: "pph", kind: "tax", label: "PPH", enabled: true, mode: "percent", value: "2", base: "afterDiscount", effect: "subtract", round: true },
];

const MODE_OPTIONS: { v: CalcMode; l: string }[] = [
  { v: "percent", l: "%" },
  { v: "amount", l: "Rp" },
  { v: "factor", l: "× Faktor" },
];
const BASE_OPTIONS: { v: CalcBase; l: string }[] = [
  { v: "subtotal", l: "Sub Total" },
  { v: "afterDiscount", l: "After Diskon" },
  { v: "dpp", l: "DPP" },
];
const EFFECT_OPTIONS: { v: CalcEffect; l: string }[] = [
  { v: "add", l: "+ Tambah" },
  { v: "subtract", l: "− Kurang" },
  { v: "info", l: "Info" },
];

/* ===================== HELPERS ===================== */
// Support: "12", "12,5", "1.000.000", "11/12"
const parseNum = (raw: string, isAmount = false): number => {
  const s = String(raw ?? "").trim().replace(/\s/g, "");
  if (!s) return 0;
  if (s.includes("/")) {
    const [a, b] = s.split("/").map((x) => parseNum(x));
    return b ? a / b : 0;
  }
  let n = s.replace(/[^\d.,-]/g, "");
  if (n.includes(",")) n = n.replace(/\./g, "").replace(",", ".");
  else if ((n.match(/\./g) || []).length > 1) n = n.replace(/\./g, "");
  else if (isAmount && /^-?\d{1,3}\.\d{3}$/.test(n)) n = n.replace(".", "");
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

const fmt = (n: number) =>
  (Number(n) || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const formatDateID = (d: string) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

function computeSummary(subTotal: number, rows: CalcRow[]) {
  const amounts: Record<string, number> = {};
  const active = rows.filter((r) => r.enabled);
  const calc = (r: CalcRow, baseVal: number) => {
    const v =
      r.mode === "amount"
        ? parseNum(r.value, true)
        : baseVal * (r.mode === "percent" ? parseNum(r.value) / 100 : parseNum(r.value));
    return r.round ? Math.round(v) : v;
  };

  const discRows = active.filter((r) => r.kind === "discount");
  let discount = 0;
  discRows.forEach((r) => {
    const a = calc(r, subTotal);
    amounts[r.id] = a;
    discount += a;
  });
  const afterDiscount = subTotal - discount;

  const dppRow = active.find((r) => r.kind === "dpp");
  const dpp = dppRow ? calc(dppRow, afterDiscount) : afterDiscount;
  if (dppRow) amounts[dppRow.id] = dpp;

  const bases: Record<CalcBase, number> = { subtotal: subTotal, afterDiscount, dpp };
  let grandTotal = afterDiscount;
  active
    .filter((r) => r.kind === "tax" || r.kind === "custom")
    .forEach((r) => {
      const a = calc(r, bases[r.base]);
      amounts[r.id] = a;
      if (r.effect === "add") grandTotal += a;
      else if (r.effect === "subtract") grandTotal -= a;
    });

  const lines: SummaryLine[] = [{ key: "subtotal", label: "SUB TOTAL", amount: subTotal, variant: "sub" }];
  discRows.forEach((r) => lines.push({ key: r.id, label: r.label, amount: amounts[r.id], variant: "normal" }));
  if (discRows.length) lines.push({ key: "after", label: "After Diskon", amount: afterDiscount, variant: "sub" });
  active
    .filter((r) => r.kind !== "discount")
    .forEach((r) => lines.push({ key: r.id, label: r.label, amount: amounts[r.id], variant: "normal" }));
  lines.push({ key: "grand", label: "Grand Total", amount: grandTotal, variant: "grand" });

  return { amounts, discount, afterDiscount, dpp, grandTotal, lines };
}

/* ===================== SMALL UI COMPONENTS (di luar agar input tidak kehilangan fokus) ===================== */
const inputCls =
  "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition";
const miniCls =
  "w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/70 rounded-xl p-4">
      <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-3">
        <h3 className="text-sm font-bold text-amber-400">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ===================== MAIN COMPONENT ===================== */
export default function ModalInvoice({ config, onClose }: ModalInvoiceProps) {
  const [dbId, setDbId] = useState<number | null>(null);
  const [invoiceCustomer, setInvoiceCustomer] = useState("");
  const [invoiceAttn, setInvoiceAttn] = useState("");
  const [invoiceAddress, setInvoiceAddress] = useState("");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [referenceQo, setReferenceQo] = useState("");
  const [invoiceRevision, setInvoiceRevision] = useState("0");
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState(DEFAULT_PAYMENT);
  const [invoiceApprovedBy, setInvoiceApprovedBy] = useState(DEFAULT_APPROVER);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [calcRows, setCalcRows] = useState<CalcRow[]>(DEFAULT_ROWS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  /* ---------- INIT ---------- */
  useEffect(() => {
    if (!config) return;
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const qo = config.group.qo_number || "";

    setReferenceQo(qo);
    setInvoiceNo(`INV${month}${year}${randomNum}`);
    setInvoiceCustomer(config.group.customer);
    setInvoiceAttn("");
    setInvoiceAddress("");
    setInvoicePhone("");
    setInvoiceRevision("0");
    setInvoicePaymentMethod(DEFAULT_PAYMENT);
    setInvoiceApprovedBy(DEFAULT_APPROVER);
    setInvoiceDate(date.toISOString().split("T")[0]);
    setDbId(null);

    // Load setting kalkulasi tersimpan (per QO, fallback ke setting terakhir)
    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + (qo || "last")) || localStorage.getItem(STORAGE_PREFIX + "last");
      setCalcRows(saved ? JSON.parse(saved) : DEFAULT_ROWS);
    } catch {
      setCalcRows(DEFAULT_ROWS);
    }

    if (!qo) return;
    setIsLoadingData(true);
    fetch(`/api/management/material_qo?qo_number=${encodeURIComponent(qo)}`)
      .then((res) => res.json())
      .then(({ data: d }) => {
        if (!d) return;
        setDbId(d.id);
        if (d.invoice_no) setInvoiceNo(d.invoice_no);
        if (d.attn_invoice) setInvoiceAttn(d.attn_invoice);
        if (d.revision_invoice !== undefined && d.revision_invoice !== null) setInvoiceRevision(String(d.revision_invoice));
        if (d.payment_method_invoice) setInvoicePaymentMethod(d.payment_method_invoice);
        if (d.approved_by_invoice) setInvoiceApprovedBy(d.approved_by_invoice);
      })
      .catch((err) => console.error("Gagal mengambil data Invoice:", err))
      .finally(() => setIsLoadingData(false));
  }, [config]);

  // Simpan setting kalkulasi otomatis
  useEffect(() => {
    if (!config) return;
    try {
      const json = JSON.stringify(calcRows);
      localStorage.setItem(STORAGE_PREFIX + "last", json);
      if (referenceQo) localStorage.setItem(STORAGE_PREFIX + referenceQo, json);
    } catch {}
  }, [calcRows, referenceQo, config]);

  // ESC untuk menutup
  useEffect(() => {
    if (!config) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && !isSaving && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [config, isSaving, onClose]);

  /* ---------- GROUPING ITEMS ---------- */
  const groupedData = useMemo(() => {
    if (!config?.group?.items) return { groups: [] as any[], subTotal: 0 };
    const map = new Map<string, { items: any[]; subTotal: number }>();
    config.group.items.forEach((item: any) => {
      const key = item.mother_part || "General Part";
      if (!map.has(key)) map.set(key, { items: [], subTotal: 0 });
      const price = Number(item.price) || 0;
      const unitPriceWithMargin = price + (price * (Number(item.margin) || 0)) / 100;
      const totalPrice = unitPriceWithMargin * (Number(item.qty) || 1);
      const g = map.get(key)!;
      g.items.push({ ...item, unitPriceWithMargin, totalPrice });
      g.subTotal += totalPrice;
    });
    let idx = 1;
    let subTotal = 0;
    const groups = Array.from(map.entries()).map(([motherPart, d]) => {
      subTotal += d.subTotal;
      return { motherPart, subTotal: d.subTotal, items: d.items.map((it) => ({ ...it, printIndex: idx++ })) };
    });
    return { groups, subTotal };
  }, [config]);

  /* ---------- AUTO CALCULATION ---------- */
  const summary = useMemo(() => computeSummary(groupedData.subTotal, calcRows), [groupedData.subTotal, calcRows]);

  if (!config) return null;

  /* ---------- ROW EDITOR ---------- */
  const updateRow = (id: string, patch: Partial<CalcRow>) =>
    setCalcRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => setCalcRows((rows) => rows.filter((r) => r.id !== id));
  const addRow = () =>
    setCalcRows((rows) => [
      ...rows,
      { id: `c${Date.now()}`, kind: "custom", label: "Biaya Lain", enabled: true, mode: "amount", value: "0", base: "afterDiscount", effect: "add", round: false },
    ]);
  const resetRows = () => setCalcRows(DEFAULT_ROWS);

  /* ---------- SAVE & EXPORT ---------- */
  const buildFileName = () => {
    const projectName = (config.group as any).project_name || invoiceCustomer || "Project";
    const t = new Date();
    const dateStr = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`;
    return `${projectName}_${invoiceNo}_${dateStr}`.replace(/\s+/g, "_");
  };

  const saveToDatabase = async (): Promise<boolean> => {
    if (!referenceQo) {
      alert("Reference QO Number wajib diisi untuk menyimpan Invoice ke database.");
      return false;
    }
    const payload = {
      invoice_no: invoiceNo,
      attn_invoice: invoiceAttn,
      revision_invoice: Number(invoiceRevision),
      payment_method_invoice: invoicePaymentMethod,
      approved_by_invoice: invoiceApprovedBy,
    };
    const put = (id: number) =>
      fetch(`/api/management/material_qo?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    try {
      if (dbId) {
        await put(dbId);
      } else {
        const res = await fetch(`/api/management/material_qo?qo_number=${encodeURIComponent(referenceQo)}`);
        const { data } = await res.json();
        if (data?.id) {
          setDbId(data.id);
          await put(data.id);
        } else {
          alert("Data QO acuan tidak ditemukan di database. Data Invoice tidak tersimpan, namun tetap akan dicetak.");
        }
      }
      return true;
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Terjadi kesalahan saat menyimpan ke database. Dokumen tetap akan di-generate.");
      return true;
    }
  };

  const runWithSave = async (action: () => void | Promise<void>) => {
    setIsSaving(true);
    const ok = await saveToDatabase();
    setIsSaving(false);
    if (ok) await action();
  };

  const executeInvoicePrint = () =>
    runWithSave(() => {
      const originalTitle = document.title;
      document.title = buildFileName();
      const restore = () => {
        document.title = originalTitle;
        window.removeEventListener("afterprint", restore);
      };
      window.addEventListener("afterprint", restore);
      setTimeout(() => window.print(), 300);
    });

  const getBase64ImageWithSize = async (url: string, maxW: number, maxH: number) => {
    try {
      const blob = await (await fetch(url)).blob();
      const src = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const { w, h } = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: maxW, h: maxH });
        img.src = src;
      });
      const scale = Math.min(maxW / w, maxH / h, 1);
      return { src, width: Math.round(w * scale), height: Math.round(h * scale) };
    } catch {
      return { src: "", width: maxW, height: maxH };
    }
  };

  const executeInvoiceWord = () =>
    runWithSave(async () => {
      try {
        const logo = await getBase64ImageWithSize("/image/transindo.png", 192, 48);
        const compact = (config.group.items?.length || 0) > 5;
        const pad = compact ? "4px" : "6px";
        const font = compact ? "9pt" : "9.5pt";
        const cell = `padding:${pad};border:1px solid #000;`;

        const itemsRows = groupedData.groups
          .map(
            (g) => `
            <tr><td colspan="5" style="${cell}background-color:#f3f4f6;"><b>${esc(g.motherPart)}</b></td></tr>
            ${g.items
              .map(
                (it: any) => `
              <tr>
                <td style="${cell}text-align:center;">${it.printIndex}</td>
                <td style="${cell}"><b>${esc(it.description || "-")}</b> - ${esc(it.technical_specification || "-")}</td>
                <td style="${cell}text-align:center;">${esc(it.qty)} ${esc(it.unit || "EA")}</td>
                <td style="${cell}text-align:right;">Rp${fmt(it.unitPriceWithMargin)}</td>
                <td style="${cell}text-align:right;"><b>Rp${fmt(it.totalPrice)}</b></td>
              </tr>`
              )
              .join("")}
            <tr>
              <td colspan="4" style="${cell}text-align:right;background-color:#eff6ff;"><b>Total ${esc(g.motherPart)}</b></td>
              <td style="${cell}text-align:right;background-color:#eff6ff;"><b>Rp${fmt(g.subTotal)}</b></td>
            </tr>`
          )
          .join("");

        const summaryRows = summary.lines
          .map((l) => {
            const bg = l.variant === "grand" ? "#dbeafe" : l.variant === "sub" ? "#eff6ff" : "#ffffff";
            const fw = l.variant === "normal" ? "normal" : "bold";
            const c = `border:1px solid #000;padding:4px 6px;background-color:${bg};font-weight:${fw};`;
            return `<tr>
              <td style="border:none;width:45%;"></td>
              <td style="${c}">${esc(l.label)}</td>
              <td style="${c}width:7%;">Rp</td>
              <td style="${c}text-align:right;width:23%;">${fmt(l.amount)}</td>
            </tr>`;
          })
          .join("");

        const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>${esc(invoiceNo)}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
            th { background-color: #dbeafe; border: 1px solid #000; padding: 6px; text-align: left; }
            td { border: 1px solid #000; padding: 6px; vertical-align: top; }
            .nb td { border: none; }
            .info td { border: none; padding: 2px 4px; }
            .title { font-size: 14pt; font-weight: bold; text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 10px 0; }
          </style></head><body>
          <table class="nb" style="border-bottom:2px solid #000;">
            <tr>
              <td style="width:40%;vertical-align:middle;">
                ${logo.src ? `<img src="${logo.src}" width="${logo.width}" height="${logo.height}" alt="Logo" />` : `<b>PT. TRANSINDO MULTI INDUSTRI</b>`}
              </td>
              <td style="text-align:right;font-size:8.5pt;line-height:1.2;vertical-align:middle;">
                <b>PT. TRANSINDO MULTI INDUSTRI</b><br/>www.transindomu.com<br/>
                Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14<br/>
                Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514<br/>
                Phone : (+62) 8516 3657 641 email : sales@transindomu.com
              </td>
            </tr>
          </table>
          <div class="title">INVOICE</div>
          <table class="info" style="margin-bottom:15px;font-size:10pt;">
            <tr>
              <td style="width:50%;">
                <b>To:</b> ${esc(invoiceCustomer)}<br/><b>Attn:</b> ${esc(invoiceAttn || "-")}<br/>
                <b>Address:</b> ${esc(invoiceAddress || "-")}<br/><b>Phone:</b> ${esc(invoicePhone || "-")}
              </td>
              <td style="width:50%;padding-left:15px;border-left:1px solid #ccc;">
                <b>Invoice No:</b> ${esc(invoiceNo)}<br/><b>Date:</b> ${formatDateID(invoiceDate)}<br/>
                <b>Email:</b> sales@transindomu.com<br/><b>Revision:</b> ${esc(invoiceRevision)}
              </td>
            </tr>
          </table>
          <table style="font-size:${font};">
            <thead><tr>
              <th style="width:5%;text-align:center;">No</th>
              <th style="width:45%;">Description Item</th>
              <th style="width:10%;text-align:center;">Qty</th>
              <th style="width:20%;text-align:right;">Unit Price</th>
              <th style="width:20%;text-align:right;">Total Price</th>
            </tr></thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <table style="font-size:10pt;">${summaryRows}</table>
          <table class="nb" style="margin-top:20px;font-size:9.5pt;">
            <tr>
              <td style="width:65%;">
                <b>Payment Method :</b><br/>
                <div style="white-space:pre-wrap;padding-left:10px;margin-bottom:10px;">${esc(invoicePaymentMethod).replace(/\n/g, "<br/>")}</div>
                <b>Bank Transfer :</b><br/>
                <div style="padding-left:10px;">Bank : BANK BNI<br/>Account Name : PT. TRANSINDO MULTI INDUSTRI<br/>Account Number : 2089710424</div>
              </td>
              <td style="width:35%;text-align:center;">
                <b>Approved By</b><br/><br/><br/><br/>
                <p style="text-decoration:underline;font-weight:bold;text-transform:uppercase;margin-bottom:2px;">${esc(invoiceApprovedBy || DEFAULT_APPROVER)}</p>
                <b>Finance & Tax Control</b>
              </td>
            </tr>
          </table>
          </body></html>`;

        const blob = await asBlob(html);
        saveAs(blob as Blob, `${buildFileName()}.docx`);
      } catch (error) {
        console.error("Error generating Word document:", error);
        alert("Terjadi kesalahan saat membuat file Word.");
      }
    });

      /* ---------- EXPORT EXCEL (formula hidup, flexible) ---------- */
  const executeInvoiceExcel = () =>
    runWithSave(async () => {
      try {
        const ExcelJS = (await import("exceljs")).default;
        const wb = new ExcelJS.Workbook();
        wb.creator = "PT. Transindo Multi Industri";
        wb.created = new Date();

        const ws = wb.addWorksheet("Invoice", {
          views: [{ showGridLines: false }],
          pageSetup: {
            paperSize: 9,
            orientation: "portrait",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
          },
        });
        ws.columns = [
          { width: 10 }, // A No / label
          { width: 50 }, // B Description
          { width: 10 }, // C Qty
          { width: 10 }, // D Unit
          { width: 18 }, // E Unit Price / "Rp"
          { width: 20 }, // F Total
          { width: 3 },  // G spacer
          { width: 20 }, // H Parameter (editable, di luar print area)
        ];

        const thin: any = { style: "thin", color: { argb: "FF000000" } };
        const BORDER: any = { top: thin, left: thin, bottom: thin, right: thin };
        const FILL = (argb: string): any => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
        const NUM = "#,##0.00";
        const boxRow = (row: number, from = 1, to = 6, fillArgb?: string, bold = false) => {
          for (let c = from; c <= to; c++) {
            const cell = ws.getCell(row, c);
            cell.border = BORDER;
            if (fillArgb) cell.fill = FILL(fillArgb);
            if (bold) cell.font = { ...(cell.font || {}), bold: true };
          }
        };

        /* ---- HEADER ---- */
        const logo = await getBase64ImageWithSize("/image/transindo.png", 192, 48);
        if (logo.src) {
          const ext = logo.src.includes("image/jpeg") ? "jpeg" : "png";
          const imgId = wb.addImage({ base64: logo.src, extension: ext as any });
          ws.addImage(imgId, { tl: { col: 0, row: 0.3 }, ext: { width: logo.width, height: logo.height } });
        }
        [
          "PT. TRANSINDO MULTI INDUSTRI",
          "www.transindomu.com",
          "Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14",
          "Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514",
          "Phone : (+62) 8516 3657 641 email : sales@transindomu.com",
        ].forEach((t, i) => {
          const row = i + 1;
          ws.mergeCells(`C${row}:F${row}`);
          const cell = ws.getCell(`C${row}`);
          cell.value = t;
          cell.alignment = { horizontal: "right" };
          cell.font = { size: i === 0 ? 11 : 8, bold: i === 0 };
        });
        for (let c = 1; c <= 6; c++) ws.getCell(5, c).border = { bottom: { style: "medium" } };

        ws.mergeCells("A7:F7");
        const title = ws.getCell("A7");
        title.value = "INVOICE";
        title.font = { size: 14, bold: true };
        title.alignment = { horizontal: "center" };
        for (let c = 1; c <= 6; c++) ws.getCell(7, c).border = { bottom: thin };

        /* ---- INFO ---- */
        const left = [["To", invoiceCustomer], ["Attn", invoiceAttn || "-"], ["Address", invoiceAddress || "-"], ["Phone", invoicePhone || "-"]];
        const right = [["Invoice No", invoiceNo], ["Date", formatDateID(invoiceDate)], ["Email", "sales@transindomu.com"], ["Revision", invoiceRevision]];
        left.forEach(([k, v], i) => {
          const row = 9 + i;
          ws.getCell(`A${row}`).value = k;
          ws.getCell(`A${row}`).font = { bold: true, size: 10 };
          ws.getCell(`B${row}`).value = `: ${v}`;
          ws.getCell(`B${row}`).alignment = { wrapText: true, vertical: "top" };
          ws.mergeCells(`C${row}:D${row}`);
          ws.getCell(`C${row}`).value = right[i][0];
          ws.getCell(`C${row}`).font = { bold: true, size: 10 };
          ws.mergeCells(`E${row}:F${row}`);
          ws.getCell(`E${row}`).value = `: ${right[i][1]}`;
        });

        /* ---- ITEMS ---- */
        let r = 14;
        ["No", "Description Item", "Qty", "Unit", "Unit Price", "Total Price"].forEach((h, i) => {
          const cell = ws.getCell(r, i + 1);
          cell.value = h;
          cell.alignment = { horizontal: i === 1 ? "left" : "center", vertical: "middle" };
        });
        boxRow(r, 1, 6, "FFDBEAFE", true);
        r++;

        const groupTotalRefs: string[] = [];
        groupedData.groups.forEach((g: any) => {
          ws.mergeCells(`A${r}:F${r}`);
          ws.getCell(`A${r}`).value = g.motherPart;
          boxRow(r, 1, 6, "FFF3F4F6", true);
          r++;

          const start = r;
          g.items.forEach((it: any) => {
            ws.getCell(`A${r}`).value = it.printIndex;
            ws.getCell(`B${r}`).value = `${it.description || "-"} - ${it.technical_specification || "-"}`;
            ws.getCell(`C${r}`).value = Number(it.qty) || 1;
            ws.getCell(`D${r}`).value = it.unit || "EA";
            ws.getCell(`E${r}`).value = it.unitPriceWithMargin;
            ws.getCell(`F${r}`).value = { formula: `C${r}*E${r}`, result: it.totalPrice };
            ws.getCell(`A${r}`).alignment = { horizontal: "center", vertical: "top" };
            ws.getCell(`B${r}`).alignment = { wrapText: true, vertical: "top" };
            ws.getCell(`C${r}`).alignment = { horizontal: "center", vertical: "top" };
            ws.getCell(`D${r}`).alignment = { horizontal: "center", vertical: "top" };
            ws.getCell(`E${r}`).numFmt = NUM;
            ws.getCell(`F${r}`).numFmt = NUM;
            boxRow(r);
            r++;
          });
          const end = r - 1;

          ws.mergeCells(`A${r}:E${r}`);
          ws.getCell(`A${r}`).value = `Total ${g.motherPart}`;
          ws.getCell(`A${r}`).alignment = { horizontal: "right" };
          ws.getCell(`F${r}`).value = { formula: end >= start ? `SUM(F${start}:F${end})` : "0", result: g.subTotal };
          ws.getCell(`F${r}`).numFmt = NUM;
          boxRow(r, 1, 6, "FFEFF6FF", true);
          groupTotalRefs.push(`F${r}`);
          r++;
        });

        /* ---- SUMMARY (formula sesuai setting Kalkulasi Total) ---- */
        r++;
        const hint = ws.getCell(`H${r}`);
        hint.value = "Parameter (editable)";
        hint.font = { italic: true, size: 8, color: { argb: "FF6B7280" } };
        r++;

        const sumStart = r;
        const rowOf: Record<string, number> = {};
        summary.lines.forEach((l, i) => (rowOf[l.key] = sumStart + i));

        const active = calcRows.filter((c) => c.enabled);
        const subRef = `F${rowOf.subtotal}`;
        const discRefs = active.filter((c) => c.kind === "discount").map((c) => `F${rowOf[c.id]}`);
        const afterRef = rowOf.after ? `F${rowOf.after}` : subRef;
        const dppCalc = active.find((c) => c.kind === "dpp");
        const dppRef = dppCalc ? `F${rowOf[dppCalc.id]}` : afterRef;
        const baseRef: Record<CalcBase, string> = { subtotal: subRef, afterDiscount: afterRef, dpp: dppRef };
        const adjust = active.filter((c) => c.kind === "tax" || c.kind === "custom");
        const grandFormula =
          afterRef +
          adjust.filter((c) => c.effect === "add").map((c) => `+F${rowOf[c.id]}`).join("") +
          adjust.filter((c) => c.effect === "subtract").map((c) => `-F${rowOf[c.id]}`).join("");

        summary.lines.forEach((l) => {
          const rr = rowOf[l.key];
          ws.mergeCells(`C${rr}:D${rr}`);
          ws.getCell(`C${rr}`).value = l.label;
          ws.getCell(`E${rr}`).value = "Rp";

          let formula = "0";
          const c = active.find((x) => x.id === l.key);
          if (l.key === "subtotal") formula = groupTotalRefs.length ? groupTotalRefs.join("+") : "0";
          else if (l.key === "after") formula = `${subRef}-(${discRefs.join("+") || "0"})`;
          else if (l.key === "grand") formula = grandFormula;
          else if (c) {
            const h = ws.getCell(`H${rr}`);
            if (c.mode === "percent") {
              h.value = parseNum(c.value) / 100;
              h.numFmt = "0.00%";
            } else if (c.mode === "amount") {
              h.value = parseNum(c.value, true);
              h.numFmt = NUM;
            } else {
              const m = c.value.replace(/\s/g, "").match(/^([\d.,]+)\/([\d.,]+)$/);
              h.value = m ? { formula: `${parseNum(m[1])}/${parseNum(m[2])}`, result: parseNum(c.value) } : parseNum(c.value);
              h.numFmt = "0.000000";
            }
            h.fill = FILL("FFFFF2CC");
            h.border = BORDER;

            const base = c.kind === "discount" ? subRef : c.kind === "dpp" ? afterRef : baseRef[c.base];
            const expr = c.mode === "amount" ? `H${rr}` : `${base}*H${rr}`;
            formula = c.round ? `ROUND(${expr},0)` : expr;
          }

          const f = ws.getCell(`F${rr}`);
          f.value = { formula, result: l.amount };
          f.numFmt = NUM;
          const fillArgb = l.variant === "grand" ? "FFDBEAFE" : l.variant === "sub" ? "FFEFF6FF" : undefined;
          boxRow(rr, 3, 6, fillArgb, l.variant !== "normal");
        });

        /* ---- FOOTER ---- */
        r = sumStart + summary.lines.length + 1;
        const footStart = r;
        ws.getCell(`A${r}`).value = "Payment Method :";
        ws.getCell(`A${r}`).font = { bold: true, size: 9 };
        r++;
        invoicePaymentMethod.split("\n").forEach((line) => {
          ws.getCell(`B${r}`).value = line;
          ws.getCell(`B${r}`).font = { size: 9 };
          r++;
        });
        r++;
        ws.getCell(`A${r}`).value = "Bank Transfer :";
        ws.getCell(`A${r}`).font = { bold: true, size: 9 };
        r++;
        ["Bank : BANK BNI", "Account Name : PT. TRANSINDO MULTI INDUSTRI", "Account Number : 2089710424"].forEach((line) => {
          ws.getCell(`B${r}`).value = line;
          ws.getCell(`B${r}`).font = { size: 9 };
          r++;
        });

        ws.mergeCells(`E${footStart}:F${footStart}`);
        ws.getCell(`E${footStart}`).value = "Approved By";
        ws.getCell(`E${footStart}`).font = { bold: true, size: 10 };
        ws.getCell(`E${footStart}`).alignment = { horizontal: "center" };

        const signRow = Math.max(r - 2, footStart + 5);
        ws.mergeCells(`E${signRow}:F${signRow}`);
        const sign = ws.getCell(`E${signRow}`);
        sign.value = (invoiceApprovedBy || DEFAULT_APPROVER).toUpperCase();
        sign.font = { bold: true, underline: true, size: 10 };
        sign.alignment = { horizontal: "center" };
        ws.mergeCells(`E${signRow + 1}:F${signRow + 1}`);
        const role = ws.getCell(`E${signRow + 1}`);
        role.value = "Finance & Tax Control";
        role.font = { bold: true, size: 9 };
        role.alignment = { horizontal: "center" };

        const last = Math.max(r, signRow + 1);
        ws.pageSetup.printArea = `A1:F${last}`;

        /* ---- SAVE ---- */
        const buf = await wb.xlsx.writeBuffer();
        saveAs(
          new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          `${buildFileName()}.xlsx`
        );
      } catch (error) {
        console.error("Error generating Excel:", error);
        alert("Terjadi kesalahan saat membuat file Excel.");
      }
    });

  /* ---------- PRINT STYLE VARS ---------- */
  const isCompact = (config.group?.items?.length || 0) > 5;
  const pad = isCompact ? "py-1 px-1.5" : "py-1.5 px-2";
  const padC = isCompact ? "py-1 px-1" : "py-1.5 px-1.5";
  const busy = isSaving || isLoadingData;

  return (
    <>
      {/* ===================== MODAL SETTINGS ===================== */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto print:hidden">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl flex flex-col shadow-2xl overflow-hidden my-auto">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600/20 text-amber-400 rounded-lg"><Receipt className="w-5 h-5" /></div>
              <div>
                <h2 className="text-lg font-bold text-white">Pengaturan Cetak Invoice</h2>
                <p className="text-xs text-slate-400">
                  {groupedData.groups.length} grup • {config.group.items?.length || 0} item
                  {isLoadingData && <span className="ml-2 text-amber-400 animate-pulse">• Memuat data tersimpan...</span>}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50"><X className="w-6 h-6" /></button>
          </div>

          {/* Body */}
          <div className="p-5 max-h-[75vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* LEFT: form */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-amber-900/20 p-4 rounded-xl border border-amber-700/50">
                <Field label="Reference QO Number (Acuan Database)">
                  <input value={referenceQo} onChange={(e) => setReferenceQo(e.target.value)} placeholder="Contoh: QO0826123" className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card title="Informasi Klien">
                  <div className="space-y-3">
                    <Field label="To (Customer)"><input value={invoiceCustomer} onChange={(e) => setInvoiceCustomer(e.target.value)} className={inputCls} /></Field>
                    <Field label="Attn"><input value={invoiceAttn} onChange={(e) => setInvoiceAttn(e.target.value)} className={inputCls} /></Field>
                    <Field label="Address"><textarea rows={2} value={invoiceAddress} onChange={(e) => setInvoiceAddress(e.target.value)} className={inputCls} /></Field>
                    <Field label="Phone"><input value={invoicePhone} onChange={(e) => setInvoicePhone(e.target.value)} className={inputCls} /></Field>
                  </div>
                </Card>
                <Card title="Detail Invoice">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Invoice No"><input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={inputCls} /></Field>
                      <Field label="Revision"><input type="number" value={invoiceRevision} onChange={(e) => setInvoiceRevision(e.target.value)} className={inputCls} /></Field>
                    </div>
                    <Field label="Date"><input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputCls} /></Field>
                    <Field label="Payment Method"><textarea rows={2} value={invoicePaymentMethod} onChange={(e) => setInvoicePaymentMethod(e.target.value)} className={inputCls} /></Field>
                    <Field label="Approved By"><input value={invoiceApprovedBy} onChange={(e) => setInvoiceApprovedBy(e.target.value)} className={inputCls} /></Field>
                  </div>
                </Card>
              </div>

              {/* CALC EDITOR */}
              <Card
                title="Kalkulasi Total (Flexible)"
                right={
                  <div className="flex gap-2">
                    <button onClick={resetRows} className="px-2.5 py-1 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" />Reset</button>
                    <button onClick={addRow} className="px-2.5 py-1 text-xs rounded-md bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Tambah Baris</button>
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-200">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-slate-400 text-left">
                        <th className="p-1.5 w-8">On</th>
                        <th className="p-1.5 min-w-[130px]">Label</th>
                        <th className="p-1.5 w-24">Mode</th>
                        <th className="p-1.5 w-24">Nilai</th>
                        <th className="p-1.5 w-28">Basis</th>
                        <th className="p-1.5 w-24">Efek</th>
                        <th className="p-1.5 w-10 text-center">Bulat</th>
                        <th className="p-1.5 w-32 text-right">Hasil (Rp)</th>
                        <th className="p-1.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {calcRows.map((r) => {
                        const locked = r.kind === "discount" || r.kind === "dpp";
                        return (
                          <tr key={r.id} className={`border-t border-slate-700/60 ${r.enabled ? "" : "opacity-50"}`}>
                            <td className="p-1.5"><input type="checkbox" checked={r.enabled} onChange={(e) => updateRow(r.id, { enabled: e.target.checked })} className="accent-amber-500 w-4 h-4" /></td>
                            <td className="p-1.5"><input value={r.label} onChange={(e) => updateRow(r.id, { label: e.target.value })} className={miniCls} /></td>
                            <td className="p-1.5">
                              <select value={r.mode} onChange={(e) => updateRow(r.id, { mode: e.target.value as CalcMode })} className={miniCls}>
                                {MODE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                              </select>
                            </td>
                            <td className="p-1.5"><input value={r.value} placeholder={r.mode === "factor" ? "11/12" : "0"} onChange={(e) => updateRow(r.id, { value: e.target.value })} className={`${miniCls} text-right font-mono`} /></td>
                            <td className="p-1.5">
                              <select value={r.base} disabled={locked || r.mode === "amount"} onChange={(e) => updateRow(r.id, { base: e.target.value as CalcBase })} className={miniCls}>
                                {BASE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                              </select>
                            </td>
                            <td className="p-1.5">
                              <select value={r.effect} disabled={locked} onChange={(e) => updateRow(r.id, { effect: e.target.value as CalcEffect })} className={miniCls}>
                                {EFFECT_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                              </select>
                            </td>
                            <td className="p-1.5 text-center"><input type="checkbox" checked={r.round} onChange={(e) => updateRow(r.id, { round: e.target.checked })} className="accent-amber-500 w-4 h-4" /></td>
                            <td className="p-1.5 text-right font-mono text-amber-300">{r.enabled ? fmt(summary.amounts[r.id] ?? 0) : "-"}</td>
                            <td className="p-1.5">
                              {!locked && (
                                <button onClick={() => removeRow(r.id)} className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  Tips: Mode <b>× Faktor</b> menerima pecahan (mis. <code>11/12</code>). Nilai Rp bisa ditulis <code>1.000.000</code>. Setting disimpan otomatis per QO.
                </p>
              </Card>
            </div>

            {/* RIGHT: live preview */}
            <div className="lg:sticky lg:top-0 h-fit">
              <Card title="Preview Total" right={<Calculator className="w-4 h-4 text-amber-400" />}>
                <div className="rounded-lg overflow-hidden border border-slate-700">
                  {summary.lines.map((l) => (
                    <div
                      key={l.key}
                      className={`grid grid-cols-[1fr_auto_8.5rem] gap-2 px-3 py-2 text-sm border-b border-slate-700/60 last:border-b-0 ${
                        l.variant === "grand" ? "bg-amber-500/15 text-amber-300 font-bold" : l.variant === "sub" ? "bg-slate-800 text-white font-semibold" : "text-slate-300"
                      }`}
                    >
                      <span className="truncate">{l.label}</span>
                      <span className="text-slate-500">Rp</span>
                      <span className="text-right font-mono">{fmt(l.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1 text-[11px] text-slate-400">
                  {groupedData.groups.map((g) => (
                    <div key={g.motherPart} className="flex justify-between gap-2">
                      <span className="truncate">{g.motherPart}</span>
                      <span className="font-mono">{fmt(g.subTotal)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-800 border-t border-slate-700 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-400">Grand Total: <b className="text-amber-300 font-mono">Rp {fmt(summary.grandTotal)}</b></span>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium disabled:opacity-50">Batal</button>
                            <button type="button" onClick={executeInvoiceExcel} disabled={busy} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                {isSaving ? "Menyimpan..." : "Export Excel"}
              </button>
              <button type="button" onClick={executeInvoiceWord} disabled={busy} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {isSaving ? "Menyimpan..." : "Generate Word"}
              </button>
              <button type="button" onClick={executeInvoicePrint} disabled={busy} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {isSaving ? "Menyimpan..." : "Generate PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== HIDDEN PRINT LAYOUT ===================== */}
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #fff !important; }
          #print-area-invoice { page-break-after: avoid !important; }
          #print-area-invoice tr { page-break-inside: avoid; }
        }
      `}</style>

      <div id="print-area-invoice" className="hidden print:flex flex-col bg-white text-black font-sans w-full text-xs box-border">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-3">
          <div className="w-48 h-12 flex items-center">
            <img src="/image/transindo.png" alt="Logo" className="max-h-12 w-auto object-contain" />
          </div>
          <div className="text-right leading-tight text-[9.5px]">
            <h1 className="text-xs font-bold uppercase tracking-wider">PT. TRANSINDO MULTI INDUSTRI</h1>
            <p>www.transindomu.com</p>
            <p>Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14</p>
            <p>Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514</p>
            <p>Phone : (+62) 8516 3657 641 email : sales@transindomu.com</p>
          </div>
        </div>

        <h2 className="text-sm font-bold uppercase tracking-widest border-b border-black pb-0.5 my-1.5 text-center">INVOICE</h2>

        {/* Info */}
        <div className="grid grid-cols-2 gap-3 border-b border-black pb-2 mb-3 text-[10.5px]">
          <div className="space-y-0.5">
            {[["To", invoiceCustomer], ["Attn", invoiceAttn || "-"], ["Address", invoiceAddress || "-"], ["Phone", invoicePhone || "-"]].map(([k, v]) => (
              <div key={k} className="flex"><span className="w-16 font-semibold">{k}</span><span className="flex-1">: {v}</span></div>
            ))}
          </div>
          <div className="space-y-0.5 pl-3 border-l border-gray-300">
            {[["Invoice No", invoiceNo], ["Date", formatDateID(invoiceDate)], ["Email", "sales@transindomu.com"], ["Revision", invoiceRevision]].map(([k, v]) => (
              <div key={k} className="flex"><span className="w-24 font-semibold">{k}</span><span>: {v}</span></div>
            ))}
          </div>
        </div>

        {/* Items */}
        <table className={`w-full border-collapse border border-black ${isCompact ? "text-[9.5px]" : "text-[10.5px]"}`}>
          <thead>
            <tr className="bg-blue-100/50 text-left font-semibold">
              <th className={`border border-black w-8 text-center ${padC}`}>No</th>
              <th className={`border border-black ${pad}`}>Description Item</th>
              <th className={`border border-black w-16 text-center ${padC}`}>Qty</th>
              <th className={`border border-black w-28 text-right ${pad}`}>Unit Price</th>
              <th className={`border border-black w-32 text-right ${pad}`}>Total Price</th>
            </tr>
          </thead>
          <tbody>
            {groupedData.groups.map((g, gi) => (
              <React.Fragment key={`g-${gi}`}>
                <tr className="bg-gray-100/60 font-semibold">
                  <td colSpan={5} className={`border border-black ${pad}`}>{g.motherPart}</td>
                </tr>
                {g.items.map((it: any) => (
                  <tr key={it.id || it.printIndex} className="align-top">
                    <td className={`border-x border-black text-center ${padC}`}>{it.printIndex}</td>
                    <td className={`border-x border-black ${pad}`}>
                      <div className="leading-snug break-words"><span className="font-bold">{it.description || "-"}</span> - {it.technical_specification || "-"}</div>
                    </td>
                    <td className={`border-x border-black text-center whitespace-nowrap ${padC}`}>{it.qty} {it.unit || "EA"}</td>
                    <td className={`border-x border-black text-right whitespace-nowrap ${pad}`}>Rp{fmt(it.unitPriceWithMargin)}</td>
                    <td className={`border-x border-black text-right font-semibold whitespace-nowrap ${pad}`}>Rp{fmt(it.totalPrice)}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50/50 font-semibold border-y border-black">
                  <td colSpan={4} className={`border-x border-black text-right ${pad}`}>Total {g.motherPart}</td>
                  <td className={`border-x border-black text-right ${pad}`}>Rp{fmt(g.subTotal)}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Summary (flexible) */}
        <div className="flex justify-end mt-2 mb-3 break-inside-avoid">
          <table className={`border-collapse border border-black w-[55%] ${isCompact ? "text-[10px]" : "text-[11px]"}`}>
            <tbody>
              {summary.lines.map((l) => (
                <tr key={l.key} className={l.variant === "grand" ? "bg-blue-100/60 font-bold" : l.variant === "sub" ? "bg-blue-50/50 font-semibold" : ""}>
                  <td className="border border-black px-2 py-1">{l.label}</td>
                  <td className="border border-black px-2 py-1 w-10">Rp</td>
                  <td className="border border-black px-2 py-1 text-right w-36 whitespace-nowrap">{fmt(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="break-inside-avoid flex justify-between items-start gap-4 mt-1">
          <div className="flex-1 space-y-2 text-[9.5px] leading-tight">
            <div><h3 className="font-bold mb-0.5">Payment Method :</h3><div className="whitespace-pre-wrap pl-2">{invoicePaymentMethod}</div></div>
            <div>
              <h3 className="font-bold mb-0.5">Bank Transfer :</h3>
              <div className="pl-2"><p>Bank : BANK BNI</p><p>Account Name : PT. TRANSINDO MULTI INDUSTRI</p><p>Account Number : 2089710424</p></div>
            </div>
          </div>
          <div className="text-center w-48 shrink-0">
            <p className="font-bold mb-1 text-[10.5px]">Approved By</p>
            <div className={isCompact ? "h-12" : "h-16"} />
            <p className="font-bold underline uppercase border-t border-black pt-0.5 text-[10.5px]">{invoiceApprovedBy || DEFAULT_APPROVER}</p>
            <p className="font-bold text-[9.5px]">Finance & Tax Control</p>
          </div>
        </div>
      </div>
    </>
  );
}