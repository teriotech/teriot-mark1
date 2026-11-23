"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

/* =========================================================================
   HALAMAN PRODUK · ROBOTIC PROCESS AUTOMATION (RPA)
   Tema mengikuti page.tsx utama: badge pill, header section, kartu
   rounded-[2rem], palet slate/blue, hero gelap #0f172a.
   ========================================================================= */

const CONTACT_URL = "https://transindomu.com/production/contact";

/* ------------------------------- DATA ---------------------------------- */

const HERO_CHIPS = [
  { icon: "ri-plug-line", label: "Tanpa mengganti sistem lama" },
  { icon: "ri-time-line", label: "Berjalan 24/7" },
  { icon: "ri-file-list-3-line", label: "Audit trail lengkap" },
];

/** Skenario yang diputar di kartu hero: bot laporan shift pagi. */
const BOT_RUN = [
  { time: "06:00", icon: "ri-download-cloud-2-line", text: "Menarik data historian shift malam" },
  { time: "06:02", icon: "ri-shield-check-line", text: "Memeriksa data gap & quality flag" },
  { time: "06:05", icon: "ri-calculator-line", text: "Menghitung efisiensi & konsumsi energi" },
  { time: "06:08", icon: "ri-exchange-line", text: "Posting ke ERP & membuat work order CMMS" },
  { time: "06:10", icon: "ri-notification-3-line", text: "Mengirim laporan ke email & WhatsApp" },
];

const BOT_OUTPUTS = [
  { icon: "ri-building-2-line", label: "ERP terposting", at: 4 },
  { icon: "ri-tools-line", label: "WO-2451 dibuat", at: 4 },
  { icon: "ri-mail-send-line", label: "Laporan terkirim", at: 5 },
];

const PAIN_POINTS = [
  { icon: "ri-keyboard-line", title: "Input data manual berulang", desc: "Operator menyalin angka dari logsheet, Excel, dan dashboard ke ERP setiap hari." },
  { icon: "ri-error-warning-line", title: "Rawan salah ketik", desc: "Satu angka salah di awal shift berujung laporan yang harus dikoreksi berhari-hari." },
  { icon: "ri-hourglass-line", title: "Laporan datang terlambat", desc: "Rekap shift baru siap siang hari, keputusan menunggu data yang sudah basi." },
  { icon: "ri-links-line", title: "Sistem tidak saling bicara", desc: "ERP, CMMS, dan aplikasi lama tidak punya integrasi, manusia jadi jembatannya." },
];

const FLOW_STEPS = [
  {
    icon: "ri-flashlight-line",
    title: "Trigger",
    desc: "Bot dijalankan oleh jadwal, event dari sistem lain, atau ambang nilai dari sensor IoT.",
    io: ["Jadwal 06:00", "Event webhook", "Ambang KPI"],
  },
  {
    icon: "ri-download-cloud-2-line",
    title: "Ambil Data",
    desc: "Bot membuka sumber data: historian, dashboard, Excel, email, portal web, atau database.",
    io: ["Historian", "Excel / CSV", "Portal web"],
  },
  {
    icon: "ri-shield-check-line",
    title: "Validasi & Hitung",
    desc: "Data diperiksa kelengkapannya, dicocokkan dengan aturan bisnis, lalu dihitung menjadi KPI.",
    io: ["Cek data gap", "Rule bisnis", "Hitung KPI"],
  },
  {
    icon: "ri-robot-2-line",
    title: "Eksekusi",
    desc: "Bot mengisi form, memposting transaksi ke ERP, dan membuat work order di CMMS seperti manusia, tetapi tanpa salah ketik.",
    io: ["Posting ERP", "Work order", "Approval"],
  },
  {
    icon: "ri-send-plane-line",
    title: "Distribusi & Log",
    desc: "Hasil dikirim ke email atau WhatsApp, laporan dibuat otomatis, dan setiap langkah tercatat untuk audit.",
    io: ["Email / WA", "Report PDF", "Audit log"],
  },
];

