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