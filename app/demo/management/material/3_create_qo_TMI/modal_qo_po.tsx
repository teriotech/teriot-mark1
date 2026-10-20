"use client";
import React, { useState, useEffect, useMemo } from "react";
import { X, Printer, Loader2, FileText, FileSpreadsheet, FileCheck2, ShoppingCart } from "lucide-react";
import { BomGroup, PrintType } from "./types";
import { asBlob } from "html-docx-js-typescript";
import { saveAs } from "file-saver";

interface ModalQoPoProps {
  config: { group: BomGroup; type: PrintType } | null;
  onClose: () => void;
}

/* ===================== CONSTANTS & HELPERS ===================== */
const COMPANY = "PT. TRANSINDO MULTI INDUSTRI";
const COMPANY_LINES = [
  "www.transindomu.com",
  "Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14",
  "Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514",
  "Phone : (+62) 8516 3657 641 email : sales@transindomu.com",
];
const DEFAULT_TERMS =
  "due to plan & Project activity, it might be change depends on device & condition\nThe listed prices are subject to change at any time without prior notice. \nThe estimated costs above do not include tax (11% VAT)\nThis document is valid and recognized as an official quotation\nestimate from the company. Payment shall be made in accordance with the mutually agreed terms";
const DEFAULT_APPROVER = "Damita";

// Tanggal lokal YYYY-MM-DD
const getTodayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const rp = (n: number) => `Rp${(Number(n) || 0).toLocaleString("id-ID")}`;
const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const jsonFetch = (url: string, method: "POST" | "PUT", body: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

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

/* ===================== SMALL UI (di luar komponen agar input tidak hilang fokus) ===================== */
const inputCls =
  "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2 mb-3">{title}</h3>
      {children}
    </div>
  );
}

