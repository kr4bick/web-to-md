import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Web to Markdown',
  description: 'Turn any webpage into clean Markdown',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <nav className="border-b border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold text-gray-900 text-sm tracking-tight hover:text-gray-600 transition-colors">
              Web to Markdown
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/parse" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Parse
              </Link>
              <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                History
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
