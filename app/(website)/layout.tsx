import "../globals.css";
import Script from "next/script";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TRANSINDO MULTI INDUSTRI - Your Best Valuable Partner",
  description:
    "Solusi Industrial IoT, ERP Digital, Maintenance Management, dan RPA terbaik di Indonesia.",
  icons: {
    icon: "/favicon.ico",
  },
};

/* ===== Data navigasi & footer (satu sumber, dipakai di header dan footer) ===== */
const PRODUCT_LINKS = [
  { href: "/product_GMES", label: "Industrial IoT", footerLabel: "IoT TERIOT Technology System" },
  { href: "/product_GMMS", label: "Maintenance Smart", footerLabel: "Maintenance SMART System" },
  { href: "/product_GERP", label: "ERP Digital", footerLabel: "ERP Digital Application" },
  { href: "/product_RPA", label: "RPA", footerLabel: "Robotic Process Automation" },
];

const USEFUL_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Tentang Kami" },
  { href: "/gallery", label: "Proyek" },
  { href: "/contact", label: "Kontak" },
  { href: "/demo", label: "Request Demo" },
];

const WHATSAPP_NUMBER = "6281329072842";
const WHATSAPP_DISPLAY = "+62 813-2907-2842";
const SALES_EMAIL = "sales@transindomu.com";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <html lang="id">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700|Jost:300,400,500,600,700|Poppins:300,400,500,600,700&display=swap"
          rel="stylesheet"
        />

        {/* Vendor CSS */}
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/assets/vendor/aos/aos.css" />
        <link rel="stylesheet" href="/assets/vendor/bootstrap/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/assets/vendor/bootstrap-icons/bootstrap-icons.css" />
        <link rel="stylesheet" href="/assets/vendor/boxicons/css/boxicons.min.css" />
        <link rel="stylesheet" href="/assets/vendor/glightbox/css/glightbox.min.css" />
        <link rel="stylesheet" href="/assets/vendor/swiper/swiper-bundle.min.css" />

        {/* Main CSS */}
        <link rel="stylesheet" href="/assets/css/style.css" />
      </head>

      <body>
        {/* ===== HEADER ===== */}
        <header id="header" className="fixed-top">
          <div className="container d-flex align-items-center">
            <Link href="/" className="logo me-auto" aria-label="Beranda TRANSINDO">
              <img src="/assets/img/transindo_logo2.png" alt="TRANSINDO" />
            </Link>

            <nav id="navbar" className="navbar">
              <ul>
                <li>
                  <Link href="/" className="nav-link">
                    Home
                  </Link>
                </li>

                <li className="dropdown">
                  {/* Tombol dropdown: pakai <a> biasa agar tidak memicu navigasi Next.js ke "#" */}
                  <a href="#" aria-haspopup="true">
                    <span>Produk</span>
                    <i className="bi bi-chevron-down" aria-hidden="true"></i>
                  </a>
                  <ul>
                    {PRODUCT_LINKS.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href}>{item.label}</Link>
                      </li>
                    ))}
                  </ul>
                </li>

                <li>
                  <Link href="/about" className="nav-link">
                    Tentang Kami
                  </Link>
                </li>

                <li>
                  <Link href="/gallery" className="nav-link">
                    Proyek
                  </Link>
                </li>

                <li>
                  <Link href="/contact" className="nav-link">
                    Kontak
                  </Link>
                </li>

                <li>
                  <Link href="/demo" className="getstarted inline-flex items-center gap-2">
                    <i className="ri-shopping-cart-2-line" aria-hidden="true"></i>
                    Request Demo
                  </Link>
                </li>
              </ul>

              <i
                className="bi bi-list mobile-nav-toggle"
                role="button"
                aria-label="Buka menu navigasi"
              ></i>
            </nav>
          </div>
        </header>

        {/* ===== PAGE CONTENT ===== */}
        <main>{children}</main>

        {/* ===== FOOTER ===== */}
        <footer id="footer" className="bg-slate-900 text-slate-300">
          {/* Newsletter / CTA Demo */}
          <div className="border-b border-white/10">
            <div className="container mx-auto px-5 md:px-6 py-14 md:py-16">
              <div className="max-w-3xl mx-auto text-center">
                <h4 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  Ada Pertanyaan?
                </h4>
                <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8">
                  Tinggalkan email Anda, tim kami akan menghubungi untuk menjadwalkan
                  presentasi dan demo aplikasi.
                </p>

                <form
                  action="/demo"
                  method="get"
                  className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
                >
                  <label htmlFor="footer-email" className="sr-only">
                    Alamat email
                  </label>
                  <input
                    id="footer-email"
                    type="email"
                    name="email"
                    required
                    placeholder="Alamat email Anda"
                    autoComplete="email"
                    className="flex-1 min-w-0 rounded-full bg-white/5 border border-white/10 px-5 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/30 whitespace-nowrap"
                  >
                    Minta Demo
                    <i className="ri-arrow-right-line" aria-hidden="true"></i>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Footer Top */}
          <div className="container mx-auto px-5 md:px-6 py-14 md:py-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
              {/* Contact */}
              <div className="sm:col-span-2 lg:col-span-4">
                <Link
                  href="/"
                  className="inline-block mb-5 bg-white rounded-xl px-3 py-2"
                  aria-label="Beranda TRANSINDO"
                >
                  <img src="/assets/img/transindo_logo2.png" alt="TRANSINDO" className="h-9 w-auto" />
                </Link>
                <h3 className="text-lg font-bold text-white mb-4 tracking-wide">
                  PT. Transindo Multi Industri
                </h3>
                <address className="not-italic text-sm leading-relaxed text-slate-400 space-y-3">
                  <p className="flex items-start gap-3">
                    <i className="ri-map-pin-2-line text-blue-400 text-lg leading-none mt-0.5" aria-hidden="true"></i>
                    <span>
                      Jl. Rawa Bengkok
                      <br />
                      Depok, Jawa Barat, Indonesia
                    </span>
                  </p>
                  <p className="flex items-center gap-3">
                    <i className="ri-whatsapp-line text-blue-400 text-lg leading-none" aria-hidden="true"></i>
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      {WHATSAPP_DISPLAY}
                    </a>
                  </p>
                  <p className="flex items-center gap-3">
                    <i className="ri-mail-line text-blue-400 text-lg leading-none" aria-hidden="true"></i>
                    <a href={`mailto:${SALES_EMAIL}`} className="hover:text-white transition-colors">
                      {SALES_EMAIL}
                    </a>
                  </p>
                </address>
              </div>

              {/* Useful Links */}
              <div className="lg:col-span-2">
                <h4 className="text-white font-bold mb-5">Tautan</h4>
                <ul className="space-y-3 text-sm">
                  {USEFUL_LINKS.map((item) => (
                    <li key={item.href + item.label}>
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <i className="ri-arrow-right-s-line text-blue-400" aria-hidden="true"></i>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Products */}
              <div className="lg:col-span-3">
                <h4 className="text-white font-bold mb-5">Produk</h4>
                <ul className="space-y-3 text-sm">
                  {PRODUCT_LINKS.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <i className="ri-arrow-right-s-line text-blue-400" aria-hidden="true"></i>
                        {item.footerLabel}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Social Media */}
              <div className="lg:col-span-3">
                <h4 className="text-white font-bold mb-5">Sosial Media</h4>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">
                  Kenali kami lebih jauh melalui sosial media.
                </p>
                <div className="flex gap-3">
                  <a
                    href="https://www.instagram.com/teriot.techno/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram TERIOT"
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all"
                  >
                    <i className="ri-instagram-line text-xl" aria-hidden="true"></i>
                  </a>
                  <a
                    href="https://www.linkedin.com/company/133427442/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn Transindo Multi Industri"
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all"
                  >
                    <i className="ri-linkedin-fill text-xl" aria-hidden="true"></i>
                  </a>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp Transindo Multi Industri"
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all"
                  >
                    <i className="ri-whatsapp-line text-xl" aria-hidden="true"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-white/10">
            <div className="container mx-auto px-5 md:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm text-slate-500">
              <div>
                &copy; {year}{" "}
                <strong className="text-slate-300">Transindo Multi Industri</strong>. All Rights
                Reserved.
              </div>
              <div className="flex items-center gap-4">
                <Link href="/about" className="hover:text-white transition-colors">
                  Legal Dokumen
                </Link>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Kontak
                </Link>
              </div>
            </div>
          </div>
        </footer>

        {/* ===== Vendor JS ===== */}
        <Script src="/assets/vendor/aos/aos.js" strategy="afterInteractive" />
        <Script src="/assets/vendor/bootstrap/js/bootstrap.bundle.min.js" strategy="afterInteractive" />
        <Script src="/assets/vendor/glightbox/js/glightbox.min.js" strategy="afterInteractive" />
        <Script src="/assets/vendor/swiper/swiper-bundle.min.js" strategy="afterInteractive" />
        <Script src="/assets/js/main.js" strategy="afterInteractive" />

        {/* ===== Custom Script: navbar behaviour ===== */}
        <Script id="navbar-behaviour" strategy="afterInteractive">
          {`
            (function () {
              if (typeof window === 'undefined') return;

              document.addEventListener('click', function (e) {
                var target = e.target && e.target.closest ? e.target.closest('a') : null;
                if (!target || !target.closest('#navbar')) return;

                var href = target.getAttribute('href');

                // Tombol dropdown "Produk": cegah lompat ke atas halaman.
                // Toggle buka/tutup di mobile tetap ditangani main.js.
                if (href === '#') {
                  e.preventDefault();
                  return;
                }

                // Tutup menu mobile otomatis setelah link di navbar diklik
                var navbar = document.querySelector('#navbar');
                var toggle = document.querySelector('.mobile-nav-toggle');
                if (navbar && navbar.classList.contains('navbar-mobile')) {
                  navbar.classList.remove('navbar-mobile');
                  if (toggle) {
                    toggle.classList.remove('bi-x');
                    toggle.classList.add('bi-list');
                  }
                }
              });
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
