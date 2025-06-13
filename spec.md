# Universal Wallet Authentication Service - Technical Specification

## 🎯 Project Overview

A universal wallet connection system using a hosted authentication service that works seamlessly across iOS, Android, and Web platforms via WebView/modal integration. This approach eliminates SDK dependencies, CSP issues, and platform-specific wallet connection problems while providing a consistent user experience.

### Architecture Components

- **Main App**: Expo app (iOS/Android/Web) with wallet connection triggers
- **Wallet Auth Service**: Separate hosted web application handling wallet connections
- **Communication Bridge**: PostMessage API for secure data exchange
- **Backend Integration**: Supabase authentication and user management

### Key Benefits

✅ **Zero SDK Dependencies** - No MetaMask SDK, WalletConnect SDK, or ThirdWeb SDK required  
✅ **No CSP Conflicts** - Wallet connections handled in separate domain  
✅ **Cross-Platform Consistency** - Identical UX across iOS, Android, and Web  
✅ **Browser Wallet Support** - Works with MetaMask, Coinbase, Brave, Rainbow browser wallets  
✅ **Single Codebase** - One auth service serves all platforms  
✅ **Easy Maintenance** - Centralized wallet logic, independent deployments  
✅ **Realistic Coverage** - Targets 50-60% of crypto users with webview-compatible wallets  

---

## 🏗️ Wallet Auth Service Specification

### Hosting Requirements

```
Domain: wallet-auth.oceanapp.com
Hosting: Static site (Vercel/Netlify recommended)
SSL: Required for wallet security
Infrastructure: Minimal - just static files + CDN
```

### Repository Structure

```
wallet-auth-service/
├── public/
│   ├── index.html              # Main wallet connection interface
│   ├── styles.css              # Responsive styling
│   ├── wallet-connector.js     # Core wallet connection logic
│   ├── message-bridge.js       # PostMessage communication
│   ├── config.js               # Wallet provider configurations
│   └── assets/
│       ├── logos/              # Wallet provider logos
│       └── icons/              # UI icons
├── src/                        # Build source (if using build process)
├── package.json                # Dependencies and scripts
├── .env.example                # Environment variables
├── .env                        # Environment variables (gitignored)
├── vercel.json                 # Deployment configuration
└── README.md                   # Setup and deployment guide
```

---

## 🔌 Core Functionality

### 1. Wallet Connection Interface

**Responsive Design Requirements:**
- Mobile-optimized for WebView integration (iOS/Android)
- Desktop-friendly for modal/popup usage (Web)
- Touch-friendly buttons with proper spacing
- Loading states and connection feedback
- Error handling with user-friendly messages

**Webview-Compatible Wallet Providers:**
```javascript
const SUPPORTED_WALLETS = {
  metamask: {
    name: 'MetaMask',
    icon: 'metamask-logo.svg',
    desktop: true,
    mobile: true, // via mobile browser
    detection: 'window.ethereum?.isMetaMask',
    connector: 'injected'
  },
  coinbase: {
    name: 'Coinbase Wallet',
    icon: 'coinbase-logo.svg',
    desktop: true,
    mobile: true, // via mobile browser
    detection: 'window.ethereum?.isCoinbaseWallet',
    connector: 'injected'
  },
  brave: {
    name: 'Brave Wallet',
    icon: 'brave-logo.svg',
    desktop: true,
    mobile: false,
    detection: 'window.ethereum?.isBraveWallet',
    connector: 'injected'
  },
  rainbow: {
    name: 'Rainbow',
    icon: 'rainbow-logo.svg',
    desktop: true,
    mobile: false, // browser extension only
    detection: 'window.ethereum?.isRainbow',
    connector: 'injected'
  }
  // Additional browser-based wallets...
};
```

### 2. Authentication Flow

**Message Signing Pattern:**
```
Sign in to Ocean Time Machine

Wallet: {walletAddress}
Nonce: {randomNonce}
Chain ID: {chainId}
Issued At: {timestamp}

This request will not trigger any blockchain transaction or cost any gas fees.
```

**Flow Steps:**
1. **Wallet Detection** - Detect available browser wallets in webview environment
2. **Wallet Selection** - User chooses from detected wallet providers
3. **Connection Request** - Initiate wallet connection via `window.ethereum`
4. **Account Access** - Request account access permission
5. **Message Signing** - Sign authentication message for verification
6. **Data Return** - Send signed data back to main app

