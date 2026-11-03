"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardCheck, X, Printer, Loader2, FileText, Eye, Pencil, Bold, Italic, Underline, Strikethrough, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, ListOrdered, Undo2, Redo2, Eraser, Type, Plus, Minus, RotateCcw, ZoomIn, ZoomOut,
  ArrowLeft, Save, SeparatorHorizontal, Check, AlertCircle, Info, Highlighter, TextCursorInput,
} from "lucide-react";
import { BomGroup } from "./types";
import { asBlob } from "html-docx-js-typescript";
import { saveAs } from "file-saver";

interface ModalBastProps {
  config: { group: BomGroup } | null;
  onClose: () => void;
}

/* ===================== CONSTANTS ===================== */
const COMPANY = "PT. TRANSINDO MULTI INDUSTRI";
const COMPANY_LINES = [
  "www.transindomu.com",
  "Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14",
  "Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514",
  "Phone : (+62) 8516 3657 641 email : sales@transindomu.com",
];
const DEFAULT_FIRST_ADDRESS =
  "Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14, Bedahan, Sawangan, Depok";
const DEFAULT_FIRST_NAME = "Damita";
const BLANK_NAME = "____________________";
const LOGO_URL = "/image/transindo.png";
const FONT_SIZES = [7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

// Padding kertas preview = margin @page saat print
const PAGE_MARGIN_Y_MM = 10;
const PAGE_MARGIN_X_MM = 14;
const MM_TO_PX = 96 / 25.4;
const PAD_TOP_PX = PAGE_MARGIN_Y_MM * MM_TO_PX;
const PAD_LEFT_PX = PAGE_MARGIN_X_MM * MM_TO_PX;
const PAGE_CONTENT_H_MM = 297 - PAGE_MARGIN_Y_MM * 2;

type Logo = { src: string; width: number; height: number };
type ActionKey = "save" | "word" | "pdf" | "preview";
type Toast = { type: "success" | "error" | "info"; msg: string } | null;

/* ===================== HELPERS ===================== */
const getTodayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateEN = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!m) return "-";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const nl2br = (v: unknown) => esc(v).replace(/\r?\n/g, "<br/>");

const sanitizeFileName = (s: string) =>
  s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").replace(/_+/g, "_").slice(0, 150);

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
interface BastDocParams {
  qoNumber: string;
  project: string;
  date: string;
  firstCompany: string;
  firstAddress: string;
  firstName: string;
  secondCompany: string;
  secondAddress: string;
  secondName: string;
  logo: Logo;
}

