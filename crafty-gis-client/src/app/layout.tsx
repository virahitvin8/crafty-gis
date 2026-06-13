import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRAFTY GIS — AI Geospatial Intelligence Platform",
  description:
    "Conversational Remote Analysis & Field Technology for GIS. Describe your problem in plain language — AI investigates, downloads data, runs analysis, and delivers maps & reports.",
  keywords: [
    "GIS", "remote sensing", "satellite", "NDVI", "LULC", "geospatial AI",
    "open source", "agriculture", "Sentinel", "Landsat", "QGIS", "SAGA GIS",
  ],
  authors: [{ name: "CRAFTY GIS Contributors", url: "https://github.com/virahitvin8/crafty-gis" }],
  creator: "Akshit Kumar",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CRAFTY GIS",
  },
  openGraph: {
    title: "CRAFTY GIS — AI Geospatial Intelligence",
    description: "Open-source AI platform for GIS, remote sensing & agriculture. One command. Any analysis.",
    type: "website",
    url: "https://github.com/virahitvin8/crafty-gis",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
    shortcut: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c8ee7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA meta tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CRAFTY GIS" />
        <meta name="application-name" content="CRAFTY GIS" />
        <meta name="msapplication-TileColor" content="#0c8ee7" />

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Register PWA service worker
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('CRAFTY GIS PWA ready:', reg.scope))
                    .catch(err => console.log('SW error:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
