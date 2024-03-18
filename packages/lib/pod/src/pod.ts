import { requireDefinedParameter } from "@pcd/util";
import JSONBig from "json-bigint";
import { PODContent } from "./podContent";
import { signPODRoot, verifyPODRootSignature } from "./podCrypto";
import { PODEntries } from "./podTypes";
import { checkPublicKeyFormat, checkSignatureFormat } from "./podUtil";

/**
 * Class encapsulating a signed POD with functions for common use cases.
 * POD instances are immutable (within the limits of TypeScript), but derived
 * data (such as the Merkle tree of entries) is calculated lazily as it is
 * needed.
 *
 * A POD is made up of `PODEntries`, built into a Merkle tree (in sorted order)
 * to produce a root hash called the Content ID, which is then signed.  To
 * create a POD, use one of the static factory methods of this class.
 *
 * TODO(POD-P3): Pointer to more detailed documention elsewhere.
 *
 * Most features depending on the POD entries but not the signature are
 * provided by a PODContent instance available via `pod.content`.
 */
export class POD {
  private _content: PODContent;
  private _signature: string;
  private _signerPublicKey: string;

  private constructor(
    content: PODContent,
    signature: string,
    signerPublicKey: string
  ) {
    this._content = content;
    this._signature = signature;
    this._signerPublicKey = signerPublicKey;
  }

  /**
   * This POD's data as a PODContent object.
   */
  public get content(): PODContent {
    return this._content;
  }

  /**
   * The content ID (root hash) of this POD.  PODs containing the same data
   * (names and values, regardless of type) will have the same content ID.
   */
  public get contentID(): bigint {
    return this._content.contentID;
  }

  /**
   * The signature of this POD, in a packed string form.  This is an
   * EdDSA-Poseidon signature, with the POD's content ID as the signed message.
   * The signature is made up of 64 bytes, expressed as 128 hex digits.
   */
  public get signature(): string {
    return this._signature;
  }

  /**
   * The public key of the signer, in a packed string form.  This is
   * an EdDSA-Poseidon public key made up of 32 bytes, expressed as 64 hex
   * digits.
   */
  public get signerPublicKey(): string {
    return this._signerPublicKey;
  }

  /**
   * Factory to create a new POD by signing with the given private key.  Since
   * signing requires the content ID, this method of creation will immediately
   * calculate the Merkle tree.
   *
   * @param entries the contents of the new POD.  These will be Merklized
   *   in order by name, regardless of the order of the input.
   * @param signerPrivateKey the EdDSA private key of the signer, required
   *   to be 32 bytes, encoded as 64 hex digits.
   * @throws if any of the entries aren't legal for inclusion in a POD
   */
  public static sign(entries: PODEntries, signerPrivateKey: string): POD {
    const podContent = PODContent.fromEntries(entries);
    const { signature, publicKey } = signPODRoot(
      podContent.contentID,
      signerPrivateKey
    );
    return new POD(podContent, signature, publicKey);
  }

  /**
   * @returns `true` if the signature of this POD is valid
   */
  public verifySignature(): boolean {
    return verifyPODRootSignature(
      this._content.contentID,
      this._signature,
      this._signerPublicKey
    );
  }

  /**
   * Factory to create a new POD using saved data signed previously.  Derived
   * values such as Merkle tree hashes will be calculated lazily as-needed.
   *
   * Note that this method does not verify the signature.  To check the
   * validity of your POD, call `verifySignature()` separately.
   *
   * @param entries saved entries
   * @param signature saved signature
   * @param signerPublicKey saved public key of signer
   * @returns a new POD
   * @throws if any arguments are malformed, or any of the entries aren't legal
   *   for inclusion in a POD
   */
  public static load(
    entries: PODEntries,
    signature: string,
    signerPublicKey: string
  ): POD {
    return new POD(
      PODContent.fromEntries(entries),
      checkSignatureFormat(signature),
      checkPublicKeyFormat(signerPublicKey)
    );
  }

  /**
   * Serializes this instance as a JSON string.
   */
  public serialize(): string {
    return JSONBig({
      useNativeBigInt: true,
      alwaysParseAsBig: true
    }).stringify({
      entries: this.content.asEntries(),
      signature: this.signature,
      signerPublicKey: this.signerPublicKey
    });
  }

  /**
   * Deserializes a POD from a JSON string.
   *
   * @param serializedPOD a string previously created by {@link #serialize}.
   * @returns a new PODContent instance
   * @throws if the string isn't valid JSON, or represents entries which aren't
   *   legal for inclusion in a POD
   */
  public static deserialize(serializedPOD: string): POD {
    const parsedPOD = JSONBig({
      useNativeBigInt: true,
      alwaysParseAsBig: true
    }).parse(serializedPOD);

    // TODO(POD-P2): More careful schema validation, likely with Zod, with
    // special handling of the PODEntries type and subtypes.
    // TODO(POD-P3): Backward-compatible schema versioning?
    requireDefinedParameter(parsedPOD.entries, "entries");
    requireDefinedParameter(parsedPOD.signature, "signature");
    requireDefinedParameter(parsedPOD.signerPublicKey, "signerPublicKey");

    return POD.load(
      parsedPOD.entries,
      parsedPOD.signature,
      parsedPOD.signerPublicKey
    );
  }
}
