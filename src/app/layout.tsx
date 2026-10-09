import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: "THE FOUNDER'S GAMBIT",
  description: 'A strategic battle of ideas, conviction and calculated risk.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gambit-bg text-foreground antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
