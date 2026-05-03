export class MidnightError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MidnightError';
  }
}

export class SealError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SEAL_ERROR', details);
    this.name = 'SealError';
  }
}

export class VerifyError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VERIFY_ERROR', details);
    this.name = 'VerifyError';
  }
}

export class DecryptError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DECRYPT_ERROR', details);
    this.name = 'DecryptError';
  }
}

export class ProofError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PROOF_ERROR', details);
    this.name = 'ProofError';
  }
}

export class CircuitError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CIRCUIT_ERROR', details);
    this.name = 'CircuitError';
  }
}

export class NetworkError extends MidnightError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}