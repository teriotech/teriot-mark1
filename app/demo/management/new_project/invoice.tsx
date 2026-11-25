"use client";

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Receipt, X, Printer, Loader2, FileText, Plus, Minus, Trash2, RotateCcw, Calculator, FileSpreadsheet, Eye, Pencil,
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, ListOrdered, Undo2, Redo2, Eraser, Type,
  ZoomIn, ZoomOut, ArrowLeft, Save, SeparatorHorizontal, Check, AlertCircle, Info, Highlighter, TextCursorInput,
  History, ExternalLink, RefreshCw, FolderOpen, Clock3,
} from "lucide-react";
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
type ActionKey = "save" | "excel" | "word" | "pdf" | "preview" | "history" | "history-delete";
type Toast = { type: "success" | "error" | "info"; msg: string } | null;
type Logo = { src: string; width: number; height: number };

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

interface InvoiceHistoryItem {
  pdfPath: string;
  jsonPath: string;
  fileName: string;
  invoiceNo: string;
  revision: number;
  savedAt: string;
  size: number;
  signedUrl: string | null;
  sourceRevision?: number | null;
}

interface InvoiceEditorState {
  version: number;
  invoiceCustomer: string;
  invoiceAttn: string;
  invoiceAddress: string;
  invoicePhone: string;
  invoiceNo: string;
  referenceQo: string;
  invoiceRevision: string;
  invoicePaymentMethod: string;
  invoiceApprovedBy: string;
  invoiceDate: string;
  calcRows: CalcRow[];
  documentHtml: string;
}

const COMPANY = "PT. TRANSINDO MULTI INDUSTRI";
const COMPANY_LINES = [
  "www.transindomu.com",
  "Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14",
  "Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514",
  "Phone : (+62) 8516 3657 641 email : sales@transindomu.com",
];
const COMPANY_EMAIL = "sales@transindomu.com";
const BANK_LINES = ["Bank : BANK BNI", `Account Name : ${COMPANY}`, "Account Number : 2089710424"];
const DEFAULT_PAYMENT = "a. Direct Payment to PT. Transindo Multi Industri\nb. Term of Payment 14 days";
const DEFAULT_APPROVER = "Meita Surya";
const APPROVER_ROLE = "Finance & Tax Control";
const LOGO_URL = "/image/transindo.png";
const STORAGE_PREFIX = "invoice_calc_";
const FONT_SIZES = [7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

// Padding kertas preview = margin @page saat print (harus sama agar posisi identik)
const PAGE_MARGIN_Y_MM = 8;
const PAGE_MARGIN_X_MM = 10;
const MM_TO_PX = 96 / 25.4;
const PAD_TOP_PX = PAGE_MARGIN_Y_MM * MM_TO_PX;
const PAD_LEFT_PX = PAGE_MARGIN_X_MM * MM_TO_PX;

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
const getTodayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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

const fmt = (n: number) => (Number(n) || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const nl2br = (v: unknown) => esc(v).replace(/\r?\n/g, "<br/>");

// Parse "YYYY-MM-DD" sebagai tanggal LOKAL (bukan UTC) agar tidak mundur 1 hari
const formatDateID = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!m) return "-";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

const sanitizeFileName = (s: string) =>
  s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").replace(/_+/g, "_").slice(0, 150);

const clientErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message || "").trim();
    if (message) return message;
  }
  // Jangan menampilkan thrown string/Event mentah. Pada kegagalan SVG tertentu,
  // nilainya dapat berupa textContent elemen material yang sedang dirender.
  return fallback;
};

const estLines = (s: string, width: number) =>
  String(s || "").split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / width)), 0);

async function jsonFetch(url: string, method: "POST" | "PUT", body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status} (${url})`);
  return json;
}

async function getJson(url: string) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
  return json;
}

const getBase64ImageWithSize = async (url: string, maxW: number, maxH: number): Promise<Logo> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("logo not found");
    const blob = await res.blob();
    const src = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const { w, h } = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || maxW, h: img.naturalHeight || maxH });
      img.onerror = () => resolve({ w: maxW, h: maxH });
      img.src = src;
    });
    const scale = Math.min(maxW / w, maxH / h, 1);
    return { src, width: Math.round(w * scale), height: Math.round(h * scale) };
  } catch {
    return { src: "", width: maxW, height: maxH };
  }
};

// Validasi data localStorage agar tidak crash jika format lama/rusak
const loadRows = (raw: string | null): CalcRow[] => {
  if (!raw) return DEFAULT_ROWS;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || !arr.length) return DEFAULT_ROWS;
    const valid = arr.filter((r) => r && typeof r.id === "string" && ["discount", "dpp", "tax", "custom"].includes(r.kind));
    if (!valid.length) return DEFAULT_ROWS;
    return valid.map((r) => ({
      id: r.id,
      kind: r.kind,
      label: String(r.label ?? ""),
      enabled: r.enabled !== false,
      mode: ["percent", "amount", "factor"].includes(r.mode) ? r.mode : "percent",
      value: String(r.value ?? "0"),
      base: ["subtotal", "afterDiscount", "dpp"].includes(r.base) ? r.base : "afterDiscount",
      effect: ["add", "subtract", "info"].includes(r.effect) ? r.effect : "add",
      round: !!r.round,
    }));
  } catch {
    return DEFAULT_ROWS;
  }
};

function computeSummary(subTotal: number, rows: CalcRow[]) {
  const amounts: Record<string, number> = {};
  const active = rows.filter((r) => r.enabled);
  const calc = (r: CalcRow, baseVal: number) => {
    const v = r.mode === "amount" ? parseNum(r.value, true) : baseVal * (r.mode === "percent" ? parseNum(r.value) / 100 : parseNum(r.value));
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
  active.filter((r) => r.kind !== "discount").forEach((r) => lines.push({ key: r.id, label: r.label, amount: amounts[r.id], variant: "normal" }));
  lines.push({ key: "grand", label: "Grand Total", amount: grandTotal, variant: "grand" });

  return { amounts, discount, afterDiscount, dpp, grandTotal, lines };
}

/* ===================== DOCUMENT HTML BUILDER (Preview/PDF & Word) ===================== */
interface InvoiceDocParams {
  customer: string;
  attn: string;
  address: string;
  phone: string;
  invoiceNo: string;
  date: string;
  revision: string;
  groups: any[];
  lines: SummaryLine[];
  payment: string;
  approvedBy: string;
  logo: Logo;
}

function buildInvoiceHtml(p: InvoiceDocParams): string {
  const itemCount = p.groups.reduce((n, g) => n + g.items.length, 0);
  const compact = itemCount > 5;
  const fs = compact ? "8pt" : "8.5pt";
  const pad = compact ? "3px 4px" : "4px 6px";
  const td = (extra = "") => `style="border:1px solid #000;padding:${pad};vertical-align:top;${extra}"`;
  const th = (extra = "") =>
    `style="border:1px solid #000;padding:${pad};background:#dbeafe;font-weight:bold;text-align:left;vertical-align:middle;${extra}"`;
  const nb = "border:none;padding:1px 0;vertical-align:top;";

  const infoRows = (rows: [string, string, string?][], labelW: number) =>
    rows
      .map(
        ([k, v, field]) =>
          `<tr${field ? ` data-invoice-field="${esc(field)}"` : ""}><td style="${nb}width:${labelW}px;font-weight:bold;white-space:nowrap;">${esc(k)}</td><td style="${nb}">: ${nl2br(v)}</td></tr>`
      )
      .join("");

  const left: [string, string, string?][] = [
    ["To", p.customer || "-", "customer"],
    ["Attn", p.attn || "-", "attn"],
    ["Address", p.address || "-", "address"],
    ["Phone", p.phone || "-", "phone"],
  ];
  const right: [string, string, string?][] = [
    ["Invoice No", p.invoiceNo, "invoice-no"],
    ["Date", p.date, "date"],
    ["Email", COMPANY_EMAIL, "email"],
    ["Revision", p.revision || "0", "revision"],
  ];

  const body = p.groups
    .map(
      (g: any) => `
      <tr><td colspan="5" ${td("background:#f3f4f6;font-weight:bold;")}>${esc(g.motherPart)}</td></tr>
      ${g.items
        .map(
          (it: any) => `<tr>
          <td ${td("text-align:center;")}>${it.printIndex}</td>
          <td ${td()}><b>${nl2br(it.description || "-")}</b> - ${nl2br(it.technical_specification || "-")}</td>
          <td ${td("text-align:center;white-space:nowrap;")}>${esc(it.qtyNum)} ${esc(it.unit || "EA")}</td>
          <td ${td("text-align:right;white-space:nowrap;")}>Rp${fmt(it.unitPriceWithMargin)}</td>
          <td ${td("text-align:right;white-space:nowrap;font-weight:bold;")}>Rp${fmt(it.totalPrice)}</td>
        </tr>`
        )
        .join("")}
      <tr>
        <td colspan="4" ${td("text-align:right;background:#eff6ff;font-weight:bold;")}>Total ${esc(g.motherPart)}</td>
        <td ${td("text-align:right;background:#eff6ff;font-weight:bold;white-space:nowrap;")}>Rp${fmt(g.subTotal)}</td>
      </tr>`
    )
    .join("");

  const summaryRows = p.lines
    .map((l) => {
      const bg = l.variant === "grand" ? "#dbeafe" : l.variant === "sub" ? "#eff6ff" : "#ffffff";
      const fw = l.variant === "normal" ? "normal" : "bold";
      const c = `border:1px solid #000;padding:3px 6px;background:${bg};font-weight:${fw};`;
      return `<tr>
        <td style="${c}">${esc(l.label)}</td>
        <td style="${c}width:30px;">Rp</td>
        <td style="${c}text-align:right;white-space:nowrap;width:130px;">${fmt(l.amount)}</td>
      </tr>`;
    })
    .join("");

  const logoHtml = p.logo.src
    ? `<img src="${p.logo.src}" width="${p.logo.width}" height="${p.logo.height}" alt="Logo" style="width:${p.logo.width}px;height:${p.logo.height}px;" />`
    : `<b>${COMPANY}</b>`;

  return `<div class="dp-doc" style="font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#000;line-height:1.35;">
  <table style="width:100%;border-collapse:collapse;border-bottom:2px solid #000;">
    <tr>
      <td style="border:none;width:40%;vertical-align:middle;padding:0 0 6px 0;">${logoHtml}</td>
      <td style="border:none;text-align:right;vertical-align:middle;font-size:7.5pt;line-height:1.3;padding:0 0 6px 0;">
        <div style="font-size:9.5pt;font-weight:bold;letter-spacing:0.5px;">${COMPANY}</div>${COMPANY_LINES.map(esc).join("<br/>")}
      </td>
    </tr>
  </table>
  <div style="text-align:center;font-size:12pt;font-weight:bold;letter-spacing:3px;padding:6px 0 3px;border-bottom:1px solid #000;margin-bottom:8px;">INVOICE</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <tr>
      <td style="border:none;width:55%;vertical-align:top;padding:0 10px 6px 0;">
        <table style="width:100%;border-collapse:collapse;">${infoRows(left, 62)}</table>
      </td>
      <td style="border:none;border-left:1px solid #9ca3af;width:45%;vertical-align:top;padding:0 0 6px 10px;">
        <table style="width:100%;border-collapse:collapse;">${infoRows(right, 80)}</table>
      </td>
    </tr>
  </table>
  <table style="width:100%;border-collapse:collapse;font-size:${fs};margin-bottom:8px;">
    <thead>
      <tr>
        <th ${th("width:5%;text-align:center;")}>No</th>
        <th ${th()}>Description Item</th>
        <th ${th("width:11%;text-align:center;")}>Qty</th>
        <th ${th("width:18%;text-align:right;")}>Unit Price</th>
        <th ${th("width:19%;text-align:right;")}>Total Price</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
    <tr>
      <td style="border:none;width:45%;"></td>
      <td style="border:none;padding:0;">
        <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">${summaryRows}</table>
      </td>
    </tr>
  </table>
  <table style="width:100%;border-collapse:collapse;font-size:8pt;">
    <tr>
      <td style="border:none;vertical-align:top;width:62%;padding-right:10px;">
        <div style="font-weight:bold;margin-bottom:2px;">Payment Method :</div>
        <div style="padding-left:10px;margin-bottom:6px;">${nl2br(p.payment)}</div>
        <div style="font-weight:bold;margin-bottom:2px;">Bank Transfer :</div>
        <div style="padding-left:10px;">${BANK_LINES.map(esc).join("<br/>")}</div>
      </td>
      <td style="border:none;vertical-align:top;text-align:center;">
        <div style="font-weight:bold;">Approved By</div>
        <br/><br/><br/><br/>
        <div style="font-weight:bold;text-decoration:underline;text-transform:uppercase;">${esc(p.approvedBy)}</div>
        <div style="font-weight:bold;font-size:7.5pt;">${APPROVER_ROLE}</div>
      </td>
    </tr>
  </table>
</div>`;
}

