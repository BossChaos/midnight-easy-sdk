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