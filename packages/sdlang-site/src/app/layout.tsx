import type { Metadata } from 'next'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: { default: 'SDL — Solution Design Language', template: '%s | SDL' },
  description: 'One YAML file that describes your entire software system and generates architecture diagrams, API specs, data models, scaffolding, and AI coding rules.',
  metadataBase: new URL('https://sdlang.com'),
  openGraph: {
    title: 'SDL — Solution Design Language',
    description: 'One YAML file. Your entire system.',
    url: 'https://sdlang.com',
    siteName: 'sdlang.com',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
