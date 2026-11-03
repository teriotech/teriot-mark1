"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, Printer, Loader2, FileText, FileSpreadsheet, FileCheck2, ShoppingCart, Eye, Pencil, Bold, Italic,
  Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, ListOrdered, Undo2, Redo2, Eraser, Type,
  Plus, Minus, RotateCcw, ZoomIn, ZoomOut, ArrowLeft, Save, SeparatorHorizontal, Check, AlertCircle, Info,
  Highlighter, TextCursorInput,
} from "lucide-react";
import { BomGroup, PrintType } from "./types";
import { asBlob } from "html-docx-js-typescript";
import { saveAs } from "file-saver";

interface ModalQoPoProps {
  config: { group: BomGroup; type: PrintType } | null;
  onClose: () => void;
}

/* ===================== CONSTANTS ===================== */
const COMPANY = "PT. TRANSINDO MULTI INDUSTRI";
const COMPANY_LINES = [
  "www.transindomu.com",
  "Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14",
  "Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514",
  "Phone : (+62)813 2907 2842 email : sales@transindomu.com",
];
const DEFAULT_TERMS =
  "due to plan & Project activity, it might be change depends on device & condition\nThe listed prices are subject to change at any time without prior notice. \nThe estimated costs above do not include tax (11% VAT)\nThis document is valid and recognized as an official quotation\nestimate from the company. Payment shall be made in accordance with the mutually agreed terms";
