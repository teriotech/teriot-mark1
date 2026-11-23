"use client";

import React, { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { FileText, Handshake, UserCheck, ArrowRight, type LucideIcon } from "lucide-react";

/* =========================================================================
   DATA KONTEN
   Semua konten berulang dikumpulkan di sini agar mudah diubah dan konsisten.
   ========================================================================= */

const CONTACT_URL = "https://transindomu.com/production/contact";
const COMPRO_URL = "https://online.fliphtml5.com/transindo_compro/Compro-PT-Transindo/";

const HERO_TAGS = [
  { icon: "☁️", label: "Cloud ERP", color: "bg-blue-600/15 text-blue-100 border-blue-500/20" },
  { icon: "📡", label: "IoT Connected", color: "bg-purple-600/15 text-purple-100 border-purple-500/20" },
  { icon: "🤖", label: "AI Chatbot", color: "bg-green-600/15 text-green-100 border-green-500/20" },
  { icon: "🖥️", label: "IT Infrastructure", color: "bg-amber-600/15 text-amber-100 border-amber-500/20" },
  { icon: "🔧", label: "Calibration Tools", color: "bg-cyan-600/15 text-cyan-100 border-cyan-500/20" },
  { icon: "⚙️", label: "Instrumentation Automation", color: "bg-emerald-600/15 text-emerald-100 border-emerald-500/20" },
  { icon: "⛑️", label: "Safety Equipment", color: "bg-rose-600/15 text-rose-100 border-rose-500/20" },
];

const PRODUCTS = [
  {
    icon: "ri-router-line",
    title: "Industrial IoT (IIoT)",
    href: "/product_GMES",
    desc: "Pengambilan parameter data mesin secara real-time ke cloud untuk mempermudah analisis data historis dan prediksi maintenance.",
    features: ["Real-time Monitoring", "OEE Dashboard", "GMES Dashboard"],
  },
  {
    icon: "ri-database-2-line",
    title: "ERP Enterprise",
    href: "/product_GERP",
    desc: "Sistem manajemen terpadu mulai dari HR Payroll, Production, Warehouse, Purchasing, Accounting, hingga SHEE Work Permit dalam satu ekosistem digital.",
    features: ["Integrated Modules", "Warehouse & Inventory", "SHEE Management", "Accounting & Purchasing"],
  },
  {
    icon: "ri-settings-5-line",
    title: "Maintenance Management",
    href: "/product_GMMS",
    desc: "Kelola jadwal perawatan mesin dan inventaris sparepart secara sistematis untuk mencegah downtime produksi.",
    features: ["Predictive Maintenance (TPM)", "Sparepart Control", "Auto-Scheduling Manpower"],
  },
  {
    icon: "ri-robot-2-line",
    title: "Robotic Process Automation",
    href: "/product_RPA",
    desc: "Otomatiskan proses bisnis yang berulang seperti input data, pembuatan laporan, sinkronisasi sistem, dan workflow approval untuk meningkatkan efisiensi operasional.",
    features: ["Automated Data Entry", "Report Generation Bot", "ERP & Legacy Integration", "Workflow Automation"],
  },
];

const IOT_STEPS = [
  {
    icon: "ri-cpu-line",
    title: "Sensor & Device",
    desc: "Pasang sensor wireless di panel listrik, mesin, atau aset produksi tanpa mengganggu operasional.",
  },
  {
    icon: "ri-router-line",
    title: "Gateway IoT",
    desc: "Data dikirim melalui jaringan WiFi, 4G, atau LAN ke gateway lokal yang aman dan terenkripsi.",
  },
  {
    icon: "ri-server-line",
    title: "Cloud Platform",
    desc: "Data diproses, disimpan, dan diolah menjadi informasi yang siap digunakan oleh tim operasional.",
  },
  {
    icon: "ri-line-chart-line",
    title: "Dashboard & Alert",
    desc: "Pantau performa melalui dashboard real-time dan dapatkan notifikasi otomatis saat terjadi anomali.",
  },
  {
    icon: "ri-ai-generate",
    title: "AI Assistant & Summary",
    desc: "AI menganalisis data operasional secara otomatis, menyajikan ringkasan performa harian, menjelaskan penyebab anomali, serta menjawab pertanyaan Anda dalam bahasa yang mudah dipahami.",
  },
];

const ERP_MODULES = [
  { icon: "ri-customer-service-2-line", title: "CRM", desc: "Kelola prospek, pelanggan, aktivitas sales, dan histori komunikasi dalam satu platform." },
  { icon: "ri-file-list-3-line", title: "Sales & Purchasing", desc: "Otomatisasi Sales Order, Purchase Order, quotation, approval, dan monitoring transaksi." },
  { icon: "ri-team-line", title: "HR & Payroll", desc: "Kelola absensi, lembur, cuti, payroll, BPJS, dan evaluasi karyawan." },
  { icon: "ri-shield-check-line", title: "SHEE System", desc: "Safety, Health, Environment & Energy management, permit kerja, inspeksi, dan audit digital." },
  { icon: "ri-store-2-line", title: "Warehouse Management", desc: "Monitoring stok, lokasi barang, penerimaan, pengeluaran, dan mutasi gudang." },
  { icon: "ri-building-line", title: "Asset Management", desc: "Kelola aset perusahaan, nilai penyusutan, histori penggunaan, dan maintenance." },
  { icon: "ri-barcode-box-line", title: "Stock Taking", desc: "Percepat proses stock opname menggunakan barcode, QR code, dan mobile inspection." },
  { icon: "ri-money-dollar-circle-line", title: "Finance & Accounting", desc: "General ledger, cash flow, budgeting, costing, dan laporan keuangan otomatis." },
];

const MAINTENANCE_BENEFITS = [
  { icon: "ri-time-line", title: "Time Based Maintenance", desc: "Otomatis membuat jadwal maintenance berdasarkan running hour dan kalender." },
  { icon: "ri-pulse-line", title: "Predictive Maintenance", desc: "Analisis kondisi mesin untuk memprediksi potensi kerusakan." },
  { icon: "ri-calendar-check-line", title: "Auto Scheduling", desc: "Sistem secara otomatis menjadwalkan pekerjaan maintenance." },
  { icon: "ri-tools-line", title: "Sparepart Ready", desc: "Monitoring stok sparepart kritikal sebelum maintenance dilakukan." },
  { icon: "ri-money-dollar-circle-line", title: "Cost Planning", desc: "Perencanaan dan kontrol biaya maintenance secara real-time." },
];

const MAINTENANCE_WORKFLOW = [
  { title: "Sensor Menangkap Kondisi Mesin", desc: "Sensor IoT membaca Running Hour, Cycle Time, Temperature, Vibration, dan parameter operasional lainnya." },
  { title: "Data Processing", desc: "Data dikirim ke platform cloud untuk diproses dan dianalisis secara otomatis." },
  { title: "Machine Classification", desc: "Sistem mengklasifikasikan kondisi mesin: Normal, Warning, Critical, atau Breakdown." },
  { title: "Generate PM / CM Schedule", desc: "Jadwal Preventive maupun Corrective Maintenance dibuat secara otomatis." },
  { title: "Assign Job ke Teknisi", desc: "Work Order dikirim langsung ke teknisi sesuai kompetensi dan jadwal kerja." },
  { title: "QR Barcode Reporting", desc: "Teknisi melakukan scan QR Code untuk mengakses dan mengisi laporan pekerjaan." },
  { title: "Recorded PM / CM History", desc: "Seluruh histori pekerjaan tersimpan untuk audit, analisis reliability, dan KPI." },
];

const STATS = [
  { icon: "ri-building-2-line", value: "12+", label: "Perusahaan Terlayani", desc: "Berbagai perusahaan nasional dan multinasional." },
  { icon: "ri-cpu-line", value: "60+", label: "Logger Terpasang", desc: "Monitoring real-time pada mesin dan utilitas industri." },
  { icon: "ri-customer-service-2-line", value: "24/7", label: "Customer Support", desc: "Tim support siap membantu kapan pun dibutuhkan." },
  { icon: "ri-community-line", value: "4+", label: "Kawasan Industri", desc: "Implementasi solusi digital di berbagai kawasan industri." },
];

const CLIENT_LOGOS = Array.from({ length: 10 }, (_, i) => `/assets/img/clients/client-${i + 1}.png`);

const ABOUT_VALUES = [
  "Berorientasi pada kualitas dan kepuasan pelanggan",
  "Dedikasi dan passion melayani customer sepenuh hati",
  "Mendukung perkembangan dan inovasi teknologi",
];

const WHY_US = [
  {
    title: "Easy Customize sesuai kebutuhan industri Anda",
    desc: "TERIOT dibangun dengan sistem end-to-end terintegrasi dan dapat disesuaikan dengan kebutuhan proses serta industri sesuai kepentingan customer.",
  },
  {
    title: "Layanan Support 24 Jam",
    desc: "Kami memberikan layanan support 24 jam kepada customer, karena kepuasan pelanggan adalah prioritas utama kami.",
  },
  {
    title: "Affordable & Transparan sesuai kebutuhan Anda",
    desc: "Tidak perlu mahal untuk menerapkan teknologi IoT 4.0. Kami menghadirkan solusi low cost dengan kualitas terbaik serta biaya yang transparan sejak awal.",
  },
];

const CONTACT_CARDS: {
  Icon: LucideIcon;
  tag: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
}[] = [
  {
    Icon: FileText,
    tag: "B2B & B2C Procurement",
    title: "Diskusikan Proyek Anda",
    desc: "Pengadaan industri, Sensor, PLC, tender, atau prakualifikasi vendor — terhubung dengan tim pengembangan bisnis Transindo Group.",
    cta: "Hubungi Pengembangan Bisnis",
    href: "/production/contact",
  },
  {
    Icon: Handshake,
    tag: "Collaboration & Strategic Mitra",
    title: "Bangun Bersama Kami",
    desc: "Mari tumbuh bersama melalui kolaborasi, integrasi teknologi, dan aliansi strategis di seluruh ekosistem Transindo Group.",
    cta: "Hubungi Kemitraan",
    href: "/production/contact",
  },
  {
    Icon: UserCheck,
    tag: "Talent & Karir Profesional",
    title: "Gabung dalam Grup",
    desc: "Mencari tempat untuk berkembang? Temukan peluang karir di Transindo Group dan kembangkan potensi Anda bersama kami.",
    cta: "Lihat Karir",
    href: "/production/contact",
  },
];

const BRANDS = [
  { name: "Beckhoff", src: "/assets/img/brand/beckoff.png" },
  { name: "CODESYS", src: "/assets/img/brand/codesysimage.png" },
  { name: "GitLab", src: "/assets/img/brand/gitlab.png" },
  { name: "Haiwell", src: "/assets/img/brand/haiwell.png" },
  { name: "MinIO", src: "/assets/img/brand/minio.png" },
  { name: "Next.js", src: "/assets/img/brand/nextjs.png" },
  { name: "Node-RED", src: "/assets/img/brand/nodered.png" },
  { name: "Siemens", src: "/assets/img/brand/siemens.png" },
  { name: "Weintek", src: "/assets/img/brand/weintek.png" },
  { name: "Omron", src: "/assets/img/brand/omron.png" },
  { name: "Schneider", src: "/assets/img/brand/schneider.png" },
  { name: "Anthropic", src: "/assets/img/brand/antropic.png" },
];

/* =========================================================================
   KOMPONEN KECIL (reusable)
   ========================================================================= */

function SectionHeader({
  badge,
  title,
  description,
  className = "mb-14 md:mb-20",
}: {
  badge: string;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-4xl mx-auto text-center ${className}`}>
      <span className="inline-flex items-center px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs md:text-sm font-bold tracking-widest uppercase mb-6">
        {badge}
      </span>
      <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
        {title}
      </h2>
      {description && (
        <p className="text-slate-600 text-sm md:text-lg leading-relaxed max-w-3xl mx-auto">
          {description}
        </p>
      )}
    </div>
  );
}

function IconBox({
  icon,
  size = "md",
}: {
  icon: string;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "lg"
      ? "w-20 h-20 rounded-3xl"
      : size === "sm"
      ? "w-14 h-14 rounded-2xl"
      : "w-14 h-14 md:w-16 md:h-16 rounded-2xl";
  const glyph =
    size === "lg" ? "text-4xl" : size === "sm" ? "text-2xl" : "text-2xl md:text-3xl";

  return (
    <div
      className={`${box} bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors`}
    >
      <i className={`${icon} ${glyph} text-blue-600 group-hover:text-white transition-colors`} aria-hidden="true"></i>
    </div>
  );
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
      <i className="ri-checkbox-circle-fill text-green-500 text-base flex-none" aria-hidden="true"></i>
      {children}
    </div>
  );
}

/* =========================================================================
   HALAMAN UTAMA
   ========================================================================= */

export default function HomePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /**
   * Zoom out 75% di perangkat mobile.
   * Hanya memakai satu mekanisme (meta viewport) agar efeknya tidak berlipat
   * (sebelumnya viewport 0.75 + CSS zoom 0.75 = ~56%), dan dikembalikan saat
   * meninggalkan halaman agar halaman lain tidak ikut ter-zoom.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }

    const previous = meta.getAttribute("content");
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=0.75, maximum-scale=3, user-scalable=yes"
    );

    return () => {
      if (!meta) return;
      if (created) meta.remove();
      else if (previous !== null) meta.setAttribute("content", previous);
    };
  }, []);

  const openCatalogFullscreen = () => {
    const iframe = iframeRef.current;
    if (iframe && typeof iframe.requestFullscreen === "function") {
      iframe.requestFullscreen().catch(() => {
        window.open(COMPRO_URL, "_blank", "noopener,noreferrer");
      });
      return;
    }
    // iOS Safari tidak mendukung fullscreen pada iframe: buka di tab baru
    window.open(COMPRO_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* ======= HERO SECTION ======= */}
      <section
        id="hero"
        className="relative min-h-[100svh] flex items-center bg-[#0f172a] pt-28 pb-16 lg:py-0 overflow-hidden"
      >
        {/* Background Glow */}
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full" aria-hidden="true"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/10 blur-[120px] rounded-full" aria-hidden="true"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Hero Image */}
            <div className="w-full lg:w-1/2 order-1 lg:order-2">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/15 blur-[60px] rounded-full" aria-hidden="true"></div>
                <img
                  src="/assets/img/hero-img.png"
                  className="w-full h-auto max-w-[280px] sm:max-w-[350px] md:max-w-[450px] lg:max-w-full mx-auto hero-floating-anim relative z-10 drop-shadow-2xl"
                  alt="Ilustrasi Industrial IoT dan ERP"
                />
              </div>
            </div>

            {/* Teks */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center text-center lg:text-left order-2 lg:order-1">
              <h1 className="text-[30px] sm:text-[40px] lg:text-6xl font-black leading-[1.15] tracking-tight text-white mb-6">
                Industrial IoT <br className="hidden sm:block" />
                &amp; Smart Factory Solutions{" "}
                <span className="text-blue-400">Terbaik di Indonesia</span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0 font-light">
                Kami menyediakan layanan aplikasi untuk meningkatkan{" "}
                <span className="text-white font-medium">
                  produktivitas perusahaan di berbagai sektor
                </span>{" "}
                dengan teknologi yang up-to-date{" "}
                <span className="text-white font-medium">dan terintegrasi</span>, kapanpun dan
                dimanapun.
              </p>

              {/* Tech Highlights */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 md:gap-3 mb-8">
                {HERO_TAGS.map((tag) => (
                  <div
                    key={tag.label}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] md:text-sm font-medium border ${tag.color}`}
                  >
                    <span aria-hidden="true">{tag.icon}</span>
                    {tag.label}
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start px-2 sm:px-0">
                <Link
                  href={CONTACT_URL}
                  className="px-10 py-4 rounded-full bg-blue-600 text-white font-bold shadow-[0_10px_20px_rgba(37,99,235,0.3)] hover:bg-blue-700 active:scale-95 transition-all text-center"
                >
                  Mulai Sekarang
                </Link>
                <Link
                  href="/book"
                  className="px-10 py-4 rounded-full border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 hover:text-white active:scale-95 transition-all text-center"
                >
                  Pelajari Fitur
                </Link>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .hero-floating-anim {
            animation: floating 4s ease-in-out infinite;
          }
          @keyframes floating {
            0%,
            100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-20px);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-floating-anim {
              animation: none;
            }
          }
        `}</style>
      </section>

      {/* ======= PRODUCT SECTION ======= */}
      <section id="products" className="py-16 md:py-24 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
            <h2 className="text-blue-600 font-bold tracking-[0.15em] uppercase text-[11px] md:text-sm mb-3">
              Solusi Digital Kami
            </h2>
            <h3 className="text-[26px] md:text-4xl font-extrabold text-slate-900 mb-5 leading-tight">
              Produk Unggulan untuk Transformasi Industri
            </h3>
            <p className="text-slate-600 text-sm md:text-lg leading-relaxed px-2 md:px-0">
              Konsultasikan permasalahan Anda dengan solusi Digital Application yang{" "}
              <span className="font-semibold text-slate-900">SMART</span>. Pilih produk sesuai
              kebutuhan Anda dengan kustomisasi tanpa batas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
            {PRODUCTS.map((product) => (
              <div
                key={product.title}
                className="group flex flex-col bg-white p-7 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] md:hover:scale-[1.02] md:hover:shadow-xl md:hover:border-blue-100 transition-all duration-300"
              >
                <div className="mb-6 md:mb-8">
                  <IconBox icon={product.icon} />
                </div>
                <h4 className="text-lg md:text-xl font-bold text-slate-900 mb-3">{product.title}</h4>
                <p className="text-slate-600 text-[13px] md:text-base leading-relaxed mb-6">
                  {product.desc}
                </p>
                <div className="space-y-2.5 mb-8">
                  {product.features.map((feature) => (
                    <CheckItem key={feature}>{feature}</CheckItem>
                  ))}
                </div>
                <Link
                  href={product.href}
                  className="mt-auto text-blue-600 text-sm md:text-base font-bold inline-flex items-center gap-2 py-2 group/link"
                >
                  Selengkapnya
                  <i className="ri-arrow-right-line transition-transform group-hover/link:translate-x-1" aria-hidden="true"></i>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= HOW IT WORKS SECTION ======= */}
      <section id="how-it-works" className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            badge="Bagaimana Industrial IoT Bekerja?"
            title={
              <>
                Dari <span className="text-blue-600">Sensor ke Keputusan Cerdas</span> dalam 5
                Langkah
              </>
            }
            description="Arsitektur sederhana dengan implementasi cepat. Kami menangani setup dan integrasi, Anda cukup menikmati data real-time untuk pengambilan keputusan yang lebih baik."
          />

          <div className="relative">
            {/* Timeline Line (desktop) */}
            <div
              className="hidden xl:block absolute top-[72px] left-0 right-0 h-[2px] bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100"
              aria-hidden="true"
            ></div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 md:gap-8 relative">
              {IOT_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="group relative bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="text-5xl font-extrabold text-blue-600/20 mb-4">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="mb-6">
                    <IconBox icon={step.icon} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======= AI INDUSTRIAL ASSISTANT ======= */}
      <section
        id="ai-assistant"
        className="py-20 md:py-28 bg-gradient-to-b from-white to-slate-50 overflow-hidden"
      >
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-16"
            badge="AI Industrial Assistant"
            title={
              <>
                Data Mesin Kini Bisa <span className="text-blue-600">Diajak Berdiskusi</span>
              </>
            }
            description="Tidak perlu membuka dashboard yang kompleks. Cukup tanyakan kondisi produksi, performa mesin, atau anomali operasional dan AI Assistant akan memberikan ringkasan dalam bahasa yang mudah dipahami."
          />

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Dashboard */}
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" aria-hidden="true"></div>
              <img
                src="/assets/img/oee_dash.png"
                alt="Tampilan OEE Dashboard TERIOT"
                loading="lazy"
                className="relative w-full rounded-[2rem] border border-slate-200 shadow-2xl"
              />
            </div>

            {/* Phone Chat */}
            <div className="flex justify-center">
              <div className="ai-phone relative w-full max-w-[340px] h-[650px] bg-slate-900 rounded-[3rem] p-3 shadow-2xl">
                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-10" aria-hidden="true"></div>

                <div className="h-full bg-slate-50 rounded-[2.5rem] overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="bg-blue-600 text-white px-5 pt-7 pb-4 flex items-center gap-3 flex-none">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <i className="ri-robot-2-line text-xl" aria-hidden="true"></i>
                    </div>
                    <div>
                      <div className="font-bold">TeriotBot AI</div>
                      <div className="flex items-center gap-2 text-xs text-blue-100">
                        <span className="ai-online inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        Online
                      </div>
                    </div>
                  </div>

                  <div className="chat-window flex-1 overflow-y-auto p-4 space-y-4">
                    {/* User */}
                    <div className="chat-msg user-1 flex justify-end">
                      <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-md max-w-[80%] text-sm">
                        Halo TeriotBot!
                      </div>
                    </div>

                    {/* Bot */}
                    <div className="chat-msg bot-1 flex justify-start">
                      <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-md max-w-[80%] shadow-sm text-sm text-slate-700">
                        Halo Bapak Joni 👋, ada yang bisa saya bantu?
                      </div>
                    </div>

                    {/* User */}
                    <div className="chat-msg user-2 flex justify-end">
                      <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-md max-w-[85%] text-sm">
                        Sampaikan laporan produksi Mesin A dan analisa dalam satu bulan.
                      </div>
                    </div>

                    {/* Bot Summary */}
                    <div className="chat-msg bot-summary flex justify-start">
                      <div className="bg-white border border-slate-200 px-4 py-4 rounded-2xl rounded-bl-md shadow-sm max-w-[95%]">
                        <div className="font-semibold text-slate-900 mb-3">
                          📊 Ringkasan Produksi Mesin A
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 mb-4">
                          <div>
                            Produksi Total:{" "}
                            <span className="font-semibold text-slate-900">128.450 Unit</span>
                          </div>
                          <div>
                            OEE Rata-rata:{" "}
                            <span className="font-semibold text-green-600">87.4%</span>
                          </div>
                          <div>
                            Downtime:{" "}
                            <span className="font-semibold text-orange-500">4.8%</span>
                          </div>
                        </div>

                        {/* Mini Dashboard */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-green-50 rounded-xl p-2 text-center">
                            <div className="text-xs text-slate-500">Output</div>
                            <div className="font-bold text-green-600">+12%</div>
                          </div>
                          <div className="bg-blue-50 rounded-xl p-2 text-center">
                            <div className="text-xs text-slate-500">OEE</div>
                            <div className="font-bold text-blue-600">87%</div>
                          </div>
                          <div className="bg-red-50 rounded-xl p-2 text-center">
                            <div className="text-xs text-slate-500">Reject</div>
                            <div className="font-bold text-red-600">1.8%</div>
                          </div>
                        </div>

                        <div className="text-sm text-slate-700 leading-relaxed">
                          Selama 30 hari terakhir, performa Mesin A meningkat{" "}
                          <span className="font-semibold text-green-600">12%</span>. Penyebab
                          utama downtime berasal dari proses changeover pada minggu kedua.
                          Disarankan melakukan optimasi setup dan penjadwalan preventive
                          maintenance.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= COMPANY PROFILE (FLIPBOOK) ======= */}
      <section id="company-profile" className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-12 md:mb-16"
            badge="Company Profile"
            title={
              <>
                Kenali Lebih Dalam tentang <span className="text-blue-600">Transindo</span>
              </>
            }
            description="PT Transindo Multi Industri adalah perusahaan yang bergerak di bidang Engineering, Procurement, dan Construction (EPC) untuk sektor industri. Kami menyediakan solusi digital berbasis Industrial IoT, ERP, Maintenance Management, dan Automation Platform untuk meningkatkan efisiensi operasional perusahaan. Berdiri sejak tahun 2010, Transindo telah melayani berbagai perusahaan nasional dan multinasional di Indonesia, membantu mereka dalam transformasi digital dan optimalisasi proses bisnis."
          />

          {/* Viewer Card */}
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-500/5 blur-3xl rounded-[3rem]" aria-hidden="true"></div>

            <div className="relative bg-white border border-slate-100 rounded-[2rem] shadow-xl overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-4 px-5 md:px-6 py-3 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <i className="ri-book-open-line text-blue-600 text-lg" aria-hidden="true"></i>
                  Company Profile PT Transindo Multi Industri
                </div>
                <button
                  type="button"
                  onClick={openCatalogFullscreen}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <i className="ri-fullscreen-line" aria-hidden="true"></i>
                  <span className="hidden sm:inline">Layar Penuh</span>
                </button>
              </div>

              {/* Iframe */}
              <div className="relative bg-slate-50">
                <iframe
                  ref={iframeRef}
                  src={COMPRO_URL}
                  className="w-full h-[600px] md:h-[750px]"
                  allowFullScreen
                  loading="lazy"
                  title="Company Profile PT Transindo Multi Industri"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= ERP ENTERPRISE PLATFORM ======= */}
      <section id="erp-platform" className="py-16 md:py-24 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-14 md:mb-16"
            badge="ERP Enterprise Platform"
            title={
              <>
                Satu Platform untuk Mengelola{" "}
                <span className="text-blue-600">Seluruh Operasional Perusahaan</span>
              </>
            }
            description="TRANSINDO ERP membantu perusahaan mengintegrasikan proses bisnis, operasional, sumber daya manusia, aset, dan rantai pasok dalam satu sistem yang terhubung secara real-time untuk meningkatkan efisiensi, transparansi, dan pengambilan keputusan."
          />

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 md:p-10 mb-12">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-blue-100 rounded-3xl flex items-center justify-center mb-4">
                  <i className="ri-router-line text-4xl text-blue-600" aria-hidden="true"></i>
                </div>
                <h3 className="font-bold text-slate-900 text-xl mb-2">Industrial IoT</h3>
                <p className="text-slate-600">
                  Mengumpulkan data mesin, energi, produksi, dan operasional secara real-time.
                </p>
              </div>

              <div className="flex justify-center" aria-hidden="true">
                <div className="hidden md:flex items-center gap-3 text-blue-600">
                  <i className="ri-arrow-right-line text-4xl"></i>
                  <i className="ri-database-2-line text-3xl"></i>
                  <i className="ri-arrow-right-line text-4xl"></i>
                </div>
                <div className="md:hidden flex items-center text-blue-600">
                  <i className="ri-arrow-down-line text-4xl"></i>
                </div>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-blue-100 rounded-3xl flex items-center justify-center mb-4">
                  <i className="ri-building-4-line text-4xl text-blue-600" aria-hidden="true"></i>
                </div>
                <h3 className="font-bold text-slate-900 text-xl mb-2">ERP Enterprise</h3>
                <p className="text-slate-600">
                  Mengotomatisasi proses bisnis, pengambilan keputusan, dan pelaporan perusahaan.
                </p>
              </div>
            </div>
          </div>

          {/* Modules */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {ERP_MODULES.map((mod) => (
              <div
                key={mod.title}
                className="group bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300"
              >
                <div className="mb-5">
                  <IconBox icon={mod.icon} size="sm" />
                </div>
                <h4 className="font-bold text-slate-900 mb-3">{mod.title}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{mod.desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom Statement */}
          <div className="mt-14 text-center max-w-4xl mx-auto">
            <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Semua Departemen Terhubung dalam Satu Sistem
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Dengan TRANSINDO ERP, data tidak lagi tersebar di berbagai file, spreadsheet, atau
                aplikasi terpisah. Seluruh aktivitas bisnis tersinkronisasi secara real-time
                sehingga manajemen dapat memperoleh visibilitas penuh terhadap performa perusahaan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= MAINTENANCE MANAGEMENT SYSTEM ======= */}
      <section id="maintenance-system" className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            badge="Maintenance Management System"
            title={
              <>
                Dari <span className="text-blue-600">Industrial IoT</span> Menjadi Maintenance yang
                Lebih Cerdas
              </>
            }
            description="TRANSINDO Maintenance Management System memanfaatkan data real-time dari sensor Industrial IoT untuk menghasilkan jadwal perawatan, prediksi kerusakan, pengendalian sparepart, serta monitoring biaya maintenance secara otomatis dan terintegrasi."
          />

          {/* Benefits */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-16">
            {MAINTENANCE_BENEFITS.map((item) => (
              <div
                key={item.title}
                className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300"
              >
                <i className={`${item.icon} text-4xl text-blue-600`} aria-hidden="true"></i>
                <h3 className="font-bold text-slate-900 mt-4 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Workflow */}
          <div className="bg-slate-50 rounded-[2.5rem] p-8 md:p-12 border border-slate-100">
            <div className="text-center mb-12">
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                Cara Kerja Maintenance Intelligence Platform
              </h3>
              <p className="text-slate-600 max-w-3xl mx-auto">
                Seluruh proses maintenance berjalan otomatis mulai dari pengambilan data mesin
                hingga pencatatan histori pekerjaan.
              </p>
            </div>

            <div className="workflow-grid grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {MAINTENANCE_WORKFLOW.map((step, index) => (
                <div
                  key={step.title}
                  className="bg-white rounded-[2rem] p-6 shadow-sm border border-transparent hover:border-blue-100 hover:shadow-md transition-all duration-300"
                >
                  <div className="text-blue-600 font-black text-5xl mb-4">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h4 className="font-bold text-slate-900 mb-3">{step.title}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}

              {/* RESULT */}
              <div className="workflow-result bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2rem] p-6 text-white flex flex-col">
                <div className="text-white/30 font-black text-4xl mb-4 tracking-wide">RESULT</div>
                <h4 className="font-bold text-xl mb-3">Smart Maintenance Ecosystem</h4>
                <p className="text-blue-100 text-sm leading-relaxed mb-6">
                  Kurangi downtime, optimalkan biaya maintenance, dan tingkatkan keandalan aset
                  dengan strategi maintenance berbasis data real-time.
                </p>
                <div className="mt-auto">
                  <Link
                    href={CONTACT_URL}
                    className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-5 py-3 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg"
                  >
                    Yuk Coba Gratis!
                    <i className="ri-arrow-right-line" aria-hidden="true"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= TRUSTED BY INDUSTRY SECTION ======= */}
      <section id="trusted-industries" className="py-16 md:py-24 bg-slate-50 overflow-hidden relative">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-10 md:mb-14"
            badge="Trusted By Industry"
            title={
              <>
                Telah Dipercaya oleh
                <span className="text-blue-600 block">Industri Terkemuka di Indonesia</span>
              </>
            }
            description="TERIOT membantu perusahaan manufaktur, energi, FMCG, otomotif, logistik, dan berbagai sektor industri dalam membangun ekosistem digital berbasis Industrial IoT, ERP, Maintenance Management, dan Automation Platform."
          />

          {/* Gallery CTA */}
          <div className="text-center mb-10">
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all duration-300"
            >
              <i className="ri-image-line" aria-hidden="true"></i>
              Lihat Galeri Proyek
            </Link>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="group bg-white rounded-[2rem] p-5 md:p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-5 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <i className={`${stat.icon} text-2xl md:text-3xl text-blue-600 group-hover:text-white transition-colors`} aria-hidden="true"></i>
                </div>
                <div className="text-3xl md:text-5xl font-black text-slate-900 mb-2">{stat.value}</div>
                <div className="font-bold text-slate-900 mb-2 text-sm md:text-base">{stat.label}</div>
                <p className="text-xs md:text-sm text-slate-500">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= CLIENTS SECTION ======= */}
      <section id="clients" className="py-20 bg-white overflow-hidden border-t border-slate-100">
        <div className="container mx-auto px-6 mb-12">
          <div className="flex flex-col items-center">
            <h2 className="text-slate-400 text-[11px] font-bold tracking-[0.3em] uppercase mb-4 text-center">
              Our Trusted Customers
            </h2>
            <div className="h-1 w-12 bg-blue-100 rounded-full"></div>
          </div>
        </div>

        <div className="relative">
          {/* Fade kiri-kanan */}
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent z-10" aria-hidden="true"></div>
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent z-10" aria-hidden="true"></div>

          <div className="animate-scroll flex whitespace-nowrap gap-16 md:gap-24 items-center">
            {[0, 1].map((copy) =>
              CLIENT_LOGOS.map((src, i) => (
                <img
                  key={`${copy}-${i}`}
                  src={src}
                  loading="lazy"
                  aria-hidden={copy === 1}
                  className="h-8 md:h-12 w-auto grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                  alt={copy === 0 ? `Logo klien ${i + 1}` : ""}
                />
              ))
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes scroll {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-50%);
            }
          }
          .animate-scroll {
            animation: scroll 35s linear infinite;
            display: flex;
            width: max-content;
          }
          .animate-scroll:hover {
            animation-play-state: paused;
          }
          @media (max-width: 640px) {
            .animate-scroll {
              animation-duration: 25s;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-scroll {
              animation: none;
            }
          }
        `}</style>
      </section>

      {/* ======= SERVICE PACKAGE SECTION ======= */}
      <section id="service-package" className="py-16 md:py-24 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            badge="Service Package"
            title={
              <>
                Pilih Model Implementasi
                <span className="text-blue-600 block">Sesuai Kebutuhan Bisnis Anda</span>
              </>
            }
            description="TERIOT menyediakan dua skema implementasi yang fleksibel. Mulai dari pembelian sistem secara penuh (On-Premise) hingga model Subscription yang lebih ringan dan scalable."
          />

          <div className="grid lg:grid-cols-2 gap-8">
            {/* On Premise */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 flex-none rounded-2xl bg-blue-100 flex items-center justify-center">
                  <i className="ri-server-line text-3xl text-blue-600" aria-hidden="true"></i>
                </div>
                <div>
                  <div className="text-sm text-blue-600 font-semibold uppercase tracking-wider">
                    On-Premise
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Pembelian Sistem Sekali Bayar</h3>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed mb-8">
                Solusi ideal bagi perusahaan yang ingin memiliki kontrol penuh terhadap data,
                server, dan infrastruktur aplikasi secara internal. Sistem diinstal langsung di
                lingkungan perusahaan dan menjadi aset digital perusahaan.
              </p>

              <div className="mb-8">
                <h4 className="font-bold text-green-600 mb-4">Keunggulan</h4>
                <div className="space-y-3">
                  {[
                    "Kepemilikan sistem sepenuhnya.",
                    "Data tersimpan di lingkungan internal perusahaan.",
                    "Tidak ada biaya langganan bulanan.",
                    "Fleksibilitas kustomisasi lebih tinggi.",
                  ].map((item) => (
                    <div key={item} className="flex gap-3">
                      <i className="ri-checkbox-circle-fill text-green-500 flex-none mt-0.5" aria-hidden="true"></i>
                      <span className="text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-amber-600 mb-4">Pertimbangan</h4>
                <div className="space-y-3">
                  {[
                    "Investasi awal lebih besar.",
                    "Membutuhkan infrastruktur server dan IT internal.",
                    "Pengelolaan sistem menjadi tanggung jawab perusahaan.",
                  ].map((item) => (
                    <div key={item} className="flex gap-3">
                      <i className="ri-information-line text-amber-500 flex-none mt-0.5" aria-hidden="true"></i>
                      <span className="text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2rem] shadow-xl p-8 text-white">
              <span className="absolute top-6 right-6 px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider">
                Rekomendasi
              </span>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 flex-none rounded-2xl bg-white/15 flex items-center justify-center">
                  <i className="ri-cloud-line text-3xl" aria-hidden="true"></i>
                </div>
                <div>
                  <div className="text-sm text-blue-100 font-semibold uppercase tracking-wider">
                    Subscription
                  </div>
                  <h3 className="text-2xl font-bold">Cloud &amp; Managed Service</h3>
                </div>
              </div>

              <p className="text-blue-100 leading-relaxed mb-8">
                Solusi modern dengan biaya awal yang lebih ringan. TERIOT menangani infrastruktur,
                update sistem, maintenance, serta monitoring sehingga perusahaan dapat fokus pada
                operasional bisnis.
              </p>

              <div className="mb-8">
                <h4 className="font-bold text-white mb-4">Keunggulan</h4>
                <div className="space-y-3">
                  {[
                    "Investasi awal lebih rendah.",
                    "Update dan maintenance ditangani TERIOT.",
                    "Implementasi lebih cepat.",
                    "Mudah dikembangkan sesuai pertumbuhan bisnis.",
                  ].map((item) => (
                    <div key={item} className="flex gap-3">
                      <i className="ri-checkbox-circle-fill flex-none mt-0.5" aria-hidden="true"></i>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-blue-100 mb-4">Pertimbangan</h4>
                <div className="space-y-3">
                  {[
                    "Memiliki biaya langganan berkala.",
                    "Bergantung pada koneksi internet untuk layanan cloud.",
                  ].map((item) => (
                    <div key={item} className="flex gap-3">
                      <i className="ri-information-line flex-none mt-0.5" aria-hidden="true"></i>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Belum Yakin Memilih Paket?</h3>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              Konsultasikan kebutuhan bisnis Anda dan coba platform TERIOT sebelum memutuskan
              implementasi penuh.
            </p>
            <Link
              href={CONTACT_URL}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 hover:scale-105 transition-all duration-300 shadow-lg"
            >
              <i className="ri-rocket-line" aria-hidden="true"></i>
              Dapatkan Coba Gratis
            </Link>
          </div>
        </div>
      </section>

      {/* ======= ABOUT SECTION ======= */}
      <section id="about" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-12 md:mb-16"
            badge="Tentang Kami"
            title={
              <>
                Partner Transformasi Digital <span className="text-blue-600">Industri Anda</span>
              </>
            }
          />

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
            {/* Narasi */}
            <div className="w-full lg:w-1/2">
              <p className="text-slate-600 text-base md:text-lg leading-relaxed mb-6">
                <span className="font-bold text-slate-900">PT. Transindo Multi Industri</span>{" "}
                didirikan pada tahun 2015, merupakan perusahaan yang berfokus pada inovasi
                teknologi dan aplikasi digital.
              </p>
              <p className="text-slate-600 text-base md:text-lg leading-relaxed mb-8">
                Kami adalah spesialis di bidang{" "}
                <span className="text-blue-600 font-semibold">IIoT (Industrial IoT)</span>,
                mengintegrasikan mesin produksi untuk mempermudah monitoring, pengolahan data, dan
                analisis secara real-time.
              </p>

              <div className="space-y-4">
                {ABOUT_VALUES.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 transition-colors hover:border-blue-200"
                  >
                    <div className="mt-1 w-5 h-5 flex-none bg-blue-600 rounded-full flex items-center justify-center">
                      <i className="ri-check-line text-white text-xs" aria-hidden="true"></i>
                    </div>
                    <span className="text-slate-700 text-sm md:text-base font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quote & CTA */}
            <div className="w-full lg:w-1/2 flex flex-col">
              <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-200">
                <i className="ri-double-quotes-l text-4xl text-white/40 block mb-3" aria-hidden="true"></i>
                <p className="text-blue-50 leading-relaxed mb-8 text-base md:text-lg italic">
                  Kami memiliki komitmen tinggi untuk meningkatkan layanan sesuai dengan
                  spesialisasi dan keahlian yang terus disempurnakan sesuai dengan era teknologi
                  masa kini.
                </p>

                <Link
                  href={CONTACT_URL}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all active:scale-95"
                >
                  Lebih Detail
                  <i className="ri-arrow-right-line" aria-hidden="true"></i>
                </Link>
              </div>

              <div className="mt-8 hidden lg:block" aria-hidden="true">
                <div className="flex gap-4">
                  <div className="h-2 w-24 bg-blue-100 rounded-full"></div>
                  <div className="h-2 w-12 bg-blue-600 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= WHY US ======= */}
      <section id="why-us" className="py-16 md:py-24 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-5 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* TEXT */}
          <div className="space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold leading-snug text-slate-900">
              Keuntungan menggunakan{" "}
              <span className="text-blue-600">Industrial IoT TERIOT</span>
            </h2>

            <p className="text-slate-600 text-lg leading-relaxed max-w-xl">
              Teknologi di era industri 4.0 membantu Anda mengambil keputusan secara{" "}
              <span className="font-semibold text-slate-800">lebih cepat dan tepat</span>. TERIOT
              hadir sebagai partner terbaik untuk meningkatkan{" "}
              <span className="font-semibold text-slate-800">efisiensi dan efektivitas</span>{" "}
              proses industri Anda.
            </p>

            <ul className="space-y-6">
              {WHY_US.map((item, index) => (
                <li
                  key={item.title}
                  className="group p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-blue-600 text-xl font-bold flex-none">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* 3D IMAGE */}
          <div className="relative flex justify-center perspective-[1200px]">
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-3xl scale-110" aria-hidden="true" />

            <div
              role="img"
              aria-label="Ilustrasi Industrial IoT TERIOT"
              className="relative w-full max-w-md min-h-[420px] rounded-3xl bg-cover bg-center shadow-[0_40px_80px_rgba(0,0,0,0.25)] transform transition-all duration-700 hover:rotate-y-[-12deg] hover:rotate-x-[6deg] hover:scale-105"
              style={{
                backgroundImage: "url('/assets/img/iot1-transformed.png')",
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======= CTA SECTION ======= */}
      <section
        id="cta"
        className="relative py-20 md:py-24 bg-cover bg-center text-white overflow-hidden"
        style={{ backgroundImage: "url('/assets/img/cta-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-[#090725]/70" aria-hidden="true"></div>

        <div className="container mx-auto px-5 md:px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
            <div className="max-w-3xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Trial Demo</h2>
              <p className="text-base md:text-lg text-slate-200 leading-relaxed">
                Coba gratis untuk melihat IoT TERIOT Technology System secara langsung. Rasakan
                pengalaman teknologi masa kini sekarang.
              </p>
            </div>

            <Link
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-none inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-slate-900 font-bold hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg"
            >
              Coba IoT Sekarang!
              <i className="ri-arrow-right-line" aria-hidden="true"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* ======= CONTACT US SECTION ======= */}
      <section id="contact-us" className="bg-[#051937] text-white py-20 md:py-24 overflow-hidden">
        <div className="container mx-auto px-5 md:px-6 flex flex-col items-center">
          {/* Header */}
          <div className="text-center max-w-3xl mb-14 md:mb-16">
            <div className="flex items-center justify-center gap-2 mb-4 text-[#00a8ff] tracking-widest text-xs font-bold uppercase">
              <span className="w-6 h-[2px] bg-[#00a8ff]" aria-hidden="true"></span>
              Hubungi Kami
              <span className="w-6 h-[2px] bg-[#00a8ff]" aria-hidden="true"></span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
              3-way Collaboration: Procurement, Partnership, &amp; Skill Talent
            </h2>
            <p className="text-gray-300 text-base md:text-lg leading-relaxed">
              Apakah Anda sedang melakukan pengadaan project otomasi dan kebutuhan material,
              kolaborasi kemitraan, atau mempertimbangkan karir di ketiga core bisnis kami — mulailah
              di sini.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
            {CONTACT_CARDS.map(({ Icon, tag, title, desc, cta, href }) => (
              <div
                key={title}
                className="bg-[#0a2540]/60 border border-[#1e3a5f] rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:border-[#00a8ff]/50 hover:shadow-lg hover:shadow-[#00a8ff]/5"
              >
                <div>
                  <div className="w-12 h-12 bg-[#0c2e56] rounded-xl flex items-center justify-center mb-6 border border-[#1a3d6c]">
                    <Icon className="w-6 h-6 text-[#00a8ff]" aria-hidden="true" />
                  </div>
                  <span className="text-[#00cc66] font-bold text-xs uppercase tracking-wider block mb-2">
                    {tag}
                  </span>
                  <h3 className="text-2xl font-bold mb-4">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-8">{desc}</p>
                </div>
                <Link
                  href={href}
                  className="text-[#00a8ff] font-medium text-sm flex items-center gap-2 hover:underline group w-fit"
                >
                  {cta}
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= BRAND DISTRIBUTOR SECTION ======= */}
      <section id="brands" className="py-16 md:py-24 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-12 md:mb-16"
            badge="Brand Partner"
            title={
              <>
                Distributor Resmi <span className="text-blue-600">Brand Industri Terpercaya</span>
              </>
            }
            description="Kami bekerja sama dengan brand otomasi dan kelistrikan industri terkemuka untuk memastikan kualitas, keandalan, dan kompatibilitas di setiap solusi yang kami hadirkan."
          />

          {/* Logo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
            {BRANDS.map((brand) => (
              <div
                key={brand.name}
                title={brand.name}
                className="group relative bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 transition-all duration-300 flex items-center justify-center h-28 md:h-36"
              >
                <img
                  src={brand.src}
                  alt={`Logo ${brand.name}`}
                  loading="lazy"
                  className="max-h-12 md:max-h-16 w-auto max-w-full object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                />
              </div>
            ))}
          </div>

          <p className="text-center text-slate-500 text-xs md:text-sm mt-10 md:mt-12">
            Dan masih banyak brand lainnya. Hubungi kami untuk informasi produk dan ketersediaan.
          </p>
        </div>
      </section>
    </>
  );
}
