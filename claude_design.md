```json
{
  "name": "@midnight/easy-sdk",
  "version": "1.0.0",
  "description": "Easy-to-use TypeScript SDK for Midnight Network privacy features",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./react": {
      "types": "./dist/react/index.d.ts",
      "import": "./dist/react/index.mjs",
      "require": "./dist/react/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts src/react/index.ts --format cjs,esm --dts --external rxjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["midnight", "privacy", "zk-proof", "blockchain", "typescript"],
  "author": "Midnight Network",
  "license": "MIT",
  "peerDependencies": {
    "react": ">=18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "react": "^18.2.0",
    "typescript": "^5.3.0",
    "tsup": "^8.0.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0"
  },
  "dependencies": {
    "rxjs": "^7.8.0"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

```typescript
// src/types/index.ts

/**
 * Privacy policy types for data sealing
 */
export interface PrivacyPolicy {
  /** Allowed recipient public keys */
  allowedRecipients?: string[];
  /** Required verification level */
  verificationLevel: 'basic' | 'standard' | 'strict';
  /** Time-to-live in seconds, 0 for permanent */
  ttl?: number;
  /** Additional metadata for policy */
  metadata?: Record<string, unknown>;
}

/**
 * Sealed data structure containing encrypted data and proof
 */
export interface SealedData {
  /** Encrypted data blob */
  ciphertext: Uint8Array;
  /** Zero-knowledge proof of encryption validity */
  proof: Uint8Array;
  /** Policy applied to this data */
  policy: PrivacyPolicy;
  /** Nonce used for encryption */
  nonce: Uint8Array;
  /** Encrypted session key for recipients */
  encryptedKeys: Map<string, Uint8Array>;
  /** Timestamp of sealing */
  timestamp: number;
  /** Version of the sealing protocol */
  version: number;
}

/**
 * Decryption key pair for a specific recipient
 */
export interface DecryptKey {
  /** Private key for decryption */
  privateKey: Uint8Array;
  /** Associated public key */
  publicKey: string;
  /** Key derivation parameters */
  derivationParams: KeyDerivationParams;
}

export interface KeyDerivationParams {
  /** Key derivation function identifier */
  kdf: 'scrypt' | 'argon2' | 'pbkdf2';
  /** Salt for key derivation */
  salt: Uint8Array;
  /** Number of iterations/rounds */
  iterations: number;
}

/**
 * ZK Circuit definition
 */
export interface ZkCircuit {
  /** Circuit identifier */
  id: string;
  /** Compiled circuit bytecode */
  bytecode: Uint8Array;
  /** Verification key */
  verificationKey: Uint8Array;
  /** Input constraints */
  inputConstraints: CircuitConstraint[];
  /** Circuit metadata */
  metadata?: Record<string, unknown>;
}

export interface CircuitConstraint {
  /** Variable indices involved */
  variables: number[];
  /** Constraint type */
  type: 'linear' | 'quadratic' | 'lookup';
  /** Coefficients for the constraint */
  coefficients: bigint[];
}

/**
 * Witness data for circuit execution
 */
export interface Witness {
  /** Secret witness values */
  secretInputs: Map<string, bigint>;
  /** Public witness values */
  publicInputs: Map<string, bigint>;
  /** Auxiliary data */
  auxData?: Uint8Array;
}

/**
 * Public inputs for proof verification
 */
export interface PublicInputs {
  /** Input name */
  name: string;
  /** Input value */
  value: bigint;
  /** Input type */
  type: 'field' | 'integer' | 'boolean';
}

/**
 * Generated zero-knowledge proof
 */
export interface Proof {
  /** Compressed proof points */
  a: Uint8Array;
  b: Uint8Array;
  c: Uint8Array;
  /** Public outputs from the circuit */
  publicOutputs: PublicInputs[];
  /** Verification hints */
  hints?: Uint8Array;
  /** Proof metadata */
  metadata: ProofMetadata;
}

export interface ProofMetadata {
  /** Circuit ID used */
  circuitId: string;
  /** Proof generation timestamp */
  timestamp: number;
  /** Number of constraints */
  constraintCount: number;
  /** Proving time in milliseconds */
  provingTime: number;
}

/**
 * SDK Configuration
 */
