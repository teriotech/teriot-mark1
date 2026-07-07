"use client";

// ADD THIS LINE to load Tailwind CSS
import "./globals.css"; 

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MenuItem = {
  label: string;
  href: string;
};

// Struktur data untuk menu dan sub-menu
const menuData: Record<string, MenuItem[]> = {
  Dashboard: [
    { label: "Production Monitoring", href: "/production/dashboard" },
    { label: "Equipment Monitoring", href: "/production/dummy" },
    { label: "Quality", href: "/production/dummy" },
    { label: "Management", href: "/production/dummy" },
  ],
  Monitoring: [
    { label: "Machine Pres", href: "/production/dummy" },
    { label: "Machine Injection", href: "/production/dummy" },
    { label: "Machine Role", href: "/production/dummy" },
    { label: "Machine Mold", href: "/production/dummy" },
  ],
  OQC: [
    { label: "Pressure", href: "/production/dummy" },
    { label: "Humidity Testing", href: "/production/dummy" },
    { label: "Reject Sample", href: "/production/dummy" },
  ],
  Stockpile: [
    { label: "Pallet A", href: "/production/dummy" },
    { label: "Pallet B", href: "/production/dummy" },
  ],
  Maintenance: [
    { label: "My Task Today", href: "/production/dummy" },
    { label: "Predictive Maintenance", href: "/production/dummy" },
    { label: "Corrective Maintenance", href: "/production/dummy" },
    { label: "Custom Job", href: "/production/dummy" },
    { label: "Overview Machine", href: "/production/dummy" },
    { label: "Time Based Maintenance", href: "/production/dummy" },
    { label: "RTU Device", href: "/production/dummy" },
    { label: "Sparepart", href: "/production/dummy" },
    { label: "Maintenance Cost", href: "/production/dummy" },
    { label: "Lifetime Monitoring", href: "/production/dummy" },
  ],
  HSE: [
    { label: "Create Permit", href: "/production/dummy" },
    { label: "Permit History", href: "/production/dummy" },
    { label: "Genba", href: "/production/dummy" },
    { label: "Visitor Form", href: "/production/dummy" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // State untuk melacak menu utama mana yang sedang aktif
  const [activeMenu, setActiveMenu] = useState<string>("Dashboard");

  // Mock data (Silakan ganti dengan state/context asli Anda)
  const isLoading = false;
  const usersLoading = false;
  const totalUsers = 128;
  const userData = {
    status: "LOGGEDIN",
    NickName: "Admin",
    Full_Name: "Admin User",
    Level: "Manager",
    Team: "Engineering",
    Email: "admin@lge.com",
    ID_no: "LG12345",
  };

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
          {/* HEADER */}
          <header className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-[#050505]/80 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="w-full px-4 md:px-8 h-16 flex items-center justify-between">
              {/* Logo / Title */}
              <h1 className="text-base md:text-lg lg:text-xl font-extrabold tracking-tighter bg-gradient-to-r from-[#00F0FF] to-[#0066FF] bg-clip-text text-transparent whitespace-nowrap shrink-0 drop-shadow-sm">
                HW New Part Development System
              </h1>

              {/* Navigation */}
              <nav className="flex items-center gap-4 md:gap-6 lg:gap-8 text-xs font-bold uppercase tracking-widest">
                {/* Render Main Menus */}
                {Object.keys(menuData).map((menu) => (
                  <button
                    key={menu}
                    onClick={() => setActiveMenu(menu)}
                    className={`transition-all duration-300 whitespace-nowrap ${
                      activeMenu === menu
                        ? "text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]"
                        : "text-zinc-400 hover:text-[#00F0FF] hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]"
                    }`}
                  >
                    {menu}
                  </button>
                ))}

                {/* User Profile Dropdown */}
                <ul className="list-none m-0 p-0 ml-4">
                  <li className="relative group">
                    {isLoading ? (
                      <span className="text-zinc-600 animate-pulse">Loading...</span>
                    ) : userData && userData.status !== "LOGGEDOFF" ? (
                      <div className="relative">
                        {/* Profile Button */}
                        <div className="flex items-center gap-3 bg-white/[0.02] backdrop-blur-md border border-white/[0.05] hover:border-[#00F0FF]/50 hover:bg-white/[0.04] hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all duration-300 ease-in-out px-3 py-1.5 rounded-full cursor-pointer">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white font-bold text-xs shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                            {userData.NickName?.charAt(0)}
                          </div>
                          <div className="text-left leading-tight pr-2">
                            <div className="text-xs font-bold text-zinc-200 tracking-wide capitalize">
                              {userData.NickName}
                            </div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">
                              {userData.Team}
                            </div>
                          </div>
                        </div>

                        {/* Dropdown Card */}
                        <div className="absolute right-0 mt-3 w-64 bg-[#09090b]/95 backdrop-blur-xl text-zinc-300 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/[0.08] opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-300 z-50 overflow-hidden">
                          <div className="p-5 space-y-3 text-xs font-medium">
                            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 mb-2">
                              <span className="font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Profile Info</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Name</span>
                              <span className="text-zinc-200 font-semibold">{userData.Full_Name}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Level</span>
                              <span className="text-zinc-200 font-semibold">{userData.Level}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Team</span>
                              <span className="text-zinc-200 font-semibold">{userData.Team}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Email</span>
                              <span className="text-zinc-200 font-semibold">{userData.Email}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">ID</span>
                              <span className="text-zinc-200 font-semibold">{userData.ID_no}</span>
                            </div>
                          </div>
                          <div className="border-t border-white/[0.05] bg-white/[0.02]">
                            <button
                              onClick={() => router.push("/production/dashboard")}
                              className="w-full text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                            >
                              Logout
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-600">Not logged in</span>
                    )}
                  </li>
                </ul>

                {/* User Count Badge */}
                <ul className="list-none m-0 p-0">
                  <li>
                    <div className="flex items-center gap-2 bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(0,255,102,0.1)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse shadow-[0_0_5px_#00FF66]"></span>
                      <div className="flex flex-col leading-tight">
                        <span>{usersLoading ? "..." : `${totalUsers} Users`}</span>
                      </div>
                    </div>
                  </li>
                </ul>
              </nav>
            </div>
          </header>

          {/* BODY (Sidebar + Main Content) */}
          <div className="flex flex-1 overflow-hidden">
            
            {/* SIDEBAR */}
            <aside className="w-64 bg-[#09090b]/80 backdrop-blur-md border-r border-white/[0.05] flex flex-col p-4 overflow-y-auto">
              <h2 className="text-[#00F0FF] text-xs font-extrabold uppercase tracking-widest mb-6 px-2">
                {activeMenu} Menu
              </h2>
              <nav className="flex flex-col gap-1">
                {(menuData[activeMenu] ?? []).map((submenu) => (
                  <Link
                    key={`${activeMenu}-${submenu.label}`}
                    href={submenu.href}
                    className="text-sm text-zinc-400 font-medium px-3 py-2.5 rounded-lg hover:bg-white/[0.05] hover:text-white transition-all duration-200"
                  >
                    {submenu.label}
                  </Link>
                ))}
              </nav>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-6 overflow-y-auto bg-[#050505]">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}