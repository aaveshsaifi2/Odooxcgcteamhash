import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CivicTrack - Empower Citizens to Report Local Issues',
  description: 'Report and track local civic issues like road damage, garbage, and water leaks. Foster community engagement and transparency.',
  keywords: ['civic', 'issues', 'reporting', 'community', 'local government', 'transparency'],
  authors: [{ name: 'CivicTrack Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
} 