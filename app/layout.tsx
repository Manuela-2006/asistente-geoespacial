import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Asistente Geoespacial con IA",
  description: "Análisis geoespacial inteligente basado en datos reales",
  keywords: ["análisis geoespacial", "IA", "mapas", "ubicación", "datos"],
};

// ✅ viewport en export separado (Next.js 14+)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#c73866",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-gray-50`}>
        {children}
        <Toaster 
          position="top-right"
          expand={true}
          richColors
          closeButton
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: "Inter, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}