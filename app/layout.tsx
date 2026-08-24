import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { esMX } from "@clerk/localizations";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { clerkStatus } from "@/lib/env";
import "./globals.css";

// Las fuentes se auto-hospedan en el build: la aplicación no pide tipografías
// a servidores externos en tiempo de ejecución.
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
  title: "TomoMatcha · Operación",
  description:
    "Sistema de operación de TomoMatcha: punto de venta, comandas, inventario por receta, reportes, lealtad y corte de caja.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#191a14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const shell = (
    <html lang="es-MX" className={`${display.variable} ${sans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );

  // Sin llaves de Clerk el proveedor no puede montarse; la aplicación sigue
  // viva para mostrar la pantalla que explica qué falta configurar.
  if (!clerkStatus().ok) return shell;

  return (
    <ClerkProvider
      localization={esMX}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
      appearance={{
        variables: {
          colorPrimary: "#4c5a32",
          colorBackground: "#fbf9f3",
          borderRadius: "0.9rem",
          fontFamily: "var(--font-sans), system-ui, sans-serif",
        },
      }}
    >
      {shell}
    </ClerkProvider>
  );
}
