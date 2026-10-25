"use client";

// ADD THIS LINE to load Tailwind CSS
import "../globals.css";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Loader2,
  LayoutDashboard,
  Cpu,
  ClipboardCheck,
  Package,
  Wrench,
  ShieldCheck,
  Briefcase,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  LogOut,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Zap,
  Mail,
  Lock,
  ChevronDown,
} from "lucide-react";

/* ======================================================================
   TYPES & CONSTANTS
   ====================================================================== */
type DevStatus = "fullstack" | "frontend" | "dummy";

type SubItem = { label: string; href: string; status?: DevStatus };

type MenuItem = {
  label: string;
  href?: string;
  subItems?: SubItem[];
  status?: DevStatus;
};

type AppUser = {
  id: string | number;
  name?: string;
  email?: string;
  authority?: string;
  phone?: string;
  password?: string;
};

const STORAGE_KEYS = {
  loggedIn: "isLoggedIn",
  user: "currentUser",
  activeMenu: "activeMenu",
  sidebarCollapsed: "sidebarCollapsed",
} as const;

const DEFAULT_MENU = "Dashboard";
const DEFAULT_ROUTE = "/demo/dashboard/production_monitoring";
const ADMIN_ONLY_MENUS = ["Management", "User"];

const menuIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard,
  IOT: Cpu,
  OQC: ClipboardCheck,
  Stockpile: Package,
  Maintenance: Wrench,
  HSE: ShieldCheck,
  Management: Briefcase,
};

// Warna status untuk Light Theme
const getMenuTextColor = (status?: DevStatus, isSubMenu: boolean = false) => {
  switch (status) {
    case "fullstack":
      return "text-emerald-600 hover:text-emerald-700 font-bold";
    case "frontend":
      return "text-amber-500 hover:text-amber-600 font-bold";
    case "dummy":
      return "text-slate-400 hover:text-slate-500 font-medium";
    default:
      return isSubMenu
        ? "text-slate-500 hover:text-indigo-600 font-medium"
        : "text-slate-600 hover:text-indigo-600 font-semibold";
  }
};

// Struktur data untuk menu dan sub-menu
const menuData: Record<string, MenuItem[]> = {
  Dashboard: [
    { label: "Production Monitoring", href: "/demo/dashboard/production_monitoring" },
    { label: "Equipment Monitoring", href: "/demo/dashboard/equipment_monitoring" },
    { label: "Quality", href: "/demo/dashboard/quality" },
    { label: "Management", href: "/demo/dashboard/management" },
  ],
  IOT: [
    {
      label: "Machine Production",
      subItems: [
        { label: "Overview", href: "/demo/iot/machine_press/overview" },
        { label: "Logger", href: "/demo/iot/machine_press/logger" },
      ],
    },
    {
      label: "Machine Unipress",
      subItems: [
        { label: "Overview", href: "/demo/iot_upin/logger" },
        { label: "Logger", href: "/demo/iot_upin/overview" },
        { label: "Lifetime Monitoring", href: "/demo/iot_upin/lifetime_monitoring" },
      ],
    },
    { label: "HMI Production", href: "/demo/iot/hmi_barcode" },
    { label: "HMI Vessel", href: "/demo/iot/hmi_vessel" },
    { label: "HMI Boiler", href: "/demo/iot/hmi_boiler" },
    { label: "Power Monitoring", href: "/demo/iot/power_monitoring" },
  ],
  OQC: [
    { label: "Pressure", href: "/demo/production/dummy" },
    { label: "Humidity Testing", href: "/demo/production/dummy" },
    { label: "Reject Sample", href: "/demo/production/dummy" },
  ],
  Stockpile: [
    { label: "Production Plan", href: "/demo/stockpile/production_plan" },
    { label: "Store", href: "/demo/production/dummy" },
    { label: "Warehouse", href: "/demo/production/dummy" },
    { label: "Truckscale", href: "/demo/production/dummy" },
    { label: "Purchasing", href: "/demo/production/dummy" },
    { label: "Stockyard", href: "/demo/production/dummy" },
  ],
  Maintenance: [
    { label: "Overview Machine", href: "/demo/maintenance/overview_machine" },
    { label: "My Task Today", href: "/demo/maintenance/myjob_today" },
    { label: "Predictive Maintenance", href: "/demo/maintenance/predictive_maintenance" },
    { label: "Corrective Maintenance", href: "/demo/maintenance/corrective_maintenance" },
    { label: "Time Based Maintenance", href: "/demo/maintenance/timebased_maintenance" },
    { label: "Lifetime Monitoring", href: "/demo/maintenance/lifetime_monitoring" },
    { label: "RTU Device", href: "/demo/maintenance/rtu_device" },
    { label: "Sparepart", href: "/demo/maintenance/sparepart" },
    { label: "Maintenance Cost", href: "/maintenance/maintenance_cost" },
  ],
  HSE: [
    { label: "Create Permit", href: "/production/dummy" },
    { label: "Permit History", href: "/production/dummy" },
    { label: "Genba", href: "/production/dummy" },
    { label: "Visitor Form", href: "/production/register_user" },
  ],
  Management: [
    {
      label: "Material",
      subItems: [
        { label: "Master Material", href: "/demo/management/material/1_master_material" },
        { label: "Create BOM", href: "/demo/management/material/2_create_bom" },
        // { label: "Document PT. TERIOT", href: "/demo/management/material/3_create_qo" },
        { label: "Document PT. TMI", href: "/demo/management/material/3_create_qo_TMI" },
        { label: "Cost Analysis", href: "/demo/management/material/4_cost_analysist" },
      ],
    },
    { label: "Project Management", href: "/demo/management/new_project" },
    {
      label: "User",
      subItems: [
        { label: "User Register", href: "/demo/user/register" },
        { label: "User Management", href: "/demo/user/user_management" },
      ],
    },
  ],
};