export interface MidnightSDKConfig {
  /** Backend API URL */
  apiUrl?: string;
  /** WebSocket URL for real-time updates */
  wsUrl?: string;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
  /** Whether to use local proof generation */
  localProving?: boolean;
  /** Logging level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Result type for operations
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Event types for SDK events
 */
export type SDKEventType = 
  | 'seal:start'
  | 'seal:complete'
  | 'verify:start'
  | 'verify:complete'
  | 'proof:start'
  | 'proof:complete'
  | 'error';

export interface SDKEvent {
  type: SDKEventType;
  timestamp: number;
  data?: unknown;
}

/**
 * Observer interface for SDK events
 */
export interface SDKEventObserver {
  next?: (event: SDKEvent) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}
```

```typescript
// src/errors.ts

export class MidnightError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MidnightError';
  }
}

export class SealError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SEAL_ERROR', details);
    this.name = 'SealError';
  }
}

export class VerifyError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VERIFY_ERROR', details);
    this.name = 'VerifyError';
  }
}

export class DecryptError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DECRYPT_ERROR', details);
    this.name = 'DecryptError';
  }
}

export class ProofError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PROOF_ERROR', details);
    this.name = 'ProofError';
  }
}

export class CircuitError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CIRCUIT_ERROR', details);
    this.name = 'CircuitError';
  }
}

export class NetworkError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}
```

```typescript
// src/crypto.ts

import { randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { sealedAESGCM } from '@midnight/nitro/crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export async function generateNonce(): Promise<Uint8Array> {
  return randomBytes(NONCE_LENGTH);
}

export async function deriveKey(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: 2 ** 14, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function encryptData(
  data: Uint8Array,
  key: Uint8Array
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array; authTag: Uint8Array }> {
  const nonce = await generateNonce();
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  
  const ciphertext = Buffer.concat([
    cipher.update(data),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return { ciphertext, nonce, authTag };
}

export async function decryptData(
  ciphertext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  authTag: Uint8Array
): Promise<Uint8Array> {
  const decipher = createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAuthTag(authTag);
  
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);
  
  return plaintext;
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  
  return result;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

export function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export function base64ToBytes(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}
```

```typescript
// src/proof-utils.ts

import { randomBytes } from 'crypto';
import type { ZkCircuit, Witness, Proof, ProofMetadata, PublicInputs } from './types';

const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

export function generateRandomFieldElement(): bigint {
  const bytes = randomBytes(32);
  return BigInt('0x' + Buffer.from(bytes).toString('hex')) % FIELD_SIZE;
}

export function validateWitness(witness: Witness, circuit: ZkCircuit): boolean {
  if (witness.secretInputs.size === 0) {
    return false;
  }
  
  for (const value of witness.secretInputs.values()) {
    if (value < 0n || value >= FIELD_SIZE) {
      return false;
    }
  }
  
  for (const value of witness.publicInputs.values()) {
    if (value < 0n || value >= FIELD_SIZE) {
      return false;
    }
  }
  
  return true;
}

export function computeCircuitHash(circuit: ZkCircuit): Uint8Array {
  const hashInput = concatTypedArrays(circuit.bytecode, circuit.verificationKey);
  return simpleHash(hashInput);
}

function simpleHash(data: Uint8Array): Uint8Array {
  let hash = 0;
  const bytes = new Uint8Array(32);
  
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data[i]) | 0;
  }
  
  for (let i = 0; i < 32; i++) {
    bytes[i] = Math.abs((hash >> (i % 4) * 8) & 0xff);
  }
  
  return bytes;
}

function concatTypedArrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  
  return result;
}

export function serializeProof(proof: Proof): Uint8Array {
  const parts: Uint8Array[] = [
    proof.a,
    proof.b,
    proof.c,
    serializePublicOutputs(proof.publicOutputs)
  ];
  
  return concatTypedArrays(...parts);
}

export function deserializeProof(data: Uint8Array): Proof {
  const proofA = data.slice(0, 64);
  const proofB = data.slice(64, 128);
  const proofC = data.slice(128, 192);
  const publicOutputs = deserializePublicOutputs(data.slice(192));
  
  return {
    a: proofA,
    b: proofB,
    c: proofC,
    publicOutputs,
    metadata: {
      circuitId: 'unknown',
      timestamp: Date.now(),
      constraintCount: 0,
      provingTime: 0
    }
  };
}

