'use client'

import { useEffect, useState } from 'react'
import { useConnect, useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { createAuthErrorMessage, createAuthSuccessMessage, detectEnvironment, ERROR_CODES, ERROR_MESSAGES, sendMessageToParent, type ErrorCode } from '../lib/post-message'
import { getAvailableWallets } from '../lib/wagmi-config'

export default function WalletAuthPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authStep, setAuthStep] = useState<'select' | 'connecting' | 'signing' | 'success' | 'error'>('select')
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [hasSigned, setHasSigned] = useState(false);
  
  const { connect, connectors, isPending } = useConnect()
  const { address, isConnected, chain } = useAccount()
  const { signMessageAsync, isPending: isSigningMessage } = useSignMessage()
  const { disconnect } = useDisconnect()
  
  const environment = detectEnvironment()
  const availableWallets = getAvailableWallets()

  useEffect(() => {
    setIsClient(true)
    // When the page loads, check for a returnUrl and store it.
    // This preserves it across browser sessions (e.g., from Safari to MetaMask).
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrl = urlParams.get('returnUrl');
    if (returnUrl) {
      localStorage.setItem('wallet_auth_return_url', returnUrl);
      console.log('Stored return URL in localStorage:', returnUrl);
    }
  }, [])

  // Generate authentication message
  const generateAuthMessage = (walletAddress: string, nonce: string, chainId: number) => {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Wallet Auth Service'
    // A shorter message is better for mobile UX
    return `Authenticate with ${appName}\nWallet: ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}\nNonce: ${nonce.substring(0, 8)}...`;
  }

  // Generate cryptographically secure nonce
  const generateNonce = () => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  // Handle wallet connection
  const handleWalletConnect = async (connectorId: string) => {
    if (isConnecting) return
    
    const selectedConnector = connectors.find(c => c.id === connectorId)
    if (!selectedConnector) {
      setError('Wallet provider not found. Please try again.')
      setAuthStep('error')
      return
    }

    setIsConnecting(true)
    setError(null)
    setAuthStep('connecting')
    setSelectedWalletId(selectedConnector.id)
    
    try {
      await connect({ connector: selectedConnector })
    } catch (err: any) {
      console.error('Connection error:', err)
      
      let errorCode: ErrorCode = ERROR_CODES.CONNECTION_FAILED
      let errorMessage = ERROR_MESSAGES[errorCode]
      
      if (err.message?.includes('User rejected')) {
        errorCode = ERROR_CODES.USER_REJECTED
        errorMessage = ERROR_MESSAGES[errorCode]
      } else if (err.message?.includes('No wallet')) {
        errorCode = ERROR_CODES.WALLET_NOT_DETECTED
        errorMessage = ERROR_MESSAGES[errorCode]
      }
      
      setError(errorMessage)
      setAuthStep('error')
      
      // Send error to parent
      sendMessageToParent(createAuthErrorMessage(errorCode, errorMessage))
    } finally {
      setIsConnecting(false)
    }
  }

  // Handle message signing
  const handleMessageSigning = async () => {
    if (!address || !selectedWalletId || !chain) return
    
    setAuthStep('signing')
    
    try {
      const nonce = generateNonce()
      const message = generateAuthMessage(address, nonce, chain.id)
      
      const signature = await signMessageAsync({ message })
      
      if (signature) {
        setAuthStep('success')
        
        const authResult = createAuthSuccessMessage(
          address,
          signature,
          message,
          chain.id,
          selectedWalletId
        )
        
        setTimeout(() => {
          // Check if we are in a mobile wallet browser vs. a web popup
          if (environment.isMobileApp) {
            // For mobile, redirect back to the app's custom scheme.
            // First, try to get the return URL from the current session's URL params.
            // If it's not there, fall back to the URL we stored in localStorage.
            const urlParams = new URLSearchParams(window.location.search);
            let returnUrl = urlParams.get('returnUrl') || localStorage.getItem('wallet_auth_return_url');
            
            if (returnUrl) {
              // Clean up the stored item
              localStorage.removeItem('wallet_auth_return_url');
              
              const resultParam = encodeURIComponent(JSON.stringify(authResult));
              const separator = returnUrl.includes('?') ? '&' : '?';
              const redirectUrl = `${returnUrl}${separator}result=${resultParam}`;
              
              console.log('Attempting mobile app redirect to:', redirectUrl);
              
              try {
                window.location.href = redirectUrl;
                return; // Stop execution
              } catch (error) {
                console.error('Redirect failed:', error);
                alert('Wallet connected successfully! Please return to the app.');
              }
            } else {
              console.error('No return URL found in params or localStorage.');
              alert('Wallet connected successfully! Please return to the app.');
            }
          } else {
            // For web, use the existing PostMessage flow.
            console.log('Sending message to web parent.');
            sendMessageToParent(authResult);
            if (window.opener) {
              window.close();
            }
          }
        }, 1500);
      }
    } catch (err: any) {
      console.error('Signing error:', err)
      
      let errorCode: ErrorCode = ERROR_CODES.SIGNATURE_FAILED
      let errorMessage = ERROR_MESSAGES[errorCode]
      
      if (err.message?.includes('User rejected')) {
        errorCode = ERROR_CODES.USER_REJECTED
        errorMessage = ERROR_MESSAGES[errorCode]
      }
      
      setError(errorMessage)
      setAuthStep('error')
      
      // Send error to parent
      sendMessageToParent(createAuthErrorMessage(errorCode, errorMessage))
    }
  }

  // Auto-trigger signing when connected
  useEffect(() => {
    if (isConnected && address && authStep === 'connecting' && !hasSigned) {
      setHasSigned(true);
      handleMessageSigning();
    }
  }, [isConnected, address, authStep, hasSigned]);

  // Reset on disconnect
  useEffect(() => {
    if (!isConnected && authStep !== 'select') {
      setAuthStep('select');
      setSelectedWalletId(null);
      setError(null);
      setHasSigned(false); // Reset the signing guard
    }
  }, [isConnected]);

  const handleOpenInMetaMask = () => {
    // Reconstruct the full URL with query params to preserve them.
    const currentUrl = new URL(window.location.href);
    const paramsString = currentUrl.searchParams.toString();
    const baseUrl = `${currentUrl.origin}${currentUrl.pathname}`;
    const urlWithParams = paramsString ? `${baseUrl}?${paramsString}` : baseUrl;

    const metamaskUrl = `metamask://dapp/${urlWithParams.replace(/^https?:\/\//, '')}`;
    
    console.log('Re-opening in MetaMask, preserving params:', metamaskUrl);
    window.location.href = metamaskUrl;
  };

  // --- Auto-connect hook for in-app browser environments ---
  useEffect(() => {
    if (!isClient || !environment.isWebView || isConnected) {
      return;
    }

    // MetaMask's in-app browser can be slow to inject `window.ethereum`.
    // We'll poll to see when wagmi has detected the injected connector.
    let attempts = 0;
    const maxAttempts = 10; // Poll for 5 seconds (10 * 500ms)

    const pollForWallet = setInterval(() => {
      // The `connectors` array is populated asynchronously by wagmi.
      // We need to check inside the interval to see when it's ready.
      const injectedConnector = connectors.find(c => c.id === 'injected');

      if (injectedConnector) {
        clearInterval(pollForWallet); // Wallet found, stop polling.
        handleWalletConnect(injectedConnector.id); // Attempt connection once.
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(pollForWallet);
          console.error('Injected wallet provider not found after 5 seconds.');
          setError('No wallet provider was found. Please ensure your wallet is active and try again.');
          setAuthStep('error');
        }
      }
    }, 500); // Check every 500ms

    return () => {
      clearInterval(pollForWallet);
    };
  }, [isClient, environment, isConnected, connectors, handleWalletConnect]);

  const renderWalletButton = (wallet: any) => (
    <button
      key={wallet.id}
      onClick={() => handleWalletConnect(wallet.id)}
      disabled={isConnecting || isPending}
      className="wallet-button touch-target"
    >
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          {/* Placeholder for wallet icon */}
          <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
        </div>
        <div className="text-left">
          <div className="font-medium text-gray-900">{wallet.name}</div>
          <div className="text-sm text-gray-500">{wallet.description}</div>
        </div>
      </div>
      <div className="flex items-center">
        {isConnecting && selectedWalletId === wallet.id ? (
          <div className="loading-spinner"></div>
        ) : (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="safe-area flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-6">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Connect Wallet
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {isClient ? (
                <>
                  {environment.isWebView && 'Connect your wallet to continue'}
                  {environment.isPopup && 'Connect your wallet to authenticate'}
                  {environment.isBrowser && 'Choose your preferred wallet'}
                </>
              ) : (
                <>&nbsp;</>
              )}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 py-6">
          <div className="max-w-md mx-auto">
            {isClient && authStep === 'select' && (
              <div className="space-y-3">
                <p className="text-center text-sm text-gray-600 mb-6">
                  Choose your wallet to connect
                </p>
                {availableWallets.map(renderWalletButton)}
                {availableWallets.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm mb-4">
                      No compatible wallet detected
                    </p>
                    
                    <button 
                      onClick={handleOpenInMetaMask}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-lg mb-4 inline-flex items-center space-x-2"
                    >
                      <span>🦊</span>
                      <span>Open in MetaMask</span>
                    </button>
                    
                    <p className="text-gray-400 text-xs mt-2">
                      Please install MetaMask or Coinbase Wallet
                    </p>
                    
                    <div className="flex justify-center space-x-4 mt-4">
                      <a 
                        href="https://apps.apple.com/app/metamask/id1438144202"
                        className="text-blue-500 text-sm"
                      >
                        Install MetaMask
                      </a>
                      <a 
                        href="https://apps.apple.com/app/coinbase-wallet/id1278383455"
                        className="text-blue-500 text-sm"
                      >
                        Install Coinbase Wallet
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isClient && authStep === 'connecting' && (
              <div className="text-center py-8">
                <div className="loading-spinner mx-auto mb-4"></div>
                <p className="text-gray-600">Connecting to wallet...</p>
                <p className="text-sm text-gray-400 mt-2">
                  Please approve the connection in your wallet
                </p>
              </div>
            )}

            {isClient && authStep === 'signing' && (
              <div className="text-center py-8">
                <div className="loading-spinner mx-auto mb-4"></div>
                <p className="text-gray-600">Sign the message</p>
                <p className="text-sm text-gray-400 mt-2">
                  Please sign the authentication message in your wallet
                </p>
              </div>
            )}

            {isClient && authStep === 'success' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">Successfully connected!</p>
                <p className="text-sm text-gray-400 mt-2">
                  Redirecting you back...
                </p>
              </div>
            )}

            {isClient && authStep === 'error' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium mb-2">Connection failed</p>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <button
                  onClick={() => {
                    setAuthStep('select')
                    setError(null)
                    setSelectedWalletId(null)
                    disconnect()
                  }}
                  className="btn-primary"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200 bg-white">
          <div className="max-w-md mx-auto text-center">
            <p className="text-xs text-gray-400">
              This connection is secure and will not access your funds
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 