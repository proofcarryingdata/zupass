import { fromHexString, toHexString } from "@pcd/util";
import { expect } from "chai";
import { Eddsa, buildEddsa } from "circomlibjs";

/**
 * This class contains alternate implementations of podCrypto helpers using
 * circomlibjs rather than zk-kit.  These are implemented in a way consistent
 * with the pre-existing EdDSAPCD, using the same circomlibjs library.  Each
 * method of this class should match the behavior of the podCrypto function
 * of the same name.
 *
 * The intent is to ensure that we're using these cryptographic libraries in a
 * standard and compatible way, and won't find out later that we're locked into
 * a single library, or that different PCDs are interpreting keys/signatures in
 * incompatble ways.
 *
 * The code here includes chai asserts, so is intended only for use in unit
 * tests.
 */
export class AltCryptCircomlibjs {
  private eddsa: Eddsa;

  private constructor(eddsa: Eddsa) {
    this.eddsa = eddsa;
  }

  public static async create(): Promise<AltCryptCircomlibjs> {
    return new AltCryptCircomlibjs(await buildEddsa());
  }

  // TODO(POD-P1): Fill in remaining helpers, notably hashes.

  public signPODRoot(
    root: bigint,
    privateKey: string
  ): { signature: string; publicKey: string } {
    expect(privateKey).to.have.length(64);

    // Private key is interpreted as 32-bytes encoded in hex.
    const altPrivateKey = fromHexString(privateKey);
    expect(altPrivateKey).to.have.length(32);

    // EdDSAPCD has an extra step where it hashes a list of bigints (the PCD's
    // message) into a single bigint (EdDSA's message) to sign.  Our root takes
    // the place of the already-hashed message.  It's expected to be a 32-byte
    // buffer in Montgomery form, which is what fromObject produces.
    const altHashedMessage = this.eddsa.F.fromObject(root);
    expect(altHashedMessage).to.have.length(32);

    // Private key is a single EC point, which can be packed into a single
    // field element fitting into 32 bytes (64 hex digits).  Packing converts
    // the value from Montgomery to standard form.
    const publicKey = toHexString(
      this.eddsa.babyJub.packPoint(this.eddsa.prv2pub(altPrivateKey))
    );
    expect(publicKey).to.have.length(64);

    // Private key is an EC point plus a scalar (field element).  The EC point
    // can be packed into a single field element.  That plus the scalar fit in
    // 64 bytes (128 hex digits).  Packing converts the value from Montgomery to
    // standard form.
    const signature = toHexString(
      this.eddsa.packSignature(
        this.eddsa.signPoseidon(altPrivateKey, altHashedMessage)
      )
    );
    expect(signature).to.have.length(128);

    return { signature, publicKey };
  }

  public verifyPODRootSignature(
    root: bigint,
    signature: string,
    publicKey: string
  ): boolean {
    // Unpack the signature into 3 numbers (1 EC point, 1 scalar) in Montgomery
    // form.
    expect(signature).to.have.length(128);
    const altSignature = this.eddsa.unpackSignature(fromHexString(signature));

    // Unpack the public key into an EC point in Montgomery form.
    expect(publicKey).to.have.length(64);
    const altPublicKey = this.eddsa.babyJub.unpackPoint(
      fromHexString(publicKey)
    );

    // EdDSAPCD has an extra step where it hashes a list of bigints (the PCD's
    // message) into a single bigint (EdDSA's message) to sign.  Our root takes
    // the place of the already-hashed message.  It's expected to be a 32-byte
    // buffer in Montgomery form, which is what fromObject produces.
    const altHashedMessage = this.eddsa.F.fromObject(root);
    expect(altHashedMessage).to.have.length(32);

    return this.eddsa.verifyPoseidon(
      altHashedMessage,
      altSignature,
      altPublicKey
    );
  }
}
