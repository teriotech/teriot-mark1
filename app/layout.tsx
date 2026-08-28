"use client";

// ADD THIS LINE to load Tailwind CSS
import "./globals.css"; 

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";

type DevStatus = "fullstack" | "frontend" | "dummy";

type MenuItem = {
  label: string;
  href?: string; 
  subItems?: { label: string; href: string; status?: DevStatus }[];
  status?: DevStatus; 
};

// PERBAIKAN: Warna disesuaikan untuk Light Theme
const getMenuTextColor = (status?: DevStatus, isSubMenu: boolean = false) => {
  switch (status) {
    case "fullstack":
      return "text-emerald-600 hover:text-emerald-700 font-bold"; // Hijau
    case "frontend":
      return "text-amber-500 hover:text-amber-600 font-bold"; // Kuning/Orange
    case "dummy":
      return "text-slate-400 hover:text-slate-500 font-medium"; // Abu-abu
    default:
      return isSubMenu 
        ? "text-slate-500 hover:text-indigo-600 font-medium" 
        : "text-slate-600 hover:text-indigo-600 font-semibold"; 
  }
};

// Struktur data untuk menu dan sub-menu
const menuData: Record<string, MenuItem[]> = {
  Dashboard: [
    { label: "Production Monitoring", href: "/dashboard/production_monitoring", status: "frontend" },
    { label: "Equipment Monitoring", href: "/dashboard/equipment_monitoring", status: "frontend" },
    { label: "Quality", href: "/dashboard/quality", status: "frontend" },
    { label: "Management", href: "/dashboard/management", status: "frontend" },
  ],
  IOT: [
    { 
      label: "Machine Press", status: "fullstack",
      subItems: [
        { label: "Overview", href: "/iot/machine_press/overview", status: "fullstack" },
        { label: "Logger", href: "/iot/machine_press/logger", status: "fullstack" },
      ]
    },
    { label: "HMI", href: "/iot/hmi", status: "fullstack" },
    { label: "Power Monitoring", href: "/iot/power_monitoring", status: "frontend" },
  ],
  OQC: [
    { label: "Pressure", href: "/production/dummy" },
    { label: "Humidity Testing", href: "/production/dummy" },
    { label: "Reject Sample", href: "/production/dummy" },
  ],
  Stockpile: [
    { label: "Production Plan", href: "/stockpile/production_plan", status: "fullstack" },
    { label: "Store", href: "/production/dummy" },
    { label: "Warehouse", href: "/production/dummy" },
    { label: "Truckscale", href: "/production/dummy" },
    { label: "Purchasing", href: "/production/dummy" },
    { label: "Stockyard", href: "/production/dummy" },
  ],
  Maintenance: [
    { label: "Overview Machine", href: "/maintenance/overview_machine", status: "frontend" },
    { label: "My Task Today", href: "/maintenance/myjob_today", status: "frontend" },
    { label: "Predictive Maintenance", href: "/maintenance/predictive_maintenance", status: "frontend" },
    { label: "Corrective Maintenance", href: "/maintenance/corrective_maintenance", status: "frontend" },
    { label: "Time Based Maintenance", href: "/maintenance/timebased_maintenance", status: "frontend" },
    { label: "Lifetime Monitoring", href: "/maintenance/lifetime_monitoring", status: "frontend" },
    { label: "RTU Device", href: "/maintenance/rtu_device", status: "frontend" },
    { label: "Sparepart", href: "/maintenance/sparepart", status: "frontend" },
    { label: "Maintenance Cost", href: "/maintenance/maintenance_cost", status: "frontend" },
    { 
      label: "Machine", status: "fullstack",
      subItems: [
        { label: "Machine Press", href: "/production/iot/mold/overview", status: "fullstack" },
        { label: "Machine Injection", href: "/production/iot/mold/logger"},
        { label: "Machine Role", href: "/production/iot/mold/operator-data" },
        { label: "Machine Mold", href: "/production/iot/mold/operator-data" },
      ]
    },
  ],
  HSE: [
    { label: "Create Permit", href: "/production/dummy" },
    { label: "Permit History", href: "/production/dummy" },
    { label: "Genba", href: "/production/dummy" },
    { label: "Visitor Form", href: "/production/register_user" },
  ],
  User: [
    { label: "User Register", href: "/user/register" },
    { label: "User Management", href: "/user/user_management" },
  ],
  Management: [
    { 
      label: "Material",
      subItems: [
        { label: "Master Material", href: "/management/material/1_master_material" },
        { label: "Create BOM", href: "/management/material/2_create_bom" },
        { label: "Document PT. TERIOT", href: "/management/material/3_create_qo" },
        { label: "Document PT. TMI", href: "/management/material/3_create_qo_TMI" },
        { label: "Cost Analysis", href: "/management/material/4_cost_analysis" },
      ]
    },
    { label: "Project Management", href: "/management/project"},
    { 
      label: "Finance Management",
      subItems: [
        { label: "Form Finance", href: "/management/finance/2_form_finance" },
        { label: "Datapack", href: "/management/finance/3_datapack" },
      ]
    },
     { label: "", href: "/management/supplier/list" },
    { label: "List Supplier", href: "/management/supplier/list" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string>("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  useEffect(() => {
    setIsMounted(true);
    const storedLoginStatus = localStorage.getItem("isLoggedIn");
    const storedUserData = localStorage.getItem("currentUser");

    if (storedLoginStatus === "true" && storedUserData) {
      setIsLoggedIn(true);
      setCurrentUser(JSON.parse(storedUserData));
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchTotalUsers = async () => {
        setUsersLoading(true);
        try {
          const response = await fetch("/api/users");
          if (response.ok) {
            const users = await response.json();
            setTotalUsers(users.length || 0);
          }
        } catch (error) {
          console.error("Gagal mengambil data user:", error);
        } finally {
          setUsersLoading(false);
        }
      };
      fetchTotalUsers();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    setExpandedMenu(null);
  }, [activeMenu]);

  const handleHeaderMenuClick = (menu: string) => {
    setActiveMenu(menu);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(true);
    }
  };

  const activeUser = currentUser ? {
    NickName: currentUser.name ? currentUser.name.split(" ")[0] : "User",
    Full_Name: currentUser.name,
    Level: currentUser.authority || "User",
    Phone: currentUser.phone || "-",
    Email: currentUser.email,
    ID_no: `UID-${currentUser.id}`,
  } : null;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);

    if (!email.trim() || !password) {
      setLoginError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLoginLoading(true);

    try {
      const response = await fetch("/api/users");
      const users = await response.json();

      if (!response.ok) throw new Error(users.error || "Gagal terhubung ke server.");

      const foundUser = users.find(
        (u: any) => u.email === email.trim().toLowerCase() && u.password === password
      );

      if (foundUser) {
        setIsLoggedIn(true);
        setCurrentUser(foundUser);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("currentUser", JSON.stringify(foundUser));
        setTotalUsers(users.length); 
        
        router.push("/dashboard/production_monitoring");
      } else {
        setLoginError("Email atau kata sandi yang Anda masukkan salah.");
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Terjadi kesalahan pada sistem.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleBypassLogin = () => {
    const mockDevAdmin = {
      id: "999-DEV",
      name: "Developer Admin",
      email: "dev.admin@teriothq.local",
      authority: "Admin", 
      phone: "0812-DEV-MODE",
    };

    setIsLoggedIn(true);
    setCurrentUser(mockDevAdmin);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("currentUser", JSON.stringify(mockDevAdmin));
    setTotalUsers(1); 
    
    router.push("/dashboard/production_monitoring");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUser");
    
    setEmail("");
    setPassword("");
    setActiveMenu("Dashboard");
    setIsSidebarOpen(false);
    router.push("/");
  };

  const closeRegisterModal = () => {
    setIsRegisterModalOpen(false);
    setRegisterSuccess(false);
    setRegisterError(null);
    setRegisterForm({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setRegisterError(null);

    if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.password) {
      setRegisterError("Nama, email, dan kata sandi wajib diisi.");
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError("Kata sandi dan konfirmasi kata sandi tidak cocok.");
      return;
    }

    setRegisterLoading(true);

    try {
      const { confirmPassword, ...payloadData } = registerForm;
      const payload = { ...payloadData, authority: "User" };

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal melakukan registrasi.");

      setRegisterSuccess(true);
      setRegisterForm({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Terjadi kesalahan pada server.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const toggleSubMenu = (label: string) => {
    setExpandedMenu(expandedMenu === label ? null : label);
  };

  return (
    <html lang="en">
      <head>
        <link 
          rel="icon" 
          href='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌌</text></svg>' 
        />
      </head>
      <body className="bg-slate-50 text-slate-900 font-sans">
        {!isMounted ? (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <span className="text-indigo-600 animate-pulse text-sm font-bold tracking-widest uppercase">Memuat Sistem...</span>
          </div>
        ) : !isLoggedIn ? (
          /* ==================================================================
             LOGIN SCREEN (LIGHT THEME)
             ================================================================== */
          <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-slate-50">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-64 bg-indigo-600 rounded-b-[100px] opacity-10 pointer-events-none"></div>
            
            <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-2xl shadow-xl z-10">
              <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-600 mb-2">
                  TERIOT MARK V.2
                </h1>
                <p className="text-sm text-slate-500 font-medium">Silakan masuk untuk mengakses sistem.</p>
              </div>

              {loginError && (
                <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600 animate-in fade-in slide-in-from-top-2 duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="font-semibold">{loginError}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Alamat Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all placeholder:text-slate-400"
                    placeholder="contoh@email.com"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Kata Sandi</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all placeholder:text-slate-400"
                    placeholder="••••••••"
                  />
                </label>

                <div className="flex flex-col gap-3 mt-4">
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center uppercase tracking-wider"
                  >
                    {loginLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader className="animate-spin h-4 w-4" /> Memeriksa...
                      </span>
                    ) : (
                      "Masuk"
                    )}
                  </button>

                  {process.env.NODE_ENV === "development" && (
                    <button
                      type="button"
                      onClick={handleBypassLogin}
                      className="w-full rounded-lg bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all flex justify-center items-center uppercase tracking-wider"
                    >
                      ⚡ Bypass Dev Login (Admin)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex justify-center items-center shadow-sm"
                  >
                    Belum punya akun? Daftar Sekarang
                  </button>
                </div>
              </form>
            </div>

            {/* MODAL REGISTER (LIGHT THEME) */}
            {isRegisterModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-md relative max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl bg-white border border-slate-200 shadow-2xl">
                  
                  <button 
                    onClick={closeRegisterModal}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-100 z-10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {registerSuccess ? (
                    <div className="p-8 text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200 mt-4">
                        <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Registrasi Berhasil!</h2>
                        <p className="text-slate-500 text-sm font-medium">
                          Akun Anda telah berhasil dibuat. Silakan masuk menggunakan email dan kata sandi yang telah Anda daftarkan.
                        </p>
                      </div>
                      <button
                        onClick={closeRegisterModal}
                        className="mt-4 w-full rounded-lg bg-indigo-600 text-white px-4 py-3 text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md"
                      >
                        Tutup & Menuju Halaman Masuk
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-300">
                      <div className="flex flex-col gap-2 text-center mt-2">
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Buat Akun Baru</h1>
                        <p className="text-sm text-slate-500 font-medium">Lengkapi data di bawah ini untuk mendaftar.</p>
                      </div>

                      {registerError && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600 font-semibold">
                          {registerError}
                        </div>
                      )}

                      <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Nama Lengkap <span className="text-red-500">*</span></span>
                          <input
                            type="text"
                            required
                            value={registerForm.name}
                            onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                            className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                          />
                        </label>

                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Alamat Email <span className="text-red-500">*</span></span>
                          <input
                            type="email"
                            required
                            value={registerForm.email}
                            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                            className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                          />
                        </label>

                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Nomor Telepon</span>
                          <input
                            type="tel"
                            value={registerForm.phone}
                            onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                            className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                          />
                        </label>

                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Kata Sandi <span className="text-red-500">*</span></span>
                          <input
                            type="password"
                            required
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                            className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                          />
                        </label>

                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Konfirmasi Kata Sandi <span className="text-red-500">*</span></span>
                          <input
                            type="password"
                            required
                            value={registerForm.confirmPassword}
                            onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                            className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={registerLoading}
                          className="mt-4 w-full rounded-lg bg-indigo-600 text-white px-4 py-3 text-sm font-bold hover:bg-indigo-700 shadow-md disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center"
                        >
                          {registerLoading ? "Memproses..." : "Daftar Sekarang"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ==================================================================
             MAIN LAYOUT (LIGHT THEME)
             ================================================================== */
          <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            
            {/* HEADER */}
            <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-sm">
              <div className="w-full px-4 md:px-6 h-16 flex items-center justify-between gap-3 md:gap-6">
                
                <div className="flex items-center gap-3">
                  {/* Hamburger Menu (Mobile Only) */}
                  <button 
                    className="md:hidden text-slate-500 hover:text-indigo-600 transition-colors p-1.5 rounded-md hover:bg-slate-100"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  </button>

                  {/* Sidebar toggle (Desktop) - Improved UI */}
                  <button
                    className="hidden md:flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors p-2 rounded-lg border border-transparent hover:border-indigo-100"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    title={isSidebarCollapsed ? "Tampilkan Sidebar" : "Sembunyikan Sidebar"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                    </svg>
                  </button>

                  {/* Logo / Title */}
                  <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-indigo-600 whitespace-nowrap shrink-0">
                    TERIOT V.2
                  </h1>
                </div>

                {/* Navigation (Scrollable on Mobile) */}
                <nav className="flex-1 min-w-0 flex items-center gap-2 md:gap-6 lg:gap-8 text-[11px] md:text-xs font-bold uppercase tracking-wider overflow-x-auto custom-scrollbar px-2">
                  {Object.keys(menuData)
                    .filter((menu) => {
                      if (menu === "Management" || menu === "User") {
                        return currentUser?.authority === "Admin";
                      }
                      return true;
                    })
                    .map((menu) => (
                      <button
                        key={menu}
                        type="button"
                        onClick={() => handleHeaderMenuClick(menu)}
                        className={`transition-all duration-300 whitespace-nowrap py-2 px-3 rounded-lg ${
                          activeMenu === menu
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
                        }`}
                      >
                        {menu}
                      </button>
                    ))}
                </nav>

                {/* User Profile Dropdown */}
                <div className="flex items-center gap-4 shrink-0">
                  
                  {/* User Count Badge (Hidden on Mobile) */}
                  <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{usersLoading ? "..." : `${totalUsers} Users`}</span>
                  </div>

                  <div className="relative group">
                    {!activeUser ? (
                      <span className="text-slate-400 animate-pulse text-xs font-medium">Loading...</span>
                    ) : (
                      <div className="relative">
                        {/* Profile Button */}
                        <div className="flex items-center gap-2 md:gap-3 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 ease-in-out px-2 md:px-3 py-1.5 rounded-full cursor-pointer shadow-sm">
                          <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shadow-sm uppercase">
                            {activeUser.NickName.charAt(0)}
                          </div>
                          <div className="text-left leading-tight pr-1 md:pr-2 hidden sm:block">
                            <div className="text-xs font-bold text-slate-800 capitalize">
                              {activeUser.NickName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                              {activeUser.Level}
                            </div>
                          </div>
                        </div>

                        {/* Dropdown Card */}
                        <div className="absolute right-0 mt-2 w-56 md:w-64 bg-white text-slate-800 rounded-xl shadow-lg border border-slate-200 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                          <div className="p-4 md:p-5 space-y-3 text-xs font-medium">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Profile Info</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Name</span>
                              <span className="text-slate-900 font-bold">{activeUser.Full_Name}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Email</span>
                              <span className="text-slate-900 font-bold truncate">{activeUser.Email}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Phone</span>
                              <span className="text-slate-900 font-bold">{activeUser.Phone}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider">ID</span>
                              <span className="text-slate-900 font-bold">{activeUser.ID_no}</span>
                            </div>
                          </div>
                          <div className="border-t border-slate-100 bg-slate-50">
                            <button
                              onClick={handleLogout}
                              className="w-full text-left px-4 md:px-5 py-3 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Logout
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* BODY (Sidebar + Main Content) */}
            <div className="flex flex-1 overflow-hidden relative">
              
              {/* Mobile Sidebar Overlay */}
              {isSidebarOpen && (
                <div 
                  className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}

              {/* SIDEBAR */}
              <aside 
                className={`fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out shadow-sm md:shadow-none
                  ${isSidebarCollapsed ? "md:w-0 md:min-w-0 md:max-w-0 md:border-0 md:p-0 md:overflow-hidden whitespace-nowrap" : "w-64 md:w-64"} 
                  ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                `}
              >
                <div className="flex items-center justify-between mb-4 px-4 pt-6">
                  <h2 className="text-indigo-600 text-xs font-extrabold uppercase tracking-wider">
                    {activeMenu} Menu
                  </h2>
                  <button 
                    className="md:hidden text-slate-400 hover:text-slate-700 p-1 bg-slate-100 rounded-md"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 px-3 pb-6 custom-scrollbar">
                  {menuData[activeMenu]?.map((item, index) => (
                    <div key={index}>
                      {item.subItems ? (
                        <>
                          <button
                            onClick={() => toggleSubMenu(item.label)}
                            className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-lg border border-transparent hover:bg-slate-50 transition-all duration-200 text-sm ${getMenuTextColor(item.status, false)}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{item.label}</span>
                            </div>
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className={`h-4 w-4 transition-transform duration-200 ${expandedMenu === item.label ? "rotate-90 text-indigo-600" : "text-slate-400"}`} 
                              fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          
                          {/* Render Submenu Items */}
                          {expandedMenu === item.label && (
                            <div className="ml-4 mt-1 mb-2 space-y-1 border-l-2 border-slate-100 pl-2 animate-in slide-in-from-top-2 duration-200">
                              {item.subItems.map((sub, subIdx) => (
                                <Link
                                  key={subIdx}
                                  href={sub.href}
                                  onClick={() => setIsSidebarOpen(false)}
                                  className={`block px-3 py-2 rounded-md hover:bg-slate-100 transition-all duration-200 text-xs ${getMenuTextColor(sub.status, true)}`}
                                >
                                  {sub.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <Link
                          href={item.href!}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`group flex items-center justify-between px-3 py-2.5 rounded-lg border border-transparent hover:bg-slate-50 transition-all duration-200 text-sm ${getMenuTextColor(item.status, false)}`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{item.label}</span>
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </aside>

              {/* MAIN CONTENT */}
              <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}