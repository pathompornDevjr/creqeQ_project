/**
 * @file layout.tsx
 * @description รูทเลย์เอาต์หลักของแอปพลิเคชัน (Root Layout)
 * กำหนดฟอนต์ Noto Sans Thai, Favicon, การ Redirect สำหรับเบราว์เซอร์ในแอป LINE, และ Sonner Toaster
 */

import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { Toaster } from "sonner";
import Script from "next/script";
import { LineBrowserRedirect } from "./components/LineBrowserRedirect";
import "./globals.css";

/** กำหนดฟอนต์หลัก Noto Sans Thai */
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

/** ค่า Metadata สากลของเว็บแอปพลิเคชัน */
export const metadata: Metadata = {
  title: {
    default: "CREPEQ — ระบบจัดการร้านค้าครบวงจร",
    template: "%s | CREPEQ",
  },
  description: "CREPEQ ระบบจัดการร้านค้าครบวงจร ระบบจัดการร้านอาหารร้าน CrepeQ",
  icons: {
    icon: "/LogoSquare.png",
    shortcut: "/LogoSquare.png",
    apple: "/LogoSquare.png",
  },
};

/**
 * RootLayout คอมโพเนนต์หลักที่ห่อหุ้มทุกหน้าใน Next.js
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${notoSansThai.variable} h-full`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/LogoSquare.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/LogoSquare.png" type="image/png" />
        <link rel="apple-touch-icon" href="/LogoSquare.png" />
        {/* สคริปต์ตรวจจับและ Redirect ผู้ใช้ที่เปิดผ่าน In-App Browser ของ LINE ไปยัง External Browser เพื่อการใช้งานที่สมบูรณ์ */}
        <Script
          id="line-redirect"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var ua = navigator.userAgent || navigator.vendor || window.opera || '';
                  if (/Line\\//i.test(ua) || /Line\\b/i.test(ua)) {
                    var href = window.location.href;
                    if (href.indexOf('openExternalBrowser=1') === -1) {
                      var sep = href.indexOf('?') !== -1 ? '&' : '?';
                      window.location.replace(href + sep + 'openExternalBrowser=1');
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${notoSansThai.className} min-h-full antialiased`} suppressHydrationWarning>
        <LineBrowserRedirect />
        {children}
        {/* กล่องแจ้งเตือน Toast สากล */}
        <Toaster
          position="top-center"
          expand={false}
          gap={8}
          visibleToasts={1}
          closeButton
          richColors
          toastOptions={{
            style: {
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              borderRadius: "14px",
              fontSize: "14px",
              boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            },
          }}
        />
      </body>
    </html>
  );
}
