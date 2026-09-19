"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Settings, 
  Trash2, 
  X, 
  FileText, 
  ArrowLeft,
  Calendar,
  History,
  Eye,
  ExternalLink
} from "lucide-react";

interface ProjectJobItem {
  id: string;
  title: string;
  timeRequest: string;
  description: string[];
  workPermit: string[];
  spareparts: string;
  tools: string;
  department?: string;
}

export default function MachineOverviewPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<ProjectJobItem | null>(null);
  const [selectedMachine, setSelectedMachine] = useState("TRANSFER CAR AUTOCLAVE 01");
  
  // State Form Modal Utama (Add / Edit)
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [workPermits, setWorkPermits] = useState({
    hotWork: false,
    workAtHigh: false,
    confinedSpace: false,
    digging: false,
    electrical: false,
  });

  // Data State
  const [jobs, setJobs] = useState<ProjectJobItem[]>([
    {
      id: "1",
      title: "Action PM - TRANSFER CAR AUTOCLAVE 01",
      timeRequest: "2026-07-09 20:53:09",
      description: ["Tarik Kabel dari arah sana kesini", "Cleaning Panel"],
      workPermit: ["Hot Work"],
      spareparts: "AAC-TC-0014",
      tools: "no data",
      department: "Electrical"
    },
    {
      id: "2",
      title: "TRANSFER CAR AUTOCLAVE 01",
      timeRequest: "2026-07-09 18:12:00",
      description: ["Pengecekan roda transfer car", "Greasing bearing utama"],
      workPermit: ["Mechanical Work"],
      spareparts: "BAC-TC-05",
      tools: "no data",
      department: "Mechanical"
    }
  ]);

  // Handle Buka Modal Tambah Data Baru
  const handleOpenAddModal = () => {
    setEditingJobId(null);
    setIsModalOpen(true);
  };

  // Handle Buka Modal Edit Data Terpilih
  const handleOpenEditModal = (job: ProjectJobItem) => {
    setEditingJobId(job.id);
    setJobTitle(job.title);
    setDescription(job.description.join("\n"));
    setDepartment(job.department || "");
    
    setWorkPermits({
      hotWork: job.workPermit.includes("Hot Work"),
      workAtHigh: job.workPermit.includes("Work at High"),
      confinedSpace: job.workPermit.includes("Confined Space"),
      digging: job.workPermit.includes("Digging"),
      electrical: job.workPermit.includes("Electrical"),
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingJobId(null);
    setJobTitle("");
    setDescription("");
    setDepartment("");
    setWorkPermits({
      hotWork: false,
      workAtHigh: false,
      confinedSpace: false,
      digging: false,
      electrical: false,
    });
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPermits = Object.entries(workPermits)
      .filter(([_, checked]) => checked)
      .map(([key]) => {
        const labels: Record<string, string> = {
          hotWork: "Hot Work",
          workAtHigh: "Work at High",
          confinedSpace: "Confined Space",
          digging: "Digging",
          electrical: "Electrical"
        };
        return labels[key];
      });

    if (editingJobId) {
      setJobs(jobs.map(job => job.id === editingJobId ? {
        ...job,
        title: jobTitle,
        description: description.split('\n').filter(line => line.trim() !== ""),
        workPermit: selectedPermits,
        department: department
      } : job));
    } else {
      const newJob: ProjectJobItem = {
        id: Date.now().toString(),
        title: jobTitle || "Untitled Job",
        timeRequest: new Date().toISOString().replace('T', ' ').substring(0, 19),
        description: description.split('\n').filter(line => line.trim() !== ""),
        workPermit: selectedPermits,
        spareparts: "no data",
        tools: "no data",
        department: department
      };
      setJobs([newJob, ...jobs]);
    }
    handleCloseModal();
  };

  const handleDeleteJob = (id: string) => {
    if (confirm("Apakah anda yakin ingin menghapus data job ini?")) {
      setJobs(jobs.filter(job => job.id !== id));
    }
  };

  const handleOpenSettingModal = (job: ProjectJobItem) => {
    setSelectedJob(job);
    setIsSettingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500/30">
      
      {/* Top Navbar Section */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
          <h1 className="text-md font-bold tracking-wider text-slate-800 flex items-center gap-2">
            Overview Machine <span className="text-xs font-mono font-normal text-slate-500">User : 90006(Atikom Imsap)</span>
          </h1>
        </div>
        
        {/* Dropdown Selector */}
        <div className="w-full md:w-80">
          <select 
            value={selectedMachine} 
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 font-mono tracking-wide focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          >
            <option value="TRANSFER CAR AUTOCLAVE 01">TRANSFER CAR AUTOCLAVE 01</option>
            <option value="TRANSFER CAR AUTOCLAVE 02">TRANSFER CAR AUTOCLAVE 02</option>
          </select>
        </div>
      </header>

      {/* Main Grid Layout Dashboard */}
      <main className="p-6 grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* LEFT COLUMN: Machine Information (Span 1) */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm">
            {/* Machine Live Preview Box */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 relative group">
              <div className="w-full h-48 bg-slate-100 rounded overflow-hidden flex items-center justify-center border border-slate-300 relative">
                {/* Fallback pattern / simulated image frame */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-200 to-transparent z-10 opacity-60" />
                <div className="text-center p-4 z-20">
                  <span className="text-xs font-semibold text-slate-600 bg-white/90 px-3 py-1 rounded border border-slate-300 font-mono shadow-sm">
                    [ LIVE PREVIEW CAMERA ]
                  </span>
                  <p className="text-[11px] text-slate-500 mt-2 italic font-mono">Transfer Car Rail System View</p>
                </div>
              </div>
            </div>

            {/* Core Metadata */}
            <div className="p-4 text-center border-b border-slate-200 bg-white">
              <h2 className="text-sm font-bold tracking-wider text-slate-800 uppercase">{selectedMachine}</h2>
              <span className="text-xs font-mono text-slate-500">[AAC-01]</span>
            </div>

            {/* Structured Specs List */}
            <div className="divide-y divide-slate-100 text-xs font-mono">
              <div className="p-3 flex justify-between bg-slate-50">
                <span className="text-slate-600">Area</span>
                <span className="text-teal-600 font-medium">Autoclave</span>
              </div>
              <div className="p-3 flex justify-between bg-white">
                <span className="text-slate-600">Electrical PIC</span>
                <span className="text-slate-800 font-medium">Ahmad Rifai</span>
              </div>
              <div className="p-3 flex justify-between bg-slate-50">
                <span className="text-slate-600">Mechanical PIC</span>
                <span className="text-slate-800 font-medium">Arief Hidayat</span>
              </div>
            </div>

            {/* Machine History Action */}
            <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
              <button className="w-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[11px] py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-all font-medium shadow-sm">
                <History className="w-3.5 h-3.5 text-teal-600" /> Machine History
              </button>
            </div>
          </div>

          {/* Machine Specification Text Area */}
          <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            <div className="bg-teal-50 border-b border-slate-200 px-4 py-2 text-center">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">MC Specification</h3>
            </div>
            <div className="p-4 space-y-3 font-mono text-xs text-slate-600">
              <div>
                <p className="text-slate-500 text-[11px]">1. Asset Number</p>
                <p className="text-slate-800 font-medium pl-2">- SLCI_20101000345</p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px]">2. Location</p>
                <p className="text-slate-800 font-medium pl-2">- Autoclave</p>
              </div>
              <div>
                <p className="text-slate-500 text-[11px]">3. Manufacturer</p>
                <p className="text-slate-800 font-medium pl-2">- As drawing</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Spareparts, PM, Logsheets Dashboard (Span 3) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* TOP BLOCK: Sparepart Condition Analysis Dashboard */}
          <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            <div className="bg-teal-50 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">Sparepart Condition</h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleOpenAddModal}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1 rounded flex items-center gap-1 text-[11px] transition-colors shadow-sm"
                >
                  <Plus className="w-3 h-3" /> Add PM Job
                </button>
              </div>
            </div>
            
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
              {/* Left Side Metrics */}
              <div className="space-y-3 bg-slate-50 p-4 rounded border border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <span className="text-slate-600">Registered Part</span>
                  <span className="text-lg font-bold text-slate-800">47 <span className="text-[10px] font-normal text-slate-500">items</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">New</span>
                  <span className="text-slate-700 font-medium">0.00 %</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mid</span>
                  <span className="text-slate-700 font-medium">0.00 %</span>
                </div>
              </div>

              {/* Right Side Progress Analytics */}
              <div className="space-y-4 bg-slate-50 p-4 rounded border border-slate-200">
                {/* Old Condition Status */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-sm" /> Old
                    </span>
                    <span className="text-blue-600 font-bold">2.13 %</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: "2.13%" }} />
                  </div>
                </div>

                {/* Warning Condition Status */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-sm" /> Warning
                    </span>
                    <span className="text-amber-600 font-bold">2.13 %</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: "2.13%" }} />
                  </div>
                </div>

                {/* Danger Condition Status */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-sm" /> Danger
                    </span>
                    <span className="text-rose-600 font-bold">95.74 %</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full" style={{ width: "95.74%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE BLOCK: PM On This Machine Log Matrix */}
          <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
            <div className="bg-teal-50 border-b border-slate-200 px-4 py-2.5">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wide font-mono">PM ON THIS MACHINE</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                    <th className="p-3 w-16 text-center">No.</th>
                    <th className="p-3 w-40">Code</th>
                    <th className="p-3">MC Name / Job Title</th>
                    <th className="p-3 w-32 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job, idx) => (
                    <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="p-3 font-semibold text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
                        {job.spareparts} <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </td>
                      <td className="p-3">
                        <div className="text-slate-800 font-medium">{job.title}</div>
                        {job.description.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            Task: {job.description.join(" | ")}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleOpenEditModal(job)}
                            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 p-1 rounded transition-all"
                            title="Edit data PM"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleOpenSettingModal(job)}
                            className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 p-1 rounded transition-all"
                            title="Configure parameters"
                          >
                            <Settings className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleDeleteJob(job.id)}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 p-1 rounded transition-all"
                            title="Delete log"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BOTTOM BLOCK: Double Log Section (DT Logsheet & Logbook Program) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* DT Logsheet Table Frame */}
            <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
              <div className="bg-teal-50 border-b border-slate-200 px-4 py-2">
                <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">DT Logsheet</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="p-3">Case Number</th>
                      <th className="p-3">Symptoms</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 text-slate-500 italic text-center" colSpan={2}>No pending records logged</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Logbook Program Table Frame */}
            <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
              <div className="bg-teal-50 border-b border-slate-200 px-4 py-2">
                <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-mono">Logbook Program</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="p-3">ID Log</th>
                      <th className="p-3">Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 text-slate-500 italic text-center" colSpan={2}>No current log history</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* MODAL POP UP 1: ADD / EDIT PROJECT JOB */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 font-mono">
            <div className="px-5 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                  {editingJobId ? "Edit Project Job Parameter" : "Add New PM Matrix Target"}
                </h2>
                <span className="text-[10px] text-slate-500 block mt-0.5">FO-MTN-01-005</span>
              </div>
              <button onClick={handleCloseModal} className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-200 rounded transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveJob}>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-slate-700">
                
                {/* Form Input: Title */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <label className="font-medium text-slate-700 pt-2">Job Title:</label>
                  <div className="md:col-span-3">
                    <textarea
                      rows={2}
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      required
                      placeholder="e.g. Action PM - TRANSFER CAR AUTOCLAVE 01"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-800 resize-none"
                    />
                  </div>
                </div>

                {/* Form Input: Permits */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <label className="font-medium text-slate-700 pt-1">Work Permit:</label>
                  <div className="md:col-span-3 space-y-2 text-[11px] bg-slate-50 p-3 rounded border border-slate-200">
                    {[
                      { id: "hotWork", label: "1. Hot Work" },
                      { id: "workAtHigh", label: "2. Work at High" },
                      { id: "confinedSpace", label: "3. Confined Space" },
                      { id: "digging", label: "4. Digging" },
                      { id: "electrical", label: "5. Electrical" },
                    ].map((permit) => (
                      <div key={permit.id} className="flex items-center justify-between border-b border-slate-200 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-slate-700">{permit.label}</span>
                        <div className="flex items-center gap-4">
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={permit.id}
                              checked={workPermits[permit.id as keyof typeof workPermits] === true}
                              onChange={() => setWorkPermits({ ...workPermits, [permit.id]: true })}
                              className="accent-teal-600 w-3 h-3 bg-white border-slate-300"
                            />
                            <span className="text-slate-600">YES</span>
                          </label>
                          <label className="inline-flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={permit.id}
                              checked={workPermits[permit.id as keyof typeof workPermits] === false}
                              onChange={() => setWorkPermits({ ...workPermits, [permit.id]: false })}
                              className="accent-rose-600 w-3 h-3 bg-white border-slate-300"
                            />
                            <span className="text-slate-600">NO</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Input: Description */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <label className="font-medium text-slate-700 pt-2">Description:</label>
                  <div className="md:col-span-3">
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Gunakan baris baru (Enter) untuk memisahkan list langkah kerja"
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-800"
                    />
                  </div>
                </div>

                {/* Form Input: Department radio context */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <div className="font-medium text-slate-700 pt-1">
                    <div>Added by,</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">90006 (Atikom)</div>
                  </div>
                  <div className="md:col-span-3 grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
                    {["Electrical", "Mechanical", "Production", "Safety"].map((dept) => (
                      <label key={dept} className="flex items-center gap-1.5 cursor-pointer p-1 hover:bg-slate-200 rounded transition-colors">
                        <input
                          type="radio"
                          name="department"
                          value={dept}
                          checked={department === dept}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="accent-teal-600 w-3 h-3"
                        />
                        <span className="text-slate-700">{dept}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 text-xs">
                <button type="button" onClick={handleCloseModal} className="bg-white hover:bg-slate-100 text-slate-700 px-4 py-1.5 rounded border border-slate-300 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-1.5 rounded transition-colors shadow-sm">
                  {editingJobId ? "APPLY" : "COMMIT ADD"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL POP UP 2: SETTING PROJECT JOB */}
      {isSettingModalOpen && selectedJob && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded w-full max-w-5xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col font-mono text-xs">
            
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSettingModalOpen(false)}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1 rounded flex items-center gap-1 text-[11px] transition-colors border border-amber-300"
                >
                  <ArrowLeft className="w-3 h-3 stroke-[3]" /> BACK
                </button>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-slate-500" /> Machine System Tuning Configuration
                </span>
              </div>
              <span className="text-slate-500 text-[10px]">FO-MTN-01-005</span>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-5 bg-slate-50/50 text-slate-800">
              
              {/* Center Panel Array */}
              <div className="lg:col-span-2 space-y-5">
                <div className="bg-white border-l-4 border-l-blue-500 border border-slate-200 rounded p-4 shadow-sm">
                  <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3">Target Machine Core Parameter</h3>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">{selectedJob.title}</div>
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">Request Permit Category:</span> {selectedJob.workPermit.join(", ") || "None"}
                    </div>
                    {selectedJob.description.map((line, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600 font-light pl-2 border-l-2 border-slate-200 mt-1">
                        {idx + 1}. {line}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Spare part Assignment element */}
                  <div className="bg-white border-l-4 border-l-teal-500 border border-slate-200 rounded p-4 shadow-sm">
                    <h3 className="text-[11px] font-bold text-teal-600 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3">Spare Part Registration</h3>
                    <div className="space-y-2">
                      <input type="text" placeholder="Part ID Code" className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                      <div className="flex gap-2">
                        <input type="text" placeholder="Quantity" className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                        <button type="button" className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-3 py-1.5 rounded shrink-0 transition-colors">Register</button>
                      </div>
                    </div>
                  </div>

                  {/* Tools checklist assignment element */}
                  <div className="bg-white border-l-4 border-l-teal-500 border border-slate-200 rounded p-4 shadow-sm">
                    <h3 className="text-[11px] font-bold text-teal-600 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3">Assigned Tool Kits</h3>
                    <div className="space-y-2">
                      <select className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                        <option>Select Calibrated Tool Set</option>
                      </select>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Qty" className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
                        <button type="button" className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-3 py-1.5 rounded shrink-0 transition-colors">Inject</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar parameter mapping */}
              <div className="space-y-5">
                <div className="bg-white border-l-4 border-l-amber-500 border border-slate-200 rounded p-4 shadow-sm">
                  <h3 className="text-[11px] font-bold text-amber-600 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-2">Time Settings</h3>
                  <div className="space-y-2 text-slate-600 text-[11px]">
                    <div>Machine Cycle: Non-Repeater Type</div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span>Schedule Calendar Anchor Point</span>
                      <button type="button" className="bg-white border border-slate-300 hover:bg-slate-100 px-2 py-1 rounded text-[10px] flex items-center gap-1 text-slate-700 transition-colors">
                        <Calendar className="w-3 h-3 text-slate-500" /> Plan Target
                      </button>
                    </div>
                    <div className="pt-2">Duration Parameter Config:</div>
                    <div className="flex rounded overflow-hidden border border-slate-300 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500">
                      <input type="text" placeholder="In minutes (e.g. 60)" className="w-full bg-white px-2.5 py-1.5 text-slate-800 focus:outline-none" />
                      <button type="button" className="bg-teal-600 hover:bg-teal-700 px-3 flex items-center justify-center transition-colors"><Settings className="w-3.5 h-3.5 text-white" /></button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onClick={() => setIsSettingModalOpen(false)} className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-1.5 rounded transition-colors">
                Close Configuration Matrix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}