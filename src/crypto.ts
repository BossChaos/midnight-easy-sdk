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