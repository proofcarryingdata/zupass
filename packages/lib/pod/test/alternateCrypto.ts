import { generateSnarkMessageHash } from "@pcd/util";
import { Point } from "@zk-kit/baby-jubjub";
import { Signature } from "@zk-kit/eddsa-poseidon";
import { BigNumber } from "@zk-kit/utils";
import { Buffer } from "buffer";
import { expect } from "chai";
import {
  Eddsa as CLEddsa,
  Point as CLPoint,
  Signature as CLSignature,
  buildEddsa as clBuildEddsa
} from "circomlibjs";
import { CryptoBytesEncoding } from "../src";
import { stripB64 } from "./common";

/**
 * This class contains alternate implementations of podCrypto helpers using
 * circomlibjs rather than zk-kit.  These are implemented in a way consistent
 * with the pre-existing EdDSAPCD, using the same circomlibjs library.  Each
 * method of this class should match the behavior of the podCrypto function
 * of the same name, without making use of any functions from podCrypto or
 * podUtil.
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
  private clEddsa: CLEddsa;

  private constructor(eddsa: CLEddsa) {
    this.clEddsa = eddsa;
  }

  public static async create(): Promise<AltCryptCircomlibjs> {
    return new AltCryptCircomlibjs(await clBuildEddsa());
  }

  public podBytesHash(input: string): bigint {
    // String hashing happens outside circuits, and doesn't use circomlibjs.
    // This helper represents how strings are hashed in EdDSATicketPCD, so
    // it lets us validate that PODs are using the same algorithm.
    // This might go away if we intentionally change the algorithm.
    // generateSnarkMessageHash never handled Uint8Arrays, so there's no
    // compatibility to check there.
    return generateSnarkMessageHash(input);
  }

  public podIntHash(input: bigint): bigint {
    // circomlibjs' poseidon input is bigints in standard form.  It's output is
    // buffers in Montgomery form.  fromObject converts back to bigint in
    // standard from.
    return this.clEddsa.F.toObject(this.clEddsa.poseidon([input]));
  }

  public podMerkleTreeHash(left: bigint, right: bigint): bigint {
    // circomlibjs' poseidon input is bigints in standard form.  It's output is
    // buffers in Montgomery form.  fromObject converts back to bigint in
    // standard from.
    return this.clEddsa.F.toObject(this.clEddsa.poseidon([left, right]));
  }

  // Note: encoding/decoding private keys doesn't involve any cryptography
  // (only hex encoding), so is intentionally omitted here.

  public encodePublicKey(rawPublicKey: Point<BigNumber>): string {
    // circomlibjs wants points as buffers in Montgomery form, which fromObject
    // produces.
    const clPublicKey = [
      this.clEddsa.F.fromObject(rawPublicKey[0]),
      this.clEddsa.F.fromObject(rawPublicKey[1])
    ] satisfies CLPoint;
    return stripB64(
      Buffer.from(this.clEddsa.babyJub.packPoint(clPublicKey)).toString(
        "base64"
      )
    );
  }

  public decodePublicKey(
    publicKey: string,
    encoding: CryptoBytesEncoding = "base64"
  ): Point<bigint> {
    const packedPublicKey = Buffer.from(publicKey, encoding);
    const clPublicKey = this.clEddsa.babyJub.unpackPoint(packedPublicKey);
    // circomlibjs produces points as buffers in Montgomery form, which
    // toObject converts to bigints in standard form
    return [
      this.clEddsa.F.toObject(clPublicKey[0]),
      this.clEddsa.F.toObject(clPublicKey[1])
    ] satisfies Point<bigint>;
  }

  public encodeSignature(rawSignature: Signature<bigint>): string {
    const clSignature = {
      // circomlibjs wants R8 (point) as buffers in Montgomery form, which
      // fromObject produces
      R8: [
        this.clEddsa.F.fromObject(rawSignature.R8[0]),
        this.clEddsa.F.fromObject(rawSignature.R8[1])
      ],
      // circomlibjs wants S (scalar) as bigint in standard form
      S: rawSignature.S
    } satisfies CLSignature;
    return stripB64(
      Buffer.from(this.clEddsa.packSignature(clSignature)).toString("base64")
    );
  }

  public decodeSignature(
    encodedSignature: string,
    encoding: CryptoBytesEncoding = "base64"
  ): Signature<bigint> {
    const clSignature = this.clEddsa.unpackSignature(
      Buffer.from(encodedSignature, encoding)
    );
    return {
      // circomlibjs produces R8 (point) as buffers in Montgomery form, which
      // toObject converts to bigints in standard form
      R8: [
        this.clEddsa.F.toObject(clSignature.R8[0]),
        this.clEddsa.F.toObject(clSignature.R8[1])
      ],
      // circomlibjs produces S (scalar) as bigint in standard form
      S: clSignature.S
    } satisfies Signature<bigint>;
  }

  public signPODRoot(
    root: bigint,
    privateKey: string
  ): { signature: string; publicKey: string } {
    expect(privateKey).to.have.length(43);

    // Private key is interpreted as 32-bytes encoded in base64.
    const altPrivateKey = Buffer.from(privateKey, "base64");
    expect(altPrivateKey).to.have.length(32);

    // EdDSAPCD has an extra step where it hashes a list of bigints (the PCD's
    // message) into a single bigint (EdDSA's message) to sign.  Our root takes
    // the place of the already-hashed message.  It's expected to be a 32-byte
    // buffer in Montgomery form, which is what fromObject produces.
    const altHashedMessage = this.clEddsa.F.fromObject(root);
    expect(altHashedMessage).to.have.length(32);

    // Private key is a single EC point, which can be packed into a single
    // field element fitting into 32 bytes (64 hex digits).  Packing converts
    // the value from Montgomery to standard form.
    const publicKey = stripB64(
      Buffer.from(
        this.clEddsa.babyJub.packPoint(this.clEddsa.prv2pub(altPrivateKey))
      ).toString("base64")
    );
    expect(publicKey).to.have.length(43);

    // Private key is an EC point plus a scalar (field element).  The EC point
    // can be packed into a single field element.  That plus the scalar fit in
    // 64 bytes (128 hex digits).  Packing converts the value from Montgomery to
    // standard form.
    const signature = stripB64(
      Buffer.from(
        this.clEddsa.packSignature(
          this.clEddsa.signPoseidon(altPrivateKey, altHashedMessage)
        )
      ).toString("base64")
    );
    expect(signature).to.have.length(86);

    return { signature, publicKey };
  }

  public verifyPODRootSignature(
    root: bigint,
    signature: string,
    publicKey: string
  ): boolean {
    // Unpack the signature into 3 numbers (1 EC point, 1 scalar) in Montgomery
    // form.
    expect(signature).to.have.length(86);
    const altSignature = this.clEddsa.unpackSignature(
      Buffer.from(signature, "base64")
    );

    // Unpack the public key into an EC point in Montgomery form.
    expect(publicKey).to.have.length(43);
    const altPublicKey = this.clEddsa.babyJub.unpackPoint(
      Buffer.from(publicKey, "base64")
    );

    // EdDSAPCD has an extra step where it hashes a list of bigints (the PCD's
    // message) into a single bigint (EdDSA's message) to sign.  Our root takes
    // the place of the already-hashed message.  It's expected to be a 32-byte
    // buffer in Montgomery form, which is what fromObject produces.
    const altHashedMessage = this.clEddsa.F.fromObject(root);
    expect(altHashedMessage).to.have.length(32);

    return this.clEddsa.verifyPoseidon(
      altHashedMessage,
      altSignature,
      altPublicKey
    );
  }
}
