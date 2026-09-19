"use client";
import React, { useState } from "react";

export default function ClientsAndPortfolio() {
  const [filter, setFilter] = useState("all");

  const filters = [
    { key: "all", label: "Semua" },
    { key: "technical", label: "Technical" },
    { key: "programming", label: "Programming" },
    { key: "installation", label: "Installation" },
  ];

  const portfolios = [
    { img: "portfolioapp-1.jpeg", title: "Technical", desc: "Pemasangan Sensor Pressure", type: "technical" },
    { img: "kbi6.jpg", title: "Technical", desc: "Technical Activity", type: "technical" },
    { img: "kbi7.jpg", title: "Technical", desc: "Technical Activity", type: "technical" },
    { img: "kbi8.jpg", title: "Technical", desc: "Technical Activity", type: "technical" },
    { img: "kbi9.jpg", title: "Technical", desc: "Technical Activity", type: "technical" },
    { img: "portfolioapp-2.jpg", title: "Technical", desc: "Kalibrasi Sensor", type: "technical" },
    { img: "portfolioapp-3.jpeg", title: "Technical", desc: "Technical App", type: "technical" },
    { img: "portfoliocard-1.jpeg", title: "Programming", desc: "Programming Card", type: "programming" },
    { img: "portfoliocard-2.jpeg", title: "Programming", desc: "Setting Program", type: "programming" },
    { img: "portfoliocard-3.jpeg", title: "Programming", desc: "Write Program", type: "programming" },
    { img: "kbi1.jpg", title: "Programming", desc: "Configuration Program", type: "programming" },
    { img: "kbi2.jpg", title: "Installation", desc: "Process Installation Machine IoT", type: "installation" },
    { img: "kbi3.jpg", title: "Installation", desc: "Process Installation Machine IoT", type: "installation" },
    { img: "kbi4.jpeg", title: "Installation", desc: "Process Installation Machine IoT", type: "installation" },
    { img: "kbi5.jpg", title: "Installation", desc: "Process Installation Machine IoT", type: "installation" },
    { img: "portofolioweb-1.jpeg", title: "Installation", desc: "Master Controller", type: "installation" },
    { img: "portofolioweb-2.jpeg", title: "Installation", desc: "Installation Web", type: "installation" },
    { img: "portofolioweb-3.jpeg", title: "Installation", desc: "Controller Config", type: "installation" },
    
  ];

  return (
    <>
     

      {/* ======= PORTFOLIO ======= */}
      <section id="portfolio" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          {/* Title */}

          <div className="max-w-5xl mx-auto text-center mb-16">

  <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest mb-6">
    <i className="ri-image-line"></i>
    Project Gallery
  </span>

  <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6">
    Dokumentasi
    <span className="block text-blue-600">
      Implementasi Nyata di Lapangan
    </span>
  </h1>

  <p className="text-slate-600 text-lg max-w-3xl mx-auto">
    Dokumentasi aktivitas engineering, instalasi Industrial IoT,
    commissioning sistem, integrasi software, serta implementasi
    solusi digital yang telah berhasil diterapkan pada berbagai industri.
  </p>

</div>

<div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">

  <div className="bg-white rounded-[2rem] border border-slate-100 p-6 text-center shadow-sm">
    <div className="text-4xl font-black text-blue-600">12+</div>
    <div className="text-slate-600 text-sm">
      Perusahaan Terlayani
    </div>
  </div>

  <div className="bg-white rounded-[2rem] border border-slate-100 p-6 text-center shadow-sm">
    <div className="text-4xl font-black text-blue-600">60+</div>
    <div className="text-slate-600 text-sm">
      Logger Terpasang
    </div>
  </div>

  <div className="bg-white rounded-[2rem] border border-slate-100 p-6 text-center shadow-sm">
    <div className="text-4xl font-black text-blue-600">4+</div>
    <div className="text-slate-600 text-sm">
      Kawasan Industri
    </div>
  </div>

  <div className="bg-white rounded-[2rem] border border-slate-100 p-6 text-center shadow-sm">
    <div className="text-4xl font-black text-blue-600">24/7</div>
    <div className="text-slate-600 text-sm">
      Support Team
    </div>
  </div>

</div>

          {/* Filters */}
          <div className="flex justify-center gap-3 flex-wrap mb-14">

  {filters.map((f) => (
    <button
      key={f.key}
      onClick={() => setFilter(f.key)}
      className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300
      ${
        filter === f.key
          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
          : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
      }`}
    >
      {f.label}
    </button>
  ))}

</div>

          {/* Grid */}
         {/* Portfolio Grid */}
<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
  {portfolios
    .filter((p) => filter === "all" || p.type === filter)
    .map((item, i) => (
      <div
        key={i}
        className="group bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
      >
        <div className="relative overflow-hidden">

          <img
            src={`/assets/img/portfolio/${item.img}`}
            alt={item.desc}
            className="w-full h-72 object-cover transition duration-700 group-hover:scale-110"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>

          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 rounded-full bg-white/95 text-xs font-bold text-blue-600">
              {item.title}
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition duration-500">
            <div className="text-white font-semibold">
              Lihat Dokumentasi
            </div>
          </div>

        </div>

        <div className="p-6">

          <h3 className="font-bold text-lg text-slate-900 mb-2">
            {item.desc}
          </h3>

          <p className="text-slate-500 text-sm mb-4">
            Dokumentasi implementasi proyek dan aktivitas engineering TERIOT.
          </p>

          <div className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm">
            Detail Proyek
            <i className="ri-arrow-right-line"></i>
          </div>

        </div>
      </div>
    ))}
</div>
</div>
      </section>
    </>
  );
}
