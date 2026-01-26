import type { Metadata } from 'next'
import './globals.scss'
import { PlayerTypeProvider } from '../context/PlayerTypeContext'

export const metadata: Metadata = {
  title: 'TypeFight',
  description: 'A fun typing practice experience',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <PlayerTypeProvider>
          {children}
        </PlayerTypeProvider>
      </body>
    </html>
  )
}
