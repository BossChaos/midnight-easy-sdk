import { describe, it, expect } from 'vitest';
import { sealData, verifySealed, decryptData } from '../src';

describe('sealData', () => {
  it('should seal data with privacy policy', () => {
    const data = new TextEncoder().encode('secret message');
    const policy = {
      verificationLevel: 'standard' as const,
      allowedRecipients: ['alice', 'bob']
    };
    
    const sealed = sealData(data, policy);
    expect(sealed).toBeDefined();
    expect(sealed.ciphertext).toBeDefined();
    expect(sealed.proof).toBeDefined();
    expect(sealed.policy).toEqual(policy);
  });
});

describe('verifySealed', () => {
  it('should verify valid sealed data', () => {
    const data = new TextEncoder().encode('test data');
    const policy = { verificationLevel: 'basic' as const };
    const sealed = sealData(data, policy);
    
    expect(verifySealed(sealed)).toBe(true);
  });
  
  it('should reject tampered sealed data', () => {
    const data = new TextEncoder().encode('test data');
    const policy = { verificationLevel: 'basic' as const };
    const sealed = sealData(data, policy);
    
    // Tamper with the data
    sealed.ciphertext[0] ^= 0xff;
    
    expect(verifySealed(sealed)).toBe(false);
  });
});

describe('decryptData', () => {
  it('should decrypt sealed data with correct key', () => {
    const original = 'secret message';
    const data = new TextEncoder().encode(original);
    const policy = { verificationLevel: 'standard' as const };
    const sealed = sealData(data, policy);
    
    // Get a valid key from the sealed data
    const key = Object.values(sealed.encryptedKeys)[0];
    const decryptKey = {
      privateKey: key,
      publicKey: 'test',
      derivationParams: {
        kdf: 'scrypt' as const,
        salt: sealed.nonce,
        iterations: 1000
      }
    };
    
    const decrypted = decryptData(sealed, decryptKey);
    const decryptedText = new TextDecoder().decode(decrypted);
    
    expect(decryptedText).toBe(original);
  });
});
