"use client";
import React, { useState, useEffect } from "react";
import { ClipboardCheck, Printer, Loader2, FileText } from "lucide-react";
import { BomGroup } from "./types";
import { asBlob } from "html-docx-js-typescript";
import { saveAs } from "file-saver";

interface ModalBastProps {
  config: { group: BomGroup } | null;
  onClose: () => void;
}

export default function ModalBast({ config, onClose }: ModalBastProps) {
  const [dbId, setDbId] = useState<number | null>(null);
  const [bastQoNumber, setBastQoNumber] = useState("");
  const [bastProject, setBastProject] = useState("");
  const [bastCustomer, setBastCustomer] = useState("");
  const [bastFirstCompany, setBastFirstCompany] = useState("PT. TRANSINDO MULTI INDUSTRI");
  const [bastFirstAddress, setBastFirstAddress] = useState("Jl. Rawa Bengkok Kp. Koong Parigi, Perum Aryatama Regency 1 Blok E, No 14, Bedahan, Sawangan, Depok");
  const [bastFirstName, setBastFirstName] = useState("Damita");
  const [bastSecondCompany, setBastSecondCompany] = useState("");
  const [bastSecondAddress, setBastSecondAddress] = useState("");
  const [bastSecondName, setBastSecondName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (config) {
      const currentCustomer = config.group.customer || "";
      setBastCustomer(currentCustomer);
      setBastSecondCompany(currentCustomer);
      
      const date = new Date();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      
      const currentQoNumber = config.group.qo_number || `QO${month}${year}${randomNum}`;
      setBastQoNumber(currentQoNumber);
      setBastProject(""); setBastSecondAddress(""); setBastSecondName("");
      setDbId(null);

      if (config.group.qo_number) {
        setIsLoadingData(true);
        fetch(`/api/management/material_qo?qo_number=${config.group.qo_number}`)
          .then((res) => res.json())
          .then((resData) => {
            if (resData.data) {
              const d = resData.data;
              setDbId(d.id);
              if (d.project_name) setBastProject(d.project_name);
              if (d.responsible_name_bast) setBastFirstName(d.responsible_name_bast);
            }
          })
          .catch((err) => console.error("Gagal mengambil data BAST:", err))
          .finally(() => setIsLoadingData(false));
      }
    }
  }, [config]);

  if (!config) return null;

  const saveToDatabase = async (): Promise<boolean> => {
    try {
      if (!bastQoNumber) {
        alert("Quotation Number wajib diisi sebagai acuan database.");
        return false;
      }

      const payload = {
        project_name: bastProject,
        responsible_name_bast: bastFirstName,
      };

      if (dbId) {
        await fetch(`/api/management/material_qo?id=${dbId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch(`/api/management/material_qo?qo_number=${bastQoNumber}`);
        const { data } = await res.json();

        if (data && data.id) {
          await fetch(`/api/management/material_qo?id=${data.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          alert("Data QO acuan tidak ditemukan di database. Data BAST tidak tersimpan, namun tetap akan dicetak.");
        }
      }
      return true;
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Terjadi kesalahan saat menyimpan ke database. Dokumen tetap akan di-generate.");
      return true;
    }
  };

  const executeBastPrint = async () => {
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

  const executeBastWord = async () => {
    setIsSaving(true);
    const success = await saveToDatabase();
    setIsSaving(false);
    
    if (success) {
      try {
        // Kotak logo sama seperti layout PDF (w-48 h-12 = 192x48px, object-contain)
        const logo = await getBase64ImageWithSize("/image/transindo.png", 192, 48);
        const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset='utf-8'>
            <title>BAST_${bastQoNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; line-height: 1.4; }
              table { border-collapse: collapse; width: 100%; }
              td { vertical-align: top; }
              .header-table td { border: none; }
              .title { font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 4px; margin: 20px 0; display: inline-block; }
              .text-center { text-align: center; }
            </style>
          </head>
          <body>
            <!-- HEADER -->
            <table class="header-table" style="width:100%; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 20px;">
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

            <!-- INFO -->
            <table style="width: 100%; font-size: 11pt; margin-bottom: 20px;">
              <tr><td style="width: 150px;"><b>Quotation Number</b></td><td>: ${bastQoNumber || "-"}</td></tr>
              <tr><td><b>Project</b></td><td>: ${bastProject || "-"}</td></tr>
              <tr><td><b>Customer</b></td><td>: ${bastSecondCompany || bastCustomer || "-"}</td></tr>
              <tr><td><b>Date</b></td><td>: ${currentDate}</td></tr>
            </table>

            <div class="text-center">
              <span class="title">CERTIFICATE OF COMPLETION</span>
            </div>

            <p style="margin-bottom: 15px;">This Certificate of completion is made by and between :</p>

            <!-- PARTICIPANTS -->
            <table style="width: 100%; margin-bottom: 20px;">
              <tr>
                <td style="width: 30px;"><b>1.</b></td>
                <td>
                  <table style="width: 100%;">
                    <tr><td style="width: 120px;"><b>Company Name</b></td><td>: ${bastFirstCompany}</td></tr>
                    <tr><td><b>Address</b></td><td>: ${bastFirstAddress}</td></tr>
                    <tr><td><b>Name</b></td><td>: ${bastFirstName || "____________________"}</td></tr>
                  </table>
                  <p style="margin-top: 5px;">As the responsible from <b>${bastFirstCompany}</b>, now will be called as the First Participant.</p>
                </td>
              </tr>
            </table>

            <table style="width: 100%; margin-bottom: 20px;">
              <tr>
                <td style="width: 30px;"><b>2.</b></td>
                <td>
                  <table style="width: 100%;">
                    <tr><td style="width: 120px;"><b>Company Name</b></td><td>: ${bastSecondCompany || bastCustomer}</td></tr>
                    <tr><td><b>Address</b></td><td>: ${bastSecondAddress || "-"}</td></tr>
                    <tr><td><b>Name</b></td><td>: ${bastSecondName || "____________________"}</td></tr>
                  </table>
                  <p style="margin-top: 5px;">As the responsible from <b>${bastSecondCompany || bastCustomer}</b>, now will be called as the Second.</p>
                </td>
              </tr>
            </table>

            <!-- AGREEMENT TEXT -->
            <p style="text-align: justify; margin-bottom: 10px;">First Participant and Second Participant area already doing the assessment for <b>${bastProject || "Project"}</b> refer from quotation number <b>${bastQoNumber}</b>.</p>
            <p style="text-align: justify; margin-bottom: 10px;">As the assessment, both participants agree that the work is 100% ( One Hundred Percent ) finished and works properly.</p>
            <p style="text-align: justify; margin-bottom: 40px;">In witness whereof, the participants here caused this agreement to be made and signed so that it shall be used as it must.</p>

            <!-- SIGNATURES -->
            <table style="width: 100%; text-align: left;">
              <tr>
                <td style="width: 50%;">
                  <b>FIRST PARTICIPANT</b><br/>
                  <span style="font-size: 10pt;">${bastFirstCompany}</span>
                  <br/><br/><br/><br/><br/>
                  <div style="border-bottom: 1px solid #000; width: 80%;"></div>
                </td>
                <td style="width: 50%;">
                  <b>SECOND PARTICIPANT</b><br/>
                  <span style="font-size: 10pt;">${bastSecondCompany || bastCustomer}</span>
                  <br/><br/><br/><br/><br/>
                  <div style="border-bottom: 1px solid #000; width: 80%;"></div>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        const blob = await asBlob(html);
        saveAs(blob as Blob, `BAST_${bastQoNumber}.docx`);
      } catch (error) {
        console.error("Error generating Word document:", error);
        alert("Terjadi kesalahan saat membuat file Word.");
      }
    }
  };

  return (
    <>
      {/* MODAL SETTINGS */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b border-slate-700 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-purple-400" /> Settings BAST
              {isLoadingData && <span className="ml-3 text-sm text-purple-400 font-normal animate-pulse">Memuat data tersimpan...</span>}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="col-span-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 space-y-3">
              <div><label className="block text-slate-300 text-xs font-semibold mb-1">Quotation Number (Acuan Database)</label><input type="text" value={bastQoNumber} onChange={(e) => setBastQoNumber(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white" /></div>
              <div><label className="block text-slate-300 text-xs font-semibold mb-1">Project Name</label><input type="text" value={bastProject} onChange={(e) => setBastProject(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white" /></div>
            </div>
            <div className="space-y-3 bg-slate-900/30 p-3 rounded-lg border border-slate-700/30">
              <h4 className="font-bold text-purple-400 text-xs uppercase tracking-wider">1st Participant</h4>
              <div><label className="block text-slate-300 text-xs mb-1">Company Name</label><input type="text" value={bastFirstCompany} onChange={(e) => setBastFirstCompany(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
              <div><label className="block text-slate-300 text-xs mb-1">Address</label><textarea rows={2} value={bastFirstAddress} onChange={(e) => setBastFirstAddress(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
              <div><label className="block text-slate-300 text-xs mb-1">Responsible Name</label><input type="text" value={bastFirstName} onChange={(e) => setBastFirstName(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
            </div>
            <div className="space-y-3 bg-slate-900/30 p-3 rounded-lg border border-slate-700/30">
              <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wider">2nd Participant</h4>
              <div><label className="block text-slate-300 text-xs mb-1">Company Name</label><input type="text" value={bastSecondCompany} onChange={(e) => setBastSecondCompany(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
              <div><label className="block text-slate-300 text-xs mb-1">Address</label><textarea rows={2} value={bastSecondAddress} onChange={(e) => setBastSecondAddress(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
              <div><label className="block text-slate-300 text-xs mb-1">Responsible Name</label><input type="text" value={bastSecondName} onChange={(e) => setBastSecondName(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1 text-white text-xs" /></div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
            <button onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg disabled:opacity-50">Cancel</button>
            <button onClick={executeBastWord} disabled={isSaving || isLoadingData} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} 
              {isSaving ? "Menyimpan..." : "Generate Word"}
            </button>
            <button onClick={executeBastPrint} disabled={isSaving || isLoadingData} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} 
              {isSaving ? "Menyimpan..." : "Generate PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* HIDDEN PRINT LAYOUT */}
      <div id="print-area-bast" className="hidden print:flex flex-col justify-start bg-white text-black font-sans w-full text-xs max-h-[280mm] h-[280mm] box-border p-2">
        <div className="flex flex-col">
          <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
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
          <div className="space-y-1 text-xs mb-6 font-sans">
            <div className="flex"><span className="w-36 font-semibold">Quotation Number</span><span>: {bastQoNumber || "-"}</span></div>
            <div className="flex"><span className="w-36 font-semibold">Project</span><span>: {bastProject || "-"}</span></div>
            <div className="flex"><span className="w-36 font-semibold">Customer</span><span>: {bastSecondCompany || bastCustomer || "-"}</span></div>
            <div className="flex"><span className="w-36 font-semibold">Date</span><span>: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
          </div>
          <div className="text-center my-4"><h2 className="text-base font-bold uppercase tracking-widest border-b-2 border-black inline-block pb-0.5">CERTIFICATE OF COMPLETION</h2></div>
          <p className="text-xs mb-4">This Certificate of completion is made by and between :</p>
          <div className="space-y-4 text-xs mb-6">
            <div>
              <p className="font-bold">1.</p>
              <div className="pl-4 space-y-1">
                <div className="flex"><span className="w-32 font-semibold">Company Name</span><span>: {bastFirstCompany}</span></div>
                <div className="flex"><span className="w-32 font-semibold">Address</span><span className="flex-1">: {bastFirstAddress}</span></div>
                <div className="flex"><span className="w-32 font-semibold">Name</span><span>: {bastFirstName || "____________________"}</span></div>
                <p className="pt-0.5">As the responsible from <span className="font-semibold">{bastFirstCompany}</span>, now will be called as the First Participant.</p>
              </div>
            </div>
            <div>
              <p className="font-bold">2.</p>
              <div className="pl-4 space-y-1">
                <div className="flex"><span className="w-32 font-semibold">Company Name</span><span>: {bastSecondCompany || bastCustomer}</span></div>
                <div className="flex"><span className="w-32 font-semibold">Address</span><span className="flex-1">: {bastSecondAddress || "-"}</span></div>
                <div className="flex"><span className="w-32 font-semibold">Name</span><span>: {bastSecondName || "____________________"}</span></div>
                <p className="pt-0.5">As the responsible from <span className="font-semibold">{bastSecondCompany || bastCustomer}</span>, now will be called as the Second.</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 text-xs text-justify leading-relaxed">
            <p>First Participant and Second Participant area already doing the assessment for <span className="font-semibold">{bastProject || "Project"}</span> refer from quotation number <span className="font-semibold">{bastQoNumber}</span>.</p>
            <p>As the assessment, both participants agree that the work is 100% ( One Hundred Percent ) finished and works properly.</p>
            <p>In witness whereof, the participants here caused this agreement to be made and signed so that it shall be used as it must.</p>
          </div>
        </div>
        <div className="break-inside-avoid mt-8 mb-8">
          <div className="flex justify-between items-start text-xs">
            <div className="w-56 text-left"><p className="font-bold uppercase">FIRST PARTICIPANT</p><p className="font-semibold text-[11px]">{bastFirstCompany}</p><div className="h-20"></div><div className="border-b border-black w-full"></div></div>
            <div className="w-56 text-left"><p className="font-bold uppercase">SECOND PARTICIPANT</p><p className="font-semibold text-[11px]">{bastSecondCompany || bastCustomer}</p><div className="h-20"></div><div className="border-b border-black w-full"></div></div>
          </div>
        </div>
      </div>
    </>
  );
}