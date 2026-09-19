import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      
<>
      {/* CSS HARDCODED - Aman untuk Server Component */}
      <style>{`
        @keyframes floating {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .hero-floating-anim {
          animation: floating 4s ease-in-out infinite;
        }
        .touch-card:active {
          transform: scale(0.98);
          transition: transform 0.1s;
        }
      `}</style>

      {/* ======= HERO SECTION ======= */}
      <section
        id="hero"
        className="relative min-h-[100svh] flex items-center bg-[#0f172a] py-16 lg:py-0 overflow-hidden"
      >
        {/* Background Glow */}
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            
            {/* 1. Hero Image: Tampil di atas pada smartphone */}
            <div className="w-full lg:w-1/2 order-1 lg:order-2">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/15 blur-[60px] rounded-full"></div>
                <img
                  src="/assets/img/service-center.png"
                  className="w-full h-auto max-w-[280px] sm:max-w-[350px] md:max-w-[450px] lg:max-w-full mx-auto hero-floating-anim relative z-10 drop-shadow-2xl"
                  alt="ERP Software Illustration"
                />
              </div>
            </div>

            {/* 2. Teks Content */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center text-center lg:text-left order-2 lg:order-1">
              <h1 className="text-[32px] sm:text-[40px] lg:text-6xl font-black leading-[1.15] tracking-tight text-white mb-6">
                IoT TERIOT <br className="hidden sm:block" />
                <span className="text-blue-400">Technology System</span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0 font-light">
                TERIOT membantu Anda melakukan{" "}
                <span className="font-semibold text-white">
                  monitoring parameter mesin
                </span>{" "}
                secara real-time untuk mempercepat{" "}
                <span className="font-semibold text-white">
                  pengambilan keputusan terbaik
                </span>
                , kapan pun dan di mana pun.
              </p> 


              {/* Tech Highlights */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 md:gap-3 mb-10">
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600/10 text-blue-100 text-[12px] sm:text-sm font-medium border border-blue-500/20 backdrop-blur-sm">
                  🤖 AI Analytics
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600/10 text-purple-100 text-[12px] sm:text-sm font-medium border border-purple-500/20 backdrop-blur-sm">
                  📡 IoT Connected
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-600/10 text-green-100 text-[12px] sm:text-sm font-medium border border-green-500/20 backdrop-blur-sm">
                  📊 Real-Time Data
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start px-2 sm:px-0">
                <Link
                  href="https://transindomu.com/production/contact"
                  className="px-10 py-4 rounded-full bg-blue-600 text-white font-bold shadow-[0_10px_20px_rgba(37,99,235,0.3)] hover:bg-blue-700 active:scale-95 transition-all text-center"
                >
                  Mulai Sekarang
                </Link>
                <Link
                  href="/book"
                  className="px-10 py-4 rounded-full border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 active:scale-95 transition-all text-center"
                >
                  Pelajari Fitur
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

{/* ================= TECH BRIDGE SEPARATOR ================= */}
<div className="relative h-40 bg-[#0f172a] overflow-hidden">
  {/* CSS Hardcoded untuk Animasi Aliran Kabel */}
  <style>{`
    @keyframes pulse-flow {
      0% { stroke-dashoffset: 100; opacity: 0.3; }
      50% { opacity: 1; }
      100% { stroke-dashoffset: 0; opacity: 0.3; }
    }
    .circuit-line {
      stroke-dasharray: 20;
      animation: pulse-flow 3s linear infinite;
    }
  `}</style>

  {/* Background Gradient Transition */}
  <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-slate-50"></div>

  {/* Jalur Kabel Teknologi (SVG) */}
  <svg 
    className="absolute inset-0 w-full h-full" 
    preserveAspectRatio="none" 
    viewBox="0 0 1200 120" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Jalur 1 */}
    <path 
      d="M0 20H400L450 70H750L800 20H1200" 
      stroke="url(#neon-blue)" 
      strokeWidth="2" 
      className="circuit-line"
    />
    {/* Jalur 2 */}
    <path 
      d="M0 100H350L420 40H780L850 100H1200" 
      stroke="url(#neon-purple)" 
      strokeWidth="1.5" 
      className="circuit-line" 
      style={{ animationDelay: '-1.5s' }}
    />
    
    {/* Definisi Warna Neon */}
    <defs>
      <linearGradient id="neon-blue" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
        <stop offset="50%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="neon-purple" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
        <stop offset="50%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>

  {/* Titik Koneksi (Node) */}
  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full blur-sm animate-pulse"></div>
</div>

      {/* ================= PRODUCT SECTION 1 ================= */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Card 1 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 touch-card">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
                Running Hour & Lifetime Part
              </h3>
              <p className="text-slate-600 mb-6 text-sm md:text-base leading-relaxed">
                Estimasi lifetime dan running hour mesin untuk alokasi budget maintenance yang lebih akurat dan terencana.
              </p>
              <div className="relative overflow-hidden rounded-xl bg-slate-100">
                <Image
                  src="/assets/img/boiler_iot.png"
                  alt="Boiler IoT"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 touch-card">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
                Power Usage Record
              </h3>
              <p className="text-slate-600 mb-6 text-sm md:text-base leading-relaxed">
                Menampilkan penggunaan daya energi harian yang terkalkulasi otomatis untuk efisiensi biaya bulanan perusahaan.
              </p>
              <div className="relative overflow-hidden rounded-xl bg-slate-100">
                <Image
                  src="/assets/img/power_iot.png"
                  alt="Power Usage"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

          </div>
        </div>
      </section>
    </>

      {/* ================= PRODUCT SECTION 2 ================= */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

            <div>
              <h3 className="text-2xl font-semibold mb-4">
                Sensor Real-Time Monitoring
              </h3>
              <p className="text-gray-600 mb-6 italic">
                Parameter proses mesin dapat termonitor dimanapun dan kapanpun. membantu anda dalam melihat kondisi proses secara realtime.
              </p>
              <Image
                src="/assets/img/sensor_iot.png"
                alt="Sensor IoT"
                width={500}
                height={350}
                className="rounded-xl shadow"
              />
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-4">
                Early Alert Abnormality
              </h3>
              <p className="text-gray-600 mb-6 italic">
                Memberikan informasi ketidaksesuaian proses secara cepat dan aktual langsung melalui aplikasi anda selama 24-Jam
              </p>
              <Image
                src="/assets/img/abnormality_iot.png"
                alt="Abnormality"
                width={500}
                height={350}
                className="rounded-xl shadow"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ================= WHY US ================= */}
        <section className="py-20 bg-white overflow-hidden">
          <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* TEXT */}
        <div className="space-y-8">

          {/* TITLE */}
          <h3 className="text-3xl lg:text-4xl font-bold leading-snug text-gray-900">
            Keuntungan menggunakan{" "}
            <span className="text-blue-600">
              IoT TERIOT Technology System
            </span>
          </h3>

          {/* INTRO */}
          <p className="text-gray-600 text-lg leading-relaxed max-w-xl">
            Teknologi di era industri 4.0 membantu anda mengambil keputusan
            secara <span className="font-semibold text-gray-800">lebih cepat dan tepat</span>.
            TERIOT hadir sebagai partner terbaik untuk meningkatkan
            <span className="font-semibold text-gray-800"> efisiensi dan efektivitas</span>
            proses industri anda.
          </p>

          {/* LIST */}
          <ul className="space-y-6">

            {/* ITEM 1 */}
            <li className="group p-6 rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-4">
                <span className="text-blue-600 text-xl font-bold">01</span>
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                    Easy Customize sesuai kebutuhan industri Anda
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    TERIOT dibangun dengan sistem end-to-end terintegrasi dan dapat
                    disesuaikan dengan kebutuhan proses serta industri sesuai
                    kepentingan customer.
                  </p>
                </div>
              </div>
            </li>

            {/* ITEM 2 */}
            <li className="group p-6 rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-4">
                <span className="text-blue-600 text-xl font-bold">02</span>
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                    Layanan Support 24 Jam
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    Kami memberikan layanan support 24 jam kepada customer,
                    karena kepuasan pelanggan adalah prioritas utama kami.
                  </p>
                </div>
              </div>
            </li>

            {/* ITEM 3 */}
            <li className="group p-6 rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-4">
                <span className="text-blue-600 text-xl font-bold">03</span>
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                    Affordable & Transparan sesuai kebutuhan Anda
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    Tidak perlu mahal untuk menerapkan teknologi IoT 4.0.
                    Kami menghadirkan solusi low cost dengan kualitas terbaik
                    serta biaya yang transparan sejak awal.
                  </p>
                </div>
              </div>
            </li>

          </ul>
        </div>


          {/* 3D IMAGE */}
          <div className="relative flex justify-center perspective-[1200px]">
            
            {/* Glow layer */}
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-3xl scale-110" />

            {/* Card */}
            <div
              className="
                relative
                w-full
                max-w-md
                min-h-[420px]
                rounded-3xl
                bg-cover
                bg-center
                shadow-[0_40px_80px_rgba(0,0,0,0.25)]
                transform
                transition-all
                duration-700
                hover:rotate-y-[-12deg]
                hover:rotate-x-[6deg]
                hover:scale-105
              "
              style={{
                backgroundImage: "url('/assets/img/iot1-transformed.png')",
                transformStyle: "preserve-3d",
              }}
            >
              {/* highlight */}
              <div
                className="
                  absolute
                  inset-0
                  rounded-3xl
                  bg-gradient-to-tr
                  from-white/10
                  via-transparent
                  to-transparent
                  pointer-events-none
                "
              />
            </div>
          </div>

        </div>
      </section>


{/* ================= SERVICES / OVERVIEW SECTION ================= */}
<section
  id="services"
  className="py-20 bg-gray-50"
>
  <div className="container mx-auto px-6">

    {/* TITLE */}
    <div className="text-center max-w-3xl mx-auto mb-14">
      <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
        OVERVIEW DAN ARSITEKTUR
      </h2>
      <p className="text-gray-600 leading-relaxed">
        Tampilan Aplikasi IoT Teriot Technology System dapat dibuka melalui PC,
        Laptop, Handphone atau Tablet, dengan arsitektur yang sederhana namun
        memiliki keunggulan fungsi yang tinggi.
      </p>
    </div>

    {/* CONTENT */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

      <div className="flex justify-center">
        <Image
          src="/assets/img/arsitektur_iot.png"
          alt="Arsitektur IoT"
          width={600}
          height={400}
          className="rounded-2xl shadow-lg hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="flex justify-center">
        <Image
          src="/assets/img/overview2_iot.png"
          alt="Overview IoT"
          width={600}
          height={400}
          className="rounded-2xl shadow-lg hover:scale-105 transition-transform duration-300"
        />
      </div>

    </div>
  </div>
</section>

 {/* ======= WHY US SECTION ======= */}
<section id="why-us" className="why-us bg-light py-5">
  <div className="container">
    <div className="row g-0 bg-white shadow-sm rounded overflow-hidden">
      <div className="col-lg-7 d-flex flex-column justify-content-center align-items-stretch order-2 order-lg-1 p-5">
        <div className="content mb-4">
          <h3>Semua akan <strong>TERHUBUNG</strong></h3>
          <p className="text-muted">
            IoT terintegrasi mempermudah monitoring dari hulu hingga hilir proses produksi.
          </p>
        </div>

        <div className="accordion" id="whyUsAccordion">
          {/* Static Item 1 (No longer collapses) */}
          <div className="border-0 mb-3 shadow-sm rounded bg-white">
            <div className="p-3 border-bottom">
              <h2 className="h6 mb-0 fw-bold d-flex align-items-center" style={{ color: "#37517e" }}>
                <span className="me-3 text-primary">01</span> Machine to Machine
              </h2>
            </div>
            <div className="p-3">
              <div className="text-muted">
                Tidak ada lagi mesin yang Standalone, <strong>semua terkoneksi!</strong>{" "}
                Teriot Device akan membuat mesin mesin produksi terintegrasi secara digital dan menyeluruh.
              </div>
            </div>
          </div>

                  {/* Static Item 2 */}
          <div className="border-0 mb-3 shadow-sm rounded bg-white">
            <div className="p-3 border-bottom">
              <h2 className="h6 mb-0 fw-bold d-flex align-items-center" style={{ color: "#37517e" }}>
                <span className="me-3 text-primary">02</span> Machine to Human
              </h2>
            </div>
            <div className="p-3">
              <div className="text-muted">
                Quick Decision dalam pengambilan keputusan dengan data yang akurat dan presisi. mengurangi  
                <strong> potensial reject product!</strong> dan estimasi produksi lebih baik.
              </div>
            </div>
          </div>

          {/* Static Item 3 */}
          <div className="border-0 mb-3 shadow-sm rounded bg-white">
            <div className="p-3 border-bottom">
              <h2 className="h6 mb-0 fw-bold d-flex align-items-center" style={{ color: "#37517e" }}>
                <span className="me-3 text-primary">03</span> Human to Machine
              </h2>
            </div>
            <div className="p-3">
              <div className="text-muted">
                Perencanaan produksi yang terintegrasi dengan ERP akan terhubung langsung dengan 
                Mesin secara otomatis dan terjadwal. efisiensi produksi dan waktu dalam 
                menghasilkan produk yang berkualitas.
              </div>
            </div>
          </div>

        </div>
      </div>

      <div
        className="col-lg-5 order-1 order-lg-2"
        style={{
          backgroundImage: "url('/assets/img/why-us.png')",
          backgroundSize: "contain", // Changed to contain to see full illustration
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          minHeight: "400px",
        }}
      />
    </div>
  </div>
</section>


      {/* ======= CTA Section ======= */}
<section
  id="cta"
  className="cta"
  style={{
    position: "relative",
    minHeight: "420px", // 🔥 UBAH TINGGI DI SINI
    display: "flex",
    alignItems: "center",
    backgroundImage: "url('/assets/img/cta-bg.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: "#f2eff7",
  }}
>
  {/* Overlay */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "rgba(9, 7, 37, 0.65)",
      zIndex: 1,
    }}
  />

  {/* Content */}
  <div className="container position-relative" style={{ zIndex: 2 }}>
    <div className="row align-items-center">
      <div className="col-lg-9 text-center text-lg-start">
        <h2 className="fw-bold mb-3">Trial Demo</h2>
        <p className="mb-0 fs-5">
          Coba gratis untuk melihat IoT TERIOT Technology Sistem secara langsung.
          Rasakan pengalaman teknologi masa kini sekarang.
        </p>
      </div>

      <div className="col-lg-3 text-center mt-4 mt-lg-0">
        <Link
          href="https://transindomu.com/production/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-light btn-lg px-4"
        >
          <strong>Coba IoT Sekarang!</strong>
        </Link>
      </div>
    </div>
  </div>
</section>

    </main>
  );
}
