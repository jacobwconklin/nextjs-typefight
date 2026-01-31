// Global configuration
// Export configurations here

// The default websocket server URL. This must be exposed to the browser (use NEXT_PUBLIC prefix).
// Set NEXT_PUBLIC_WEBSOCKET_URL in your environment to override.
export const WEBSOCKET_URL: string =
  process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL ?? 'websocket env value not found'

// The frontend base URL exposed to the browser. Set NEXT_PUBLIC_FRONTEND_URL in your environment to override.
export const FRONTEND_URL: string =
  process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'frontend url env value not found'

