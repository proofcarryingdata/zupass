declare module "snarkjs" {
  namespace groth16 {
    async function fullProve(
      input: Record<string, string>,
      wasmPath: string,
      zkeyPath: string
    ): Promise<{ publicSignals: string[]; proof: Object }>;

    async function verify(
      verificationKey: any,
      publicSignals: string[],
      proof: Object
    ): Promise<boolean>;
  }
}
