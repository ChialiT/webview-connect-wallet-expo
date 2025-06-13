import { createConfig, http } from 'wagmi'
import { mainnet, polygon, optimism, arbitrum } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

// Get alchemy API key from environment
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

// Create wagmi config
export const config = createConfig({
  chains: [mainnet, polygon, optimism, arbitrum],
  connectors: [
    injected({
      target: 'metaMask',
      shimDisconnect: true,
    }),
    injected({
      target: 'coinbaseWallet',
      shimDisconnect: true,
    }),
    injected(),
  ],
  transports: {
    [mainnet.id]: http(alchemyApiKey ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}` : undefined),
    [polygon.id]: http(alchemyApiKey ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}` : undefined),
    [optimism.id]: http(alchemyApiKey ? `https://opt-mainnet.g.alchemy.com/v2/${alchemyApiKey}` : undefined),
    [arbitrum.id]: http(alchemyApiKey ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyApiKey}` : undefined),
  },
  ssr: false, // Disable SSR for client-side only rendering
})

// Wallet detection utilities
export const detectWalletType = (): string | null => {
  if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
    return null
  }
  
  const { ethereum } = window as any
  
  if (ethereum.isMetaMask) return 'metaMask'
  if (ethereum.isCoinbaseWallet) return 'coinbase'
  if (ethereum.isBraveWallet) return 'brave'
  if (ethereum.isRainbow) return 'rainbow'
  
  return 'injected'
}

// Available wallet types for UI
export const SUPPORTED_WALLETS = {
  metaMask: {
    id: 'metaMask',
    name: 'MetaMask',
    icon: '/assets/metamask-logo.svg',
    description: 'Connect using MetaMask browser extension or mobile app',
  },
  coinbaseWallet: {
    id: 'coinbaseWallet',
    name: 'Coinbase Wallet',
    icon: '/assets/coinbase-logo.svg',
    description: 'Connect using Coinbase Wallet',
  },
  injected: {
    id: 'injected',
    name: 'Browser Wallet',
    icon: '/assets/wallet-logo.svg',
    description: 'Connect using your browser wallet (e.g., Brave, Rainbow)',
  },
} as const

// Get available wallets based on current environment
export const getAvailableWallets = () => {
  if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
    return []
  }

  const { connectors } = config
  const availableWagmiConnectors = connectors.filter(c => c.type === 'injected' && c.getProvider)

  if (availableWagmiConnectors.length === 0) {
    return []
  }
  
  const detectedWallets = new Set<string>()
  const walletType = detectWalletType()

  if (walletType) {
    detectedWallets.add(walletType)
  }

  // Add all available injected providers
  availableWagmiConnectors.forEach(c => detectedWallets.add(c.id))

  const walletList = Array.from(detectedWallets).map(id => 
    SUPPORTED_WALLETS[id as keyof typeof SUPPORTED_WALLETS]
  ).filter(Boolean) // Filter out any unsupported but detected wallets

  // Deduplicate and return
  return Array.from(new Map(walletList.map(item => [item.id, item])).values());
}

export const wagmiConfig = createConfig({
  chains: [mainnet, polygon, optimism, arbitrum],
  connectors: [
    injected({
      target: 'metaMask',
      shimDisconnect: true,
    }),
    injected({
      target: 'coinbaseWallet',
      shimDisconnect: true,
    }),
    injected(),
  ],
  transports: {
    [mainnet.id]: http(alchemyApiKey ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}` : undefined),
    [polygon.id]: http(alchemyApiKey ? `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey}` : undefined),
    [optimism.id]: http(alchemyApiKey ? `https://opt-mainnet.g.alchemy.com/v2/${alchemyApiKey}` : undefined),
    [arbitrum.id]: http(alchemyApiKey ? `https://arb-mainnet.g.alchemy.com/v2/${alchemyApiKey}` : undefined),
  },
  ssr: false, // Disable SSR for client-side only rendering
  NEXT_PUBLIC_ALCHEMY_API_KEY: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  ALLOWED_ORIGINS:
    process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:19006',
      'http://localhost:8081',
    ],
}) 