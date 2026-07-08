"use client";

import React, { useRef, useState, useEffect } from 'react';

export default function NodeRedPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Menangani perubahan status fullscreen (misal user tekan tombol ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fungsi untuk toggle Fullscreen pada Element Iframe
  const toggleFullscreen = async () => {
    if (!iframeRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await iframeRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Gagal mengubah mode fullscreen:", err);
    }
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] p-4 bg-slate-900 text-slate-100">
      {/* Header Panel Kontrol */}
      <div className="flex items-center justify-between mb-3 bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-sm font-semibold tracking-wide text-slate-200">
            HMI <span className="text-xs text-slate-400 font-normal">(192.168.1.7)</span>
          </h1>
        </div>
        
        <button
          onClick={toggleFullscreen}
          className="flex items-center space-x-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-xs font-medium rounded-md transition-colors duration-200 shadow-sm"
        >
          {isFullscreen ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3 3m12 6V4.5M15 9h4.5M15 9l6-6M9 15v4.5M9 15H4.5M9 15l-6 6m12-15v4.5M15 15h4.5M15 15l6 6" />
              </svg>
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
              </svg>
              <span>Fullscreen Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Container Iframe - Wide View */}
      <div className="flex-1 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner relative">
        <iframe
          ref={iframeRef}
          src="http://192.168.1.7:1880/ui"
          title="HMI"
          className="w-full h-full border-0 bg-slate-950"
          allow="fullscreen"
          loading="lazy"
        />
      </div>
    </div>
  );
}