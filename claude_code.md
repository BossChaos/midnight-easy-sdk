```typescript:src/types/index.ts
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

```typescript:src/errors.ts
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

```typescript:src/crypto.ts
import { randomBytes, createCipheriv, createDecipheriv, scryptSync, createHash, createECDH } from 'crypto';
import type { KeyDerivationParams, DecryptKey } from './types/index.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Generate a random nonce for encryption
 */
export async function generateNonce(): Promise<Uint8Array> {
  return randomBytes(NONCE_LENGTH);
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return randomBytes(32);
}

/**
 * Derive encryption key from password using scrypt
 */
export async function deriveKey(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    scryptSync(
      Buffer.from(password),
      Buffer.from(salt),
      KEY_LENGTH,
      {
        N: Math.pow(2, Math.log2(iterations) / 2),
        r: 8,
        p: 1,
      },
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(new Uint8Array(derivedKey));
      }
    );
  });
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encryptAESGCM(
  data: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array
): Promise<{ ciphertext: Uint8Array; authTag: Uint8Array }> {
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key), Buffer.from(nonce));
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(data)),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: new Uint8Array(ciphertext),
    authTag: new Uint8Array(authTag),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptAESGCM(
  ciphertext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  authTag: Uint8Array
): Promise<Uint8Array> {
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(key),
    Buffer.from(nonce)
  );
  decipher.setAuthTag(Buffer.from(authTag));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext)),
    decipher.final(),
  ]);
  return new Uint8Array(plaintext);
}

/**
 * Generate a random encryption key
 */
export function generateKey(): Uint8Array {
  return randomBytes(KEY_LENGTH);
}

/**
 * Hash data using SHA-256
 */
export function hash256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha256').update(Buffer.from(data)).digest());
}

/**
 * Generate ECDH key pair for a recipient
 */
export function generateECDHKeyPair(): { privateKey: Uint8Array; publicKey: string } {
  const ecdh = createECDH('secp256k1');
  ecdh.generateKeys();
  const privateKey = new Uint8Array(ecdh.getPrivateKey());
  const publicKey = ecdh.getPublicKey('base64');
  return { privateKey, publicKey };
}

/**
 * Derive shared secret using ECDH
 */
export function deriveSharedSecret(
  privateKey: Uint8Array,
  publicKeyBase64: string
): Uint8Array {
  const ecdh = createECDH('secp256k1');
  ecdh.setPrivateKey(Buffer.from(privateKey));
  return new Uint8Array(ecdh.computeSecret(Buffer.from(publicKeyBase64, 'base64')));
}

/**
 * Encrypt session key for a specific recipient
 */
export async function encryptSessionKeyForRecipient(
  sessionKey: Uint8Array,
  recipientPublicKey: string
): Promise<Uint8Array> {
  const { privateKey: ephemeralPrivateKey, publicKey: ephemeralPublicKey } = generateECDHKeyPair();
  const sharedSecret = deriveSharedSecret(ephemeralPrivateKey, recipientPublicKey);
  const nonce = await generateNonce();
  const { ciphertext } = await encryptAESGCM(sessionKey, hash256(sharedSecret), nonce);
  
  // Prepend ephemeral public key to ciphertext for recipient to derive shared secret
  const ephemeralPublicKeyBytes = Buffer.from(ephemeralPublicKey, 'base64');
  return new Uint8Array(Buffer.concat([ephemeralPublicKeyBytes, nonce, ciphertext]));
}

/**
 * Decrypt session key for a specific recipient
 */
export async function decryptSessionKey(
  encryptedSessionKey: Uint8Array,
  recipientPrivateKey: Uint8Array
): Promise<Uint8Array> {
  // Parse encrypted data: ephemeralPublicKey (65 bytes) + nonce (12 bytes) + ciphertext (variable)
  const ephemeralPublicKeyLength = 65;
  const nonceLength = 12;
  
  const ephemeralPublicKeyBytes = encryptedSessionKey.slice(0, ephemeralPublicKeyLength);
  const nonce = encryptedSessionKey.slice(ephemeralPublicKeyLength, ephemeralPublicKeyLength + nonceLength);
  const ciphertext = encryptedSessionKey.slice(ephemeralPublicKeyLength + nonceLength);
  
  const ephemeralPublicKey = Buffer.from(ephemeralPublicKeyBytes).toString('base64');
  const sharedSecret = deriveSharedSecret(recipientPrivateKey, ephemeralPublicKey);
  
  // For GCM, we need auth tag (16 bytes at end)
  const authTagLength = 16;
  const authTag = ciphertext.slice(ciphertext.length - authTagLength);
  const actualCiphertext = ciphertext.slice(0, ciphertext.length - authTagLength);
  
  return decryptAESGCM(actualCiphertext, hash256(sharedSecret), nonce, authTag);
}

/**
 * Create key derivation parameters
 */
export function createKeyDerivationParams(
  kdf: KeyDerivationParams['kdf'] = 'scrypt',
  iterations: number = 32768
): KeyDerivationParams {
  return {
    kdf,
    salt: generateSalt(),
    iterations,
  };
}

/**
 * Create decryption key from password
 */
export async function createDecryptKey(
  password: Uint8Array,
  params?: KeyDerivationParams
): Promise<DecryptKey> {
  const derivationParams = params || createKeyDerivationParams();
  const privateKey = await deriveKey(password, derivationParams.salt, derivationParams.iterations);
  const publicKey = Buffer.from(hash256(privateKey)).toString('base64');
  
  return {
    privateKey,
    publicKey,
    derivationParams,
  };
}

/**
 * Serialize a Map to a serializable format
 */
export function serializeMap<K extends string | number, V extends Uint8Array>(
  map: Map<K, V>
): Array<[K, string]> {
  return Array.from(map.entries()).map(([k, v]) => [k, Buffer.from(v).toString('base64')]);
}

/**
 * Deserialize a serialized map back to Map
 */
export function deserializeMap<K extends string | number>(
  data: Array<[K, string]>
): Map<K, Uint8Array> {
  return new Map(
    data.map(([k, v]) => [k, new Uint8Array(Buffer.from(v, 'base64'))])
  );
}
```

