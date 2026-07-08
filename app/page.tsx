"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

type RegisterForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const emptyRegisterForm: RegisterForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function AuthPage() {
  const router = useRouter();
  
  // State untuk mengontrol Modal Register
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Global State untuk UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // State untuk Form Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // State untuk Form Register
  const [registerForm, setRegisterForm] = useState<RegisterForm>(emptyRegisterForm);

  // Fungsi untuk menutup modal dan mereset state form register
  const closeRegisterModal = () => {
    setIsRegisterModalOpen(false);
    setIsSuccess(false);
    setError(null);
    setRegisterForm(emptyRegisterForm);
  };

  // Handler untuk Submit Login
  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!loginEmail.trim() || !loginPassword) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/users");
      const users = await response.json();

      if (!response.ok) {
        throw new Error(users.error || "Gagal terhubung ke server.");
      }

      const foundUser = users.find(
        (u: any) => u.email === loginEmail.trim().toLowerCase() && u.password === loginPassword
      );

      if (foundUser) {
        router.push("/production/dashboard/production_monitoring");
      } else {
        setError("Email atau kata sandi yang Anda masukkan salah.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan pada sistem.");
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk Submit Register
  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.password) {
      setError("Nama, email, dan kata sandi wajib diisi.");
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Kata sandi dan konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);

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

      setIsSuccess(true);
      setRegisterForm(emptyRegisterForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan pada server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans dark:bg-black text-zinc-900 dark:text-zinc-50 relative">
      {/* Header */}
      <header className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black py-4 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />
        </div>
        <nav className="hidden sm:flex gap-6 font-medium text-sm">
          <button onClick={() => setIsRegisterModalOpen(false)} className={`hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ${!isRegisterModalOpen ? "font-bold" : ""}`}>
            Masuk
          </button>
          <button onClick={() => setIsRegisterModalOpen(true)} className={`hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ${isRegisterModalOpen ? "font-bold" : ""}`}>
            Daftar
          </button>
        </nav>
      </header>

      {/* Main Content (Selalu Menampilkan Form Login) */}
      <main className="flex-1 w-full flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111] p-8 shadow-lg flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Selamat Datang Kembali</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Silakan masuk ke akun Anda untuk melanjutkan.
              </p>
            </div>

            {error && !isRegisterModalOpen && (
              <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">Alamat Email</span>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                  placeholder="contoh@email.com"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Kata Sandi</span>
                  <a href="#" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">Lupa sandi?</a>
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                  placeholder="••••••••"
                />
              </label>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center"
                >
                  {loading && !isRegisterModalOpen ? "Memeriksa..." : "Masuk"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setIsRegisterModalOpen(true);
                  }}
                  className="w-full rounded-lg bg-orange-500 px-3 py-2 text-xs font-medium text-white hover:bg-orange-600 transition-all flex justify-center items-center shadow-sm"
                >
                  Belum punya akun? Daftar Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* MODAL REGISTER */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md relative">
            
            {/* KONDISI 1: TAMPILAN FORM REGISTER */}
            {!isSuccess ? (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111] p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-300 relative">
                
                {/* Tombol Close (X) */}
                <button 
                  onClick={closeRegisterModal}
                  className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                <div className="flex flex-col gap-2 text-center mt-2">
                  <h1 className="text-2xl font-bold tracking-tight">Buat Akun Baru</h1>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Lengkapi data di bawah ini untuk mendaftar.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">Nama Lengkap <span className="text-red-500">*</span></span>
                    <input
                      type="text"
                      required
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                      placeholder="Contoh: Budi Santoso"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">Alamat Email <span className="text-red-500">*</span></span>
                    <input
                      type="email"
                      required
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                      placeholder="contoh@email.com"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">Nomor Telepon</span>
                    <input
                      type="tel"
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                      placeholder="0812xxxxxxxx"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">Kata Sandi <span className="text-red-500">*</span></span>
                    <input
                      type="password"
                      required
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                      placeholder="••••••••"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">Konfirmasi Kata Sandi <span className="text-red-500">*</span></span>
                    <input
                      type="password"
                      required
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                      placeholder="••••••••"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center"
                  >
                    {loading ? "Memproses..." : "Daftar Sekarang"}
                  </button>
                </form>

                <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                  Sudah punya akun?{" "}
                  <button onClick={closeRegisterModal} className="font-medium text-zinc-900 dark:text-white hover:underline">
                    Masuk di sini
                  </button>
                </p>
              </div>
            ) : (
              /* KONDISI 2: TAMPILAN SUKSES REGISTER DI DALAM MODAL */
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111] p-8 shadow-2xl text-center flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">Registrasi Berhasil!</h2>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    Akun Anda telah berhasil dibuat sebagai User. Silakan masuk menggunakan email dan kata sandi yang telah Anda daftarkan.
                  </p>
                </div>
                <button
                  onClick={closeRegisterModal}
                  className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
                >
                  Tutup & Menuju Halaman Masuk
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black py-8 px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        <p>© {new Date().getFullYear()} Perusahaan Anda. Hak cipta dilindungi undang-undang.</p>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">Kebijakan Privasi</a>
          <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">Syarat & Ketentuan</a>
        </div>
      </footer>
    </div>
  );
}