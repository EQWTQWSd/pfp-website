import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono, Barlow_Condensed, Share_Tech_Mono, Rajdhani, VT323, Cinzel } from "next/font/google";
import "./globals.css";

const spanish = localFont({
  src: "../fonts/Spanish.ttf",
  variable: "--font-spanish",
  display: "swap",
});

const mono = JetBrains_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const barlow = Barlow_Condensed({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

const shareTechMono = Share_Tech_Mono({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-share-tech-mono",
  display: "swap",
});

const rajdhani = Rajdhani({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rajdhani",
  display: "swap",
});

const vt323 = VT323({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

const cinzel = Cinzel({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "pan. | rueangsakda",
  description: "culinary apprentice · restaurant sonne scheunenberg · michelin ★",
};

export const viewport: Viewport = {
  themeColor: "#19191e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spanish.variable} ${mono.variable} ${barlow.variable} ${shareTechMono.variable} ${rajdhani.variable} ${vt323.variable} ${cinzel.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
