// Global configuration
// Export configurations here

// The default websocket server URL. This must be exposed to the browser (use NEXT_PUBLIC prefix).
// Set NEXT_PUBLIC_WEBSOCKET_URL in your environment to override.
export const WEBSOCKET_URL: string =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? 'http://localhost:5000'

// The frontend base URL exposed to the browser. Set NEXT_PUBLIC_FRONTEND_URL in your environment to override.
export const FRONTEND_URL: string =
  process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3000'