/* ===================== CSS PREVIEW (tidak dipakai saat print) ===================== */
const PREVIEW_CSS = `
.dp-paper{width:210mm;min-height:297mm;padding:${PAGE_MARGIN_Y_MM}mm ${PAGE_MARGIN_X_MM}mm;margin:0 auto;box-sizing:border-box;position:relative;background:#fff;color:#000;box-shadow:0 10px 30px rgba(15,23,42,.18),0 0 0 1px rgba(15,23,42,.06);border-radius:2px;outline:none;}
.dp-paper.dp-guides{background:repeating-linear-gradient(to bottom,transparent 0,transparent calc(281mm - 1px),rgba(239,68,68,.6) calc(281mm - 1px),rgba(239,68,68,.6) 281mm) content-box,#fff;}
.dp-paper.dp-editing{cursor:text;}
.dp-paper.dp-editing td:hover,.dp-paper.dp-editing th:hover{box-shadow:inset 0 0 0 1px rgba(245,158,11,.45);}
.dp-paper.dp-editing:focus-within{box-shadow:0 10px 30px rgba(15,23,42,.18),0 0 0 2px rgba(245,158,11,.45);}
.dp-paper img{max-width:100%;}
.dp-textbox{position:absolute;min-width:60px;padding:2px 4px;border:1px dashed #f59e0b;border-radius:2px;z-index:2;}
.dp-paper:not(.dp-editing) .dp-textbox{border-color:transparent;}
.dp-tb-handle,.dp-tb-del{position:absolute;top:-18px;height:17px;padding:0 6px;font:600 10px/17px system-ui,sans-serif;color:#fff;border-radius:4px 4px 0 0;user-select:none;}
.dp-tb-handle{left:-1px;background:#d97706;cursor:move;touch-action:none;}
.dp-tb-del{right:-1px;background:#ef4444;cursor:pointer;}
.dp-paper:not(.dp-editing) .dp-tb-handle,.dp-paper:not(.dp-editing) .dp-tb-del{display:none;}
.dp-tb-body{outline:none;min-height:1.2em;white-space:pre-wrap;}
.dp-pagebreak{position:relative;height:0;border-top:2px dashed #94a3b8;margin:12px 0;}
.dp-pagebreak::after{content:"PAGE BREAK";position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#fff;color:#64748b;font:600 9px/14px system-ui,sans-serif;padding:0 6px;letter-spacing:1px;}
.dp-paper tr.dp-break-before > td{border-top:2px dashed #f59e0b !important;}
`;

/* ===================== PRINT VIA IFRAME (terisolasi dari CSS aplikasi) ===================== */
const PRINT_CSS = `
@page{size:A4 portrait;margin:${PAGE_MARGIN_Y_MM}mm ${PAGE_MARGIN_X_MM}mm;}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#fff;color:#000;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
.dp-print-root{position:relative;width:100%;}
img{max-width:100%;}
table{border-collapse:collapse;}
tr{break-inside:avoid;page-break-inside:avoid;}
thead{display:table-header-group;}
tr.dp-break-before{break-before:page;page-break-before:always;}
.dp-pagebreak{display:block;height:0;border:0 !important;margin:0 !important;break-after:page;page-break-after:always;}
.dp-textbox{position:absolute;padding:2px 4px;border:none !important;z-index:2;}
.dp-tb-body{white-space:pre-wrap;}
`;

function printHtmlViaIframe(innerHtml: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    document.querySelectorAll("iframe[data-dp-print]").forEach((f) => f.remove());

    const iframe = document.createElement("iframe");
    iframe.setAttribute("data-dp-print", "1");
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");
    // JANGAN display:none / visibility:hidden -> menyebabkan PDF putih
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "210mm",
      height: "297mm",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-1",
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument || win?.document;
    if (!win || !doc) {
      iframe.remove();
      return reject(new Error("Browser tidak mendukung print via iframe."));
    }

    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="${window.location.origin}/"><title>${esc(
        title
      )}</title><style>${PRINT_CSS}</style></head><body><div class="dp-print-root">${innerHtml}</div></body></html>`
    );
    doc.close();

    const originalTitle = document.title;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.title = originalTitle;
      iframe.remove();
    };

    const run = async () => {
      try {
        await Promise.all(
          Array.from(doc.images).map(async (img) => {
            try {
              if (!(img.complete && img.naturalWidth > 0)) {
                await new Promise<void>((r) => {
                  img.addEventListener("load", () => r(), { once: true });
                  img.addEventListener("error", () => r(), { once: true });
                  setTimeout(r, 4000);
                });
              }
              if (typeof img.decode === "function") await img.decode().catch(() => {});
            } catch {
              /* ignore */
            }
          })
        );
        const fonts = (doc as any).fonts;
        if (fonts?.ready) await fonts.ready;
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 250)));

        document.title = title; // nama default "Save as PDF"
        win.addEventListener("afterprint", () => setTimeout(cleanup, 1000), { once: true });
        win.focus();
        win.print();
        setTimeout(cleanup, 120000); // jangan hapus iframe langsung
        resolve();
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    if (doc.readyState === "complete") setTimeout(run, 50);
    else iframe.addEventListener("load", () => run(), { once: true });
  });
}


/* ===================== PDF BLOB (untuk Supabase Storage) ===================== */
const A4_PX = { width: 794, height: 1123 };
const PDF_PAGE_PT = { width: 595.28, height: 841.89 };

const concatBytes = (parts: Uint8Array[]) => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
};

const canvasToJpeg = (canvas: HTMLCanvasElement, quality = 0.92) =>
  new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error("Browser gagal membuat gambar PDF."));
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/jpeg", quality);
  });

function jpegPagesToPdf(pages: { bytes: Uint8Array; width: number; height: number }[]): Blob {
  if (!pages.length) throw new Error("Tidak ada halaman untuk dibuat menjadi PDF.");
  const encoder = new TextEncoder();
  const ascii = (value: string) => encoder.encode(value);
  const objects: Uint8Array[] = [];
  const pageObjectIds = pages.map((_, index) => 3 + index * 3);

  objects[1] = ascii("<< /Type /Catalog /Pages 2 0 R >>");
  objects[2] = ascii(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);

  pages.forEach((page, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    objects[pageId] = ascii(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_PT.width} ${PDF_PAGE_PT.height}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    objects[imageId] = concatBytes([
      ascii(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`),
      page.bytes,
      ascii("\nendstream"),
    ]);
    const content = ascii(`q\n${PDF_PAGE_PT.width} 0 0 ${PDF_PAGE_PT.height} 0 0 cm\n/Im0 Do\nQ`);
    objects[contentId] = concatBytes([
      ascii(`<< /Length ${content.length} >>\nstream\n`),
      content,
      ascii("\nendstream"),
    ]);
  });

  const chunks: Uint8Array[] = [ascii("%PDF-1.4\n%âãÏÓ\n")];
  const offsets = new Array(objects.length).fill(0);
  let cursor = chunks[0].length;
  for (let id = 1; id < objects.length; id++) {
    const chunk = concatBytes([ascii(`${id} 0 obj\n`), objects[id], ascii("\nendobj\n")]);
    offsets[id] = cursor;
    chunks.push(chunk);
    cursor += chunk.length;
  }

  const xrefOffset = cursor;
  const xref = [
    `xref\n0 ${objects.length}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  ].join("");
  chunks.push(ascii(xref));
  return new Blob([concatBytes(chunks)], { type: "application/pdf" });
}

async function renderHtmlToRasterPdfBlob(innerHtml: string): Promise<Blob> {
  if (!innerHtml.trim()) throw new Error("Konten invoice kosong.");
  const host = document.createElement("div");
  host.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  Object.assign(host.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${A4_PX.width}px`,
    minHeight: `${A4_PX.height}px`,
    padding: `${Math.round(PAD_TOP_PX)}px ${Math.round(PAD_LEFT_PX)}px`,
    boxSizing: "border-box",
    background: "#fff",
    color: "#000",
    fontFamily: "Arial, Helvetica, sans-serif",
    overflow: "hidden",
    zIndex: "-1",
  } as Partial<CSSStyleDeclaration>);
  host.innerHTML = `<style>${PRINT_CSS}</style><div class="dp-print-root">${innerHtml}</div>`;
  document.body.appendChild(host);

  try {
    await Promise.all(
      Array.from(host.querySelectorAll<HTMLImageElement>("img")).map(async (img) => {
        if (!(img.complete && img.naturalWidth > 0)) {
          await new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
            window.setTimeout(resolve, 4000);
          });
        }
        if (typeof img.decode === "function") await img.decode().catch(() => {});
      })
    );
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const totalHeight = Math.max(A4_PX.height, host.scrollHeight);
    const printableHost = host.cloneNode(true) as HTMLDivElement;
    Object.assign(printableHost.style, {
      position: "static",
      left: "0",
      top: "0",
      zIndex: "auto",
    } as Partial<CSSStyleDeclaration>);
    const serialized = new XMLSerializer().serializeToString(printableHost);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_PX.width}" height="${totalHeight}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Browser gagal merender invoice menjadi PDF."));
        img.src = svgUrl;
      });

      const scale = 1.5;
      const full = document.createElement("canvas");
      full.width = Math.round(A4_PX.width * scale);
      full.height = Math.round(totalHeight * scale);
      const fullCtx = full.getContext("2d");
      if (!fullCtx) throw new Error("Canvas PDF tidak tersedia.");
      fullCtx.fillStyle = "#fff";
      fullCtx.fillRect(0, 0, full.width, full.height);
      fullCtx.drawImage(image, 0, 0, full.width, full.height);

      const pageHeightPx = Math.round(A4_PX.height * scale);
      const pageCount = Math.max(1, Math.ceil(full.height / pageHeightPx));
      const pages: { bytes: Uint8Array; width: number; height: number }[] = [];
      for (let index = 0; index < pageCount; index++) {
        const page = document.createElement("canvas");
        page.width = full.width;
        page.height = pageHeightPx;
        const ctx = page.getContext("2d");
        if (!ctx) throw new Error("Canvas halaman PDF tidak tersedia.");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, page.width, page.height);
        const sourceY = index * pageHeightPx;
        const sourceHeight = Math.min(pageHeightPx, full.height - sourceY);
        ctx.drawImage(full, 0, sourceY, full.width, sourceHeight, 0, 0, full.width, sourceHeight);
        pages.push({ bytes: await canvasToJpeg(page), width: page.width, height: page.height });
      }
      return jpegPagesToPdf(pages);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  } finally {
    host.remove();
  }
}

