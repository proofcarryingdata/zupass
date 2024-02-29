import { PODContent } from "./podContent";
import { signPODRoot, verifyPODRootSignature } from "./podCrypto";
import { PODEntries } from "./podTypes";

/**
 * Encapsulates the data in a POD which must be persisted in order to
 * reconstruct the same POD later.  These are data objects with no hidden
 * fields or behavior.  However there is no handling of serialization or
 * backward-compatibility at this level.
 */
export type SavedPOD = {
  entries: PODEntries;
  signature: string;
  signerPublicKey: string;
};

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
 * TODO(artwyman): Pointer to more detailed documention elsewhere.
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
   * will have the same content ID.
   */
  public get contentID(): bigint {
    return this._content.contentID;
  }

  /**
   * The signature of this POD, in a packed string form.  This is an
   * EdDSA-Poseidon signature, using the POD's content ID.
   */
  public get signature(): string {
    return this._signature;
  }

  /**
   * The public key of the signer, in a packed string form.  This is
   * an EdDSA-Poseidon public key.
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
   * @param signerPrivateKey the EdDSA private key of the signer.
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
   * Extracts minimal data needed to reconstruct this POD using
   * `loadFromData()`.  This doesn't include derivable values such as
   * the Merkle tree hashes.
   *
   * @returns the minimal data representing this POD
   */
  public getDataToSave(): SavedPOD {
    return {
      entries: this.content.asEntries(),
      signature: this.signature,
      signerPublicKey: this.signerPublicKey
    };
  }

  /**
   * Factory to create a new POD using saved data.  Derived values such as
   * Merkle tree hashes will be calculated lazily as-needed.
   *
   * Note that this method does not verify the signature.  To check the
   * validity of your POD, call `verifySignature()` separately.
   *
   * @param savedPOD saved data fields provided by `getDataToSave()`, or
   *   loaded from some external store
   * @returns a new POD
   * @throws if any of the entries aren't legal for inclusion in a POD
   */
  public static loadFromData(savedPOD: SavedPOD): POD {
    return new POD(
      PODContent.fromEntries(savedPOD.entries),
      savedPOD.signature,
      savedPOD.signerPublicKey
    );
  }
}
