"use client";
import React from "react";
import Link from "next/link";

export default function AboutSection() {
  return (
    <>
      {/* ======= About Us Section ======= */}
      <section
        id="about"
        className="about"
        style={{ padding: "80px 0", backgroundColor: "#161d44" }}
      >
        <div className="container">
          <div className="section-title" style={{ marginBottom: 40 }}>
            <h2 style={{ textAlign: "center", fontWeight: 700, color: "#eaeaec" }}>
              Tentang Kami
            </h2>
          </div>

          <div className="row content" style={{ color: "#fcfcfc" }}>
            <div className="col-lg-6">
              <p>
                PT. Teriot Digital Technology Didirikan pada tahun 2022 merupakan perusahaan di bidang teknologi dan aplikasi digital. Spesialis dibidang IIOT (Industrial IoT) integrasi mesin produksi untuk mempermudah monitoring, pengolahan data, dan analysis. Didukung oleh staf ahli dibidang reseller dan distributor dengan pengalaman menyelesaikan proyek Implementasi Teknologi Aplikasi diberbagai perusahaan.
              </p>

              <ul style={{ paddingLeft: 18 }}>
                <li>Berorientasi pada kualitas dan kepuasan pelanggan</li>
                <li>Dedikasi dan passion melayani customer</li>
                <li>Mendukung inovasi teknologi</li>
              </ul>
            </div>

            <div className="col-lg-6 pt-4 pt-lg-0">
              <p>
                Kami memiliki komitmen tinggi untuk meningkatkan layanan sesuai dengan spesialisasi dan keahlian yang terus disempurnakan sesuai dengan era teknologi masa kini. Tantangan utama kami adalah menerapkan Inovasi terbaru pada semua sektor unit usaha sehingga mengoptimalkan seluruh sumber daya yang ada dan perusahaan dapat berfokus untuk mengembangkan bisnisnya secara maksimal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= Visi Misi ======= */}
      <section
        id="vision-mission"
        className="skills"
        style={{ padding: "80px 0", backgroundColor: "#f5f6f8" }}
      >
        <div className="container">
          <div className="row">
            <div className="col-lg-6">
              <h3 style={{ fontWeight: 600 }}>VISI</h3>
              <p style={{ fontStyle: "italic", color: "#555" }}>
                Menjadi perusahaan yang unggul dalam penyedia solusi teknologi & aplikasi di Indonesia dengan penekanan pada pertumbuhan yang berkelanjutan serta pembangunan kompetensi melalui pengembangan Sumber Daya Manusia dan Kepuasanya Pelanggan.
              </p>
            </div>

            <div className="col-lg-6">
              <h3 style={{ fontWeight: 600 }}>MISI</h3>
              <p style={{ fontStyle: "italic", color: "#555" }}>
                Membantu menyediakan solusi berbasi teknologi & aplikasi yang terintegrasi dan bermanfaat untuk meningkatkan efisien dan performa bagi seluruh pelanggan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======= About Technical ======= */}
      <section
        id="technical"
        className="skills"
        style={{ padding: "80px 0", backgroundColor: "#ececee" }}
      >
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-3">
              <img
                src="/assets/img/about1.png"
                className="img-fluid"
                alt="About Technical"
              />
            </div>

            <div className="col-lg-9">
              <h3>SEJARAH PELAYANAN SEJAK AWAL</h3>
              <p style={{ color: "#555" }}>
                PT. Teriot Technology sejak awal berdiri memiliki kompetensi mulai dari Konsultan dibidang Informasi Teknologi, Otomasi Industri, Software ERP Aplikasi, hingga Project Management. Menangani permasalahan bisnis Anda terutama dalam pengelolaan data. bertanggung jawab dari proses analisis, desain, hingga, implementasi sistem.
              </p>

              <a
                href="/assets/doc/IoT_System.pdf"
                className="btn-learn-more me-2"
                style={btnStyle}
              >
                Download IoT PDF
              </a>

              <a
                href="/assets/doc/Company_Portofolio.pdf"
                className="btn-learn-more"
                style={btnStyle}
              >
                Download Company Profile
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ======= Team Technical ======= */}
      <section
        id="legalitas"
        className="about"
        style={{ padding: "80px 0", backgroundColor: "#f5f6f8" }}
      >
        <div className="container">
          <div className="section-title" style={{ marginBottom: 40 }}>
            <h2 style={{ textAlign: "center" }}>TEAM TECHNICAL SUPPORT</h2>
          </div>

          <div className="row content">
            <div className="col-lg-6">
              <p style={{ color: "#555" }}>
                Team kami sangat berpengalaman dibidangnya, bersertifikat standard sesuai keahlian dan mampu menguasai beberapa teknis lapangan seperti : Konfigurasi Jaringan, Server, Database, Security Sistem, dan Peralatan Otomasi Indsutri.
              </p>
            </div>

            <div className="col-lg-3">
              <img
                src="/assets/img/about2.png"
                className="img-fluid"
                alt="About Technical"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======= Legalitas ======= */}
      <section
        id="legalitas"
        className="about"
        style={{ padding: "80px 0", backgroundColor: "#f5f6f8" }}
      >
        <div className="container">
          <div className="section-title" style={{ marginBottom: 40 }}>
            <h2 style={{ textAlign: "center" }}>LEGALITAS PERUSAHAAN</h2>
          </div>

          <div className="row content">
            <div className="col-lg-6">
              <p style={{ color: "#555" }}>
                PT. Teriot Technology Didirikan pada tahun 2022 merupakan perusahaan di bidang teknologi dan aplikasi. Didukung oleh staf ahli dibidang reseller dan distributor dengan pengalaman menyelesaikan proyek Implementasi Teknologi Aplikasi diberbagai perusahaan.
              </p>

              <ul className="list-unstyled">
                <li className="mb-2 d-flex align-items-start">
                  <i className="ri-check-double-line text-primary me-2"></i>
                  <span>Berorientasi pada kualitas dan kepuasan pelanggan</span>
                </li>
                <li className="mb-2 d-flex align-items-start">
                  <i className="ri-check-double-line text-primary me-2"></i>
                  <span>Dedikasi dan passion melayani customer sepenuh hati</span>
                </li>
                <li className="d-flex align-items-start">
                  <i className="ri-check-double-line text-primary me-2"></i>
                  <span>Mendukung perkembangan dan inovasi teknologi</span>
                </li>
              </ul>
              
            </div>

            <div className="col-lg-6">
              <a style={btnStyle} href="/assets/doc/Certificate_Company.pdf">
                Download Certificate Legalitas PDF
              </a>
              <br />
              <a style={btnStyle} href="/assets/doc/Certificate_NIB.pdf">
                Download NIB PDF
              </a>
              <a style={btnStyle} href="/assets/doc/Perijinan_ SPKLKH.pdf">
                Download Ijin SPKLH K3L PDF
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const btnStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 10,
  padding: "10px 20px",
  border: "2px solid #0d6efd",
  color: "#0d6efd",
  borderRadius: 4,
  textDecoration: "none",
};