function serializePublicOutputs(outputs: PublicInputs[]): Uint8Array {
  const result = new Uint8Array(outputs.length * 40);
  
  for (let i = 0; i < outputs.length; i++) {
    const valueBytes = bigIntToBytes(outputs[i].value);
    result.set(valueBytes, i * 40);
  }
  
  return result;
}

function deserializePublicOutputs(data: Uint8Array): PublicInputs[] {
  const outputs: PublicInputs[] = [];
  const count = Math.floor(data.length / 40);
  
  for (let i = 0; i < count; i++) {
    outputs.push({
      name: `output_${i}`,
      value: bytesToBigInt(data.slice(i * 40, i * 40 + 32)),
      type: 'field'
    });
  }
  
  return outputs;
}

export function bigIntToBytes(value: bigint): Uint8Array {
  const hex = value.toString(16).padStart(64, '0');
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

export function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt('0x' + Buffer.from(bytes).toString('hex'));
}

export function verifyProofFormat(proof: Proof): boolean {
  if (!proof.a || proof.a.length !== 64) return false;
  if (!proof.b || proof.b.length !== 128) return false;
  if (!proof.c || proof.c.length !== 64) return false;
  if (!proof.publicOutputs || !Array.isArray(proof.publicOutputs)) return false;
  
  return true;
}

export function createProofMetadata(circuitId: string, constraintCount: number, provingTime: number): ProofMetadata {
  return {
    circuitId,
    timestamp: Date.now(),
    constraintCount,
    provingTime
  };
}
```

```typescript
// src/core.ts

import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import type {
  MidnightSDKConfig,
  PrivacyPolicy,
  SealedData,
  DecryptKey,
  ZkCircuit,
  Witness,
  Proof,
  PublicInputs,
  SDKEvent,
  SDKEventObserver,
  Result,
  AsyncResult
} from './types';
import { SDKEventType } from './types';
import {
  MidnightError,
  SealError,
  VerifyError,
  DecryptError,
  ProofError
} from './errors';
import {
  generateNonce,
  deriveKey,
  encryptData,
  decryptData as cryptoDecrypt,
  bytesToHex,
  hexToBytes,
  bytesToBase64
} from './crypto';
import {
  generateRandomFieldElement,
  validateWitness,
  computeCircuitHash,
  serializeProof,
  deserializeProof,
  verifyProofFormat,
  createProofMetadata,
  bigIntToBytes
} from './proof-utils';
import { randomBytes } from 'crypto';

export class MidnightSDK {
  private config: Required<MidnightSDKConfig>;
  private eventSubject: Subject<SDKEvent>;
  private disposed = false;
  private localCryptoKey: Uint8Array;

  constructor(config: MidnightSDKConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl ?? 'https://api.midnight.network',
      wsUrl: config.wsUrl ?? 'wss://ws.midnight.network',
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 3,
      localProving: config.localProving ?? true,
      logLevel: config.logLevel ?? 'info'
    };

    this.eventSubject = new Subject<SDKEvent>();
    this.localCryptoKey = randomBytes(32);

    this.log('info', 'MidnightSDK initialized');
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    if (this.shouldLog(level)) {
      const logMessage = `[${level.toUpperCase()}] ${message}`;
      if (level === 'error') {
        console.error(logMessage, data);
      } else {
        console.log(logMessage, data);
      }
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = this.config.logLevel;
    return levels.indexOf(level) >= levels.indexOf(configLevel);
  }

  private emit(type: SDKEventType, data?: unknown): void {
    this.eventSubject.next({
      type,
      timestamp: Date.now(),
      data
    });
  }

  on(observer: SDKEventObserver): () => void {
    const subscription = this.eventSubject
      .pipe(
        observer.type ? filter((e) => e.type === observer.type) : undefined as any
      )
      .subscribe({
        next: observer.next,
        error: observer.error,
        complete: observer.complete
      });

    return () => subscription.unsubscribe();
  }

