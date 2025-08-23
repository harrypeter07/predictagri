import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "PredictAgri - Crop Yield Prediction System",
  description: "Advanced AI-powered agriculture crop yield prediction system with satellite data analysis, weather forecasting, and expert recommendations. Built with Next.js and Supabase for precision farming.",
  keywords: "agriculture, crop yield prediction, AI farming, precision agriculture, satellite data, weather forecasting, farming technology, agricultural analytics",
  authors: [{ name: "PredictAgri Team" }],
  creator: "PredictAgri",
  publisher: "PredictAgri",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://yourdomain.com'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      {
        url: '/image.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/image.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/image.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcut: '/image.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yourdomain.com',
    title: 'PredictAgri - Crop Yield Prediction System',
    description: 'Advanced AI-powered agriculture crop yield prediction system with satellite data analysis, weather forecasting, and expert recommendations.',
    siteName: 'PredictAgri',
    images: [
      {
        url: '/image.png',
        width: 1200,
        height: 630,
        alt: 'PredictAgri - Advanced Agriculture Analytics',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@predictagri',
    creator: '@predictagri',
    title: 'PredictAgri - Crop Yield Prediction System',
    description: 'Advanced AI-powered agriculture crop yield prediction system with satellite data analysis, weather forecasting, and expert recommendations.',
    images: ['/image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-TileImage" content="/image.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
