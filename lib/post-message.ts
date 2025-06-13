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

// Extend Navigator interface for iOS standalone property
interface ExtendedNavigator extends Navigator {
  standalone?: boolean;
}

// Environment detection
export const detectEnvironment = () => {
  if (typeof window === 'undefined') {
    return { isServer: true, isWebView: false, isPopup: false, isEmbedded: false, isMobileApp: false }
  }

  const isReactNativeWebView = !!(window as any).ReactNativeWebView
  const userAgent = navigator.userAgent || ''
  const extendedNavigator = navigator as ExtendedNavigator
  
  const isMobileApp = /MetaMaskMobile|Trust|Coinbase|Rainbow|TokenPocket/i.test(userAgent) ||
                      // iOS app webview detection (with proper type handling)
                      (/iPhone|iPad/i.test(userAgent) && !extendedNavigator.standalone && !/Safari/i.test(userAgent)) ||
                      // Android app webview detection  
                      (/Android/i.test(userAgent) && /wv|Version\/\d+\.\d+/i.test(userAgent))
  
  const isPopup = window.opener !== null && window.opener !== window
  const isEmbedded = window.parent !== window && !isPopup
  
  // Combined WebView detection
  const isWebView = isReactNativeWebView || isMobileApp
  
  return {
    isServer: false,
    isWebView,
    isReactNativeWebView,
    isMobileApp,
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
    // React Native WebView (your Expo app)
    if (env.isReactNativeWebView) {
      const webView = (window as any).ReactNativeWebView
      if (webView && webView.postMessage) {
        webView.postMessage(JSON.stringify(message))
        return true
      }
    }
    
    // Mobile app browsers (MetaMask, etc.)
    if (env.isMobileApp) {
      // Try multiple methods for mobile apps
      
      // Method 1: Try to communicate with opener if available
      if (window.opener) {
        try {
          window.opener.postMessage(message, '*')
        } catch (e) {
          console.log('Opener postMessage failed:', e)
        }
      }
      
      // Method 2: Use URL parameters for deep linking
      const searchParams = new URLSearchParams(window.location.search)
      const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect_uri')
      
      if (returnUrl) {
        const separator = returnUrl.includes('?') ? '&' : '?'
        const resultParam = encodeURIComponent(JSON.stringify(message))
        window.location.href = `${returnUrl}${separator}result=${resultParam}`
        return true
      }
      
      return true
    }
    
    // Popup window
    if (env.isPopup && window.opener) {
      const allowedOrigins = getAllowedOrigins()
      const targetOrigin = process.env.NODE_ENV === 'development' ? '*' : (allowedOrigins.includes('*') ? '*' : allowedOrigins[0])
      
      window.opener.postMessage(message, targetOrigin)
      return true
    }
    
    // Embedded iframe
    if (env.isEmbedded && window.parent) {
      const allowedOrigins = getAllowedOrigins()
      const targetOrigin = process.env.NODE_ENV === 'development' ? '*' : (allowedOrigins.includes('*') ? '*' : allowedOrigins[0])
      
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

// Error codes, messages, and types
export type ErrorCode =
  | 'USER_REJECTED'
  | 'WALLET_NOT_DETECTED'
  | 'WALLET_LOCKED'
  | 'NETWORK_ERROR'
  | 'SIGNATURE_FAILED'
  | 'UNSUPPORTED_CHAIN'
  | 'TIMEOUT'
  | 'WALLET_UNAVAILABLE'
  | 'CONNECTION_FAILED'
  | 'UNKNOWN_ERROR'

export const ERROR_CODES: { [key in ErrorCode]: ErrorCode } = {
  USER_REJECTED: 'USER_REJECTED',
  WALLET_NOT_DETECTED: 'WALLET_NOT_DETECTED',
  WALLET_LOCKED: 'WALLET_LOCKED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SIGNATURE_FAILED: 'SIGNATURE_FAILED',
  UNSUPPORTED_CHAIN: 'UNSUPPORTED_CHAIN',
  TIMEOUT: 'TIMEOUT',
  WALLET_UNAVAILABLE: 'WALLET_UNAVAILABLE',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  USER_REJECTED: 'User rejected the connection request',
  WALLET_NOT_DETECTED: 'No compatible wallet detected in browser',
  WALLET_LOCKED: 'Wallet is locked, please unlock it',
  NETWORK_ERROR: 'Network connection failed',
  SIGNATURE_FAILED: 'Message signing failed',
  UNSUPPORTED_CHAIN: 'Unsupported blockchain network',
  TIMEOUT: 'Connection request timed out',
  WALLET_UNAVAILABLE: 'Selected wallet is not available',
  CONNECTION_FAILED: 'Failed to connect to wallet',
  UNKNOWN_ERROR: 'An unknown error occurred',
} 