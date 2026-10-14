import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { THEME_COLOR } from "@/lib/app-icon";
import "./globals.css";

// Self-hosted at build time, so the CSP can keep font-src 'self'.
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "ชุมชนพลัส",
  description: "ระบบค้นหาข้อมูลลูกบ้าน",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "ชุมชนพลัส", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
