import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El asistente lee `lib/assistant/manual.md` del disco en tiempo de
  // ejecución. Next sólo empaqueta con cada función los archivos que detecta
  // por `import`, y éste se abre con una ruta calculada: sin esta línea
  // funciona en local y falla en producción con «archivo no encontrado».
  outputFileTracingIncludes: {
    "/api/chat": ["./lib/assistant/manual.md"],
  },
};

export default nextConfig;
