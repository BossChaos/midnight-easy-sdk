# Building Privacy-First Applications with Midnight Easy SDK: A Complete Guide

*Originally published on dev.to*

---

As developers, we've all been there. You need to implement zero-knowledge proofs in your application, and suddenly you're drowning in cryptographic protocols, circuit definitions, and low-level primitives that feel like they were designed for PhD researchers, not product engineers.

That's exactly the problem **Midnight Easy SDK** (`@midnight/easy-sdk`) was built to solve.

In this tutorial, we'll explore how this TypeScript library abstracts away the complexity of Midnight's privacy-preserving technology, letting you focus on building features instead of fighting with cryptography.

---

## Table of Contents

1. [What is Midnight?](#what-is-midnight)
2. [Why You Need Easy SDK](#why-you-need-easy-sdk)
3. [Installation](#installation)
4. [Core Concepts](#core-concepts)
5. [Complete Usage Examples](#complete-usage-examples)
6. [React Hooks Integration](#react-hooks-integration)
7. [Real-World Use Cases](#real-world-use-cases)
8. [Next Steps](#next-steps)

---

## What is Midnight?

**Midnight** is a privacy-focused blockchain platform that combines zero-knowledge cryptography with smart contract capabilities. It allows developers to build applications where sensitive data can be processed without being exposed — think private transactions, confidential business logic, and selective disclosure of personal information.

The platform uses **smart contracts** with privacy-preserving properties, enabling:

- **Sealed inputs**: Data that can be validated without revealing its contents
- **Zero-knowledge proofs**: Cryptographic evidence that a statement is true without revealing the underlying data
- **Selective disclosure**: Proving specific attributes without exposing everything

---

## Why You Need Easy SDK

### The Pain Points

Before Easy SDK, working with Midnight meant:

```
❌ Writing complex circuit definitions in low-level languages
❌ Manually managing proof generation and verification
❌ Handling cryptic error messages from the cryptographic layer
❌ Managing async operations with no clear patterns
❌ Reinventing common patterns for every project
```

### The Solution

**Easy SDK** provides:

```
✅ Clean, promise-based API for all privacy operations
✅ TypeScript-first design with full type safety
✅ React hooks for seamless frontend integration
✅ Simplified workflows for common use cases
✅ Comprehensive error handling and validation
✅ Automatic connection management
```

The result? From hours of setup to minutes.

---

## Installation

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- A Midnight-enabled wallet (we'll cover this shortly)

### Install the SDK

```bash
# Using npm
npm install @midnight/easy-sdk

# Using yarn
yarn add @midnight/easy-sdk

# Using pnpm
pnpm add @midnight/easy-sdk
```

### Install Peer Dependencies

```bash
npm install @midnight/sdk @midnight/sdk-wallet-adapter
```

### Verify Installation

```typescript
import { EasySDK } from '@midnight/easy-sdk';

console.log('SDK loaded successfully');
console.log('Version:', EasySDK.version);
```

---

## Core Concepts

Before diving into code, let's understand the key abstractions:

### 1. **Seal** (Encrypt + Prove)

Sealing is the process of encrypting data while simultaneously creating a zero-knowledge proof that the encrypted data meets certain criteria. You can prove something about your data without revealing the data itself.

```typescript
interface SealedData<T> {
  ciphertext: string;        // Encrypted data
  proof: ZKProof;            // Zero-knowledge proof
  commitment: string;        // Hash commitment for verification
  publicMetadata?: T;        // Non-sensitive metadata
}
```

### 2. **Verify** (Validate Proofs)

Verification checks that a proof is valid without revealing the sealed data. Anyone can verify that your data meets requirements.

```typescript
interface VerificationResult {
  valid: boolean;
  publicOutputs: Record<string, unknown>;
  verifiedAt: Date;
  metadata?: VerificationMetadata;
}
```

### 3. **Decrypt** (For Authorized Parties)

Decryption allows authorized parties to access the original data. Access can be controlled through various mechanisms.

```typescript
interface DecryptedData<T> {
  data: T;
  revealedFields: string[];  // Which fields were revealed
  proof: ZKProof;            // Original proof for auditing
}
```

---

## Complete Usage Examples

### Basic Setup

```typescript
import { 
  EasySDK, 
  SealOptions, 
  VerifyOptions,
  DecryptOptions 
} from '@midnight/easy-sdk';

// Initialize the SDK
const sdk = new EasySDK({
  network: 'testnet',        // 'mainnet' | 'testnet' | 'local'
  endpoint: 'https://api.testnet.midnight.network',
  wallet: {
    type: 'browser',         // 'browser' | 'seed' | 'hardware'
    dAppName: 'My Privacy App'
  }
});

// Connect wallet
await sdk.connect();
console.log('Connected:', sdk.getAddress());
```

### Example 1: Sealing Private Data

Let's say you're building a loan application where users need to prove their income is above a threshold without revealing their exact salary.

```typescript
import { EasySDK, IncomeProofSchema } from '@midnight/easy-sdk';

// Define what you want to prove
const sealOptions: SealOptions = {
  schema: IncomeProofSchema,
  data: {
    annualIncome: 85000,
    employerVerified: true,
    employmentStatus: 'full-time'
  },
  // Prove income > 50000 without revealing exact amount
  constraints: {
    minimumIncome: 50000,
    requiredVerification: 'employer'
  },
  // Public data that will be visible
  publicMetadata: {
    loanType: 'mortgage',
    applicationId: 'APP-2024-001'
  }
};

// Seal the data
const sealedData = await sdk.seal(sealOptions);

console.log('Sealed successfully!');
console.log('Commitment:', sealedData.commitment);
console.log('Proof generated:', sealedData.proof.isValid);

// This can now be sent to a smart contract or shared with third parties
```

### Example 2: Verifying Sealed Data

The lender can verify the proof without ever seeing the actual income:

```typescript
import { EasySDK, VerificationLevel } from '@midnight/easy-sdk';

const verifyOptions: VerifyOptions = {
  commitment: sealedData.commitment,
  proof: sealedData.proof,
  schema: IncomeProofSchema,
  // What to verify
  requirements: {
    minimumIncome: 50000,
    requireEmployerVerification: true
  },
  // Verification strictness
  level: VerificationLevel.STRICT
};

// Verify without seeing the data
const result = await sdk.verify(verifyOptions);

if (result.valid) {
  console.log('✅ Income verified!');
  console.log('Public outputs:', result.publicOutputs);
  console.log('Verified at:', result.verifiedAt);
  
  // You can now proceed with the loan application
  // The borrower qualifies, but you don't know their exact income!
} else {
  console.log('❌ Verification failed');
  console.log('Reason:', result.failureReason);
}
```

### Example 3: Decrypting for Authorized Access

When you need to reveal specific data to authorized parties:

```typescript
import { EasySDK, DecryptionPolicy } from '@midnight/easy-sdk';

const decryptOptions: DecryptOptions = {
  sealedData: sealedData,
  // Who is requesting access
  recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f',
  // What to reveal
  policy: new DecryptionPolicy({
    revealFields: ['annualIncome'],        // Only reveal income
    hideFields: ['employerVerified'],      // Keep this hidden
    requireMFA: true,                      // Require additional verification
    expiryTime: Date.now() + 3600000,      // Access valid for 1 hour
    auditRequired: true                    // Log this access
  })
};

// Decrypt the allowed fields
const decrypted = await sdk.decrypt(decryptOptions);

console.log('Decrypted data:', decrypted.data);
// Output: { annualIncome: 85000 }
// (Only the allowed field is revealed)
```

### Example 4: Batch Operations

Processing multiple proofs efficiently:

```typescript
import { EasySDK } from '@midnight/easy-sdk';

// Seal multiple records
const incomeRecords = [
  { annualIncome: 75000, employer: 'TechCorp' },
  { annualIncome: 92000, employer: 'FinanceHub' },
  { annualIncome: 68000, employer: 'StartupX' }
];

const sealResults = await sdk.sealBatch(incomeRecords, {
  schema: IncomeProofSchema,
  constraints: { minimumIncome: 50000 }
});

// Verify all at once
const verificationResults = await sdk.verifyBatch(
  sealResults.map(r => ({
    commitment: r.commitment,
    proof: r.proof
  }))
);

// Process results
const approved = verificationResults
  .filter(r => r.valid)
  .map(r => r.publicOutputs);

console.log(`Approved: ${approved.length}/${incomeRecords.length}`);
```

---

## React Hooks Integration

The Easy SDK includes React hooks for seamless integration in your frontend applications.

### Installation

```bash
npm install @midnight/easy-sdk @midnight/react-hooks
```

### Setup Provider

```tsx
// App.tsx
import { MidnightProvider } from '@midnight/react-hooks';

function App() {
  return (
    <MidnightProvider
      config={{
        network: 'testnet',
        endpoint: 'https://api.testnet.midnight.network',
        theme: 'dark'  // Optional: 'light' | 'dark' | 'auto'
      }}
    >
      <YourApp />
    </MidnightProvider>
  );
}
```

### useMidnight - Main Hook

```tsx
// hooks/usePrivacy.ts
import { useMidnight, SealOptions, VerifyOptions } from '@midnight/react-hooks';
import { useState, useCallback } from 'react';

export function usePrivacyVerification() {
  const { 
    sdk,                    // The SDK instance
    address,                // Connected wallet address
    isConnected,            // Connection status
    isLoading,              // Operation in progress
    error,                  // Any errors
    connect,                // Connect wallet function
    disconnect              // Disconnect function
  } = useMidnight();

  const [verificationStatus, setVerificationStatus] = useState<string>('');

  const sealIncomeData = useCallback(async (incomeData: IncomeData) => {
    if (!sdk) {
      throw new Error('SDK not initialized');
    }

    const sealOptions: SealOptions = {
      schema: 'income-proof',
      data: incomeData,
      constraints: {
        minimumIncome: 50000,
        requireEmployerVerification: true
      },
      publicMetadata: {
        timestamp: Date.now(),
        dAppIdentifier: 'loan-app-v1'
      }
    };

    try {
      setVerificationStatus('Sealing your data...');
      const result = await sdk.seal(sealOptions);
      setVerificationStatus('Data sealed successfully!');
      return result;
    } catch (err) {
      setVerificationStatus('Sealing failed');
      throw err;
    }
  }, [sdk]);

  const verifyIncomeProof = useCallback(async (proof: ZKProof) => {
    if (!sdk) {
      throw new Error('SDK not initialized');
    }

    const verifyOptions: VerifyOptions = {
      commitment: proof.commitment,
      proof: proof.proof,
      schema: 'income-proof',
      requirements: {
        minimumIncome: 50000
      }
    };

    return await sdk.verify(verifyOptions);
  }, [sdk]);

  return {
    sdk,
    address,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    sealIncomeData,
    verifyIncomeProof,
    verificationStatus
  };
}
```

### useSeal - Data Sealing Hook

```tsx
// components/SealIncomeForm.tsx
import { useSeal } from '@midnight/react-hooks';
import { useState } from 'react';

interface IncomeData {
  annualIncome: number;
  employer: string;
  employmentStatus: string;
}

export function SealIncomeForm() {
  const [formData, setFormData] = useState<IncomeData>({
    annualIncome: 0,
    employer: '',
    employmentStatus: 'full-time'
  });

  const { 
    seal,           // Function to seal data
    result,          // Sealing result
    isSealing,       // Loading state
    error,           // Error state
    reset            // Reset function
  } = useSeal<IncomeData>({
    schema: 'income-proof',
    constraints: {
      minimumIncome: 50000
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const sealed = await seal(formData);
    
    console.log('Commitment:', sealed.commitment);
    console.log('Proof:', sealed.proof);
    
    // Send to your backend or smart contract
    await submitToContract(sealed);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        value={formData.annualIncome}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          annualIncome: Number(e.target.value)
        }))}
        placeholder="Annual Income"
      />
      
      <input
        type="text"
        value={formData.employer}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          employer: e.target.value
        }))}
        placeholder="Employer"
      />
      
      <button 
        type="submit" 
        disabled={isSealing}
      >
        {isSealing ? 'Sealing...' : 'Seal & Submit'}
      </button>
      
      {error && <p className="error">{error.message}</p>}
      {result && (
        <div className="success">
          <p>✅ Data sealed!</p>
          <p>Commitment: {result.commitment}</p>
        </div>
      )}
    </form>
  );
}
```

### useVerify - Verification Hook

```tsx
// components/VerificationStatus.tsx
import { useVerify } from '@midnight/react-hooks';

interface ProofData {
  commitment: string;
  proof: ZKProof;
}

export function VerificationStatus({ proofData }: { proofData: ProofData }) {
  const {
    verify,                // Trigger verification
    result,                // Verification result
    isVerifying,           // Loading state
    isVerified,            // Has been verified
    error,
    lastVerifiedAt
  } = useVerify({
    schema: 'income-proof',
    requirements: {
      minimumIncome: 50000
    },
    autoRefresh: false      // Don't auto-refresh
  });

  return (
    <div className="verification-panel">
      <h3>Verification Status</h3>
      
      <button onClick={() => verify(proofData)} disabled={isVerifying}>
        {isVerifying ? 'Verifying...' : 'Verify Now'}
      </button>
      
      {isVerified && (
        <div className={`status ${result?.valid ? 'valid' : 'invalid'}`}>
          {result?.valid ? (
            <p>✅ Proof Verified</p>
          ) : (
            <p>❌ Verification Failed: {result?.failureReason}</p>
          )}
          
          {lastVerifiedAt && (
            <p className="timestamp">
              Verified at: {lastVerifiedAt.toLocaleTimeString()}
            </p>
          )}
          
          {result?.publicOutputs && (
            <div className="outputs">
              <h4>Public Outputs</h4>
              <pre>{JSON.stringify(result.publicOutputs, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
      
      {error && <p className="error">{error.message}</p>}
    </div>
  );
}
```

### useDecrypt - Decryption Hook

```tsx
// components/DecryptModal.tsx
import { useDecrypt } from '@midnight/react-hooks';

interface DecryptModalProps {
  sealedData: SealedData;
  onClose: () => void;
}

export function DecryptModal({ sealedData, onClose }: DecryptModalProps) {
  const {
    decrypt,
    result,
    isDecrypting,
    error,
    isAuthorized,
    authorizationStatus
  } = useDecrypt(sealedData, {
    policies: ['reveal-income', 'hide-employer'],
    requireMFA: true
  });

  const handleDecrypt = async () => {
    const decrypted = await decrypt({
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f'
    });
    
    console.log('Decrypted:', decrypted.data);
  };

  return (
    <div className="modal">
      <h3>Decrypt Data</h3>
      
      <p>Authorization Status: {authorizationStatus}</p>
      
      {isAuthorized ? (
        <>
          <p>You are authorized to view this data.</p>
          
          <button onClick={handleDecrypt} disabled={isDecrypting}>
            {isDecrypting ? 'Decrypting...' : 'Decrypt'}
          </button>
          
          {result && (
            <div className="decrypted-data">
              <h4>Decrypted Content</h4>
              <pre>{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          )}
        </>
      ) : (
        <p>You are not authorized to decrypt this data.</p>
      )}
      
      <button onClick={onClose}>Close</button>
      
      {error && <p className="error">{error.message}</p>}
    </div>
  );
}
```

---

## Real-World Use Cases

### 1. **KYC/AML Verification**

```typescript
// Seal identity documents without exposing personal data
const kycSeal = await sdk.seal({
  schema: 'kyc-proof',
  data: {
    age: 25,
    country: 'USA',
    accredited: true,
    documentsHash: '0xabc123...'
  },
  constraints: {
    minimumAge: 18,
    restrictedCountries: ['North Korea', 'Iran']
  }
});

// Platform verifies age > 18 without knowing exact age or identity
```

### 2. **Private Credit Scoring**

```typescript
// Prove credit score is above threshold without revealing the score
const creditProof = await sdk.seal({
  schema: 'credit-proof',
  data: {
    creditScore: 750,
    paymentHistory: 'excellent',
    debtToIncomeRatio: 0.3
  },
  constraints: {
    minimumScore: 700,
    maximumDTI: 0.4
  }
});
```

### 3. **Supply Chain Verification**

```typescript
// Prove product authenticity without revealing supply chain details
const authenticityProof = await sdk.seal({
  schema: 'supply-chain-proof',
  data: {
    origin: 'Germany',
    certified: true,
    temperature: 4.5,  // Celsius
    transitTime: 72   // hours
  },
  constraints: {
    requiredCertifications: ['ISO-9001', 'Organic'],
    maxTemperature: 8
  }
});
```

---

## Error Handling Best Practices

```typescript
import { 
  EasySDK, 
  MidnightError,
  ValidationError,
  NetworkError,
  WalletError 
} from '@midnight/easy-sdk';

try {
  const result = await sdk.seal(options);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Invalid input:', error.details);
    // Show user-friendly form validation errors
  } else if (error instanceof NetworkError) {
    console.log('Network issue:', error.message);
    // Offer retry or offline mode
  } else if (error instanceof WalletError) {
    console.log('Wallet issue:', error.code);
    // Prompt user to connect/reconnect wallet
  } else if (error instanceof MidnightError) {
    console.log('SDK error:', error.message);
    // Generic SDK error handling
  }
}
```

---

## Performance Tips

```typescript
// 1. Batch operations when possible
const results = await sdk.sealBatch(largeDataset, options);

// 2. Use caching for repeated verifications
const cachedVerification = sdk.getCachedVerification(commitment);
if (cachedVerification?.isValid) {
  return cachedVerification;
}

// 3. Enable parallel processing
const [sealResult, fetchUserData] = await Promise.all([
  sdk.seal(data),
  fetchUserProfile()
]);

// 4. Configure timeout for production
const sdk = new EasySDK({
  // ...
  timeout: 30000,  // 30 seconds
  retries: 3       // Auto-retry on failure
});
```

---

## Project Resources

- **GitHub Repository**: [github.com/midnight-protocol/easy-sdk](https://github.com/midnight-protocol/easy-sdk)
- **Documentation**: [docs.midnight.network/easy-sdk](https://docs.midnight.network/easy-sdk)
- **npm Package**: [npmjs.com/package/@midnight/easy-sdk](https://npmjs.com/package/@midnight/easy-sdk)
- **Discord Community**: [discord.gg/midnight](https://discord.gg/midnight)

---

## Next Steps

1. **Get Started**: Clone the example repository and run the demo
2. **Read the Docs**: Check out the comprehensive documentation
3. **Join the Community**: Connect with other developers on Discord
4. **Contribute**: Found a bug or have a feature request? Open an issue!

---

## Conclusion

The Midnight Easy SDK transforms what was once a complex cryptographic challenge into a straightforward developer experience. By abstracting away the complexity of zero-knowledge proofs, it opens the door for mainstream developers to build privacy-preserving applications.

Whether you're building financial applications, identity verification systems, or any project that needs to balance privacy with trust — Easy SDK gives you the tools to do it right.

**Start building today, and make privacy the default.**

---

*Have questions or want to share your project? Drop a comment below!*

---

**Tags**: #midnight #privacy #typescript #react #zeroknowledge

**Let's connect**: [Twitter](https://twitter.com/midnight) | [GitHub](https://github.com/midnight-protocol) | [Discord](https://discord.gg/midnight)