"use client";

// ADD THIS LINE to load Tailwind CSS
import "./globals.css"; 

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MenuItem = {
  label: string;
  href: string;
};

// Struktur data untuk menu dan sub-menu
const menuData: Record<string, MenuItem[]> = {
  Dashboard: [
    { label: "Production Monitoring", href: "/production/dashboard/production_monitoring" },
    { label: "Equipment Monitoring", href: "/production/dashboard/equipment_monitoring" },
    { label: "Quality", href: "/production/dashboard/quality" },
    { label: "Management", href: "/production/dashboard/management" },
  ],
  IoT: [
    { label: "Machine Pres", href: "/production/iot/press" },
    { label: "Machine Injection", href: "/production/iot/injection" },
    { label: "Machine Role", href: "/production/iot/role" },
    { label: "Machine Mold", href: "/production/iot/mold" },
    { label: "HMI", href: "/production/iot/hmi" },
  ],
  Machine: [
    { label: "Machine Pres", href: "/production/machine/press" },
    { label: "Machine Injection", href: "/production/machine/injection" },
    { label: "Machine Role", href: "/production/dummy" },
    { label: "Machine Mold", href: "/production/dummy" },
  ],
  OQC: [
    { label: "Pressure", href: "/production/dummy" },
    { label: "Humidity Testing", href: "/production/dummy" },
    { label: "Reject Sample", href: "/production/dummy" },
  ],
  Stockpile: [
    { label: "Store", href: "/production/dummy" },
    { label: "Warehouse", href: "/production/dummy" },
    { label: "Truckscale", href: "/production/dummy" },
    { label: "Purchasing", href: "/production/dummy" },
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
    { label: "Visitor Form", href: "/production/register_user" },
    { label: "User Register", href: "/production/user/register" },
    { label: "User Management", href: "/production/user/user_management" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // State untuk Layout & Menu
  const [activeMenu, setActiveMenu] = useState<string>("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false); // State untuk Mobile Sidebar

  // State untuk Autentikasi & Data User
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // State untuk Form Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // State untuk Modal Register
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // State untuk Total Users
  const isLoading = false; // Untuk loading profile
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  // Fetch total users ketika berhasil login
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

  const activeUser = currentUser ? {
    NickName: currentUser.name ? currentUser.name.split(" ")[0] : "User",
    Full_Name: currentUser.name,
    Level: currentUser.authority || "User",
    Phone: currentUser.phone || "-",
    Email: currentUser.email,
    ID_no: `UID-${currentUser.id}`,
  } : null;

  // Fungsi Handle Login
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

      if (!response.ok) {
        throw new Error(users.error || "Gagal terhubung ke server.");
      }

      const foundUser = users.find(
        (u: any) => u.email === email.trim().toLowerCase() && u.password === password
      );

      if (foundUser) {
        setIsLoggedIn(true);
        setCurrentUser(foundUser);
        setTotalUsers(users.length); 
        router.push("/production/dashboard/production_monitoring");
      } else {
        setLoginError("Email atau kata sandi yang Anda masukkan salah.");
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Terjadi kesalahan pada sistem.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ==========================================
  // FITUR BARU: Fungsi Handle Bypass Login (Development Only)
  // ==========================================
  const handleBypassLogin = () => {
    const mockDevAdmin = {
      id: "999-DEV",
      name: "Developer Admin",
      email: "dev.admin@teriothq.local",
      authority: "Admin", // Supaya menu HSE terbuka otomatis saat dev
      phone: "0812-DEV-MODE",
    };

    setIsLoggedIn(true);
    setCurrentUser(mockDevAdmin);
    setTotalUsers(1); // Placeholder default agar visual tidak error
    router.push("/production/dashboard/production_monitoring");
  };

  // Fungsi Handle Logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setEmail("");
    setPassword("");
    setActiveMenu("Dashboard");
    setIsSidebarOpen(false);
    router.push("/");
  };

  // Fungsi Handle Register
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
      const payload = {
        ...payloadData,
        authority: "User",
      };

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal melakukan registrasi.");
      }

      setRegisterSuccess(true);
      setRegisterForm({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Terjadi kesalahan pada server.");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <html lang="en">
      <head>
        <link 
          rel="icon" 
          href='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🧙</text></svg>' 
        />
      </head>
      <body>
        {!isLoggedIn ? (
          <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#00F0FF]/10 blur-[100px] sm:blur-[120px] rounded-full pointer-events-none"></div>
            
            <div className="w-full max-w-md bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.08] p-6 sm:p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-10">
              <div className="text-center mb-8">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tighter bg-gradient-to-r from-[#00F0FF] to-[#0066FF] bg-clip-text text-transparent drop-shadow-sm mb-2">
                  TERIOT MARK V.1
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">Silakan masuk untuk mengakses sistem.</p>
              </div>

              {loginError && (
                <div className="mb-6 flex items-center gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 sm:p-4 text-xs sm:text-sm text-rose-400 animate-in fade-in slide-in-from-top-2 duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="font-medium">{loginError}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-4 sm:gap-5">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-bold text-zinc-300 uppercase tracking-widest text-[10px]">Alamat Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-lg border border-white/[0.1] bg-black/50 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all placeholder:text-zinc-600"
                    placeholder="admin@lge.com"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-bold text-zinc-300 uppercase tracking-widest text-[10px]">Kata Sandi</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-lg border border-white/[0.1] bg-black/50 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all placeholder:text-zinc-600"
                    placeholder="••••••••"
                  />
                </label>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#0066FF] px-4 py-3 text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center uppercase tracking-widest"
                  >
                    {loginLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memeriksa...
                      </span>
                    ) : (
                      "Masuk"
                    )}
                  </button>

                  {/* ========================================== */}
                  {/* TOMBOL BYPASS DEV LOGIN (HANYA MUNCUL DI LOCAL/DEV ENVIRONMENT) */}
                  {/* ========================================== */}
                  {process.env.NODE_ENV === "development" && (
                    <button
                      type="button"
                      onClick={handleBypassLogin}
                      className="w-full rounded-lg bg-purple-600/20 border border-purple-500/40 px-4 py-2 text-xs font-bold text-purple-400 hover:bg-purple-600/30 hover:text-purple-300 transition-all flex justify-center items-center uppercase tracking-wider"
                    >
                      ⚡ Bypass Dev Login (Admin)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="w-full rounded-lg bg-orange-500 px-3 py-3 sm:py-2 text-xs font-medium text-white hover:bg-orange-600 transition-all flex justify-center items-center shadow-sm"
                  >
                    Belum punya akun? Daftar Sekarang
                  </button>
                </div>
              </form>
            </div>

            {/* MODAL REGISTER (POP UP) */}
            {isRegisterModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-md relative max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-2xl bg-[#09090b] border border-white/[0.08] shadow-2xl">
                  
                  <button 
                    onClick={closeRegisterModal}
                    className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/[0.1] z-10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {registerSuccess ? (
                    <div className="p-6 sm:p-8 text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30 mt-4">
                        <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Registrasi Berhasil!</h2>
                        <p className="text-zinc-400 text-xs sm:text-sm">
                          Akun Anda telah berhasil dibuat sebagai User. Silakan masuk menggunakan email dan kata sandi yang telah Anda daftarkan.
                        </p>
                      </div>
                      <button
                        onClick={closeRegisterModal}
                        className="mt-4 w-full rounded-lg bg-white text-black px-4 py-3 text-sm font-bold hover:bg-zinc-200 transition-colors"
                      >
                        Tutup & Menuju Halaman Masuk
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 sm:p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-300">
                      <div className="flex flex-col gap-2 text-center mt-2">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Buat Akun Baru</h1>
                        <p className="text-xs sm:text-sm text-zinc-400">
                          Lengkapi data di bawah ini untuk mendaftar.
                        </p>
                      </div>

                      {registerError && (
                        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 sm:p-4 text-xs sm:text-sm text-rose-400">
                          {registerError}
                        </div>
                      )}

                      <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-bold text-zinc-300 uppercase tracking-widest text-[10px]">Nama Lengkap <span className="text-rose-500">*</span></span>
                          <input
                            type="text"
                            required
                            value={registerForm.name}
                            onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                            className="rounded-lg border border-white/[0.1] bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all"
                            placeholder="Contoh: Budi Santoso"
                          />
                        </label>

                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-bold text-zinc-300 uppercase tracking-widest text-[10px]">Alamat Email <span className="text-rose-500">*</span></span>
                          <input
                            type="email"
                            required
                            value={registerForm.email}
                            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                            className="rounded-lg border border-white/[0.1] bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all"
                            placeholder="contoh@email.com"
                          />
                        </label>

                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-bold text-zinc-300 uppercase tracking-widest text-[10px]">Nomor Telepon</span>
                          <input
                            type="tel"
                            value={registerForm.phone}
                            onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                            className="rounded-lg border border-white/[0.1] bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all"
                            placeholder="0812xxxxxxxx"
                          />
                        </label>

                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-bold text-zinc-300 uppercase tracking-widest text-[10px]">Kata Sandi <span className="text-rose-500">*</span></span>
                          <input
                            type="password"
                            required
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                            className="rounded-lg border border-white/[0.1] bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all"
                            placeholder="••••••••"
                          />
                        </label>

                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-bold text-zinc-300 uppercase tracking-widest text-[10px]">Konfirmasi Kata Sandi <span className="text-rose-500">*</span></span>
                          <input
                            type="password"
                            required
                            value={registerForm.confirmPassword}
                            onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                            className="rounded-lg border border-white/[0.1] bg-black/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all"
                            placeholder="••••••••"
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={registerLoading}
                          className="mt-2 w-full rounded-lg bg-white text-black px-4 py-3 text-sm font-bold hover:bg-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center"
                        >
                          {registerLoading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Memproses...
                            </span>
                          ) : (
                            "Daftar Sekarang"
                          )}
                        </button>
                      </form>

                      <p className="text-center text-xs sm:text-sm text-zinc-400 mt-2">
                        Sudah punya akun?{" "}
                        <button onClick={closeRegisterModal} className="font-bold text-white hover:underline">
                          Masuk di sini
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* KONDISI 2: JIKA SUDAH LOGIN -> TAMPILKAN LAYOUT UTAMA */
          <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
            {/* HEADER */}
            <header className="sticky top-0 z-30 w-full border-b border-white/[0.05] bg-[#050505]/80 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
              <div className="w-full px-4 md:px-8 h-16 flex items-center justify-between gap-3 md:gap-6">
                
                {/* Hamburger Menu (Mobile Only) */}
                <button 
                  className="md:hidden text-zinc-400 hover:text-white transition-colors p-1"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>

                {/* Logo / Title */}
                <h1 className="text-sm md:text-lg lg:text-xl font-extrabold tracking-tighter bg-gradient-to-r from-[#00F0FF] to-[#0066FF] bg-clip-text text-transparent whitespace-nowrap shrink-0 drop-shadow-sm">
                  TERIOT V.1
                </h1>

                {/* Navigation (Scrollable on Mobile) */}
                <nav className="flex-1 flex items-center gap-4 md:gap-6 lg:gap-8 text-[10px] md:text-xs font-bold uppercase tracking-widest overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-2">
                  {Object.keys(menuData)
                    .filter((menu) => {
                      if (menu === "HSE" && currentUser?.authority !== "Admin") {
                        return false;
                      }
                      return true;
                    })
                    .map((menu) => (
                      <button
                        key={menu}
                        onClick={() => setActiveMenu(menu)}
                        className={`transition-all duration-300 whitespace-nowrap py-2 ${
                          activeMenu === menu
                            ? "text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]"
                            : "text-zinc-400 hover:text-[#00F0FF] hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]"
                        }`}
                      >
                        {menu}
                      </button>
                    ))}
                </nav>

                {/* User Profile Dropdown */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative group">
                    {isLoading ? (
                      <span className="text-zinc-600 animate-pulse text-xs">Loading...</span>
                    ) : activeUser ? (
                      <div className="relative">
                        {/* Profile Button */}
                        <div className="flex items-center gap-2 md:gap-3 bg-white/[0.02] backdrop-blur-md border border-white/[0.05] hover:border-[#00F0FF]/50 hover:bg-white/[0.04] hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all duration-300 ease-in-out px-2 md:px-3 py-1.5 rounded-full cursor-pointer">
                          <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-[#00F0FF] to-[#7000FF] text-white font-bold text-[10px] md:text-xs shadow-[0_0_10px_rgba(0,240,255,0.3)] uppercase">
                            {activeUser.NickName.charAt(0)}
                          </div>
                          <div className="text-left leading-tight pr-1 md:pr-2 hidden sm:block">
                            <div className="text-xs font-bold text-zinc-200 tracking-wide capitalize">
                              {activeUser.NickName}
                            </div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">
                              {activeUser.Level}
                            </div>
                          </div>
                        </div>

                        {/* Dropdown Card */}
                        <div className="absolute right-0 mt-3 w-56 md:w-64 bg-[#09090b]/95 backdrop-blur-xl text-zinc-300 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/[0.08] opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-300 z-50 overflow-hidden">
                          <div className="p-4 md:p-5 space-y-3 text-xs font-medium">
                            <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 mb-2">
                              <span className="font-bold text-zinc-500 uppercase tracking-widest text-[10px]">Profile Info</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Name</span>
                              <span className="text-zinc-200 font-semibold">{activeUser.Full_Name}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Email</span>
                              <span className="text-zinc-200 font-semibold truncate">{activeUser.Email}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Phone</span>
                              <span className="text-zinc-200 font-semibold">{activeUser.Phone}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">ID</span>
                              <span className="text-zinc-200 font-semibold">{activeUser.ID_no}</span>
                            </div>
                          </div>
                          <div className="border-t border-white/[0.05] bg-white/[0.02]">
                            <button
                              onClick={handleLogout}
                              className="w-full text-left px-4 md:px-5 py-3 text-xs font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                            >
                              Logout
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-xs">Not logged in</span>
                    )}
                  </div>

                  {/* User Count Badge (Hidden on Mobile) */}
                  <div className="hidden sm:flex items-center gap-2 bg-[#00FF66]/10 border border-[#00FF66]/20 text-[#00FF66] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(0,255,102,0.1)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse shadow-[0_0_5px_#00FF66]"></span>
                    <div className="flex flex-col leading-tight">
                      <span>{usersLoading ? "..." : `${totalUsers} Users`}</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* BODY (Sidebar + Main Content) */}
            <div className="flex flex-1 overflow-hidden relative">
              
              {/* Mobile Sidebar Overlay */}
              {isSidebarOpen && (
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}

              {/* SIDEBAR */}
              <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#09090b]/95 md:bg-[#09090b]/80 backdrop-blur-xl border-r border-white/[0.05] flex flex-col p-4 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
                <div className="flex items-center justify-between mb-6 px-2">
                  <h2 className="text-[#00F0FF] text-xs font-extrabold uppercase tracking-widest">
                    {activeMenu} Menu
                  </h2>
                  <button 
                    className="md:hidden text-zinc-400 hover:text-white p-1"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {menuData[activeMenu]?.map((item, index) => (
                    <Link
                      key={index}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className="group flex items-center justify-between px-3 py-2.5 rounded-xl border border-transparent hover:border-white/[0.03] hover:bg-white/[0.02] text-zinc-400 hover:text-white transition-all duration-200 text-xs font-medium"
                    >
                      <span>{item.label}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#00F0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </aside>

              {/* MAIN CONTENT */}
              <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#050505]">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}