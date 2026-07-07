"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
};

type UserForm = {
  name: string;
  email: string;
  phone: string;
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  phone: "",
};

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Gagal mengambil data dari API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/users");
        const data = await response.json();

        if (isMounted) {
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isMounted) {
          console.error(error);
          setMessage("Gagal mengambil data dari API");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim()) {
      setMessage("Nama dan email wajib diisi");
      return;
    }

    const method = editingId ? "PUT" : "POST";
    const payload = editingId ? { id: editingId, ...form } : form;

    try {
      const response = await fetch("/api/users", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal menyimpan data");
      }

      setMessage(editingId ? "Data berhasil diperbarui" : "Data berhasil ditambahkan");
      setForm(emptyForm);
      setEditingId(null);
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan");
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus data ini?")) return;

    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal menghapus data");
      }

      setMessage("Data berhasil dihapus");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans dark:bg-black text-zinc-900 dark:text-zinc-50">
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
          <a href="#" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Beranda</a>
          <a href="#" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Tentang Kami</a>
          <a href="#" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Kontak</a>
        </nav>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto py-12 px-6 flex flex-col gap-8">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <h1 className="text-3xl font-semibold tracking-tight">CRUD Pengguna</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Tambah, ubah, dan hapus data pengguna melalui API Supabase.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111] p-6 shadow-sm flex flex-col gap-4"
          >
            <div>
              <h2 className="text-xl font-semibold">
                {editingId ? "Edit Pengguna" : "Tambah Pengguna"}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Isi data sesuai kolom table users.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Nama</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
                placeholder="Contoh: Budi Santoso"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
                placeholder="contoh@email.com"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Phone</span>
              <input
                type="text"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2"
                placeholder="0812xxxxxxxx"
              />
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {editingId ? "Simpan Perubahan" : "Tambah Data"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
              ) : null}
            </div>
          </form>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111] shadow-sm overflow-hidden">
            {message ? (
              <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-6 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                {message}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
                  <tr>
                    <th className="px-6 py-4 font-semibold">No</th>
                    <th className="px-6 py-4 font-semibold">Nama</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Phone</th>
                    <th className="px-6 py-4 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                        Memuat data...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                        Belum ada data pengguna.
                      </td>
                    </tr>
                  ) : (
                    users.map((user, index) => (
                      <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-6 py-4">{index + 1}</td>
                        <td className="px-6 py-4 font-medium">{user.name}</td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{user.email}</td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{user.phone || "-"}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(user)}
                              className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(user.id)}
                              className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

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
