"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  title: string;
  desc: string;
  price: number;
  img: string;
  badge?: string;
  category: string;
}

type Cart = Record<number, number>;

// ─── Data ─────────────────────────────────────────────────────────────────────
const enterpriseProducts: Product[] = [
  { id: 1,  title: "Industrial Sensor",      category: "Industrial IoT", price: 500000,  badge: "Hardware",      img: "/assets/img/sensor_iot.png",     desc: "Temperature, Pressure, Flow, Vibration dan Energy Monitoring Sensor." },
  { id: 2,  title: "IoT Gateway",            category: "Industrial IoT", price: 2500000, badge: "Edge Device",   img: "/assets/img/power_iot.png",       desc: "Protocol converter Modbus, MQTT, OPC-UA dan Edge Computing." },
  { id: 3,  title: "Smart Logger",           category: "Industrial IoT", price: 1800000, badge: "Data Logger",   img: "/assets/img/boiler_iot.png",      desc: "Realtime data logging untuk utility dan production monitoring." },
  { id: 4,  title: "Dashboard Analytics",    category: "Industrial IoT", price: 1500000, badge: "Software",      img: "/assets/img/abnormality_iot.png", desc: "OEE, Energy Monitoring, Production Monitoring Dashboard." },
  { id: 5,  title: "HR Payroll System",      category: "ERP",            price: 2500000, badge: "ERP",           img: "/assets/img/hr.png",              desc: "Attendance, Payroll, Leave Management." },
  { id: 6,  title: "SHEE Management",        category: "ERP",            price: 2200000, badge: "Safety",        img: "/assets/img/shee.png",            desc: "Permit To Work, Safety Inspection, Incident Reporting." },
  { id: 7,  title: "Warehouse System",       category: "ERP",            price: 3200000, badge: "WMS",           img: "/assets/img/warehouse.png",       desc: "Stock Control, FIFO, Inventory Monitoring." },
  { id: 8,  title: "Production Management",  category: "ERP",            price: 4000000, badge: "Manufacturing", img: "/assets/img/production.png",      desc: "Production Planning dan Daily Production Monitoring." },
  { id: 9,  title: "RTU Monitoring",         category: "Maintenance",    price: 2500000, badge: "RTU",           img: "/assets/img/rtu.png",             desc: "Remote Terminal Unit Monitoring dan Alarm." },
  { id: 10, title: "Maintenance Cost",       category: "Maintenance",    price: 2200000, badge: "Cost",          img: "/assets/img/maintenance.png",     desc: "Analisa biaya maintenance asset dan equipment." },
  { id: 11, title: "Time Based Maintenance", category: "Maintenance",    price: 2500000, badge: "CMMS",          img: "/assets/img/maintenance2.png",    desc: "Preventive maintenance schedule otomatis." },
  { id: 12, title: "Agent Workflow",         category: "RPA",            price: 3500000, badge: "Automation",    img: "/assets/img/rpa.png",             desc: "Workflow automation menggunakan AI Agent dan RPA." },
];

const mahasiswaProducts: Product[] = [
  { id: 101, title: "IoT Starter Kit",  category: "Industrial IoT", price: 299000, badge: "Starter",    img: "/assets/img/sensor_iot.png", desc: "Paket lengkap IoT untuk pembelajaran: sensor dasar, konektivitas MQTT, dan dashboard sederhana." },
  { id: 102, title: "Gateway Learning", category: "Industrial IoT", price: 499000, badge: "Edge Lite",  img: "/assets/img/power_iot.png",  desc: "Gateway versi edukasi: Modbus, MQTT, dengan panduan implementasi proyek tugas akhir." },
  { id: 103, title: "Mini Logger",      category: "Industrial IoT", price: 350000, badge: "Logger Edu", img: "/assets/img/boiler_iot.png", desc: "Data logger ringan untuk proyek riset dan laporan monitoring utilitas kampus." },
];

