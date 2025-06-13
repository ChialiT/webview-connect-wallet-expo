'use client'

import { useEffect, useRef, useState } from 'react'

export default function TestPage() {
  const [message, setMessage] = useState<string>('Waiting for wallet authentication result...')
  const authWindowRef = useRef<Window | null>(null)

  const handleConnect = () => {
    setMessage('Popup opened. Please complete authentication...')
    // Store the window reference
    authWindowRef.current = window.open('/', 'walletAuth', 'width=400,height=750,scrollbars=yes')
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Log the received message and origin for debugging
      console.log('Received message from:', event.origin)
      console.log('Message data:', event.data)

      if (event.data && (event.data.type === 'WALLET_AUTH_SUCCESS' || event.data.type === 'WALLET_AUTH_ERROR')) {
        // Display the received data in a readable format
        const formattedData = JSON.stringify(event.data, null, 2)
        setMessage(formattedData)
        
        if (event.data.type === 'WALLET_AUTH_SUCCESS') {
          console.log('✅ Authentication successful!')
          console.log('Wallet Address:', event.data.data.address)
          console.log('Signature:', event.data.data.signature)
          
          // Close the popup window if it's still open
          if (authWindowRef.current && !authWindowRef.current.closed) {
            setTimeout(() => {
              authWindowRef.current?.close()
            }, 1500)
          }
        } else {
          console.log('❌ Authentication failed:', event.data.error.message)
        }
      }
    }

    // Add message listener
    window.addEventListener('message', handleMessage)

    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Wallet Auth Test Harness</h1>
        <p className="text-gray-600 mb-6">This page simulates the main application receiving wallet data.</p>
        
        <button
          onClick={handleConnect}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg mb-6 transition-colors"
        >
          Open Wallet Authentication
        </button>
        
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm break-all whitespace-pre-wrap">
          {message}
        </div>
      </div>
    </div>
  )
} 