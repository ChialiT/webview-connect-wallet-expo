# Universal Wallet Authentication Service

A Next.js-based wallet authentication service designed for seamless WebView integration across iOS, Android, and Web platforms. Built with **wagmi** and **no WalletConnect SDK** to avoid upcoming fees.

## 🎯 Overview

This service provides universal wallet connection capabilities that work across all platforms via WebView/modal integration, eliminating SDK dependencies and CSP conflicts while maintaining consistent user experience.

### ✅ Key Features

- **Zero WalletConnect Fees** - Uses wagmi with injected connectors only
- **Cross-Platform Compatible** - Works in WebView (mobile) and popup/modal (web)
- **Wagmi Integration** - Modern wallet connection management
- **PostMessage Communication** - Secure data exchange with parent apps
- **Responsive Design** - Optimized for mobile WebView and desktop usage
- **TypeScript Support** - Full type safety throughout
- **Vercel Ready** - Optimized for static deployment

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Environment Setup

Copy the environment example and configure:

```bash
cp env.example .env.local
```

Edit `.env.local`:

```env
# Your app configuration
NEXT_PUBLIC_APP_NAME="Your App Name"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Allowed origins for PostMessage (comma-separated)
NEXT_PUBLIC_ALLOWED_ORIGINS="https://your-domain.com,http://localhost:19006"

# Optional: Alchemy API for better RPC performance
NEXT_PUBLIC_ALCHEMY_API_KEY="your_alchemy_api_key"
```

### 3. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to test the wallet connection interface.

### 4. Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Vercel
npm run deploy
```

## 🔧 Integration Examples

### WebView Integration (React Native/Expo)

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
      source={{ uri: 'https://your-wallet-auth-domain.com' }}
      onMessage={handleMessage}
      style={{ flex: 1 }}
    />
  );
};
```

### Popup Integration (Web)

```javascript
const openWalletAuthModal = () => {
  const popup = window.open(
    'https://your-wallet-auth-domain.com',
    'walletAuth',
    'width=400,height=600,scrollbars=yes'
  );

  const handleMessage = (event) => {
    if (event.origin !== 'https://your-wallet-auth-domain.com') return;
    
    if (event.data.type === 'WALLET_AUTH_SUCCESS') {
      handleAuthSuccess(event.data.data);
      popup.close();
    }
  };

  window.addEventListener('message', handleMessage);
};
```

## 📦 Project Structure

```
├── app/                    # Next.js 13+ App Router
│   ├── globals.css        # Global styles with WebView optimizations
│   ├── layout.tsx         # Root layout with wagmi provider
│   └── page.tsx           # Main wallet connection interface
├── lib/
│   ├── wagmi-config.ts    # Wagmi configuration (NO WalletConnect)
│   └── post-message.ts    # PostMessage communication utilities
├── public/                # Static assets
├── spec.md               # Original specification document
└── vercel.json           # Vercel deployment configuration
```

## 🔐 Supported Wallets

### ✅ Supported (No Fees)
- **MetaMask** (Browser extension + mobile browser)
- **Coinbase Wallet** (Browser extension + mobile browser)
- **Brave Wallet** (Built-in browser wallet)
- **Generic Injected** (Other browser wallets)

### ❌ Avoided
- **WalletConnect** - Avoided due to upcoming SDK fees
- **Native Mobile Apps** - Require deep linking (not WebView compatible)

## 🛠️ Technical Details

### Wagmi Configuration

The service uses wagmi with specific connectors optimized for WebView compatibility:

- `MetaMaskConnector` - For MetaMask connections
- `CoinbaseWalletConnector` - For Coinbase Wallet (headless mode)
- `InjectedConnector` - For other browser wallets

### PostMessage Protocol

Communication between the auth service and parent app uses a standardized message format:

```typescript
// Success message
{
  type: 'WALLET_AUTH_SUCCESS',
  data: {
    address: string,
    signature: string,
    message: string,
    chainId: number,
    walletType: string,
    timestamp: number
  }
}

// Error message
{
  type: 'WALLET_AUTH_ERROR',
  error: {
    code: string,
    message: string
  }
}
```

## 📱 WebView Optimizations

- **Viewport Configuration** - Prevents zoom on input focus
- **Touch-Friendly** - 44px minimum touch targets
- **Safe Area Support** - Handles device notches and insets
- **Loading States** - Clear feedback for connection and signing
- **Error Handling** - User-friendly error messages and recovery

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

```bash
# Build static files
npm run build

# Deploy the 'out' directory to your hosting provider
```

## 🔒 Security Features

- **Origin Validation** - PostMessage origin checking
- **Nonce Generation** - Cryptographically secure nonces
- **No Private Keys** - Never handles or stores private keys
- **HTTPS Required** - Secure communication only
- **Signature Verification** - Server-side signature validation

## 📊 Browser Support

- **Desktop**: Chrome, Firefox, Safari, Edge (with wallet extensions)
- **Mobile**: iOS Safari, Android Chrome (via mobile browser wallets)
- **WebView**: React Native WebView, Expo WebView

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test in both desktop and mobile environments
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

## 📚 Additional Resources

- [Wagmi Documentation](https://wagmi.sh/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Original Specification](./spec.md)

For questions or support, please open an issue on GitHub.