function buildBastHtml(p: BastDocParams): string {
  const nb = "border:none;padding:2px 0;vertical-align:top;";
  const kv = (rows: [string, string][], w: number) =>
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="${nb}width:${w}px;font-weight:bold;white-space:nowrap;">${esc(k)}</td><td style="${nb}">: ${nl2br(v)}</td></tr>`
      )
      .join("");

  const party = (no: string, company: string, address: string, name: string, role: string) => `
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <tr>
        <td style="${nb}width:24px;font-weight:bold;">${no}</td>
        <td style="${nb}">
          <table style="width:100%;border-collapse:collapse;">${kv(
            [
              ["Company Name", company || "-"],
              ["Address", address || "-"],
              ["Name", name || BLANK_NAME],
            ],
            110
          )}</table>
          <div style="margin-top:4px;">As the responsible from <b>${esc(company || "-")}</b>, now will be called as the ${role}.</div>
        </td>
      </tr>
    </table>`;

  const sig = (title: string, company: string, name: string) => `
    <td style="border:none;width:50%;vertical-align:top;padding-right:24px;">
      <div style="font-weight:bold;">${title}</div>
      <div style="font-size:9pt;">${esc(company || "-")}</div>
      <br/><br/><br/><br/><br/>
      <div style="border-bottom:1px solid #000;width:85%;"></div>
      <div style="font-weight:bold;margin-top:3px;">${esc(name || "")}&nbsp;</div>
    </td>`;

  const logoHtml = p.logo.src
    ? `<img src="${p.logo.src}" width="${p.logo.width}" height="${p.logo.height}" alt="Logo" style="width:${p.logo.width}px;height:${p.logo.height}px;" />`
    : `<b>${COMPANY}</b>`;

  return `<div class="bp-doc" style="font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#000;line-height:1.45;">
  <table style="width:100%;border-collapse:collapse;border-bottom:2px solid #000;margin-bottom:14px;">
    <tr>
      <td style="border:none;width:40%;vertical-align:middle;padding:0 0 6px 0;">${logoHtml}</td>
      <td style="border:none;text-align:right;vertical-align:middle;font-size:7.5pt;line-height:1.3;padding:0 0 6px 0;">
        <div style="font-size:9.5pt;font-weight:bold;letter-spacing:0.5px;">${COMPANY}</div>${COMPANY_LINES.map(esc).join("<br/>")}
      </td>
    </tr>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">${kv(
    [
      ["Quotation Number", p.qoNumber || "-"],
      ["Project", p.project || "-"],
      ["Customer", p.secondCompany || "-"],
      ["Date", p.date],
    ],
    140
  )}</table>
  <div style="text-align:center;margin:10px 0 16px;">
    <span style="font-size:13pt;font-weight:bold;letter-spacing:2px;border-bottom:2px solid #000;padding-bottom:2px;">CERTIFICATE OF COMPLETION</span>
  </div>
  <p style="margin:0 0 10px;">This Certificate of Completion is made by and between :</p>
  ${party("1.", p.firstCompany, p.firstAddress, p.firstName, "First Participant")}
  ${party("2.", p.secondCompany, p.secondAddress, p.secondName, "Second Participant")}
  <p style="text-align:justify;margin:0 0 8px;">First Participant and Second Participant have already done the assessment for <b>${esc(
    p.project || "Project"
  )}</b> refer to quotation number <b>${esc(p.qoNumber || "-")}</b>.</p>
  <p style="text-align:justify;margin:0 0 8px;">As the assessment, both participants agree that the work is 100% ( One Hundred Percent ) finished and works properly.</p>
  <p style="text-align:justify;margin:0 0 36px;">In witness whereof, the participants here caused this agreement to be made and signed so that it shall be used as it must.</p>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      ${sig("FIRST PARTICIPANT", p.firstCompany, p.firstName)}
      ${sig("SECOND PARTICIPANT", p.secondCompany, p.secondName)}
    </tr>
  </table>