const ECOSYSTEM = [
  { icon: "ri-temp-hot-line", label: "Sensor & PLC", level: "L0 – L1", note: "Data proses" },
  { icon: "ri-router-line", label: "IoT Gateway", level: "L2.5", note: "Read-only" },
  { icon: "ri-database-2-line", label: "Historian", level: "L3", note: "Time-series" },
  { icon: "ri-dashboard-3-line", label: "Dashboard & AI", level: "L4", note: "KPI & analisa" },
  { icon: "ri-robot-2-line", label: "RPA Bot", level: "L4", note: "Digital worker", highlight: true },
  { icon: "ri-building-2-line", label: "ERP / CMMS", level: "L4", note: "Transaksi bisnis" },
  { icon: "ri-user-star-line", label: "Manajemen", level: "Keputusan", note: "Laporan harian" },
];

const CASE_STEPS = [
  { icon: "ri-pulse-line", title: "Deviasi terdeteksi", desc: "Excess O₂ Boiler-01 naik dari 3,1% menjadi 5,4% sejak pukul 23:10." },
  { icon: "ri-ruler-line", title: "Aturan terpenuhi", desc: "Rule: O₂ di atas 4,5% selama lebih dari 15 menit memicu tindakan otomatis." },
  { icon: "ri-flashlight-line", title: "Bot dipicu", desc: "RPA bot menarik tren, memeriksa mode controller AIC-220, dan menyusun ringkasan." },
  { icon: "ri-checkbox-circle-line", title: "Tindakan tercatat", desc: "WO-2451 dibuat di CMMS, ringkasan dikirim ke supervisor shift lewat WhatsApp." },
];

const CASE_CHAT: { role: "user" | "ai"; text: string }[] = [
  { role: "user", text: "Kenapa efisiensi Boiler-01 turun sejak semalam?" },
  { role: "ai", text: "Excess O₂ naik dari 3,1% ke 5,4% sejak pukul 23:10. Rugi kalor di flue gas bertambah." },
  { role: "user", text: "Apa pemicunya?" },
  { role: "ai", text: "Damper FD fan membuka 12% lebih lebar setelah beban turun. AIC-220 tercatat mode manual." },
  { role: "user", text: "Buatkan work order." },
  { role: "ai", text: "WO-2451 dibuat di CMMS: kembalikan AIC-220 ke auto dan kalibrasi probe AT-220. Supervisor shift sudah diberi tahu." },
];

const TARGET_SYSTEMS = [
  { icon: "ri-building-2-line", name: "ERP", desc: "SAP, Odoo, ERP custom" },
  { icon: "ri-tools-line", name: "CMMS", desc: "Work order & maintenance" },
  { icon: "ri-database-2-line", name: "Historian", desc: "Data time-series IoT" },
  { icon: "ri-dashboard-3-line", name: "Dashboard", desc: "KPI & OEE" },
  { icon: "ri-file-excel-2-line", name: "Excel / Sheets", desc: "Template laporan" },
  { icon: "ri-mail-line", name: "Email", desc: "Baca lampiran & kirim" },
  { icon: "ri-whatsapp-line", name: "WhatsApp", desc: "Notifikasi & ringkasan" },
  { icon: "ri-window-line", name: "Aplikasi Legacy", desc: "Portal web & desktop" },
];

const METHODS = [
  { icon: "ri-code-s-slash-line", title: "API & Webhook", desc: "Cara tercepat jika sistem menyediakan REST API atau event." },
  { icon: "ri-database-2-line", title: "Database", desc: "Baca dan tulis langsung ke tabel dengan hak akses terbatas." },
  { icon: "ri-cursor-line", title: "UI Automation", desc: "Bot mengoperasikan layar aplikasi lama yang tidak punya API." },
  { icon: "ri-folder-open-line", title: "File & Email Watcher", desc: "Memantau folder atau inbox, lalu memproses file yang masuk." },
];

