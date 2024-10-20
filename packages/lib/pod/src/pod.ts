import {
  checkPublicKeyFormat,
  checkSignatureFormat,
  requireType
} from "./podChecks";
import { PODContent } from "./podContent";
import { signPODRoot, verifyPODRootSignature } from "./podCrypto";
import { JSONPOD, podEntriesFromJSON, podEntriesToJSON } from "./podJSON";
import { PODEntries } from "./podTypes";

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
   * The signature is made up of 64 bytes, represented in URL-safe Base64.
   */
  public get signature(): string {
    return this._signature;
  }

  /**
   * The public key of the signer, in a packed string form.  This is
   * an EdDSA-Poseidon public key made up of 32 bytes, represnted in URL-safe
   * Base64.
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
   *   to be 32 bytes, encoded as per {@link decodePrivateKey}.
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
   * Converts this POD to a JSON-compatible format which can be safely
   * serialized using `JSON.stringify` without any loss of information.  To
   * reconstitute a POD object from JSON, see {@link fromJSON}.
   *
   * @returns a JSON-compatible representation of this POD.
   */
  public toJSON(): JSONPOD {
    return {
      entries: podEntriesToJSON(this._content.asEntries()),
      signature: this._signature,
      signerPublicKey: this._signerPublicKey
    };
  }

  /**
   * Rebuilds a POD object from the JSON-compatible format produced by
   * {@link toJSON}.  The input can be taken directly from `JSON.parse` and
   * will be fully validated by this function.
   *
   * @param jsonPOD the JSON-encoded POD.
   * @returns a new POD object
   * @throws TypeError if the input is malformed
   * @throws RangeError if a value is outside of the bounds
   */
  public static fromJSON(jsonPOD: JSONPOD): POD {
    requireType("jsonPOD", jsonPOD, "object");

    // The loading below validates that the expected keys exist with valid
    // values.  Here we also rule out extra unrecognized keys to avoid lossy
    // parsing of a future format which might have more fields.  This includes
    // rejecting any potential "version" field, so that if we add one later old
    // code won't ignore it.
    if (Object.keys(jsonPOD).length !== 3) {
      throw TypeError(
        "JSON POD should contain only the 3 expected keys: " +
          "entries, signature, signerPublicKey"
      );
    }

    return POD.load(
      podEntriesFromJSON(jsonPOD.entries),
      jsonPOD.signature,
      jsonPOD.signerPublicKey
    );
  }
}