const DEFAULT_APPROVER = "Damita";
const APPROVED_ROLE = "Project Manager";
const CHECKED_ROLE = "Accounting";
const LOGO_URL = "/image/transindo.png";
const FONT_SIZES = [7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

// Padding kertas preview = margin @page saat print (harus sama agar posisi identik)
const PAGE_MARGIN_Y_MM = 8;
const PAGE_MARGIN_X_MM = 10;
const MM_TO_PX = 96 / 25.4;
const PAD_TOP_PX = PAGE_MARGIN_Y_MM * MM_TO_PX;
const PAD_LEFT_PX = PAGE_MARGIN_X_MM * MM_TO_PX;

type Logo = { src: string; width: number; height: number };
type ActionKey = "save" | "excel" | "word" | "pdf" | "preview";
type Toast = { type: "success" | "error" | "info"; msg: string } | null;

/* ===================== HELPERS ===================== */
const getTodayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const rp = (n: number) => `Rp${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const nl2br = (v: unknown) => esc(v).replace(/\r?\n/g, "<br/>");

const sanitizeFileName = (s: string) =>
  s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").replace(/_+/g, "_").slice(0, 150);

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

/* ===================== DOCUMENT HTML BUILDER (Preview/PDF & Word) ===================== */
interface DocParams {
  isQO: boolean;
  docTitle: string;
  numLabel: string;
  partyLabel: string;
  partyValue: string;
  address: string;
  subject: string;
  contact: string;
  docNumber: string;
  date: string;
  shipment: string;
  groups: any[];
  grandTotal: number;
  terms: string[];
  approvedBy: string;
  checkedBy: string;
  logo: Logo;
}

function buildDocHtml(p: DocParams): string {
  const itemCount = p.groups.reduce((n, g) => n + g.items.length, 0);
  const compact = itemCount > 5;
  const fs = compact ? "8pt" : "8.5pt";
  const pad = compact ? "3px 4px" : "4px 6px";
  const cols = p.isQO ? 6 : 4;
  const td = (extra = "") => `style="border:1px solid #000;padding:${pad};vertical-align:top;${extra}"`;
  const th = (extra = "") =>
    `style="border:1px solid #000;padding:${pad};background:#dbeafe;font-weight:bold;text-align:left;vertical-align:middle;${extra}"`;
  const nb = "border:none;padding:1px 0;vertical-align:top;";

  const infoRows = (rows: [string, string][], labelW: number) =>
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="${nb}width:${labelW}px;font-weight:bold;white-space:nowrap;">${esc(k)}</td><td style="${nb}">: ${nl2br(v)}</td></tr>`
      )
      .join("");

  const left: [string, string][] = [
    [p.partyLabel, p.partyValue],
    ["Address", p.address],
    ["Subject", p.subject],
    ["Contact", p.contact],
  ];
  const right: [string, string][] = [
    [p.numLabel, p.docNumber],
    ["Date", p.date],
    ["Page", "1 of 1"],
    ["Shipment", p.shipment],
  ];

  const body = p.groups
    .map(
      (g: any) => `
      <tr><td colspan="${cols}" ${td("background:#f3f4f6;font-weight:bold;")}>${esc(g.motherPart)}</td></tr>
      ${g.items
        .map(
          (it: any) => `<tr>
          <td ${td("text-align:center;")}>${it.printIndex}</td>
          <td ${td()}>${nl2br(it.description || "-")}</td>
          <td ${td()}>${nl2br(it.technical_specification || "-")}</td>
          <td ${td("text-align:center;white-space:nowrap;")}>${esc(it.qtyNum)} ${esc(it.unit || "EA")}</td>
          ${
            p.isQO
              ? `<td ${td("text-align:right;white-space:nowrap;")}>${rp(it.unitPriceWithMargin)}</td>
                 <td ${td("text-align:right;white-space:nowrap;font-weight:bold;")}>${rp(it.totalPrice)}</td>`
              : ""
          }
        </tr>`
        )
        .join("")}
      ${
        p.isQO
          ? `<tr>
              <td colspan="5" ${td("text-align:right;background:#eff6ff;font-weight:bold;")}>Total ${esc(g.motherPart)}</td>
              <td ${td("text-align:right;background:#eff6ff;font-weight:bold;white-space:nowrap;")}>${rp(g.subTotal)}</td>
            </tr>`
          : ""
      }`
    )
    .join("");

  const totals = p.isQO
    ? ([
        ["Sub Total", "#dbeafe", true],
        ["Sub Total (Product, Material, Service) :", "#ffffff", false],
        ["Grand Total :", "#dbeafe", true],
      ] as [string, string, boolean][])
        .map(
          ([label, bg, bold]) => `<tr>
          <td colspan="5" ${td(`text-align:right;background:${bg};${bold ? "font-weight:bold;" : ""}`)}>${label}</td>
          <td ${td(`text-align:right;background:${bg};white-space:nowrap;${bold ? "font-weight:bold;" : ""}`)}>${rp(p.grandTotal)}</td>
        </tr>`
        )
        .join("")
    : "";

  const sig = (title: string, name: string, role: string) => `
    <td style="border:none;text-align:center;vertical-align:top;padding:0 6px;">
      <div style="font-weight:bold;">${title}</div>
      <br/><br/><br/><br/>
      <div style="font-weight:bold;text-decoration:underline;text-transform:uppercase;">${esc(name)}</div>
      <div style="font-weight:bold;font-size:7.5pt;">${role}</div>
    </td>`;

  const logoHtml = p.logo.src
    ? `<img src="${p.logo.src}" width="${p.logo.width}" height="${p.logo.height}" alt="Logo" style="width:${p.logo.width}px;height:${p.logo.height}px;" />`
    : `<b>${COMPANY}</b>`;

  return `<div class="qo-doc" style="font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#000;line-height:1.35;">
  <table style="width:100%;border-collapse:collapse;border-bottom:2px solid #000;">
    <tr>
      <td style="border:none;width:40%;vertical-align:middle;padding:0 0 6px 0;">${logoHtml}</td>
      <td style="border:none;text-align:right;vertical-align:middle;font-size:7.5pt;line-height:1.3;padding:0 0 6px 0;">
        <div style="font-size:9.5pt;font-weight:bold;letter-spacing:0.5px;">${COMPANY}</div>${COMPANY_LINES.map(esc).join("<br/>")}
      </td>
    </tr>
  </table>
  <div style="text-align:center;font-size:12pt;font-weight:bold;letter-spacing:3px;padding:6px 0 3px;border-bottom:1px solid #000;margin-bottom:8px;">${p.docTitle}</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <tr>
      <td style="border:none;width:55%;vertical-align:top;padding:0 10px 6px 0;">
        <table style="width:100%;border-collapse:collapse;">${infoRows(left, 62)}</table>
      </td>
      <td style="border:none;border-left:1px solid #9ca3af;width:45%;vertical-align:top;padding:0 0 6px 10px;">
        <table style="width:100%;border-collapse:collapse;">${infoRows(right, 84)}</table>
      </td>
    </tr>
  </table>
  <table style="width:100%;border-collapse:collapse;font-size:${fs};margin-bottom:10px;">
    <thead>
      <tr>
        <th ${th("width:5%;text-align:center;")}>No</th>
        <th ${th(`width:${p.isQO ? "27%" : "35%"};`)}>Description Item</th>
        <th ${th()}>Technical Spec</th>
        <th ${th("width:10%;text-align:center;")}>Qty</th>
        ${p.isQO ? `<th ${th("width:14%;text-align:right;")}>Unit Price</th><th ${th("width:15%;text-align:right;")}>Total Price</th>` : ""}
      </tr>
    </thead>
    <tbody>${body}${totals}</tbody>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:8pt;">
    <tr>
      <td style="border:none;vertical-align:top;width:${p.checkedBy ? "52%" : "62%"};padding-right:10px;">
        <div style="font-weight:bold;margin-bottom:2px;">Term &amp; Condition :</div>
        <ol style="margin:0;padding-left:16px;">${p.terms.map((t) => `<li>${esc(t.trim())}</li>`).join("")}</ol>
      </td>
      <td style="border:none;vertical-align:top;">
        <table style="width:100%;border-collapse:collapse;"><tr>
          ${p.checkedBy ? sig("Checked By", p.checkedBy, CHECKED_ROLE) : ""}
          ${sig("Approved By", p.approvedBy, APPROVED_ROLE)}
        </tr></table>
      </td>
    </tr>
  </table>
</div>`;
}

