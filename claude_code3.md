```json:path=package.json
{
  "name": "midnight-easy-sdk",
  "version": "1.0.0",
  "description": "Midnight Easy SDK - A lightweight, intuitive TypeScript SDK for modern applications",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --clean",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "sdk",
    "midnight",
    "easy",
    "typescript",
    "api",
    "client"
  ],
  "author": "Midnight Team",
  "license": "MIT",
  "peerDependencies": {
    "typescript": ">=5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@vitest/coverage-v8": "^1.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

```json:path=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

```markdown:path=README.md
# Midnight Easy SDK

A lightweight, intuitive TypeScript SDK for modern applications. Designed for simplicity and ease of use.

## Features

- 🚀 **Lightweight** - Minimal dependencies, small bundle size
- 📦 **TypeScript Native** - Full TypeScript support with complete type definitions
- 🔄 **Promise-based** - Modern async/await API
- 🧪 **Well Tested** - Comprehensive test coverage

## Installation

```bash
npm install midnight-easy-sdk
```

```bash
yarn add midnight-easy-sdk
```

```bash
pnpm add midnight-easy-sdk
```

## Quick Start

```typescript
import { MidnightClient, Seal, createSeal } from 'midnight-easy-sdk';

// Initialize the client
const client = new MidnightClient({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Create a seal instance
const seal = createSeal(client, {
  name: 'my-seal',
  config: {
    enabled: true
  }
});

// Use the seal
await seal.validate('some-data');
```

## API Reference

### MidnightClient

The main client for interacting with the Midnight API.

```typescript
const client = new MidnightClient(options: ClientOptions);
```

#### ClientOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `apiKey` | `string` | Yes | Your API key |
| `environment` | `'production' \| 'staging' \| 'development'` | No | Target environment (default: `'development'`) |
| `timeout` | `number` | No | Request timeout in ms (default: `30000`) |
| `retries` | `number` | No | Number of retry attempts (default: `3`) |

#### Methods

##### `connect()`

Establishes a connection to the Midnight API.

```typescript
await client.connect(): Promise<void>
```

##### `disconnect()`

Closes the connection and cleans up resources.

```typescript
await client.disconnect(): Promise<void>
```

##### `isConnected()`

Returns the current connection status.

```typescript
client.isConnected(): boolean
```

---

### Seal

The Seal class provides data validation and sealing capabilities.

```typescript
const seal = new Seal(options: SealOptions);
```

#### SealOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Unique identifier for the seal |
| `config` | `SealConfig` | No | Configuration options |
| `onValidate` | `ValidateCallback` | No | Callback for validation events |

#### SealConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | `boolean` | No | Whether the seal is active (default: `true`) |
| `strict` | `boolean` | No | Enable strict mode (default: `false`) |
| `timeout` | `number` | No | Validation timeout in ms |

#### Methods

##### `validate(data: unknown)`

Validates the provided data against the seal rules.

```typescript
await seal.validate(data: unknown): Promise<ValidationResult>
```

##### `seal(data: unknown)`

Seals the provided data.

```typescript
await seal.seal(data: unknown): Promise<SealedData>
```

##### `unseal(token: string)`

Unseals previously sealed data.

```typescript
await seal.unseal(token: string): Promise<unknown>
```

##### `destroy()`

Destroys the seal instance and releases resources.

```typescript
seal.destroy(): void
```

---

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  timestamp: number;
  sealId: string;
}
```

### ValidationError

```typescript
interface ValidationError {
  code: string;
  message: string;
  field?: string;
}
```

### SealedData

```typescript
interface SealedData {
  token: string;
  expiresAt: number;
  metadata?: Record<string, unknown>;
}
```

---

## Factory Functions

### `createSeal(client, options)`

Creates a new Seal instance connected to the client.

```typescript
import { createSeal } from 'midnight-easy-sdk';

const seal = createSeal(client, {
  name: 'my-seal',
  config: {
    enabled: true
  }
});
```

### `createClient(options)`

Convenience function to create a new MidnightClient.

```typescript
import { createClient } from 'midnight-easy-sdk';

const client = createClient({
  apiKey: 'your-api-key'
});
```

---

## Error Handling

The SDK provides custom error classes for different error scenarios:

```typescript
import { MidnightError, ValidationError, NetworkError } from 'midnight-easy-sdk';

try {
  await seal.validate(data);
} catch (error) {
  if (error instanceof MidnightError) {
    console.error('SDK Error:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network Error:', error.message);
  }
}
```

### Error Classes

| Class | Description |
|-------|-------------|
| `MidnightError` | Base error class for all SDK errors |
| `ValidationError` | Thrown when validation fails |
| `NetworkError` | Thrown when network operations fail |
| `TimeoutError` | Thrown when operations timeout |

---

## Examples

### Basic Validation

```typescript
import { MidnightClient, Seal } from 'midnight-easy-sdk';

const client = new MidnightClient({ apiKey: 'test-key' });
const seal = new Seal({ name: 'validator' });

await seal.validate({ name: 'Test', value: 123 });
```

### Sealing and Unsealing Data

```typescript
import { createClient, createSeal } from 'midnight-easy-sdk';

const client = createClient({ apiKey: 'test-key' });
const seal = createSeal(client, { name: 'data-sealer' });

// Seal sensitive data
const sealed = await seal.seal({ userId: '123', secret: 'xyz' });
console.log('Token:', sealed.token);

// Retrieve sealed data
const unsealed = await seal.unseal(sealed.token);
console.log('Data:', unsealed);
```

### With Connection Management

```typescript
import { createClient, createSeal } from 'midnight-easy-sdk';

const client = createClient({ 
  apiKey: 'test-key',
  retries: 5
});

await client.connect();
console.log('Connected:', client.isConnected());

// ... use SDK ...

await client.disconnect();
```

---

## Testing

Run tests with Vitest:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

---

## License

MIT © Midnight Team

## Support

For issues and feature requests, please open an issue on GitHub.
```

```typescript:path=tests/seal.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  MidnightClient, 
  Seal, 
  createSeal, 
  createClient,
  MidnightError,
  ValidationError,
  NetworkError,
  TimeoutError,
  type ClientOptions,
  type SealOptions,
  type ValidationResult,
  type SealedData
} from '../src/index';

describe('MidnightClient', () => {
  let client: MidnightClient;

  afterEach(() => {
    client?.disconnect();
  });

  describe('constructor', () => {
    it('should create a client with default options', () => {
      client = new MidnightClient({ apiKey: 'test-key' });
      expect(client.isConnected()).toBe(false);
    });

    it('should create a client with custom options', () => {
      client = new MidnightClient({
        apiKey: 'test-key',
        environment: 'production',
        timeout: 5000,
        retries: 5
      });
      expect(client.isConnected()).toBe(false);
    });

    it('should throw error when apiKey is missing', () => {
      expect(() => new MidnightClient({} as ClientOptions)).toThrow(MidnightError);
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      client = new MidnightClient({ apiKey: 'test-key' });
      await client.connect();
      expect(client.isConnected()).toBe(true);
    });

    it('should throw NetworkError on connection failure', async () => {
      client = new MidnightClient({ apiKey: 'invalid' });
      await expect(client.connect()).rejects.toThrow(NetworkError);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      client = new MidnightClient({ apiKey: 'test-key' });
      await client.connect();
      await client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      client = new MidnightClient({ apiKey: 'test-key' });
      await client.disconnect();
      expect(client.isConnected()).toBe(false);
    });
  });
});

describe('Seal', () => {
  let seal: Seal;
  let client: MidnightClient;

  beforeEach(() => {
    client = new MidnightClient({ apiKey: 'test-key' });
    seal = new Seal({ name: 'test-seal' });
  });

  afterEach(() => {
    seal.destroy();
    client.disconnect();
  });

  describe('constructor', () => {
    it('should create a seal with default config', () => {
      expect(seal).toBeDefined();
    });

    it('should create a seal with custom config', () => {
      const customSeal = new Seal({
        name: 'custom-seal',
        config: {
          enabled: true,
          strict: true,
          timeout: 1000
        }
      });
      expect(customSeal).toBeDefined();
      customSeal.destroy();
    });

    it('should throw error when name is missing', () => {
      expect(() => new Seal({} as SealOptions)).toThrow(MidnightError);
    });
  });

  describe('validate', () => {
    it('should return valid result for valid data', async () => {
      const result = await seal.validate({ data: 'test' });
      expect(result.valid).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.sealId).toBe('test-seal');
    });

    it('should return valid result for string data', async () => {
      const result = await seal.validate('string data');
      expect(result.valid).toBe(true);
    });

    it('should return valid result for number data', async () => {
      const result = await seal.validate(12345);
      expect(result.valid).toBe(true);
    });

    it('should return valid result for array data', async () => {
      const result = await seal.validate([1, 2, 3]);
      expect(result.valid).toBe(true);
    });

    it('should call onValidate callback when provided', async () => {
      const callback = vi.fn();
      const sealWithCallback = new Seal({
        name: 'callback-seal',
        onValidate: callback
      });

      await sealWithCallback.validate('test');
      expect(callback).toHaveBeenCalled();
      sealWithCallback.destroy();
    });

    it('should handle strict mode validation', async () => {
      const strictSeal = new Seal({
        name: 'strict-seal',
        config: { strict: true }
      });

      const result = await strictSeal.validate(null);
      expect(result.valid).toBe(false);
      strictSeal.destroy();
    });
  });

  describe('seal', () => {
    it('should seal data and return token', async () => {
      const sealed = await seal.seal({ secret: 'value' });
      expect(sealed.token).toBeDefined();
      expect(sealed.token.length).toBeGreaterThan(0);
      expect(sealed.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should include metadata when provided', async () => {
      const sealed = await seal.seal('data', { userId: '123' });
      expect(sealed.metadata).toBeDefined();
      expect(sealed.metadata?.userId).toBe('123');
    });

    it('should generate unique tokens for same data', async () => {
      const sealed1 = await seal.seal('same-data');
      const sealed2 = await seal.seal('same-data');
      expect(sealed1.token).not.toBe(sealed2.token);
    });
  });

  describe('unseal', () => {
    it('should unseal previously sealed data', async () => {
      const originalData = { key: 'value' };
      const sealed = await seal.seal(originalData);
      const unsealed = await seal.unseal(sealed.token);
      expect(unsealed).toEqual(originalData);
    });

    it('should throw error for invalid token', async () => {
      await expect(seal.unseal('invalid-token')).rejects.toThrow(ValidationError);
    });

    it('should throw error for expired token', async () => {
      const shortTimeoutSeal = new Seal({
        name: 'timeout-seal',
        config: { timeout: 1 }
      });

      const sealed = await shortTimeoutSeal.seal('data');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await expect(shortTimeoutSeal.unseal(sealed.token)).rejects.toThrow(TimeoutError);
      shortTimeoutSeal.destroy();
    });
  });

  describe('destroy', () => {
    it('should cleanup resources on destroy', () => {
      expect(() => seal.destroy()).not.toThrow();
    });

    it('should handle multiple destroy calls', () => {
      seal.destroy();
      expect(() => seal.destroy()).not.toThrow();
    });
  });
});

describe('Factory Functions', () => {
  describe('createClient', () => {
    it('should create a client instance', () => {
      const client = createClient({ apiKey: 'test' });
      expect(client).toBeInstanceOf(MidnightClient);
      client.disconnect();
    });
  });

  describe('createSeal', () => {
    it('should create a seal instance', () => {
      const client = createClient({ apiKey: 'test' });
      const seal = createSeal(client, { name: 'factory-seal' });
      expect(seal).toBeInstanceOf(Seal);
      seal.destroy();
      client.disconnect();
    });
  });
});

describe('Error Classes', () => {
  describe('MidnightError', () => {
    it('should create error with message', () => {
      const error = new MidnightError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).to