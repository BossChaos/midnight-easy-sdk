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