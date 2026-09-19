"use client";

import { useState, useRef } from "react";

export default function ProductGMES() {
  const [activeTab, setActiveTab] = useState("tab1");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleFullScreen = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (iframe.requestFullscreen) iframe.requestFullscreen();
    // fallback browser lama tidak perlu di Next modern
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* TABS */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setActiveTab("tab1")}
          className={`px-5 py-2 rounded-lg border text-sm font-semibold transition
            ${
              activeTab === "tab1"
                ? "bg-blue-600 text-white border-blue-600 shadow"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }
          `}
        >
          Confidential Document (IoT Product Overview)
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "tab1" && (
        <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4">

          {/* ACTION BAR */}
          <div className="flex justify-end">
            <button
              onClick={toggleFullScreen}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              ⛶ Go Fullscreen
            </button>
          </div>

          {/* IFRAME */}
          <div className="relative w-full overflow-hidden rounded-xl border">
            <iframe
              ref={iframeRef}
              src="https://online.pubhtml5.com/huvqf/tzez/"
              className="w-full h-[600px]"
              allowFullScreen
            />
          </div>

        </div>
      )}
    </div>
  );
}
