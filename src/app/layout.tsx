import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Book Works | Advocacy Platform',
  description: 'Education Advocacy Case Management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