```typescript:src/core/seal.ts
import { Subject, Observable } from 'rxjs';
import { PrivacyPolicy, SealedData, SDKEvent, AsyncResult } from '../types/index.js';
import { SealError } from '../errors.js';
import {
  generateNonce,
  generateKey,
  encryptAESGCM,
  hash256,
  encryptSessionKeyForRecipient,
  serializeMap,
} from '../crypto.js';

const CURRENT_VERSION = 1;

export interface SealOptions {
  /** Policy for the sealed data */
  policy: PrivacyPolicy;
  /** Data to seal */
  data: Uint8Array;
  /** Optional pre-generated session key */
  sessionKey?: Uint8Array;
}

/**
 * Seal data with privacy policy and generate ZK proof
 */
export async function sealData(
  options: SealOptions,
  eventSubject?: Subject<SDKEvent>
): AsyncResult<SealedData> {
  try {
    eventSubject?.next({
      type: 'seal:start',
      timestamp: Date.now(),
      data: { policy: options.policy },
    });

    const { policy, data } = options;
    
    // Validate policy
    if (!policy.verificationLevel) {
      return { success: false, error: new SealError('Verification level is required') };
    }

    // Generate session key and nonce
    const sessionKey = options.sessionKey || generateKey();
    const nonce = await generateNonce();

    // Encrypt data with session key
    const { ciphertext, authTag } = await encryptAESGCM(data, sessionKey, nonce);

    // Combine ciphertext with auth tag
    const fullCiphertext = new Uint8Array(ciphertext.length + AUTH_TAG_LENGTH);
    fullCiphertext.set(ciphertext);
    fullCiphertext.set(authTag, ciphertext.length);

    // Encrypt session key for allowed recipients
    const encryptedKeys = new Map<string, Uint8Array>();
    if (policy.allowedRecipients && policy.allowedRecipients.length > 0) {
      for (const recipientPublicKey of policy.allowedRecipients) {
        const encryptedKey = await encryptSessionKeyForRecipient(sessionKey, recipientPublicKey);
        encryptedKeys.set(recipientPublicKey, encryptedKey);
      }
    }

    // Generate ZK proof of encryption validity
    const proof = await generateSealProof(data, sessionKey, policy);

    const sealedData: SealedData = {
      ciphertext: fullCiphertext,
      proof,
      policy,
      nonce,
      encryptedKeys,
      timestamp: Date.now(),
      version: CURRENT_VERSION,
    };

    eventSubject?.next({
      type: 'seal:complete',
      timestamp: Date.now(),
      data: { ciphertextLength: ciphertext.length },
    });

    return { success: true, data: sealedData };
  } catch (error) {
    const err = error instanceof Error ? error : new SealError('Unknown sealing error');
    eventSubject?.next({
      type: 'error',
      timestamp: Date.now(),
      data: { error: err.message },
    });
    return { success: false, error: err };
  }
}

/**
 * Generate ZK proof for sealed data (mock implementation)
 * In production, this would integrate with actual ZK proving system
 */
async function generateSealProof(
  data: Uint8Array,
  sessionKey: Uint8Array,
  policy: PrivacyPolicy
): Promise<Uint8Array> {
  // Mock proof generation - in production, this would:
  // 1. Create circuit constraints from data and session key
  // 2. Generate witness
  // 3. Run proving system
  const timestamp = Date.now();
  const seed = hash256(Buffer.concat([
    Buffer.from(data),
    Buffer.from(sessionKey),
    Buffer.from(timestamp.toString()),
  ]));
  
  // Return mock proof (in production: actual ZK proof)
  return new Uint8Array([...seed, ...generateNonce(), ...generateNonce()]);
}

const AUTH_TAG_LENGTH = 16;

export { AUTH_TAG_LENGTH };

/**
 * Re-seal data with a new policy
 */
export async function resealData(
  sealedData: SealedData,
  newPolicy: PrivacyPolicy,
  sessionKey: Uint8Array,
  eventSubject?: Subject<SDKEvent>
): AsyncResult<SealedData> {
  return sealData(
    {
      policy: newPolicy,
      data: sealedData.ciphertext,
      sessionKey,
    },
    eventSubject
  );
}

/**
 * Seal data with default policy
 */
export async function sealWithDefaults(
  data: Uint8Array,
  eventSubject?: Subject<SDKEvent>
): AsyncResult<SealedData> {
  return sealData(
    {
      policy: {
        verificationLevel: 'basic',
        ttl: 0,
      },
      data,
    },
    eventSubject
  );
}
```

