"use client";
import React, { useState, useEffect } from "react";
import { Receipt, X, Printer, Loader2, FileText } from "lucide-react";
import { BomGroup } from "./types";
import { asBlob } from "html-docx-js-typescript";
import { saveAs } from "file-saver";

interface ModalInvoiceProps {
  config: { group: BomGroup } | null;
  onClose: () => void;
}

export default function ModalInvoice({ config, onClose }: ModalInvoiceProps) {
  const [dbId, setDbId] = useState<number | null>(null);
  const [invoiceCustomer, setInvoiceCustomer] = useState("");
  const [invoiceAttn, setInvoiceAttn] = useState("");
  const [invoiceAddress, setInvoiceAddress] = useState("");
  const [invoicePhone, setInvoicePhone] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [referenceQo, setReferenceQo] = useState("");
  const [invoiceRevision, setInvoiceRevision] = useState("0");
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState("a. Direct Payment to PT. Transindo Multi Industri\nb. Term of Payment 14 days");
  const [invoiceApprovedBy, setInvoiceApprovedBy] = useState("Meita Surya");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (config) {
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      const currentQoNumber = config.group.qo_number || "";
      setReferenceQo(currentQoNumber);
      
      setInvoiceNo(`INV${month}${year}${randomNum}`);
      setInvoiceCustomer(config.group.customer);
      setInvoiceAttn(""); setInvoiceAddress(""); setInvoicePhone(""); setInvoiceRevision("0");
      setInvoicePaymentMethod("a. Direct Payment to PT. Transindo Multi Industri\nb. Term of Payment 14 days");
      setInvoiceApprovedBy("Meita Surya");
      setInvoiceDate(date.toISOString().split('T')[0]);
      setDbId(null);

      if (currentQoNumber) {
        setIsLoadingData(true);
        fetch(`/api/management/material_qo?qo_number=${currentQoNumber}`)
          .then((res) => res.json())
          .then((resData) => {
            if (resData.data) {
              const d = resData.data;
              setDbId(d.id);
              if (d.invoice_no) setInvoiceNo(d.invoice_no);
              if (d.attn_invoice) setInvoiceAttn(d.attn_invoice);
              if (d.revision_invoice !== undefined && d.revision_invoice !== null) setInvoiceRevision(d.revision_invoice.toString());
              if (d.payment_method_invoice) setInvoicePaymentMethod(d.payment_method_invoice);
              if (d.approved_by_invoice) setInvoiceApprovedBy(d.approved_by_invoice);
            }
          })
          .catch((err) => console.error("Gagal mengambil data Invoice:", err))
          .finally(() => setIsLoadingData(false));
      }
    }
  }, [config]);

  if (!config) return null;

  const saveToDatabase = async (): Promise<boolean> => {
    try {
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

      if (dbId) {
        await fetch(`/api/management/material_qo?id=${dbId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch(`/api/management/material_qo?qo_number=${referenceQo}`);
        const { data } = await res.json();

        if (data && data.id) {
          await fetch(`/api/management/material_qo?id=${data.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
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

  const executeInvoicePrint = async () => {
    setIsSaving(true);
    const success = await saveToDatabase();
    setIsSaving(false);
    if (success) setTimeout(() => window.print(), 300);
  };

  // Helper untuk mengubah Image URL ke Base64 + menghitung ukuran tampil
  // agar proporsinya sama persis dengan kotak logo pada layout PDF (object-contain,
  // w-48 h-12 = 192x48px), sehingga logo tidak gepeng/stretch saat dibuka di MS Word.
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

  const executeInvoiceWord = async () => {
    setIsSaving(true);
    const success = await saveToDatabase();
    setIsSaving(false);
    
    if (success) {
      try {
        // Kotak logo sama seperti layout PDF (w-48 h-12 = 192x48px, object-contain)
        const logo = await getBase64ImageWithSize("/image/transindo.png", 192, 48);

        // Ikuti kepadatan tabel yang sama seperti pada layout PDF (isCompact)
        // supaya dokumen Word dan PDF terlihat konsisten untuk item invoice yang banyak
        const wordItemCount = config.group.items?.length || 0;
        const wordIsCompact = wordItemCount > 5;
        const cellPad = wordIsCompact ? "4px" : "6px";
        const cellFont = wordIsCompact ? "9pt" : "9.5pt";

        const sortedItems = [...config.group.items].sort((a, b) => {
          const totalA = (Number(a.qty) || 1) * ((Number(a.price) || 0) + ((Number(a.price) || 0) * (Number(a.margin) || 0) / 100));
          const totalB = (Number(b.qty) || 1) * ((Number(b.price) || 0) + ((Number(b.price) || 0) * (Number(b.margin) || 0) / 100));
          return totalB - totalA;
        });

        const itemsRows = sortedItems.map((item, idx) => {
          const unitPriceWithMargin = item.price + (item.price * (item.margin || 0) / 100);
          const totalPrice = unitPriceWithMargin * item.qty;
          return `
            <tr>
              <td style="text-align:center; padding: ${cellPad}; border: 1px solid #000;">${idx + 1}</td>
              <td style="padding: ${cellPad}; border: 1px solid #000;"><b>${item.description || item.mother_part || "General Part"}</b> - ${item.technical_specification || "-"}</td>
              <td style="text-align:center; padding: ${cellPad}; border: 1px solid #000;">${item.qty} ${item.unit || "EA"}</td>
              <td style="text-align:right; padding: ${cellPad}; border: 1px solid #000;">Rp${unitPriceWithMargin.toLocaleString("id-ID")}</td>
              <td style="text-align:right; padding: ${cellPad}; border: 1px solid #000;"><b>Rp${totalPrice.toLocaleString("id-ID")}</b></td>
            </tr>
          `;
        }).join("");

        const subTotal = config.group.total_cost;
        const ppn = subTotal * 0.11;
        const grandTotal = subTotal + ppn;
        const formattedDate = invoiceDate ? new Date(invoiceDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-";

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset='utf-8'>
            <title>${invoiceNo}</title>
            <style>
              body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
              th { background-color: #dbeafe; border: 1px solid #000; padding: 6px; text-align: left; }
              td { border: 1px solid #000; padding: 6px; vertical-align: top; }
              .header-table td { border: none; }
              .info-table td { border: none; padding: 2px 4px; }
              .title { font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <!-- HEADER -->
            <table class="header-table" style="width:100%; border-bottom: 2px solid #000; padding-bottom: 8px;">
              <tr>
                <td style="width: 40%; vertical-align: middle;">
                  ${
                    logo.src
                      ? `<img src="${logo.src}" width="${logo.width}" height="${logo.height}" style="display: block;" alt="Logo" />`
                      : `<b>PT. TRANSINDO MULTI INDUSTRI</b>`
                  }
                </td>
                <td style="text-align: right; font-size: 8.5pt; line-height: 1.2; vertical-align: middle;">
                  <b>PT. TRANSINDO MULTI INDUSTRI</b><br/>
                  www.transindomu.com<br/>
                  Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14<br/>
                  Kelurahan Bedahan, Sawangan, Depok, Jawa Barat 16514<br/>
                  Phone : (+62) 8516 3657 641 email : sales@transindomu.com
                </td>
              </tr>
            </table>

            <div class="title">INVOICE</div>

            <!-- INFO -->
            <table class="info-table" style="width:100%; margin-bottom: 15px; font-size: 10pt;">
              <tr>
                <td style="width: 50%; vertical-align: top;">
                  <b>To:</b> ${invoiceCustomer}<br/>
                  <b>Attn:</b> ${invoiceAttn || "-"}<br/>
                  <b>Address:</b> ${invoiceAddress || "-"}<br/>
                  <b>Phone:</b> ${invoicePhone || "-"}
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 15px; border-left: 1px solid #ccc;">
                  <b>Invoice No:</b> ${invoiceNo}<br/>
                  <b>Date:</b> ${formattedDate}<br/>
                  <b>Email:</b> sales@transindomu.com<br/>
                  <b>Revision:</b> ${invoiceRevision}
                </td>
              </tr>
            </table>

            <!-- TABLE ITEMS -->
            <table style="width:100%; font-size: ${cellFont};">
              <thead>
                <tr>
                  <th style="width: 5%; text-align:center;">No</th>
                  <th style="width: 45%;">Description Item</th>
                  <th style="width: 10%; text-align:center;">Qty</th>
                  <th style="width: 20%; text-align:right;">Unit Price</th>
                  <th style="width: 20%; text-align:right;">Total Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- TOTALS -->
            <table style="width:100%; margin-top: -13px; font-size: 10pt;">
              <tr>
                <td colspan="4" style="text-align:right; background-color: #eff6ff; border: 1px solid #000;"><b>Sub Total :</b></td>
                <td style="text-align:right; background-color: #eff6ff; border: 1px solid #000; width: 20%;">Rp${subTotal.toLocaleString("id-ID")}</td>
              </tr>
              <tr>
                <td colspan="4" style="text-align:right; background-color: #eff6ff; border: 1px solid #000;"><b>PPN 11% :</b></td>
                <td style="text-align:right; background-color: #eff6ff; border: 1px solid #000;">Rp${ppn.toLocaleString("id-ID")}</td>
              </tr>
              <tr>
                <td colspan="4" style="text-align:right; background-color: #dbeafe; border: 1px solid #000;"><b>Grand Total :</b></td>
                <td style="text-align:right; background-color: #dbeafe; border: 1px solid #000;"><b>Rp${grandTotal.toLocaleString("id-ID")}</b></td>
              </tr>
            </table>

            <!-- FOOTER -->
            <table class="header-table" style="width:100%; margin-top: 20px; font-size: 9.5pt;">
              <tr>
                <td style="width: 65%; vertical-align: top;">
                  <b>Payment Method :</b><br/>
                  <div style="white-space: pre-wrap; padding-left: 10px; margin-bottom: 10px;">${invoicePaymentMethod}</div>
                  <b>Bank Transfer :</b><br/>
                  <div style="padding-left: 10px;">
                    Bank : BANK BNI<br/>
                    Account Name : PT. TRANSINDO MULTI INDUSTRI<br/>
                    Account Number : 2089710424
                  </div>
                </td>
                <td style="width: 35%; text-align: center; vertical-align: top;">
                  <b>Approved By</b>
                  <br/><br/><br/><br/>
                  <p style="text-decoration: underline; font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">
                    ${invoiceApprovedBy || "Meita Surya"}
                  </p>
                  <b>Finance & Tax Control</b>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        const blob = await asBlob(html);
        saveAs(blob as Blob, `${invoiceNo}.docx`);
      } catch (error) {
        console.error("Error generating Word document:", error);
        alert("Terjadi kesalahan saat membuat file Word.");
      }
    }
  };

  const itemCount = config.group?.items?.length || 0;
  const isCompact = itemCount > 5;
  const subTotal = config.group.total_cost;
  const ppn = subTotal * 0.11;
  const grandTotal = subTotal + ppn;

  return (
    <>
      {/* MODAL SETTINGS */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto print:hidden">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden my-auto">
          <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600/20 text-amber-400 rounded-lg"><Receipt className="w-5 h-5" /></div>
              <h2 className="text-xl font-bold text-white">
                Pengaturan Cetak Invoice
                {isLoadingData && <span className="ml-3 text-sm text-amber-400 font-normal animate-pulse">Memuat data tersimpan...</span>}
              </h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50"><X className="w-6 h-6" /></button>
          </div>
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="bg-amber-900/30 p-4 rounded-lg border border-amber-700/50 mb-2">
              <label className="block text-sm font-semibold text-amber-300 mb-2">Reference QO Number (Acuan Database)</label>
              <input type="text" value={referenceQo} onChange={(e) => setReferenceQo(e.target.value)} placeholder="Contoh: QO0826123" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-amber-400 border-b border-slate-700 pb-2">Informasi Klien</h3>
                <div><label className="block text-xs font-semibold text-slate-300 mb-1">To (Customer)</label><input type="text" value={invoiceCustomer} onChange={(e) => setInvoiceCustomer(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" /></div>
                <div><label className="block text-xs font-semibold text-slate-300 mb-1">Attn</label><input type="text" value={invoiceAttn} onChange={(e) => setInvoiceAttn(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" /></div>
                <div><label className="block text-xs font-semibold text-slate-300 mb-1">Address</label><textarea rows={2} value={invoiceAddress} onChange={(e) => setInvoiceAddress(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" /></div>
                <div><label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label><input type="text" value={invoicePhone} onChange={(e) => setInvoicePhone(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" /></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-amber-400 border-b border-slate-700 pb-2">Detail Invoice</h3>
                <div><label className="block text-xs font-semibold text-slate-300 mb-1">Invoice No</label><input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" /></div>
                <div><label className="block text-xs font-semibold text-slate-300 mb-1">Date</label><input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" /></div>
                <div><label className="block text-xs font-semibold text-slate-300 mb-1">Revision</label><input type="number" value={invoiceRevision} onChange={(e) => setInvoiceRevision(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" /></div>
                <div><label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label><textarea rows={3} value={invoicePaymentMethod} onChange={(e) => setInvoicePaymentMethod(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" /></div>
                <div><label className="block text-xs font-semibold text-slate-300 mb-1">Approved By</label><input type="text" value={invoiceApprovedBy} onChange={(e) => setInvoiceApprovedBy(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" /></div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-800 border-t border-slate-700 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium disabled:opacity-50">Batal</button>
            <button type="button" onClick={executeInvoiceWord} disabled={isSaving || isLoadingData} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} 
              {isSaving ? "Menyimpan..." : "Generate Word"}
            </button>
            <button type="button" onClick={executeInvoicePrint} disabled={isSaving || isLoadingData} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} 
              {isSaving ? "Menyimpan..." : "Generate PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* HIDDEN PRINT LAYOUT */}
      <div id="print-area-invoice" className="hidden print:flex flex-col justify-start bg-white text-black font-sans w-full text-xs box-border">
        <div className="flex flex-col">
          <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-3">
            <div className="w-48 h-12 flex items-center justify-start">
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
          <div className="text-center my-1.5"><h2 className="text-sm font-bold uppercase tracking-widest border-b border-black pb-0.5 inline-block w-full">INVOICE</h2></div>
          <div className="grid grid-cols-2 gap-3 border-b border-black pb-2 mb-3 text-[10.5px]">
            <div className="space-y-0.5">
              <div className="flex"><span className="w-16 font-semibold">To</span><span className="flex-1 truncate">: {invoiceCustomer}</span></div>
              <div className="flex"><span className="w-16 font-semibold">Attn</span><span className="flex-1 truncate">: {invoiceAttn || "-"}</span></div>
              <div className="flex"><span className="w-16 font-semibold">Address</span><span className="flex-1 leading-none">: {invoiceAddress || "-"}</span></div>
              <div className="flex pt-1"><span className="w-16 font-semibold">Phone</span><span className="flex-1 truncate">: {invoicePhone || "-"}</span></div>
            </div>
            <div className="space-y-0.5 pl-3 border-l border-gray-300">
              <div className="flex"><span className="w-24 font-semibold">Invoice No</span><span>: {invoiceNo}</span></div>
              <div className="flex"><span className="w-24 font-semibold">Date</span><span>: {invoiceDate ? new Date(invoiceDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}</span></div>
              <div className="flex"><span className="w-24 font-semibold">Email</span><span>: sales@transindomu.com</span></div>
              <div className="flex"><span className="w-24 font-semibold">Revision</span><span>: {invoiceRevision}</span></div>
            </div>
          </div>
          <div className="w-full break-inside-avoid">
            <table className={`w-full border-collapse border border-black mb-0 ${isCompact ? 'text-[9.5px]' : 'text-[10.5px]'}`}>
              <thead>
                <tr className="bg-blue-100/50 text-left font-semibold">
                  <th className={`border border-black w-8 text-center ${isCompact ? 'py-1 px-1' : 'py-1.5 px-1.5'}`}>No</th>
                  <th className={`border border-black ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Description Item</th>
                  <th className={`border border-black w-16 text-center ${isCompact ? 'py-1 px-1' : 'py-1.5 px-1.5'}`}>Qty</th>
                  <th className={`border border-black w-24 text-right ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Unit Price</th>
                  <th className={`border border-black w-28 text-right ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Total Price</th>
                </tr>
              </thead>
              <tbody>
                {[...config.group.items].sort((a, b) => {
                  const totalA = (Number(a.qty) || 1) * ((Number(a.price) || 0) + ((Number(a.price) || 0) * (Number(a.margin) || 0) / 100));
                  const totalB = (Number(b.qty) || 1) * ((Number(b.price) || 0) + ((Number(b.price) || 0) * (Number(b.margin) || 0) / 100));
                  return totalB - totalA;
                }).map((item, idx) => {
                  const unitPriceWithMargin = item.price + (item.price * (item.margin || 0) / 100);
                  const totalPrice = unitPriceWithMargin * item.qty;
                  return (
                    <tr key={item.id || idx} className="align-top">
                      <td className={`border-x border-black text-center ${isCompact ? 'py-1 px-1' : 'py-1.5 px-1.5'}`}>{idx + 1}</td>
                      <td className={`border-x border-black ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}><div className="leading-snug break-words"><span className="font-bold">{item.description || item.mother_part || "General Part"}</span> - {item.technical_specification || "-"}</div></td>
                      <td className={`border-x border-black text-center whitespace-nowrap ${isCompact ? 'py-1 px-1' : 'py-1.5 px-1.5'}`}>{item.qty} {item.unit || "EA"}</td>
                      <td className={`border-x border-black text-right whitespace-nowrap ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Rp{unitPriceWithMargin.toLocaleString("id-ID")}</td>
                      <td className={`border-x border-black text-right font-semibold whitespace-nowrap ${isCompact ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>Rp{totalPrice.toLocaleString("id-ID")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border border-t-0 border-black mb-3">
              <div className={`flex justify-between items-center bg-blue-50/50 border-t border-black font-semibold ${isCompact ? 'p-1 text-[9.5px]' : 'p-1.5 text-[10.5px]'}`}><span className="w-full text-right pr-4">Sub Total :</span><span className="w-32 text-right">Rp{subTotal.toLocaleString("id-ID")}</span></div>
              <div className={`flex justify-between items-center bg-blue-50/50 border-t border-black font-semibold ${isCompact ? 'p-1 text-[9.5px]' : 'p-1.5 text-[10.5px]'}`}><span className="w-full text-right pr-4">PPN 11% :</span><span className="w-32 text-right">Rp{ppn.toLocaleString("id-ID")}</span></div>
              <div className={`flex justify-between items-center bg-blue-100/50 border-t border-black font-bold ${isCompact ? 'p-1 text-[10.5px]' : 'p-1.5 text-[11.5px]'}`}><span className="w-full text-right pr-4">Grand Total :</span><span className="w-32 text-right">Rp{grandTotal.toLocaleString("id-ID")}</span></div>
            </div>
          </div>
        </div>
        <div className="break-inside-avoid mt-2 pt-1">
          <div className="flex justify-between items-start gap-4 my-2">
            <div className="flex-1 space-y-2 text-[9.5px] leading-tight">
              <div><h3 className="font-bold mb-0.5">Payment Method :</h3><div className="whitespace-pre-wrap pl-2">{invoicePaymentMethod}</div></div>
              <div><h3 className="font-bold mb-0.5">Bank Transfer :</h3><div className="pl-2"><p>Bank : BANK BNI</p><p>Account Name : PT. TRANSINDO MULTI INDUSTRI</p><p>Account Number : 2089710424</p></div></div>
            </div>
            <div className="text-center w-48 shrink-0">
              <p className="font-bold mb-1 text-[10.5px]">Approved By</p>
              <div className={isCompact ? "h-12" : "h-16"}></div>
              <p className="font-bold underline uppercase border-t border-black pt-0.5 text-[10.5px]">{invoiceApprovedBy || "Meita Surya"}</p>
              <p className="font-bold text-[9.5px]">Finance & Tax Control</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}