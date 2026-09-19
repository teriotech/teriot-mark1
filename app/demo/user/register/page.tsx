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

const emptyForm: RegisterForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Validasi Frontend
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Nama, email, dan kata sandi wajib diisi.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Kata sandi dan konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      // Menyiapkan payload tanpa confirmPassword dan menambahkan default authority
      const { confirmPassword, ...payloadData } = form;
      const payload = {
        ...payloadData,
        authority: "User", // Set default authority sebagai "User"
      };

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal melakukan registrasi.");
      }

      // Jika berhasil, tampilkan UI Sukses
      setIsSuccess(true);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan pada server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans dark:bg-black text-zinc-900 dark:text-zinc-50">
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
          <a href="/" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Beranda</a>
          <a href="/" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Masuk</a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          {isSuccess ? (
            /* Success UI */
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111] p-8 shadow-lg text-center flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
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
                onClick={() => router.push("/")} // Mengarahkan kembali ke halaman utama (Login di layout.tsx)
                className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
              >
                Menuju Halaman Masuk
              </button>
            </div>
          ) : (
            /* Registration Form UI */
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111] p-8 shadow-lg flex flex-col gap-6">
              <div className="flex flex-col gap-2 text-center">
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

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">Nama Lengkap <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                    placeholder="Contoh: Budi Santoso"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">Alamat Email <span className="text-red-500">*</span></span>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                    placeholder="contoh@email.com"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">Nomor Telepon</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                    placeholder="0812xxxxxxxx"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">Kata Sandi <span className="text-red-500">*</span></span>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                    placeholder="••••••••"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">Konfirmasi Kata Sandi <span className="text-red-500">*</span></span>
                  <input
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                    placeholder="••••••••"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

              <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                Sudah punya akun?{" "}
                <a href="/" className="font-medium text-zinc-900 dark:text-white hover:underline">
                  Masuk di sini
                </a>
              </p>
            </div>
          )}
        </div>
      </main>

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