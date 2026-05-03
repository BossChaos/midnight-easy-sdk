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