```typescript:src/core/verify.ts
import { Subject } from 'rxjs';
import { SealedData, PrivacyPolicy, SDKEvent, AsyncResult, Proof } from '../types/index.js';
import { VerifyError } from '../errors.js';
import { hash256 } from '../crypto.js';

export interface VerificationResult {
  /** Whether the verification passed */
  isValid: boolean;
  /** Verification details */
  details: {
    policyVerified: boolean;
    proofVerified: boolean;
    ttlValid: boolean;
    recipientVerified: boolean;
  };
  /** Verification timestamp */
  timestamp: number;
}

/**
 * Verify sealed data against a policy
 */
export async function verifySealedData(
  sealedData: SealedData,
  eventSubject?: Subject<SDKEvent>
): AsyncResult<VerificationResult> {
  try {
    eventSubject?.next({
      type: 'verify:start',
      timestamp: Date.now(),
      data: { version: sealedData.version },
    });

    const details = {
      policyVerified: false,
      proofVerified: false,
      ttlValid: false,
      recipientVerified: false,
    };

    // Verify version compatibility
    if (sealedData.version > CURRENT_VERSION || sealedData.version < 1) {
      throw new VerifyError(`Unsupported version: ${sealedData.version}`);
    }

    // Verify policy
    details.policyVerified = verifyPolicy(sealedData.policy);

    // Verify TTL
    details.ttlValid = verifyTTL(sealedData.policy, sealedData.timestamp);

    // Verify proof
    details.proofVerified = await verifyProof(sealedData.proof, sealedData.ciphertext);

    // Verify recipient (if applicable)
    details.recipientVerified = verifyRecipients(sealedData.policy);

    const result: VerificationResult = {
      isValid: details.policyVerified && 
               details.proofVerified && 
               details.ttlValid && 
               details.recipientVerified,
      details,
      timestamp: Date.now(),
    };

    eventSubject?.next({
      type: 'verify:complete',
      timestamp: Date.now(),
      data: result,
    });

    return { success: true, data: result };
  } catch (error) {
    const err = error instanceof VerifyError
      ? error
      : new VerifyError('Verification failed', { originalError: String(error) });
    
    eventSubject?.next({
      type: 'error',
      timestamp: Date.now(),
      data: { error: err.message },
    });

    return { success: false, error: err };
  }
}

const CURRENT_VERSION = 1;

/**
 * Verify policy structure and requirements
 */
function verifyPolicy(policy: PrivacyPolicy): boolean {
  if (!policy.verificationLevel) {
    return false;
  }
  
  const validLevels = ['basic', 'standard', 'strict'];
  if (!validLevels.includes(policy.verificationLevel)) {
    return false;
  }

  // Additional policy-specific checks based on verification level
  switch (policy.verificationLevel) {
    case 'strict':
      // Strict level requires recipients
      return !!policy.allowedRecipients && policy.allowedRecipients.length > 0;
    case 'standard':
      // Standard level requires either TTL or recipients
      return (policy.ttl !== undefined && policy.ttl > 0) || 
             (policy.allowedRecipients && policy.allowedRecipients.length > 0);
    case 'basic':
    default:
      return true;
  }
}

/**
 * Verify time-to-live validity
 */
function verifyTTL(policy: PrivacyPolicy, timestamp: number): boolean {
  if (policy.ttl === undefined || policy.ttl === 0) {
    return true; // Permanent or no TTL set
  }
  
  const now = Date.now();
  const ageSeconds = (now - timestamp) / 1000;
  return ageSeconds <= policy.ttl;
}

/**
 * Verify the ZK proof (mock implementation)
 * In production, this would use actual ZK verification
 */
async function verifyProof(proof: Uint8Array, ciphertext: Uint8Array): Promise<boolean> {
  // Mock verification - in production:
  // 1. Parse proof structure
  // 2. Load circuit verification key
  // 3. Run verification algorithm
  // 4. Return result
  
  if (!proof || proof.length === 0) {
    return false;
  }

  // Mock: verify proof has minimum length
  const minProofLength = 32;
  if (proof.length < minProofLength) {
    return false;
  }

  // Mock: verify proof is consistent with ciphertext
  const proofHash = hash256(proof);
  const ciphertextHash = hash256(ciphertext);
  
  // In production, actual ZK verification would happen here
  return proofHash.length === ciphertextHash.length;
}

/**
 * Verify allowed recipients
 */
function verifyRecipients(policy: PrivacyPolicy): boolean {
  if (!policy.allowedRecipients || policy.allowedRecipients.length === 0) {
    return true; // No recipients specified, skip verification
  }

  // Verify recipient format (base64 public keys)
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return policy.allowedRecipients.every(
    recipient => typeof recipient === 'string' && 
                 recipient.length > 0 && 
                 base64Regex.test(recipient)
  );
}

/**
 * Verify proof separately
 */
export async function verifyProofOnly(
  proof: Proof,
  publicInputs: Uint8Array
): AsyncResult<boolean> {
  try {
    // Mock proof verification
    const isValid = proof.a.length > 0 && 
                    proof.b.length > 0 && 
                    proof.c.length > 0;
    
    return { success: true, data: isValid };
  } catch (error) {
    return { 
      success: false, 
      error: new VerifyError('Proof verification failed', { 
        originalError: String(error) 
      }) 
    };
  }
}

/**
 * Batch verify multiple sealed data items
 */
export async function batchVerify(
  sealedDataItems: SealedData[],
  eventSubject?: Subject<SDKEvent>
): AsyncResult<VerificationResult[]> {
  const results: VerificationResult[] = [];
  
  for (const sealedData of sealedDataItems) {
    const result = await verifySealedData(sealedData, eventSubject);
    if (result.success) {
      results.push(result.data);
    } else {
      return { 
        success: false, 
        error: new VerifyError('Batch verification failed', { 
          failedItem: sealedData.timestamp 
        }) 
      };
    }
  }
  
  return { success: true, data: results };
}
```

