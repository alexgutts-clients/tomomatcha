import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TomoMatcha · Demo de operación",
  description:
    "Demo navegable del sistema de operación para la cafetería TomoMatcha: punto de venta, comandas, inventario, reportes y lealtad con datos de ejemplo.",
};

export const viewport: Viewport = {
  themeColor: "#191a14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body className="antialiased">{children}</body>
    </html>
  );
}
