import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [25, 50, 75, 90, 100],
  },
  // Los drivers nativos de SQLite/libSQL no se pueden empaquetar con
  // Turbopack; se cargan como módulos externos en tiempo de ejecución.
  serverExternalPackages: ["libsql", "@libsql/client", "better-sqlite3"],
};

export default nextConfig;
