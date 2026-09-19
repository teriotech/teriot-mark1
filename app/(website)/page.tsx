"use client";

import React from "react";
import Link from "next/link";
import { useRef } from "react";

export default function HomePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

const toggleFullScreen = () => {
  const iframe = iframeRef.current;
  if (!iframe) return;

  if (iframe.requestFullscreen) {
    iframe.requestFullscreen();
  }
};
  return (
    <>
    {/* ======= HERO SECTION ======= */}
      <section
        id="hero"
        className="relative min-h-[100svh] flex items-center bg-[#0f172a] py-16 lg:py-0 overflow-hidden"
      >
        {/* Background Glow - Memberi kesan premium di layar HP */}
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            
            {/* 1. Hero Image: Ukuran dioptimalkan agar tidak memenuhi layar HP */}
            <div className="w-full lg:w-1/2 order-1 lg:order-2">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/15 blur-[60px] rounded-full"></div>
                <img
                  src="/assets/img/hero-img.png"
                  className="w-full h-auto max-w-[280px] sm:max-w-[350px] md:max-w-[450px] lg:max-w-full mx-auto hero-floating-anim relative z-10 drop-shadow-2xl"
                  alt="ERP Software Illustration"
                />
              </div>
            </div>

            {/* 2. Teks Content: Penyesuaian Line-height dan Font-size */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center text-center lg:text-left order-2 lg:order-1">
              <h1 className="text-[30px] sm:text-[40px] lg:text-6xl font-black leading-[1.15] tracking-tight text-white mb-6">
                Industrial IoT <br className="hidden sm:block" />
                & Smart Factory Solutions <span className="text-blue-400">Terbaik di Indonesia</span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0 font-light">
                Kami menyediakan layanan aplikasi untuk meningkatkan <span className="text-white font-medium">produktivitas perusahaan di berbagai sektor</span> dengan teknologi yang up-to-date 
              <span className="text-white font-medium"> dan terintegritas</span>, kapanpun dan dimanapun. 
              </p>

              {/* Tech Highlights: Horizontal scrollable di HP jika terlalu panjang */}

              <div className="flex flex-wrap justify-center lg:justify-start gap-2 md:gap-3 mb-8">

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/15 text-blue-100 text-[11px] md:text-sm font-medium border border-blue-500/20">

                  ☁️ Cloud ERP

                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600/15 text-purple-100 text-[11px] md:text-sm font-medium border border-purple-500/20">

                  📡 IoT Connected

                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-600/15 text-green-100 text-[11px] md:text-sm font-medium border border-green-500/20">

                  🤖 AI Chatbot

                </div>

              </div>

              {/* Buttons: Lebih besar di Mobile agar mudah ditekan jari (Touch-friendly) */}
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

        <style jsx>{`
          .hero-floating-anim {
            animation: floating 4s ease-in-out infinite;
          }
          @keyframes floating {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
        `}</style>
      </section>

      {/* ======= PRODUCT SECTION ======= */}
<section id="products" className="py-16 md:py-24 bg-slate-50 overflow-hidden">
  <div className="container mx-auto px-5 md:px-6">
    
    {/* Header Section: Optimasi ukuran teks untuk mobile */}
    <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
      <h2 className="text-blue-600 font-bold tracking-[0.15em] uppercase text-[11px] md:text-sm mb-3">
        Solusi Digital Kami
      </h2>
      <h3 className="text-[26px] md:text-4xl font-extrabold text-slate-900 mb-5 leading-tight">
        Produk Unggulan untuk Transformasi Industri
      </h3>
      <p className="text-slate-600 text-sm md:text-lg leading-relaxed px-2 md:px-0">
        Konsultasikan permasalahan Anda dengan solusi Digital Application yang 
        <span className="font-semibold text-slate-900"> SMART</span>. Pilih produk sesuai kebutuhan Anda dengan kustomisasi tanpa batas.
      </p>
    </div>

    {/* Product Grid: Jarak gap disesuaikan */}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
      
      {/* Product 1: IoT */}
      <div className="group bg-white p-7 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] md:hover:scale-[1.02] md:hover:shadow-2xl transition-all duration-300">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:bg-blue-600 transition-colors">
          <i className="ri-router-line text-2xl md:text-3xl text-blue-600 group-hover:text-white"></i>
        </div>
        <h4 className="text-lg md:text-xl font-bold text-slate-900 mb-3">Industrial IoT (IIoT)</h4>
        <p className="text-slate-600 text-[13px] md:text-base leading-relaxed mb-6">
          Pengambilan parameter data mesin secara real-time ke cloud untuk mempermudah analisis data historis dan prediksi maintenance.
        </p>
        <div className="space-y-2.5 mb-8">
          <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
            <i className="ri-checkbox-circle-fill text-green-500 text-base"></i> Real-time Monitoring
          </div>
          <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
            <i className="ri-checkbox-circle-fill text-green-500 text-base"></i> OEE Dashboard
          </div>
          <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
            <i className="ri-checkbox-circle-fill text-green-500 text-base"></i> GMES Dashboard
          </div>
        </div>
        <Link href="/product_GMES" className="text-blue-600 text-sm md:text-base font-bold inline-flex items-center gap-2 py-2">
          Selengkapnya <i className="ri-arrow-right-line"></i>
        </Link>
      </div>

      {/* Product 2: ERP Enterprise */}
<div className="group bg-white p-7 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] md:hover:scale-[1.02] md:hover:shadow-xl transition-all duration-300">
  <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:bg-blue-600 transition-colors">
    <i className="ri-database-2-line text-2xl md:text-3xl text-blue-600 group-hover:text-white"></i>
  </div>

  <h4 className="text-lg md:text-xl font-bold text-slate-900 mb-3">
    ERP Enterprise
  </h4>

  <p className="text-slate-600 text-[13px] md:text-base leading-relaxed mb-6">
    Sistem manajemen terpadu mulai dari HR Payroll, Production, Warehouse,
    Purchasing, Accounting, hingga SHEE Work Permit dalam satu ekosistem digital.
  </p>

  <div className="space-y-2.5 mb-8">
    <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
      <i className="ri-checkbox-circle-fill text-green-500 text-base"></i>
      Integrated Modules
    </div>

    <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
      <i className="ri-checkbox-circle-fill text-green-500 text-base"></i>
      Warehouse & Inventory
    </div>

    <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
      <i className="ri-checkbox-circle-fill text-green-500 text-base"></i>
      SHEE Management
    </div>

    <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
      <i className="ri-checkbox-circle-fill text-green-500 text-base"></i>
      Accounting & Purchasing
    </div>
  </div>

  <Link
    href="/product_GERP"
    className="text-blue-600 text-sm md:text-base font-bold inline-flex items-center gap-2 py-2"
  >
    Selengkapnya
    <i className="ri-arrow-right-line"></i>
  </Link>
</div>

      {/* Product 3: Maintenance */}
      <div className="group bg-white p-7 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] md:hover:scale-[1.02] transition-all duration-300">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:bg-blue-600 transition-colors">
          <i className="ri-settings-5-line text-2xl md:text-3xl text-blue-600 group-hover:text-white"></i>
        </div>
        <h4 className="text-lg md:text-xl font-bold text-slate-900 mb-3">Maintenance Management</h4>
        <p className="text-slate-600 text-[13px] md:text-base leading-relaxed mb-6">
          Kelola jadwal perawatan mesin dan inventaris sparepart secara sistematis untuk mencegah downtime produksi.
        </p>
        <div className="space-y-2.5 mb-8">
          <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
            <i className="ri-checkbox-circle-fill text-green-500 text-base"></i> Predictive Maintenance (TPM)
          </div>
          <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
            <i className="ri-checkbox-circle-fill text-green-500 text-base"></i> Sparepart Control
          </div>
          <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
            <i className="ri-checkbox-circle-fill text-green-500 text-base"></i> Auto-Schedulling Manpower
          </div>
        </div>
        <Link href="/product_GMMS" className="text-blue-600 text-sm md:text-base font-bold inline-flex items-center gap-2 py-2">
          Selengkapnya <i className="ri-arrow-right-line"></i>
        </Link>
      </div>

{/* Product 4: RPA */}
<div className="group bg-white p-7 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] md:hover:scale-[1.02] transition-all duration-300">
  <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:bg-blue-600 transition-colors">
    <i className="ri-robot-2-line text-2xl md:text-3xl text-blue-600 group-hover:text-white"></i>
  </div>

  <h4 className="text-lg md:text-xl font-bold text-slate-900 mb-3">
    Robotic Process Automation
  </h4>

  <p className="text-slate-600 text-[13px] md:text-base leading-relaxed mb-6">
    Otomatiskan proses bisnis yang berulang seperti input data, pembuatan laporan,
    sinkronisasi sistem, dan workflow approval untuk meningkatkan efisiensi operasional.
  </p>

  <div className="space-y-2.5 mb-8">
    <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
      <i className="ri-checkbox-circle-fill text-green-500 text-base"></i>
      Automated Data Entry
    </div>

    <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
      <i className="ri-checkbox-circle-fill text-green-500 text-base"></i>
      Report Generation Bot
    </div>

    <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
      <i className="ri-checkbox-circle-fill text-green-500 text-base"></i>
      ERP & Legacy Integration
    </div>

    <div className="flex items-center gap-2 text-[13px] md:text-sm text-slate-500">
      <i className="ri-checkbox-circle-fill text-green-500 text-base"></i>
      Workflow Automation
    </div>
  </div>

  <Link
    href="/product_RPA"
    className="text-blue-600 text-sm md:text-base font-bold inline-flex items-center gap-2 py-2"
  >
    Selengkapnya
    <i className="ri-arrow-right-line"></i>
  </Link>
</div>

    </div>
  </div>
</section>

{/* ======= HOW IT WORKS SECTION ======= */}
<section id="how-it-works" className="py-16 md:py-24 bg-white overflow-hidden">
  <div className="container mx-auto px-5 md:px-6">

    {/* Header */}
    <div className="max-w-4xl mx-auto text-center mb-14 md:mb-20">
      <span className="inline-flex items-center px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs md:text-sm font-bold tracking-widest uppercase mb-6">
        Bagaimana Industrial IOT Bekerja?
      </span>

      <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
        Dari{" "}
        <span className="text-blue-600">
          Sensor ke keputusan Cerdas
        </span>{" "}
        dalam 5 Langkah
      </h2>

      <p className="text-slate-600 text-sm md:text-lg leading-relaxed max-w-3xl mx-auto">
        Arsitektur sederhana dengan implementasi cepat.
        Kami menangani setup dan integrasi, Anda cukup menikmati
        data real-time untuk pengambilan keputusan yang lebih baik.
      </p>
    </div>

    {/* Timeline Line */}
    <div className="hidden xl:block relative">
      <div className="absolute top-[72px] left-0 right-0 h-[2px] bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100"></div>
    </div>

    {/* Steps */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 md:gap-8 relative">

      {/* STEP 1 */}
      <div className="group relative bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

        <div className="text-5xl font-extrabold text-blue-600/20 mb-4">
          01
        </div>

        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
          <i className="ri-cpu-line text-3xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-3">
          Sensor & Device
        </h3>

        <p className="text-slate-600 leading-relaxed">
          Pasang sensor wireless di panel listrik, mesin, atau aset
          produksi tanpa mengganggu operasional.
        </p>
      </div>

      {/* STEP 2 */}
      <div className="group relative bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

        <div className="text-5xl font-extrabold text-blue-600/20 mb-4">
          02
        </div>

        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
          <i className="ri-router-line text-3xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-3">
          Gateway IoT
        </h3>

        <p className="text-slate-600 leading-relaxed">
          Data dikirim melalui jaringan WiFi, 4G, atau LAN ke gateway
          lokal yang aman dan terenkripsi.
        </p>
      </div>

      {/* STEP 3 */}
      <div className="group relative bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

        <div className="text-5xl font-extrabold text-blue-600/20 mb-4">
          03
        </div>

        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
          <i className="ri-server-line text-3xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-3">
          Cloud Platform
        </h3>

        <p className="text-slate-600 leading-relaxed">
          Data diproses, disimpan, dan diolah menjadi informasi yang
          siap digunakan oleh tim operasional.
        </p>
      </div>

      {/* STEP 4 */}
      <div className="group relative bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

        <div className="text-5xl font-extrabold text-blue-600/20 mb-4">
          04
        </div>

        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
          <i className="ri-line-chart-line text-3xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-3">
          Dashboard & Alert
        </h3>

        <p className="text-slate-600 leading-relaxed">
          Pantau performa melalui dashboard real-time dan dapatkan
          notifikasi otomatis saat terjadi anomali.
        </p>
      </div>

        {/* STEP 5 */}
        <div className="group relative bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

          <div className="text-5xl font-extrabold text-blue-600/20 mb-4">
            05
          </div>

          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
            <i className="ri-ai-generate text-3xl text-blue-600 group-hover:text-white"></i>
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-3">
            AI Assistant & Summary
          </h3>

          <p className="text-slate-600 leading-relaxed">
            AI menganalisis data operasional secara otomatis, menyajikan ringkasan
            performa harian, menjelaskan penyebab anomali, serta menjawab pertanyaan
            Anda dalam bahasa yang mudah dipahami.
          </p>

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

    {/* Header */}
    <div className="max-w-4xl mx-auto text-center mb-16">
      <span className="inline-flex items-center px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs md:text-sm font-bold tracking-widest uppercase mb-6">
        AI Industrial Assistant
      </span>

      <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
        Data Mesin Kini Bisa{" "}
        <span className="text-blue-600">
          Diajak Berdiskusi
        </span>
      </h2>

      <p className="text-slate-600 text-sm md:text-lg max-w-3xl mx-auto leading-relaxed">
        Tidak perlu membuka dashboard yang kompleks.
        Cukup tanyakan kondisi produksi, performa mesin,
        atau anomali operasional dan AI Assistant TERIOT
        akan memberikan ringkasan dalam bahasa yang mudah dipahami.
      </p>
    </div>

    <div className="grid lg:grid-cols-2 gap-12 items-center">

      {/* Dashboard */}
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full"></div>

        <img
          src="/assets/img/oee_dash.png"
          alt="OEE Dashboard"
          className="relative w-full rounded-[2rem] border border-slate-200 shadow-2xl"
        />
      </div>

      {/* Phone Chat */}
      <div className="flex justify-center">

        <div className="ai-phone relative w-[340px] h-[650px] bg-slate-900 rounded-[3rem] p-3 shadow-2xl">

          {/* Notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full"></div>

          <div className="h-full bg-slate-50 rounded-[2.5rem] overflow-hidden">

            {/* Header */}
            <div className="bg-blue-600 text-white px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <i className="ri-robot-2-line text-xl"></i>
              </div>

              <div>
                <div className="font-bold">
                  TeriotBot AI
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-100">
                    <span className="ai-online"></span>
                    Online
                  </div>
              </div>
            </div>

            <div className="chat-window p-4 space-y-4">

              {/* User */}
              <div className="chat-msg user-1 flex justify-end">
                <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl max-w-[80%]">
                  Halo TeriotBot!
                </div>
              </div>

              {/* Bot */}
              <div className="chat-msg bot-1 flex justify-start">
                <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl max-w-[80%] shadow-sm">
                  Halo Bapak Joni 👋, ada yang bisa saya bantu?
                </div>
              </div>

              {/* User */}
              <div className="chat-msg user-2 flex justify-end">
                <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl max-w-[85%]">
                  Sampaikan laporan produksi Mesin A dan analisa dalam satu bulan.
                </div>
              </div>

              {/* Bot Summary */}
              <div className="chat-msg bot-summary flex justify-start">
                <div className="bg-white border border-slate-200 px-4 py-4 rounded-2xl shadow-sm max-w-[95%]">

                  <div className="font-semibold text-slate-900 mb-3">
                    📊 Ringkasan Produksi Mesin A
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 mb-4">
                    <div>
                      Produksi Total:
                      <span className="font-semibold text-slate-900">
                        {" "}128.450 Unit
                      </span>
                    </div>

                    <div>
                      OEE Rata-rata:
                      <span className="font-semibold text-green-600">
                        {" "}87.4%
                      </span>
                    </div>

                    <div>
                      Downtime:
                      <span className="font-semibold text-orange-500">
                        {" "}4.8%
                      </span>
                    </div>
                  </div>

                  {/* Mini Dashboard */}
                  <div className="grid grid-cols-3 gap-2 mb-3">

                    <div className="bg-green-50 rounded-xl p-2 text-center">
                      <div className="text-xs text-slate-500">
                        Output
                      </div>
                      <div className="font-bold text-green-600">
                        +12%
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-2 text-center">
                      <div className="text-xs text-slate-500">
                        OEE
                      </div>
                      <div className="font-bold text-blue-600">
                        87%
                      </div>
                    </div>

                    <div className="bg-red-50 rounded-xl p-2 text-center">
                      <div className="text-xs text-slate-500">
                        Reject
                      </div>
                      <div className="font-bold text-red-600">
                        1.8%
                      </div>
                    </div>

                  </div>

                  <div className="text-sm text-slate-700 leading-relaxed">
                    Selama 30 hari terakhir, performa Mesin A meningkat
                    <span className="font-semibold text-green-600"> 12%</span>.
                    Penyebab utama downtime berasal dari proses changeover
                    pada minggu kedua. Disarankan melakukan optimasi setup
                    dan penjadwalan preventive maintenance.
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

{/* ======= INDUSTRIAL IOT CATALOG ======= */}
<section
  id="iiot-catalog"
  className="py-16 md:py-24 bg-white overflow-hidden"
>
  <div className="container mx-auto px-5 md:px-6">

    {/* Header */}
    <div className="max-w-4xl mx-auto text-center mb-12 md:mb-16">
      <span className="inline-flex items-center px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs md:text-sm font-bold tracking-widest uppercase mb-6">
        Industrial IoT Solution
      </span>

      <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
        Jelajahi Solusi{" "}
        <span className="text-blue-600">
          Industrial IoT TERIOT
        </span>
      </h2>

      <p className="text-slate-600 text-sm md:text-lg leading-relaxed max-w-3xl mx-auto">
        Pelajari berbagai solusi Industrial IoT mulai dari monitoring energi,
        OEE Dashboard, machine connectivity, predictive maintenance,
        hingga analitik berbasis AI untuk meningkatkan efisiensi operasional.
      </p>
    </div>

    {/* Viewer Card */}
    <div className="relative">

      {/* Blue Glow */}
      <div className="absolute -inset-4 bg-blue-500/5 blur-3xl rounded-[3rem]"></div>

      <div className="relative bg-white border border-slate-100 rounded-[2rem] shadow-xl overflow-hidden">

        {/* Iframe */}
        <div className="relative bg-slate-50">

          <iframe
            ref={iframeRef}
            src="https://online.pubhtml5.com/huvqf/tzez/"
            className="w-full h-[600px] md:h-[750px]"
            allowFullScreen
            loading="lazy"
            title="TERIOT Industrial IoT Catalog"
          />

        </div>

      </div>

    </div>

  </div>
</section>

{/* ======= ERP ENTERPRISE PLATFORM ======= */}
<section
  id="erp-platform"
  className="py-16 md:py-24 bg-slate-50 overflow-hidden"
>
  <div className="container mx-auto px-5 md:px-6">

    {/* Header */}
    <div className="max-w-4xl mx-auto text-center mb-14 md:mb-16">

      <span className="inline-flex items-center px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs md:text-sm font-bold tracking-widest uppercase mb-6">
        ERP Enterprise Platform
      </span>

      <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
        Satu Platform untuk Mengelola{" "}
        <span className="text-blue-600">
          Seluruh Operasional Perusahaan
        </span>
      </h2>

      <p className="text-slate-600 text-sm md:text-lg leading-relaxed max-w-3xl mx-auto">
        TERIOT ERP membantu perusahaan mengintegrasikan proses bisnis,
        operasional, sumber daya manusia, aset, dan rantai pasok dalam
        satu sistem yang terhubung secara real-time untuk meningkatkan
        efisiensi, transparansi, dan pengambilan keputusan.
      </p>

    </div>

    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 md:p-10 mb-12">

  <div className="grid md:grid-cols-3 gap-8 items-center">

    <div className="text-center">

      <div className="w-20 h-20 mx-auto bg-blue-100 rounded-3xl flex items-center justify-center mb-4">
        <i className="ri-router-line text-4xl text-blue-600"></i>
      </div>

      <h3 className="font-bold text-slate-900 text-xl mb-2">
        Industrial IoT
      </h3>

      <p className="text-slate-600">
        Mengumpulkan data mesin, energi,
        produksi, dan operasional secara real-time.
      </p>

    </div>

    <div className="flex justify-center">

      <div className="hidden md:flex items-center gap-3 text-blue-600">
        <i className="ri-arrow-right-line text-4xl"></i>
        <i className="ri-database-2-line text-3xl"></i>
        <i className="ri-arrow-right-line text-4xl"></i>
      </div>

    </div>

    <div className="text-center">

      <div className="w-20 h-20 mx-auto bg-blue-100 rounded-3xl flex items-center justify-center mb-4">
        <i className="ri-building-4-line text-4xl text-blue-600"></i>
      </div>

      <h3 className="font-bold text-slate-900 text-xl mb-2">
        ERP Enterprise
      </h3>

      <p className="text-slate-600">
        Mengotomatisasi proses bisnis,
        pengambilan keputusan, dan pelaporan perusahaan.
      </p>

    </div>

  </div>

</div>


    {/* Modules */}
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">

      {/* CRM */}
      <div className="group bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors">
          <i className="ri-customer-service-2-line text-2xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h4 className="font-bold text-slate-900 mb-3">
          CRM
        </h4>

        <p className="text-slate-600 text-sm leading-relaxed">
          Kelola prospek, pelanggan, aktivitas sales,
          dan histori komunikasi dalam satu platform.
        </p>
      </div>

      {/* SO PO */}
      <div className="group bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors">
          <i className="ri-file-list-3-line text-2xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h4 className="font-bold text-slate-900 mb-3">
          Sales & Purchasing
        </h4>

        <p className="text-slate-600 text-sm leading-relaxed">
          Otomatisasi Sales Order, Purchase Order,
          quotation, approval, dan monitoring transaksi.
        </p>
      </div>

      {/* HR Payroll */}
      <div className="group bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors">
          <i className="ri-team-line text-2xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h4 className="font-bold text-slate-900 mb-3">
          HR & Payroll
        </h4>

        <p className="text-slate-600 text-sm leading-relaxed">
          Kelola absensi, lembur, cuti,
          payroll, BPJS, dan evaluasi karyawan.
        </p>
      </div>

      {/* SHEE */}
      <div className="group bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors">
          <i className="ri-shield-check-line text-2xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h4 className="font-bold text-slate-900 mb-3">
          SHEE System
        </h4>

        <p className="text-slate-600 text-sm leading-relaxed">
          Safety, Health, Environment & Energy management,
          permit kerja, inspeksi, dan audit digital.
        </p>
      </div>

      {/* WMS */}
      <div className="group bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors">
          <i className="ri-store-2-line text-2xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h4 className="font-bold text-slate-900 mb-3">
          Warehouse Management
        </h4>

        <p className="text-slate-600 text-sm leading-relaxed">
          Monitoring stok, lokasi barang,
          penerimaan, pengeluaran, dan mutasi gudang.
        </p>
      </div>

      {/* Asset */}
      <div className="group bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors">
          <i className="ri-building-line text-2xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h4 className="font-bold text-slate-900 mb-3">
          Asset Management
        </h4>

        <p className="text-slate-600 text-sm leading-relaxed">
          Kelola aset perusahaan, nilai penyusutan,
          histori penggunaan, dan maintenance.
        </p>
      </div>

      {/* Stock Taking */}
      <div className="group bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors">
          <i className="ri-barcode-box-line text-2xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h4 className="font-bold text-slate-900 mb-3">
          Stock Taking
        </h4>

        <p className="text-slate-600 text-sm leading-relaxed">
          Percepat proses stock opname menggunakan
          barcode, QR code, dan mobile inspection.
        </p>
      </div>

      {/* Finance */}
      <div className="group bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 transition-colors">
          <i className="ri-money-dollar-circle-line text-2xl text-blue-600 group-hover:text-white"></i>
        </div>

        <h4 className="font-bold text-slate-900 mb-3">
          Finance & Accounting
        </h4>

        <p className="text-slate-600 text-sm leading-relaxed">
          General ledger, cash flow,
          budgeting, costing, dan laporan keuangan otomatis.
        </p>
      </div>

    </div>

    {/* Bottom Statement */}
    <div className="mt-14 text-center max-w-4xl mx-auto">

      <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8">

        <h3 className="text-2xl font-bold text-slate-900 mb-4">
          Semua Departemen Terhubung dalam Satu Sistem
        </h3>

        <p className="text-slate-600 leading-relaxed">
          Dengan TERIOT ERP, data tidak lagi tersebar di berbagai file,
          spreadsheet, atau aplikasi terpisah. Seluruh aktivitas bisnis
          tersinkronisasi secara real-time sehingga manajemen dapat
          memperoleh visibilitas penuh terhadap performa perusahaan.
        </p>

      </div>

    </div>

  </div>
</section>

{/* ======= MAINTENANCE MANAGEMENT SYSTEM ======= */}
<section
  id="maintenance-system"
  className="py-16 md:py-24 bg-white overflow-hidden"
>
  <div className="container mx-auto px-5 md:px-6">

    {/* Header */}
    <div className="max-w-4xl mx-auto text-center mb-14 md:mb-20">

      <span className="inline-flex items-center px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs md:text-sm font-bold tracking-widest uppercase mb-6">
        Maintenance Management System
      </span>

      <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
        Dari{" "}
        <span className="text-blue-600">
          Industrial IoT
        </span>{" "}
        Menjadi Maintenance yang Lebih Cerdas
      </h2>

      <p className="text-slate-600 text-sm md:text-lg leading-relaxed max-w-3xl mx-auto">
        TERIOT Maintenance Management System memanfaatkan data real-time
        dari sensor Industrial IoT untuk menghasilkan jadwal perawatan,
        prediksi kerusakan, pengendalian sparepart, serta monitoring biaya
        maintenance secara otomatis dan terintegrasi.
      </p>

    </div>

    {/* Benefits */}
    <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-6 mb-16">

      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition">
        <i className="ri-time-line text-4xl text-blue-600"></i>
        <h3 className="font-bold text-slate-900 mt-4 mb-2">
          Time Based Maintenance
        </h3>
        <p className="text-sm text-slate-600">
          Otomatis membuat jadwal maintenance berdasarkan running hour dan kalender.
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition">
        <i className="ri-pulse-line text-4xl text-blue-600"></i>
        <h3 className="font-bold text-slate-900 mt-4 mb-2">
          Predictive Maintenance
        </h3>
        <p className="text-sm text-slate-600">
          Analisis kondisi mesin untuk memprediksi potensi kerusakan.
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition">
        <i className="ri-calendar-check-line text-4xl text-blue-600"></i>
        <h3 className="font-bold text-slate-900 mt-4 mb-2">
          Auto Scheduling
        </h3>
        <p className="text-sm text-slate-600">
          Sistem secara otomatis menjadwalkan pekerjaan maintenance.
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition">
        <i className="ri-tools-line text-4xl text-blue-600"></i>
        <h3 className="font-bold text-slate-900 mt-4 mb-2">
          Sparepart Ready
        </h3>
        <p className="text-sm text-slate-600">
          Monitoring stok sparepart kritikal sebelum maintenance dilakukan.
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition">
        <i className="ri-money-dollar-circle-line text-4xl text-blue-600"></i>
        <h3 className="font-bold text-slate-900 mt-4 mb-2">
          Cost Planning
        </h3>
        <p className="text-sm text-slate-600">
          Perencanaan dan kontrol biaya maintenance secara real-time.
        </p>
      </div>

    </div>

    {/* Workflow */}
    <div className="bg-slate-50 rounded-[2.5rem] p-8 md:p-12 border border-slate-100">

      <div className="text-center mb-12">
        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
          Cara Kerja Maintenance Intelligence Platform
        </h3>

        <p className="text-slate-600 max-w-3xl mx-auto">
          Seluruh proses maintenance berjalan otomatis mulai dari
          pengambilan data mesin hingga pencatatan histori pekerjaan.
        </p>
      </div>

      <div className="workflow-grid grid md:grid-cols-2 xl:grid-cols-4 gap-6">

        {/* STEP 1 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm">
          <div className="text-blue-600 font-black text-5xl mb-4">01</div>

          <h4 className="font-bold text-slate-900 mb-3">
            Sensor Menangkap Kondisi Mesin
          </h4>

          <p className="text-slate-600 text-sm">
            Sensor IoT membaca Running Hour, Cycle Time,
            Temperature, Vibration, dan parameter operasional lainnya.
          </p>
        </div>

        {/* STEP 2 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm">
          <div className="text-blue-600 font-black text-5xl mb-4">02</div>

          <h4 className="font-bold text-slate-900 mb-3">
            Data Processing
          </h4>

          <p className="text-slate-600 text-sm">
            Data dikirim ke platform cloud untuk diproses
            dan dianalisis secara otomatis.
          </p>
        </div>

        {/* STEP 3 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm">
          <div className="text-blue-600 font-black text-5xl mb-4">03</div>

          <h4 className="font-bold text-slate-900 mb-3">
            Machine Classification
          </h4>

          <p className="text-slate-600 text-sm">
            Sistem mengklasifikasikan kondisi mesin:
            Normal, Warning, Critical, atau Breakdown.
          </p>
        </div>

        {/* STEP 4 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm">
          <div className="text-blue-600 font-black text-5xl mb-4">04</div>

          <h4 className="font-bold text-slate-900 mb-3">
            Generate PM / CM Schedule
          </h4>

          <p className="text-slate-600 text-sm">
            Jadwal Preventive maupun Corrective Maintenance
            dibuat secara otomatis.
          </p>
        </div>

        {/* STEP 5 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm">
          <div className="text-blue-600 font-black text-5xl mb-4">05</div>

          <h4 className="font-bold text-slate-900 mb-3">
            Assign Job ke Teknisi
          </h4>

          <p className="text-slate-600 text-sm">
            Work Order dikirim langsung ke teknisi sesuai
            kompetensi dan jadwal kerja.
          </p>
        </div>

        {/* STEP 6 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm">
          <div className="text-blue-600 font-black text-5xl mb-4">06</div>

          <h4 className="font-bold text-slate-900 mb-3">
            QR Barcode Reporting
          </h4>

          <p className="text-slate-600 text-sm">
            Teknisi melakukan scan QR Code untuk
            mengakses dan mengisi laporan pekerjaan.
          </p>
        </div>

        {/* STEP 7 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm">
          <div className="text-blue-600 font-black text-5xl mb-4">07</div>

          <h4 className="font-bold text-slate-900 mb-3">
            Recorded PM / CM History
          </h4>

          <p className="text-slate-600 text-sm">
            Seluruh histori pekerjaan tersimpan
            untuk audit, analisis reliability, dan KPI.
          </p>
        </div>

        {/* STEP 8 */}
<div className="workflow-result bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2rem] p-6 text-white flex flex-col">

  <div className="text-white/30 font-black text-5xl mb-4">
    RESULT
  </div>

  <h4 className="font-bold text-xl mb-3">
    Smart Maintenance Ecosystem
  </h4>

  <p className="text-blue-100 text-sm leading-relaxed mb-6">
    Kurangi downtime, optimalkan biaya maintenance,
    dan tingkatkan keandalan aset dengan strategi
    maintenance berbasis data real-time.
  </p>

  <div className="mt-auto">

    <Link
      href="https://transindomu.com/production/contact"
      className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-5 py-3 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg"
    >
      Yuk Coba Gratis!
      <i className="ri-arrow-right-line"></i>
    </Link>

  </div>

</div>

      </div>

    </div>
  </div>
</section>

{/* ======= TRUSTED BY INDUSTRY SECTION ======= */}
<section
  id="trusted-industries"
  className="py-16 md:py-24 bg-slate-50 overflow-hidden relative overflow-hidden"
>
  <div className="container mx-auto px-5 md:px-6">

    {/* Header */}
    <div className="max-w-4xl mx-auto text-center mb-14 md:mb-20">

      <span className="inline-flex items-center px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs md:text-sm font-bold tracking-widest uppercase mb-6">
        Trusted By Industry
      </span>

      <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
        Telah Dipercaya oleh
        <span className="text-blue-600 block">
          Industri Terkemuka di Indonesia
        </span>
      </h2>

      <p className="text-slate-600 text-sm md:text-lg leading-relaxed max-w-3xl mx-auto">
        TERIOT membantu perusahaan manufaktur, energi,
        FMCG, otomotif, logistik, dan berbagai sektor industri
        dalam membangun ekosistem digital berbasis Industrial IoT,
        ERP, Maintenance Management, dan Automation Platform.
      </p>

    </div>

    {/* Gallery CTA */}
<div className="text-center mb-8">
  <Link
    href="/gallery"
    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all duration-300"
  >
    <i className="ri-image-line"></i>
    Project Gallery
  </Link>
</div>  
    {/* Statistics */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

      {/* Company */}
      <div className="group bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 text-center">

        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
          <i className="ri-building-2-line text-3xl text-blue-600 group-hover:text-white"></i>
        </div>

        <div className="text-4xl md:text-5xl font-black text-slate-900 mb-2">
          12+
        </div>

        <div className="font-bold text-slate-900 mb-2">
          Perusahaan Terlayani
        </div>

        <p className="text-sm text-slate-500">
          Berbagai perusahaan nasional dan multinasional.
        </p>

      </div>

      {/* Logger */}
      <div className="group bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 text-center">

        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
          <i className="ri-cpu-line text-3xl text-blue-600 group-hover:text-white"></i>
        </div>

        <div className="text-4xl md:text-5xl font-black text-slate-900 mb-2">
          60+
        </div>

        <div className="font-bold text-slate-900 mb-2">
          Logger Terpasang
        </div>

        <p className="text-sm text-slate-500">
          Monitoring real-time pada mesin dan utilitas industri.
        </p>

      </div>

      {/* Support */}
      <div className="group bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 text-center">

        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
          <i className="ri-customer-service-2-line text-3xl text-blue-600 group-hover:text-white"></i>
        </div>

        <div className="text-4xl md:text-5xl font-black text-slate-900 mb-2">
          24/7
        </div>

        <div className="font-bold text-slate-900 mb-2">
          Customer Support
        </div>

        <p className="text-sm text-slate-500">
          Tim support siap membantu kapan pun dibutuhkan.
        </p>

      </div>

      {/* Industrial Area */}
      <div className="group bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 text-center">

        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
          <i className="ri-community-line text-3xl text-blue-600 group-hover:text-white"></i>
        </div>

        <div className="text-4xl md:text-5xl font-black text-slate-900 mb-2">
          4+
        </div>

        <div className="font-bold text-slate-900 mb-2">
          Kawasan Industri
        </div>

        <p className="text-sm text-slate-500">
          Implementasi solusi digital di berbagai kawasan industri.
        </p>

      </div>

    </div>

  </div>
</section>

{/* ======= CLIENTS SECTION: Minimalist & Seamless ======= */}
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
            {/* Fade Effect Kiri-Kanan */}
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent z-10"></div>
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent z-10"></div>

            <div className="flex animate-scroll whitespace-nowrap gap-16 md:gap-24 items-center">
              {[...Array(20)].map((_, i) => (
                <img
                  key={i}
                  src={`/assets/img/clients/client-${(i % 10) + 1}.png`}
                  className="h-8 md:h-12 w-auto grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                  alt="Client Logo"
                />
              ))}
            </div>
          </div>

          <style jsx>{`
            @keyframes scroll {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            .animate-scroll {
              animation: scroll 35s linear infinite;
              display: flex;
              width: max-content;
            }
            @media (max-width: 640px) {
              .animate-scroll { animation-duration: 25s; }
            }
          `}</style>
        </section>

{/* ======= SERVICE PACKAGE SECTION ======= */}
<section
  id="service-package"
  className="py-16 md:py-24 bg-slate-50 overflow-hidden"
>
  <div className="container mx-auto px-5 md:px-6">

    {/* Header */}
    <div className="max-w-4xl mx-auto text-center mb-14 md:mb-20">

      <span className="inline-flex items-center px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs md:text-sm font-bold tracking-widest uppercase mb-6">
        Service Package
      </span>

      <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
        Pilih Model Implementasi
        <span className="text-blue-600 block">
          Sesuai Kebutuhan Bisnis Anda
        </span>
      </h2>

      <p className="text-slate-600 text-sm md:text-lg leading-relaxed max-w-3xl mx-auto">
        TERIOT menyediakan dua skema implementasi yang fleksibel.
        Mulai dari pembelian sistem secara penuh (On-Premise)
        hingga model Subscription yang lebih ringan dan scalable.
      </p>

    </div>

    {/* Package Grid */}
    <div className="grid lg:grid-cols-2 gap-8">

      {/* On Premise */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 hover:shadow-xl transition">

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
            <i className="ri-server-line text-3xl text-blue-600"></i>
          </div>

          <div>
            <div className="text-sm text-blue-600 font-semibold uppercase tracking-wider">
              On-Premise
            </div>

            <h3 className="text-2xl font-bold text-slate-900">
              Pembelian Sistem Sekali Bayar
            </h3>
          </div>
        </div>

        <p className="text-slate-600 leading-relaxed mb-8">
          Solusi ideal bagi perusahaan yang ingin memiliki kontrol penuh
          terhadap data, server, dan infrastruktur aplikasi secara internal.
          Sistem diinstal langsung di lingkungan perusahaan dan menjadi aset digital perusahaan.
        </p>

        <div className="mb-8">
          <h4 className="font-bold text-green-600 mb-4">
            Keunggulan
          </h4>

          <div className="space-y-3">

            <div className="flex gap-3">
              <i className="ri-checkbox-circle-fill text-green-500"></i>
              <span className="text-slate-600">
                Kepemilikan sistem sepenuhnya.
              </span>
            </div>

            <div className="flex gap-3">
              <i className="ri-checkbox-circle-fill text-green-500"></i>
              <span className="text-slate-600">
                Data tersimpan di lingkungan internal perusahaan.
              </span>
            </div>

            <div className="flex gap-3">
              <i className="ri-checkbox-circle-fill text-green-500"></i>
              <span className="text-slate-600">
                Tidak ada biaya langganan bulanan.
              </span>
            </div>

            <div className="flex gap-3">
              <i className="ri-checkbox-circle-fill text-green-500"></i>
              <span className="text-slate-600">
                Fleksibilitas kustomisasi lebih tinggi.
              </span>
            </div>

          </div>
        </div>

        <div>
          <h4 className="font-bold text-amber-600 mb-4">
            Pertimbangan
          </h4>

          <div className="space-y-3">

            <div className="flex gap-3">
              <i className="ri-information-line text-amber-500"></i>
              <span className="text-slate-600">
                Investasi awal lebih besar.
              </span>
            </div>

            <div className="flex gap-3">
              <i className="ri-information-line text-amber-500"></i>
              <span className="text-slate-600">
                Membutuhkan infrastruktur server dan IT internal.
              </span>
            </div>

            <div className="flex gap-3">
              <i className="ri-information-line text-amber-500"></i>
              <span className="text-slate-600">
                Pengelolaan sistem menjadi tanggung jawab perusahaan.
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Subscription */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2rem] shadow-xl p-8 text-white">

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
            <i className="ri-cloud-line text-3xl"></i>
          </div>

          <div>
            <div className="text-sm text-blue-100 font-semibold uppercase tracking-wider">
              Subscription
            </div>

            <h3 className="text-2xl font-bold">
              Cloud & Managed Service
            </h3>
          </div>
        </div>

        <p className="text-blue-100 leading-relaxed mb-8">
          Solusi modern dengan biaya awal yang lebih ringan.
          TERIOT menangani infrastruktur, update sistem, maintenance,
          serta monitoring sehingga perusahaan dapat fokus pada operasional bisnis.
        </p>

        <div className="mb-8">
          <h4 className="font-bold text-white mb-4">
            Keunggulan
          </h4>

          <div className="space-y-3">

            <div className="flex gap-3">
              <i className="ri-checkbox-circle-fill"></i>
              <span>
                Investasi awal lebih rendah.
              </span>
            </div>

            <div className="flex gap-3">
              <i className="ri-checkbox-circle-fill"></i>
              <span>
                Update dan maintenance ditangani TERIOT.
              </span>
            </div>

            <div className="flex gap-3">
              <i className="ri-checkbox-circle-fill"></i>
              <span>
                Implementasi lebih cepat.
              </span>
            </div>

            <div className="flex gap-3">
              <i className="ri-checkbox-circle-fill"></i>
              <span>
                Mudah dikembangkan sesuai pertumbuhan bisnis.
              </span>
            </div>

          </div>
        </div>

        <div>
          <h4 className="font-bold text-blue-100 mb-4">
            Pertimbangan
          </h4>

          <div className="space-y-3">

            <div className="flex gap-3">
              <i className="ri-information-line"></i>
              <span>
                Memiliki biaya langganan berkala.
              </span>
            </div>

            <div className="flex gap-3">
              <i className="ri-information-line"></i>
              <span>
                Bergantung pada koneksi internet untuk layanan cloud.
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>

    {/* CTA */}
    <div className="text-center mt-16">

      <h3 className="text-2xl font-bold text-slate-900 mb-4">
        Belum Yakin Memilih Paket?
      </h3>

      <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
        Konsultasikan kebutuhan bisnis Anda dan coba platform TERIOT
        sebelum memutuskan implementasi penuh.
      </p>

      <Link
        href="https://transindomu.com/production/contact"
        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 hover:scale-105 transition-all duration-300 shadow-lg"
      >
        <i className="ri-rocket-line"></i>
        Dapatkan Coba Gratis
      </Link>

    </div>

  </div>
</section>

{/* ======= ABOUT SECTION ======= */}
        <section id="about" className="py-20 bg-white">
          <div className="container mx-auto px-6">
            
            {/* Title dengan dekorasi yang lebih modern */}
            <div className="section-title text-center mb-5">

                    <h2 className="fw-bold border-bottom d-inline-block pb-2">Tentang Kami</h2>

                  </div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
              
              {/* Sisi Kiri: Narasi Utama */}
              <div className="w-full lg:w-1/2">
                <p className="text-slate-600 text-base md:text-lg leading-relaxed mb-6">
                  <span className="font-bold text-slate-900">PT. Teriot Digital Technology</span> didirikan pada tahun 2022, merupakan 
                  perusahaan yang berfokus pada inovasi teknologi dan aplikasi digital. 
                </p>
                <p className="text-slate-600 text-base md:text-lg leading-relaxed mb-8">
                  Kami adalah spesialis di bidang <span className="text-blue-600 font-semibold">IIoT (Industrial IoT)</span>, 
                  mengintegrasikan mesin produksi untuk mempermudah monitoring, pengolahan data, dan analisis secara real-time.
                </p>

                {/* List Keunggulan: Dibuat lebih kontras agar scannable */}
                <div className="space-y-4">
                  {[
                    "Berorientasi pada kualitas dan kepuasan pelanggan",
                    "Dedikasi dan passion melayani customer sepenuh hati",
                    "Mendukung perkembangan dan inovasi teknologi"
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 transition-hover hover:border-blue-200">
                      <div className="mt-1 w-5 h-5 flex-none bg-blue-600 rounded-full flex items-center justify-center">
                        <i className="ri-check-line text-white text-xs"></i>
                      </div>
                      <span className="text-slate-700 text-sm md:text-base font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sisi Kanan: Penutup & CTA */}
              <div className="w-full lg:w-1/2 flex flex-col justify-between h-full">
                <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-xl shadow-blue-200">
                  <p className="text-blue-50 leading-relaxed mb-8 text-base md:text-lg italic">
                    "Kami memiliki komitmen tinggi untuk meningkatkan layanan sesuai dengan spesialisasi 
                    dan keahlian yang terus disempurnakan sesuai dengan era teknologi masa kini."
                  </p>
                  
                  <Link 
                    href="https://transindomu.com/production/contact" 
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all active:scale-95"
                  >
                    Lebih Detail
                    <i className="ri-arrow-right-line"></i>
                  </Link>
                </div>
                
                {/* Gambar Tambahan/Aksen untuk mempercantik di Desktop */}
                <div className="mt-8 hidden lg:block">
                  <div className="flex gap-4">
                      <div className="h-2 w-24 bg-blue-100 rounded-full"></div>
                      <div className="h-2 w-12 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
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
              Industrial IOT TERIOT
            </span>
          </h3>

          {/* INTRO */}
          <p className="text-gray-600 text-lg leading-relaxed max-w-xl">
            Teknologi di era industri 4.0 membantu anda mengambil keputusan
            secara <span className="font-semibold text-gray-800">lebih cepat dan tepat</span>.
            TERIOT hadir sebagai partner terbaik untuk meningkatkan
            <span className="font-semibold text-gray-800"> efisiensi dan efektivitas. </span>
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




    </>
  );
}