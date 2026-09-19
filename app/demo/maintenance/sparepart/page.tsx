"use client";

import React, { useMemo, useState } from "react";
import { Search, Plus, Edit3, Trash2, X } from "lucide-react";

interface SparepartItem {
  id: string;
  name: string;
  qty: string;
  unit: string;
  location: string;
  status: string;
  description: string;
  category: string;
}

const initialItems: SparepartItem[] = [
  {
    id: "1",
    name: "8.2561.2 ECO-DRAIN 30 WA95-240VAC",
    qty: "0.00",
    unit: "UNIT",
    location: "Loker B1",
    status: "New",
    description: "Autodrain Air Dryer [Non-Stock]",
    category: "Mechanical",
  },
  {
    id: "2",
    name: "Adaptor 12V 3A connector bulat",
    qty: "5.00",
    unit: "PC",
    location: "Lemari 1 Rack 5",
    status: "New",
    description: "[Non-Stock]",
    category: "Electrical",
  },
  {
    id: "3",
    name: "Adaptor 5V 2A connector bulat",
    qty: "4.00",
    unit: "PC",
    location: "Lemari 1 Rack 5",
    status: "New",
    description: "[Non-Stock]",
    category: "Electrical",
  },
  {
    id: "4",
    name: "Adaptor Raspberry Pi",
    qty: "9.00",
    unit: "PC",
    location: "Lemari 1 Rack 2",
    status: "New",
    description: "[Non-Stock]",
    category: "Electrical",
  },
  {
    id: "5",
    name: "Adaptor Switch HUB",
    qty: "1.00",
    unit: "PC",
    location: "Lemari 1 Rack 3",
    status: "New",
    description: "[Non-Stock]",
    category: "Electrical",
  },
  {
    id: "6",
    name: "Air Duster Tekiro AT-BG 1628",
    qty: "0.00",
    unit: "PC",
    location: "Toolkeeper",
    status: "New",
    description: "Cleaning Grate [Non-Stock]",
    category: "Mechanical",
  },
  {
    id: "7",
    name: "Air Filter 6.4139.1",
    qty: "1.00",
    unit: "PC",
    location: "Ruang Compressor",
    status: "Good",
    description: "[Non-Stock]",
    category: "Mechanical",
  },
  {
    id: "8",
    name: "Air Operated Pinch Valve VF065, 2 1/2\"",
    qty: "1.00",
    unit: "PC",
    location: "Tool keeper",
    status: "New",
    description: "Mortar Machine [Non-Stock]",
    category: "Pneumatic",
  },
  {
    id: "9",
    name: "Amplas AA320",
    qty: "1.00",
    unit: "ROL",
    location: "Atas Lemari 2",
    status: "New",
    description: "Untuk Carbon Brush Ball Mill [Non-Stock]",
    category: "Abrasive",
  },
  {
    id: "10",
    name: "AN22",
    qty: "1.00",
    unit: "PC",
    location: "Loker B2",
    status: "Good",
    description: "[Non-Stock]",
    category: "Mechanical",
  },
];

const categories = [
  "All",
  "Mechanical",
  "Electrical",
  "Pneumatic",
  "Abrasive",
];

const statusOptions = ["New", "Good", "Used", "Damaged"];

export default function SparepartPage() {
  const [items, setItems] = useState<SparepartItem[]>(initialItems);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SparepartItem | null>(null);

  const [editCategory, setEditCategory] = useState("");
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.location.toLowerCase().includes(search.toLowerCase()) ||
        item.status.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [category, search, items]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const handleEdit = (item: SparepartItem) => {
    setSelectedItem(item);
    setEditCategory(item.category);
    setEditName(item.name);
    setEditQty(item.qty);
    setEditUnit(item.unit);
    setEditLocation(item.location);
    setEditStatus(item.status);
    setEditDescription(item.description);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setSelectedItem(null);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItem) {
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              category: editCategory,
              name: editName,
              qty: editQty,
              unit: editUnit,
              location: editLocation,
              status: editStatus,
              description: editDescription,
            }
          : item
      )
    );
    closeEditModal();
  };

  const handleDelete = (item: SparepartItem) => {
    if (confirm(`Delete sparepart ${item.name}?`)) {
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-teal-500/25 px-4 py-6 w-full">
      <div className="w-full space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          
          {/* Header & Search */}
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between border-b border-slate-200">
            <div>
              <h1 className="text-lg font-semibold tracking-wide text-slate-800">Sparepart Non-Store</h1>
              <p className="text-xs text-slate-500 mt-1">90006(Atikom Imsap)</p>
            </div>

            <form onSubmit={handleSearch} className="grid w-full gap-3 md:grid-cols-[240px_1fr_auto] md:items-end md:gap-3">
              <label className="block">
                <span className="sr-only">Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-500 shadow-sm"
                >
                  {categories.map((option) => (
                    <option key={option} value={option} className="bg-white text-slate-700">
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block w-full">
                <span className="sr-only">Search sparepart</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder="search...."
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-teal-500 shadow-sm"
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 shadow-sm"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </form>
          </div>

          {/* Toolbar */}
          <div className="px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-600 font-medium">Showing {filteredItems.length} of {items.length} entries</div>
            <button className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 shadow-sm">
              <Plus className="h-4 w-4" />
              Sparepart
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-xs uppercase tracking-[0.2em] text-slate-600">
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-200 font-semibold">No.</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-200 font-semibold">Part/Device Name</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-200 font-semibold">Qty</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-200 font-semibold">Unit</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-200 font-semibold">Location</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-200 font-semibold">Status/Condition</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-200 font-semibold">Keterangan</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-200 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-4 py-3 border border-slate-200 text-slate-600 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-800 font-medium">{item.name}</td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700">{item.qty}</td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700">{item.unit}</td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700">{item.location}</td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700">{item.status}</td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700">{item.description}</td>
                    <td className="px-4 py-3 border border-slate-200 text-slate-700">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-sky-600 transition hover:bg-slate-50 shadow-sm"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-transparent bg-rose-500 text-white transition hover:bg-rose-600 shadow-sm"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 italic">
                      No sparepart found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 font-medium">
            Showing 1 to {filteredItems.length} of {items.length} entries
          </div>
        </div>
      </div>

      {/* MODAL EDIT */}
      {isEditOpen && selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-800">Edit Sparepart</h2>
                <p className="text-xs text-slate-500 mt-0.5">Update sparepart details before saving</p>
              </div>
              <button
                onClick={closeEditModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-100 shadow-sm"
                aria-label="Close edit modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  Category:
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 shadow-sm font-normal"
                  >
                    {categories.filter((item) => item !== "All").map((option) => (
                      <option key={option} value={option} className="bg-white text-slate-800">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  Part / Device Name:
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 shadow-sm font-normal"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  Quantity:
                  <input
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 shadow-sm font-normal"
                  />
                </label>

                <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  Unit:
                  <input
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 shadow-sm font-normal"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  Location:
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 shadow-sm font-normal"
                  />
                </label>

                <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                  Condition / Status:
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 shadow-sm font-normal"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option} className="bg-white text-slate-800">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                Keterangan:
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500 shadow-sm font-normal"
                />
              </label>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}