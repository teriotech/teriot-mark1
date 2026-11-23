"use client";

import React, { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = "idle" | "loading" | "success" | "error";

// ─── Hardcoded credentials (for testing only — move to env in production) ─────
const FONNTE_TOKEN = "s6HB3J5nr5CTRbviq7gU";
const WA_TARGET    = "6281329072842";

// ─── Contact Info Items ───────────────────────────────────────────────────────
const contactItems = [
  {
    icon: "ri-map-pin-line",
    bg: "bg-blue-50",
    color: "text-blue-600",
    label: "Lokasi",
    content: "Jl. Rawa Bengkok, Depok,Jawa Barat, Indonesia",
    href: null,
  },
  {
    icon: "ri-mail-line",
    bg: "bg-blue-50",
    color: "text-blue-600",
    label: "Email",
    content: "sales@transindomu.com",
    href: "mailto:sales@transindomu.com",
  },
  {
    icon: "ri-whatsapp-line",
    bg: "bg-green-50",
    color: "text-green-600",
    label: "WhatsApp",
    content: "+62 813 2907 2842",
    href: "https://api.whatsapp.com/send?phone=6285163657641",
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContactPage() {
  const [status, setStatus]     = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);
    const data = {
      name:    fd.get("name")    as string,
      email:   fd.get("email")   as string,
      phone:   fd.get("phone")   as string,
      company: fd.get("company") as string,
      service: fd.get("service") as string,
      message: fd.get("message") as string,
    };

    // ── Susun pesan WhatsApp ──────────────────────────────────────────────────
    const waMessage = `🔔 *New Opportunity - Customer Request from Website TERIOT*

👤 Nama      : ${data.name}
📧 Email     : ${data.email}
📱 WA        : ${data.phone}
🏢 Perusahaan: ${data.company}
🛠 Produk    : ${data.service}

💬 Pesan:
${data.message}`;

    try {
      // ── 1. Kirim WhatsApp via Fonnte langsung dari client ─────────────────
      const waRes = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: FONNTE_TOKEN,
        },
        body: new URLSearchParams({
          target:  WA_TARGET,
          message: waMessage,
        }),
      });

      // ── 2. Kirim Email via Web3Forms ──────────────────────────────────────
      const emailRes = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "b1451472-ec5c-41ca-8492-61e9e2cf2137",
          subject: `Lead Baru Website TERIOT — ${data.name}`,
          from_name: data.name,
          email: data.email,
          message: `
Nama      : ${data.name}
Email     : ${data.email}
WhatsApp  : ${data.phone}
Perusahaan: ${data.company}
Produk    : ${data.service}

Pesan:
${data.message}
          `.trim(),
        }),
      });

      const emailJson = await emailRes.json();

      // Sukses jika minimal salah satu berhasil
      if (emailJson.success || waRes.ok) {
        setStatus("success");
        (e.target as HTMLFormElement).reset();
      } else {
        throw new Error(emailJson.message || "Gagal mengirim pesan.");
      }
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan. Silakan hubungi kami via WhatsApp."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">

      {/* ── Glow decoration ── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-red-400/8 blur-3xl rounded-full pointer-events-none" />

      <section id="contact" className="relative max-w-7xl mx-auto px-4 md:px-6 py-20 md:py-28">

        {/* ── Header ── */}
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest mb-6">
            <i className="ri-customer-service-2-line" />
            Contact
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight mb-5">
            Mari Diskusikan
            <span className="block text-blue-600 mt-1">Digitalisasi Industri Anda</span>
          </h1>
          <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Konsultasikan kebutuhan Industrial IoT, ERP, Maintenance Management System,
            maupun Automation Platform bersama tim engineering TERIOT.
          </p>
        </div>

        {/* ── Body grid ── */}
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">

          {/* ───── LEFT: Info Card ───── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-7 md:p-8 h-full flex flex-col">

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider mb-5 self-start">
                <i className="ri-checkbox-circle-fill" />
                Free Consultation
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">Hubungi Tim Kami</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                Tim engineering TERIOT siap membantu mulai dari survey lapangan,
                konsultasi teknis, hingga demo sistem langsung di fasilitas Anda.
              </p>

              <div className="space-y-5 flex-1">
                {contactItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center shrink-0`}>
                      <i className={`${item.icon} text-xl ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">{item.label}</p>
                      {item.href ? (
                        <a
                          href={item.href}
                          target={item.href.startsWith("http") ? "_blank" : undefined}
                          rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="text-slate-700 font-medium hover:text-blue-600 transition-colors text-sm"
                        >
                          {item.content}
                        </a>
                      ) : (
                        <p className="text-slate-700 font-medium text-sm">{item.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="https://api.whatsapp.com/send?phone=6285163657641"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-[.98] text-white font-bold text-sm transition-all duration-200 shadow-md shadow-green-200"
              >
                <i className="ri-whatsapp-line text-lg" />
                Chat via WhatsApp Sekarang
              </a>

              <p className="text-center text-xs text-slate-400 mt-3">
                Usually responds dalam &lt; 1 jam pada hari kerja
              </p>
            </div>
          </div>

          {/* ───── RIGHT: Form Card ───── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/80 p-7 md:p-10 hover:shadow-red-100/60 hover:shadow-2xl transition-shadow duration-500">

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-5">
                <i className="ri-flashlight-line" />
                Response &lt; 24 Hours
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1.5">Kirim Pesan</h2>
              <p className="text-slate-500 text-sm mb-7">
                Isi formulir berikut — pesan akan dikirim ke email <span className="font-semibold text-slate-700">sales@transindomu.com</span> dan WhatsApp tim kami.
              </p>

              {/* ── Success state ── */}
              {status === "success" ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                    <i className="ri-checkbox-circle-fill text-4xl text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Pesan Berhasil Dikirim!</h3>
                  <p className="text-slate-500 text-sm max-w-sm">
                    Tim TERIOT akan segera menghubungi Anda melalui email atau WhatsApp.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold transition"
                  >
                    Kirim Pesan Lain
                  </button>

                  {/* ── Secret Access Card Jackpot ── */}
                  <hr className="w-full max-w-xs border-slate-100 mt-4" />
                  
                  <div className="w-full max-w-xs p-5 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white text-left shadow-xl shadow-purple-200/50 relative overflow-hidden transition-all duration-300 hover:scale-[1.02]">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute top-3 right-3 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-300" />
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <i className="ri-key-2-line text-purple-200 text-lg animate-pulse" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-200">
                        Secret System Unlocked
                      </span>
                    </div>

                    <a
                      href="/production/project"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white text-purple-700 hover:bg-purple-50 font-bold text-xs transition duration-200 shadow-sm"
                    >
                      Kunjungi Platform TERIOT DEMO
                      <i className="ri-arrow-right-line" />
                    </a>
                  </div>
                </div>
              ) : (

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Row 1: Nama + Email */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Nama <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="Nama lengkap Anda"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-red-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Email <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="email@company.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-red-100 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Row 2: WhatsApp + Perusahaan */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      WhatsApp <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium select-none">
                        +62
                      </span>
                      <input
                        type="tel"
                        name="phone"
                        required
                        placeholder="8xx xxxx xxxx"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-red-100 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Perusahaan
                    </label>
                    <input
                      type="text"
                      name="company"
                      placeholder="Nama perusahaan / instansi"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-red-100 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Row 3: Produk */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Produk yang Diminati
                  </label>
                  <div className="relative">
                    <select
                      name="service"
                      defaultValue=""
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-red-100 outline-none transition-all cursor-pointer"
                    >
                      <option value="" disabled>Pilih solusi yang dibutuhkan</option>
                      <option value="Industrial IoT">[IoT] Industrial IoT</option>
                      <option value="Industrial IoT">[IoT] Petrochemicals & Refining IoT</option>
                      <option value="Industrial IoT">[IoT] Power Plant IoT</option>
                      <option value="ERP Digital">[ERP] GESIT One Single Platform</option>
                      <option value="Maintenance Management System">[ERP]Maintenance Management System</option>
                      <option value="Robotic Process Automation">[RPA]Workflow Automation</option>
                      <option value="Robotic Process Automation">[IT & Infrastructure] Cybersecurity Solutions</option>
                      <option value="Robotic Process Automation">[IT & Infrastructure] Cloud Computing</option>
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Row 4: Pesan */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Kebutuhan Anda <span className="text-blue-400">*</span>
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    required
                    placeholder="Jelaskan kebutuhan, target project, atau kendala yang sedang dihadapi..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-red-100 outline-none transition-all leading-relaxed"
                  />
                </div>

                {/* Error banner */}
                {status === "error" && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <i className="ri-error-warning-line text-blue-500 text-lg shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">Gagal mengirim pesan</p>
                      <p className="text-xs text-blue-600 mt-0.5">{errorMsg || "Silakan coba lagi atau hubungi via WhatsApp."}</p>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-red-400 active:scale-[.99] text-white font-bold text-base shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all duration-200"
                >
                  {status === "loading" ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Mengirim Pesan...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-fill text-lg" />
                      Kirim Permintaan Konsultasi
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-slate-400">
                  Dengan mengirim formulir ini, Anda menyetujui tim kami menghubungi Anda.
                </p>

              </form>
              )}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
