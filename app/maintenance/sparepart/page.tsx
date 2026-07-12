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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500/25 px-4 py-6">
      <div className="max-w-full mx-auto space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between border-b border-slate-800">
            <div>
              <h1 className="text-lg font-semibold tracking-wide text-slate-100">Sparepart Non-Store</h1>
              <p className="text-xs text-slate-500 mt-1">90006(Atikom Imsap)</p>
            </div>

            <form onSubmit={handleSearch} className="grid w-full gap-3 md:grid-cols-[240px_1fr_auto] md:items-end md:gap-3">
              <label className="block">
                <span className="sr-only">Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-teal-400"
                >
                  {categories.map((option) => (
                    <option key={option} value={option} className="bg-slate-900 text-slate-100">
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
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-400"
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-500"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </form>
          </div>

          <div className="px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-800 bg-slate-950/70">
            <div className="text-sm text-slate-400">Showing {filteredItems.length} of {items.length} entries</div>
            <button className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
              <Plus className="h-4 w-4" />
              Sparepart
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-sky-700 text-left text-xs uppercase tracking-[0.2em] text-slate-100">
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-800">No.</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-800">Part/Device Name</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-800">Qty</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-800">Unit</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-800">Location</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-800">Status/Condition</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-800">Keterangan</th>
                  <th className="whitespace-nowrap px-4 py-3 border border-slate-800">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? "bg-slate-950" : "bg-slate-900"}>
                    <td className="px-4 py-3 border border-slate-800 text-slate-300">{index + 1}</td>
                    <td className="px-4 py-3 border border-slate-800 text-slate-100">{item.name}</td>
                    <td className="px-4 py-3 border border-slate-800 text-slate-300">{item.qty}</td>
                    <td className="px-4 py-3 border border-slate-800 text-slate-300">{item.unit}</td>
                    <td className="px-4 py-3 border border-slate-800 text-slate-300">{item.location}</td>
                    <td className="px-4 py-3 border border-slate-800 text-slate-300">{item.status}</td>
                    <td className="px-4 py-3 border border-slate-800 text-slate-300">{item.description}</td>
                    <td className="px-4 py-3 border border-slate-800 text-slate-300">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-700 bg-slate-800 text-sky-300 transition hover:bg-slate-700"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-700 bg-rose-600 text-white transition hover:bg-rose-500"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-500">
            Showing 1 to {filteredItems.length} of {items.length} entries
          </div>
        </div>
      </div>

      {isEditOpen && selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
          <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950">
            <div className="flex items-center justify-between rounded-t-xl border-b border-slate-700 bg-sky-700 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-100">Edit Sparepart</h2>
                <p className="text-xs text-slate-200/80">Update sparepart details before saving</p>
              </div>
              <button
                onClick={closeEditModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded bg-slate-800 text-slate-100 transition hover:bg-slate-700"
                aria-label="Close edit modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-200">
                  Category:
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                  >
                    {categories.filter((item) => item !== "All").map((option) => (
                      <option key={option} value={option} className="bg-slate-900 text-slate-100">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-200">
                  Part / Device Name:
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-200">
                  Quantity:
                  <input
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                  />
                </label>

                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-200">
                  Unit:
                  <input
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-200">
                  Location:
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                  />
                </label>

                <label className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-200">
                  Condition / Status:
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option} className="bg-slate-900 text-slate-100">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-200">
                Keterangan:
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-400"
                />
              </label>

              <div className="flex flex-col gap-3 border-t border-slate-700 pt-4 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="inline-flex items-center justify-center rounded border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