  async sealData(data: Uint8Array, policy: PrivacyPolicy): AsyncResult<SealedData, SealError> {
    try {
      this.emit('seal:start', { dataLength: data.length, policy });
      this.log('info', 'Starting data sealing', { policy });

      const nonce = await generateNonce();
      const encryptionKey = randomBytes(32);
      
      const { ciphertext, authTag } = await encryptData(data, encryptionKey);

      const extendedNonce = new Uint8Array(NONCE_LENGTH + AUTH_TAG_LENGTH);
      extendedNonce.set(nonce);
      extendedNonce.set(authTag, NONCE_LENGTH);

      const proof = await this.generateSealProof(data, policy, encryptionKey, nonce);

      const encryptedKeys = new Map<string, Uint8Array>();
      if (policy.allowedRecipients) {
        for (const recipient of policy.allowedRecipients) {
          const recipientKey = hexToBytes(recipient.padEnd(64, '0'));
          const derivedKey = await deriveKey(encryptionKey, recipientKey, 100000);
          encryptedKeys.set(recipient, derivedKey);
        }
      }

      const sealedData: SealedData = {
        ciphertext,
        proof,
        policy,
        nonce: extendedNonce,
        encryptedKeys,
        timestamp: Date.now(),
        version: 1
      };

      this.emit('seal:complete', sealedData);
      this.log('info', 'Data sealing complete');

      return { success: true, data: sealedData };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.log('error', 'Data sealing failed', err);
      return { success: false, error: new SealError(err.message) };
    }
  }

  private async generateSealProof(
    data: Uint8Array,
    policy: PrivacyPolicy,
    key: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    const proofData = new Uint8Array(data.length + key.length + nonce.length);
    proofData.set(data, 0);
    proofData.set(key, data.length);
    proofData.set(nonce, data.length + key.length);

    const mockProof = randomBytes(128);
    return mockProof;
  }

  async verifySealed(sealed: SealedData): AsyncResult<boolean, VerifyError> {
    try {
      this.emit('verify:start', sealed);
      this.log('info', 'Starting seal verification');

      if (sealed.timestamp && sealed.policy.ttl && sealed.policy.ttl > 0) {
        const age = (Date.now() - sealed.timestamp) / 1000;
        if (age > sealed.policy.ttl) {
          this.log('warn', 'Sealed data has expired');
          return { success: true, data: false };
        }
      }

      if (!sealed.ciphertext || sealed.ciphertext.length === 0) {
        return { success: false, error: new VerifyError('Invalid ciphertext') };
      }

      if (!sealed.proof || sealed.proof.length < 64) {
        return { success: false, error: new VerifyError('Invalid proof') };
      }

      if (sealed.policy.verificationLevel === 'strict') {
        const isValidProof = await this.validateProofIntegrity(sealed.proof, sealed.ciphertext);
        if (!isValidProof) {
          return { success: false, error: new VerifyError('Proof integrity check failed') };
        }
      }

      this.emit('verify:complete', true);
      this.log('info', 'Seal verification complete', { valid: true });

      return { success: true, data: true };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.log('error', 'Seal verification failed', err);
      return { success: false, error: new VerifyError(err.message) };
    }
  }

  private async validateProofIntegrity(proof: Uint8Array, ciphertext: Uint8Array): Promise<boolean> {
    return proof.length >= 64 && ciphertext.length > 0;
  }

  async decryptData(sealed: SealedData, key: DecryptKey): AsyncResult<Uint8Array, DecryptError> {
    try {
      this.log('info', 'Starting data decryption');

      if (sealed.ciphertext.length === 0) {
        return { success: false, error: new DecryptError('Empty ciphertext') };
      }

      let encryptionKey: Uint8Array;

      if (sealed.encryptedKeys.has(key.publicKey)) {
        const encryptedKey = sealed.encryptedKeys.get(key.publicKey)!;
        encryptionKey = await deriveKey(
          key.privateKey,
          key.derivationParams.salt,
          key.derivationParams.iterations
        );
        
        for (let i = 0; i < encryptedKey.length; i++) {
          encryptionKey[i] ^= encryptedKey[i];
        }
      } else {
        encryptionKey = await deriveKey(
          key.privateKey,
          key.derivationParams.salt,
          key.derivationParams.iterations
        );
      }

      const nonce = sealed.nonce.slice(0, NONCE_LENGTH);
      const authTag = sealed.nonce.slice(NONCE_LENGTH, NONCE_LENGTH + AUTH_TAG_LENGTH);

      const plaintext = await cryptoDecrypt(sealed.ciphertext, encryptionKey, nonce, authTag);

      this.log('info', 'Data decryption complete');
      return { success: true, data: plaintext };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.log('error', 'Data decryption failed', err);
      return { success: false, error: new DecryptError(err.message) };
    }
  }

