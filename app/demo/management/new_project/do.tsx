"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Check,
  Eye,
  FileDown,
  Italic,
  Loader2,
  Pencil,
  Printer,
  Redo2,
  RotateCcw,
  Save,
  Truck,
  Underline,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { asBlob } from "html-docx-js-typescript";
import { saveAs } from "file-saver";
import type { BomGroup } from "./types";

interface ModalDeliveryOrderProps {
  config: { group: BomGroup } | null;
  onClose: () => void;
}

/* ===================== TYPES & CONSTANTS ===================== */
type DeliveryDraft = {
  doNumber: string;
  date: string;
  customer: string;
  attention: string;
  address: string;
  phone: string;
  reference: string;
  vehicleNumber: string;
  driverName: string;
  notes: string;
  preparedBy: string;
  receiverName: string;
};

type StoredDraft = DeliveryDraft & { editedHtml?: string };
type BusyAction = "preview" | "print" | "word" | "save" | null;
type Logo = { src: string; width: number; height: number };
type Message = { type: "success" | "error"; text: string } | null;
type DoItem = Record<string, any> & { qtyNum: number; printIndex: number };
type DoGroup = { motherPart: string; items: DoItem[] };

const COMPANY = "PT. TRANSINDO MULTI INDUSTRI";
const COMPANY_LINES = [
  "www.transindomu.com",
  "Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14",
  "Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514",
  "Phone : (+62) 8516 3657 641 email : sales@transindomu.com",
];
const COMPANY_EMAIL = "sales@transindomu.com";
const LOGO_URL = "/image/transindo.png";
const STORAGE_PREFIX = "delivery_order_v2_";
const DEFAULT_NOTES = "Goods received in good condition and complete.";

// Margin kertas preview = margin @page saat print (harus sama agar posisi identik dengan Invoice)
const PAGE_MARGIN_Y_MM = 8;
const PAGE_MARGIN_X_MM = 10;

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

/* ===================== HELPERS ===================== */
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const generatedDoNumber = () => {
  const d = new Date();
  return `DO/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}/${String(
    Math.floor(Math.random() * 1000),
  ).padStart(3, "0")}`;
};

const esc = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string,
  );

const nl2br = (value: unknown) => esc(value).replace(/\r?\n/g, "<br/>");

const sanitizeFileName = (value: string) =>
  value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 150);

// Parse "YYYY-MM-DD" sebagai tanggal LOKAL (bukan UTC) agar tidak mundur 1 hari
const formatDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return "-";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

const getBase64ImageWithSize = async (url: string, maxW: number, maxH: number): Promise<Logo> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Logo not found");
    const blob = await response.blob();
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
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

const makeBaseDraft = (group: any): DeliveryDraft => ({
  doNumber: generatedDoNumber(),
  date: todayLocal(),
  customer: String(group?.customer || ""),
  attention: "",
  address: "",
  phone: "",
  reference: String(group?.po_number || group?.qo_number || group?.bom_code || ""),
  vehicleNumber: "",
  driverName: "",
  notes: DEFAULT_NOTES,
  preparedBy: "",
  receiverName: "",
});

/* ===================== DOCUMENT HTML BUILDER (Preview / PDF / Word) ===================== */
interface DeliveryDocParams {
  draft: DeliveryDraft;
  groups: DoGroup[];
  projectName: string;
  logo: Logo;
}

