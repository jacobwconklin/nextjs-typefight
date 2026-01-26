// Database TypeScript representations matching the provided Mongoose-like schemas.

export type GameName = 'Quick Keys' | 'Type Fight' | 'Word War 1' | 'Spacebar Invaders'

export type IconName =
  | 'bee'
  | 'knight'
  | 'brain'
  | 'cookie'
  | 'crab'
  | 'croissant'
  | 'dragon'
  | 'hamster'
  | 'hedgehog'
  | 'koala'
  | 'lion'
  | 'lizard'
  | 'zombman'
  | 'ninja'
  | 'octopus'
  | 'pirate'
  | 'samurai'
  | 'whale'
  | 'thimble'
  | 'turkey'
  | 'unicorn'
  | 'windmill'
  | 'wizard'
  | 'zombwoman'

export type FontName =
  | 'Black Ops One'
  | 'Calibri'
  | 'Coda'
  | 'Comic Neue'
  | 'Federant'
  | 'Gabriela'
  | 'Grenze Gotisch'
  | 'Kalam'
  | 'Merriweather'
  | 'Nova Square'
  | 'Reggae One'
  | 'Roboto'
  | 'Roboto Serif Variable'
  | 'Times New Roman'
  | 'Tomorrow'

export interface PlayerSchema {
  id: string // unique id (could be UUID)
  alias: string // required
  icon: IconName
  font?: FontName
  color?: string // hex value like #RRGGBB
  joinedAt: number
  sessionId?: string // optional reference to session.id
}

export interface PartySessionSchema {
  id: string
  selected_game?: GameName
  join_code: string // required, maxLength 12
  started: boolean
  createdAt: number
  hostId?: string
  players: PlayerSchema[]
}

export default {}