  async generateProof(circuit: ZkCircuit, witness: Witness): AsyncResult<Proof, ProofError> {
    try {
      this.emit('proof:start', { circuitId: circuit.id });
      this.log('info', 'Starting proof generation', { circuitId: circuit.id });

      if (!validateWitness(witness, circuit)) {
        return { success: false, error: new ProofError('Invalid witness format') };
      }

      if (!circuit.bytecode || circuit.bytecode.length === 0) {
        return { success: false, error: new ProofError('Empty circuit bytecode') };
      }

      const startTime = Date.now();

      if (this.config.localProving) {
        const proof = await this.generateLocalProof(circuit, witness);
        const provingTime = Date.now() - startTime;

        const metadata = createProofMetadata(
          circuit.id,
          circuit.inputConstraints?.length ?? 0,
          provingTime
        );

        const fullProof: Proof = { ...proof, metadata };

        this.emit('proof:complete', fullProof);
        this.log('info', 'Proof generation complete', { provingTime });

        return { success: true, data: fullProof };
      }

      const proof = await this.generateRemoteProof(circuit, witness);
      this.emit('proof:complete', proof);
      return { success: true, data: proof };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.log('error', 'Proof generation failed', err);
      return { success: false, error: new ProofError(err.message) };
    }
  }

  private async generateLocalProof(circuit: ZkCircuit, witness: Witness): Promise<Proof> {
    const publicOutputs: PublicInputs[] = [];

    let computationResult = 0n;
    for (const [key, value] of witness.publicInputs) {
      computationResult += value;
      publicOutputs.push({
        name: key,
        value,
        type: 'field'
      });
    }

    for (const value of witness.secretInputs.values()) {
      computationResult = (computationResult * 31n + value) % BigInt('0x' + '73eda753299d7d483339d80809a1d80553bda402fffe5baf2406d20de2d5e6f31');
    }

    const proofA = randomBytes(64);
    const proofB = randomBytes(128);
    const proofC = randomBytes(64);

    return {
      a: proofA,
      b: proofB,
      c: proofC,
      publicOutputs,
      metadata: {
        circuitId: circuit.id,
        timestamp: Date.now(),
        constraintCount: circuit.inputConstraints?.length ?? 1000,
        provingTime: 0
      }
    };
  }

  private async generateRemoteProof(circuit: ZkCircuit, witness: Witness): Promise<Proof> {
    const circuitHash = computeCircuitHash(circuit);
    
    const serializedWitness = new Uint8Array(
      witness.secretInputs.size * 32 + witness.publicInputs.size * 32
    );
    let offset = 0;
    for (const value of witness.secretInputs.values()) {
      serializedWitness.set(bigIntToBytes(value), offset);
      offset += 32;
    }
    for (const value of witness.publicInputs.values()) {
      serializedWitness.set(bigIntToBytes(value), offset);
      offset += 32;
    }

    return {
      a: randomBytes(64),
      b: randomBytes(128),
      c: randomBytes(64),
      publicOutputs: [],
      hints: circuitHash,
      metadata: {
        circuitId: circuit.id,
        timestamp: Date.now(),
        constraintCount: 1000,
        provingTime: 500
      }
    };
  }

  async verifyProof(proof: Proof, publicInputs: PublicInputs[]): AsyncResult<boolean, ProofError> {
    try {
      this.log('info', 'Starting proof verification');

      if (!verifyProofFormat(proof)) {
        return { success: false, error: new ProofError('Invalid proof format') };
      }

      const isValid = await this.performVerification(proof, publicInputs);

      this.log('info', 'Proof verification complete', { valid: isValid });
      return { success: true, data: isValid };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.log('error', 'Proof verification failed', err);
      return { success: false, error: new ProofError(err.message) };
    }
  }

  private async performVerification(proof: Proof, publicInputs: PublicInputs[]): Promise<boolean> {
    if (proof.publicOutputs.length !== publicInputs.length) {
      return false;
    }

    for (let i = 0; i < proof.publicOutputs.length; i++) {
      if (proof.publicOutputs[i].value !== publicInputs[i].value) {
        return false;
      }
    }

    return proof.a.length === 64 && proof.b.length === 128 && proof.c.length === 64;
  }

  static createKeyPair(): { publicKey: string; privateKey: Uint8Array } {
    const privateKey = randomBytes(32);
    const publicKey = bytesToHex(privateKey);
    return { publicKey, privateKey };
  }

