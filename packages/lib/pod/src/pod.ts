import { PODContent } from "./podContent";
import { signPODRoot, verifyPODRootSignature } from "./podCrypto";
import { PODEntries } from "./podTypes";

/**
 * Encapsulates the data in a POD which must be persisted in order to
 * reconstruct the same POD later.
 */
export type SavedPOD = {
  entries: PODEntries;
  signature: string;
  signerPublicKey: string;
};

/**
 * TODO(artwyman): Class/method docs.
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

  public get content(): PODContent {
    return this._content;
  }

  public get contentID(): bigint {
    return this._content.contentID;
  }

  public get signature(): string {
    return this._signature;
  }

  public get signerPublicKey(): string {
    return this._signerPublicKey;
  }

  public static sign(entries: PODEntries, signerPrivateKey: string): POD {
    const podContent = PODContent.fromEntries(entries);
    const { signature, publicKey } = signPODRoot(
      podContent.contentID,
      signerPrivateKey
    );
    return new POD(podContent, signature, publicKey);
  }

  public verifySignature(): boolean {
    return verifyPODRootSignature(
      this._content.contentID,
      this._signature,
      this._signerPublicKey
    );
  }

  public getDataToSave(): SavedPOD {
    return {
      entries: this.content.asEntries(),
      signature: this.signature,
      signerPublicKey: this.signerPublicKey
    };
  }

  public static loadFromData(savedPOD: SavedPOD): POD {
    return new POD(
      PODContent.fromEntries(savedPOD.entries),
      savedPOD.signature,
      savedPOD.signerPublicKey
    );
  }
}