```typescript:src/core/decrypt.ts
import { SealedData, DecryptKey, SDKEvent, AsyncResult } from '../types/index.js';
import { DecryptError } from '../errors.js';
import { decryptAESGCM, deriveKey, hash256 } from '../crypto.js';

const AUTH_TAG_LENGTH = 16;

/**
 * Decrypt sealed data using a decryption key
 */
export async function decryptData(
  sealedData: SealedData,
  decryptKey: DecryptKey,
  eventSubject?: { next: (event: SDKEvent) => void }
): AsyncResult<Uint8Array> {
  try {
    // Find the encrypted key for this recipient
    const encryptedKey = sealedData.encryptedKeys.get(decryptKey.publicKey);
    
    if (!encryptedKey) {
      // Try password-based decryption (legacy support)
      if (sealedData.policy.verificationLevel === 'basic') {
        return await decryptWithPassword(sealedData, decryptKey);
      }
      throw new DecryptError('No encrypted key found for this recipient');
    }

    // Decrypt the session key
    const sessionKey = await decryptSessionKey(encryptedKey, decryptKey.privateKey);

    // Decrypt the data
    const { ciphertext, authTag } = extractCiphertextAndTag(sealedData.ciphertext);
    const plaintext = await decryptAESGCM(ciphertext, sessionKey, sealedData.nonce, authTag);

    return { success: true, data: plaintext };
  } catch (error) {
    const err = error instanceof DecryptError
      ? error
      : new DecryptError('Decryption failed', { originalError: String(error) });
    
    eventSubject?.next({
      type: 'error',
      timestamp: Date.now(),
      data: { error: err.message },
    });

    return { success: false, error: err };
  }
}

/**
 * Decrypt session key for a recipient
 */
async function decryptSessionKey(
  encryptedSessionKey: Uint8Array,
  privateKey: Uint8Array
): Promise<Uint8Array> {
  // Parse encrypted data: ephemeralPublicKey (65 bytes) + nonce (12 bytes) + ciphertext + authTag (16 bytes)
  const ephemeralPublicKeyLength = 65;
  const nonceLength = 12;
  const authTagLength = 16;

  if (encryptedSessionKey.length < ephemeralPublicKeyLength + nonceLength + authTagLength) {
    throw new DecryptError('Invalid encrypted session key format');
  }

  const ephemeralPublicKeyBytes = encryptedSessionKey.slice(0, ephemeralPublicKeyLength);
  const nonce = encryptedSessionKey.slice(ephemeralPublicKeyLength, ephemeralPublicKeyLength + nonceLength);
  const ciphertextAndTag = encryptedSessionKey.slice(ephemeralPublicKeyLength + nonceLength);
  const ciphertext = ciphertextAndTag.slice(0, ciphertextAndTag.length - authTagLength);
  const authTag = ciphertextAndTag.slice(ciphertextAndTag.length - authTagLength);

  const ephemeralPublicKey = Buffer.from(ephemeralPublicKeyBytes).toString('base64');
  
  // Derive shared secret using ECDH
  const sharedSecret = deriveSharedSecret(privateKey, ephemeralPublicKey);
  const sessionKey = await decryptAESGCM(ciphertext, hash256(sharedSecret), nonce, authTag);

  return sessionKey;
}

/**
 * Decrypt with password (for basic verification level)
 */
async function decryptWithPassword(
  sealedData: SealedData,
  decryptKey: DecryptKey
): AsyncResult<Uint8Array> {
  try {
    // Derive key from password using stored parameters
    const derivedKey = await deriveKey(
      decryptKey.privateKey,
      decryptKey.derivationParams.salt,
      decryptKey.derivationParams.iterations
    );

    // Decrypt the data
    const { ciphertext, authTag } = extractCiphertextAndTag(sealedData.ciphertext);
    const plaintext = await decryptAESGCM(ciphertext, derivedKey, sealedData.nonce, authTag);

    return { success: true, data: plaintext };
  } catch (error) {
    return { 
      success: false, 
      error: new DecryptError('Password decryption failed', { 
        originalError: String(error) 
      }) 
    };
  }
}

/**
 * Derive shared secret using ECDH
 */
function deriveSharedSecret(privateKey: Uint8Array, publicKeyBase64: string): Uint8Array {
  // Dynamic import to avoid issues in non-Node environments
  const { createECDH } = require('crypto');
  const ecdh = createECDH('secp256k1');
  ecdh.setPrivateKey(Buffer.from(privateKey));
  return new Uint8Array(ecdh.computeSecret(Buffer.from(publicKeyBase64, 'base64')));
}

/**
 * Extract ciphertext and auth tag from sealed data
 */
function extractCiphertextAndTag(ciphertextWithTag: Uint8Array): {
  ciphertext: Uint8Array;
  authTag: Uint8Array;
} {
  const ciphertext = ciphertextWithTag.slice(0, ciphertextWithTag.length - AUTH_TAG_LENGTH);
  const authTag = ciphertextWithTag.slice(ciphertextWithTag.length - AUTH_TAG_LENGTH);
  return { ciphertext, authTag };
}

/**
 * Batch decrypt multiple sealed data items
 */
export async function batchDecrypt(
  items: Array<{ sealedData: SealedData; decryptKey: DecryptKey }>,
  eventSubject?: { next: (event: SDKEvent) => void }
): AsyncResult<Uint8Array[]> {
  const results: Uint8Array[] = [];

  for (const { sealedData, decryptKey } of items) {
    const result = await decryptData(sealedData, decryptKey, eventSubject);
    if (result.success) {
      results.push(result.data);
    } else {
      return { 
        success: false, 
        error: new DecryptError('Batch decryption failed', { 
          failedItem: sealedData.timestamp 
        }) 
      };
    }
  }

  return { success: true, data: results };
}

/**
 * Decrypt and verify in one operation
 */
export async function decryptAndVerify(
  sealedData: SealedData,
  decryptKey: DecryptKey,
  eventSubject?: { next: (event: SDKEvent) => void }
): AsyncResult<{ data: Uint8Array; verified: boolean }> {
  const { verifySealedData } = require('./verify.js');
  
  const verificationResult = await verifySealedData(sealedData, eventSubject);
  if (!verificationResult.success || !verificationResult.data.isValid) {
    return { 
      success: false, 
      error: new DecryptError('Verification failed before decryption') 
    };
  }

  const decryptionResult = await decryptData(sealedData, decryptKey, eventSubject);
  if (!decryptionResult.success) {
    return { success: false, error: decryptionResult.error };
  }

  return {
    success: true,
    data: {
      data: decryptionResult.data,
      verified: true,
    },
  };
}
```