/* ===================== CSS (preview only, tidak dipakai saat print) ===================== */
const PREVIEW_CSS = `
.qo-paper{width:210mm;min-height:297mm;padding:${PAGE_MARGIN_Y_MM}mm ${PAGE_MARGIN_X_MM}mm;margin:0 auto;box-sizing:border-box;position:relative;background:#fff;color:#000;box-shadow:0 10px 30px rgba(15,23,42,.18),0 0 0 1px rgba(15,23,42,.06);border-radius:2px;outline:none;}
.qo-paper.qo-guides{background:repeating-linear-gradient(to bottom,transparent 0,transparent calc(281mm - 1px),rgba(239,68,68,.6) calc(281mm - 1px),rgba(239,68,68,.6) 281mm) content-box,#fff;}
.qo-paper.qo-editing{cursor:text;}
.qo-paper.qo-editing td:hover,.qo-paper.qo-editing th:hover{box-shadow:inset 0 0 0 1px rgba(59,130,246,.35);}
.qo-paper.qo-editing:focus-within{box-shadow:0 10px 30px rgba(15,23,42,.18),0 0 0 2px rgba(59,130,246,.4);}
.qo-paper img{max-width:100%;}
.qo-textbox{position:absolute;min-width:60px;padding:2px 4px;border:1px dashed #60a5fa;border-radius:2px;z-index:2;}
.qo-paper:not(.qo-editing) .qo-textbox{border-color:transparent;}
.qo-tb-handle,.qo-tb-del{position:absolute;top:-18px;height:17px;padding:0 6px;font:600 10px/17px system-ui,sans-serif;color:#fff;border-radius:4px 4px 0 0;user-select:none;}
.qo-tb-handle{left:-1px;background:#3b82f6;cursor:move;touch-action:none;}
.qo-tb-del{right:-1px;background:#ef4444;cursor:pointer;}
.qo-paper:not(.qo-editing) .qo-tb-handle,.qo-paper:not(.qo-editing) .qo-tb-del{display:none;}
.qo-tb-body{outline:none;min-height:1.2em;white-space:pre-wrap;}
.qo-pagebreak{position:relative;height:0;border-top:2px dashed #94a3b8;margin:12px 0;}
.qo-pagebreak::after{content:"PAGE BREAK";position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#fff;color:#64748b;font:600 9px/14px system-ui,sans-serif;padding:0 6px;letter-spacing:1px;}
.qo-paper tr.qo-break-before > td{border-top:2px dashed #f59e0b !important;}
`;

/* ===================== PRINT VIA IFRAME (terisolasi dari CSS aplikasi) ===================== */
const PRINT_CSS = `
@page{size:A4 portrait;margin:${PAGE_MARGIN_Y_MM}mm ${PAGE_MARGIN_X_MM}mm;}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#fff;color:#000;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
.qo-print-root{position:relative;width:100%;}
img{max-width:100%;}
table{border-collapse:collapse;}
tr{break-inside:avoid;page-break-inside:avoid;}
thead{display:table-header-group;}
tr.qo-break-before{break-before:page;page-break-before:always;}
.qo-pagebreak{display:block;height:0;border:0 !important;margin:0 !important;break-after:page;page-break-after:always;}
.qo-textbox{position:absolute;padding:2px 4px;border:none !important;z-index:2;}
.qo-tb-body{white-space:pre-wrap;}
`;