const allProducts = [...enterpriseProducts, ...mahasiswaProducts];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const totalItems = (cart: Cart) => Object.values(cart).reduce((a, b) => a + b, 0);
const totalPrice = (cart: Cart) =>
  allProducts.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0);

// ─── ProductCard ──────────────────────────────────────────────────────────────
function ProductCard({
  product, qty, onAdd, onRemove,
}: {
  product: Product; qty: number; onAdd: () => void; onRemove: () => void;
}) {
  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">

      {/* ── Image ── */}
      <div className="relative bg-slate-50 flex items-center justify-center h-44 shrink-0 overflow-hidden">
        {product.badge && (
          <span className="absolute top-3 left-3 z-10 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide">
            {product.badge}
          </span>
        )}
        <span className="absolute top-3 right-3 bg-white text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-gray-200">
          {product.category}
        </span>
        <Image
          src={product.img}
          alt={product.title}
          width={96}
          height={96}
          className="object-contain drop-shadow transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = ""; }}
        />
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex-1">
          <h3 className="text-[13px] font-bold text-gray-900 leading-snug mb-1 group-hover:text-blue-600 transition-colors">
            {product.title}
          </h3>
          <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-2">
            {product.desc}
          </p>
        </div>

        {/* ── Price + Action ── */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-[10px] font-medium text-gray-400 mb-0.5 uppercase tracking-wide">Harga Lisensi / Bln</p>
          <p className="text-base font-extrabold text-blue-600 mb-2.5">{fmt(product.price)}</p>

          {qty > 0 ? (
            <div className="flex items-center justify-between h-9 bg-blue-50 border border-blue-200 rounded-xl px-1">
              <button
                onClick={onRemove}
                className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-blue-600 text-base font-bold leading-none hover:bg-gray-50 transition flex items-center justify-center shadow-sm"
                aria-label="Kurangi"
              >−</button>
              <span className="text-xs font-bold text-blue-800">{qty} Lisensi</span>
              <button
                onClick={onAdd}
                className="w-7 h-7 rounded-lg bg-blue-600 text-white text-base font-bold leading-none hover:bg-blue-700 transition flex items-center justify-center"
                aria-label="Tambah"
              >+</button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[.98] text-white text-xs font-semibold tracking-wide transition"
            >
              + Tambah ke Keranjang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CatalogSection ───────────────────────────────────────────────────────────
function CatalogSection({
  emoji, title, products, cart, onAdd, onRemove,
}: {
  emoji: string; title: string; products: Product[];
  cart: Cart; onAdd: (id: number) => void; onRemove: (id: number) => void;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-blue-600">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <span>{emoji}</span>{title}
        </h2>
        <span className="text-[11px] text-gray-400 font-medium bg-gray-100 px-2.5 py-0.5 rounded-full">
          {products.length} modul
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            qty={cart[p.id] || 0}
            onAdd={() => onAdd(p.id)}
            onRemove={() => onRemove(p.id)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── CartSidebar ──────────────────────────────────────────────────────────────
function CartSidebar({ cart, onCheckout }: { cart: Cart; onCheckout: () => void }) {
  const total = totalItems(cart);
  const price = totalPrice(cart);

  return (
    <aside className="sticky top-6 w-full">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500">
          <div className="flex items-center gap-2">
            <span className="text-white text-base">🛒</span>
            <h3 className="text-sm font-bold text-white">Keranjang Belanja</h3>
          </div>
          <span className="min-w-[22px] text-center bg-white text-blue-600 text-xs font-extrabold px-2 py-0.5 rounded-full">
            {total}
          </span>
        </div>

        {/* Empty */}
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-5 text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl">🛒</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Keranjang masih kosong.<br />Pilih modul dari etalase.
            </p>
          </div>
        ) : (
          <>
            {/* Item list */}
            <ul className="max-h-60 overflow-y-auto divide-y divide-gray-100 px-4 py-2
              scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {allProducts.map((p) => {
                const q = cart[p.id] || 0;
                if (!q) return null;
                return (
                  <li key={p.id} className="flex items-start gap-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-base">
                      📦
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 truncate leading-tight">{p.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{q}× {fmt(p.price)}</p>
                    </div>
                    <span className="text-[12px] font-bold text-gray-700 shrink-0 pt-0.5">{fmt(p.price * q)}</span>
                  </li>
                );
              })}
            </ul>

            {/* Summary */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Jumlah modul</span>
                <span className="font-medium text-gray-700">{total} modul</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>PPN</span>
                <span className="font-medium text-gray-700">0%</span>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-dashed border-gray-200">
              <span className="text-sm font-bold text-gray-800">Total</span>
              <span className="text-lg font-extrabold text-blue-600">{fmt(price)}</span>
            </div>
          </>
        )}

        {/* Checkout */}
        <div className="px-4 pb-4 pt-1">
          <button
            onClick={onCheckout}
            disabled={total === 0}
            className={`w-full h-11 rounded-xl text-sm font-bold tracking-wide transition-all
              ${total > 0
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-[.98] cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
          >
            {total > 0 ? "⚡ Check Out Sekarang" : "Keranjang Kosong"}
          </button>

          {total > 0 && (
            <p className="text-center text-[11px] text-gray-400 mt-2">
              Harga berlaku per bulan per lisensi
            </p>
          )}
        </div>

        {/* Back link */}
        <div className="px-4 pb-4 text-center border-t border-gray-100 pt-3">
          <Link href="/" className="text-[11px] text-blue-500 hover:text-blue-700 hover:underline transition">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </aside>
  );
}

// ─── ServicePackages ──────────────────────────────────────────────────────────
function ServicePackages() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-bold tracking-widest uppercase mb-4">
            Service Package
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            Pilih Model Implementasi
            <span className="text-blue-600 block mt-0.5">Sesuai Kebutuhan Bisnis Anda</span>
          </h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">
            TERIOT menyediakan dua skema implementasi yang fleksibel — pembelian sistem penuh (On-Premise)
            hingga model Subscription yang lebih ringan dan scalable.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* On-Premise */}
          <div className="bg-white rounded-3xl border border-gray-200 p-8 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl mb-4">🖥️</div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-1">On-Premise</p>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Pembelian Sistem Sekali Bayar</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              Solusi ideal bagi perusahaan yang ingin memiliki kontrol penuh terhadap data, server, dan infrastruktur secara internal.
            </p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-green-600 mb-2">✦ Keunggulan</p>
            <ul className="space-y-1.5 mb-4">
              {["Kepemilikan sistem sepenuhnya.","Data tersimpan di lingkungan internal.","Tidak ada biaya langganan bulanan.","Kustomisasi lebih fleksibel."].map(i => (
                <li key={i} className="flex gap-2 text-sm text-gray-600"><span className="text-green-500 shrink-0">✔</span>{i}</li>
              ))}
            </ul>
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-600 mb-2">⚠ Pertimbangan</p>
            <ul className="space-y-1.5">
              {["Investasi awal lebih besar.","Membutuhkan infrastruktur server dan IT internal.","Pengelolaan menjadi tanggung jawab perusahaan."].map(i => (
                <li key={i} className="flex gap-2 text-sm text-gray-600"><span className="text-amber-500 shrink-0">ℹ</span>{i}</li>
              ))}
            </ul>
          </div>

          {/* Subscription */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl mb-4">☁️</div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-100 mb-1">Subscription</p>
            <h3 className="text-xl font-bold mb-2">Cloud &amp; Managed Service</h3>
            <p className="text-sm text-blue-100 leading-relaxed mb-5">
              Solusi modern dengan biaya awal yang lebih ringan. TERIOT menangani infrastruktur, update sistem, dan monitoring.
            </p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-2">✦ Keunggulan</p>
            <ul className="space-y-1.5 mb-4">
              {["Investasi awal lebih rendah.","Update dan maintenance ditangani TERIOT.","Implementasi lebih cepat.","Scalable sesuai pertumbuhan bisnis."].map(i => (
                <li key={i} className="flex gap-2 text-sm text-white/85"><span className="text-white/50 shrink-0">✔</span>{i}</li>
              ))}
            </ul>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-2">⚠ Pertimbangan</p>
            <ul className="space-y-1.5">
              {["Memiliki biaya langganan berkala.","Bergantung pada koneksi internet."].map(i => (
                <li key={i} className="flex gap-2 text-sm text-white/85"><span className="text-white/50 shrink-0">ℹ</span>{i}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center mt-12">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Yakin Memilih Paket?</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
            Konsultasikan kebutuhan bisnis Anda dan coba platform TERIOT sebelum memutuskan implementasi penuh.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 hover:-translate-y-px hover:shadow-lg transition-all"
          >
            🚀 Dapatkan Coba Gratis
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ShopPage() {
  const [cart, setCart] = useState<Cart>({});

  const add = (id: number) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const remove = (id: number) => setCart(prev => {
    const next = { ...prev };
    if ((next[id] || 0) <= 1) delete next[id]; else next[id]--;
    return next;
  });

  const checkout = () => {
    const n = totalItems(cart);
    if (!n) { alert("Keranjang belanja Anda masih kosong!"); return; }
    const lines = allProducts.filter(p => cart[p.id])
      .map(p => `  • ${p.title} (${cart[p.id]}×) = ${fmt(p.price * cart[p.id])}`).join("\n");
    alert(`✅ Checkout Berhasil!\n\nModul dipesan:\n${lines}\n\n────────────────────\nTotal: ${fmt(totalPrice(cart))}\n\nTerima kasih telah memilih TERIOT!`);
    setCart({});
  };

  return (
    <div className="min-h-screen bg-gray-50 antialiased text-gray-900">

      {/* ── Hero ── */}
      <section
        className="relative text-white py-16 px-6 text-center overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0d3b72 0%,#185fa5 60%,#378add 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 70% 50%,rgba(99,178,255,.18) 0%,transparent 70%)" }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-[13px] text-blue-100 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full mb-5 backdrop-blur-sm">
            🛒 ERP Digital Module Store
          </div>
          <h1 className="text-4xl lg:text-[2.8rem] font-extrabold leading-tight tracking-tight mb-4">
            Pilih Modul <span className="text-[#93c8ff]">Sesuai Kebutuhan</span> Bisnis Anda
          </h1>
          <p className="text-white/75 text-base leading-relaxed max-w-lg mx-auto">
            Transformasikan operasional perusahaan secara modular. Aktifkan kapan saja, integrasi instan, tanpa biaya setup tersembunyi.
          </p>
        </div>
      </section>

      {/* ── Service Packages ── */}
      <ServicePackages />

      <div className="border-t border-gray-200" />

      {/* ── Shop Layout ── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-10">

        {/* ── 2-column layout: catalog | cart ── */}
        <div className="flex flex-col xl:flex-row gap-8 items-start">

          {/* LEFT — Catalog */}
          <div className="flex-1 min-w-0">
            <CatalogSection
              emoji="🏭" title="Modul Enterprise"
              products={enterpriseProducts}
              cart={cart} onAdd={add} onRemove={remove}
            />
            <CatalogSection
              emoji="🎓" title="Modul Mahasiswa (Ready to Use)"
              products={mahasiswaProducts}
              cart={cart} onAdd={add} onRemove={remove}
            />
          </div>

          {/* RIGHT — Cart */}
          <div className="w-full xl:w-[300px] shrink-0">
            <CartSidebar cart={cart} onCheckout={checkout} />
          </div>

        </div>
      </div>
    </div>
  );
}