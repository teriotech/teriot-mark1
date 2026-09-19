import mysql from "mysql2/promise";

// Pilih URL database berdasarkan lingkungan (development = Tailscale, production = Server IP)
const databaseUrl =
  process.env.NODE_ENV === "development"
    ? process.env.DATABASE_URL_TAILSCALE || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

// Memeriksa apakah URL database tersedia di .env
if (!databaseUrl) {
  throw new Error("DATABASE_URL atau DATABASE_URL_TAILSCALE tidak ditemukan di file .env");
}

// Menyiapkan konfigurasi pool koneksi
const pool = mysql.createPool({
  uri: databaseUrl,
  waitForConnections: true,
  connectionLimit: 10, // Maksimal koneksi simultan
  maxIdle: 10, // Maksimal koneksi idle
  idleTimeout: 60000, // Waktu idle sebelum koneksi ditutup (ms)
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const db = pool;