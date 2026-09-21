import Image from "next/image";
import Link from "next/link";

export default function ProductGERPPage() {
  return (
    <main className="overflow-hidden bg-white mobile-zoom">
      {/* CSS HARDCODED - Aman untuk Server Component */}
      <style>{`
        @keyframes floating {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(1.5deg); }
        }
        .hero-floating-anim {
          animation: floating 4s ease-in-out infinite;
        }
        .touch-card:active {
          transform: scale(0.98);
          transition: transform 0.1s;
        }
        .section-bridge {
          height: 100px;
          background: linear-gradient(to bottom, #0f172a, #ffffff);
        }
        
        /* Efek Zoom Out 75% khusus untuk Mobile Phone */
        @media screen and (max-width: 768px) {
          .mobile-zoom {
            zoom: 0.75;
          }
        }
      `}</style>

      {/* ======= HERO SECTION ======= */}
      <section
        id="hero"
        className="relative min-h-[100svh] flex items-center bg-[#0f172a] pt-28 pb-20 lg:py-0 overflow-hidden"
      >
        {/* Background Glow Premium */}
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            
            {/* 1. Hero Image (Mobile: Top) */}
            <div className="w-full lg:w-1/2 order-1 lg:order-2">
              <div className="relative group flex justify-center" style={{ perspective: "1200px" }}>
                <div className="absolute inset-0 bg-blue-500/15 blur-[60px] rounded-full scale-110"></div>
                <Image
                  src="/assets/img/erp.png"
                  alt="ERP Illustration"
                  width={520}
                  height={520}
                  className="hero-floating-anim relative z-10 drop-shadow-2xl max-w-[280px] sm:max-w-[400px] lg:max-w-full h-auto"
                  style={{ transformStyle: "preserve-3d", animation: "sway 6s ease-in-out infinite" }}
                />
              </div>
            </div>

            {/* 2. Text Content */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center text-center lg:text-left order-2 lg:order-1">
              <h1 className="text-[34px] sm:text-[42px] lg:text-6xl font-black leading-[1.2] tracking-tight text-white mb-6">
                ERP Digital <br className="hidden sm:block" />
                <span className="text-blue-400">Application</span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0 font-light px-2">
                Kelola operasional bisnis dari hulu hingga hilir secara{" "}
                <span className="font-semibold text-white">terintegrasi & paperless</span>. 
                Solusi modern untuk meningkatkan kolaborasi lintas departemen dan produktivitas kerja.
              </p> 

              {/* Tech Highlights */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-12">
                <div className="flex items-center gap-2 text-sm text-blue-100 bg-blue-600/20 px-4 py-2 rounded-full border border-blue-500/20 backdrop-blur-sm">
                  🚀 Efisien
                </div>
                <div className="flex items-center gap-2 text-sm text-purple-100 bg-purple-600/20 px-4 py-2 rounded-full border border-purple-500/20 backdrop-blur-sm">
                  🔗 Terintegrasi
                </div>
                <div className="flex items-center gap-2 text-sm text-green-100 bg-green-600/20 px-4 py-2 rounded-full border border-green-500/20 backdrop-blur-sm">
                  💼 Enterprise Ready
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start px-4 sm:px-0">
                <Link
                  href="https://transindomu.com/production/contact"
                  className="px-10 py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/40 active:scale-95 transition-all text-center"
                >
                  Pelajari Sekarang
                </Link>
                <a
                  href="/book"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-10 py-4 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                >
                  ▶ Watch Video
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Elegant Transition Bridge */}
      <div className="section-bridge"></div>

      {/* ================= PRODUCT FEATURES SECTIONS ================= */}
      <section className="space-y-32 py-20 bg-white">
        {[
          {
            title: "HR Payroll System",
            desc: "Membantu anda dalam pengelolaan system HR dan Payroll bulanan dengan lebih akurat.",
            img: "/assets/img/boiler_iot.png",
          },
          {
            title: "SHEE Safety System",
            desc: "Mempermudah pengelolaan data safety, Workpermit Paperless, dan historical safety asset control.",
            img: "/assets/img/power_iot.png",
          },
          {
            title: "Warehouse Management System",
            desc: "Stock Opname System, FIFO Management, dan Disposal Activity yang customize sesuai kebutuhan anda.",
            img: "/assets/img/sensor_iot.png",
          },
          {
            title: "Production Management System",
            desc: "Mempermudah pekerjaan daily report produksi dan planning produksi PPIC yang akurat dan efisien.",
            img: "/assets/img/abnormality_iot.png",
          },
        ].map((item, index) => (
          <div key={index} className="container mx-auto px-6">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
              <div className={`flex justify-center ${index % 2 !== 0 ? 'lg:order-2' : ''}`}>
                <Image
                  src={item.img}
                  alt={item.title}
                  width={480}
                  height={380}
                  className="rounded-3xl shadow-2xl touch-card border border-slate-100 w-full max-w-[480px] h-auto"
                />
              </div>
              <div className="space-y-6 text-center lg:text-left">
                <h3 className="text-3xl font-bold text-gray-900 leading-tight">{item.title}</h3>
                <p className="text-gray-600 text-lg italic leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ================= WHY US / ADVANTAGES ================= */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h3 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Keuntungan menggunakan <span className="text-blue-600">ERP TERIOT Digital System</span>
            </h3>
            <ul className="space-y-4">
              {[
                { n: "01", t: "Easy Customize", d: "Sistem end-to-end yang dapat disesuaikan dengan kebutuhan departemen Anda." },
                { n: "02", t: "Layanan Support 24 Jam", d: "Dukungan teknis siap sedia untuk menjaga stabilitas operasional bisnis Anda." },
                { n: "03", t: "Affordable & Transparan", d: "Solusi enterprise modern dengan biaya yang terukur dan efisien." }
              ].map((adv, i) => (
                <li key={i} className="group p-6 rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all">
                  <div className="flex gap-4">
                    <span className="text-blue-600 font-bold text-xl">{adv.n}</span>
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600">{adv.t}</h4>
                      <p className="text-gray-600 text-sm mt-1">{adv.d}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
              <Image 
                src="/assets/img/iot1-transformed.png" 
                alt="Benefit ERP" 
                fill
                style={{ objectFit: "cover" }}
                className="hover:scale-110 transition-transform duration-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= ARCHITECTURE / OVERVIEW ================= */}
      <section className="py-24 bg-white text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12">OVERVIEW & ARSITEKTUR</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Image src="/assets/img/arsitektur_iot.png" alt="Arsitektur" width={600} height={400} className="rounded-2xl shadow-lg mx-auto w-full h-auto" />
            <Image src="/assets/img/overview2_iot.png" alt="Overview" width={600} height={400} className="rounded-2xl shadow-lg mx-auto w-full h-auto" />
          </div>
        </div>
      </section>

      {/* ======= CTA Section ======= */}
      <section
        id="cta"
        className="relative py-24 flex items-center justify-center text-white"
        style={{ backgroundImage: "url('/assets/img/cta-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-blue-950/80 z-0"></div>
        <div className="container relative z-10 px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Trial Demo ERP</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Coba gratis sekarang dan rasakan kemudahan pengelolaan bisnis secara digital bersama TERIOT.
          </p>
          <Link
            href="https://transindomu.com/production/contact"
            className="inline-block px-10 py-4 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-transform active:scale-95 shadow-xl"
          >
            Coba Demo Sekarang!
          </Link>
        </div>
      </section>
    </main>
  );
}