### 3. Communication Bridge

**Environment Detection:**
```javascript
// Detect execution context
const isWebView = window.ReactNativeWebView !== undefined;
const isPopup = window.opener !== null;
const isEmbedded = window.parent !== window;
```

**PostMessage Protocol:**
```javascript
// Outgoing message format
const authResult = {
  type: 'WALLET_AUTH_SUCCESS',
  data: {
    address: '0x742d35Cc6634C0532925a3b8D400CC5FE4c8A067',
    signature: '0x1b2e3d4f5a6b7c8d9e0f...',
    message: 'Sign in to Ocean Time Machine...',
    chainId: 1,
    walletType: 'metamask',
    timestamp: Date.now()
  }
};

// Error message format
const authError = {
  type: 'WALLET_AUTH_ERROR',
  error: {
    code: 'USER_REJECTED',
    message: 'User rejected the connection request'
  }
};
```

---

## 📱 Platform Integration

### Mobile (iOS/Android WebView)

**Integration in Expo App:**
```javascript
import { WebView } from 'react-native-webview';

const WalletAuthWebView = ({ onAuthResult, onClose }) => {
  const handleMessage = (event) => {
    const message = JSON.parse(event.nativeEvent.data);
    
    if (message.type === 'WALLET_AUTH_SUCCESS') {
      onAuthResult(message.data);
      onClose();
    } else if (message.type === 'WALLET_AUTH_ERROR') {
      onAuthResult(null, message.error);
      onClose();
    }
  };

  return (
    <WebView
      source={{ uri: 'https://wallet-auth.oceanapp.com' }}
      onMessage={handleMessage}
      style={{ flex: 1 }}
    />
  );
};
```

### Web (Modal/Popup)

**Integration in Expo Web:**
```javascript
const openWalletAuthModal = () => {
  const popup = window.open(
    'https://wallet-auth.oceanapp.com',
    'walletAuth',
    'width=400,height=600,scrollbars=yes'
  );

  const handleMessage = (event) => {
    if (event.origin !== 'https://wallet-auth.oceanapp.com') return;
    
    if (event.data.type === 'WALLET_AUTH_SUCCESS') {
      handleAuthSuccess(event.data.data);
      popup.close();
    }
  };

  window.addEventListener('message', handleMessage);
};
```

---

## 🔒 Security Implementation

### Message Verification

**Nonce Generation:**
```javascript
// Generate cryptographically secure nonce
const generateNonce = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
```

**Signature Verification (Server-side):**
```javascript
// Verify signature matches expected message and wallet
const verifyWalletSignature = (address, message, signature) => {
  const recoveredAddress = ethers.utils.verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === address.toLowerCase();
};
```

### Security Measures

- **Nonce Prevention** - Each authentication uses unique nonce to prevent replay attacks
- **Timestamp Validation** - Messages expire after reasonable time window
- **Origin Verification** - PostMessage origins strictly validated
- **No Private Keys** - Service never handles or stores private keys
- **HTTPS Required** - All communication over secure connections

---

## 🛠️ Technical Implementation

### Dependencies

```json
{
  "dependencies": {
    "ethers": "^6.x.x"
  },
  "devDependencies": {
    "vite": "^4.x.x",
    "typescript": "^5.x.x"
  }
}
```

### Environment Configuration

```env
# Wallet Auth Service Environment Variables
ALLOWED_ORIGINS=https://oceanapp.com,http://localhost:19006
SENTRY_DSN=your_sentry_dsn_for_error_tracking
APP_NAME=Ocean Time Machine
APP_URL=https://oceanapp.com
```

