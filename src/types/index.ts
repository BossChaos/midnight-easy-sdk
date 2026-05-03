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