/*
 * Fallback yang tidak memakai SVG foreignObject.
 * Beberapa browser/WebView gagal merender foreignObject ketika isi tabel memiliki
 * karakter/markup tertentu. Error-nya kadang justru berisi teks item pertama
 * (mis. nama material), bukan pesan error yang berguna. Fallback ini menggambar
 * isi invoice sebagai teks ke canvas A4 sehingga PDF tetap dapat di-upload dan
 * alur history/revision tidak terputus.
 */
const extractInvoiceTextLines = (innerHtml: string) => {
  const doc = new DOMParser().parseFromString(`<div id="dp-pdf-source">${innerHtml}</div>`, "text/html");
  const root = doc.getElementById("dp-pdf-source");
  if (!root) return ["INVOICE"];

  root.querySelectorAll("script,style,.dp-tb-handle,.dp-tb-del").forEach((node) => node.remove());
  const lines: string[] = [];
  const clean = (value: string) => value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
  const push = (value: string) => {
    const text = clean(value);
    if (text && lines[lines.length - 1] !== text) lines.push(text);
  };

  root.querySelectorAll("tr").forEach((row) => {
    const cells = Array.from(row.children)
      .filter((cell) => cell.tagName === "TH" || cell.tagName === "TD")
      .map((cell) => clean(cell.textContent || ""))
      .filter(Boolean);
    if (cells.length) push(cells.join("  |  "));
  });

  root.querySelectorAll(".dp-textbox,.dp-doc > div,.dp-doc > p").forEach((node) => {
    if (!node.closest("tr")) push(node.textContent || "");
  });

  if (!lines.length) {
    (root.textContent || "")
      .split(/\r?\n/)
      .forEach(push);
  }
  return lines.length ? lines : ["INVOICE"];
};

const wrapCanvasText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) => {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const rows: string[] = [];
  let current = words[0];
  for (let index = 1; index < words.length; index++) {
    const next = `${current} ${words[index]}`;
    if (ctx.measureText(next).width <= maxWidth) current = next;
    else {
      rows.push(current);
      current = words[index];
    }
  }
  rows.push(current);
  return rows;
};

async function renderHtmlToTextPdfBlob(innerHtml: string): Promise<Blob> {
  const width = 1240;
  const height = 1754;
  const marginX = 72;
  const marginTop = 78;
  const marginBottom = 72;
  const lineHeight = 27;
  const font = "20px Arial, Helvetica, sans-serif";
  const lines = extractInvoiceTextLines(innerHtml);
  const pages: { bytes: Uint8Array; width: number; height: number }[] = [];

  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak menyediakan canvas untuk membuat PDF.");

  const resetPage = () => {
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak menyediakan canvas untuk membuat PDF.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#111827";
    ctx.font = font;
    ctx.textBaseline = "top";
  };

  const finishPage = async () => {
    pages.push({ bytes: await canvasToJpeg(canvas, 0.94), width, height });
  };

  resetPage();
  let y = marginTop;
  for (const sourceLine of lines) {
    const wrapped = wrapCanvasText(ctx!, sourceLine, width - marginX * 2);
    for (const line of wrapped) {
      if (y + lineHeight > height - marginBottom) {
        await finishPage();
        resetPage();
        y = marginTop;
      }
      ctx!.fillText(line, marginX, y);
      y += lineHeight;
    }
    y += 5;
  }
  await finishPage();
  return jpegPagesToPdf(pages);
}

async function renderHtmlToPdfBlob(innerHtml: string): Promise<Blob> {
  if (!innerHtml.trim()) throw new Error("Konten invoice kosong.");
  try {
    return await renderHtmlToRasterPdfBlob(innerHtml);
  } catch (error) {
    // Jangan meneruskan DOM/SVG event mentah: pada beberapa browser nilainya
    // dapat berubah menjadi teks material dan tampil sebagai pesan error.
    console.warn("Render PDF visual gagal; menggunakan fallback PDF teks.", error);
    return await renderHtmlToTextPdfBlob(innerHtml);
  }
}

const formatSavedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

function replaceRevisionInHtml(html: string, revision: number) {
  const doc = new DOMParser().parseFromString(`<div id="invoice-root">${html}</div>`, "text/html");
  const root = doc.getElementById("invoice-root");
  const valueCell = root?.querySelector('[data-invoice-field="revision"] td:nth-child(2)');
  if (valueCell) valueCell.textContent = `: ${revision}`;
  return root?.innerHTML || html;
}

/* ===================== SMALL UI ===================== */
const inputCls =
  "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition";
const miniCls =
  "w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-slate-800 text-xs focus:outline-none focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-400";

