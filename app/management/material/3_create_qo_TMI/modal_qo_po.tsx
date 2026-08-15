"use client";
import React, { useState, useEffect } from "react";
import { X, Printer, Loader2, FileText } from "lucide-react";
import { BomGroup, PrintType } from "./types";
import { asBlob } from "html-docx-js-typescript";
import { saveAs } from "file-saver";

interface ModalQoPoProps {
  config: { group: BomGroup; type: PrintType } | null;
  onClose: () => void;
}

export default function ModalQoPo({ config, onClose }: ModalQoPoProps) {
  const [dbId, setDbId] = useState<number | null>(null);
  const [printAddress, setPrintAddress] = useState("");
  const [printSubject, setPrintSubject] = useState("");
  const [printContact, setPrintContact] = useState("");
  const [printShipment, setPrintShipment] = useState("");
  const [printDocNumber, setPrintDocNumber] = useState("");
  const [referenceQo, setReferenceQo] = useState("");
  const [printTerms, setPrintTerms] = useState(
    "due to plan & Project activity, it might be change depends on device & condition\nThe listed prices are subject to change at any time without prior notice. \nThe estimated costs above do not include tax (11% VAT)\nThis document is valid and recognized as an official quotation\nestimate from the company. Payment shall be made in accordance with the mutually agreed terms"
  );
  const [printDirector, setPrintDirector] = useState("");
  const [printAccounting, setPrintAccounting] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (config) {
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear().toString().slice(-2);
      const randomNum = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");

      const currentQoNumber = config.group.qo_number || "";
      setReferenceQo(currentQoNumber);

      setPrintDocNumber(`${config.type}${month}${year}${randomNum}`);
      setPrintAddress("");
      setPrintSubject("");
      setPrintContact("");
      setPrintShipment("");
      setDbId(null);

      if (currentQoNumber) {
        setIsLoadingData(true);
        fetch(`/api/management/material_qo?qo_number=${currentQoNumber}`)
          .then((res) => res.json())
          .then((resData) => {
            if (resData.data) {
              const d = resData.data;
              setDbId(d.id);
              if (config.type === "QO")
                setPrintDocNumber(d.qo_number || printDocNumber);
              if (config.type === "PO" && d.po_number_invoice)
                setPrintDocNumber(d.po_number_invoice);

              if (d.address) setPrintAddress(d.address);
              if (d.subject) setPrintSubject(d.subject);
              if (d.contact) setPrintContact(d.contact);
              if (d.shipment) setPrintShipment(d.shipment);
              if (d.term_and_condition) setPrintTerms(d.term_and_condition);
              if (d.checked_by) setPrintAccounting(d.checked_by);
              if (d.approved_by) setPrintDirector(d.approved_by);
            }
          })
          .catch((err) => console.error("Gagal mengambil data QO:", err))
          .finally(() => setIsLoadingData(false));
      }
    }
  }, [config]);

  if (!config) return null;

  const saveToDatabase = async (): Promise<boolean> => {
    try {
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

      if (config.type === "QO") {
        payload.qo_number = printDocNumber;

        if (dbId) {
          await fetch(`/api/management/material_qo?id=${dbId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          await fetch("/api/management/material_qo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        if (config.group.items && config.group.items.length > 0) {
          const updateBomPromises = config.group.items.map((item) => {
            if (item.id) {
              return fetch(`/api/management/create_bom?id=${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qo_number: printDocNumber }),
              });
            }
            return Promise.resolve();
          });
          await Promise.all(updateBomPromises);
        }
      } else if (config.type === "PO") {
        payload.po_number_invoice = printDocNumber;
        if (!referenceQo) {
          alert(
            "Reference QO Number wajib diisi untuk menyimpan PO ke database."
          );
          return false;
        }

        if (dbId) {
          await fetch(`/api/management/material_qo?id=${dbId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          const res = await fetch(
            `/api/management/material_qo?qo_number=${referenceQo}`
          );
          const { data } = await res.json();
          if (data && data.id) {
            await fetch(`/api/management/material_qo?id=${data.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } else {
            alert(
              "Data QO acuan tidak ditemukan di database. Data PO tidak tersimpan, namun tetap akan dicetak."
            );
          }
        }
      }
      return true;
    } catch (error) {
      console.error("Error saving data:", error);
      alert(
        "Terjadi kesalahan saat menyimpan ke database. Dokumen tetap akan di-generate."
      );
      return true;
    }
  };

  const executePrint = async () => {
    setIsSaving(true);
    const success = await saveToDatabase();
    setIsSaving(false);
    if (success) setTimeout(() => window.print(), 300);
  };

  // Helper untuk mengubah Image URL ke Base64 + menghitung ukuran tampil
  // agar proporsinya sama persis dengan kotak logo pada layout PDF (object-contain),
  // sehingga logo tidak gepeng/stretch saat dibuka di MS Word.
  const getBase64ImageWithSize = async (
    imageUrl: string,
    maxWidth: number,
    maxHeight: number
  ): Promise<{ src: string; width: number; height: number }> => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const { naturalWidth, naturalHeight } = await new Promise<{
        naturalWidth: number;
        naturalHeight: number;
      }>((resolve) => {
        const img = new Image();
        img.onload = () =>
          resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
        img.onerror = () => resolve({ naturalWidth: maxWidth, naturalHeight: maxHeight });
        img.src = dataUrl;
      });
      // object-contain: fit inside the box without upscaling beyond original size
      const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
      return {
        src: dataUrl,
        width: Math.round(naturalWidth * scale),
        height: Math.round(naturalHeight * scale),
      };
    } catch {
      return { src: "", width: maxWidth, height: maxHeight };
    }
  };

  const executeWord = async () => {
    setIsSaving(true);
    const success = await saveToDatabase();
    setIsSaving(false);

    if (success) {
      try {
        // Fetch logo dan hitung ukurannya agar sama persis dengan kotak logo
        // pada layout PDF (w-44 h-14 = 176x56px, object-contain)
        const logo = await getBase64ImageWithSize("/image/transindo.png", 176, 56);

        // Ikuti kepadatan tabel yang sama seperti pada layout PDF (isCompact)
        // supaya dokumen Word dan PDF terlihat konsisten untuk BOM panjang
        const wordItemCount = config.group.items?.length || 0;
        const wordIsCompact = wordItemCount > 5;
        const cellPad = wordIsCompact ? "4px" : "6px";
        const cellFont = wordIsCompact ? "9pt" : "9.5pt";

        // Format items table
        const sortedItems = [...config.group.items].sort((a, b) => {
          const totalA =
            (Number(a.qty) || 1) *
            ((Number(a.price) || 0) +
              ((Number(a.price) || 0) * (Number(a.margin) || 0)) / 100);
          const totalB =
            (Number(b.qty) || 1) *
            ((Number(b.price) || 0) +
              ((Number(b.price) || 0) * (Number(b.margin) || 0)) / 100);
          return totalB - totalA;
        });

        const itemsRows = sortedItems
          .map((item, idx) => {
            const unitPriceWithMargin =
              item.price + (item.price * (item.margin || 0)) / 100;
            const totalPrice = unitPriceWithMargin * item.qty;

            return `
            <tr>
              <td style="text-align:center; padding: ${cellPad}; border: 1px solid #000;">${
                idx + 1
              }</td>
              <td style="padding: ${cellPad}; border: 1px solid #000;"><b>${
                item.description || item.mother_part || "General Part"
              }</b></td>
              <td style="padding: ${cellPad}; border: 1px solid #000;">${
                item.technical_specification || "-"
              }</td>
              <td style="text-align:center; padding: ${cellPad}; border: 1px solid #000;">${
                item.qty
              } ${item.unit || "EA"}</td>
              ${
                config.type === "QO"
                  ? `<td style="text-align:right; padding: ${cellPad}; border: 1px solid #000;">Rp${unitPriceWithMargin.toLocaleString(
                      "id-ID"
                    )}</td>
                     <td style="text-align:right; padding: ${cellPad}; border: 1px solid #000;"><b>Rp${totalPrice.toLocaleString(
                       "id-ID"
                     )}</b></td>`
                  : ""
              }
            </tr>
          `;
          })
          .join("");

        // Format Terms
        const termsList = printTerms
          .split("\n")
          .filter((term) => term.trim() !== "")
          .map((term) => `<li>${term}</li>`)
          .join("");

        // Menyusun HTML murni yang sesuai dengan standar Microsoft Word XML
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset='utf-8'>
            <title>${config.type}_${printDocNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
              th { background-color: #dbeafe; border: 1px solid #000; padding: 6px; text-align: left; }
              td { border: 1px solid #000; padding: 6px; vertical-align: top; }
              .header-table td { border: none; }
              .info-table td { border: none; padding: 2px 4px; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .title { font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <!-- HEADER -->
            <table class="header-table" style="width:100%; border-bottom: 2px solid #000; padding-bottom: 8px;">
              <tr>
                <td style="width: 35%; vertical-align: middle;">
                  ${
                    logo.src
                      ? `<img src="${logo.src}" width="${logo.width}" height="${logo.height}" alt="Logo" />`
                      : `<b>PT. TRANSINDO MULTI INDUSTRI</b>`
                  }
                </td>
                <td style="text-align: right; font-size: 8.5pt; line-height: 1.2;">
                  <b>PT. TRANSINDO MULTI INDUSTRI</b><br/>
                  www.transindomu.com<br/>
                  Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14<br/>
                  Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514<br/>
                  Phone : (+62) 8516 3657 641 email : sales@transindomu.com
                </td>
              </tr>
            </table>

            <div class="title">${
              config.type === "QO" ? "QUOTATION" : "PURCHASE ORDER"
            }</div>

            <!-- DETAIL INFORMATION -->
            <table class="info-table" style="width:100%; margin-bottom: 15px; font-size: 10pt;">
              <tr>
                <td style="width: 50%; vertical-align: top;">
                  <b>${config.type === "PO" ? "From" : "To"}:</b> ${
          config.type === "PO"
            ? "PT. TRANSINDO MULTI INDUSTRI"
            : config.group.customer
        }<br/>
                  <b>Address:</b> ${printAddress || "-"}<br/>
                  <b>Subject:</b> ${printSubject || "-"}<br/>
                  <b>Contact:</b> ${printContact || "-"}
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 15px; border-left: 1px solid #ccc;">
                  <b>${
                    config.type === "QO" ? "QO Number" : "PO Number"
                  }:</b> ${printDocNumber}<br/>
                  <b>Date:</b> ${new Date()
                    .toISOString()
                    .split("T")[0]
                    .replace(/-/g, "/")}<br/>
                  <b>Page:</b> 1 of 1<br/>
                  <b>Shipment:</b> ${printShipment || "-"}
                </td>
              </tr>
            </table>

            <!-- TABLE ITEMS -->
            <table style="width:100%; font-size: ${cellFont};">
              <thead>
                <tr>
                  <th style="width: 5%; text-align:center;">No</th>
                  <th style="width: 30%;">Description Item</th>
                  <th style="width: 30%;">Technical Spec</th>
                  <th style="width: 10%; text-align:center;">Qty</th>
                  ${
                    config.type === "QO"
                      ? `<th style="width: 12.5%; text-align:right;">Unit Price</th>
                         <th style="width: 12.5%; text-align:right;">Total Price</th>`
                      : ""
                  }
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- TOTAL SUMMARY (QO ONLY) -->
            ${
              config.type === "QO"
                ? `
              <table style="width:100%; margin-top: -13px; font-size: 10pt;">
                <tr>
                  <td colspan="4" style="text-align:right; background-color: #dbeafe; border: 1px solid #000;"><b>Sub Total</b></td>
                  <td style="text-align:right; background-color: #dbeafe; border: 1px solid #000; width: 25%;"><b>Rp${config.group.total_cost.toLocaleString(
                    "id-ID"
                  )}</b></td>
                </tr>
                <tr>
                  <td colspan="4" style="text-align:right; border: 1px solid #000;">Sub Total (Product, Material, Service) :</td>
                  <td style="text-align:right; border: 1px solid #000;">Rp${config.group.total_cost.toLocaleString(
                    "id-ID"
                  )}</td>
                </tr>
                <tr>
                  <td colspan="4" style="text-align:right; border: 1px solid #000;"><b>Grand Total :</b></td>
                  <td style="text-align:right; border: 1px solid #000;"><b>Rp${config.group.total_cost.toLocaleString(
                    "id-ID"
                  )}</b></td>
                </tr>
              </table>
            `
                : ""
            }

            <!-- TERMS & SIGNATURE -->
            <table class="header-table" style="width:100%; margin-top: 20px; font-size: 9.5pt;">
              <tr>
                <td style="width: 65%; vertical-align: top;">
                  <b>Term & Condition :</b>
                  <ol style="padding-left: 15px; margin-top: 5px;">
                    ${termsList}
                  </ol>
                </td>
                <td style="width: 35%; text-align: center; vertical-align: top;">
                  <b>Approved By</b>
                  <br/><br/><br/><br/>
                  <p style="text-decoration: underline; font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">
                    ${printDirector || "Damita"}
                  </p>
                  <b>Project Manager</b>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        // Generate Blob & Download
        const blob = await asBlob(html);
        saveAs(blob as Blob, `${config.type}_${printDocNumber}.docx`);
      } catch (error) {
        console.error("Error generating Word document:", error);
        alert("Terjadi kesalahan saat membuat file Word.");
      }
    }
  };

  const itemCount = config.group?.items?.length || 0;
  const isCompact = itemCount > 5;

  return (
    <>
      {/* MODAL SETTINGS */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto print:hidden">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden my-auto">
          <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                <Printer className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Pengaturan Cetak{" "}
                {config.type === "QO" ? "Quotation" : "Purchase Order"}
                {isLoadingData && (
                  <span className="ml-3 text-sm text-blue-400 font-normal animate-pulse">
                    Memuat data tersimpan...
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {config.type === "PO" && (
              <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700/50 mb-4">
                <label className="block text-sm font-semibold text-blue-300 mb-2">
                  Reference QO Number (Acuan Database)
                </label>
                <input
                  type="text"
                  value={referenceQo}
                  onChange={(e) => setReferenceQo(e.target.value)}
                  placeholder="Contoh: QO0826123"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={printAddress}
                  onChange={(e) => setPrintAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={printSubject}
                  onChange={(e) => setPrintSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Contact
                </label>
                <input
                  type="text"
                  value={printContact}
                  onChange={(e) => setPrintContact(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Shipment
                </label>
                <input
                  type="text"
                  value={printShipment}
                  onChange={(e) => setPrintShipment(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Terms & Conditions
              </label>
              <textarea
                rows={4}
                value={printTerms}
                onChange={(e) => setPrintTerms(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Checked by
                </label>
                <input
                  type="text"
                  value={printAccounting}
                  onChange={(e) => setPrintAccounting(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Approved by
                </label>
                <input
                  type="text"
                  value={printDirector}
                  onChange={(e) => setPrintDirector(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-800 border-t border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={executeWord}
              disabled={isSaving || isLoadingData}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {isSaving ? "Menyimpan..." : "Generate Word"}
            </button>
            <button
              type="button"
              onClick={executePrint}
              disabled={isSaving || isLoadingData}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {isSaving ? "Menyimpan..." : "Generate PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* HIDDEN PRINT LAYOUT FOR PDF PRINTING */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #fff !important;
          }
          #print-area {
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <div
        id="print-area"
        className="hidden print:flex flex-col justify-start bg-white text-black font-sans w-full text-xs box-border"
      >
        <div className="flex flex-col">
          <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
            <div className="w-44 h-14 flex items-center">
              <img
                src="/image/transindo.png"
                alt="Logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="text-right leading-tight text-[9.5px]">
              <h1 className="text-xs font-bold uppercase tracking-wider">
                PT. TRANSINDO MULTI INDUSTRI
              </h1>
              <p>www.transindomu.com</p>
              <p>
                Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok
                E, No 14
              </p>
              <p>Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514</p>
              <p>Phone : (+62) 8516 3657 641 email : sales@transindomu.com</p>
            </div>
          </div>
          <div className="text-center my-1.5">
            <h2 className="text-sm font-bold uppercase tracking-widest border-b border-black pb-0.5 inline-block w-full">
              {config.type === "QO" ? "QUOTATION" : "PURCHASE ORDER"}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 border-b border-black pb-2 mb-3 text-[10.5px]">
            <div className="space-y-0.5">
              <div className="flex">
                <span className="w-16 font-semibold">
                  {config.type === "PO" ? "From" : "To"}
                </span>
                <span className="flex-1 truncate">
                  :{" "}
                  {config.type === "PO"
                    ? "PT. TRANSINDO MULTI INDUSTRI"
                    : config.group.customer}
                </span>
              </div>
              <div className="flex">
                <span className="w-16 font-semibold">Address</span>
                <span className="flex-1 leading-none">
                  : {printAddress || "-"}
                </span>
              </div>
              <div className="flex pt-1">
                <span className="w-16 font-semibold">Subject</span>
                <span className="flex-1 truncate">
                  : {printSubject || "-"}
                </span>
              </div>
              <div className="flex">
                <span className="w-16 font-semibold">Contact</span>
                <span className="flex-1 truncate">
                  : {printContact || "-"}
                </span>
              </div>
            </div>
            <div className="space-y-0.5 pl-3 border-l border-gray-300">
              <div className="flex">
                <span className="w-24 font-semibold">
                  {config.type === "QO" ? "QO Number" : "PO Number"}
                </span>
                <span>: {printDocNumber}</span>
              </div>
              <div className="flex">
                <span className="w-24 font-semibold">Date</span>
                <span>
                  :{" "}
                  {new Date()
                    .toISOString()
                    .split("T")[0]
                    .replace(/-/g, "/")}
                </span>
              </div>
              <div className="flex">
                <span className="w-24 font-semibold">Page</span>
                <span>: 1 of 1</span>
              </div>
              <div className="flex">
                <span className="w-24 font-semibold">Shipment</span>
                <span>: {printShipment || "-"}</span>
              </div>
            </div>
          </div>
          <div className="w-full break-inside-avoid">
            <table
              className={`w-full border-collapse border-black mb-0 ${
                isCompact ? "text-[9.5px]" : "text-[10.5px]"
              }`}
            >
              <thead>
                <tr className="bg-blue-100/50 text-left font-semibold">
                  <th
                    className={`border border-black w-8 text-center ${
                      isCompact ? "py-1 px-1" : "py-1.5 px-1.5"
                    }`}
                  >
                    No
                  </th>
                  <th
                    className={`border border-black w-1/4 ${
                      isCompact ? "py-1 px-1.5" : "py-1.5 px-2"
                    }`}
                  >
                    Description Item
                  </th>
                  <th
                    className={`border border-black ${
                      isCompact ? "py-1 px-1.5" : "py-1.5 px-2"
                    }`}
                  >
                    Technical Spec
                  </th>
                  <th
                    className={`border border-black w-16 text-center ${
                      isCompact ? "py-1 px-1" : "py-1.5 px-1.5"
                    }`}
                  >
                    Qty
                  </th>
                  {config.type === "QO" && (
                    <>
                      <th
                        className={`border border-black w-24 text-right ${
                          isCompact ? "py-1 px-1.5" : "py-1.5 px-2"
                        }`}
                      >
                        Unit Price
                      </th>
                      <th
                        className={`border border-black w-28 text-right ${
                          isCompact ? "py-1 px-1.5" : "py-1.5 px-2"
                        }`}
                      >
                        Total Price
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {[...config.group.items]
                  .sort((a, b) => {
                    const totalA =
                      (Number(a.qty) || 1) *
                      ((Number(a.price) || 0) +
                        ((Number(a.price) || 0) * (Number(a.margin) || 0)) /
                          100);
                    const totalB =
                      (Number(b.qty) || 1) *
                      ((Number(b.price) || 0) +
                        ((Number(b.price) || 0) * (Number(b.margin) || 0)) /
                          100);
                    return totalB - totalA;
                  })
                  .map((item, idx) => {
                    const unitPriceWithMargin =
                      item.price + (item.price * (item.margin || 0)) / 100;
                    const totalPrice = unitPriceWithMargin * item.qty;
                    return (
                      <tr key={item.id || idx} className="align-top">
                        <td
                          className={`border-x border-black text-center ${
                            isCompact ? "py-1 px-1" : "py-1.5 px-1.5"
                          }`}
                        >
                          {idx + 1}
                        </td>
                        <td
                          className={`border-x border-black ${
                            isCompact ? "py-1 px-1.5" : "py-1.5 px-2"
                          }`}
                        >
                          <div className="font-semibold leading-snug break-words">
                            {item.description ||
                              item.mother_part ||
                              "General Part"}
                          </div>
                        </td>
                        <td
                          className={`border-x border-black ${
                            isCompact ? "py-1 px-1.5" : "py-1.5 px-2"
                          }`}
                        >
                          <div className="leading-snug text-gray-800 break-words">
                            {item.technical_specification || "-"}
                          </div>
                        </td>
                        <td
                          className={`border-x border-black text-center whitespace-nowrap ${
                            isCompact ? "py-1 px-1" : "py-1.5 px-1.5"
                          }`}
                        >
                          {item.qty} {item.unit || "EA"}
                        </td>
                        {config.type === "QO" && (
                          <>
                            <td
                              className={`border-x border-black text-right whitespace-nowrap ${
                                isCompact ? "py-1 px-1.5" : "py-1.5 px-2"
                              }`}
                            >
                              Rp{unitPriceWithMargin.toLocaleString("id-ID")}
                            </td>
                            <td
                              className={`border-x border-black text-right font-semibold whitespace-nowrap ${
                                isCompact ? "py-1 px-1.5" : "py-1.5 px-2"
                              }`}
                            >
                              Rp{totalPrice.toLocaleString("id-ID")}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {config.type === "QO" && (
              <div className="border border-t-0 border-black mb-3">
                <div
                  className={`flex justify-between items-center bg-blue-100/50 border-t border-black font-bold ${
                    isCompact ? "p-1 text-[9.5px]" : "p-1.5 text-[10.5px]"
                  }`}
                >
                  <span className="w-full text-right pr-4">Sub Total</span>
                  <span className="w-32 text-right">
                    Rp{config.group.total_cost.toLocaleString("id-ID")}
                  </span>
                </div>
                <div
                  className={`bg-blue-50/50 border-t border-black space-y-0.5 ${
                    isCompact ? "p-1 text-[9px]" : "p-1.5 text-[10px]"
                  }`}
                >
                  <div className="flex justify-between font-semibold">
                    <span className="w-full text-right pr-4">
                      Sub Total (Product, Material, Service) :
                    </span>
                    <span className="w-32 text-right">
                      Rp{config.group.total_cost.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-[10.5px] pt-0.5 border-t border-gray-300">
                    <span className="w-full text-right pr-4">
                      Grand Total :
                    </span>
                    <span className="w-32 text-right">
                      Rp{config.group.total_cost.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="break-inside-avoid mt-2 pt-1">
          <div className="flex justify-between items-start gap-4 my-2">
            <div className="flex-1 space-y-0.5 text-[9.5px] leading-tight">
              <h3 className="font-bold">Term & Condition :</h3>
              <ol className="list-decimal pl-3 space-y-0.5">
                {printTerms.split("\n").map(
                  (term, index) =>
                    term.trim() !== "" && <li key={index}>{term}</li>
                )}
              </ol>
            </div>
            <div className="text-center w-48 shrink-0">
              <p className="font-bold mb-1 text-[10.5px]">Approved By</p>
              <div className={isCompact ? "h-12" : "h-16"}></div>
              <p className="font-bold underline uppercase border-t border-black pt-0.5 text-[10.5px]">
                {printDirector || "Damita"}
              </p>
              <p className="font-bold text-[9.5px]">Project Manager</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}