const BENEFITS = [
  { icon: "ri-timer-flash-line", value: "10 mnt", label: "Laporan shift siap", desc: "Dari sekitar 2 jam kerja manual menjadi 10 menit proses bot di contoh implementasi." },
  { icon: "ri-checkbox-circle-line", value: "0", label: "Salah ketik", desc: "Angka berpindah antar sistem tanpa diketik ulang oleh manusia." },
  { icon: "ri-24-hours-line", value: "24/7", label: "Bot bekerja", desc: "Jadwal malam, akhir pekan, dan hari libur tetap berjalan." },
  { icon: "ri-file-shield-2-line", value: "100%", label: "Tercatat", desc: "Setiap langkah bot punya log waktu, sumber data, dan hasil untuk audit." },
];

const ROLLOUT = [
  { title: "Asesmen Proses", desc: "Kami memetakan pekerjaan rutin Anda, memilih yang paling banyak memakan waktu dan paling berulang.", duration: "1 minggu" },
  { title: "Desain Bot", desc: "Alur, aturan bisnis, dan hak akses ditentukan bersama tim Anda, lalu bot dibangun.", duration: "2 – 3 minggu" },
  { title: "Uji Paralel", desc: "Bot berjalan berdampingan dengan proses manual sampai hasilnya terbukti identik.", duration: "1 – 2 minggu" },
  { title: "Go-live & Monitoring", desc: "Bot dijadwalkan, dipantau dari dashboard, dan ditingkatkan sesuai kebutuhan baru.", duration: "Berkelanjutan" },
];

const FAQ = [
  { q: "Apakah kami harus mengganti ERP atau aplikasi yang sudah ada?", a: "Tidak. RPA bekerja di atas sistem yang sudah berjalan. Bot menggunakan API bila tersedia, atau mengoperasikan antarmuka aplikasi seperti yang dilakukan operator." },
  { q: "Bagaimana jika aplikasi lama tidak punya API?", a: "Bot memakai UI automation: membuka aplikasi, mengisi form, dan membaca layar. Ini cara yang umum untuk aplikasi desktop atau portal web lama." },
  { q: "Apakah bot bisa mengubah setting mesin atau PLC?", a: "Tidak. Bot hanya beroperasi di lapisan bisnis (L4): ERP, CMMS, laporan, dan notifikasi. Lapisan kontrol dan safety plant tetap terpisah." },
  { q: "Bagaimana jika data sumber tidak lengkap?", a: "Langkah validasi menandai data gap dan quality flag. Bot bisa menunda, mengisi dengan aturan yang disepakati, atau meminta konfirmasi manusia sebelum lanjut." },
  { q: "Berapa lama sampai bot pertama berjalan?", a: "Untuk satu proses seperti laporan shift, umumnya 4 sampai 6 minggu dari asesmen sampai go-live, termasuk masa uji paralel." },
];

/* --------------------------- KOMPONEN KECIL ---------------------------- */

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
      <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">{title}</h2>
      {description && (
        <p className="text-slate-600 text-sm md:text-lg leading-relaxed max-w-3xl mx-auto">{description}</p>
      )}
    </div>
  );
}