function Field({ label, children, className = "", required }: { label: string; children: React.ReactNode; className?: string; required?: boolean }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function ToolBtn({ title, onClick, children, active, disabled }: { title: string; onClick: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-8 min-w-[2rem] px-1.5 inline-flex items-center justify-center gap-1 rounded-md text-xs font-medium transition disabled:opacity-40 ${
        active ? "bg-amber-100 text-amber-700" : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="w-px h-6 bg-slate-200 mx-1" />;

/* ===================== EDITABLE PREVIEW (seperti iLovePDF) ===================== */
interface PreviewProps {
  initialHtml: string;
  freshHtml: string;
  title: string;
  subtitle: string;
  busy: ActionKey | null;
  onClose: (html: string, dirty: boolean) => void;
  onPrint: (printHtml: string) => void;
  onWord: (cleanHtml: string) => void;
}

function EditablePreview({ initialHtml, freshHtml, title, subtitle, busy, onClose, onPrint, onWord }: PreviewProps) {
  const paperRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<Range | null>(null);
  const zoomRef = useRef(1);
  const dirtyRef = useRef(initialHtml !== freshHtml);
  const hintTimer = useRef<number | null>(null);

  const [zoom, setZoom] = useState(() =>
    typeof window === "undefined" ? 1 : Math.min(1, Math.max(0.5, Math.floor(((window.innerWidth - 48) / 794) * 10) / 10))
  );
  const [editing, setEditing] = useState(true);
  const [guides, setGuides] = useState(true);
  const [dirty, setDirty] = useState(initialHtml !== freshHtml);
  const [hint, setHint] = useState<string | null>(null);

  zoomRef.current = zoom;

  const markDirty = useCallback(() => {
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      setDirty(true);
    }
  }, []);

  const flash = useCallback((msg: string) => {
    setHint(msg);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), 3200);
  }, []);

  useLayoutEffect(() => {
    if (paperRef.current) paperRef.current.innerHTML = initialHtml;
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p = paperRef.current;
    if (!p) return;
    p.contentEditable = editing ? "true" : "false";
    p.querySelectorAll<HTMLElement>(".dp-tb-body").forEach((b) => (b.contentEditable = editing ? "true" : "false"));
  }, [editing]);

  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;

    const onInput = () => markDirty();
    const onSelChange = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        if (paper.contains(r.commonAncestorContainer)) rangeRef.current = r.cloneRange();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      const del = t.closest(".dp-tb-del");
      if (del) {
        e.preventDefault();
        del.parentElement?.remove();
        markDirty();
        return;
      }
      const handle = t.closest(".dp-tb-handle") as HTMLElement | null;
      if (!handle) return;
      const box = handle.parentElement as HTMLElement;
      e.preventDefault();
      const sx = e.clientX;
      const sy = e.clientY;
      const sl = parseFloat(box.style.left) || 0;
      const st = parseFloat(box.style.top) || 0;
      const move = (ev: PointerEvent) => {
        const z = zoomRef.current || 1;
        box.style.left = `${Math.max(0, Math.round(sl + (ev.clientX - sx) / z))}px`;
        box.style.top = `${Math.max(0, Math.round(st + (ev.clientY - sy) / z))}px`;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        markDirty();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

    paper.addEventListener("input", onInput);
    paper.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("selectionchange", onSelChange);
    return () => {
      paper.removeEventListener("input", onInput);
      paper.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("selectionchange", onSelChange);
    };
  }, [markDirty]);

  /* ---------- HTML getters ---------- */
  const getCleanHtml = () => {
    const paper = paperRef.current;
    if (!paper) return "";
    const clone = paper.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".dp-tb-handle,.dp-tb-del").forEach((n) => n.remove());
    clone.querySelectorAll<HTMLElement>(".dp-textbox").forEach((n) => {
      n.removeAttribute("style");
      n.style.margin = "4px 0";
    });
    clone.querySelectorAll(".dp-pagebreak").forEach((n) => {
      n.outerHTML = '<br clear="all" style="page-break-before:always" />';
    });
    clone.querySelectorAll<HTMLElement>("tr.dp-break-before").forEach((n) => (n.style.pageBreakBefore = "always"));
    clone.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
    return clone.innerHTML;
  };

  const getPrintHtml = () => {
    const paper = paperRef.current;
    if (!paper) return "";
    const clone = paper.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".dp-tb-handle,.dp-tb-del").forEach((n) => n.remove());
    clone.querySelectorAll<HTMLElement>(".dp-textbox").forEach((n) => {
      n.style.left = `${Math.max(0, Math.round((parseFloat(n.style.left) || 0) - PAD_LEFT_PX))}px`;
      n.style.top = `${Math.max(0, Math.round((parseFloat(n.style.top) || 0) - PAD_TOP_PX))}px`;
      n.style.border = "none";
    });
    clone.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
    clone.querySelectorAll("[spellcheck]").forEach((n) => n.removeAttribute("spellcheck"));
    return clone.innerHTML;
  };

  const handleClose = () => onClose(paperRef.current?.innerHTML ?? initialHtml, dirtyRef.current);
  const handlePrint = () => {
    const html = getPrintHtml();
    if (!html.trim()) return flash("Konten preview kosong.");
    onPrint(html);
  };

  const actionsRef = useRef({ close: handleClose, print: handlePrint });
  actionsRef.current = { close: handleClose, print: handlePrint };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        actionsRef.current.close();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        actionsRef.current.print();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ---------- editor commands ---------- */
  const restoreSelection = () => {
    const r = rangeRef.current;
    const paper = paperRef.current;
    if (!paper) return false;
    if (!r || !paper.contains(r.commonAncestorContainer)) {
      paper.focus({ preventScroll: true });
      return false;
    }
    const node = r.startContainer.nodeType === 1 ? (r.startContainer as HTMLElement) : r.startContainer.parentElement;
    const host = node?.closest('[contenteditable="true"]') as HTMLElement | null;
    (host || paper).focus({ preventScroll: true });
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    return true;
  };

  const exec = (cmd: string, value?: string) => {
    if (!editing) return;
    restoreSelection();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* ignore */
    }
    document.execCommand(cmd, false, value);
    markDirty();
  };

  const applyFontSize = (pt: string) => {
    if (!editing || !pt) return;
    if (!restoreSelection()) return flash("Blok (select) teks terlebih dahulu.");
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontSize", false, "7");
    paperRef.current?.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement("span");
      span.style.fontSize = `${pt}pt`;
      span.innerHTML = (f as HTMLElement).innerHTML;
      f.replaceWith(span);
    });
    markDirty();
  };

  const currentRow = () => {
    const r = rangeRef.current;
    const paper = paperRef.current;
    if (!r || !paper) return null;
    const n = r.startContainer;
    const el = (n.nodeType === 1 ? n : n.parentElement) as HTMLElement | null;
    const tr = el?.closest("tr") as HTMLTableRowElement | null;
    return tr && paper.contains(tr) ? tr : null;
  };

  const addRow = () => {
    const tr = currentRow();
    if (!tr) return flash("Klik dulu salah satu baris tabel, baris baru akan ditambahkan di bawahnya.");
    if (tr.closest("thead")) return flash("Tidak bisa menambah baris di header tabel.");
    const clone = tr.cloneNode(true) as HTMLTableRowElement;
    clone.classList.remove("dp-break-before");
    clone.querySelectorAll("td,th").forEach((c) => ((c as HTMLElement).innerHTML = "&nbsp;"));
    tr.after(clone);
    markDirty();
  };

  const deleteRow = () => {
    const tr = currentRow();
    if (!tr) return flash("Klik dulu baris tabel yang ingin dihapus.");
    if (tr.closest("thead")) return flash("Header tabel tidak bisa dihapus.");
    tr.remove();
    rangeRef.current = null;
    markDirty();
  };

  const addTextBox = () => {
    const paper = paperRef.current;
    const sc = scrollRef.current;
    if (!paper || !sc) return;
    if (!editing) setEditing(true);
    const z = zoomRef.current || 1;
    const top = Math.max(16, Math.round((sc.scrollTop - paper.offsetTop * z) / z + 80));
    const box = document.createElement("div");
    box.className = "dp-textbox";
    box.contentEditable = "false";
    box.style.left = "60px";
    box.style.top = `${top}px`;
    box.innerHTML =
      '<span class="dp-tb-handle" title="Tarik untuk memindahkan">⠿ geser</span><span class="dp-tb-del" title="Hapus">✕</span><div class="dp-tb-body" contenteditable="true" style="font-size:9pt;">Teks baru</div>';
    paper.appendChild(box);
    const body = box.querySelector(".dp-tb-body") as HTMLElement;
    body.focus();
    const range = document.createRange();
    range.selectNodeContents(body);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    markDirty();
  };

  const togglePageBreak = () => {
    const paper = paperRef.current;
    if (!paper) return;
    const tr = currentRow();
    if (tr && tr.closest("tbody")) {
      tr.classList.toggle("dp-break-before");
      flash(tr.classList.contains("dp-break-before") ? "Halaman baru dimulai dari baris ini." : "Page break baris dihapus.");
      markDirty();
      return;
    }
    const r = rangeRef.current;
    const doc = (paper.querySelector(".dp-doc") as HTMLElement) || paper;
    let el = r ? ((r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement) as HTMLElement | null) : null;
    while (el && el.parentElement && el.parentElement !== doc) el = el.parentElement;
    const pb = document.createElement("div");
    pb.className = "dp-pagebreak";
    pb.contentEditable = "false";
    if (el && el.parentElement === doc) doc.insertBefore(pb, el);
    else doc.appendChild(pb);
    flash("Page break ditambahkan (garis putus-putus). Hapus dengan Backspace/Delete.");
    markDirty();
  };

  const resetContent = () => {
    if (!window.confirm("Reset semua perubahan dan kembali ke dokumen asli dari form?")) return;
    if (paperRef.current) paperRef.current.innerHTML = freshHtml;
    rangeRef.current = null;
    dirtyRef.current = false;
    setDirty(false);
    if (!editing) setEditing(true);
  };

  const setZoomSafe = (z: number) => setZoom(Math.min(1.5, Math.max(0.5, Math.round(z * 10) / 10)));

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-200">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 truncate">{title}</h2>
              <p className="text-xs text-slate-500 truncate">
                {subtitle}
                {dirty && <span className="ml-2 text-amber-600 font-semibold">• Ada perubahan manual</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <ToolBtn title="Zoom out" onClick={() => setZoomSafe(zoom - 0.1)} disabled={zoom <= 0.5}>
              <ZoomOut className="w-4 h-4" />
            </ToolBtn>
            <button type="button" onClick={() => setZoomSafe(1)} className="w-14 text-xs font-semibold text-slate-700 tabular-nums" title="Reset zoom 100%">
              {Math.round(zoom * 100)}%
            </button>
            <ToolBtn title="Zoom in" onClick={() => setZoomSafe(zoom + 0.1)} disabled={zoom >= 1.5}>
              <ZoomIn className="w-4 h-4" />
            </ToolBtn>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${editing ? "bg-white shadow-sm text-amber-700" : "text-slate-500"}`}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${!editing ? "bg-white shadow-sm text-amber-700" : "text-slate-500"}`}
              >
                <Eye className="w-3.5 h-3.5" /> Lihat
              </button>
            </div>
            <button
              type="button"
              onClick={() => onWord(getCleanHtml())}
              disabled={!!busy}
              className="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
              title="Download Word dari hasil edit"
            >
              {busy === "word" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Word
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!!busy}
              className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:opacity-50"
              title="Ctrl + P"
            >
              {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Simpan PDF & Print
            </button>
          </div>
        </div>

        {editing && (
          <div className="flex flex-wrap items-center gap-0.5 px-4 py-1.5 border-t border-slate-100 bg-slate-50">
            <ToolBtn title="Undo (Ctrl+Z)" onClick={() => exec("undo")}><Undo2 className="w-4 h-4" /></ToolBtn>
            <ToolBtn title="Redo (Ctrl+Y)" onClick={() => exec("redo")}><Redo2 className="w-4 h-4" /></ToolBtn>
            <Sep />
            <select
              value=""
              onChange={(e) => applyFontSize(e.target.value)}
              className="h-8 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none focus:border-amber-500"
              title="Ukuran font"
            >
              <option value="" disabled>Size</option>
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>{s} pt</option>
              ))}
            </select>
            <Sep />
            <ToolBtn title="Bold (Ctrl+B)" onClick={() => exec("bold")}><Bold className="w-4 h-4" /></ToolBtn>
            <ToolBtn title="Italic (Ctrl+I)" onClick={() => exec("italic")}><Italic className="w-4 h-4" /></ToolBtn>
            <ToolBtn title="Underline (Ctrl+U)" onClick={() => exec("underline")}><Underline className="w-4 h-4" /></ToolBtn>
            <ToolBtn title="Strikethrough" onClick={() => exec("strikeThrough")}><Strikethrough className="w-4 h-4" /></ToolBtn>
            <label title="Warna teks" className="h-8 px-1.5 inline-flex items-center gap-1 rounded-md hover:bg-slate-200/70 cursor-pointer text-slate-600">
              <Type className="w-4 h-4" />
              <input type="color" defaultValue="#000000" onChange={(e) => exec("foreColor", e.target.value)} className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer" />
            </label>
            <label title="Highlight" className="h-8 px-1.5 inline-flex items-center gap-1 rounded-md hover:bg-slate-200/70 cursor-pointer text-slate-600">
              <Highlighter className="w-4 h-4" />
              <input type="color" defaultValue="#fff59d" onChange={(e) => exec("hiliteColor", e.target.value)} className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer" />
            </label>
            <Sep />
            <ToolBtn title="Rata kiri" onClick={() => exec("justifyLeft")}><AlignLeft className="w-4 h-4" /></ToolBtn>
            <ToolBtn title="Rata tengah" onClick={() => exec("justifyCenter")}><AlignCenter className="w-4 h-4" /></ToolBtn>
            <ToolBtn title="Rata kanan" onClick={() => exec("justifyRight")}><AlignRight className="w-4 h-4" /></ToolBtn>
            <ToolBtn title="Numbering" onClick={() => exec("insertOrderedList")}><ListOrdered className="w-4 h-4" /></ToolBtn>
            <ToolBtn title="Hapus format" onClick={() => exec("removeFormat")}><Eraser className="w-4 h-4" /></ToolBtn>
            <Sep />
            <ToolBtn title="Tambah text box bebas (bisa digeser)" onClick={addTextBox}>
              <TextCursorInput className="w-4 h-4" /> Text Box
            </ToolBtn>
            <ToolBtn title="Tambah baris tabel di bawah baris yang dipilih" onClick={addRow}>
              <Plus className="w-4 h-4" /> Baris
            </ToolBtn>
            <ToolBtn title="Hapus baris tabel yang dipilih" onClick={deleteRow}>
              <Minus className="w-4 h-4" /> Baris
            </ToolBtn>
            <ToolBtn title="Sisipkan / hapus page break" onClick={togglePageBreak}>
              <SeparatorHorizontal className="w-4 h-4" /> Page Break
            </ToolBtn>
            <Sep />
            <ToolBtn title="Tampilkan garis batas halaman A4" onClick={() => setGuides((g) => !g)} active={guides}>
              Batas A4
            </ToolBtn>
            <ToolBtn title="Reset ke dokumen asli" onClick={resetContent}>
              <RotateCcw className="w-4 h-4" /> Reset
            </ToolBtn>
          </div>
        )}
      </div>

      {/* Paper */}
      <div ref={scrollRef} className="relative flex-1 overflow-auto px-4 py-6">
        <div
          ref={paperRef}
          className={`dp-paper ${editing ? "dp-editing" : ""} ${guides ? "dp-guides" : ""}`}
          style={{ zoom } as React.CSSProperties}
          spellCheck={false}
          suppressContentEditableWarning
        />
        <p className="text-center text-[11px] text-slate-500 mt-4">
          Klik teks mana pun untuk mengedit. Garis merah = perkiraan batas halaman A4 (tidak ikut tercetak). Angka total tidak dihitung ulang otomatis jika diedit manual.
        </p>
      </div>

      {hint && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-slate-800 text-white text-xs shadow-lg flex items-center gap-2" role="status" aria-live="polite">
          <Info className="w-4 h-4" /> {hint}
        </div>
      )}
    </div>,
    document.body
  );
}

