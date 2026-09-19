import mysql from "mysql2/promise";

// Pilih URL database berdasarkan lingkungan (development = Tailscale, production = Server IP)
const databaseUrl =
  process.env.NODE_ENV === "development"
    ? process.env.DATABASE_URL_TAILSCALE || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

// Deteksi apakah ini sedang dalam proses build di Vercel atau lokal
const isBuildPhase = process.env.npm_lifecycle_event === "build" || process.env.VERCEL === "1";

// Memeriksa apakah URL database tersedia di .env (abaikan jika sedang build)
if (!databaseUrl && !isBuildPhase) {
  throw new Error("DATABASE_URL atau DATABASE_URL_TAILSCALE tidak ditemukan di file .env");
}

// Menyiapkan konfigurasi pool koneksi (gunakan dummy URL saat build agar tidak crash)
const pool = mysql.createPool({
  uri: databaseUrl || "mysql://dummy:dummy@localhost:3306/dummy",
  waitForConnections: true,
  connectionLimit: 10, // Maksimal koneksi simultan
  maxIdle: 10, // Maksimal koneksi idle
  idleTimeout: 60000, // Waktu idle sebelum koneksi ditutup (ms)
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const db = pool;