function buildDeliveryHtml(p: DeliveryDocParams): string {
  const { draft, groups, projectName, logo } = p;
  const itemCount = groups.reduce((n, g) => n + g.items.length, 0);
  const compact = itemCount > 8;
  const fs = compact ? "8pt" : "8.5pt";
  const pad = compact ? "3px 4px" : "4px 6px";
  const td = (extra = "") => `style="border:1px solid #000;padding:${pad};vertical-align:top;${extra}"`;
  const th = (extra = "") =>
    `style="border:1px solid #000;padding:${pad};background:#dbeafe;font-weight:bold;text-align:left;vertical-align:middle;${extra}"`;
  const nb = "border:none;padding:1px 0;vertical-align:top;";

  const infoRows = (rows: [string, string][], labelW: number) =>
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="${nb}width:${labelW}px;font-weight:bold;white-space:nowrap;">${esc(k)}</td><td style="${nb}">: ${nl2br(v)}</td></tr>`,
      )
      .join("");

  const left: [string, string][] = [
    ["To", draft.customer || "-"],
    ["Attn", draft.attention || "-"],
    ["Address", draft.address || "-"],
    ["Phone", draft.phone || "-"],
    ["Project", projectName || "-"],
  ];
  const right: [string, string][] = [
    ["DO No", draft.doNumber || "-"],
    ["Date", formatDate(draft.date)],
    ["Reference", draft.reference || "-"],
    ["Vehicle No", draft.vehicleNumber || "-"],
    ["Driver", draft.driverName || "-"],
  ];

  const showGroupHeader = !(groups.length === 1 && groups[0].motherPart === "General Part");

  const itemRows = groups
    .map((g) => {
      const header = showGroupHeader
        ? `<tr><td colspan="4" ${td("background:#f3f4f6;font-weight:bold;")}>${esc(g.motherPart)}</td></tr>`
        : "";
      const rows = g.items
        .map((it) => {
          const description = String(it.description || "").trim();
          const spec = String(it.technical_specification || "").trim();
          const main = description || spec || "-";
          const extra = description && spec ? ` - ${nl2br(spec)}` : "";
          const partNo = it.part_number
            ? `<br/><span style="font-size:7.5pt;color:#374151;">P/N : ${esc(it.part_number)}</span>`
            : "";
          return `<tr>
          <td ${td("text-align:center;")}>${it.printIndex}</td>
          <td ${td()}><b>${nl2br(main)}</b>${extra}${partNo}</td>
          <td ${td("text-align:center;white-space:nowrap;")}>${esc(it.qtyNum)} ${esc(it.unit || "EA")}</td>
          <td ${td()}>&nbsp;</td>
        </tr>`;
        })
        .join("");
      return header + rows;
    })
    .join("");

  const emptyRow = `<tr><td ${td("text-align:center;")}>1</td><td ${td()}>-</td><td ${td("text-align:center;")}>-</td><td ${td()}>&nbsp;</td></tr>`;

  const totalRow = itemCount
    ? `<tr>
        <td colspan="2" ${td("text-align:right;background:#eff6ff;font-weight:bold;")}>Total Items</td>
        <td colspan="2" ${td("text-align:left;background:#eff6ff;font-weight:bold;")}>${itemCount} item${itemCount > 1 ? "s" : ""}</td>
      </tr>`
    : "";

  const logoHtml = logo.src
    ? `<img src="${logo.src}" width="${logo.width}" height="${logo.height}" alt="Logo" style="width:${logo.width}px;height:${logo.height}px;" />`
    : `<b>${COMPANY}</b>`;

  const signName = (name: string) =>
    name.trim()
      ? `<div style="font-weight:bold;text-decoration:underline;text-transform:uppercase;">${esc(name)}</div>`
      : `<div style="font-weight:bold;">(______________________)</div>`;

  return `<div class="do-doc" style="font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#000;line-height:1.35;">
  <table style="width:100%;border-collapse:collapse;border-bottom:2px solid #000;">
    <tr>
      <td style="border:none;width:40%;vertical-align:middle;padding:0 0 6px 0;">${logoHtml}</td>
      <td style="border:none;text-align:right;vertical-align:middle;font-size:7.5pt;line-height:1.3;padding:0 0 6px 0;">
        <div style="font-size:9.5pt;font-weight:bold;letter-spacing:0.5px;">${COMPANY}</div>${COMPANY_LINES.map(esc).join("<br/>")}
      </td>
    </tr>
  </table>
  <div style="text-align:center;font-size:12pt;font-weight:bold;letter-spacing:3px;padding:6px 0 3px;border-bottom:1px solid #000;margin-bottom:8px;">DELIVERY ORDER</div>
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
        <th ${th("width:12%;text-align:center;")}>Qty</th>
        <th ${th("width:22%;")}>Remark</th>
      </tr>
    </thead>
    <tbody>${itemRows || emptyRow}${totalRow}</tbody>
  </table>
  <div class="do-nobreak" style="break-inside:avoid;page-break-inside:avoid;">
    <div style="border:1px solid #000;padding:5px 8px;font-size:8.5pt;margin-bottom:10px;">
      <b>Notes :</b><br/>${nl2br(draft.notes || DEFAULT_NOTES)}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
      <tr>
        <td style="border:none;width:50%;vertical-align:top;text-align:center;">
          <div style="font-weight:bold;">Delivered By</div>
          <br/><br/><br/><br/>
          ${signName(draft.preparedBy)}
          <div style="font-size:7.5pt;font-weight:bold;">${COMPANY}</div>
        </td>
        <td style="border:none;width:50%;vertical-align:top;text-align:center;">
          <div style="font-weight:bold;">Received By</div>
          <br/><br/><br/><br/>
          ${signName(draft.receiverName)}
          <div style="font-size:7.5pt;font-weight:bold;">${esc(draft.customer || "Customer")}</div>
          <div style="font-size:7.5pt;margin-top:2px;">Date : ____ / ____ / ________</div>
        </td>
      </tr>
    </table>
    <div style="margin-top:12px;padding-top:4px;border-top:1px solid #9ca3af;font-size:7.5pt;text-align:center;color:#374151;">
      Please sign and return one copy of this Delivery Order as proof of goods receipt.
    </div>
  </div>
</div>`;
}

/* ===================== CSS ===================== */
const PREVIEW_CSS = `
.do-paper{width:210mm;min-height:297mm;padding:${PAGE_MARGIN_Y_MM}mm ${PAGE_MARGIN_X_MM}mm;box-sizing:border-box;background:#fff;color:#000;outline:none;box-shadow:0 10px 30px rgba(15,23,42,.25),0 0 0 1px rgba(15,23,42,.06);border-radius:2px;}
.do-paper.do-editing{cursor:text;}
.do-paper.do-editing td:hover,.do-paper.do-editing th:hover{box-shadow:inset 0 0 0 1px rgba(37,99,235,.45);}
.do-paper.do-editing:focus-within{box-shadow:0 10px 30px rgba(15,23,42,.25),0 0 0 2px rgba(37,99,235,.45);}
.do-paper img{max-width:100%;}
`;

const PRINT_CSS = `
@page{size:A4 portrait;margin:${PAGE_MARGIN_Y_MM}mm ${PAGE_MARGIN_X_MM}mm;}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#fff;color:#000;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
.do-print-root{position:relative;width:100%;}
img{max-width:100%;}
table{border-collapse:collapse;}
tr{break-inside:avoid;page-break-inside:avoid;}
thead{display:table-header-group;}
.do-nobreak{break-inside:avoid;page-break-inside:avoid;}
`;

/* ===================== PRINT VIA IFRAME (terisolasi dari CSS aplikasi) ===================== */
function printHtmlViaIframe(innerHtml: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    document.querySelectorAll("iframe[data-do-print]").forEach((f) => f.remove());

    const iframe = document.createElement("iframe");
    iframe.setAttribute("data-do-print", "1");
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
      reject(new Error("Browser does not support printing via iframe."));
      return;
    }

    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="${window.location.origin}/"><title>${esc(
        title,
      )}</title><style>${PRINT_CSS}</style></head><body><div class="do-print-root">${innerHtml}</div></body></html>`,
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
          Array.from(doc.images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((done) => {
                  img.onload = () => done();
                  img.onerror = () => done();
                }),
          ),
        );
        await new Promise((r) => window.setTimeout(r, 150));
        document.title = title;
        win.addEventListener("afterprint", cleanup);
        win.focus();
        win.print();
        window.setTimeout(cleanup, 60000);
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    window.setTimeout(run, 100);
  });
}

