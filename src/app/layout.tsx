"use client";

import { Montserrat } from 'next/font/google'
import './globals.css'
import '../styles/math.css'
import 'katex/dist/katex.min.css'
import { SessionProvider } from 'next-auth/react'

const montserrat = Montserrat({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
})

// Metadata is removed from client component

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>PansGPT - AI Academic Assistant</title>
        <link rel="icon" type="image/png" href="/uploads/favicon.png" />
      </head>
      <body className={`${montserrat.variable} font-sans`}>
        <SessionProvider session={undefined}>
          <main className="min-h-screen">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  )
} 