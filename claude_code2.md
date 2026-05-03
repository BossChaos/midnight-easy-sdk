```typescript:src/core/proof.ts
import { BN254, Field, G1Point, G2Point, Proof } from './types';
import { hashToField, serializeG1, serializeG2, deserializeG1, deserializeG2 } from './utils';
import { VerificationKey } from './types';

export class ProofGenerator {
  private provingKey: Uint8Array;
  
  constructor(provingKey: Uint8Array) {
    this.provingKey = provingKey;
  }

  async generate(
    publicInputs: Field[],
    privateInputs: Field[],
    circuit: {
      constraints: Array<{
        a: Field[];
        b: Field[];
        c: Field[];
        publicInputsCount: number;
      }>;
      wireMapping: Map<string, string>;
    }
  ): Promise<Proof> {
    const witness = this.computeWitness(publicInputs, privateInputs, circuit);
    const constraintSystem = this.buildConstraintSystem(circuit);
    
    const a = this.computeProofPart(constraintSystem.a, witness);
    const b = this.computeProofPart(constraintSystem.b, witness);
    const c = this.computeProofPart(constraintSystem.c, witness);

    return {
      a,
      b,
      c,
      publicInputs,
      protocol: 'groth16',
      curve: 'BN254'
    };
  }

  private computeWitness(
    publicInputs: Field[],
    privateInputs: Field[],
    circuit: {
      constraints: Array<{
        a: Field[];
        b: Field[];
        c: Field[];
      }>;
      wireMapping: Map<string, string>;
    }
  ): Map<string, Field> {
    const witness = new Map<string, Field>();
    let idx = 0;

    for (const input of publicInputs) {
      witness.set(`pub_${idx}`, input);
      idx++;
    }

    for (const input of privateInputs) {
      witness.set(`priv_${idx}`, input);
      idx++;
    }

    for (const constraint of circuit.constraints) {
      const aVal = this.evaluateLinearCombination(constraint.a, witness);
      const bVal = this.evaluateLinearCombination(constraint.b, witness);
      const cVal = this.evaluateLinearCombination(constraint.c, witness);
      
      witness.set(`wire_${circuit.constraints.indexOf(constraint)}`, aVal.mul(bVal));
      witness.set(`output_${circuit.constraints.indexOf(constraint)}`, cVal);
    }

    return witness;
  }

  private evaluateLinearCombination(
    terms: Field[],
    witness: Map<string, Field>
  ): Field {
    if (terms.length === 0) return BN254.Fr.zero;
    
    let result = witness.get(terms[0].toString()) || terms[0];
    for (let i = 1; i < terms.length; i++) {
      result = result.add(witness.get(terms[i].toString()) || terms[i]);
    }
    return result;
  }

  private buildConstraintSystem(circuit: {
    constraints: Array<{
      a: Field[];
      b: Field[];
      c: Field[];
    }>;
  }) {
    return {
      a: circuit.constraints.map(c => c.a),
      b: circuit.constraints.map(c => c.b),
      c: circuit.constraints.map(c => c.c)
    };
  }

  private computeProofPart(linearCombinations: Field[][], witness: Map<string, Field>): G1Point {
    let result = BN254.G1.zero;
    
    for (const lc of linearCombinations) {
      for (const term of lc) {
        const w = witness.get(term.toString()) || term;
        result = result.add(BN254.G1.generator.mul(w));
      }
    }
    
    return result;
  }
}

export class ProofVerifier {
  private verificationKey: VerificationKey;
  
  constructor(vk: VerificationKey) {
    this.verificationKey = vk;
  }

  async verify(proof: Proof, publicInputs: Field[]): Promise<boolean> {
    if (proof.protocol !== 'groth16' || proof.curve !== 'BN254') {
      throw new Error('Unsupported proof protocol');
    }

    const inputHash = this.hashPublicInputs(publicInputs);
    const batchedProof = this.batchProof(proof, inputHash);

    const pairingCheck = await this.pairingCheck(
      batchedProof,
      this.verificationKey.alpha,
      this.verificationKey.beta,
      this.verificationKey.gamma,
      this.verificationKey.delta,
      this.verificationKey.gammaABC
    );

    return pairingCheck;
  }

  private hashPublicInputs(inputs: Field[]): Field {
    return hashToField(inputs.map(i => i.toString()).join(''));
  }

  private batchProof(proof: Proof, hash: Field): G1Point {
    return proof.a.add(proof.c.mul(hash));
  }

  private async pairingCheck(
    a: G1Point,
    alpha: G2Point,
    beta: G2Point,
    gamma: G2Point,
    delta: G2Point,
    gammaABC: G1Point[]
  ): Promise<boolean> {
    let lhs = BN254.pairing(a, beta);
    
    for (const point of gammaABC) {
      lhs = lhs.mul(BN254.pairing(point, gamma));
    }
    
    const rhs = BN254.pairing(this.verificationKey.alpha, this.verificationKey.beta)
      .mul(BN254.pairing(gammaABC[0], delta));

    return lhs.equals(rhs);
  }
}

export async function generateProof(
  circuit: {
    constraints: Array<{
      a: Field[];
      b: Field[];
      c: Field[];
      publicInputsCount: number;
    }>;
    wireMapping: Map<string, string>;
  },
  publicInputs: Field[],
  privateInputs: Field[],
  provingKey: Uint8Array
): Promise<Proof> {
  const generator = new ProofGenerator(provingKey);
  return generator.generate(publicInputs, privateInputs, circuit);
}

export async function verifyProof(
  proof: Proof,
  publicInputs: Field[],
  verificationKey: VerificationKey
): Promise<boolean> {
  const verifier = new ProofVerifier(verificationKey);
  return verifier.verify(proof, publicInputs);
}
```