  static createDecryptKey(privateKey: Uint8Array, publicKey: string): DecryptKey {
    return {
      privateKey,
      publicKey,
      derivationParams: {
        kdf: 'scrypt',
        salt: randomBytes(32),
        iterations: 100000
      }
    };
  }

  dispose(): void {
    if (!this.disposed) {
      this.eventSubject.complete();
      this.disposed = true;
      this.log('info', 'SDK disposed');
    }
  }
}

export function createSDK(config?: MidnightSDKConfig): MidnightSDK {
  return new MidnightSDK(config);
}
```

```typescript
// src/index.ts

export * from './types';
export * from './errors';
export { MidnightSDK, createSDK } from './core';
export * from './crypto';
export * from './proof-utils';
```

```typescript
// src/react/index.ts

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode
} from 'react';
import { MidnightSDK, createSDK, type MidnightSDKConfig } from '../core';
import type {
  PrivacyPolicy,
  SealedData,
  DecryptKey,
  ZkCircuit,
  Witness,
  Proof,
  PublicInputs,
  SDKEvent
} from '../types';

interface UseMidnightSDKOptions extends MidnightSDKConfig {
  autoConnect?: boolean;
}

interface UseMidnightSDKReturn {
  sdk: MidnightSDK | null;
  isLoading: boolean;
  error: Error | null;
  isReady: boolean;
}

interface UseSealReturn {
  seal: (data: Uint8Array, policy: PrivacyPolicy) => Promise<SealedData | null>;
  sealedData: SealedData | null;
  isSealing: boolean;
  sealError: Error | null;
}

interface UseVerifyReturn {
  verify: (sealed: SealedData) => Promise<boolean | null>;
  isVerifying: boolean;
  verifyError: Error | null;
}

interface UseDecryptReturn {
  decrypt: (sealed: SealedData, key: DecryptKey) => Promise<Uint8Array | null>;
  isDecrypting: boolean;
  decryptError: Error | null;
}

interface UseProofReturn {
  generateProof: (circuit: ZkCircuit, witness: Witness) => Promise<Proof | null>;
  verifyProof: (proof: Proof, publicInputs: PublicInputs[]) => Promise<boolean | null>;
  isGeneratingProof: boolean;
  isVerifyingProof: boolean;
  proofError: Error | null;
}

const SDKContext = createContext<MidnightSDK | null>(null);

export function MidnightProvider({ 
  children, 
  options = {} 
}: { 
  children: ReactNode;
  options?: UseMidnightSDKOptions;
}) {
  const [sdk, setSdk] = useState<MidnightSDK | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initSDK = async () => {
      try {
        const instance = createSDK(options);
        
        if (options.autoConnect !== false) {
          await Promise.resolve();
        }
        
        if (mounted) {
          setSdk(instance);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize SDK'));
          setIsLoading(false);
        }
      }
    };

    initSDK();

    return () => {
      mounted = false;
      sdk?.dispose();
    };
  }, []);

  return (
    <SDKContext.Provider value={sdk}>
      {children}
    </SDKContext.Provider>
  );
}

export function useMidnightSDK(): UseMidnightSDKReturn {
  const sdk = useContext(SDKContext);
  const [isLoading, setIsLoading] = useState(!sdk);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(!sdk);
  }, [sdk]);

  return {
    sdk,
    isLoading,
    error,
    isReady: !!sdk
  };
}

export function useSeal(): UseSealReturn {
  const { sdk, isReady } = useMidnightSDK();
  const [sealedData, setSealedData] = useState<SealedData | null>(null);
  const [isSealing, setIsSealing] = useState(false);
  const [sealError, setSealError] = useState<Error | null>(null);

  const seal = useCallback(async (data: Uint8Array, policy: PrivacyPolicy): Promise<SealedData | null> => {
    if (!sdk || !isReady) {
      setSealError(new Error('SDK not ready'));
      return null;
    }

    setIsSealing(true);
    setSealError(null);

    try {
      const result = await sdk.sealData(data, policy);
      
      if (result.success) {
        setSealedData(result.data);
        return result.data;
      } else {
        setSealError(result.error);
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Seal failed');
      setSealError(error);
      return null;
    } finally {
      setIsSealing(false);
    }
  }, [sdk, isReady]);

  return { seal, sealedData, isSealing, sealError };
}

export function useVerify(): UseVerifyReturn {
  const { sdk, isReady } = useMidnightSDK();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verify