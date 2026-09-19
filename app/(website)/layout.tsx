// src/app/layout.tsx
import "../globals.css"
import Script from "next/script"
import type { Metadata } from "next"
import Link from "next/link";


export const metadata: Metadata = {
  title: "TERIOT TECHNOLOGY - Your Best Valuable Partner",
  description: "ERP Software Management Terbaik di Indonesia",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700|Jost:300,400,500,600,700|Poppins:300,400,500,600,700"
          rel="stylesheet"
        />

        {/* Vendor CSS */}
        <link href="https://cdn.jsdelivr.net/npm/remixicon/fonts/remixicon.css" rel="stylesheet" />
        <link rel="stylesheet" href="/assets/vendor/aos/aos.css" />
        <link rel="stylesheet" href="/assets/vendor/bootstrap/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/assets/vendor/bootstrap-icons/bootstrap-icons.css" />
        <link rel="stylesheet" href="/assets/vendor/boxicons/css/boxicons.min.css" />
        <link rel="stylesheet" href="/assets/vendor/glightbox/css/glightbox.min.css" />
        <link rel="stylesheet" href="/assets/vendor/remixicon/remixicon.css" />
        <link rel="stylesheet" href="/assets/vendor/swiper/swiper-bundle.min.css" />
        <link rel="stylesheet" href="/assets/css/style.css" />
        {/* Main CSS */}
        <link rel="stylesheet" href="/assets/css/style.css" />
      </head>

      <body>
        {/* ===== HEADER ===== */}
        <header id="header" className="fixed-top">
          <div className="container d-flex align-items-center">
            <Link href="/" className="logo me-auto">
              <img src="/assets/img/teriot_logo2.png" alt="Teriot" />
            </Link>

            <nav id="navbar" className="navbar">
                <ul>

                  <Link href="/" className="nav-link">
                    Home
                  </Link>

                  <li className="dropdown">
                    <Link href="#">
                      <span>Produk</span>
                      <i className="bi bi-chevron-down"></i>
                    </Link>

                    <ul>
                      <Link href="/product_GMES">
                        Industrial IOT
                      </Link>

                      <Link href="/product_GMMS">
                        Maintenance Smart
                      </Link>

                      <Link href="/product_GERP">
                        ERP Digital
                      </Link>

                      <Link href="/product_RPA">
                        RPA
                      </Link>
                    </ul>
                  </li>

                  <Link href="/about" className="nav-link">
                    Tentang Kami
                  </Link>

                  <Link href="/gallery" className="nav-link">
                    Proyek
                  </Link>

                  <Link href="https://transindomu.com/production/contact" className="nav-link">
                    Contact
                  </Link>

                  <li className="flex gap-3">
                    <Link
                      href="/demo"
                      className="getstarted inline-flex items-center gap-2"
                    >
                      <i className="ri-shopping-cart-2-line"></i>
                      Request Demo
                    </Link>
                  </li>

                </ul>

                <i className="bi bi-list mobile-nav-toggle"></i>
              </nav>
          </div>
        </header>

        {/* ===== PAGE CONTENT ===== */}
        <main>{children}</main>

        {/* ===== FOOTER ===== */}
        <footer id="footer">
  {/* Newsletter */}
  <div className="footer-newsletter">
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-lg-6">
          <h4>Ada Pertanyaan?</h4>
          <p>
            Silahkan ajukan untuk demo aplikasi kepada kami.
            kami akan presentasi untuk Anda
          </p>
          <form action="" method="post">
            <input type="email" name="email" />
            <Link 
              href="https://api.whatsapp.com/send?phone=6285163657641&text=Halo%20Admin%2C%20saya%20ingin%20subscribe%20layanan%20Teriot."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/30"
            >
              Subscribe
            </Link>
          </form>
        </div>
      </div>
    </div>
  </div>

  {/* Footer Top */}
  <div className="footer-top">
    <div className="container">
      <div className="row">

        {/* Contact */}
        <div className="col-lg-3 col-md-6 footer-contact">
          <h3>TERIOT</h3>
          <p>
            Jl. Grand Wisata Bekasi, No 590 <br />
            Jakarta, Jawa Barat <br />
            Indonesia <br /><br />
            <strong>Phone:</strong>{" "}
            <Link href="https://api.whatsapp.com/send?phone=6285163657641">
              +62 85 163 657 641
            </Link>
            <br />
            <strong>Email:</strong> damita@teriot.id
          </p>
        </div>

        {/* Useful Links */}
        <div className="col-lg-3 col-md-6 footer-links">
          <h4>Useful Links</h4>
          <ul>
            <li><i className="bx bx-chevron-right"></i> <Link href="/">Home</Link></li>
            <li><i className="bx bx-chevron-right"></i> <Link href="/about">Tentang Kita</Link></li>
            <li><i className="bx bx-chevron-right"></i> <Link href="/contact">Kontak</Link></li>
            <li><i className="bx bx-chevron-right"></i> <Link href="/about">Legal Dokumen</Link></li>
            <li><i className="bx bx-chevron-right"></i> <Link href="/gallery">Gallery</Link></li>
          </ul>
        </div>

        {/* Products */}
        <div className="col-lg-3 col-md-6 footer-links">
          <h4>Produk</h4>
          <ul>
            <li><i className="bx bx-chevron-right"></i> <Link href="/product_GMES">IoT TERIOT Technology System</Link></li>
            <li><i className="bx bx-chevron-right"></i> <Link href="/product_GMMS">Maintenance SMART System</Link></li>
            <li><i className="bx bx-chevron-right"></i> <Link href="/product_GERP">ERP Digital Application</Link></li>
          </ul>
        </div>

        {/* Social Media */}
        <div className="col-lg-3 col-md-6 footer-links">
          <h4>Sosial Media</h4>
          <p>Kenali kami lebih jauh melalui sosial media</p>
          <div className="social-links mt-3">
            <Link
              href="https://www.instagram.com/teriot.techno/"
              className="instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="bx bxl-instagram"></i>
            </Link>
            <Link
              href="https://www.linkedin.com/in/damita-adhi-pratama-978a2a139/"
              className="linkedin"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="bx bxl-linkedin"></i>
            </Link>
          </div>
        </div>

      </div>
    </div>
  </div>

  {/* Footer Bottom */}
  <div className="container footer-bottom clearfix">
    <div className="copyright">
      © 2026 <strong><span>Teriot Technology</span></strong>. All Rights Reserved
    </div>
  </div>
</footer>


        {/* ===== Vendor JS ===== */}
        <Script src="/assets/vendor/aos/aos.js" strategy="afterInteractive" />
        <Script src="/assets/vendor/bootstrap/js/bootstrap.bundle.min.js" strategy="afterInteractive" />
        <Script src="/assets/vendor/glightbox/js/glightbox.min.js" strategy="afterInteractive" />
        <Script src="/assets/vendor/swiper/swiper-bundle.min.js" strategy="afterInteractive" />
        <Script src="/assets/js/main.js" strategy="afterInteractive" />
        <Script src="/assets/vendor/aos/aos.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