/* ===================== SMALL UI PIECES ===================== */
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

/* ===================== EDITABLE PREVIEW ===================== */
function EditablePreview({
  html,
  title,
  busy,
  onClose,
  onPrint,
  onWord,
}: {
  html: string;
  title: string;
  busy: BusyAction;
  onClose: (editedHtml: string) => void;
  onPrint: (editedHtml: string) => void;
  onWord: (editedHtml: string) => void;
}) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(true);
  const [zoom, setZoom] = useState(0.8);

  useEffect(() => {
    if (paperRef.current) paperRef.current.innerHTML = html;
  }, [html]);

  const currentHtml = useCallback(() => paperRef.current?.innerHTML || html, [html]);

  const exec = (command: string) => {
    const paper = paperRef.current;
    if (!paper || !editing) return;
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !paper.contains(selection.anchorNode)) paper.focus();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      /* ignore */
    }
    document.execCommand(command, false);
  };

  const actionsRef = useRef({ close: () => {}, print: () => {} });
  actionsRef.current = {
    close: () => onClose(currentHtml()),
    print: () => onPrint(currentHtml()),
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        actionsRef.current.close();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        actionsRef.current.print();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const tools = [
    { icon: Undo2, command: "undo", title: "Undo" },
    { icon: Redo2, command: "redo", title: "Redo" },
    { icon: Bold, command: "bold", title: "Bold" },
    { icon: Italic, command: "italic", title: "Italic" },
    { icon: Underline, command: "underline", title: "Underline" },
    { icon: AlignLeft, command: "justifyLeft", title: "Align left" },
    { icon: AlignCenter, command: "justifyCenter", title: "Align center" },
    { icon: AlignRight, command: "justifyRight", title: "Align right" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-950/80 backdrop-blur-sm">
      <style>{PREVIEW_CSS}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => onClose(currentHtml())} className="rounded-lg p-2 hover:bg-white/10" title="Back (Esc)">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Editable preview</p>
            <h3 className="font-extrabold">{title}</h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setEditing((value) => !value)}
            className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-bold ${editing ? "bg-blue-600" : "bg-white/10"}`}
          >
            {editing ? <Pencil className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
            {editing ? "Editing" : "Preview"}
          </button>

          {tools.map(({ icon: Icon, command, title: toolTitle }) => (
            <button
              key={command}
              type="button"
              disabled={!editing}
              onMouseDown={(event) => {
                event.preventDefault();
                exec(command);
              }}
              className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"
              title={toolTitle}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}

          <button onClick={() => setZoom((value) => Math.max(0.5, +(value - 0.1).toFixed(2)))} className="rounded-lg p-2 hover:bg-white/10" title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-11 text-center text-xs font-bold">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => Math.min(1.4, +(value + 0.1).toFixed(2)))} className="rounded-lg p-2 hover:bg-white/10" title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </button>

          <button
            onClick={() => onWord(currentHtml())}
            disabled={busy !== null}
            className="ml-2 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
          >
            {busy === "word" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Word
          </button>
          <button
            onClick={() => onPrint(currentHtml())}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {busy === "print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Print / PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="mx-auto" style={{ width: `calc(210mm * ${zoom})` }}>
          <div style={{ width: "210mm", transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            <div
              ref={paperRef}
              contentEditable={editing}
              suppressContentEditableWarning
              spellCheck={false}
              className={`do-paper ${editing ? "do-editing" : ""}`}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ===================== MAIN MODAL ===================== */
export default function ModalDeliveryOrder({ config, onClose }: ModalDeliveryOrderProps) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<DeliveryDraft>(() => makeBaseDraft(null));
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [editedHtml, setEditedHtml] = useState("");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [message, setMessage] = useState<Message>(null);
  const [loadKey, setLoadKey] = useState(0);
  const logoRef = useRef<Promise<Logo> | null>(null);

  useEffect(() => setMounted(true), []);

  const group = (config?.group ?? null) as any;

  const storageKey = useMemo(() => {
    if (!group) return "";
    return STORAGE_PREFIX + String(group.qo_number || group.bom_code || group.group_key || group.project_name || "draft");
  }, [group]);

  /* ---------- Load draft / metadata ---------- */
  useEffect(() => {
    if (!group) return;
    let cancelled = false;
    const base = makeBaseDraft(group);

    let stored: StoredDraft | null = null;
    try {
      stored = JSON.parse(localStorage.getItem(storageKey) || "null") as StoredDraft | null;
    } catch {
      stored = null;
    }

    if (stored) {
      const { editedHtml: savedHtml, ...savedDraft } = stored;
      setDraft({ ...base, ...savedDraft });
      setEditedHtml(savedHtml || "");
    } else {
      setDraft(base);
      setEditedHtml("");
    }
    setPreviewHtml(null);
    setMessage(null);

    // Gunakan metadata QO/PO yang sama dengan Invoice bila draft DO belum pernah disimpan.
    const qoNumber = String(group.qo_number || "");
    if (!stored && qoNumber) {
      fetch(`/api/management/material_qo?qo_number=${encodeURIComponent(qoNumber)}`, { cache: "no-store" })
        .then(async (response) => {
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result?.error || result?.message || `HTTP ${response.status}`);
          return result?.data;
        })
        .then((material) => {
          if (cancelled || !material) return;
          setDraft((current) => ({
            ...current,
            customer: current.customer || String(material.customer || ""),
            attention: String(material.attn_invoice || material.contact || ""),
            address: String(material.address || ""),
            reference: String(material.po_number_invoice || material.qo_number || current.reference),
          }));
        })
        .catch((error) => console.error("Failed to load Delivery Order metadata:", error));
    }

    return () => {
      cancelled = true;
    };
  }, [group, storageKey, loadKey]);

  /* ---------- Lock body scroll ---------- */
  useEffect(() => {
    if (!config) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [config]);

  /* ---------- Esc to close (only when preview is closed) ---------- */
  useEffect(() => {
    if (!config || previewHtml) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && busy === null) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [config, previewHtml, busy, onClose]);

  /* ---------- Auto-hide message ---------- */
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  /* ---------- Grouping (sama seperti Invoice, tanpa harga) ---------- */
  const groups = useMemo<DoGroup[]>(() => {
    const items = ((group?.items || []) as any[]) ?? [];
    const map = new Map<string, any[]>();
    items.forEach((item) => {
      const key = item.mother_part || "General Part";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    let index = 1;
    return Array.from(map.entries()).map(([motherPart, list]) => ({
      motherPart,
      items: list.map((item) => ({ ...item, qtyNum: Number(item.qty) || 1, printIndex: index++ })),
    }));
  }, [group]);

  const itemCount = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  const updateDraft = (patch: Partial<DeliveryDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setEditedHtml("");
    setMessage(null);
  };

  const getLogo = useCallback(() => {
    if (!logoRef.current) logoRef.current = getBase64ImageWithSize(LOGO_URL, 192, 48);
    return logoRef.current;
  }, []);

  const createFreshHtml = useCallback(async () => {
    if (!group) return "";
    const logo = await getLogo();
    return buildDeliveryHtml({ draft, groups, projectName: String(group.project_name || ""), logo });
  }, [group, draft, groups, getLogo]);

  const buildFileName = () => {
    const project = String(group?.project_name || draft.customer || "Project");
    return sanitizeFileName(`${project}_${draft.doNumber || "Delivery_Order"}`);
  };

  /* ---------- Actions ---------- */
  const openPreview = async () => {
    if (!group) return;
    setBusy("preview");
    try {
      setPreviewHtml(editedHtml || (await createFreshHtml()));
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to open preview" });
    } finally {
      setBusy(null);
    }
  };

  const saveDraft = () => {
    if (!storageKey) return;
    setBusy("save");
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...draft, editedHtml } satisfies StoredDraft));
      setMessage({ type: "success", text: "Draft saved in this browser" });
    } catch {
      setMessage({ type: "error", text: "Failed to save draft" });
    } finally {
      setBusy(null);
    }
  };

  const resetDraft = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setLoadKey((key) => key + 1);
    setMessage(null);
  };

  const printDocument = async (html: string) => {
    if (!html.trim()) {
      setMessage({ type: "error", text: "Preview content is empty" });
      return;
    }
    setBusy("print");
    try {
      setEditedHtml(html);
      (document.activeElement as HTMLElement | null)?.blur?.();
      window.getSelection()?.removeAllRanges();
      await printHtmlViaIframe(html, buildFileName());
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to open print dialog" });
    } finally {
      setBusy(null);
    }
  };

  const exportWord = async (html: string) => {
    if (!html.trim()) {
      setMessage({ type: "error", text: "Preview content is empty" });
      return;
    }
    setBusy("word");
    try {
      setEditedHtml(html);
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(buildFileName())}</title>
        <style>body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#000;} table{border-collapse:collapse;}</style>
        </head><body>${html}</body></html>`;
      const blob = await asBlob(fullHtml, {
        orientation: "portrait",
        margins: { top: 567, right: 567, bottom: 567, left: 567, header: 360, footer: 360, gutter: 0 },
      });
      saveAs(blob as Blob, `${buildFileName()}.docx`);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to export Word" });
    } finally {
      setBusy(null);
    }
  };

  if (!mounted || !config) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        onMouseDown={(event) => event.target === event.currentTarget && busy === null && !previewHtml && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <Truck className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">Delivery Order</h2>
                <p className="truncate text-xs text-slate-500">
                  {draft.customer || "-"} • {groups.length} group{groups.length !== 1 ? "s" : ""} • {itemCount} item{itemCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={busy !== null}
              aria-label="Close"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto px-6 py-5">
            <Section title="Delivery Details">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="DO Number">
                  <input value={draft.doNumber} onChange={(e) => updateDraft({ doNumber: e.target.value })} className={`${inputClass} font-mono`} />
                </Field>
                <Field label="Delivery Date">
                  <input type="date" value={draft.date} onChange={(e) => updateDraft({ date: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Reference (QO / PO)" className="sm:col-span-2">
                  <input value={draft.reference} onChange={(e) => updateDraft({ reference: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Vehicle Number">
                  <input value={draft.vehicleNumber} onChange={(e) => updateDraft({ vehicleNumber: e.target.value })} placeholder="e.g. B 1234 XYZ" className={inputClass} />
                </Field>
                <Field label="Driver Name">
                  <input value={draft.driverName} onChange={(e) => updateDraft({ driverName: e.target.value })} className={inputClass} />
                </Field>
              </div>
            </Section>

            <Section title="Customer">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Customer">
                  <input value={draft.customer} onChange={(e) => updateDraft({ customer: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Attention">
                  <input value={draft.attention} onChange={(e) => updateDraft({ attention: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Phone">
                  <input value={draft.phone} onChange={(e) => updateDraft({ phone: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Receiver Name">
                  <input value={draft.receiverName} onChange={(e) => updateDraft({ receiverName: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Delivery Address" className="sm:col-span-2">
                  <textarea rows={2} value={draft.address} onChange={(e) => updateDraft({ address: e.target.value })} className={`${inputClass} resize-y`} />
                </Field>
              </div>
            </Section>

            <Section title="Notes & Signature">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Notes" className="sm:col-span-2">
                  <textarea rows={2} value={draft.notes} onChange={(e) => updateDraft({ notes: e.target.value })} className={`${inputClass} resize-y`} />
                </Field>
                <Field label="Delivered By" className="sm:col-span-2">
                  <input value={draft.preparedBy} onChange={(e) => updateDraft({ preparedBy: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Item diambil otomatis dari BOM ({itemCount} item) tanpa harga. Qty, deskripsi, dan remark tetap bisa diedit langsung di preview sebelum print / export.
              </p>
            </Section>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="min-h-[20px] text-xs font-semibold">
              {message ? (
                <span className={`inline-flex items-center gap-1 ${message.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
                  {message.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {message.text}
                </span>
              ) : (
                <span className="text-slate-500">Print dan export tersedia melalui Preview & Edit.</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={resetDraft} disabled={busy !== null} className={buttonClass}>
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
              <button onClick={saveDraft} disabled={busy !== null} className={buttonClass}>
                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
              </button>
              <button
                onClick={openPreview}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview & Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewHtml && (
        <EditablePreview
          html={previewHtml}
          title={`${draft.doNumber || "Delivery Order"} · ${draft.customer || "Customer"}`}
          busy={busy}
          onClose={(html) => {
            setEditedHtml(html);
            setPreviewHtml(null);
          }}
          onPrint={printDocument}
          onWord={exportWord}
        />
      )}
    </>,
    document.body,
  );
}