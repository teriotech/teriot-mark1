import React from "react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[calc(100vh-5rem)] p-6 text-center animate-in fade-in zoom-in-95 duration-500">
      
      {/* Icon / Logo Placeholder - Disesuaikan dengan Light Theme */}
      <div className="w-24 h-24 mb-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center border border-indigo-200 shadow-xl shadow-indigo-100/50">
        <span className="text-5xl">👋</span>
      </div>
      
      {/* Welcome Text - Disesuaikan dengan Light Theme */}
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-800 mb-5">
        Selamat Datang di <br className="md:hidden" />
        <span className="bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent drop-shadow-sm">
          TERIOT MARK V.2
        </span>
      </h1>
      
      <p className="text-slate-500 max-w-lg mx-auto text-sm md:text-base leading-relaxed mb-10 font-medium">
        Sistem monitoring produksi dan manajemen terintegrasi. Silakan pilih menu pada navigasi di atas atau sidebar untuk memulai aktivitas Anda.
      </p>

      {/* Optional: Quick Action Button - Disesuaikan dengan Light Theme */}
      <div className="flex gap-4">
        <div className="px-6 py-3 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-bold text-indigo-600 uppercase tracking-widest animate-pulse">
          Pilih Menu Untuk Memulai
        </div>
      </div>
      
    </div>
  );
}