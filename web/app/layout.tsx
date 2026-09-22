import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--serif" });

export const metadata: Metadata = {
  title: "Lumen",
  description: "A dark assignment board for Schoology and Canvas, with a focus timer.",
};

export const viewport: Viewport = {
  themeColor: "#0c0e10",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