```typescript:src/core/proof.ts
import { Subject } from 'rxjs';
import {
  ZkCircuit,
  Witness,
  Proof,
  ProofMetadata,
  PublicInputs,
  SDKEvent,
  AsyncResult,
} from '../types/index.js';
import { ProofError, CircuitError } from '../errors.js';
import { hash256, generateNonce } from '../crypto.js';

/**
 * Generate a zero-knowledge proof
 */
export async function generateProof(
  circuit: ZkCircuit,
  witness: Witness,
  eventSubject?: Subject<SDKEvent>
): AsyncResult<Proof> {
  try {
    eventSubject?.next({
      type: 'proof:start',
      timestamp: Date.now(),
      data: { circuitId: circuit.id },
    });

    const startTime = Date.now();

    // Validate circuit
    validateCircuit(circuit);

    // Validate witness
    validateWitness(witness, circuit);

    // Generate proof (mock implementation)
    const proof = await generateZkProof(circuit, witness);

    const metadata: ProofMetadata = {
      circuitId: circuit.id,
      timestamp: Date.now(),
      constraintCount: circuit.inputConstraints.length,
      provingTime: Date.now() - startTime,
    };

    const fullProof: Proof = {
      ...proof,
      metadata,
    };

    eventSubject?.next({
      type: 'proof:complete',
      timestamp: Date.now(),
      data: { provingTime: metadata.provingTime },
    });

    return { success: true, data: fullProof };
  } catch (error) {
    const err = error instanceof ProofError
      ? error
      : new ProofError('Proof generation failed', { originalError: String(error) });
    
    eventSubject?.next({
      type: 'error',
      timestamp: Date.now(),
      data: { error: err.message },
    });

    return { success: false, error: err };
  }
}

/**
 * Verify a zero-knowledge proof
 */
export async function verifyProof(
  circuit: ZkCircuit,
  proof: Proof,
  publicInputs: PublicInputs[],
  eventSubject?: Subject<SDKEvent>
): AsyncResult<boolean> {
  try {
    eventSubject?.next({
      type: 'verify:start',
      timestamp: Date.now(),
      data: { circuitId: circuit.id },
    });

    // Validate proof structure
    if (!proof.a || !proof.b || !proof.c) {
      throw new ProofError('Invalid proof structure');
    }

    // Verify circuit matches
    if (proof.metadata.circuitId !== circuit.id) {
      throw new ProofError('Circuit ID mismatch');
    }

    // Perform verification (mock implementation)
    const isValid = await verifyZkProof(circuit, proof, publicInputs);

    eventSubject?.next({
      type: 'verify:complete',
      timestamp: Date.now(),
      data: { isValid },
    });

    return { success: true, data: isValid };
  } catch (error) {
    const err = error instanceof ProofError
      ? error
      : new ProofError('Proof verification failed', { originalError: String(error) });
    
    eventSubject?.next({
      type: 'error',
      timestamp: Date.now(),
      data: { error: err.message },
    });

    return { success: false, error: err };
  }
}

/**
 * Validate circuit structure
 */
function validateCircuit(circuit: ZkCircuit): void {
  if (!circuit.id) {
    throw new CircuitError('Circuit ID is required');
  }

  if (!circuit.bytecode || circuit.bytecode.length === 0) {
    throw new CircuitError('Circuit bytecode is required');
  }

  if (!circuit.verificationKey || circuit.verificationKey.length === 0) {
    throw new CircuitError('Circuit verification key is required');
  }
}

/**
 * Validate witness data
 */
function validateWitness(witness: Witness, circuit: ZkCircuit): void {
  if (!witness.secretInputs || witness.secretInputs.size === 0) {
    throw new ProofError('Secret inputs are required');
  }

  // Check that all inputs are valid bigints
  for (const [key, value] of witness.secretInputs) {
    if (typeof value !== 'bigint') {
      throw new ProofError(`Invalid secret