function printHtmlViaIframe(innerHtml: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // bersihkan iframe print lama (jika ada)
    document.querySelectorAll("iframe[data-qo-print]").forEach((f) => f.remove());

    const iframe = document.createElement("iframe");
    iframe.setAttribute("data-qo-print", "1");
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
      )}</title><style>${PRINT_CSS}</style></head><body><div class="qo-print-root">${innerHtml}</div></body></html>`
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
        // Tunggu logo/gambar & font selesai dimuat agar tidak blank
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
        // beri waktu layout selesai
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 250)));

        document.title = title; // nama default "Save as PDF"
        win.addEventListener("afterprint", () => setTimeout(cleanup, 1000), { once: true });
        win.focus();
        win.print();
        // Jangan hapus iframe langsung -> dialog print masih membaca isinya
        setTimeout(cleanup, 120000);
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

/* ===================== SMALL UI ===================== */
const inputCls =
  "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition";

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

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
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
        active ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
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

  // Isi kertas sekali saat mount (React tidak me-manage children paper)
  useLayoutEffect(() => {
    if (paperRef.current) paperRef.current.innerHTML = initialHtml;
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mode edit / lihat
  useEffect(() => {
    const p = paperRef.current;
    if (!p) return;
    p.contentEditable = editing ? "true" : "false";
    p.querySelectorAll<HTMLElement>(".qo-tb-body").forEach((b) => (b.contentEditable = editing ? "true" : "false"));
  }, [editing]);

  // Listener: input, selection, drag & hapus text box
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
      const del = t.closest(".qo-tb-del");
      if (del) {
        e.preventDefault();
        del.parentElement?.remove();
        markDirty();
        return;
      }
      const handle = t.closest(".qo-tb-handle") as HTMLElement | null;
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
  // Untuk Word: text box jadi blok biasa, page break -> page-break Word
  const getCleanHtml = () => {
    const paper = paperRef.current;
    if (!paper) return "";
    const clone = paper.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".qo-tb-handle,.qo-tb-del").forEach((n) => n.remove());
    clone.querySelectorAll<HTMLElement>(".qo-textbox").forEach((n) => {
      n.removeAttribute("style");
      n.style.margin = "4px 0";
    });
    clone.querySelectorAll(".qo-pagebreak").forEach((n) => {
      n.outerHTML = '<br clear="all" style="page-break-before:always" />';
    });
    clone.querySelectorAll<HTMLElement>("tr.qo-break-before").forEach((n) => (n.style.pageBreakBefore = "always"));
    clone.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
    return clone.innerHTML;
  };

  // Untuk PDF: buang elemen editor, koreksi posisi text box (padding kertas -> margin @page)
  const getPrintHtml = () => {
    const paper = paperRef.current;
    if (!paper) return "";
    const clone = paper.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".qo-tb-handle,.qo-tb-del").forEach((n) => n.remove());
    clone.querySelectorAll<HTMLElement>(".qo-textbox").forEach((n) => {
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

  // Shortcut: Esc = kembali, Ctrl/Cmd+P = print hasil edit
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
    clone.classList.remove("qo-break-before");
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
    box.className = "qo-textbox";
    box.contentEditable = "false";
    box.style.left = "60px";
    box.style.top = `${top}px`;
    box.innerHTML =
      '<span class="qo-tb-handle" title="Tarik untuk memindahkan">⠿ geser</span><span class="qo-tb-del" title="Hapus">✕</span><div class="qo-tb-body" contenteditable="true" style="font-size:9pt;">Teks baru</div>';
    paper.appendChild(box);
    const body = box.querySelector(".qo-tb-body") as HTMLElement;
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
      tr.classList.toggle("qo-break-before");
      flash(tr.classList.contains("qo-break-before") ? "Halaman baru dimulai dari baris ini." : "Page break baris dihapus.");
      markDirty();
      return;
    }
    const r = rangeRef.current;
    const doc = (paper.querySelector(".qo-doc") as HTMLElement) || paper;
    let el = r ? ((r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement) as HTMLElement | null) : null;
    while (el && el.parentElement && el.parentElement !== doc) el = el.parentElement;
    const pb = document.createElement("div");
    pb.className = "qo-pagebreak";
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
      {/* ===== Top Bar ===== */}
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
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${editing ? "bg-white shadow-sm text-blue-700" : "text-slate-500"}`}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${!editing ? "bg-white shadow-sm text-blue-700" : "text-slate-500"}`}
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
              className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
              title="Ctrl + P"
            >
              {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* ===== Formatting Toolbar ===== */}
        {editing && (
          <div className="flex flex-wrap items-center gap-0.5 px-4 py-1.5 border-t border-slate-100 bg-slate-50">
            <ToolBtn title="Undo (Ctrl+Z)" onClick={() => exec("undo")}><Undo2 className="w-4 h-4" /></ToolBtn>
            <ToolBtn title="Redo (Ctrl+Y)" onClick={() => exec("redo")}><Redo2 className="w-4 h-4" /></ToolBtn>
            <Sep />
            <select
              value=""
              onChange={(e) => applyFontSize(e.target.value)}
              className="h-8 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
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

      {/* ===== Paper ===== */}
      <div ref={scrollRef} className="relative flex-1 overflow-auto px-4 py-6">
        <div
          ref={paperRef}
          className={`qo-paper ${editing ? "qo-editing" : ""} ${guides ? "qo-guides" : ""}`}
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

/* ===================== MAIN ===================== */
export default function ModalQoPo({ config, onClose }: ModalQoPoProps) {
  const [dbRef, setDbRef] = useState<{ id: number; qo: string } | null>(null);
  const [printDate, setPrintDate] = useState(getTodayLocal());
  const [printAddress, setPrintAddress] = useState("");
  const [printSubject, setPrintSubject] = useState("");
  const [printContact, setPrintContact] = useState("");
  const [printShipment, setPrintShipment] = useState("");
  const [printDocNumber, setPrintDocNumber] = useState("");
  const [referenceQo, setReferenceQo] = useState("");
  const [printTerms, setPrintTerms] = useState(DEFAULT_TERMS);
  const [printDirector, setPrintDirector] = useState("");
  const [printAccounting, setPrintAccounting] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [preview, setPreview] = useState<{ initial: string; fresh: string } | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  const editedHtmlRef = useRef<string | null>(null);
  const logoRef = useRef<Promise<Logo> | null>(null);

  const isQO = config?.type === "QO";
  const docTitle = isQO ? "QUOTATION" : "PURCHASE ORDER";
  const numLabel = isQO ? "QO Number" : "PO Number";
  const displayDate = (printDate || getTodayLocal()).replace(/-/g, "/");
  const fileDateStr = (printDate || getTodayLocal()).replace(/-/g, "");
  const termsList = useMemo(() => printTerms.split("\n").map((t) => t.trim()).filter(Boolean), [printTerms]);
  const isSaving = activeAction !== null;

  const getLogo = useCallback(() => {
    if (!logoRef.current) logoRef.current = getBase64ImageWithSize(LOGO_URL, 176, 56);
    return logoRef.current;
  }, []);

  /* ---------- INIT ---------- */
  useEffect(() => {
    setPreview(null);
    editedHtmlRef.current = null;
    setHasDraft(false);
    if (!config) return;

    let cancelled = false;
    const d = new Date();
    const generated = `${config.type}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(-2)}${String(
      Math.floor(Math.random() * 1000)
    ).padStart(3, "0")}`;
    const qo = config.group.qo_number || "";

    setReferenceQo(qo);
    setPrintDocNumber(generated);
    setPrintDate(getTodayLocal());
    setPrintAddress("");
    setPrintSubject("");
    setPrintContact("");
    setPrintShipment("");
    setPrintTerms(DEFAULT_TERMS);
    setPrintAccounting("");
    setPrintDirector("");
    setDbRef(null);
    if (!qo) return;

    setIsLoadingData(true);
    getJson(`/api/management/material_qo?qo_number=${encodeURIComponent(qo)}`)
      .then(({ data: x }) => {
        if (cancelled || !x) return;
        if (x.id) setDbRef({ id: Number(x.id), qo });
        if (config.type === "QO") setPrintDocNumber(x.qo_number || generated);
        if (config.type === "PO" && x.po_number_invoice) setPrintDocNumber(x.po_number_invoice);
        if (x.address) setPrintAddress(x.address);
        if (x.subject) setPrintSubject(x.subject);
        if (x.contact) setPrintContact(x.contact);
        if (x.shipment) setPrintShipment(x.shipment);
        if (x.term_and_condition) setPrintTerms(x.term_and_condition);
        if (x.checked_by) setPrintAccounting(x.checked_by);
        if (x.approved_by) setPrintDirector(x.approved_by);
      })
      .catch((err) => console.error("Gagal mengambil data QO:", err))
      .finally(() => !cancelled && setIsLoadingData(false));

    return () => {
      cancelled = true;
    };
  }, [config]);

  // Lock scroll body saat modal terbuka
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
    if (!config?.group?.items) return { groups: [] as any[], grandTotal: 0, itemCount: 0 };
    const map = new Map<string, { items: any[]; subTotal: number }>();
    config.group.items.forEach((item: any) => {
      const key = item.mother_part || "General Part";
      if (!map.has(key)) map.set(key, { items: [], subTotal: 0 });
      const price = Number(item.price) || 0;
      const qtyNum = Number(item.qty) || 1;
      const unitPriceWithMargin = Math.round(price + (price * (Number(item.margin) || 0)) / 100);
      const totalPrice = unitPriceWithMargin * qtyNum;
      const g = map.get(key)!;
      g.items.push({ ...item, qtyNum, unitPriceWithMargin, totalPrice });
      g.subTotal += totalPrice;
    });
    let idx = 1;
    let grandTotal = 0;
    const groups = Array.from(map.entries()).map(([motherPart, d]) => {
      grandTotal += d.subTotal;
      return { motherPart, subTotal: d.subTotal, items: d.items.map((it) => ({ ...it, printIndex: idx++ })) };
    });
    return { groups, grandTotal, itemCount: idx - 1 };
  }, [config]);

  if (!config) return null;

  /* ---------- HELPERS ---------- */
  const buildFileName = () => {
    const projectName = (config.group as any).project_name || printSubject || config.group.customer || "Project";
    return sanitizeFileName(`${projectName}_${printDocNumber || config.type}_${fileDateStr}`);
  };

  const getDocParams = (logo: Logo): DocParams => ({
    isQO,
    docTitle,
    numLabel,
    partyLabel: isQO ? "To" : "From",
    partyValue: isQO ? String(config.group.customer || "-") : COMPANY,
    address: printAddress || "-",
    subject: printSubject || "-",
    contact: printContact || "-",
    docNumber: printDocNumber,
    date: displayDate,
    shipment: printShipment || "-",
    groups: groupedData.groups,
    grandTotal: groupedData.grandTotal,
    terms: termsList,
    approvedBy: printDirector.trim() || DEFAULT_APPROVER,
    checkedBy: printAccounting.trim(),
    logo,
  });

  /* ---------- SAVE ---------- */
  const saveToDatabase = async (): Promise<boolean> => {
    if (!printDocNumber.trim()) {
      setToast({ type: "error", msg: `${numLabel} wajib diisi.` });
      return false;
    }
    const payload: any = {
      customer: config.group.customer,
      address: printAddress,
      shipment: printShipment,
      contact: printContact,
      subject: printSubject,
      term_and_condition: printTerms,
      checked_by: printAccounting,
      approved_by: printDirector,
    };

    try {
      if (isQO) {
        const qoNumber = printDocNumber.trim();
        payload.qo_number = qoNumber;
        if (dbRef?.id) {
          await jsonFetch(`/api/management/material_qo?id=${dbRef.id}`, "PUT", payload);
          setDbRef({ id: dbRef.id, qo: qoNumber });
        } else {
          const created = await jsonFetch("/api/management/material_qo", "POST", payload);
          let newId = created?.id ?? created?.data?.id ?? created?.insertId ?? created?.data?.insertId;
          if (!newId) {
            const j = await getJson(`/api/management/material_qo?qo_number=${encodeURIComponent(qoNumber)}`).catch(() => null);
            newId = j?.data?.id;
          }
          if (newId) setDbRef({ id: Number(newId), qo: qoNumber });
        }
        const items = (config.group.items || []).filter((it: any) => it.id);
        const results = await Promise.allSettled(
          items.map((it: any) => jsonFetch(`/api/management/create_bom?id=${it.id}`, "PUT", { qo_number: qoNumber }))
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        setToast(
          failed
            ? { type: "error", msg: `Data QO tersimpan, tetapi ${failed} item BOM gagal di-update.` }
            : { type: "success", msg: "Data QO tersimpan ke database." }
        );
      } else {
        const refQo = referenceQo.trim();
        if (!refQo) {
          return window.confirm("Reference QO Number kosong, data PO TIDAK akan disimpan ke database.\n\nTetap lanjutkan?");
        }
        payload.po_number_invoice = printDocNumber.trim();
        let id = dbRef && dbRef.qo === refQo ? dbRef.id : null;
        if (!id) {
          const j = await getJson(`/api/management/material_qo?qo_number=${encodeURIComponent(refQo)}`);
          id = j?.data?.id ? Number(j.data.id) : null;
          if (id) setDbRef({ id, qo: refQo });
        }
        if (!id) {
          return window.confirm(`Data QO acuan "${refQo}" tidak ditemukan di database.\nData PO tidak tersimpan.\n\nTetap lanjutkan?`);
        }
        await jsonFetch(`/api/management/material_qo?id=${id}`, "PUT", payload);
        setToast({ type: "success", msg: "Data PO tersimpan ke database." });
      }
      return true;
    } catch (error: any) {
      console.error("Error saving data:", error);
      return window.confirm(`Gagal menyimpan ke database:\n${error?.message || error}\n\nTetap lanjutkan generate dokumen?`);
    }
  };

  const runWithSave = async (key: ActionKey, action?: () => void | Promise<void>) => {
    if (activeAction) return;
    setActiveAction(key);
    try {
      const ok = await saveToDatabase();
      if (ok && action) await action();
    } catch (error: any) {
      console.error(`Error (${key}):`, error);
      setToast({ type: "error", msg: `Gagal membuat dokumen: ${error?.message || error}` });
    } finally {
      setActiveAction(null);
    }
  };

  /* ---------- PREVIEW / PDF ---------- */
  const openPreview = async () => {
    if (!printDocNumber.trim()) return setToast({ type: "error", msg: `${numLabel} wajib diisi.` });
    setActiveAction("preview");
    try {
      const logo = await getLogo();
      const fresh = buildDocHtml(getDocParams(logo));
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
    editedHtmlRef.current = dirty ? html : null;
    setHasDraft(dirty);
    setPreview(null);
  };

  const printFromPreview = (printHtml: string) =>
    runWithSave("pdf", async () => {
      if (!printHtml.trim()) throw new Error("Konten preview kosong.");
      (document.activeElement as HTMLElement | null)?.blur?.();
      window.getSelection()?.removeAllRanges();
      await printHtmlViaIframe(printHtml, buildFileName());
    });

  /* ---------- WORD ---------- */
  const downloadWord = async (innerHtml: string) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(buildFileName())}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#000;} table{border-collapse:collapse;} ol{margin:0;}</style>
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
      await downloadWord(buildDocHtml(getDocParams(logo)));
    });

  const wordFromPreview = (cleanHtml: string) => runWithSave("word", () => downloadWord(cleanHtml));

  /* ---------- EXCEL (formula hidup) ---------- */
  const executeExcel = () =>
    runWithSave("excel", async () => {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = COMPANY;
      wb.created = new Date();

      const ws = wb.addWorksheet(config.type, {
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

      const lastCol = isQO ? 7 : 5;
      const LC = String.fromCharCode(64 + lastCol);
      ws.columns = (isQO ? [6, 34, 38, 8, 8, 18, 20] : [6, 42, 46, 9, 9]).map((width) => ({ width }));

      const thin: any = { style: "thin", color: { argb: "FF000000" } };
      const BORDER: any = { top: thin, left: thin, bottom: thin, right: thin };
      const FILL = (argb: string): any => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
      const NUM = '"Rp"#,##0';
      const box = (row: number, from = 1, to = lastCol, fill?: string, bold = false) => {
        for (let c = from; c <= to; c++) {
          const cell = ws.getCell(row, c);
          cell.border = BORDER;
          if (fill) cell.fill = FILL(fill);
          if (bold) cell.font = { ...(cell.font || {}), bold: true };
        }
      };
      const merge = (row: number, from: number, to: number) => {
        if (to > from) ws.mergeCells(row, from, row, to);
        return ws.getCell(row, from);
      };

      /* Header */
      const logo = await getLogo();
      if (logo.src) {
        const ext = logo.src.startsWith("data:image/jpeg") ? "jpeg" : "png";
        const id = wb.addImage({ base64: logo.src, extension: ext as any });
        ws.addImage(id, { tl: { col: 0.1, row: 0.2 } as any, ext: { width: logo.width, height: logo.height } });
      }
      [COMPANY, ...COMPANY_LINES].forEach((t, i) => {
        const cell = merge(i + 1, 3, lastCol);
        cell.value = t;
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.font = { size: i === 0 ? 11 : 8, bold: i === 0 };
      });
      for (let c = 1; c <= lastCol; c++) ws.getCell(5, c).border = { bottom: { style: "medium" } };

      const titleCell = merge(7, 1, lastCol);
      titleCell.value = docTitle;
      titleCell.font = { size: 14, bold: true };
      titleCell.alignment = { horizontal: "center" };
      for (let c = 1; c <= lastCol; c++) ws.getCell(7, c).border = { bottom: thin };

      /* Info */
      const leftTo = isQO ? 3 : 2;
      const rightFrom = leftTo + 1;
      const left: [string, string][] = [
        [isQO ? "To" : "From", isQO ? String(config.group.customer || "-") : COMPANY],
        ["Address", printAddress || "-"],
        ["Subject", printSubject || "-"],
        ["Contact", printContact || "-"],
      ];
      const right: [string, string][] = [
        [numLabel, printDocNumber],
        ["Date", displayDate],
        ["Page", "1 of 1"],
        ["Shipment", printShipment || "-"],
      ];
      const rich = (k: string, v: string): any => ({
        richText: [
          { text: `${k} : `, font: { bold: true, size: 10 } },
          { text: String(v), font: { size: 10 } },
        ],
      });
      left.forEach(([k, v], i) => {
        const row = 9 + i;
        const lc = merge(row, 1, leftTo);
        lc.value = rich(k, v);
        lc.alignment = { wrapText: true, vertical: "top" };
        const [rk, rv] = right[i];
        const rc = merge(row, rightFrom, lastCol);
        rc.value = rich(rk, rv);
        rc.alignment = { wrapText: true, vertical: "top" };
        const lines = Math.max(estLines(`${k} : ${v}`, isQO ? 70 : 48), estLines(`${rk} : ${rv}`, isQO ? 50 : 60));
        ws.getRow(row).height = Math.max(15, lines * 13);
      });

      /* Items */
      let r = 14;
      const heads = ["No", "Description Item", "Technical Spec", "Qty", "Unit", ...(isQO ? ["Unit Price", "Total Price"] : [])];
      heads.forEach((h, i) => {
        const cell = ws.getCell(r, i + 1);
        cell.value = h;
        cell.alignment = { horizontal: i === 1 || i === 2 ? "left" : "center", vertical: "middle" };
      });
      box(r, 1, lastCol, "FFDBEAFE", true);
      ws.getRow(r).height = 18;
      r++;

      const groupRefs: string[] = [];
      groupedData.groups.forEach((g: any) => {
        const gc = merge(r, 1, lastCol);
        gc.value = g.motherPart;
        box(r, 1, lastCol, "FFF3F4F6", true);
        r++;
        const start = r;
        g.items.forEach((it: any) => {
          ws.getCell(`A${r}`).value = it.printIndex;
          ws.getCell(`B${r}`).value = it.description || "-";
          ws.getCell(`C${r}`).value = it.technical_specification || "-";
          ws.getCell(`D${r}`).value = it.qtyNum;
          ws.getCell(`E${r}`).value = it.unit || "EA";
          ["A", "D", "E"].forEach((c) => (ws.getCell(`${c}${r}`).alignment = { horizontal: "center", vertical: "top" }));
          ["B", "C"].forEach((c) => (ws.getCell(`${c}${r}`).alignment = { wrapText: true, vertical: "top" }));
          if (isQO) {
            ws.getCell(`F${r}`).value = it.unitPriceWithMargin;
            ws.getCell(`G${r}`).value = { formula: `D${r}*F${r}`, result: it.totalPrice } as any;
            ws.getCell(`F${r}`).numFmt = NUM;
            ws.getCell(`G${r}`).numFmt = NUM;
          }
          const lines = Math.max(estLines(it.description || "-", isQO ? 32 : 40), estLines(it.technical_specification || "-", isQO ? 36 : 44));
          ws.getRow(r).height = Math.max(15, lines * 13);
          box(r);
          r++;
        });
        if (isQO) {
          const end = r - 1;
          const tc = merge(r, 1, 6);
          tc.value = `Total ${g.motherPart}`;
          tc.alignment = { horizontal: "right" };
          ws.getCell(`G${r}`).value = { formula: end >= start ? `SUM(G${start}:G${end})` : "0", result: g.subTotal } as any;
          ws.getCell(`G${r}`).numFmt = NUM;
          box(r, 1, lastCol, "FFEFF6FF", true);
          groupRefs.push(`G${r}`);
          r++;
        }
      });

      /* Totals (QO) */
      if (isQO) {
        const sumF = groupRefs.length ? groupRefs.join("+") : "0";
        const subRow = r;
        (
          [
            ["Sub Total", sumF, "FFDBEAFE", true],
            ["Sub Total (Product, Material, Service) :", `G${subRow}`, undefined, false],
            ["Grand Total :", `G${subRow + 1}`, "FFDBEAFE", true],
          ] as [string, string, string | undefined, boolean][]
        ).forEach(([label, formula, fill, bold]) => {
          const lc = merge(r, 1, 6);
          lc.value = label;
          lc.alignment = { horizontal: "right" };
          ws.getCell(`G${r}`).value = { formula, result: groupedData.grandTotal } as any;
          ws.getCell(`G${r}`).numFmt = NUM;
          box(r, 1, lastCol, fill, bold);
          r++;
        });
      }

      /* Terms */
      r++;
      ws.getCell(`A${r}`).value = "Term & Condition :";
      ws.getCell(`A${r}`).font = { bold: true, size: 9 };
      r++;
      termsList.forEach((t, i) => {
        ws.getCell(`A${r}`).value = `${i + 1}.`;
        ws.getCell(`A${r}`).alignment = { horizontal: "right", vertical: "top" };
        ws.getCell(`A${r}`).font = { size: 9 };
        const tc = merge(r, 2, lastCol);
        tc.value = t;
        tc.alignment = { wrapText: true, vertical: "top" };
        tc.font = { size: 9 };
        ws.getRow(r).height = Math.max(13, estLines(t, isQO ? 120 : 100) * 12);
        r++;
      });

      /* Signature */
      r++;
      const sigRow = r;
      const putSig = (from: number, to: number, t: string, name: string, role: string) => {
        const a = merge(sigRow, from, to);
        a.value = t;
        a.font = { bold: true, size: 10 };
        a.alignment = { horizontal: "center" };
        const n = merge(sigRow + 4, from, to);
        n.value = name.toUpperCase();
        n.font = { bold: true, underline: true, size: 10 };
        n.alignment = { horizontal: "center" };
        const ro = merge(sigRow + 5, from, to);
        ro.value = role;
        ro.font = { bold: true, size: 9 };
        ro.alignment = { horizontal: "center" };
      };
      if (printAccounting.trim()) putSig(2, 2, "Checked By", printAccounting.trim(), CHECKED_ROLE);
      putSig(isQO ? 5 : 3, lastCol, "Approved By", printDirector.trim() || DEFAULT_APPROVER, APPROVED_ROLE);

      ws.pageSetup.printArea = `A1:${LC}${sigRow + 5}`;

      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${buildFileName()}.xlsx`);
    });

  /* ---------- UI VARS ---------- */
  const busy = isSaving || isLoadingData;
  const docNumInvalid = !printDocNumber.trim();
  const btn =
    "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed";
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
          className="bg-slate-50 border border-slate-200 rounded-2xl w-full max-w-5xl flex flex-col shadow-2xl overflow-hidden max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2.5 rounded-xl shrink-0 ${isQO ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                {isQO ? <FileCheck2 className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800 truncate">Pengaturan Cetak {isQO ? "Quotation" : "Purchase Order"}</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isQO ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {config.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {config.group.customer || "-"} • {groupedData.groups.length} grup • {groupedData.itemCount} item
                  {isLoadingData && <span className="ml-2 text-blue-600 animate-pulse">• Memuat data tersimpan...</span>}
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
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 space-y-4">
                {!isQO && (
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <Field label="Reference QO Number (Acuan Database)">
                      <input value={referenceQo} onChange={(e) => setReferenceQo(e.target.value)} placeholder="Contoh: QO0826123" className={`${inputCls} font-mono`} />
                    </Field>
                    <p className="mt-1.5 text-[11px] text-emerald-700">Data PO akan disimpan ke record QO ini.</p>
                  </div>
                )}

                <Section title="Informasi Dokumen">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={numLabel} required>
                      <input
                        value={printDocNumber}
                        onChange={(e) => setPrintDocNumber(e.target.value)}
                        className={`${inputCls} font-mono ${docNumInvalid ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                      />
                    </Field>
                    <Field label="Date">
                      <input type="date" value={printDate} onChange={(e) => setPrintDate(e.target.value)} style={{ colorScheme: "light" }} className={inputCls} />
                    </Field>
                    <Field label="Subject" className="sm:col-span-2">
                      <input value={printSubject} onChange={(e) => setPrintSubject(e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Shipment" className="sm:col-span-2">
                      <input value={printShipment} onChange={(e) => setPrintShipment(e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                </Section>

                <Section title="Informasi Klien & Approval">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Address" className="sm:col-span-2">
                      <textarea rows={2} value={printAddress} onChange={(e) => setPrintAddress(e.target.value)} className={`${inputCls} resize-y`} />
                    </Field>
                    <Field label="Contact" className="sm:col-span-2">
                      <input value={printContact} onChange={(e) => setPrintContact(e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Checked by">
                      <input value={printAccounting} onChange={(e) => setPrintAccounting(e.target.value)} placeholder="(opsional)" className={inputCls} />
                    </Field>
                    <Field label="Approved by">
                      <input value={printDirector} onChange={(e) => setPrintDirector(e.target.value)} placeholder={DEFAULT_APPROVER} className={inputCls} />
                    </Field>
                  </div>
                </Section>

                <Section
                  title="Terms & Conditions"
                  right={
                    <button type="button" onClick={() => setPrintTerms(DEFAULT_TERMS)} className="text-[11px] font-semibold text-blue-600 hover:underline">
                      Reset default
                    </button>
                  }
                >
                  <textarea rows={5} value={printTerms} onChange={(e) => setPrintTerms(e.target.value)} className={`${inputCls} resize-y`} />
                  <p className="mt-1.5 text-[11px] text-slate-400">Satu baris = satu poin. {termsList.length} poin.</p>
                </Section>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <Section title={isQO ? "Ringkasan Harga" : "Ringkasan Item"}>
                  <div className="max-h-72 overflow-y-auto -mx-1 px-1 divide-y divide-slate-100 text-sm">
                    {groupedData.groups.length === 0 && <p className="text-slate-400 text-xs py-2">Tidak ada item.</p>}
                    {groupedData.groups.map((g: any) => (
                      <div key={g.motherPart} className="flex justify-between gap-3 py-1.5 text-slate-600">
                        <span className="truncate" title={g.motherPart}>
                          {g.motherPart} <span className="text-slate-400">({g.items.length})</span>
                        </span>
                        {isQO && <span className="font-mono shrink-0">{rp(g.subTotal)}</span>}
                      </div>
                    ))}
                  </div>
                  <div className={`mt-2 pt-2 border-t border-slate-200 flex justify-between font-bold ${isQO ? "text-blue-700" : "text-emerald-700"}`}>
                    <span>{isQO ? "Grand Total" : "Total Item"}</span>
                    <span className="font-mono">{isQO ? rp(groupedData.grandTotal) : groupedData.itemCount}</span>
                  </div>
                </Section>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <Eye className="w-4 h-4" /> Preview & PDF
                  </p>
                  <p>Klik <b>Preview & PDF</b> untuk membuka dokumen A4 yang bisa diedit bebas (teks, format, text box, baris tabel, page break) sebelum di-print / simpan sebagai PDF.</p>
                  {hasDraft && (
                    <p className="text-amber-700 font-semibold flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Ada hasil edit preview tersimpan sementara.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              {isQO ? (
                <>Grand Total: <b className="text-blue-700 font-mono">{rp(groupedData.grandTotal)}</b></>
              ) : (
                <>No. Dokumen: <b className="text-slate-700 font-mono">{printDocNumber || "-"}</b></>
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onClose} disabled={isSaving} className={`${btn} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}>
                Batal
              </button>
              <button type="button" onClick={() => runWithSave("save")} disabled={busy || docNumInvalid} className={`${btn} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}>
                {spin("save", <Save className="w-4 h-4" />)} Simpan
              </button>
              <button type="button" onClick={executeExcel} disabled={busy || docNumInvalid} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
                {spin("excel", <FileSpreadsheet className="w-4 h-4" />)} Excel
              </button>
              <button type="button" onClick={executeWord} disabled={busy || docNumInvalid} className={`${btn} bg-indigo-600 hover:bg-indigo-700 text-white`}>
                {spin("word", <FileText className="w-4 h-4" />)} Word
              </button>
              <button type="button" onClick={openPreview} disabled={busy || docNumInvalid} className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}>
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
          title={`Preview ${isQO ? "Quotation" : "Purchase Order"}`}
          subtitle={`${printDocNumber} • ${config.group.customer || "-"} • ${buildFileName()}.pdf`}
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
          {toast.type === "success" ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}