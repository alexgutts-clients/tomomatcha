import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Las fuentes se auto-hospedan en el build: la demo no pide nada a internet.
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

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
    <html lang="es-MX" className={`${display.variable} ${sans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
