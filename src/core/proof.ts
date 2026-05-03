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