/* ===================== MAIN COMPONENT ===================== */
export default function ModalInvoice({ config, onClose }: ModalInvoiceProps) {
  const [dbRef, setDbRef] = useState<{ id: number; qo: string } | null>(null);
  const [invoiceCustomer, setInvoiceCustomer] = useState("");
  const [invoiceAttn, setInvoiceAttn] = useState("");
  const [invoiceAddress, setInvoiceAddress] = useState("");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [referenceQo, setReferenceQo] = useState("");
  const [invoiceRevision, setInvoiceRevision] = useState("0");
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState(DEFAULT_PAYMENT);
  const [invoiceApprovedBy, setInvoiceApprovedBy] = useState(DEFAULT_APPROVER);
  const [invoiceDate, setInvoiceDate] = useState(getTodayLocal());
  const [calcRows, setCalcRows] = useState<CalcRow[]>(DEFAULT_ROWS);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [preview, setPreview] = useState<{ initial: string; fresh: string } | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceHistoryItem[]>([]);
  const [selectedHistoryPath, setSelectedHistoryPath] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deletingHistoryPath, setDeletingHistoryPath] = useState<string | null>(null);
  const [sourceRevision, setSourceRevision] = useState<number | null>(null);

  const editedHtmlRef = useRef<string | null>(null);
  const logoRef = useRef<Promise<Logo> | null>(null);
  const referenceQoRef = useRef("");
  referenceQoRef.current = referenceQo;

  const isSaving = activeAction !== null;

  const getLogo = useCallback(() => {
    if (!logoRef.current) logoRef.current = getBase64ImageWithSize(LOGO_URL, 192, 48);
    return logoRef.current;
  }, []);

  const loadInvoiceHistory = useCallback(async (qoNumber: string, silent = false) => {
    const qo = qoNumber.trim();
    if (!qo) {
      setInvoiceHistory([]);
      return [] as InvoiceHistoryItem[];
    }
    if (!silent) setIsLoadingHistory(true);
    try {
      const result = await getJson(`/api/management/material_qo?qo_number=${encodeURIComponent(qo)}&invoice_history=1`);
      const rows = Array.isArray(result?.data) ? (result.data as InvoiceHistoryItem[]) : [];
      setInvoiceHistory(rows);
      return rows;
    } catch (error: any) {
      console.error("Gagal mengambil history PDF invoice:", error);
      if (!silent) setToast({ type: "error", msg: `Gagal memuat history PDF: ${error?.message || error}` });
      return [] as InvoiceHistoryItem[];
    } finally {
      if (!silent) setIsLoadingHistory(false);
    }
  }, []);

  /* ---------- INIT ---------- */
  useEffect(() => {
    setPreview(null);
    editedHtmlRef.current = null;
    setHasDraft(false);
    setInvoiceHistory([]);
    setSelectedHistoryPath(null);
    setDeletingHistoryPath(null);
    setSourceRevision(null);
    setIsLoadingData(false);
    if (!config) return;

    let cancelled = false;
    const d = new Date();
    const generated = `INV${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(-2)}${String(
      Math.floor(Math.random() * 1000)
    ).padStart(3, "0")}`;
    const qo = config.group.qo_number || "";

    setReferenceQo(qo);
    setInvoiceNo(generated);
    setInvoiceCustomer(String(config.group.customer || ""));
    setInvoiceAttn("");
    setInvoiceAddress("");
    setInvoicePhone("");
    setInvoiceRevision("0");
    setInvoicePaymentMethod(DEFAULT_PAYMENT);
    setInvoiceApprovedBy(DEFAULT_APPROVER);
    setInvoiceDate(getTodayLocal());
    setDbRef(null);

    try {
      setCalcRows(loadRows(localStorage.getItem(STORAGE_PREFIX + (qo || "last")) || localStorage.getItem(STORAGE_PREFIX + "last")));
    } catch {
      setCalcRows(DEFAULT_ROWS);
    }

    if (!qo) return;

    setIsLoadingData(true);
    void loadInvoiceHistory(qo, true);
    getJson(`/api/management/material_qo?qo_number=${encodeURIComponent(qo)}`)
      .then(({ data: x }) => {
        if (cancelled || !x) return;
        if (x.id) setDbRef({ id: Number(x.id), qo });
        if (x.invoice_no) setInvoiceNo(x.invoice_no);
        if (x.attn_invoice) setInvoiceAttn(x.attn_invoice);
        if (x.address) setInvoiceAddress(x.address);
        if (x.revision_invoice !== undefined && x.revision_invoice !== null) setInvoiceRevision(String(x.revision_invoice));
        if (x.payment_method_invoice) setInvoicePaymentMethod(x.payment_method_invoice);
        if (x.approved_by_invoice) setInvoiceApprovedBy(x.approved_by_invoice);
      })
      .catch((err) => console.error("Gagal mengambil data Invoice:", err))
      .finally(() => {
        if (!cancelled) setIsLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config, loadInvoiceHistory]);

  // Simpan setting kalkulasi (hanya saat calcRows berubah, bukan tiap ketik QO)
  useEffect(() => {
    if (!config) return;
    try {
      const json = JSON.stringify(calcRows);
      localStorage.setItem(STORAGE_PREFIX + "last", json);
      const k = referenceQoRef.current.trim();
      if (k) localStorage.setItem(STORAGE_PREFIX + k, json);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcRows]);

  // Lock scroll body
  useEffect(() => {
    if (!config) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [config]);

  // ESC menutup modal (saat preview terbuka, ESC ditangani preview)
  useEffect(() => {
    if (!config) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !preview && !isSaving) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [config, preview, isSaving, onClose]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* ---------- GROUPING ---------- */
  const groupedData = useMemo(() => {
    if (!config?.group?.items) return { groups: [] as any[], subTotal: 0, itemCount: 0 };
    const map = new Map<string, { items: any[]; subTotal: number }>();
    config.group.items.forEach((item: any) => {
      const key = item.mother_part || "General Part";
      if (!map.has(key)) map.set(key, { items: [], subTotal: 0 });
      const price = Number(item.price) || 0;
      const qtyNum = Number(item.qty) || 1;
      const unitPriceWithMargin = price + (price * (Number(item.margin) || 0)) / 100;
      const totalPrice = unitPriceWithMargin * qtyNum;
      const g = map.get(key)!;
      g.items.push({ ...item, qtyNum, unitPriceWithMargin, totalPrice });
      g.subTotal += totalPrice;
    });
    let idx = 1;
    let subTotal = 0;
    const groups = Array.from(map.entries()).map(([motherPart, d]) => {
      subTotal += d.subTotal;
      return { motherPart, subTotal: d.subTotal, items: d.items.map((it) => ({ ...it, printIndex: idx++ })) };
    });
    return { groups, subTotal, itemCount: idx - 1 };
  }, [config]);

  const summary = useMemo(() => computeSummary(groupedData.subTotal, calcRows), [groupedData.subTotal, calcRows]);

  if (!config) return null;

  /* ---------- ROW EDITOR ---------- */
  const updateRow = (id: string, patch: Partial<CalcRow>) => setCalcRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => setCalcRows((rows) => rows.filter((r) => r.id !== id));
  const addCalcRow = () =>
    setCalcRows((rows) => [
      ...rows,
      { id: `c${Date.now()}`, kind: "custom", label: "Biaya Lain", enabled: true, mode: "amount", value: "0", base: "afterDiscount", effect: "add", round: false },
    ]);
  const resetRows = () => setCalcRows(DEFAULT_ROWS.map((r) => ({ ...r })));

  /* ---------- HELPERS ---------- */
  const fileDateStr = (invoiceDate || getTodayLocal()).replace(/-/g, "");
  const buildFileName = () => {
    const projectName = (config.group as any).project_name || invoiceCustomer || "Project";
    return sanitizeFileName(`${projectName}_${invoiceNo || "INV"}_${fileDateStr}`);
  };

  const getDocParams = (logo: Logo): InvoiceDocParams => ({
    customer: invoiceCustomer,
    attn: invoiceAttn,
    address: invoiceAddress,
    phone: invoicePhone,
    invoiceNo,
    date: formatDateID(invoiceDate),
    revision: invoiceRevision,
    groups: groupedData.groups,
    lines: summary.lines,
    payment: invoicePaymentMethod,
    approvedBy: invoiceApprovedBy.trim() || DEFAULT_APPROVER,
    logo,
  });

  /* ---------- SAVE ---------- */
  const saveToDatabase = async (saveOnly: boolean): Promise<boolean> => {
    if (!invoiceNo.trim()) {
      setToast({ type: "error", msg: "Invoice No wajib diisi." });
      return false;
    }
    const refQo = referenceQo.trim();
    if (!refQo) {
      if (saveOnly) {
        setToast({ type: "error", msg: "Reference QO Number wajib diisi untuk menyimpan Invoice." });
        return false;
      }
      return window.confirm("Reference QO Number kosong, data Invoice TIDAK akan disimpan ke database.\n\nTetap lanjutkan generate dokumen?");
    }

    const rev = parseInt(invoiceRevision, 10);
    const payload = {
      invoice_no: invoiceNo.trim(),
      attn_invoice: invoiceAttn,
      revision_invoice: Number.isFinite(rev) && rev >= 0 ? rev : 0,
      payment_method_invoice: invoicePaymentMethod,
      approved_by_invoice: invoiceApprovedBy,
    };

    try {
      let id = dbRef && dbRef.qo === refQo ? dbRef.id : null;
      if (!id) {
        const j = await getJson(`/api/management/material_qo?qo_number=${encodeURIComponent(refQo)}`);
        id = j?.data?.id ? Number(j.data.id) : null;
        if (id) setDbRef({ id, qo: refQo });
      }
      if (!id) {
        if (saveOnly) {
          setToast({ type: "error", msg: `Data QO acuan "${refQo}" tidak ditemukan di database.` });
          return false;
        }
        return window.confirm(`Data QO acuan "${refQo}" tidak ditemukan di database.\nData Invoice tidak tersimpan.\n\nTetap lanjutkan?`);
      }
      await jsonFetch(`/api/management/material_qo?id=${id}`, "PUT", payload);
      setToast({ type: "success", msg: "Data Invoice tersimpan ke database." });
      return true;
    } catch (error: any) {
      console.error("Error saving data:", error);
      if (saveOnly) {
        setToast({ type: "error", msg: `Gagal menyimpan: ${error?.message || error}` });
        return false;
      }
      return window.confirm(`Gagal menyimpan ke database:\n${error?.message || error}\n\nTetap lanjutkan generate dokumen?`);
    }
  };

  const buildEditorState = (documentHtml: string, savedRevision = invoiceRevision): InvoiceEditorState => ({
    version: 1,
    invoiceCustomer,
    invoiceAttn,
    invoiceAddress,
    invoicePhone,
    invoiceNo: invoiceNo.trim(),
    referenceQo: referenceQo.trim(),
    invoiceRevision: savedRevision,
    invoicePaymentMethod,
    invoiceApprovedBy,
    invoiceDate,
    calcRows,
    documentHtml,
  });

  const persistPdfRevision = async (documentHtml: string) => {
    const refQo = referenceQo.trim();
    if (!refQo) throw new Error("Reference QO Number wajib diisi untuk menyimpan PDF.");
    const requestedRevision = Math.max(0, Number.parseInt(invoiceRevision || "0", 10) || 0);
    const existingRevisions = invoiceHistory.map((row) => Number(row.revision) || 0);
    const effectiveRevision = existingRevisions.includes(requestedRevision)
      ? Math.max(-1, ...existingRevisions) + 1
      : requestedRevision;
    const htmlForSave = replaceRevisionInHtml(documentHtml, effectiveRevision);
    const pdfBlob = await renderHtmlToPdfBlob(htmlForSave);
    const form = new FormData();
    form.append("action", "save_invoice_pdf");
    form.append("qo_number", refQo);
    form.append("invoice_no", invoiceNo.trim());
    form.append("revision", String(effectiveRevision));
    if (sourceRevision !== null) form.append("source_revision", String(sourceRevision));
    form.append("editor_state", JSON.stringify(buildEditorState(htmlForSave, String(effectiveRevision))));
    form.append("pdf", pdfBlob, `${buildFileName()}.pdf`);

    const response = await fetch("/api/management/material_qo", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || result?.message || `HTTP ${response.status}`);

    const saved = result?.data as InvoiceHistoryItem | undefined;
    if (saved && Number.isFinite(Number(saved.revision))) {
      setInvoiceRevision(String(saved.revision));
      setSelectedHistoryPath(saved.pdfPath);
      setSourceRevision(Number(saved.revision));
      editedHtmlRef.current = replaceRevisionInHtml(htmlForSave, Number(saved.revision));
      setHasDraft(true);
    }
    await loadInvoiceHistory(refQo, true);
    setToast({ type: "success", msg: result?.message || "PDF invoice berhasil disimpan ke Supabase." });
    return saved;
  };

  const getCurrentDocumentHtml = async () => {
    if (editedHtmlRef.current?.trim()) return editedHtmlRef.current;
    const logo = await getLogo();
    return buildInvoiceHtml(getDocParams(logo));
  };

  const openHistoryForEdit = async (item: InvoiceHistoryItem) => {
    if (activeAction || !referenceQo.trim()) return;
    setActiveAction("history");
    setSelectedHistoryPath(item.pdfPath);
    try {
      const result = await getJson(
        `/api/management/material_qo?qo_number=${encodeURIComponent(referenceQo.trim())}&invoice_snapshot=${encodeURIComponent(item.jsonPath)}`
      );
      const snapshot = result?.data as Partial<InvoiceEditorState> | undefined;
      if (!snapshot?.documentHtml) throw new Error("Snapshot editable untuk file ini tidak tersedia.");

      const nextRevision = Math.max(-1, ...invoiceHistory.map((row) => Number(row.revision) || 0)) + 1;
      setInvoiceCustomer(String(snapshot.invoiceCustomer ?? invoiceCustomer));
      setInvoiceAttn(String(snapshot.invoiceAttn ?? invoiceAttn));
      setInvoiceAddress(String(snapshot.invoiceAddress ?? invoiceAddress));
      setInvoicePhone(String(snapshot.invoicePhone ?? invoicePhone));
      setInvoiceNo(String(snapshot.invoiceNo ?? item.invoiceNo ?? invoiceNo));
      setInvoiceRevision(String(nextRevision));
      setInvoicePaymentMethod(String(snapshot.invoicePaymentMethod ?? invoicePaymentMethod));
      setInvoiceApprovedBy(String(snapshot.invoiceApprovedBy ?? invoiceApprovedBy));
      setInvoiceDate(String(snapshot.invoiceDate ?? invoiceDate));
      if (Array.isArray(snapshot.calcRows) && snapshot.calcRows.length) setCalcRows(snapshot.calcRows as CalcRow[]);

      const html = replaceRevisionInHtml(snapshot.documentHtml, nextRevision);
      editedHtmlRef.current = html;
      setHasDraft(true);
      setSourceRevision(item.revision);
      setPreview({ initial: html, fresh: html });
      setToast({ type: "info", msg: `Revision ${item.revision} dibuka. Save berikutnya akan menjadi revision ${nextRevision}.` });
    } catch (error: any) {
      setToast({ type: "error", msg: `Gagal membuka revision: ${error?.message || error}` });
    } finally {
      setActiveAction(null);
    }
  };

  const deleteHistoryRevision = async (item: InvoiceHistoryItem) => {
    const refQo = referenceQo.trim();
    if (activeAction || !refQo) return;
    const confirmed = window.confirm(
      `Hapus Revision ${item.revision}?\n\nPDF dan snapshot editable JSON pasangan revision ini akan dihapus permanen dari Supabase Storage. Revision lain tidak akan diubah.`
    );
    if (!confirmed) return;

    setActiveAction("history-delete");
    setDeletingHistoryPath(item.pdfPath);
    try {
      const params = new URLSearchParams({
        delete_invoice_revision: "1",
        qo_number: refQo,
        pdf_path: item.pdfPath,
        json_path: item.jsonPath,
      });
      const response = await fetch(`/api/management/material_qo?${params.toString()}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || result?.message || `HTTP ${response.status}`);
      }

      const returnedHistory = Array.isArray(result?.data?.history)
        ? (result.data.history as InvoiceHistoryItem[])
        : null;
      if (returnedHistory) setInvoiceHistory(returnedHistory);
      else await loadInvoiceHistory(refQo, true);

      setSelectedHistoryPath(null);
      setToast({
        type: "success",
        msg: result?.message || `Revision ${item.revision} berhasil dihapus.`,
      });
    } catch (error: unknown) {
      console.error("Gagal menghapus revision invoice:", error);
      setToast({
        type: "error",
        msg: `Gagal menghapus revision: ${clientErrorMessage(error, "File tidak dapat dihapus dari Supabase.")}`,
      });
    } finally {
      setDeletingHistoryPath(null);
      setActiveAction(null);
    }
  };

  const runWithSave = async (key: ActionKey, action?: () => void | Promise<void>) => {
    if (activeAction) return; // cegah double-click
    setActiveAction(key);
    try {
      const ok = await saveToDatabase(key === "save" || key === "pdf");
      if (ok && action) await action();
    } catch (error: unknown) {
      console.error(`Error (${key}):`, error);
      setToast({ type: "error", msg: `Gagal membuat dokumen: ${clientErrorMessage(error, "Proses PDF tidak dapat diselesaikan.")}` });
    } finally {
      setActiveAction(null);
    }
  };

  /* ---------- PREVIEW / PDF ---------- */
  const openPreview = async () => {
    if (!invoiceNo.trim()) return setToast({ type: "error", msg: "Invoice No wajib diisi." });
    setActiveAction("preview");
    try {
      const logo = await getLogo();
      const fresh = buildInvoiceHtml(getDocParams(logo));
      let initial = fresh;
      if (
        editedHtmlRef.current &&
        window.confirm("Ada hasil edit preview sebelumnya.\n\nOK = Lanjutkan hasil edit sebelumnya\nCancel = Buat ulang dari data form terbaru")
      ) {
        initial = editedHtmlRef.current;
      }
      setPreview({ initial, fresh });
    } finally {
      setActiveAction(null);
    }
  };

  const closePreview = (html: string, dirty: boolean) => {
    const keepSnapshot = dirty || sourceRevision !== null;
    editedHtmlRef.current = keepSnapshot ? html : null;
    setHasDraft(keepSnapshot);
    setPreview(null);
  };

  const printFromPreview = (printHtml: string) =>
    runWithSave("pdf", async () => {
      if (!printHtml.trim()) throw new Error("Konten preview kosong.");
      (document.activeElement as HTMLElement | null)?.blur?.();
      window.getSelection()?.removeAllRanges();
      await persistPdfRevision(printHtml);
      await printHtmlViaIframe(printHtml, buildFileName());
    });

  const saveInvoiceAndPdf = () =>
    runWithSave("save", async () => {
      const html = await getCurrentDocumentHtml();
      await persistPdfRevision(html);
    });

  /* ---------- WORD ---------- */
  const downloadWord = async (innerHtml: string) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(buildFileName())}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#000;} table{border-collapse:collapse;}</style>
      </head><body>${innerHtml}</body></html>`;
    const blob = await asBlob(html, {
      orientation: "portrait",
      margins: { top: 567, right: 567, bottom: 567, left: 567, header: 360, footer: 360, gutter: 0 },
    });
    saveAs(blob as Blob, `${buildFileName()}.docx`);
  };

  const executeWord = () =>
    runWithSave("word", async () => {
      const logo = await getLogo();
      await downloadWord(buildInvoiceHtml(getDocParams(logo)));
    });

  const wordFromPreview = (cleanHtml: string) => runWithSave("word", () => downloadWord(cleanHtml));

  /* ---------- EXCEL (formula hidup) ---------- */
  const executeExcel = () =>
    runWithSave("excel", async () => {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = COMPANY;
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

      // A No | B Desc | C Qty | D Unit | E Unit Price/"Rp" | F Total | G spacer | H Parameter
      ws.columns = [{ width: 10 }, { width: 50 }, { width: 10 }, { width: 10 }, { width: 18 }, { width: 20 }, { width: 3 }, { width: 20 }];

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

      /* Header */
      const logo = await getLogo();
      if (logo.src) {
        const ext = logo.src.startsWith("data:image/jpeg") ? "jpeg" : "png";
        const imgId = wb.addImage({ base64: logo.src, extension: ext as any });
        ws.addImage(imgId, { tl: { col: 0, row: 0.3 } as any, ext: { width: logo.width, height: logo.height } });
      }
      [COMPANY, ...COMPANY_LINES].forEach((t, i) => {
        const row = i + 1;
        ws.mergeCells(`C${row}:F${row}`);
        const cell = ws.getCell(`C${row}`);
        cell.value = t;
        cell.alignment = { horizontal: "right" };
        cell.font = { size: i === 0 ? 11 : 8, bold: i === 0 };
      });
      for (let c = 1; c <= 6; c++) ws.getCell(5, c).border = { bottom: { style: "medium" } };

      ws.mergeCells("A7:F7");
      const titleCell = ws.getCell("A7");
      titleCell.value = "INVOICE";
      titleCell.font = { size: 14, bold: true };
      titleCell.alignment = { horizontal: "center" };
      for (let c = 1; c <= 6; c++) ws.getCell(7, c).border = { bottom: thin };

      /* Info */
      const left = [["To", invoiceCustomer || "-"], ["Attn", invoiceAttn || "-"], ["Address", invoiceAddress || "-"], ["Phone", invoicePhone || "-"]];
      const right = [["Invoice No", invoiceNo], ["Date", formatDateID(invoiceDate)], ["Email", COMPANY_EMAIL], ["Revision", invoiceRevision || "0"]];
      left.forEach(([k, v], i) => {
        const row = 9 + i;
        ws.getCell(`A${row}`).value = k;
        ws.getCell(`A${row}`).font = { bold: true, size: 10 };
        ws.getCell(`A${row}`).alignment = { vertical: "top" };
        ws.getCell(`B${row}`).value = `: ${v}`;
        ws.getCell(`B${row}`).alignment = { wrapText: true, vertical: "top" };
        ws.mergeCells(`C${row}:D${row}`);
        ws.getCell(`C${row}`).value = right[i][0];
        ws.getCell(`C${row}`).font = { bold: true, size: 10 };
        ws.getCell(`C${row}`).alignment = { vertical: "top" };
        ws.mergeCells(`E${row}:F${row}`);
        ws.getCell(`E${row}`).value = `: ${right[i][1]}`;
        ws.getCell(`E${row}`).alignment = { wrapText: true, vertical: "top" };
        ws.getRow(row).height = Math.max(15, estLines(`: ${v}`, 48) * 13);
      });

      /* Items */
      let r = 14;
      ["No", "Description Item", "Qty", "Unit", "Unit Price", "Total Price"].forEach((h, i) => {
        const cell = ws.getCell(r, i + 1);
        cell.value = h;
        cell.alignment = { horizontal: i === 1 ? "left" : "center", vertical: "middle" };
      });
      boxRow(r, 1, 6, "FFDBEAFE", true);
      ws.getRow(r).height = 18;
      r++;

      const groupTotalRefs: string[] = [];
      groupedData.groups.forEach((g: any) => {
        ws.mergeCells(`A${r}:F${r}`);
        ws.getCell(`A${r}`).value = g.motherPart;
        boxRow(r, 1, 6, "FFF3F4F6", true);
        r++;
        const start = r;
        g.items.forEach((it: any) => {
          const desc = `${it.description || "-"} - ${it.technical_specification || "-"}`;
          ws.getCell(`A${r}`).value = it.printIndex;
          ws.getCell(`B${r}`).value = desc;
          ws.getCell(`C${r}`).value = it.qtyNum;
          ws.getCell(`D${r}`).value = it.unit || "EA";
          ws.getCell(`E${r}`).value = it.unitPriceWithMargin;
          ws.getCell(`F${r}`).value = { formula: `C${r}*E${r}`, result: it.totalPrice } as any;
          ws.getCell(`A${r}`).alignment = { horizontal: "center", vertical: "top" };
          ws.getCell(`B${r}`).alignment = { wrapText: true, vertical: "top" };
          ws.getCell(`C${r}`).alignment = { horizontal: "center", vertical: "top" };
          ws.getCell(`D${r}`).alignment = { horizontal: "center", vertical: "top" };
          ws.getCell(`E${r}`).numFmt = NUM;
          ws.getCell(`F${r}`).numFmt = NUM;
          ws.getRow(r).height = Math.max(15, estLines(desc, 55) * 13);
          boxRow(r);
          r++;
        });
        const end = r - 1;
        ws.mergeCells(`A${r}:E${r}`);
        ws.getCell(`A${r}`).value = `Total ${g.motherPart}`;
        ws.getCell(`A${r}`).alignment = { horizontal: "right" };
        ws.getCell(`F${r}`).value = { formula: end >= start ? `SUM(F${start}:F${end})` : "0", result: g.subTotal } as any;
        ws.getCell(`F${r}`).numFmt = NUM;
        boxRow(r, 1, 6, "FFEFF6FF", true);
        groupTotalRefs.push(`F${r}`);
        r++;
      });

      /* Summary (formula sesuai Kalkulasi Total) */
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
            h.value = m ? ({ formula: `${parseNum(m[1])}/${parseNum(m[2])}`, result: parseNum(c.value) } as any) : parseNum(c.value);
            h.numFmt = "0.000000";
          }
          h.fill = FILL("FFFFF2CC");
          h.border = BORDER;
          const base = c.kind === "discount" ? subRef : c.kind === "dpp" ? afterRef : baseRef[c.base];
          const expr = c.mode === "amount" ? `H${rr}` : `${base}*H${rr}`;
          formula = c.round ? `ROUND(${expr},0)` : expr;
        }
        const f = ws.getCell(`F${rr}`);
        f.value = { formula, result: l.amount } as any;
        f.numFmt = NUM;
        const fillArgb = l.variant === "grand" ? "FFDBEAFE" : l.variant === "sub" ? "FFEFF6FF" : undefined;
        boxRow(rr, 3, 6, fillArgb, l.variant !== "normal");
      });

      /* Footer */
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
      BANK_LINES.forEach((line) => {
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
      sign.value = (invoiceApprovedBy.trim() || DEFAULT_APPROVER).toUpperCase();
      sign.font = { bold: true, underline: true, size: 10 };
      sign.alignment = { horizontal: "center" };
      ws.mergeCells(`E${signRow + 1}:F${signRow + 1}`);
      const role = ws.getCell(`E${signRow + 1}`);
      role.value = APPROVER_ROLE;
      role.font = { bold: true, size: 9 };
      role.alignment = { horizontal: "center" };

      ws.pageSetup.printArea = `A1:F${Math.max(r, signRow + 1)}`;

      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${buildFileName()}.xlsx`);
    });

  /* ---------- UI VARS ---------- */
  const busy = isSaving || isLoadingData;
  const invNoInvalid = !invoiceNo.trim();
  const btn = "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed";
  const spin = (k: ActionKey, icon: React.ReactNode) => (activeAction === k ? <Loader2 className="w-4 h-4 animate-spin" /> : icon);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PREVIEW_CSS }} />

      {/* ===================== MODAL ===================== */}
      <div
        className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
        onMouseDown={(e) => e.target === e.currentTarget && !isSaving && !preview && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="bg-slate-50 border border-slate-200 rounded-2xl w-full max-w-6xl flex flex-col shadow-2xl overflow-hidden max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl shrink-0 bg-amber-50 text-amber-600">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800 truncate">Pengaturan Cetak Invoice</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">INV</span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {invoiceCustomer || "-"} • {groupedData.groups.length} grup • {groupedData.itemCount} item
                  {isLoadingData && <span className="ml-2 text-amber-600 animate-pulse">• Memuat data tersimpan...</span>}
                  {!isLoadingData && dbRef && <span className="ml-2 text-emerald-600">• Terhubung ke database</span>}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              aria-label="Tutup"
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* LEFT */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <Field label="Reference QO Number (Acuan Database)">
                    <input value={referenceQo} onChange={(e) => setReferenceQo(e.target.value)} placeholder="Contoh: QO0826123" className={`${inputCls} font-mono`} />
                  </Field>
                  <p className="mt-1.5 text-[11px] text-amber-700">Data Invoice akan disimpan ke record QO ini.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card title="Informasi Klien">
                    <div className="space-y-3">
                      <Field label="To (Customer)">
                        <input value={invoiceCustomer} onChange={(e) => setInvoiceCustomer(e.target.value)} className={inputCls} />
                      </Field>
                      <Field label="Attn">
                        <input value={invoiceAttn} onChange={(e) => setInvoiceAttn(e.target.value)} className={inputCls} />
                      </Field>
                      <Field label="Address">
                        <textarea rows={2} value={invoiceAddress} onChange={(e) => setInvoiceAddress(e.target.value)} className={`${inputCls} resize-y`} />
                      </Field>
                      <Field label="Phone">
                        <input value={invoicePhone} onChange={(e) => setInvoicePhone(e.target.value)} className={inputCls} />
                      </Field>
                    </div>
                  </Card>

                  <Card title="Detail Invoice">
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Invoice No" required className="col-span-2">
                          <input
                            value={invoiceNo}
                            onChange={(e) => setInvoiceNo(e.target.value)}
                            className={`${inputCls} font-mono ${invNoInvalid ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                          />
                        </Field>
                        <Field label="Revision">
                          <input
                            type="number"
                            min={0}
                            value={invoiceRevision}
                            onChange={(e) => setInvoiceRevision(e.target.value.replace(/[^\d]/g, ""))}
                            className={inputCls}
                          />
                        </Field>
                      </div>
                      <Field label="Date">
                        <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} style={{ colorScheme: "light" }} className={inputCls} />
                      </Field>
                      <Field label="Payment Method">
                        <textarea rows={2} value={invoicePaymentMethod} onChange={(e) => setInvoicePaymentMethod(e.target.value)} className={`${inputCls} resize-y`} />
                      </Field>
                      <Field label="Approved By">
                        <input value={invoiceApprovedBy} onChange={(e) => setInvoiceApprovedBy(e.target.value)} placeholder={DEFAULT_APPROVER} className={inputCls} />
                      </Field>
                    </div>
                  </Card>
                </div>

                {/* CALC EDITOR */}
                <Card
                  title="Kalkulasi Total (Flexible)"
                  right={
                    <div className="flex gap-2">
                      <button type="button" onClick={resetRows} className="px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                      </button>
                      <button type="button" onClick={addCalcRow} className="px-2.5 py-1 text-xs rounded-md bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Tambah Baris
                      </button>
                    </div>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-700">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wide text-slate-500 text-left">
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
                            <tr key={r.id} className={`border-t border-slate-100 ${r.enabled ? "" : "opacity-50"}`}>
                              <td className="p-1.5">
                                <input type="checkbox" checked={r.enabled} onChange={(e) => updateRow(r.id, { enabled: e.target.checked })} className="accent-amber-500 w-4 h-4" />
                              </td>
                              <td className="p-1.5">
                                <input value={r.label} onChange={(e) => updateRow(r.id, { label: e.target.value })} className={miniCls} />
                              </td>
                              <td className="p-1.5">
                                <select value={r.mode} onChange={(e) => updateRow(r.id, { mode: e.target.value as CalcMode })} className={miniCls}>
                                  {MODE_OPTIONS.map((o) => (
                                    <option key={o.v} value={o.v}>{o.l}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1.5">
                                <input
                                  value={r.value}
                                  placeholder={r.mode === "factor" ? "11/12" : "0"}
                                  onChange={(e) => updateRow(r.id, { value: e.target.value })}
                                  className={`${miniCls} text-right font-mono`}
                                />
                              </td>
                              <td className="p-1.5">
                                <select value={r.base} disabled={locked || r.mode === "amount"} onChange={(e) => updateRow(r.id, { base: e.target.value as CalcBase })} className={miniCls}>
                                  {BASE_OPTIONS.map((o) => (
                                    <option key={o.v} value={o.v}>{o.l}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1.5">
                                <select value={r.effect} disabled={locked} onChange={(e) => updateRow(r.id, { effect: e.target.value as CalcEffect })} className={miniCls}>
                                  {EFFECT_OPTIONS.map((o) => (
                                    <option key={o.v} value={o.v}>{o.l}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1.5 text-center">
                                <input type="checkbox" checked={r.round} onChange={(e) => updateRow(r.id, { round: e.target.checked })} className="accent-amber-500 w-4 h-4" />
                              </td>
                              <td className="p-1.5 text-right font-mono text-amber-700">{r.enabled ? fmt(summary.amounts[r.id] ?? 0) : "-"}</td>
                              <td className="p-1.5">
                                {!locked && (
                                  <button
                                    type="button"
                                    onClick={() => removeRow(r.id)}
                                    aria-label="Hapus baris"
                                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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

              {/* RIGHT */}
              <div className="space-y-4 lg:sticky lg:top-0 h-fit">
                <Card title="Ringkasan Total" right={<Calculator className="w-4 h-4 text-amber-600" />}>
                  <div className="rounded-lg overflow-hidden border border-slate-200">
                    {summary.lines.map((l) => (
                      <div
                        key={l.key}
                        className={`grid grid-cols-[1fr_auto_8.5rem] gap-2 px-3 py-2 text-sm border-b border-slate-100 last:border-b-0 ${
                          l.variant === "grand" ? "bg-amber-50 text-amber-800 font-bold" : l.variant === "sub" ? "bg-slate-50 text-slate-800 font-semibold" : "text-slate-600"
                        }`}
                      >
                        <span className="truncate">{l.label}</span>
                        <span className="text-slate-400">Rp</span>
                        <span className="text-right font-mono">{fmt(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 max-h-48 overflow-y-auto space-y-1 text-[11px] text-slate-500">
                    {groupedData.groups.map((g: any) => (
                      <div key={g.motherPart} className="flex justify-between gap-2">
                        <span className="truncate" title={g.motherPart}>
                          {g.motherPart} <span className="text-slate-400">({g.items.length})</span>
                        </span>
                        <span className="font-mono shrink-0">{fmt(g.subTotal)}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <Eye className="w-4 h-4" /> Preview & PDF
                  </p>
                  <p>
                    Klik <b>Preview & PDF</b> untuk membuka dokumen A4 yang bisa diedit bebas. Tombol <b>Simpan PDF & Print</b> di preview akan menyimpan PDF dan snapshot editable ke Supabase sebelum membuka dialog print.
                  </p>
                  {hasDraft && (
                    <p className="text-amber-900 font-semibold flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Ada hasil edit preview tersimpan sementara.
                    </p>
                  )}
                </div>

                <Card
                  title="History Saved PDF"
                  right={
                    <button
                      type="button"
                      onClick={() => loadInvoiceHistory(referenceQo)}
                      disabled={!referenceQo.trim() || isLoadingHistory || !!activeAction}
                      className="p-1.5 rounded-md text-slate-500 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-40"
                      title="Refresh history"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? "animate-spin" : ""}`} />
                    </button>
                  }
                >
                  {!referenceQo.trim() ? (
                    <p className="text-xs text-slate-500">Isi Reference QO Number untuk melihat history.</p>
                  ) : isLoadingHistory ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Memuat history...
                    </div>
                  ) : invoiceHistory.length === 0 ? (
                    <div className="py-6 text-center text-slate-500">
                      <FolderOpen className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold">Belum ada PDF tersimpan.</p>
                      <p className="text-[10px] mt-1">Klik Simpan atau Simpan PDF & Print untuk membuat revision pertama.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {invoiceHistory.map((item, index) => {
                        const selected = selectedHistoryPath === item.pdfPath;
                        const deleting = deletingHistoryPath === item.pdfPath;
                        return (
                          <div
                            key={item.pdfPath}
                            onClick={() => setSelectedHistoryPath(item.pdfPath)}
                            className={`rounded-lg border p-2.5 cursor-pointer transition ${
                              selected ? "border-amber-400 bg-amber-50 ring-2 ring-amber-500/10" : "border-slate-200 hover:border-amber-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-800">Revision {item.revision}</span>
                                  {index === 0 && <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">LATEST</span>}
                                </div>
                                <p className="mt-0.5 text-[10px] text-slate-500 truncate" title={item.fileName}>{item.fileName}</p>
                                <p className="mt-1 text-[10px] text-slate-500 flex items-center gap-1.5">
                                  <Clock3 className="w-3 h-3" /> {formatSavedAt(item.savedAt)} • {formatBytes(item.size)}
                                </p>
                              </div>
                              <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${selected ? "border-amber-500" : "border-slate-300"}`}>
                                {selected && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                              </div>
                            </div>
                            <div className="mt-2 flex gap-2">
                              {item.signedUrl && (
                                <a
                                  href={item.signedUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="flex-1 px-2 py-1.5 rounded-md border border-slate-300 bg-white text-[10px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Buka PDF
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void openHistoryForEdit(item);
                                }}
                                disabled={!!activeAction}
                                className="flex-1 px-2 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                              >
                                {activeAction === "history" && selected ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
                                Edit Ulang
                              </button>
                              <button
                                type="button"
                                title={`Hapus Revision ${item.revision}`}
                                aria-label={`Hapus Revision ${item.revision}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedHistoryPath(item.pdfPath);
                                  void deleteHistoryRevision(item);
                                }}
                                disabled={!!activeAction}
                                className="px-2.5 py-1.5 rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 text-[10px] font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                              >
                                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                <span className="sr-only sm:not-sr-only">Hapus</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              Grand Total: <b className="text-amber-700 font-mono">Rp {fmt(summary.grandTotal)}</b>
            </span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onClose} disabled={isSaving} className={`${btn} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}>
                Batal
              </button>
              <button type="button" onClick={saveInvoiceAndPdf} disabled={busy || invNoInvalid} className={`${btn} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}>
                {spin("save", <Save className="w-4 h-4" />)} Simpan
              </button>
              <button type="button" onClick={executeExcel} disabled={busy || invNoInvalid} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
                {spin("excel", <FileSpreadsheet className="w-4 h-4" />)} Excel
              </button>
              <button type="button" onClick={executeWord} disabled={busy || invNoInvalid} className={`${btn} bg-indigo-600 hover:bg-indigo-700 text-white`}>
                {spin("word", <FileText className="w-4 h-4" />)} Word
              </button>
              <button type="button" onClick={openPreview} disabled={busy || invNoInvalid} className={`${btn} bg-amber-600 hover:bg-amber-700 text-white`}>
                {spin("preview", <Eye className="w-4 h-4" />)} Preview & PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== EDITABLE PREVIEW ===================== */}
      {preview && (
        <EditablePreview
          initialHtml={preview.initial}
          freshHtml={preview.fresh}
          title="Preview Invoice"
          subtitle={`${invoiceNo} • ${invoiceCustomer || "-"} • ${buildFileName()}.pdf`}
          busy={activeAction}
          onClose={closePreview}
          onPrint={printFromPreview}
          onWord={wordFromPreview}
        />
      )}

      {/* ===================== TOAST ===================== */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-[80] max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm flex items-start gap-2 ${
            toast.type === "success" ? "bg-emerald-600 text-white" : toast.type === "error" ? "bg-red-600 text-white" : "bg-slate-800 text-white"
          }`}
        >
          {toast.type === "success" ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : toast.type === "info" ? <Info className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}