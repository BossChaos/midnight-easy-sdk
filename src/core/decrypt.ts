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