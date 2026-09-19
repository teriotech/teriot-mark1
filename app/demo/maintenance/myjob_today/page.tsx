"use client";

import React, { useState, useEffect } from "react";

// Struktur data dummy untuk tabel agar sesuai dengan screenshot
interface TaskEntry {
  no: number;
  waktu: string;
  jobDescription: string;
  team: string;
  submitReport: string;
}

export default function MyTaskTodayPage() {
  const [entriesPerPage, setEntriesPerPage] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // --- BAGIAN YANG DITAMBAHKAN: State untuk User Login ---
  const [userName, setUserName] = useState<string>("Memuat...");
  const [userRole, setUserRole] = useState<string>("Memuat...");

  useEffect(() => {
    // Mengambil data user dari localStorage saat komponen dimuat
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Menggunakan Full Name (name) dan Role (authority) dari layout.tsx
          setUserName(parsedUser.name || "Unknown User");
          setUserRole(parsedUser.authority || "User");
        } catch (error) {
          console.error("Gagal membaca data user", error);
          setUserName("Unknown User");
          setUserRole("User");
        }
      } else {
        setUserName("Unknown User");
        setUserRole("User");
      }
    }
  }, []);
  // -------------------------------------------------------

  // Data dummy (bisa dikosongkan `[]` jika ingin persis memunculkan "No data available in table")
  const [tasks, setTasks] = useState<TaskEntry[]>([]);

  // Filter data berdasarkan search query
  const filteredTasks = tasks.filter((task) =>
    task.jobDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 text-slate-900">

      {/* Title Bar Utama */}
      <div className="w-full border-b border-slate-200 pb-4 mb-6 flex items-baseline gap-2">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          My Task <span className="text-slate-400 font-medium text-lg sm:text-xl">(0)</span>
        </h2>
        <span className="text-xs sm:text-sm text-slate-500 font-mono">
          User: <span className="text-teal-600 font-semibold">{userName}</span> | Role: <span className="text-teal-600 font-semibold">{userRole}</span>
        </span>
      </div>

      {/* Main Container */}
      <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">

        {/* Glow Effect Background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-teal-400/10 blur-[80px] rounded-full pointer-events-none"></div>

        {/* SECTION: My JOB Today Dashboard */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="border border-slate-200 rounded-3xl bg-slate-50 p-6 sm:p-8 shadow-inner">
            <h3 className="text-center text-lg sm:text-xl font-extrabold tracking-wide text-slate-900 uppercase mb-6">
              My JOB Today
            </h3>

            <div className="space-y-4 font-mono text-sm">
              {/* Custom Job */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="px-3 py-1 bg-slate-100 text-teal-700 border border-slate-300 rounded-md text-xs font-bold uppercase tracking-wider">
                  Custom Job
                </span>
                <span className="text-lg font-bold text-slate-900">0</span>
              </div>

              {/* Routine Job */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-md text-xs font-bold uppercase tracking-wider">
                  Routine Job
                </span>
                <span className="text-lg font-bold text-slate-900">0</span>
              </div>

              {/* PM (Weekly & Monthly) */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-300 rounded-md text-xs font-bold uppercase tracking-wider">
                  PM (Weekly & Monthly)
                </span>
                <span className="text-lg font-bold text-slate-900">0</span>
              </div>

              {/* Overhaul Yearly */}
              <div className="flex justify-between items-center pt-1">
                <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-300 rounded-md text-xs font-bold uppercase tracking-wider">
                  Overhaul Yearly
                </span>
                <span className="text-lg font-bold text-slate-900">0</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION: Data Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 text-xs font-medium">
          {/* Entries Controller */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => setEntriesPerPage(Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-teal-500 transition-colors"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-500">entries</span>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Search:</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-teal-500 transition-colors placeholder:text-slate-400 w-full sm:w-48"
              placeholder="Cari tugas..."
            />
          </div>
        </div>

        {/* SECTION: Interactive Responsive Table */}
        <div className="w-full overflow-x-auto border border-slate-200 rounded-3xl bg-white">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider select-none">
                <th className="p-4 border-r border-slate-200 w-16 text-center">
                  <div className="flex items-center justify-center gap-1 cursor-pointer text-slate-800 hover:text-teal-600">
                    No. <span>⇅</span>
                  </div>
                </th>
                <th className="p-4 border-r border-slate-200 w-32">
                  <div className="flex items-center gap-1 cursor-pointer text-slate-800 hover:text-teal-600">
                    Waktu <span>⇅</span>
                  </div>
                </th>
                <th className="p-4 border-r border-slate-200">
                  <div className="flex items-center gap-1 cursor-pointer text-slate-800 hover:text-teal-600">
                    Job & Description <span>⇅</span>
                  </div>
                </th>
                <th className="p-4 border-r border-slate-200 w-40">
                  <div className="flex items-center gap-1 cursor-pointer text-slate-800 hover:text-teal-600">
                    Team <span>⇅</span>
                  </div>
                </th>
                <th className="p-4 w-40 text-center">
                  <div className="flex items-center justify-center gap-1 cursor-pointer text-slate-800 hover:text-teal-600">
                    Submit Report <span>⇅</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <tr key={task.no} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-center font-mono border-r border-slate-100 text-slate-600">{task.no}</td>
                    <td className="p-4 font-mono border-r border-slate-100 text-slate-800">{task.waktu}</td>
                    <td className="p-4 border-r border-slate-100 text-slate-800">{task.jobDescription}</td>
                    <td className="p-4 border-r border-slate-100 text-slate-800">{task.team}</td>
                    <td className="p-4 text-center text-slate-800">{task.submitReport}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic tracking-wide">
                    No data available in table
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SECTION: Pagination Footer */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-medium text-slate-500">
          <div>
            Showing {filteredTasks.length} to {filteredTasks.length} of {filteredTasks.length} entries
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              disabled
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-l-lg text-slate-400 cursor-not-allowed select-none"
            >
              Previous
            </button>
            <button
              disabled
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-r-lg text-slate-400 cursor-not-allowed select-none"
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}