// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/components/providers/query-provider"
import { SessionProvider } from "@/components/providers/session-provider"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider"
import { Toaster } from "sonner"
import { Analytics } from "@vercel/analytics/react"
import { InstallPrompt } from "@/components/pwa/InstallPrompt"
import { ErrorBoundary } from "@/components/ErrorBoundary"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

// Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/#organization`,
      "name": "WIK Technologies",
      "url": process.env.NEXTAUTH_URL || 'http://localhost:3000',
      "logo": {
        "@type": "ImageObject",
        "url": `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/logo.png`,
        "width": 512,
        "height": 512
      },
      "sameAs": [
        // Add social media URLs here when available
      ]
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/#softwareapplication`,
      "name": "DueSync",
      "description": "Smart task management application with Google Calendar sync, reminders, and productivity features",
      "url": process.env.NEXTAUTH_URL || 'http://localhost:3000',
      "applicationCategory": "ProductivityApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "Task Management",
        "Google Calendar Sync",
        "Push Notifications",
        "Priority Management",
        "Time Tracking",
        "Focus Mode",
        "Email Reminders"
      ],
      "screenshot": `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/screenshot.png`,
      "author": {
        "@id": `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/#organization`
      }
    },
    {
      "@type": "WebSite",
      "@id": `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/#website`,
      "url": process.env.NEXTAUTH_URL || 'http://localhost:3000',
      "name": "DueSync - Smart Task Synchronization",
      "description": "Organize, prioritize, and complete your tasks with ease. Sync with Google Calendar, get reminders, and boost productivity.",
      "publisher": {
        "@id": `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/#organization`
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    }
  ]
}

export const metadata: Metadata = {
  title: {
    default: "DueSync - Smart Task Synchronization",
    template: "%s | DueSync"
  },
  description: "Organize, prioritize, and complete your tasks with ease. Sync with Google Calendar, get reminders, and boost productivity with DueSync's intelligent task management.",
  keywords: [
    "task management",
    "todo app",
    "productivity",
    "Google Calendar sync",
    "task organizer",
    "reminders",
    "time management",
    "project management",
    "task tracking",
    "productivity app",
    "PWA",
    "progressive web app"
  ],
  authors: [{ name: "WIK Technologies" }],
  creator: "WIK Technologies",
  publisher: "WIK Technologies",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DueSync',
  },
  applicationName: 'DueSync',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#10B981' },
    { media: '(prefers-color-scheme: dark)', color: '#059669' }
  ],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'DueSync - Smart Task Synchronization',
    description: 'Organize, prioritize, and complete your tasks with ease. Sync with Google Calendar, get reminders, and boost productivity.',
    siteName: 'DueSync',
    images: [
      {
        url: '/og-image.png', // We'll need to create this
        width: 1200,
        height: 630,
        alt: 'DueSync - Smart Task Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DueSync - Smart Task Synchronization',
    description: 'Organize, prioritize, and complete your tasks with ease. Sync with Google Calendar, get reminders, and boost productivity.',
    images: ['/og-image.png'],
    creator: '@duesync',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'q6BHqeQjZS8_eyoCsgq80OHSMsMgh6W89vFDYippLzI',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <ErrorBoundary>
            <SessionProvider>
              <ServiceWorkerProvider>
                <QueryProvider>
                  {children}
                  <Toaster position="top-right" richColors />
                  <InstallPrompt />
                </QueryProvider>
              </ServiceWorkerProvider>
            </SessionProvider>
          </ErrorBoundary>
        </ThemeProvider>
        <Analytics />

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </body>
    </html>
  )
}