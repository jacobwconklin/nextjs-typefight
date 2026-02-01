import { io, Socket } from 'socket.io-client'
import { WEBSOCKET_URL } from '../config'

type Handler = (payload: any) => void

// A small typed representation of the in-memory player used across pages
export interface LocalPlayer {
  id: string
  alias: string
  icon: string
  font: string
  color: string
}

class WSClient {
  url: string
  socket: Socket | null = null
  connected = false

  constructor(url = WEBSOCKET_URL) {
    this.url = url
    this.connect()
  }

  connect() {
    if (this.socket) return
    this.socket = io(this.url, { autoConnect: true })

    this.socket.on('connect', () => {
      this.connected = true
      console.log('socket connected', this.socket?.id)
    })

    this.socket.on('disconnect', () => {
      this.connected = false
    })

    this.socket.on('connect_error', (err) => {
      console.error('Socket connect error', err)
    })
  }

  on(type: string, handler: Handler) {
    this.socket?.on(type, handler)
  }

  off(type: string, handler: Handler) {
    this.socket?.off(type, handler)
  }

  send(type: string, payload: any) {
    this.socket?.emit(type, payload)
  }

  // socketRequest wraps socket emit/on into a Promise for request-response pattern
  socketRequest(type: string, payload: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'))
        return
      }

      const responseEvent = `${type}`
      const errorEvent = `${type}-error`
      
      // Set up one-time listeners for response
      const onResponse = (data: any) => {
        this.socket?.off(errorEvent, onError)
        resolve(data)
      }
      
      const onError = (data: any) => {
        this.socket?.off(responseEvent, onResponse)
        reject(new Error(data.error || 'Socket request failed'))
      }
      
      this.socket.once(responseEvent, onResponse)
      this.socket.once(errorEvent, onError)
      
      // Emit the request
      this.socket.emit(type, payload)
      
      // Add timeout after 5 seconds
      setTimeout(() => {
        this.socket?.off(responseEvent, onResponse)
        this.socket?.off(errorEvent, onError)
        reject(new Error(`Socket request timeout: ${type}`))
      }, 5000)
    })
  }

  // request is used in a few places for convenience. Support common backend http actions.
  async request(type: string, payload: any): Promise<any> {
    console.log("URL IS: ", this.url);
    if (type === 'generateJoinCode' || type === 'createParty') {
      const res = await fetch(`${this.url}/api/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName: payload?.gameName || null }),
      })
      if (!res.ok) throw new Error('Failed to create session')
      const data = await res.json()
      return data.joinCode
    }

    if (type === 'getParty') {
      const code = payload?.code
      if (!code) return null
      const res = await fetch(`${this.url}/api/session/${encodeURIComponent(code)}`)
      if (!res.ok) return null
      const data = await res.json()
      return data.session
    }

    // fallback - not implemented
    throw new Error(`WSClient.request: unknown request type ${type}`)
  }

  close() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }
}

const wsClient = new WSClient()
export default wsClient
