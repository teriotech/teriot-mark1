"use client";

import React, { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  authority: string;
  created_at: string;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State untuk Modal Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> & { password?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Data Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Gagal mengambil data pengguna");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) return;

    try {
      const response = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Gagal menghapus pengguna");
      
      // Update state lokal setelah berhasil dihapus
      setUsers(users.filter((user) => user.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus data");
    }
  };

  // Handle Buka Modal Edit
  const openEditModal = (user: User) => {
    setEditingUser({ ...user, password: "" }); // Kosongkan password saat edit
    setIsEditModalOpen(true);
  };

  // Handle Simpan Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser),
      });

      if (!response.ok) throw new Error("Gagal memperbarui pengguna");
      
      // Refresh data
      await fetchUsers();
      setIsEditModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan data");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-sm text-zinc-400 mt-1">Kelola data pengguna dan hak akses sistem.</p>
        </div>
        <button 
          onClick={fetchUsers}
          className="bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
        >
          Refresh Data
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-[#09090b]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-white/[0.02] text-xs uppercase tracking-widest text-zinc-500 border-b border-white/[0.05]">
              <tr>
                <th className="px-6 py-4 font-bold">Nama Lengkap</th>
                <th className="px-6 py-4 font-bold">Email</th>
                <th className="px-6 py-4 font-bold">No. Telepon</th>
                <th className="px-6 py-4 font-bold">Authority</th>
                <th className="px-6 py-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Memuat data...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-rose-500">{error}</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Tidak ada data pengguna.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">{user.phone || "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        user.authority === "Admin" 
                          ? "bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20" 
                          : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                      }`}>
                        {user.authority || "User"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="text-[#00F0FF] hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="text-rose-500 hover:text-rose-400 transition-colors text-xs font-bold uppercase tracking-wider"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#09090b] border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-4">Edit Pengguna</h2>
            
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Nama Lengkap</span>
                <input
                  type="text"
                  required
                  value={editingUser.name || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="rounded-lg border border-white/[0.1] bg-black/50 px-3 py-2.5 text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Email</span>
                <input
                  type="email"
                  required
                  value={editingUser.email || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="rounded-lg border border-white/[0.1] bg-black/50 px-3 py-2.5 text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">No. Telepon</span>
                <input
                  type="tel"
                  value={editingUser.phone || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="rounded-lg border border-white/[0.1] bg-black/50 px-3 py-2.5 text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Authority</span>
                <select
                  value={editingUser.authority || "User"}
                  onChange={(e) => setEditingUser({ ...editingUser, authority: e.target.value })}
                  className="rounded-lg border border-white/[0.1] bg-black/50 px-3 py-2.5 text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all appearance-none"
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Kata Sandi Baru (Opsional)</span>
                <input
                  type="password"
                  value={editingUser.password || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder="Kosongkan jika tidak ingin mengubah"
                  className="rounded-lg border border-white/[0.1] bg-black/50 px-3 py-2.5 text-white focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/50 transition-all placeholder:text-zinc-600"
                />
              </label>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-white/[0.05] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-black px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}