```typescript:src/index.ts
export { ZKSeal, ZKSealConfig } from './core/seal';
export { ProofGenerator, ProofVerifier, generateProof, verifyProof } from './core/proof';
export { Field, G1Point, G2Point, Proof, VerificationKey, ProofInputs } from './core/types';
export { hashToField, serializeG1, serializeG2, deserializeG1, deserializeG2 } from './core/utils';
export { useZKProof, useZKVerify, ZKProofProvider } from './react';
export * from './utils';
export * from './errors';

export const VERSION = '0.1.0';
export const PROTOCOL = 'groth16';
export const CURVE = 'BN254';
```

```typescript:src/react/hooks.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  ZKSeal, 
  Field, 
  Proof, 
  VerificationKey, 
  ProofInputs 
} from '../core/seal';

export interface UseZKProofOptions {
  provingKey: Uint8Array;
  verificationKey: VerificationKey;
  circuit: ProofInputs['circuit'];
  autoVerify?: boolean;
}

export interface UseZKProofResult {
  proof: Proof | null;
  isGenerating: boolean;
  error: Error | null;
  generate: (publicInputs: Field[], privateInputs: Field[]) => Promise<Proof | null>;
  reset: () => void;
}

export function useZKProof(options: UseZKProofOptions): UseZKProofResult {
  const { provingKey, verificationKey, circuit, autoVerify = false } = options;
  const [proof, setProof] = useState<Proof | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const zkSealRef = useRef<ZKSeal | null>(null);

  useEffect(() => {
    zkSealRef.current = new ZKSeal({ provingKey, verificationKey, circuit });
    return () => {
      zkSealRef.current = null;
    };
  }, [provingKey, verificationKey, circuit]);

  const generate = useCallback(
    async (publicInputs: Field[], privateInputs: Field[]): Promise<Proof | null> => {
      if (!zkSealRef.current) {
        const err = new Error('ZKSeal not initialized');
        setError(err);
        return null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const result = await zkSealRef.current.prove(publicInputs, privateInputs);
        setProof(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setProof(null);
    setError(null);
  }, []);

  return { proof, isGenerating, error, generate, reset };
}

export interface UseZKVerifyOptions {
  verificationKey: VerificationKey;
  proof: Proof | null;
  publicInputs: Field[];
}

export interface UseZKVerifyResult {
  isValid: boolean | null;
  isVerifying: boolean;
  error: Error | null;
  verify: () => Promise<boolean | null>;
}

export function useZKVerify(options: UseZKVerifyOptions): UseZKVerifyResult {
  const { verificationKey, proof, publicInputs } = options;
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const verify = useCallback(async (): Promise<boolean | null> => {
    if (!proof) {
      setIsValid(null);
      return null;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const zkSeal = new ZKSeal({ verificationKey });
      const result = await zkSeal.verify(proof, publicInputs);
      setIsValid(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsValid(false);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [proof, publicInputs, verificationKey]);

  useEffect(() => {
    if (proof) {
      verify();
    }
  }, [proof]);

  return { isValid, isVerifying, error, verify };
}

export interface UseZKBatchOptions {
  items: Array<{
    id: string;
    publicInputs: Field[];
    privateInputs: Field[];
  }>;
  provingKey: Uint8Array;
  verificationKey: VerificationKey;
  circuit: ProofInputs['circuit'];
  concurrency?: number;
}

export interface UseZKBatchResult {
  results: Map<string, Proof>;
  isProcessing: boolean;
  progress: number;
  error: Error | null;
  process: () => Promise<Map<string, Proof>>;
}

export function useZKBatch(options: UseZKBatchOptions): UseZKBatchResult {
  const { items, provingKey, verificationKey, circuit, concurrency = 3 } = options;
  const [results, setResults] = useState<Map<string, Proof>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const process = useCallback(async (): Promise<Map<string, Proof>> => {
    setIsProcessing(true);
    setError(null);
    setResults(new Map());
    setProgress(0);

    const zkSeal = new ZKSeal({ provingKey, verificationKey, circuit });
    const newResults = new Map<string, Proof>();

    try {
      for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        const batchPromises = batch.map(async (item) => {
          const proof = await zkSeal.prove(item.publicInputs, item.privateInputs);
          return { id: item.id, proof };
        });

        const batchResults = await Promise.all(batchPromises);
        for (const { id, proof } of batchResults) {
          newResults.set(id, proof);
        }

        setResults(new Map(newResults));
        setProgress(Math.min(((i + batch.length) / items.length) * 100, 100));
      }

      return newResults;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [items, provingKey, verificationKey, circuit, concurrency]);

  return { results, isProcessing, progress, error, process };
}
```

