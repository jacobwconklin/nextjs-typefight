import type { Metadata } from 'next'
import './globals.scss'
import { PlayerTypeProvider } from '../context/PlayerTypeContext'
import { SoundProvider } from '../context/SoundContext'
import SessionRecoveryOrchestrator from '../components/SessionRecoveryOrchestrator'
import MultiplayerSessionOrchestrator from '../components/MultiplayerSessionOrchestrator'
import PersistentHomeButton from '../components/PersistentHomeButton'
import AudioToggleButton from '../components/AudioToggleButton'
import BackgroundMusicManager from '../components/BackgroundMusicManager'

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
          <SoundProvider>
            <SessionRecoveryOrchestrator />
            <MultiplayerSessionOrchestrator />
            <PersistentHomeButton />
            <AudioToggleButton />
            <BackgroundMusicManager />
            {children}
          </SoundProvider>
        </PlayerTypeProvider>
      </body>
    </html>
  )
}
