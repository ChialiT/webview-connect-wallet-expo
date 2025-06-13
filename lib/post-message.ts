// Types for PostMessage communication
export interface WalletAuthResult {
  type: 'WALLET_AUTH_SUCCESS'
  data: {
    address: string
    signature: string
    message: string
    chainId: number
    walletType: string
    timestamp: number
  }
}

export interface WalletAuthError {
  type: 'WALLET_AUTH_ERROR'
  error: {
    code: string
    message: string
  }
}

export interface WalletAuthMessage {
  type: 'WALLET_AUTH_INIT' | 'WALLET_AUTH_SUCCESS' | 'WALLET_AUTH_ERROR'
  data?: any
  error?: any
}

// Environment detection
export const detectEnvironment = () => {
  if (typeof window === 'undefined') {
    return { isServer: true, isWebView: false, isPopup: false, isEmbedded: false }
  }

  const isWebView = !!(window as any).ReactNativeWebView
  const isPopup = window.opener !== null && window.opener !== window
  const isEmbedded = window.parent !== window && !isPopup
  
  return {
    isServer: false,
    isWebView,
    isPopup,
    isEmbedded,
    isBrowser: !isWebView && !isPopup && !isEmbedded
  }
}

// Get allowed origins from environment
const getAllowedOrigins = (): string[] => {
  const originsEnv = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS
  if (!originsEnv) return ['*'] // Allow all in development
  
  return originsEnv.split(',').map(origin => origin.trim())
}

// Validate message origin
export const isValidOrigin = (origin: string): boolean => {
  const allowedOrigins = getAllowedOrigins()
  
  // Allow all origins in development
  if (allowedOrigins.includes('*')) return true
  
  return allowedOrigins.includes(origin)
}

// Send message to parent (WebView or popup opener)
export const sendMessageToParent = (message: WalletAuthResult | WalletAuthError) => {
  const env = detectEnvironment()
  
  try {
    if (env.isWebView) {
      // React Native WebView
      const webView = (window as any).ReactNativeWebView
      if (webView && webView.postMessage) {
        webView.postMessage(JSON.stringify(message))
        return true
      }
    } else if (env.isPopup && window.opener) {
      // Popup window
      const allowedOrigins = getAllowedOrigins()
      const targetOrigin = allowedOrigins.includes('*') ? '*' : allowedOrigins[0]
      
      window.opener.postMessage(message, targetOrigin)
      return true
    } else if (env.isEmbedded && window.parent) {
      // Embedded iframe
      const allowedOrigins = getAllowedOrigins()
      const targetOrigin = allowedOrigins.includes('*') ? '*' : allowedOrigins[0]
      
      window.parent.postMessage(message, targetOrigin)
      return true
    }
  } catch (error) {
    console.error('Failed to send message to parent:', error)
  }
  
  return false
}

// Listen for messages from parent
export const setupMessageListener = (
  onMessage: (message: WalletAuthMessage) => void
) => {
  const handleMessage = (event: MessageEvent) => {
    // Skip validation in development
    if (process.env.NODE_ENV === 'production' && !isValidOrigin(event.origin)) {
      console.warn('Rejected message from invalid origin:', event.origin)
      return
    }
    
    try {
      const message = typeof event.data === 'string' 
        ? JSON.parse(event.data) 
        : event.data
      
      if (message && typeof message.type === 'string') {
        onMessage(message)
      }
    } catch (error) {
      console.error('Failed to parse message:', error)
    }
  }
  
  window.addEventListener('message', handleMessage)
  
  // Return cleanup function
  return () => {
    window.removeEventListener('message', handleMessage)
  }
}

// Create authentication success message
export const createAuthSuccessMessage = (
  address: string,
  signature: string,
  message: string,
  chainId: number,
  walletType: string
): WalletAuthResult => ({
  type: 'WALLET_AUTH_SUCCESS',
  data: {
    address,
    signature,
    message,
    chainId,
    walletType,
    timestamp: Date.now()
  }
})

// Create authentication error message
export const createAuthErrorMessage = (
  code: string,
  message: string
): WalletAuthError => ({
  type: 'WALLET_AUTH_ERROR',
  error: {
    code,
    message
  }
})

// Error codes
export const ERROR_CODES = {
  USER_REJECTED: 'USER_REJECTED',
  WALLET_NOT_DETECTED: 'WALLET_NOT_DETECTED',
  WALLET_LOCKED: 'WALLET_LOCKED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SIGNATURE_FAILED: 'SIGNATURE_FAILED',
  UNSUPPORTED_CHAIN: 'UNSUPPORTED_CHAIN',
  TIMEOUT: 'TIMEOUT',
  WALLET_UNAVAILABLE: 'WALLET_UNAVAILABLE',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

// Error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.USER_REJECTED]: 'User rejected the connection request',
  [ERROR_CODES.WALLET_NOT_DETECTED]: 'No compatible wallet detected in browser',
  [ERROR_CODES.WALLET_LOCKED]: 'Wallet is locked, please unlock it',
  [ERROR_CODES.NETWORK_ERROR]: 'Network connection failed',
  [ERROR_CODES.SIGNATURE_FAILED]: 'Message signing failed',
  [ERROR_CODES.UNSUPPORTED_CHAIN]: 'Unsupported blockchain network',
  [ERROR_CODES.TIMEOUT]: 'Connection request timed out',
  [ERROR_CODES.WALLET_UNAVAILABLE]: 'Selected wallet is not available',
  [ERROR_CODES.CONNECTION_FAILED]: 'Failed to connect to wallet',
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unknown error occurred'
} as const 