```typescript:src/react/index.ts
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  ZKSeal, 
  Field, 
  Proof, 
  VerificationKey, 
  ProofInputs 
} from '../core/seal';
import { useZKProof, UseZKProofOptions, UseZKProofResult } from './hooks';

export { useZKProof, useZKVerify, useZKBatch } from './hooks';
export type { UseZKProofOptions, UseZKVerifyOptions, UseZKBatchOptions } from './hooks';

export interface ZKProofContextValue {
  zkSeal: ZKSeal | null;
  isReady: boolean;
  error: Error | null;
}

const ZKProofContext = createContext<ZKProofContextValue>({
  zkSeal: null,
  isReady: false,
  error: null
});

export interface ZKProofProviderProps {
  children: ReactNode;
  provingKey: Uint8Array;
  verificationKey: VerificationKey;
  circuit: ProofInputs['circuit'];
  autoInit?: boolean;
}

export function ZKProofProvider({
  children,
  provingKey,
  verificationKey,
  circuit,
  autoInit = true
}: ZKProofProviderProps): JSX.Element {
  const [zkSeal, setZkSeal] = useState<ZKSeal | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!autoInit) return;

    try {
      const instance = new ZKSeal({ provingKey, verificationKey, circuit });
      setZkSeal(instance);
      setIsReady(true);
      setError(null);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setIsReady(false);
    }
  }, [provingKey, verificationKey, circuit, autoInit]);

  const value: ZKProofContextValue = { zkSeal, isReady, error };

  return (
    <ZKProofContext.Provider value={value}>
      {children}
    </ZKProofContext.Provider>
  );
}

export function useZKProofContext(): ZKProofContextValue {
  return useContext(ZKProofContext);
}

export function useZKFromContext(): ZKSeal {
  const { zkSeal, isReady, error } = useZKProofContext();
  
  if (!isReady) {
    throw error || new Error('ZKProofProvider not ready');
  }
  
  if (!zkSeal) {
    throw new Error('ZKSeal not initialized');
  }
  
  return zkSeal;
}

export interface ZKProveHookOptions {
  onProofGenerated?: (proof: Proof) => void;
  onError?: (error: Error) => void;
}

export function useProve(options: ZKProveHookOptions = {}) {
  const zkSeal = useZKFromContext();
  const [isProving, setIsProving] = useState(false);
  const [proof, setProof] = useState<Proof | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const prove = async (publicInputs: Field[], privateInputs: Field[]) => {
    setIsProving(true);
    setError(null);

    try {
      const result = await zkSeal.prove(publicInputs, privateInputs);
      setProof(result);
      options.onProofGenerated?.(result);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      options.onError?.(e);
      throw e;
    } finally {
      setIsProving(false);
    }
  };

  return { prove, proof, isProving, error };
}

export interface ZKVerifyHookOptions {
  onVerified?: (isValid: boolean) => void;
  onError?: (error: Error) => void;
}

export function useVerify(options: ZKVerifyHookOptions = {}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const verify = async (proof: Proof, publicInputs: Field[]) => {
    setIsVerifying(true);
    setError(null);

    try {
      const zkSeal = useZKFromContext();
      const result = await zkSeal.verify(proof, publicInputs);
      setIsValid(result);
      options.onVerified?.(result);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      options.onError?.(e);
      throw e;
    } finally {
      setIsVerifying(false);
    }
  };

  return { verify, isValid, isVerifying, error };
}
```

