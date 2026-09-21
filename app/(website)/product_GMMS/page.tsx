import Image from "next/image";
import Link from "next/link";

export default function MaintenanceSmartSystem() {
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
                  src="/assets/img/iot2_png-transformed.png"
                  alt="IoT Illustration"
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
                Maintenance <br className="hidden sm:block" />
                <span className="text-blue-400">SMART System</span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0 font-light px-2">
                Partner aplikasi powerful untuk membantu Anda melakukan{" "}
                <span className="font-semibold text-blue-300">Pengelolaan Sistem Maintenance</span>, 
                perancangan biaya, dan <span className="font-semibold text-white">Pengaturan Jadwal Otomatis</span>.
              </p> 

              {/* Tech Highlights */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-12">
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600/10 text-blue-100 text-[12px] sm:text-sm font-medium border border-blue-500/20 backdrop-blur-sm">
                  🧠 AI Prediction
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600/10 text-purple-100 text-[12px] sm:text-sm font-medium border border-purple-500/20 backdrop-blur-sm">
                  🎯 Reduce Downtime
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-600/10 text-green-100 text-[12px] sm:text-sm font-medium border border-green-500/20 backdrop-blur-sm">
                  💲 Cost Estimator
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
                  href="https://www.youtube.com/watch?v=vnzrsysjYZ4"
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
            title: "Time Based Maintenance (TPM)",
            desc: "Estimasi lifetime dan running hour mesin untuk alokasi budget maintenance yang lebih akurat.",
            img: "/assets/img/tbm_database.png",
          },
          {
            title: "Sparepart Control (RTU)",
            desc: "Pencatatan otomatis untuk sistem In-Out Ready to use Sparepart untuk quick action dalam mengatasi downtime machine.",
            img: "/assets/img/RTU_log.png",
          },
          {
            title: "Automatic Schedulling PM & CM",
            desc: "IoT akan merecord performance Machine dan melakukan estimasi pekerjaan secara berkala dengan auto schedulling harian hingga tahunan.",
            img: "/assets/img/automatic_job.png",
          },
          {
            title: "Maintenance Cost Estimation",
            desc: "Prediksi frekuensi kinerja mesin sehingga Cost Maintenance terencana dengan baik, mengurangi kerugian operasional.",
            img: "/assets/img/overview_mcn.png",
          },
        ].map((item, index) => (
          <div key={index} className="container mx-auto px-6">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
              <div className={`flex justify-center ${index % 2 !== 0 ? 'lg:order-2' : ''}`}>
                <Image
                  src={item.img}
                  alt={item.title}
                  width={500}
                  height={380}
                  className="rounded-3xl shadow-2xl touch-card border border-slate-100 w-full max-w-[500px] h-auto"
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
              Keuntungan menggunakan <span className="text-blue-600">IoT TERIOT System</span>
            </h3>
            <ul className="space-y-4">
              {[
                { n: "01", t: "Easy Customize", d: "Sistem end-to-end yang dapat disesuaikan dengan kebutuhan industri Anda." },
                { n: "02", t: "Layanan Support 24 Jam", d: "Kepuasan pelanggan adalah prioritas utama dengan dukungan teknis nonstop." },
                { n: "03", t: "Affordable & Transparan", d: "Solusi IoT 4.0 berkualitas tinggi dengan biaya kompetitif dan transparan." }
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
                alt="Benefit IoT" 
                fill
                style={{ objectFit: "cover" }}
                className="hover:scale-110 transition-transform duration-700"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= ARCHITECTURE SECTION ================= */}
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
          <h2 className="text-4xl font-bold mb-6">Trial Demo</h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Coba gratis untuk melihat IoT TERIOT Technology Sistem secara langsung. Rasakan pengalaman teknologi masa kini.
          </p>
          <Link
            href="https://transindomu.com/production/contact"
            className="inline-block px-10 py-4 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-transform active:scale-95 shadow-xl"
          >
            Coba IoT Sekarang!
          </Link>
        </div>
      </section>
    </main>
  );
}