/* ======================================================================
   HELPERS (Route -> Menu resolver)
   ====================================================================== */
const normalizePath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

const menuContainsPath = (items: MenuItem[] = [], path: string) =>
  items.some((i) => i.href === path || i.subItems?.some((s) => s.href === path));

/** Cari menu header yang sesuai dengan URL saat ini */
const resolveActiveMenu = (path: string, preferred: string | null, allowed: string[]) => {
  const matches = allowed.filter((m) => menuContainsPath(menuData[m], path));
  if (preferred && matches.includes(preferred)) return preferred; // href dipakai di beberapa menu (dummy)
  if (matches.length > 0) return matches[0];
  if (preferred && allowed.includes(preferred)) return preferred; // halaman di luar menu → pakai menu terakhir
  return DEFAULT_MENU;
};

/** Cari parent submenu dari halaman aktif (untuk auto-expand) */
const findParentSubMenu = (items: MenuItem[] = [], path: string) =>
  items.find((i) => i.subItems?.some((s) => s.href === path))?.label ?? null;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all";

const labelClass = "font-bold text-slate-600 uppercase tracking-wider text-[11px]";

/* ======================================================================
   ROOT LAYOUT
   ====================================================================== */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = normalizePath(usePathname() || "/");

  const [isMounted, setIsMounted] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const [usersLoading, setUsersLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);

  const isAdmin = currentUser?.authority === "Admin";
  const currentMenu = activeMenu ?? DEFAULT_MENU;

  const allowedMenus = useMemo(
    () => Object.keys(menuData).filter((m) => !ADMIN_ONLY_MENUS.includes(m) || isAdmin),
    [isAdmin]
  );

  /* ---------- 1. Restore session & preferences ---------- */
  useEffect(() => {
    try {
      const storedLoginStatus = localStorage.getItem(STORAGE_KEYS.loggedIn);
      const storedUserData = localStorage.getItem(STORAGE_KEYS.user);
      if (storedLoginStatus === "true" && storedUserData) {
        setCurrentUser(JSON.parse(storedUserData));
        setIsLoggedIn(true);
      }
      setIsSidebarCollapsed(localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === "true");
    } catch {
      localStorage.removeItem(STORAGE_KEYS.loggedIn);
      localStorage.removeItem(STORAGE_KEYS.user);
    } finally {
      setIsMounted(true);
    }
  }, []);

  /* ---------- 2. Sync active menu dengan URL (FIX reload → tetap di halaman yg sama) ---------- */
  useEffect(() => {
    if (!isMounted || !isLoggedIn) return;
    setActiveMenu((prev) =>
      resolveActiveMenu(pathname, prev ?? localStorage.getItem(STORAGE_KEYS.activeMenu), allowedMenus)
    );
  }, [pathname, isMounted, isLoggedIn, allowedMenus]);

  /* ---------- 3. Persist active menu ---------- */
  useEffect(() => {
    if (activeMenu) localStorage.setItem(STORAGE_KEYS.activeMenu, activeMenu);
  }, [activeMenu]);

  /* ---------- 4. Auto-expand submenu milik halaman aktif ---------- */
  useEffect(() => {
    setExpandedMenu(findParentSubMenu(menuData[currentMenu], pathname));
  }, [currentMenu, pathname]);

  /* ---------- 5. Tutup sidebar mobile & dropdown saat pindah halaman ---------- */
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsProfileOpen(false);
  }, [pathname]);

  /* ---------- 6. Jika sudah login & berada di root "/", arahkan ke dashboard ---------- */
  useEffect(() => {
    if (isMounted && isLoggedIn && pathname === "/") router.replace(DEFAULT_ROUTE);
  }, [isMounted, isLoggedIn, pathname, router]);

  /* ---------- 7. Close profile dropdown (outside click / Esc) ---------- */
  useEffect(() => {
    if (!isProfileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsProfileOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isProfileOpen]);

  /* ---------- 8. Fetch total users ---------- */
  useEffect(() => {
    if (!isLoggedIn) return;
    const controller = new AbortController();
    (async () => {
      setUsersLoading(true);
      try {
        const response = await fetch("/api/users", { signal: controller.signal });
        if (response.ok) {
          const users = await response.json();
          setTotalUsers(Array.isArray(users) ? users.length : 0);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") console.error("Gagal mengambil data user:", error);
      } finally {
        setUsersLoading(false);
      }
    })();
    return () => controller.abort();
  }, [isLoggedIn]);

  /* ---------- Handlers ---------- */
  const handleHeaderMenuClick = (menu: string) => {
    setActiveMenu(menu);
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
      localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, "false");
    }
    if (window.innerWidth < 768) setIsSidebarOpen(true);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(!prev));
      return !prev;
    });
  };

  const toggleSubMenu = (label: string) => {
    setExpandedMenu((prev) => (prev === label ? null : label));
  };

  const activeUser = useMemo(
    () =>
      currentUser
        ? {
            NickName: currentUser.name ? currentUser.name.split(" ")[0] : "User",
            Full_Name: currentUser.name || "-",
            Level: currentUser.authority || "User",
            Phone: currentUser.phone || "-",
            Email: currentUser.email || "-",
            ID_no: `UID-${currentUser.id}`,
          }
        : null,
    [currentUser]
  );

  const persistLogin = useCallback((user: AppUser) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEYS.loggedIn, "true");
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.activeMenu, DEFAULT_MENU);
    setActiveMenu(DEFAULT_MENU);
  }, []);

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
        (u: AppUser) => u.email?.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );

      if (foundUser) {
        persistLogin(foundUser);
        setTotalUsers(users.length);
        router.push(DEFAULT_ROUTE);
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
    const mockDevAdmin: AppUser = {
      id: "999-DEV",
      name: "Developer Admin",
      email: "dev.admin@teriothq.local",
      authority: "Admin",
      phone: "0812-DEV-MODE",
    };
    persistLogin(mockDevAdmin);
    setTotalUsers(1);
    router.push(DEFAULT_ROUTE);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.loggedIn);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.activeMenu);

    setEmail("");
    setPassword("");
    setActiveMenu(null);
    setIsSidebarOpen(false);
    setIsProfileOpen(false);
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...payloadData } = registerForm;
      const payload = { ...payloadData, email: payloadData.email.trim().toLowerCase(), authority: "User" };

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

  /* ======================================================================
     RENDER
     ====================================================================== */
  return (
    <html lang="en">
      <head>
        <title>TERIOT MARK V.2</title>
        <link
          rel="icon"
          href='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌌</text></svg>'
        />
        <style>{`
          @media screen and (max-width: 768px) {
            .mobile-zoom { zoom: 0.75; }
          }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { scrollbar-width: none; }
        `}</style>
      </head>

      <body className="bg-slate-50 text-slate-900 font-sans antialiased mobile-zoom">
        {!isMounted ? (
          /* ================= LOADING ================= */
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
            <span className="text-indigo-600 text-xs font-bold tracking-[0.3em] uppercase animate-pulse">
              Memuat Sistem...
            </span>
          </div>
        ) : !isLoggedIn ? (
          /* ================= LOGIN SCREEN ================= */
          <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-slate-50">
            {/* Background decoration */}
            <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-300/30 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:22px_22px] opacity-60" />

            <div className="relative z-10 w-full max-w-md">
              <div className="bg-white/90 backdrop-blur border border-slate-200 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-slate-200/70">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="h-14 w-14 mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 text-2xl">
                    🌌
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    TERIOT MARK V.2
                  </h1>
                  <p className="mt-2 text-sm text-slate-500 font-medium">Silakan masuk untuk mengakses sistem.</p>
                </div>

                {loginError && (
                  <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="font-semibold">{loginError}</p>
                  </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className={labelClass}>Alamat Email</span>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${inputClass} pl-10 py-3`}
                        placeholder="contoh@email.com"
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-2 text-sm">
                    <span className={labelClass}>Kata Sandi</span>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClass} pl-10 pr-11 py-3`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title={showPassword ? "Sembunyikan" : "Tampilkan"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  <div className="flex flex-col gap-3 mt-3">
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all flex justify-center items-center uppercase tracking-wider"
                    >
                      {loginLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin h-4 w-4" /> Memeriksa...
                        </span>
                      ) : (
                        "Masuk"
                      )}
                    </button>

                    {process.env.NODE_ENV === "development" && (
                      <button
                        type="button"
                        onClick={handleBypassLogin}
                        className="w-full rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
                      >
                        <Zap className="h-3.5 w-3.5" /> Bypass Dev Login (Admin)
                      </button>
                    )}

                    <div className="flex items-center gap-3 my-1">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">atau</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <a
                      href="https://transindomu.com/production/contact"
                      className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all flex justify-center items-center shadow-sm"
                    >
                      Belum punya akun? Daftar Sekarang
                    </a>
                  </div>
                </form>
              </div>
              <p className="mt-6 text-center text-[11px] font-medium text-slate-400">
                © {new Date().getFullYear()} TERIOT · All rights reserved
              </p>
            </div>

            {/* ================= MODAL REGISTER ================= */}
            {isRegisterModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-md relative max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl bg-white border border-slate-200 shadow-2xl">
                  <button
                    onClick={closeRegisterModal}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-100 z-10"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {registerSuccess ? (
                    <div className="p-8 text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200 mt-4">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Registrasi Berhasil!</h2>
                        <p className="text-slate-500 text-sm font-medium">
                          Akun Anda telah berhasil dibuat. Silakan masuk menggunakan email dan kata sandi yang telah Anda daftarkan.
                        </p>
                      </div>
                      <button
                        onClick={closeRegisterModal}
                        className="mt-2 w-full rounded-xl bg-indigo-600 text-white px-4 py-3 text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md"
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
                        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 font-semibold">
                          <AlertCircle className="h-5 w-5 shrink-0" />
                          {registerError}
                        </div>
                      )}

                      <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                        {[
                          { key: "name", label: "Nama Lengkap", type: "text", required: true },
                          { key: "email", label: "Alamat Email", type: "email", required: true },
                          { key: "phone", label: "Nomor Telepon", type: "tel", required: false },
                          { key: "password", label: "Kata Sandi", type: "password", required: true },
                          { key: "confirmPassword", label: "Konfirmasi Kata Sandi", type: "password", required: true },
                        ].map((f) => (
                          <label key={f.key} className="flex flex-col gap-2 text-sm">
                            <span className={labelClass}>
                              {f.label} {f.required && <span className="text-red-500">*</span>}
                            </span>
                            <input
                              type={f.type}
                              required={f.required}
                              value={registerForm[f.key as keyof typeof registerForm]}
                              onChange={(e) => setRegisterForm({ ...registerForm, [f.key]: e.target.value })}
                              className={inputClass}
                            />
                          </label>
                        ))}

                        <button
                          type="submit"
                          disabled={registerLoading}
                          className="mt-3 w-full rounded-xl bg-indigo-600 text-white px-4 py-3 text-sm font-bold hover:bg-indigo-700 shadow-md disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                        >
                          {registerLoading && <Loader2 className="h-4 w-4 animate-spin" />}
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
          /* ================= MAIN LAYOUT ================= */
          <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* ---------- HEADER ---------- */}
            <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/85 backdrop-blur-md shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="w-full px-3 md:px-6 h-16 flex items-center justify-between gap-3 md:gap-6">
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                  {/* Hamburger (Mobile) */}
                  <button
                    className="md:hidden text-slate-500 hover:text-indigo-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Buka menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>

                  {/* Sidebar toggle (Desktop) */}
                  <button
                    className="hidden md:flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors p-2 rounded-lg border border-slate-200 hover:border-indigo-200"
                    onClick={toggleSidebarCollapse}
                    title={isSidebarCollapsed ? "Tampilkan Sidebar" : "Sembunyikan Sidebar"}
                  >
                    {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                  </button>

                  {/* Logo */}
                  <Link href={DEFAULT_ROUTE} className="flex items-center gap-2 group">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-base shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
                      🌌
                    </div>
                    <span className="hidden sm:block text-base md:text-lg font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent whitespace-nowrap">
                      TERIOT MARK V.2
                    </span>
                  </Link>
                </div>

                {/* Navigation Tabs */}
                <nav className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {allowedMenus.map((menu) => {
                    const Icon = menuIcons[menu] ?? LayoutDashboard;
                    const isActive = currentMenu === menu;
                    return (
                      <button
                        key={menu}
                        type="button"
                        onClick={() => handleHeaderMenuClick(menu)}
                        className={`relative flex items-center gap-1.5 whitespace-nowrap py-2 px-3 rounded-lg text-[11px] md:text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
                            : "text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                        {menu}
                      </button>
                    );
                  })}
                </nav>

                {/* Right Section */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                  <div className="hidden lg:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <Users className="h-3.5 w-3.5" />
                    <span>{usersLoading ? "..." : `${totalUsers} Users`}</span>
                  </div>

                  {/* Profile Dropdown (click-based) */}
                  {activeUser && (
                    <div className="relative" ref={profileRef}>
                      <button
                        type="button"
                        onClick={() => setIsProfileOpen((v) => !v)}
                        className={`flex items-center gap-2 border transition-all duration-200 pl-1 pr-2 md:pr-3 py-1 rounded-full shadow-sm ${
                          isProfileOpen
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50"
                        }`}
                      >
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xs uppercase">
                          {activeUser.NickName.charAt(0)}
                        </div>
                        <div className="text-left leading-tight hidden sm:block">
                          <div className="text-xs font-bold text-slate-800 capitalize">{activeUser.NickName}</div>
                          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{activeUser.Level}</div>
                        </div>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                          <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 border-b border-slate-100">
                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm uppercase shadow">
                              {activeUser.NickName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate">{activeUser.Full_Name}</div>
                              <span className="inline-block mt-0.5 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                                {activeUser.Level}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 space-y-3 text-xs">
                            {[
                              ["Email", activeUser.Email],
                              ["Phone", activeUser.Phone],
                              ["ID", activeUser.ID_no],
                            ].map(([k, v]) => (
                              <div key={k} className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{k}</span>
                                <span className="text-slate-800 font-semibold truncate">{v}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-slate-100 p-2">
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <LogOut className="h-4 w-4" /> Logout
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* ---------- BODY ---------- */}
            <div className="flex flex-1 relative">
              {/* Mobile overlay */}
              {isSidebarOpen && (
                <div
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}

              {/* ---------- SIDEBAR ---------- */}
              <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-xl md:shadow-none
                  md:sticky md:top-16 md:bottom-auto md:z-30 md:h-[calc(100vh-4rem)] md:translate-x-0 shrink-0 overflow-hidden
                  transition-all duration-300 ease-in-out
                  ${isSidebarCollapsed ? "md:w-0 md:border-r-0" : "md:w-64"}
                  ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
                `}
              >
                <div className="w-72 md:w-64 h-full flex flex-col">
                  {/* Sidebar header */}
                  <div className="flex items-center justify-between px-4 pt-5 pb-3">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = menuIcons[currentMenu] ?? LayoutDashboard;
                        return (
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 ring-1 ring-indigo-100 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-indigo-600" />
                          </div>
                        );
                      })()}
                      <div className="leading-tight">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Menu</p>
                        <h2 className="text-sm font-extrabold text-slate-800">{currentMenu}</h2>
                      </div>
                    </div>
                    <button
                      className="md:hidden text-slate-400 hover:text-slate-700 p-1.5 bg-slate-100 rounded-lg"
                      onClick={() => setIsSidebarOpen(false)}
                      aria-label="Tutup menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mx-4 mb-3 h-px bg-slate-100" />

                  {/* Sidebar items */}
                  <nav className="flex-1 overflow-y-auto space-y-1 px-3 pb-6 custom-scrollbar">
                    {menuData[currentMenu]?.map((item, index) => {
                      if (item.subItems) {
                        const isExpanded = expandedMenu === item.label;
                        const hasActiveChild = item.subItems.some((s) => s.href === pathname);
                        return (
                          <div key={`${item.label}-${index}`}>
                            <button
                              onClick={() => toggleSubMenu(item.label)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                                hasActiveChild
                                  ? "text-indigo-700 font-bold bg-indigo-50/60"
                                  : `hover:bg-slate-50 ${getMenuTextColor(item.status, false)}`
                              }`}
                            >
                              <span>{item.label}</span>
                              <ChevronRight
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  isExpanded ? "rotate-90 text-indigo-600" : "text-slate-400"
                                }`}
                              />
                            </button>

                            <div
                              className={`grid transition-all duration-200 ease-in-out ${
                                isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                              }`}
                            >
                              <div className="overflow-hidden">
                                <div className="ml-4 mt-1 mb-2 space-y-0.5 border-l-2 border-slate-100 pl-2">
                                  {item.subItems.map((sub, subIdx) => {
                                    const isActive = pathname === sub.href;
                                    return (
                                      <Link
                                        key={`${sub.label}-${subIdx}`}
                                        href={sub.href}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`relative block px-3 py-2 rounded-md transition-all duration-200 text-xs ${
                                          isActive
                                            ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-200"
                                            : `hover:bg-slate-100 ${getMenuTextColor(sub.status, true)}`
                                        }`}
                                      >
                                        {sub.label}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={`${item.label}-${index}`}
                          href={item.href!}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                            isActive
                              ? "bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-100"
                              : `hover:bg-slate-50 ${getMenuTextColor(item.status, false)}`
                          }`}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-indigo-600" />
                          )}
                          <span>{item.label}</span>
                          <ChevronRight
                            className={`h-4 w-4 transition-all ${
                              isActive
                                ? "text-indigo-600 opacity-100"
                                : "text-indigo-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1"
                            }`}
                          />
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Sidebar footer */}
                  <div className="border-t border-slate-100 px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    TERIOT MARK V.2
                  </div>
                </div>
              </aside>

              {/* ---------- MAIN CONTENT ---------- */}
              <main className="flex-1 min-w-0 bg-slate-50">{children}</main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}