```typescript:tests/seal.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  ZKSeal,
  Field,
  BN254,
  hashToField,
  serializeG1,
  serializeG2,
  VerificationKey
} from '../src';

describe('ZKSeal', () => {
  let zkSeal: ZKSeal;
  let provingKey: Uint8Array;
  let verificationKey: VerificationKey;

  beforeAll(() => {
    provingKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      provingKey[i] = i + 1;
    }

    verificationKey = {
      alpha: [BN254.G1.generator],
      beta: [BN254.G2.generator],
      gamma: [BN254.G2.generator],
      delta: [BN254.G2.generator],
      gammaABC: [BN254.G1.generator],
      protocol: 'groth16',
      curve: 'BN254'
    };
  });

  describe('constructor', () => {
    it('should create instance with all parameters', () => {
      const circuit = {
        constraints: [],
        wireMapping: new Map()
      };

      zkSeal = new ZKSeal({
        provingKey,
        verificationKey,
        circuit
      });

      expect(zkSeal).toBeDefined();
    });

    it('should throw error for invalid config', () => {
      expect(() => {
        new ZKSeal({
          provingKey: new Uint8Array(0),
          verificationKey,
          circuit: { constraints: [], wireMapping: new Map() }
        } as any);
      }).toThrow();
    });
  });

  describe('prove', () => {
    it('should generate proof with valid inputs', async () => {
      const circuit = {
        constraints: [],
        wireMapping: new Map()
      };

      zkSeal = new ZKSeal({
        provingKey,
        verificationKey,
        circuit
      });

      const publicInputs: Field[] = [BN254.Fr.one, BN254.Fr.one];
      const privateInputs: Field[] = [BN254.Fr.fromNumber(42)];

      const proof = await zkSeal.prove(publicInputs, privateInputs);

      expect(proof).toBeDefined();
      expect(proof.protocol).toBe('groth16');
      expect(proof.curve).toBe('BN254');
      expect(proof.publicInputs).toEqual(publicInputs);
    });

    it('should reject empty inputs', async () => {
      const circuit = {
        constraints: [],
        wireMapping: new Map()
      };

      zkSeal = new ZKSeal({
        provingKey,
        verificationKey,
        circuit
      });

      await expect(
        zkSeal.prove([], [])
      ).rejects.toThrow();
    });
  });

  describe('verify', () => {
    it('should verify valid proof', async () => {
      const circuit = {
        constraints: [],
        wireMapping: new Map()
      };

      zkSeal = new ZKSeal({
        provingKey,
        verificationKey,
        circuit
      });

      const publicInputs: Field[] = [BN254.Fr.one];
      const privateInputs: Field[] = [BN254.Fr.fromNumber(100)];

      const proof = await zkSeal.prove(publicInputs, privateInputs);
      const isValid = await zkSeal.verify(proof, publicInputs);

      expect(isValid).toBe(true);
    });

    it('should reject invalid proof', async () => {
      const circuit = {
        constraints: [],
        wireMapping: new Map()
      };

      zkSeal = new ZKSeal({
        provingKey,
        verificationKey,
        circuit
      });

      const publicInputs: Field[] = [BN254.Fr.one];
      const privateInputs: Field[] = [BN254.Fr.fromNumber(100)];

      const proof = await zkSeal.prove(publicInputs, privateInputs);
      
      proof.a = BN254.G1.zero;

      const isValid = await zkSeal.verify(proof, publicInputs);
      expect(isValid).toBe(false);
    });
  });

  describe('static methods', () => {
    it('should generate valid hash', () => {
      const input = 'test input';
      const hash = hashToField(input);
      
      expect(hash).toBeDefined();
      expect(hash.toString()).toBeTruthy();
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashToField('input1');
      const hash2 = hashToField('input2');
      
      expect(hash1.toString()).not.toBe(hash2.toString());
    });

    it('should serialize G1 point', () => {
      const point = BN254.G1.generator;
      const serialized = serializeG1(point);
      
      expect(serialized).toBeInstanceOf(Uint8Array);
      expect(serialized.length).toBe(64);
    });

    it('should serialize G2 point', () => {
      const point = BN254.G2.generator;
      const serialized = serializeG2(point);
      
      expect(serialized).toBeInstanceOf(Uint8Array);
      expect(serialized.length).toBe(128);
    });
  });
});

describe('BN254', () => {
  describe('Fr (scalar field)', () => {
    it('should create from number', () => {
      const a = BN254.Fr.fromNumber(5);
      expect(a).toBeDefined();
    });

    it('should create zero', () => {
      const zero = BN254.Fr.zero;
      expect(zero).toBeDefined();
    });

    it('should create one', () => {
      const one = BN254.Fr.one;
      expect(one).toBeDefined();
    });

    it('should add values', () => {
      const a = BN254.Fr.fromNumber(3);
      const b = BN254.Fr.fromNumber(5);
      const c = a.add(b);
      expect(c).toBeDefined();
    });

    it('should multiply values', () => {
      const a = BN254.Fr.fromNumber(3);
      const b = BN254.Fr.fromNumber(5);
      const c = a.mul(b);
      expect(c).toBeDefined();
    });
  });

  describe('G1 (base field)', () => {
    it('should have generator', () => {
      expect(BN254.G1.generator).toBeDefined();
    });

    it('should have zero point', () => {
      expect(BN254.G1.zero).toBeDefined();
    });

    it('should add points', () => {
      const a = BN254.G1.generator;
      const b = BN254.G1.generator;
      const c = a.add(b);
      expect(c).toBeDefined();
    });

    it('should multiply point by scalar', () => {
      const point = BN254.G1.generator;
      const scalar = BN254.Fr.fromNumber(5);
      const result = point.mul(scalar);
      expect(result).toBeDefined();
    });
  });

  describe('G2 (extension field)', () => {
    it('should have generator', () => {
      expect(BN254.G2.generator).toBeDefined();
    });

    it('should have zero point', () => {
      expect(BN254.G2.zero).toBeDefined();
    });

    it('should add points', () => {
      const a = BN254.G2.generator;
      const b = BN254.G2.generator;
      const c = a.add(b);
      expect(c).toBeDefined();
    });
  });

  describe('pairing', () => {
    it('should compute pairing', () => {
      const g1 = BN254.G1.generator;
      const g2 = BN254.G2.generator;
      const result = BN254.pairing(g1, g2);
      expect(result).toBeDefined();
    });
  });
});

describe('Edge Cases', () => {
  let zkSeal: ZKSeal;
  let provingKey: Uint8Array;
  let verificationKey: VerificationKey;

  beforeAll(() => {
    provingKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      provingKey[i] = i + 1;
    }

    verificationKey = {
      alpha: [BN254.G1.generator],
      beta: [BN254.G2.generator],
      gamma: [BN254.G2.generator],
      delta: [BN254.G2.generator],
      gammaABC: [BN254.G1.generator],
      protocol: 'groth16',
      curve: 'BN254'
    };
  });

  it('should handle large number of inputs', async () => {
    const circuit = { constraints: [], wireMapping: new Map() };
    
    zkSeal = new ZKSeal({
      provingKey,
      verificationKey,
      circuit
    });

    const publicInputs = Array(100).fill(null).map(() => BN254.Fr.one);
    const privateInputs = Array(100).fill(null