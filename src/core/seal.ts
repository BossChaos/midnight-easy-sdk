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