function IconBox({ icon, size = "md" }: { icon: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? "w-12 h-12 rounded-xl" : "w-14 h-14 md:w-16 md:h-16 rounded-2xl";
  const glyph = size === "sm" ? "text-xl" : "text-2xl md:text-3xl";
  return (
    <div className={`${box} bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors`}>
      <i className={`${icon} ${glyph} text-blue-600 group-hover:text-white transition-colors`} aria-hidden="true"></i>
    </div>
  );
}

/** true selama elemen terlihat, dipakai untuk menyalakan/mematikan animasi. */
function useActiveInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => setActive(entry.isIntersecting)),
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, active };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/** Kartu hero: simulasi bot laporan shift yang berjalan langkah demi langkah. */
function BotRunCard() {
  const { ref, active } = useActiveInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const total = BOT_RUN.length;
  const [progress, setProgress] = useState(0); // jumlah langkah selesai (0..total)

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setProgress(total);
      return;
    }
    const id = window.setInterval(() => {
      setProgress((p) => (p >= total ? 0 : p + 1));
    }, 1700);
    return () => window.clearInterval(id);
  }, [active, reduced, total]);

  const done = progress >= total;
  const percent = Math.round((progress / total) * 100);

  return (
    <div ref={ref} className="relative w-full max-w-md mx-auto">
      <div className="absolute -inset-6 bg-blue-500/20 blur-3xl rounded-full" aria-hidden="true"></div>

      <div className="relative bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-blue-600 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-none">
              <i className="ri-robot-2-line text-xl" aria-hidden="true"></i>
            </div>
            <div className="min-w-0">
              <div className="font-bold truncate">Bot Laporan Shift Pagi</div>
              <div className="text-[11px] text-blue-100 tracking-wider uppercase">RPA-01 · Boiler Area</div>
            </div>
          </div>
          <span
            className={`flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
              done ? "bg-green-400/20 text-green-100" : "bg-white/15 text-white"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${done ? "bg-green-300" : "bg-white animate-pulse"}`}></span>
            {done ? "SELESAI" : "RUNNING"}
          </span>
        </div>

        {/* Progress */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
            <span>Progres eksekusi</span>
            <span className="text-blue-600">{percent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-700 ease-out"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
        </div>

        {/* Steps */}
        <ol className="px-5 py-4 space-y-2">
          {BOT_RUN.map((step, i) => {
            const isDone = i < progress;
            const isCurrent = i === progress && !done;
            return (
              <li
                key={step.time}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                  isDone
                    ? "border-blue-100 bg-blue-50/70"
                    : isCurrent
                    ? "border-blue-300 bg-white shadow-md shadow-blue-100"
                    : "border-slate-100 bg-white opacity-60"
                }`}
              >
                <span
                  className={`w-7 h-7 flex-none rounded-full flex items-center justify-center text-sm ${
                    isDone
                      ? "bg-blue-600 text-white"
                      : isCurrent
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                  aria-hidden="true"
                >
                  <i className={isDone ? "ri-check-line" : isCurrent ? "ri-loader-4-line animate-spin" : step.icon}></i>
                </span>
                <span className="font-mono text-[11px] font-bold text-blue-600 flex-none">{step.time}</span>
                <span className="text-[13px] text-slate-700 leading-snug">{step.text}</span>
              </li>
            );
          })}
        </ol>

        {/* Outputs */}
        <div className="px-5 pb-5">
          <div className="text-[11px] font-semibold text-slate-500 mb-2">Hasil</div>
          <div className="flex flex-wrap gap-2">
            {BOT_OUTPUTS.map((out) => {
              const ready = progress >= out.at;
              return (
                <span
                  key={out.label}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-500 ${
                    ready
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-slate-50 border-slate-100 text-slate-400"
                  }`}
                >
                  <i className={ready ? "ri-checkbox-circle-fill" : out.icon} aria-hidden="true"></i>
                  {out.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- HALAMAN -------------------------------- */

export default function ProductRpaPage() {
  return (
    <>
      {/* ======= HERO ======= */}
      <section
        id="rpa-hero"
        className="relative min-h-[90svh] flex items-center bg-[#0f172a] pt-28 pb-16 lg:pt-32 lg:pb-24 overflow-hidden"
      >
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full" aria-hidden="true"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/10 blur-[120px] rounded-full" aria-hidden="true"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Teks */}
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-200 text-[11px] md:text-xs font-bold tracking-widest uppercase mb-6">
                <i className="ri-robot-2-line" aria-hidden="true"></i>
                Robotic Process Automation
              </span>

              <h1 className="text-[30px] sm:text-[40px] lg:text-6xl font-black leading-[1.15] tracking-tight text-white mb-6">
                Otomatiskan Pekerjaan Rutin,{" "}
                <span className="text-blue-400">dari Data Mesin hingga Laporan Manajemen</span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0 font-light">
                RPA TERIOT adalah <span className="text-white font-medium">digital worker</span> yang
                menarik data, memeriksa, menghitung, memposting ke ERP, membuat work order, dan
                mengirim laporan secara otomatis. Tanpa mengganti sistem yang sudah Anda pakai.
              </p>

              <div className="flex flex-wrap justify-center lg:justify-start gap-2 md:gap-3 mb-10">
                {HERO_CHIPS.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-200 text-[11px] md:text-sm font-medium"
                  >
                    <i className={`${chip.icon} text-blue-400`} aria-hidden="true"></i>
                    {chip.label}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/demo"
                  className="px-10 py-4 rounded-full bg-blue-600 text-white font-bold shadow-[0_10px_20px_rgba(37,99,235,0.3)] hover:bg-blue-700 active:scale-95 transition-all text-center"
                >
                  Request Demo
                </Link>
                <a
                  href="#cara-kerja"
                  className="px-10 py-4 rounded-full border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 hover:text-white active:scale-95 transition-all text-center inline-flex items-center justify-center gap-2"
                >
                  Lihat Cara Kerja
                  <i className="ri-arrow-down-line" aria-hidden="true"></i>
                </a>
              </div>
            </div>

            {/* Visual */}
            <div className="w-full lg:w-1/2">
              <BotRunCard />
            </div>
          </div>
        </div>
      </section>

      {/* ======= MASALAH YANG DISELESAIKAN ======= */}
      <section id="masalah" className="py-16 md:py-24 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-12 md:mb-16"
            badge="Kenapa RPA?"
            title={
              <>
                Pekerjaan Rutin yang <span className="text-blue-600">Menghabiskan Waktu Tim Anda</span>
              </>
            }
            description="Di banyak pabrik, jam pertama setiap shift habis untuk menyalin angka dari satu sistem ke sistem lain. RPA mengambil alih pekerjaan ini, sehingga tim fokus pada analisa dan keputusan."
          />

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {PAIN_POINTS.map((item) => (
              <div
                key={item.title}
                className="group bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300"
              >
                <div className="mb-5">
                  <IconBox icon={item.icon} size="sm" />
                </div>
                <h3 className="font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= CARA KERJA: FLOW RPA 5 LANGKAH ======= */}
      <section id="cara-kerja" className="py-16 md:py-24 bg-white overflow-hidden scroll-mt-24">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            badge="Bagaimana RPA Bekerja?"
            title={
              <>
                Dari <span className="text-blue-600">Trigger ke Laporan</span> dalam 5 Langkah
              </>
            }
            description="Setiap bot mengikuti alur yang sama dan bisa dibaca siapa saja. Anda menentukan pemicu, sumber data, aturan, dan tujuan. Bot menjalankannya persis sama setiap hari."
          />

          <div className="relative">
            {/* Garis penghubung horizontal (desktop) */}
            <div
              className="hidden xl:block absolute top-[64px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100"
              aria-hidden="true"
            ></div>
            {/* Rel vertikal (mobile & tablet) */}
            <div className="xl:hidden absolute top-8 bottom-8 left-16 w-px bg-blue-100" aria-hidden="true"></div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {FLOW_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="group relative bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Panah ke langkah berikutnya (desktop) */}
                  {index < FLOW_STEPS.length - 1 && (
                    <span
                      className="hidden xl:flex absolute -right-6 top-[52px] w-6 h-6 rounded-full bg-white border border-blue-200 text-blue-600 items-center justify-center text-sm z-10"
                      aria-hidden="true"
                    >
                      <i className="ri-arrow-right-s-line"></i>
                    </span>
                  )}

                  <div className="flex xl:block items-start gap-5">
                    <div className="relative flex-none">
                      <IconBox icon={step.icon} />
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center border-2 border-white">
                        {index + 1}
                      </span>
                    </div>

                    <div className="xl:mt-6">
                      <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed mb-4">{step.desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {step.io.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Catatan keamanan */}
          <div className="mt-10 max-w-4xl mx-auto bg-amber-50 border border-amber-100 rounded-[2rem] p-6 md:p-8 flex items-start gap-4">
            <div className="w-12 h-12 flex-none rounded-xl bg-amber-100 flex items-center justify-center">
              <i className="ri-shield-star-line text-2xl text-amber-600" aria-hidden="true"></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Bot hanya bekerja di lapisan bisnis</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                RPA membaca data IoT dan menulis ke ERP, CMMS, email, dan laporan. Bot tidak pernah
                menulis ke PLC, DCS, atau sistem safety. Kendali plant tetap di tangan sistem kontrol
                dan operator.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= POSISI RPA DALAM EKOSISTEM ======= */}
      <section id="ekosistem" className="py-16 md:py-24 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-12 md:mb-16"
            badge="Satu Alur Data"
            title={
              <>
                Posisi RPA dalam <span className="text-blue-600">Ekosistem Industrial IoT</span>
              </>
            }
            description="Data mengalir dari sensor ke historian, dianalisa menjadi KPI, lalu RPA mengubahnya menjadi transaksi dan laporan. Setiap lapisan punya tugasnya, kendali tetap di bawah, data mengalir ke atas."
          />

          <div className="relative">
            <div
              className="hidden lg:block absolute top-[40px] left-[7%] right-[7%] h-[2px] bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100"
              aria-hidden="true"
            ></div>

            <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5 md:mx-0 md:px-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:pb-0 snap-x">
              {ECOSYSTEM.map((node) => (
                <div
                  key={node.label}
                  className={`relative flex-none w-[150px] lg:w-auto snap-start rounded-[1.5rem] border p-4 text-center transition-all duration-300 ${
                    node.highlight
                      ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 lg:-translate-y-2"
                      : "bg-white border-slate-100 text-slate-900 shadow-sm hover:shadow-lg"
                  }`}
                >
                  <div
                    className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 ${
                      node.highlight ? "bg-white/20" : "bg-blue-100"
                    }`}
                  >
                    <i className={`${node.icon} text-2xl ${node.highlight ? "text-white" : "text-blue-600"}`} aria-hidden="true"></i>
                  </div>
                  <div className="font-bold text-sm leading-tight mb-1">{node.label}</div>
                  <div className={`text-[11px] ${node.highlight ? "text-blue-100" : "text-slate-500"}`}>{node.note}</div>
                  <div
                    className={`mt-3 inline-block px-2 py-0.5 rounded-full font-mono text-[10px] tracking-wider ${
                      node.highlight ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {node.level}
                  </div>
                  {node.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-white text-blue-600 text-[10px] font-black tracking-wider shadow">
                      ANDA DI SINI
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="lg:hidden text-center text-xs text-slate-400 mt-1">Geser untuk melihat seluruh alur</p>
          </div>
        </div>
      </section>

      {/* ======= CONTOH KASUS ======= */}
      <section id="contoh-kasus" className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-12 md:mb-16"
            badge="Contoh Kasus"
            title={
              <>
                Dari Anomali Sensor <span className="text-blue-600">Menjadi Work Order</span> Tanpa Tangan Manusia
              </>
            }
            description="Skenario nyata di area boiler: AI Assistant menjelaskan penyebab, RPA bot mengeksekusi tindak lanjutnya di CMMS dan mengabari tim."
          />

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Langkah kejadian */}
            <div className="space-y-4">
              {CASE_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="group flex items-start gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-100 hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative flex-none">
                    <IconBox icon={step.icon} size="sm" />
                    <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">{step.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3 pt-2 text-sm text-slate-500">
                <i className="ri-time-line text-blue-600 text-lg" aria-hidden="true"></i>
                Seluruh rangkaian selesai dalam hitungan menit, tanpa menunggu operator membuka laptop.
              </div>
            </div>

            {/* Chat AI + RPA */}
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" aria-hidden="true"></div>
              <div className="relative bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-blue-600 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <i className="ri-robot-2-line text-xl" aria-hidden="true"></i>
                    </div>
                    <div>
                      <div className="font-bold">TeriotBot AI + RPA</div>
                      <div className="flex items-center gap-2 text-xs text-blue-100">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        Online
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] tracking-widest text-blue-100">BOILER-01</span>
                </div>

                <div className="bg-slate-50 p-4 space-y-3">
                  {CASE_CHAT.map((msg, i) => {
                    const isUser = msg.role === "user";
                    return (
                      <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            isUser
                              ? "bg-blue-600 text-white rounded-br-md"
                              : "bg-white border border-slate-200 text-slate-700 shadow-sm rounded-bl-md"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}

                  {/* Kartu aksi RPA */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] w-full bg-white border border-green-200 rounded-2xl rounded-bl-md shadow-sm p-4">
                      <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-green-700 uppercase mb-3">
                        <i className="ri-robot-2-line" aria-hidden="true"></i>
                        Aksi RPA Bot
                      </div>
                      <div className="space-y-2 text-sm">
                        {[
                          { icon: "ri-tools-line", text: "WO-2451 dibuat di CMMS", meta: "Prioritas: Tinggi" },
                          { icon: "ri-whatsapp-line", text: "Ringkasan dikirim ke supervisor shift", meta: "WhatsApp · 23:28" },
                          { icon: "ri-file-chart-line", text: "Deviasi dicatat di laporan harian", meta: "Section: Efisiensi" },
                        ].map((row) => (
                          <div key={row.text} className="flex items-center gap-3">
                            <span className="w-7 h-7 flex-none rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                              <i className={row.icon} aria-hidden="true"></i>
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-slate-800 font-medium truncate">{row.text}</span>
                              <span className="block text-[11px] text-slate-400">{row.meta}</span>
                            </span>
                            <i className="ri-checkbox-circle-fill text-green-500" aria-hidden="true"></i>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======= INTEGRASI ======= */}
      <section id="integrasi" className="py-16 md:py-24 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-12 md:mb-16"
            badge="Integrasi"
            title={
              <>
                Terhubung dengan <span className="text-blue-600">Sistem yang Sudah Anda Pakai</span>
              </>
            }
            description="Bot menjangkau sistem modern maupun aplikasi lama. Kami memilih metode koneksi yang paling stabil untuk setiap sistem."
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
            {TARGET_SYSTEMS.map((sys) => (
              <div
                key={sys.name}
                className="group bg-white p-5 md:p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 hover:-translate-y-1 transition-all duration-300 text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-blue-100 flex items-center justify-center mb-3 group-hover:bg-blue-600 transition-colors">
                  <i className={`${sys.icon} text-2xl text-blue-600 group-hover:text-white transition-colors`} aria-hidden="true"></i>
                </div>
                <div className="font-bold text-slate-900 text-sm md:text-base">{sys.name}</div>
                <div className="text-[11px] md:text-xs text-slate-500 mt-1">{sys.desc}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 md:p-10">
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 text-center mb-8">
              Empat Cara Bot Terhubung
            </h3>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {METHODS.map((m) => (
                <div key={m.title} className="flex xl:flex-col items-start gap-4">
                  <div className="w-12 h-12 flex-none rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <i className={`${m.icon} text-xl text-blue-600`} aria-hidden="true"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">{m.title}</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======= MANFAAT ======= */}
      <section id="manfaat" className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-12 md:mb-16"
            badge="Dampak Bisnis"
            title={
              <>
                Hasil yang <span className="text-blue-600">Terasa Sejak Bot Pertama</span>
              </>
            }
            description="Angka di bawah berasal dari contoh implementasi bot laporan shift. Hasil di tempat Anda bergantung pada proses yang dipilih."
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {BENEFITS.map((b) => (
              <div
                key={b.label}
                className="group bg-white rounded-[2rem] p-5 md:p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-5 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <i className={`${b.icon} text-2xl md:text-3xl text-blue-600 group-hover:text-white transition-colors`} aria-hidden="true"></i>
                </div>
                <div className="text-3xl md:text-5xl font-black text-slate-900 mb-2">{b.value}</div>
                <div className="font-bold text-slate-900 mb-2 text-sm md:text-base">{b.label}</div>
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= LANGKAH IMPLEMENTASI ======= */}
      <section id="implementasi" className="py-16 md:py-24 bg-slate-50 overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-12 md:mb-16"
            badge="Implementasi"
            title={
              <>
                Mulai dari <span className="text-blue-600">Satu Proses</span>, Berkembang Bertahap
              </>
            }
            description="Kami tidak mengotomatiskan semuanya sekaligus. Satu bot yang terbukti lebih berharga daripada sepuluh bot yang setengah jadi."
          />

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {ROLLOUT.map((step, index) => (
              <div
                key={step.title}
                className="relative bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-blue-600 font-black text-5xl leading-none">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold">
                    {step.duration}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{step.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======= FAQ ======= */}
      <section id="faq" className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-5 md:px-6">
          <SectionHeader
            className="mb-10 md:mb-14"
            badge="FAQ"
            title={
              <>
                Pertanyaan yang <span className="text-blue-600">Sering Diajukan</span>
              </>
            }
          />

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm open:border-blue-200 open:shadow-md transition-all"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-5 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="w-8 h-8 flex-none rounded-full bg-blue-50 text-blue-600 flex items-center justify-center transition-transform duration-300 group-open:rotate-45">
                    <i className="ri-add-line" aria-hidden="true"></i>
                  </span>
                </summary>
                <div className="px-6 pb-6 -mt-1 text-slate-600 text-sm leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ======= CTA ======= */}
      <section id="rpa-cta" className="pb-20 md:pb-28 pt-4 bg-white">
        <div className="container mx-auto px-5 md:px-6">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-blue-700 px-7 py-14 sm:px-14 text-center shadow-2xl shadow-blue-200">
            <div className="pointer-events-none absolute -right-20 -top-20 w-72 h-72 rounded-full bg-white/10 blur-2xl" aria-hidden="true"></div>
            <div className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-sky-300/20 blur-2xl" aria-hidden="true"></div>

            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">
                Proses Mana yang Ingin Anda Otomatiskan Lebih Dulu?
              </h2>
              <p className="text-blue-100 text-sm md:text-base leading-relaxed max-w-xl mx-auto mb-10">
                Ceritakan satu pekerjaan rutin yang paling menyita waktu tim Anda. Kami tunjukkan bagaimana bot
                mengerjakannya dalam sesi demo.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-blue-700 shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  <i className="ri-rocket-line" aria-hidden="true"></i>
                  Jadwalkan Demo
                </Link>
                <Link
                  href={CONTACT_URL}
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 px-8 py-4 font-semibold text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <i className="ri-customer-service-2-line" aria-hidden="true"></i>
                  Konsultasi Kebutuhan
                </Link>
              </div>

              <div className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-[10px] tracking-[0.18em] text-blue-200">
                {FLOW_STEPS.map((step, i, arr) => (
                  <span key={step.title} className="flex items-center gap-3">
                    {step.title.toUpperCase()}
                    {i < arr.length - 1 && <i className="ri-arrow-right-line text-blue-300" aria-hidden="true"></i>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
