import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Sidebar } from '@/components/layout/Sidebar'
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
  title: 'Slack Error Analyzer',
  description: 'Slack 채널 오류를 수집하고 AI로 분석하는 대시보드',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