</div>`;
}

/* ===================== CSS PREVIEW ===================== */
const PREVIEW_CSS = `
.bp-paper{width:210mm;min-height:297mm;padding:${PAGE_MARGIN_Y_MM}mm ${PAGE_MARGIN_X_MM}mm;margin:0 auto;box-sizing:border-box;position:relative;background:#fff;color:#000;box-shadow:0 10px 30px rgba(15,23,42,.18),0 0 0 1px rgba(15,23,42,.06);border-radius:2px;outline:none;}
.bp-paper.bp-guides{background:repeating-linear-gradient(to bottom,transparent 0,transparent calc(${PAGE_CONTENT_H_MM}mm - 1px),rgba(239,68,68,.6) calc(${PAGE_CONTENT_H_MM}mm - 1px),rgba(239,68,68,.6) ${PAGE_CONTENT_H_MM}mm) content-box,#fff;}
.bp-paper.bp-editing{cursor:text;}
.bp-paper.bp-editing td:hover,.bp-paper.bp-editing p:hover{box-shadow:inset 0 0 0 1px rgba(147,51,234,.35);}
.bp-paper.bp-editing:focus-within{box-shadow:0 10px 30px rgba(15,23,42,.18),0 0 0 2px rgba(147,51,234,.4);}
.bp-paper img{max-width:100%;}
.bp-textbox{position:absolute;min-width:60px;padding:2px 4px;border:1px dashed #a855f7;border-radius:2px;z-index:2;}
.bp-paper:not(.bp-editing) .bp-textbox{border-color:transparent;}
.bp-tb-handle,.bp-tb-del{position:absolute;top:-18px;height:17px;padding:0 6px;font:600 10px/17px system-ui,sans-serif;color:#fff;border-radius:4px 4px 0 0;user-select:none;}
.bp-tb-handle{left:-1px;background:#9333ea;cursor:move;touch-action:none;}
.bp-tb-del{right:-1px;background:#ef4444;cursor:pointer;}
.bp-paper:not(.bp-editing) .bp-tb-handle,.bp-paper:not(.bp-editing) .bp-tb-del{display:none;}
.bp-tb-body{outline:none;min-height:1.2em;white-space:pre-wrap;}
.bp-pagebreak{position:relative;height:0;border-top:2px dashed #94a3b8;margin:12px 0;}
.bp-pagebreak::after{content:"PAGE BREAK";position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#fff;color:#64748b;font:600 9px/14px system-ui,sans-serif;padding:0 6px;letter-spacing:1px;}
.bp-paper tr.bp-break-before > td{border-top:2px dashed #f59e0b !important;}
`;

/* ===================== PRINT VIA IFRAME ===================== */
// @page margin 0 => browser TIDAK mencetak header/footer (jam, judul/nama file, URL localhost).
// Margin dokumen diganti: padding kiri/kanan di body + spacer thead/tfoot (berulang tiap halaman).
const PRINT_CSS = `
@page{size:A4 portrait;margin:0;}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#fff;color:#000;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
body{padding:0 ${PAGE_MARGIN_X_MM}mm;}
.bp-print-root{position:relative;width:100%;}
img{max-width:100%;}
table{border-collapse:collapse;}
tr{break-inside:avoid;page-break-inside:avoid;}
.bp-page{width:100%;border-collapse:collapse;border:none;}
.bp-page > thead{display:table-header-group;}
.bp-page > tfoot{display:table-footer-group;}
.bp-page > thead > tr > td,.bp-page > tfoot > tr > td{height:${PAGE_MARGIN_Y_MM}mm;padding:0;border:none;}
.bp-page > tbody > tr{break-inside:auto !important;page-break-inside:auto !important;}
.bp-page > tbody > tr > td{padding:0;border:none;vertical-align:top;}
tr.bp-break-before{break-before:page;page-break-before:always;}
.bp-pagebreak{display:block;height:0;border:0 !important;margin:0 !important;break-after:page;page-break-after:always;}
.bp-textbox{position:absolute;padding:2px 4px;border:none !important;z-index:2;}
.bp-tb-body{white-space:pre-wrap;}
`;

function printHtmlViaIframe(innerHtml: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    document.querySelectorAll("iframe[data-bp-print]").forEach((f) => f.remove());

    const iframe = document.createElement("iframe");
    iframe.setAttribute("data-bp-print", "1");
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");
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
      )}</title><style>${PRINT_CSS}</style></head><body><div class="bp-print-root"><table class="bp-page"><thead><tr><td></td></tr></thead><tfoot><tr><td></td></tr></tfoot><tbody><tr><td>${innerHtml}</td></tr></tbody></table></div></body></html>`
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

        document.title = title;
        win.addEventListener("afterprint", () => setTimeout(cleanup, 1000), { once: true });
        win.focus();
        win.print();
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
  "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition";

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

function Card({ title, children, accent = "text-slate-700" }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <h3 className={`text-sm font-bold border-b border-slate-100 pb-2 mb-3 ${accent}`}>{title}</h3>
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
        active ? "bg-purple-100 text-purple-700" : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="w-px h-6 bg-slate-200 mx-1" />;

/* ===================== EDITABLE PREVIEW ===================== */
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
    p.querySelectorAll<HTMLElement>(".bp-tb-body").forEach((b) => (b.contentEditable = editing ? "true" : "false"));
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
      const del = t.closest(".bp-tb-del");
      if (del) {
        e.preventDefault();
        del.parentElement?.remove();
        markDirty();
        return;
      }
      const handle = t.closest(".bp-tb-handle") as HTMLElement | null;
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

  const getCleanHtml = () => {
    const paper = paperRef.current;
    if (!paper) return "";
    const clone = paper.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".bp-tb-handle,.bp-tb-del").forEach((n) => n.remove());
    clone.querySelectorAll<HTMLElement>(".bp-textbox").forEach((n) => {
      n.removeAttribute("style");
      n.style.margin = "4px 0";
    });
    clone.querySelectorAll(".bp-pagebreak").forEach((n) => {
      n.outerHTML = '<br clear="all" style="page-break-before:always" />';
    });
    clone.querySelectorAll<HTMLElement>("tr.bp-break-before").forEach((n) => (n.style.pageBreakBefore = "always"));
    clone.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
    return clone.innerHTML;
  };

   const getPrintHtml = () => {
    const paper = paperRef.current;
    if (!paper) return "";
    const clone = paper.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".bp-tb-handle,.bp-tb-del").forEach((n) => n.remove());
    clone.querySelectorAll<HTMLElement>(".bp-textbox").forEach((n) => {
      // kiri: body punya padding = margin kiri -> kurangi; atas: root mulai di tepi atas kertas -> tetap
      n.style.left = `${Math.max(0, Math.round((parseFloat(n.style.left) || 0) - PAD_LEFT_PX))}px`;
      n.style.top = `${Math.max(0, Math.round(parseFloat(n.style.top) || 0))}px`;
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
    const clone = tr.cloneNode(true) as HTMLTableRowElement;
    clone.classList.remove("bp-break-before");
    clone.querySelectorAll("td,th").forEach((c) => ((c as HTMLElement).innerHTML = "&nbsp;"));
    tr.after(clone);
    markDirty();
  };

  const deleteRow = () => {
    const tr = currentRow();
    if (!tr) return flash("Klik dulu baris tabel yang ingin dihapus.");
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
    box.className = "bp-textbox";
    box.contentEditable = "false";
    box.style.left = "60px";
    box.style.top = `${top}px`;
    box.innerHTML =
      '<span class="bp-tb-handle" title="Tarik untuk memindahkan">⠿ geser</span><span class="bp-tb-del" title="Hapus">✕</span><div class="bp-tb-body" contenteditable="true" style="font-size:10pt;">Teks baru</div>';
    paper.appendChild(box);
    const body = box.querySelector(".bp-tb-body") as HTMLElement;
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
    const r = rangeRef.current;
    const doc = (paper.querySelector(".bp-doc") as HTMLElement) || paper;
    let el = r ? ((r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement) as HTMLElement | null) : null;
    while (el && el.parentElement && el.parentElement !== doc) el = el.parentElement;
    const pb = document.createElement("div");
    pb.className = "bp-pagebreak";
    pb.contentEditable = "false";
    if (el && el.parentElement === doc) doc.insertBefore(pb, el);
    else doc.appendChild(pb);
    flash("Page break ditambahkan sebelum blok yang dipilih. Hapus dengan Backspace/Delete.");
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
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${editing ? "bg-white shadow-sm text-purple-700" : "text-slate-500"}`}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${!editing ? "bg-white shadow-sm text-purple-700" : "text-slate-500"}`}
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
              className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50"
              title="Ctrl + P"
            >
              {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Print / Save PDF
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
              className="h-8 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none focus:border-purple-500"
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
            <ToolBtn title="Justify" onClick={() => exec("justifyFull")}><AlignJustify className="w-4 h-4" /></ToolBtn>
            <ToolBtn title="Numbering" onClick={() => exec("insertOrderedList")}><ListOrdered className="w-4 h-4" /></ToolBtn>
            <ToolBtn title="Hapus format" onClick={() => exec("removeFormat")}><Eraser className="w-4 h-4" /></ToolBtn>
            <Sep />
            <ToolBtn title="Tambah text box bebas (bisa digeser)" onClick={addTextBox}>
              <TextCursorInput className="w-4 h-4" /> Text Box
            </ToolBtn>
            <ToolBtn title="Tambah baris di bawah baris yang dipilih" onClick={addRow}>
              <Plus className="w-4 h-4" /> Baris
            </ToolBtn>
            <ToolBtn title="Hapus baris yang dipilih" onClick={deleteRow}>
              <Minus className="w-4 h-4" /> Baris
            </ToolBtn>
            <ToolBtn title="Sisipkan page break" onClick={togglePageBreak}>
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

      <div ref={scrollRef} className="relative flex-1 overflow-auto px-4 py-6">
        <div
          ref={paperRef}
          className={`bp-paper ${editing ? "bp-editing" : ""} ${guides ? "bp-guides" : ""}`}
          style={{ zoom } as React.CSSProperties}
          spellCheck={false}
          suppressContentEditableWarning
        />
        <p className="text-center text-[11px] text-slate-500 mt-4">
          Klik teks mana pun untuk mengedit. Garis merah = perkiraan batas halaman A4 (tidak ikut tercetak).
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
export default function ModalBast({ config, onClose }: ModalBastProps) {
  const [dbRef, setDbRef] = useState<{ id: number; qo: string } | null>(null);
  const [bastQoNumber, setBastQoNumber] = useState("");
  const [bastProject, setBastProject] = useState("");
  const [bastDate, setBastDate] = useState(getTodayLocal());
  const [bastFirstCompany, setBastFirstCompany] = useState(COMPANY);
  const [bastFirstAddress, setBastFirstAddress] = useState(DEFAULT_FIRST_ADDRESS);
  const [bastFirstName, setBastFirstName] = useState(DEFAULT_FIRST_NAME);
  const [bastSecondCompany, setBastSecondCompany] = useState("");
  const [bastSecondAddress, setBastSecondAddress] = useState("");
  const [bastSecondName, setBastSecondName] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [preview, setPreview] = useState<{ initial: string; fresh: string } | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  const editedHtmlRef = useRef<string | null>(null);
  const logoRef = useRef<Promise<Logo> | null>(null);

  const isSaving = activeAction !== null;

  const getLogo = useCallback(() => {
    if (!logoRef.current) logoRef.current = getBase64ImageWithSize(LOGO_URL, 192, 48);
    return logoRef.current;
  }, []);

  /* ---------- INIT ---------- */
  useEffect(() => {
    setPreview(null);
    editedHtmlRef.current = null;
    setHasDraft(false);
    setIsLoadingData(false);
    if (!config) return;

    let cancelled = false;
    const qo = config.group.qo_number || "";
    const customer = String(config.group.customer || "");

    setBastQoNumber(qo);
    setBastProject(String((config.group as any).project_name || ""));
    setBastDate(getTodayLocal());
    setBastFirstCompany(COMPANY);
    setBastFirstAddress(DEFAULT_FIRST_ADDRESS);
    setBastFirstName(DEFAULT_FIRST_NAME);
    setBastSecondCompany(customer);
    setBastSecondAddress("");
    setBastSecondName("");
    setDbRef(null);
    if (!qo) return;

    setIsLoadingData(true);
    getJson(`/api/management/material_qo?qo_number=${encodeURIComponent(qo)}`)
      .then(({ data: x }) => {
        if (cancelled || !x) return;
        if (x.id) setDbRef({ id: Number(x.id), qo });
        if (x.project_name) setBastProject(x.project_name);
        if (x.responsible_name_bast) setBastFirstName(x.responsible_name_bast);
        if (x.address) setBastSecondAddress(x.address);
        if (x.customer) setBastSecondCompany(x.customer);
      })
      .catch((err) => console.error("Gagal mengambil data BAST:", err))
      .finally(() => {
        if (!cancelled) setIsLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config]);

  useEffect(() => {
    if (!config) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [config]);

  useEffect(() => {
    if (!config) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !preview && !isSaving) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [config, preview, isSaving, onClose]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!config) return null;

  /* ---------- HELPERS ---------- */
  const buildFileName = () => {
    const projectName = bastProject.trim() || bastSecondCompany.trim() || "Project";
    return sanitizeFileName(`BAST_${projectName}_${bastQoNumber || "QO"}_${(bastDate || getTodayLocal()).replace(/-/g, "")}`);
  };

  const getDocParams = (logo: Logo): BastDocParams => ({
    qoNumber: bastQoNumber.trim(),
    project: bastProject.trim(),
    date: formatDateEN(bastDate),
    firstCompany: bastFirstCompany.trim(),
    firstAddress: bastFirstAddress.trim(),
    firstName: bastFirstName.trim(),
    secondCompany: bastSecondCompany.trim(),
    secondAddress: bastSecondAddress.trim(),
    secondName: bastSecondName.trim(),
    logo,
  });

  /* ---------- SAVE ---------- */
  const saveToDatabase = async (saveOnly: boolean): Promise<boolean> => {
    const refQo = bastQoNumber.trim();
    if (!refQo) {
      setToast({ type: "error", msg: "Quotation Number wajib diisi sebagai acuan database." });
      return false;
    }
    const payload = { project_name: bastProject.trim(), responsible_name_bast: bastFirstName.trim() };

    try {
      let id = dbRef && dbRef.qo === refQo ? dbRef.id : null;
      if (!id) {
        const j = await getJson(`/api/management/material_qo?qo_number=${encodeURIComponent(refQo)}`);
        id = j?.data?.id ? Number(j.data.id) : null;
        if (id) setDbRef({ id, qo: refQo });
      }
      if (!id) {
        if (saveOnly) {
          setToast({ type: "error", msg: `Data QO "${refQo}" tidak ditemukan di database.` });
          return false;
        }
        return window.confirm(`Data QO "${refQo}" tidak ditemukan di database.\nData BAST tidak tersimpan.\n\nTetap lanjutkan generate dokumen?`);
      }
      await jsonFetch(`/api/management/material_qo?id=${id}`, "PUT", payload);
      setToast({ type: "success", msg: "Data BAST tersimpan ke database." });
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

  const runWithSave = async (key: ActionKey, action?: () => void | Promise<void>) => {
    if (activeAction) return;
    setActiveAction(key);
    try {
      const ok = await saveToDatabase(key === "save");
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
    if (!bastQoNumber.trim()) return setToast({ type: "error", msg: "Quotation Number wajib diisi." });
    setActiveAction("preview");
    try {
      const logo = await getLogo();
      const fresh = buildBastHtml(getDocParams(logo));
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
      <style>body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#000;} table{border-collapse:collapse;}</style>
      </head><body>${innerHtml}</body></html>`;
    const blob = await asBlob(html, {
      orientation: "portrait",
      margins: { top: 567, right: 794, bottom: 567, left: 794, header: 360, footer: 360, gutter: 0 },
    });
    saveAs(blob as Blob, `${buildFileName()}.docx`);
  };

  const executeWord = () =>
    runWithSave("word", async () => {
      const logo = await getLogo();
      await downloadWord(buildBastHtml(getDocParams(logo)));
    });

  const wordFromPreview = (cleanHtml: string) => runWithSave("word", () => downloadWord(cleanHtml));

  /* ---------- UI ---------- */
  const busy = isSaving || isLoadingData;
  const qoInvalid = !bastQoNumber.trim();
  const btn = "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed";
  const spin = (k: ActionKey, icon: React.ReactNode) => (activeAction === k ? <Loader2 className="w-4 h-4 animate-spin" /> : icon);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PREVIEW_CSS }} />

      <div
        className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
        onMouseDown={(e) => e.target === e.currentTarget && !isSaving && !preview && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="bg-slate-50 border border-slate-200 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl shrink-0 bg-purple-50 text-purple-600">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800 truncate">Pengaturan Cetak BAST</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">BAST</span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  Certificate of Completion • {bastSecondCompany || "-"}
                  {isLoadingData && <span className="ml-2 text-purple-600 animate-pulse">• Memuat data tersimpan...</span>}
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
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <Card title="Informasi Dokumen">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Quotation Number (Acuan Database)" required>
                  <input
                    value={bastQoNumber}
                    onChange={(e) => setBastQoNumber(e.target.value)}
                    placeholder="Contoh: QO0826123"
                    className={`${inputCls} font-mono ${qoInvalid ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  />
                </Field>
                <Field label="Date">
                  <input type="date" value={bastDate} onChange={(e) => setBastDate(e.target.value)} style={{ colorScheme: "light" }} className={inputCls} />
                </Field>
                <Field label="Project Name" className="sm:col-span-2">
                  <input value={bastProject} onChange={(e) => setBastProject(e.target.value)} className={inputCls} />
                </Field>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="1st Participant" accent="text-purple-700">
                <div className="space-y-3">
                  <Field label="Company Name">
                    <input value={bastFirstCompany} onChange={(e) => setBastFirstCompany(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Address">
                    <textarea rows={3} value={bastFirstAddress} onChange={(e) => setBastFirstAddress(e.target.value)} className={`${inputCls} resize-y`} />
                  </Field>
                  <Field label="Responsible Name">
                    <input value={bastFirstName} onChange={(e) => setBastFirstName(e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </Card>
              <Card title="2nd Participant" accent="text-emerald-700">
                <div className="space-y-3">
                  <Field label="Company Name">
                    <input value={bastSecondCompany} onChange={(e) => setBastSecondCompany(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Address">
                    <textarea rows={3} value={bastSecondAddress} onChange={(e) => setBastSecondAddress(e.target.value)} className={`${inputCls} resize-y`} />
                  </Field>
                  <Field label="Responsible Name">
                    <input value={bastSecondName} onChange={(e) => setBastSecondName(e.target.value)} placeholder="(kosong = garis isian)" className={inputCls} />
                  </Field>
                </div>
              </Card>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-800 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> Preview & PDF
              </p>
              <p>Klik <b>Preview & PDF</b> untuk membuka dokumen A4 yang bisa diedit bebas sebelum di-print / simpan sebagai PDF.</p>
              {hasDraft && (
                <p className="text-amber-700 font-semibold flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Ada hasil edit preview tersimpan sementara.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={onClose} disabled={isSaving} className={`${btn} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}>
              Batal
            </button>
            <button type="button" onClick={() => runWithSave("save")} disabled={busy || qoInvalid} className={`${btn} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}>
              {spin("save", <Save className="w-4 h-4" />)} Simpan
            </button>
            <button type="button" onClick={executeWord} disabled={busy || qoInvalid} className={`${btn} bg-indigo-600 hover:bg-indigo-700 text-white`}>
              {spin("word", <FileText className="w-4 h-4" />)} Word
            </button>
            <button type="button" onClick={openPreview} disabled={busy || qoInvalid} className={`${btn} bg-purple-600 hover:bg-purple-700 text-white`}>
              {spin("preview", <Eye className="w-4 h-4" />)} Preview & PDF
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <EditablePreview
          initialHtml={preview.initial}
          freshHtml={preview.fresh}
          title="Preview BAST — Certificate of Completion"
          subtitle={`${bastQoNumber} • ${bastSecondCompany || "-"} • ${buildFileName()}.pdf`}
          busy={activeAction}
          onClose={closePreview}
          onPrint={printFromPreview}
          onWord={wordFromPreview}
        />
      )}

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