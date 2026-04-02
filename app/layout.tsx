import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Web Parser',
  description: 'Parse any webpage to Markdown',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">
        <nav className="border-b border-gray-800 bg-gray-950">
          <div className="max-w-5xl mx-auto px-8 h-12 flex items-center gap-6">
            <Link href="/" className="font-semibold text-gray-100 hover:text-white transition-colors">
              Web Parser
            </Link>
            <Link href="/history" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
              History
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