### Build and Deployment

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "vercel --prod"
  }
}
```

## 🎯 **Wallet Coverage & Limitations**

### **Supported Wallet Types**

#### ✅ **Browser Extension Wallets (Desktop)**
- **MetaMask** - Market leader, ~70% of desktop users
- **Coinbase Wallet** - Growing adoption, institutional users
- **Brave Wallet** - Built into Brave browser
- **Rainbow** - Popular among DeFi users
- **Connection Method**: `window.ethereum` injection

#### ✅ **Mobile Browser Wallets**
- **MetaMask Mobile** - When using built-in browser
- **Coinbase Wallet Mobile** - When using built-in browser  
- **Connection Method**: Mobile browser with wallet integration
- **Coverage**: ~40% of mobile crypto users

#### ✅ **Web-Based Wallets**
- **Coinbase Smart Wallet** - Custodial web wallet
- **Connection Method**: Direct web interface
- **Coverage**: Growing segment, especially for new users

### **Unsupported Wallet Types**

#### ❌ **Native Mobile Apps**
- Trust Wallet, Rainbow app, Phantom mobile
- **Reason**: Require deep linking/app switching from webview
- **Alternative**: Users can access via mobile browsers

#### ❌ **Hardware Wallets**
- Ledger, Trezor direct connection
- **Reason**: WebUSB not reliably supported in webviews
- **Alternative**: Users can connect hardware wallets to MetaMask

#### ❌ **Platform-Specific Wallets**
- iOS/Android specific implementations
- **Reason**: Native app communication limitations

### **Realistic Coverage Assessment**
- **Desktop Users**: ~85% coverage (most have browser extension wallets)
- **Mobile Users**: ~45% coverage (via mobile browsers)
- **Overall Coverage**: ~60% of crypto users
- **Target Audience**: Browser-savvy users, desktop-first workflows

### **User Guidance Strategy**

**For Unsupported Wallets:**
```javascript
const WALLET_GUIDANCE = {
  noWalletDetected: {
    desktop: "Install MetaMask browser extension to connect your wallet",
    mobile: "Use MetaMask mobile browser or install Coinbase Wallet"
  },
  unsupportedWallet: {
    message: "Your wallet isn't supported in this interface",
    suggestion: "Try using MetaMask or Coinbase Wallet for the best experience"
  }
};
```

---

## 🚀 Error Handling Strategy

### Error Types and Responses

```javascript
const ERROR_CODES = {
  USER_REJECTED: 'User rejected the connection request',
  WALLET_NOT_DETECTED: 'No compatible wallet detected in browser',
  WALLET_LOCKED: 'Wallet is locked, please unlock it',
  NETWORK_ERROR: 'Network connection failed',
  SIGNATURE_FAILED: 'Message signing failed',
  UNSUPPORTED_CHAIN: 'Unsupported blockchain network',
  TIMEOUT: 'Connection request timed out',
  WALLET_UNAVAILABLE: 'Selected wallet is not available'
};
```

### User Experience

- **Smart Wallet Detection** - Only show wallets that are actually available
- **Clear Installation Guidance** - Help users install compatible wallets
- **Fallback Messaging** - Explain alternatives when preferred wallet unavailable
- **Loading States** - Show progress during connection and signing processes
- **Timeout Handling** - Graceful handling of slow wallet responses

---

## 📊 Data Flow Summary

### Input Parameters (from Main App)
```javascript
const authParams = {
  appName: 'Ocean Time Machine',
  appUrl: 'https://oceanapp.com',
  nonce: 'generated-nonce-string',
  preferredWallet: 'metamask', // optional
  chainId: 1, // optional, defaults to Ethereum mainnet
  theme: 'light' // optional UI theming
};
```

### Output Data (to Main App)
```javascript
const authResult = {
  success: true,
  data: {
    address: '0x742d35Cc6634C0532925a3b8D400CC5FE4c8A067',
    signature: '0x1b2e3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
    message: 'Sign in to Ocean Time Machine\n\nWallet: 0x742d35...\nNonce: abc123...',
    chainId: 1,
    walletType: 'metamask',
    timestamp: 1704067200000
  }
};
```

---

## 🔄 Integration with Main Application

### User Authentication Flow

1. **Trigger Authentication** - User taps "Connect Wallet" in main app
2. **Open Auth Service** - WebView (mobile) or popup (web) opens wallet auth service
3. **Wallet Connection** - User connects wallet and signs authentication message
4. **Data Transfer** - Signed data sent back to main app via PostMessage
5. **Server Verification** - Main app sends signature to Supabase for verification
6. **User Creation** - Server creates/updates user record in database
7. **Session Establishment** - Supabase session created for authenticated user

This universal wallet authentication service provides a robust, maintainable solution that eliminates platform-specific wallet integration complexity while delivering a consistent user experience across all platforms. 