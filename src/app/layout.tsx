import type { Metadata } from 'next'
import './globals.scss'
import { PlayerTypeProvider } from '../context/PlayerTypeContext'
import PersistentHomeButton from '../components/PersistentHomeButton'

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
          <PersistentHomeButton />
          {children}
        </PlayerTypeProvider>
      </body>
    </html>
  )
}
