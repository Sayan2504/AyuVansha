import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AyuVansha — Multi-Generational Family Medical & Prescription Timeline",
  description:
    "Privacy-first family health workspace that converts scattered paper prescriptions, discharge summaries, and lab PDFs into a structured clinical timeline, hereditary risk map, and expiring 1-Page Doctor QR Brief.",
};

const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('ayuvansha-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}