/* ===================== MAIN ===================== */
export default function ModalQoPo({ config, onClose }: ModalQoPoProps) {
  const [dbId, setDbId] = useState<number | null>(null);
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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const isQO = config?.type === "QO";
  const docTitle = isQO ? "QUOTATION" : "PURCHASE ORDER";
  const numLabel = isQO ? "QO Number" : "PO Number";
  const displayDate = (printDate || getTodayLocal()).replace(/-/g, "/");
  const fileDateStr = (printDate || getTodayLocal()).replace(/-/g, "");
  const termsList = useMemo(() => printTerms.split("\n").filter((t) => t.trim() !== ""), [printTerms]);

  /* ---------- INIT ---------- */
  useEffect(() => {
    if (!config) return;
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
    setDbId(null);

    if (!qo) return;
    setIsLoadingData(true);
    fetch(`/api/management/material_qo?qo_number=${encodeURIComponent(qo)}`)
      .then((res) => res.json())
      .then(({ data: x }) => {
        if (!x) return;
        setDbId(x.id);
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
      .finally(() => setIsLoadingData(false));
  }, [config]);

  // ESC untuk menutup
  useEffect(() => {
    if (!config) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && !isSaving && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [config, isSaving, onClose]);

  /* ---------- GROUPING ---------- */
  const groupedData = useMemo(() => {
    if (!config?.group?.items) return { groups: [] as any[], grandTotal: 0 };
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
    let grandTotal = 0;
    const groups = Array.from(map.entries()).map(([motherPart, d]) => {
      grandTotal += d.subTotal;
      return { motherPart, subTotal: d.subTotal, items: d.items.map((it) => ({ ...it, printIndex: idx++ })) };
    });
    return { groups, grandTotal };
  }, [config]);

  if (!config) return null;

  /* ---------- SAVE ---------- */
  const buildFileName = () => {
    const projectName = (config.group as any).project_name || printSubject || config.group.customer || "Project";
    return `${projectName}_${printDocNumber}_${fileDateStr}`.replace(/\s+/g, "_");
  };

  const saveToDatabase = async (): Promise<boolean> => {
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
        payload.qo_number = printDocNumber;
        if (dbId) await jsonFetch(`/api/management/material_qo?id=${dbId}`, "PUT", payload);
        else await jsonFetch("/api/management/material_qo", "POST", payload);

        await Promise.all(
          (config.group.items || [])
            .filter((it: any) => it.id)
            .map((it: any) => jsonFetch(`/api/management/create_bom?id=${it.id}`, "PUT", { qo_number: printDocNumber }))
        );
      } else {
        if (!referenceQo) {
          alert("Reference QO Number wajib diisi untuk menyimpan PO ke database.");
          return false;
        }
        payload.po_number_invoice = printDocNumber;
        let id = dbId;
        if (!id) {
          const res = await fetch(`/api/management/material_qo?qo_number=${encodeURIComponent(referenceQo)}`);
          const { data } = await res.json();
          id = data?.id ?? null;
          if (id) setDbId(id);
        }
        if (id) await jsonFetch(`/api/management/material_qo?id=${id}`, "PUT", payload);
        else alert("Data QO acuan tidak ditemukan di database. Data PO tidak tersimpan, namun tetap akan dicetak.");
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

  /* ---------- PDF ---------- */
  const executePrint = () =>
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

  /* ---------- WORD ---------- */
  const executeWord = () =>
    runWithSave(async () => {
      try {
        const logo = await getBase64ImageWithSize("/image/transindo.png", 176, 56);
        const compact = (config.group.items?.length || 0) > 5;
        const cell = `padding:${compact ? "4px" : "6px"};border:1px solid #000;`;
        const cols = isQO ? 6 : 4;

        const itemsRows = groupedData.groups
          .map(
            (g: any) => `
          <tr><td colspan="${cols}" style="${cell}background-color:#f3f4f6;"><b>${esc(g.motherPart)}</b></td></tr>
          ${g.items
            .map(
              (it: any) => `
            <tr>
              <td style="${cell}text-align:center;">${it.printIndex}</td>
              <td style="${cell}">${esc(it.description || "-")}</td>
              <td style="${cell}">${esc(it.technical_specification || "-")}</td>
              <td style="${cell}text-align:center;">${esc(it.qty)} ${esc(it.unit || "EA")}</td>
              ${
                isQO
                  ? `<td style="${cell}text-align:right;">${rp(it.unitPriceWithMargin)}</td>
                     <td style="${cell}text-align:right;"><b>${rp(it.totalPrice)}</b></td>`
                  : ""
              }
            </tr>`
            )
            .join("")}
          ${
            isQO
              ? `<tr>
                  <td colspan="5" style="${cell}text-align:right;background-color:#eff6ff;"><b>Total ${esc(g.motherPart)}</b></td>
                  <td style="${cell}text-align:right;background-color:#eff6ff;"><b>${rp(g.subTotal)}</b></td>
                </tr>`
              : ""
          }`
          )
          .join("");

        const totals = isQO
          ? `<table style="font-size:10pt;">
              <tr><td style="text-align:right;background-color:#dbeafe;"><b>Sub Total</b></td><td style="text-align:right;background-color:#dbeafe;width:25%;"><b>${rp(groupedData.grandTotal)}</b></td></tr>
              <tr><td style="text-align:right;">Sub Total (Product, Material, Service) :</td><td style="text-align:right;">${rp(groupedData.grandTotal)}</td></tr>
              <tr><td style="text-align:right;"><b>Grand Total :</b></td><td style="text-align:right;"><b>${rp(groupedData.grandTotal)}</b></td></tr>
            </table>`
          : "";

        const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>${config.type}_${esc(printDocNumber)}</title>
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
              <td style="width:35%;vertical-align:middle;">
                ${logo.src ? `<img src="${logo.src}" width="${logo.width}" height="${logo.height}" alt="Logo" />` : `<b>${COMPANY}</b>`}
              </td>
              <td style="text-align:right;font-size:8.5pt;line-height:1.2;"><b>${COMPANY}</b><br/>${COMPANY_LINES.join("<br/>")}</td>
            </tr>
          </table>
          <div class="title">${docTitle}</div>
          <table class="info" style="margin-bottom:15px;font-size:10pt;">
            <tr>
              <td style="width:50%;">
                <b>${isQO ? "To" : "From"}:</b> ${esc(isQO ? config.group.customer : COMPANY)}<br/>
                <b>Address:</b> ${esc(printAddress || "-")}<br/>
                <b>Subject:</b> ${esc(printSubject || "-")}<br/>
                <b>Contact:</b> ${esc(printContact || "-")}
              </td>
              <td style="width:50%;padding-left:15px;border-left:1px solid #ccc;">
                <b>${numLabel}:</b> ${esc(printDocNumber)}<br/>
                <b>Date:</b> ${displayDate}<br/>
                <b>Page:</b> 1 of 1<br/>
                <b>Shipment:</b> ${esc(printShipment || "-")}
              </td>
            </tr>
          </table>
          <table style="font-size:${compact ? "9pt" : "9.5pt"};">
            <thead><tr>
              <th style="width:5%;text-align:center;">No</th>
              <th style="width:30%;">Description Item</th>
              <th style="width:30%;">Technical Spec</th>
              <th style="width:10%;text-align:center;">Qty</th>
              ${isQO ? `<th style="width:12.5%;text-align:right;">Unit Price</th><th style="width:12.5%;text-align:right;">Total Price</th>` : ""}
            </tr></thead>
            <tbody>${itemsRows}</tbody>
          </table>
          ${totals}
          <table class="nb" style="margin-top:20px;font-size:9.5pt;">
            <tr>
              <td style="width:65%;">
                <b>Term & Condition :</b>
                <ol style="padding-left:15px;margin-top:5px;">${termsList.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
              </td>
              <td style="width:35%;text-align:center;">
                <b>Approved By</b><br/><br/><br/><br/>
                <p style="text-decoration:underline;font-weight:bold;text-transform:uppercase;margin-bottom:2px;">${esc(printDirector || DEFAULT_APPROVER)}</p>
                <b>Project Manager</b>
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

  /* ---------- EXCEL (formula hidup) ---------- */
  const executeExcel = () =>
    runWithSave(async () => {
      try {
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

        // QO: A No | B Desc | C Spec | D Qty | E Unit | F Unit Price | G Total
        // PO: A No | B Desc | C Spec | D Qty | E Unit
        const lastCol = isQO ? 7 : 5;
        const L = (c: number) => String.fromCharCode(64 + c);
        const LC = L(lastCol);
        ws.columns = [{ width: 6 }, { width: 34 }, { width: 38 }, { width: 8 }, { width: 8 }, ...(isQO ? [{ width: 18 }, { width: 20 }] : [])];

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

        /* Header */
        const logo = await getBase64ImageWithSize("/image/transindo.png", 176, 56);
        if (logo.src) {
          const ext = logo.src.includes("image/jpeg") ? "jpeg" : "png";
          const id = wb.addImage({ base64: logo.src, extension: ext as any });
          ws.addImage(id, { tl: { col: 0, row: 0.2 }, ext: { width: logo.width, height: logo.height } });
        }
        [COMPANY, ...COMPANY_LINES].forEach((t, i) => {
          const row = i + 1;
          ws.mergeCells(`C${row}:${LC}${row}`);
          const cell = ws.getCell(`C${row}`);
          cell.value = t;
          cell.alignment = { horizontal: "right" };
          cell.font = { size: i === 0 ? 11 : 8, bold: i === 0 };
        });
        for (let c = 1; c <= lastCol; c++) ws.getCell(5, c).border = { bottom: { style: "medium" } };

        ws.mergeCells(`A7:${LC}7`);
        const title = ws.getCell("A7");
        title.value = docTitle;
        title.font = { size: 14, bold: true };
        title.alignment = { horizontal: "center" };
        for (let c = 1; c <= lastCol; c++) ws.getCell(7, c).border = { bottom: thin };

        /* Info */
        const left = [
          [isQO ? "To" : "From", isQO ? config.group.customer : COMPANY],
          ["Address", printAddress || "-"],
          ["Subject", printSubject || "-"],
          ["Contact", printContact || "-"],
        ];
        const right = [
          [numLabel, printDocNumber],
          ["Date", displayDate],
          ["Page", "1 of 1"],
          ["Shipment", printShipment || "-"],
        ];
        left.forEach(([k, v], i) => {
          const row = 9 + i;
          ws.getCell(`A${row}`).value = k;
          ws.getCell(`A${row}`).font = { bold: true, size: 10 };
          ws.getCell(`B${row}`).value = `: ${v}`;
          ws.getCell(`B${row}`).alignment = { wrapText: true, vertical: "top" };
          ws.mergeCells(`D${row}:E${row}`);
          ws.getCell(`D${row}`).value = right[i][0];
          ws.getCell(`D${row}`).font = { bold: true, size: 10 };
          if (isQO) ws.mergeCells(`F${row}:G${row}`);
          const rc = ws.getCell(isQO ? `F${row}` : `C${row}`);
          if (!isQO) {
            // PO: kolom info kanan di C (karena kolom lebih sedikit)
            ws.getCell(`C${row}`).value = `${right[i][0]} : ${right[i][1]}`;
            ws.getCell(`D${row}`).value = null;
          } else rc.value = `: ${right[i][1]}`;
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
        ws.views = [{ state: "frozen", ySplit: r, showGridLines: false }];
        r++;

        const groupRefs: string[] = [];
        groupedData.groups.forEach((g: any) => {
          ws.mergeCells(`A${r}:${LC}${r}`);
          ws.getCell(`A${r}`).value = g.motherPart;
          box(r, 1, lastCol, "FFF3F4F6", true);
          r++;

          const start = r;
          g.items.forEach((it: any) => {
            ws.getCell(`A${r}`).value = it.printIndex;
            ws.getCell(`B${r}`).value = it.description || "-";
            ws.getCell(`C${r}`).value = it.technical_specification || "-";
            ws.getCell(`D${r}`).value = Number(it.qty) || 1;
            ws.getCell(`E${r}`).value = it.unit || "EA";
            ["A", "D", "E"].forEach((c) => (ws.getCell(`${c}${r}`).alignment = { horizontal: "center", vertical: "top" }));
            ["B", "C"].forEach((c) => (ws.getCell(`${c}${r}`).alignment = { wrapText: true, vertical: "top" }));
            if (isQO) {
              ws.getCell(`F${r}`).value = it.unitPriceWithMargin;
              ws.getCell(`G${r}`).value = { formula: `D${r}*F${r}`, result: it.totalPrice };
              ws.getCell(`F${r}`).numFmt = NUM;
              ws.getCell(`G${r}`).numFmt = NUM;
            }
            box(r);
            r++;
          });

          if (isQO) {
            const end = r - 1;
            ws.mergeCells(`A${r}:F${r}`);
            ws.getCell(`A${r}`).value = `Total ${g.motherPart}`;
            ws.getCell(`A${r}`).alignment = { horizontal: "right" };
            ws.getCell(`G${r}`).value = { formula: end >= start ? `SUM(G${start}:G${end})` : "0", result: g.subTotal };
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
          [
            ["Sub Total", sumF, "FFDBEAFE", true],
            ["Sub Total (Product, Material, Service) :", `G${subRow}`, undefined, false],
            ["Grand Total :", `G${subRow + 1}`, "FFDBEAFE", true],
          ].forEach(([label, formula, fill, bold]) => {
            ws.mergeCells(`A${r}:F${r}`);
            ws.getCell(`A${r}`).value = label as string;
            ws.getCell(`A${r}`).alignment = { horizontal: "right" };
            ws.getCell(`G${r}`).value = { formula: formula as string, result: groupedData.grandTotal };
            ws.getCell(`G${r}`).numFmt = NUM;
            box(r, 1, lastCol, fill as string | undefined, bold as boolean);
            r++;
          });
        }

        /* Terms & Signature */
        r++;
        const footStart = r;
        ws.getCell(`A${r}`).value = "Term & Condition :";
        ws.getCell(`A${r}`).font = { bold: true, size: 9 };
        r++;
        termsList.forEach((t, i) => {
          ws.getCell(`A${r}`).value = `${i + 1}.`;
          ws.getCell(`A${r}`).alignment = { horizontal: "right", vertical: "top" };
          ws.mergeCells(`B${r}:C${r}`);
          ws.getCell(`B${r}`).value = t.trim();
          ws.getCell(`B${r}`).alignment = { wrapText: true, vertical: "top" };
          ws.getCell(`A${r}`).font = { size: 9 };
          ws.getCell(`B${r}`).font = { size: 9 };
          r++;
        });

        const sigFrom = isQO ? "E" : "D";
        ws.mergeCells(`${sigFrom}${footStart}:${LC}${footStart}`);
        ws.getCell(`${sigFrom}${footStart}`).value = "Approved By";
        ws.getCell(`${sigFrom}${footStart}`).font = { bold: true, size: 10 };
        ws.getCell(`${sigFrom}${footStart}`).alignment = { horizontal: "center" };
        const signRow = Math.max(r - 2, footStart + 5);
        ws.mergeCells(`${sigFrom}${signRow}:${LC}${signRow}`);
        const sign = ws.getCell(`${sigFrom}${signRow}`);
        sign.value = (printDirector || DEFAULT_APPROVER).toUpperCase();
        sign.font = { bold: true, underline: true, size: 10 };
        sign.alignment = { horizontal: "center" };
        ws.mergeCells(`${sigFrom}${signRow + 1}:${LC}${signRow + 1}`);
        const role = ws.getCell(`${sigFrom}${signRow + 1}`);
        role.value = "Project Manager";
        role.font = { bold: true, size: 9 };
        role.alignment = { horizontal: "center" };

        ws.pageSetup.printArea = `A1:${LC}${Math.max(r, signRow + 1)}`;

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

  /* ---------- PRINT VARS ---------- */
  const isCompact = (config.group?.items?.length || 0) > 5;
  const pad = isCompact ? "py-1 px-1.5" : "py-1.5 px-2";
  const padC = isCompact ? "py-1 px-1" : "py-1.5 px-1.5";
  const busy = isSaving || isLoadingData;
  const accent = isQO ? "blue" : "emerald";

  const btn =
    "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      {/* ===================== MODAL (LIGHT THEME) ===================== */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto print:hidden"
        onMouseDown={(e) => e.target === e.currentTarget && !isSaving && onClose()}
      >
        <div className="bg-slate-50 border border-slate-200 rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden my-auto">
          {/* Header */}
          <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${accent === "blue" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                {isQO ? <FileCheck2 className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Pengaturan Cetak {isQO ? "Quotation" : "Purchase Order"}</h2>
                <p className="text-xs text-slate-500">
                  {config.group.customer} • {groupedData.groups.length} grup • {config.group.items?.length || 0} item
                  {isLoadingData && <span className="ml-2 text-blue-600 animate-pulse">• Memuat data tersimpan...</span>}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
            {!isQO && (
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <Field label="Reference QO Number (Acuan Database)">
                  <input value={referenceQo} onChange={(e) => setReferenceQo(e.target.value)} placeholder="Contoh: QO0826123" className={inputCls} />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Section title="Informasi Dokumen">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={numLabel}>
                      <input value={printDocNumber} onChange={(e) => setPrintDocNumber(e.target.value)} className={`${inputCls} font-mono`} />
                    </Field>
                    <Field label="Date">
                      <input type="date" value={printDate} onChange={(e) => setPrintDate(e.target.value)} style={{ colorScheme: "light" }} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Subject"><input value={printSubject} onChange={(e) => setPrintSubject(e.target.value)} className={inputCls} /></Field>
                  <Field label="Shipment"><input value={printShipment} onChange={(e) => setPrintShipment(e.target.value)} className={inputCls} /></Field>
                </div>
              </Section>

              <Section title="Informasi Klien">
                <div className="space-y-3">
                  <Field label="Address"><textarea rows={2} value={printAddress} onChange={(e) => setPrintAddress(e.target.value)} className={inputCls} /></Field>
                  <Field label="Contact"><input value={printContact} onChange={(e) => setPrintContact(e.target.value)} className={inputCls} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Checked by"><input value={printAccounting} onChange={(e) => setPrintAccounting(e.target.value)} className={inputCls} /></Field>
                    <Field label="Approved by"><input value={printDirector} onChange={(e) => setPrintDirector(e.target.value)} placeholder={DEFAULT_APPROVER} className={inputCls} /></Field>
                  </div>
                </div>
              </Section>
            </div>

            <Section title="Terms & Conditions">
              <textarea rows={5} value={printTerms} onChange={(e) => setPrintTerms(e.target.value)} className={inputCls} />
              <p className="mt-1.5 text-[11px] text-slate-400">Satu baris = satu poin. {termsList.length} poin.</p>
            </Section>

            {isQO && (
              <Section title="Ringkasan Harga">
                <div className="divide-y divide-slate-100 text-sm">
                  {groupedData.groups.map((g: any) => (
                    <div key={g.motherPart} className="flex justify-between py-1.5 text-slate-600">
                      <span className="truncate pr-3">{g.motherPart} <span className="text-slate-400">({g.items.length})</span></span>
                      <span className="font-mono">{rp(g.subTotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 font-bold text-blue-700">
                    <span>Grand Total</span>
                    <span className="font-mono">{rp(groupedData.grandTotal)}</span>
                  </div>
                </div>
              </Section>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              {isQO ? <>Grand Total: <b className="text-blue-700 font-mono">{rp(groupedData.grandTotal)}</b></> : <>No. Dokumen: <b className="text-slate-700 font-mono">{printDocNumber}</b></>}
            </span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onClose} disabled={isSaving} className={`${btn} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}>
                Batal
              </button>
              <button type="button" onClick={executeExcel} disabled={busy} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                Excel
              </button>
              <button type="button" onClick={executeWord} disabled={busy} className={`${btn} bg-indigo-600 hover:bg-indigo-700 text-white`}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Word
              </button>
              <button type="button" onClick={executePrint} disabled={busy} className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                PDF
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
          #print-area { page-break-after: avoid !important; }
          #print-area tr { page-break-inside: avoid; }
        }
      `}</style>

      <div id="print-area" className="hidden print:flex flex-col bg-white text-black font-sans w-full text-xs box-border">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
          <div className="w-44 h-14 flex items-center">
            <img src="/image/transindo.png" alt="Logo" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="text-right leading-tight text-[9.5px]">
            <h1 className="text-xs font-bold uppercase tracking-wider">{COMPANY}</h1>
            {COMPANY_LINES.map((l) => <p key={l}>{l}</p>)}
          </div>
        </div>

        <h2 className="text-sm font-bold uppercase tracking-widest border-b border-black pb-0.5 my-1.5 text-center">{docTitle}</h2>

        {/* Info */}
        <div className="grid grid-cols-2 gap-3 border-b border-black pb-2 mb-3 text-[10.5px]">
          <div className="space-y-0.5">
            {[
              [isQO ? "To" : "From", isQO ? config.group.customer : COMPANY],
              ["Address", printAddress || "-"],
              ["Subject", printSubject || "-"],
              ["Contact", printContact || "-"],
            ].map(([k, v]) => (
              <div key={k} className="flex"><span className="w-16 font-semibold">{k}</span><span className="flex-1">: {v}</span></div>
            ))}
          </div>
          <div className="space-y-0.5 pl-3 border-l border-gray-300">
            {[
              [numLabel, printDocNumber],
              ["Date", displayDate],
              ["Page", "1 of 1"],
              ["Shipment", printShipment || "-"],
            ].map(([k, v]) => (
              <div key={k} className="flex"><span className="w-24 font-semibold">{k}</span><span>: {v}</span></div>
            ))}
          </div>
        </div>

        {/* Items */}
        <table className={`w-full border-collapse border border-black ${isCompact ? "text-[9.5px]" : "text-[10.5px]"}`}>
          <thead>
            <tr className="bg-blue-100/50 text-left font-semibold">
              <th className={`border border-black w-8 text-center ${padC}`}>No</th>
              <th className={`border border-black w-1/4 ${pad}`}>Description Item</th>
              <th className={`border border-black ${pad}`}>Technical Spec</th>
              <th className={`border border-black w-16 text-center ${padC}`}>Qty</th>
              {isQO && (
                <>
                  <th className={`border border-black w-24 text-right ${pad}`}>Unit Price</th>
                  <th className={`border border-black w-28 text-right ${pad}`}>Total Price</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {groupedData.groups.map((g: any, gi: number) => (
              <React.Fragment key={`g-${gi}`}>
                <tr className="bg-gray-100/60 font-semibold">
                  <td colSpan={isQO ? 6 : 4} className={`border border-black ${pad}`}>{g.motherPart}</td>
                </tr>
                {g.items.map((it: any) => (
                  <tr key={it.id || it.printIndex} className="align-top">
                    <td className={`border-x border-black text-center ${padC}`}>{it.printIndex}</td>
                    <td className={`border-x border-black ${pad}`}><div className="leading-snug break-words">{it.description || "-"}</div></td>
                    <td className={`border-x border-black ${pad}`}><div className="leading-snug text-gray-800 break-words">{it.technical_specification || "-"}</div></td>
                    <td className={`border-x border-black text-center whitespace-nowrap ${padC}`}>{it.qty} {it.unit || "EA"}</td>
                    {isQO && (
                      <>
                        <td className={`border-x border-black text-right whitespace-nowrap ${pad}`}>{rp(it.unitPriceWithMargin)}</td>
                        <td className={`border-x border-black text-right font-semibold whitespace-nowrap ${pad}`}>{rp(it.totalPrice)}</td>
                      </>
                    )}
                  </tr>
                ))}
                {isQO && (
                  <tr className="bg-blue-50/50 font-semibold border-y border-black">
                    <td colSpan={5} className={`border-x border-black text-right ${pad}`}>Total {g.motherPart}</td>
                    <td className={`border-x border-black text-right ${pad}`}>{rp(g.subTotal)}</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        {isQO && (
          <div className="border border-t-0 border-black mb-3 break-inside-avoid">
            <div className={`flex justify-between bg-blue-100/50 font-bold ${isCompact ? "p-1 text-[9.5px]" : "p-1.5 text-[10.5px]"}`}>
              <span className="w-full text-right pr-4">Sub Total</span>
              <span className="w-32 text-right">{rp(groupedData.grandTotal)}</span>
            </div>
            <div className={`bg-blue-50/50 border-t border-black space-y-0.5 ${isCompact ? "p-1 text-[9px]" : "p-1.5 text-[10px]"}`}>
              <div className="flex justify-between font-semibold">
                <span className="w-full text-right pr-4">Sub Total (Product, Material, Service) :</span>
                <span className="w-32 text-right">{rp(groupedData.grandTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-[10.5px] pt-0.5 border-t border-gray-300">
                <span className="w-full text-right pr-4">Grand Total :</span>
                <span className="w-32 text-right">{rp(groupedData.grandTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Terms & Signature */}
        <div className="break-inside-avoid mt-2 pt-1 flex justify-between items-start gap-4">
          <div className="flex-1 space-y-0.5 text-[9.5px] leading-tight">
            <h3 className="font-bold">Term & Condition :</h3>
            <ol className="list-decimal pl-3 space-y-0.5">
              {termsList.map((t, i) => <li key={i}>{t}</li>)}
            </ol>
          </div>
          <div className="text-center w-48 shrink-0">
            <p className="font-bold mb-1 text-[10.5px]">Approved By</p>
            <div className={isCompact ? "h-12" : "h-16"} />
            <p className="font-bold underline uppercase border-t border-black pt-0.5 text-[10.5px]">{printDirector || DEFAULT_APPROVER}</p>
            <p className="font-bold text-[9.5px]">Project Manager</p>
          </div>
        </div>
      </div>
    </>
  );
}