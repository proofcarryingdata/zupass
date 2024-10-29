import { type ConnectorAdvice } from "@parcnet-js/client-helpers";
import {
  MissingPermissionError,
  ParcnetGPCRPC,
  ParcnetIdentityRPC,
  ParcnetPODRPC,
  ParcnetRPC,
  ParcnetRPCMethodName,
  PODData,
  PODQuery,
  ProveResult,
  Zapp
} from "@parcnet-js/client-rpc";
import * as p from "@parcnet-js/podspec";
import {
  GPCBoundConfig,
  GPCIdentifier,
  GPCProof,
  GPCRevealedClaims,
  gpcVerify
} from "@pcd/gpc";
import { encodePrivateKey, encodePublicKey, POD, PODEntries } from "@pcd/pod";
import { PODPCD, PODPCDPackage, PODPCDTypeName } from "@pcd/pod-pcd";
import {
  PODTicketPCD,
  PODTicketPCDTypeName,
  ticketToPOD
} from "@pcd/pod-ticket-pcd";
import { v3tov4Identity } from "@pcd/semaphore-identity-pcd";
import { v4 as uuidv4 } from "uuid";
import { appConfig } from "../appConfig";
import { StateContextValue } from "../dispatch";
import { EmbeddedScreenType } from "../embedded";
import { getGPCArtifactsURL } from "../util";
import { collectionIdToFolderName, getPODsForCollections } from "./collections";
import { QuerySubscriptionManager } from "./query_subscription_manager";
import { ListenMode } from "./useZappServer";

abstract class BaseZappServer {
  constructor(
    private context: StateContextValue,
    private advice: ConnectorAdvice
  ) {}

  public getContext(): StateContextValue {
    return this.context;
  }

  public getAdvice(): ConnectorAdvice {
    return this.advice;
  }

  public getPermissions(): Zapp["permissions"] {
    return this.getContext().getState().connectedZapp?.permissions ?? {};
  }
}

export class ZupassIdentityRPC
  extends BaseZappServer
  implements ParcnetIdentityRPC
{
  public constructor(
    context: StateContextValue,
    clientChannel: ConnectorAdvice
  ) {
    super(context, clientChannel);
  }

  public async getSemaphoreV3Commitment(): Promise<bigint> {
    if (
      !this.getContext().getState().connectedZapp?.permissions
        .READ_PUBLIC_IDENTIFIERS
    ) {
      throw new MissingPermissionError(
        "READ_PUBLIC_IDENTIFIERS",
        "identity.getSemaphoreV3Commitment"
      );
    }
    return this.getContext().getState().identityV3.getCommitment();
  }

  public async getSemaphoreV4Commitment(): Promise<bigint> {
    if (
      !this.getContext().getState().connectedZapp?.permissions
        .READ_PUBLIC_IDENTIFIERS
    ) {
      throw new MissingPermissionError(
        "READ_PUBLIC_IDENTIFIERS",
        "identity.getSemaphoreV4Commitment"
      );
    }
    return v3tov4Identity(this.getContext().getState().identityV3).commitment;
  }

  public async getPublicKey(): Promise<string> {
    if (
      !this.getContext().getState().connectedZapp?.permissions
        .READ_PUBLIC_IDENTIFIERS
    ) {
      throw new MissingPermissionError(
        "READ_PUBLIC_IDENTIFIERS",
        "identity.getPublicKey"
      );
    }
    return encodePublicKey(
      v3tov4Identity(this.getContext().getState().identityV3).publicKey
    );
  }
}

class ZupassPODRPC extends BaseZappServer implements ParcnetPODRPC {
  public constructor(
    context: StateContextValue,
    advice: ConnectorAdvice,
    private readonly querySubscriptionManager: QuerySubscriptionManager
  ) {
    super(context, advice);
  }

  public async subscribe(
    collectionId: string,
    query: PODQuery
  ): Promise<string> {
    if (!this.getPermissions().READ_POD?.collections.includes(collectionId)) {
      throw new MissingPermissionError("READ_POD", "pod.query");
    }
    return this.querySubscriptionManager.addSubscription(collectionId, query);
  }

  public async unsubscribe(subscriptionId: string): Promise<void> {
    this.querySubscriptionManager.removeSubscription(subscriptionId);
  }

  public async query(
    collectionId: string,
    query: PODQuery
  ): Promise<PODData[]> {
    const origin = this.getContext().getState().zappOrigin;
    if (!this.getPermissions().READ_POD?.collections.includes(collectionId)) {
      throw new MissingPermissionError("READ_POD", "pod.query");
    }
    if (
      collectionId === "Devcon SEA" &&
      (!origin || !appConfig.devconTicketQueryOrigins.includes(origin))
    ) {
      throw new Error("Operation not allowed");
    }
    const pods = getPODsForCollections(this.getContext().getState().pcds, [
      collectionId
    ]);

    const result = p.pod(query).query(pods);

    return result.matches.map(p.podToPODData);
  }

  /**
   * Insert a POD into the PCD collection.
   */
  public async insert(collectionId: string, podData: PODData): Promise<void> {
    if (
      !this.getPermissions().INSERT_POD?.collections.includes(collectionId) ||
      collectionId === "Devcon SEA"
    ) {
      throw new MissingPermissionError("INSERT_POD", "pod.insert");
    }
    const id = uuidv4();
    const podPCD = new PODPCD(
      id,
      POD.load(podData.entries, podData.signature, podData.signerPublicKey)
    );
    const serializedPCD = await PODPCDPackage.serialize(podPCD);

    const currentRevision = this.getContext().getState().serverStorageRevision;

    return new Promise((resolve) => {
      const unlisten = this.getContext().stateEmitter.listen((state) => {
        if (state.serverStorageRevision !== currentRevision) {
          unlisten();
          resolve();
        }
      });

      this.getContext().dispatch({
        type: "add-pcds",
        folder: collectionIdToFolderName(collectionId),
        pcds: [serializedPCD],
        upsert: true
      });
    });
  }

  /**
   * Delete all PODs with the given signature.
   */
  public async delete(collectionId: string, signature: string): Promise<void> {
    if (
      !this.getPermissions().DELETE_POD?.collections.includes(collectionId) ||
      collectionId === "Devcon SEA"
    ) {
      throw new MissingPermissionError("DELETE_POD", "pod.delete");
    }
    const allPCDs = this.getContext()
      .getState()
      .pcds.getAllPCDsInFolder(collectionIdToFolderName(collectionId));
    // This will delete *all* PODs in the folder which have a matching
    // signature. Since signatures are unique, this seems reasonable. There is
    // probably no good reason to have multiple PODs with the same signature.
    const pcdIds = allPCDs
      .filter(
        (pcd) =>
          pcd.type === PODPCDTypeName &&
          (pcd as PODPCD).proof.signature === signature
      )
      .map((pcd) => pcd.id);

    const currentRevision = this.getContext().getState().serverStorageRevision;

    return new Promise((resolve) => {
      const unlisten = this.getContext().stateEmitter.listen((state) => {
        if (state.serverStorageRevision !== currentRevision) {
          unlisten();
          resolve();
        }
      });

      for (const id of pcdIds) {
        this.getContext().dispatch({
          type: "remove-pcd",
          id
        });
      }
    });
  }

  public async sign(entries: PODEntries): Promise<PODData> {
    const origin = this.getContext().getState().zappOrigin;
    if (
      appConfig.zappRestrictOrigins &&
      (!origin || !appConfig.zappAllowedSignerOrigins.includes(origin))
    ) {
      throw new Error("Origin not allowed to sign PODs");
    }
    if (!this.getPermissions().SIGN_POD) {
      throw new MissingPermissionError("SIGN_POD", "pod.sign");
    }
    if (
      entries.pod_type &&
      typeof entries.pod_type.value === "string" &&
      (entries.pod_type.value.substring(0, 7) === "zupass_" ||
        entries.pod_type.value.substring(0, 7) === "zupass.")
    ) {
      throw new Error(
        `The pod_type prefixes "zupass." and "zupass_" are reserved.`
      );
    }

    // If the Zapp is embedded, it can sign a POD directly
    const zappIsEmbedded =
      this.getContext().getState().listenMode ===
      ListenMode.LISTEN_IF_NOT_EMBEDDED;

    const zappOrigin = this.getContext().getState().zappOrigin;

    if (
      zappIsEmbedded ||
      (zappOrigin && appConfig.zappAllowedSignerOrigins.includes(zappOrigin))
    ) {
      const pod = POD.sign(
        entries,
        encodePrivateKey(
          Buffer.from(
            v3tov4Identity(this.getContext().getState().identityV3).export(),
            "base64"
          )
        )
      );
      return p.podToPODData(pod);
    }
    return new Promise((resolve, reject) => {
      this.getContext().dispatch({
        type: "show-embedded-screen",
        screen: {
          type: EmbeddedScreenType.EmbeddedSignPOD,
          entries,
          callback: (result: PODData) => {
            this.getContext().dispatch({
              type: "hide-embedded-screen"
            });
            this.getAdvice().hideClient();
            resolve(result);
          },
          onCancel: () => {
            this.getAdvice().hideClient();
            this.getContext().dispatch({
              type: "hide-embedded-screen"
            });

            reject(new Error("User cancelled"));
          }
        }
      });
      this.getAdvice().showClient();
    });
  }

  public async signPrefixed(entries: PODEntries): Promise<PODData> {
    const origin = this.getContext().getState().zappOrigin;
    if (
      appConfig.zappRestrictOrigins &&
      (!origin || !appConfig.zappAllowedSignerOrigins.includes(origin))
    ) {
      throw new Error("Origin not allowed to sign PODs");
    }
    if (!this.getPermissions().SIGN_POD) {
      throw new MissingPermissionError("SIGN_POD", "pod.sign");
    }

    for (const name of Object.keys(entries)) {
      if (!name.startsWith("_UNSAFE_")) {
        throw new Error(
          "PODs signed with signPrefixed must have a prefix of _UNSAFE_"
        );
      }
    }

    entries.UNSAFE_META_ORIGIN = {
      type: "string",
      value: this.getContext().getState().zappOrigin as string
    };

    const pod = POD.sign(
      entries,
      encodePrivateKey(
        Buffer.from(
          v3tov4Identity(this.getContext().getState().identityV3).export(),
          "base64"
        )
      )
    );
    return p.podToPODData(pod);
  }
}

class ZupassGPCRPC extends BaseZappServer implements ParcnetGPCRPC {
  public constructor(context: StateContextValue, advice: ConnectorAdvice) {
    super(context, advice);
  }

  private getPODsIfPermitted(
    collectionIds: string[],
    method: ParcnetRPCMethodName
  ): POD[] {
    const permission = this.getPermissions().REQUEST_PROOF;
    if (!permission) {
      throw new MissingPermissionError("REQUEST_PROOF", method);
    }

    if (
      collectionIds.some(
        (collectionId) => !permission.collections.includes(collectionId)
      )
    ) {
      throw new MissingPermissionError("REQUEST_PROOF", method);
    }

    return getPODsForCollections(
      this.getContext().getState().pcds,
      collectionIds
    );
  }

  public async prove({
    request,
    collectionIds,
    circuitIdentifier
  }: {
    request: p.PodspecProofRequest;
    collectionIds?: string[];
    circuitIdentifier?: GPCIdentifier;
  }): Promise<ProveResult> {
    const realCollectionIds =
      collectionIds ?? this.getPermissions().REQUEST_PROOF?.collections ?? [];
    const pods = this.getPODsIfPermitted(realCollectionIds, "gpc.prove");
    const prs = p.proofRequest(request);

    const ticketPods = this.getContext()
      .getState()
      .pcds.getPCDsByType(PODTicketPCDTypeName)
      .map((pcd) => {
        try {
          return ticketToPOD(pcd as PODTicketPCD);
        } catch (e) {
          return undefined;
        }
      })
      .filter((p) => !!p) as POD[];

    pods.push(...ticketPods);

    const inputPods = prs.queryForInputs(pods);
    if (
      Object.values(inputPods).some((candidates) => candidates.length === 0)
    ) {
      return {
        success: false,
        error: "Not enough PODs"
      };
    }

    return new Promise((resolve) => {
      this.getContext().dispatch({
        type: "show-embedded-screen",
        screen: {
          type: EmbeddedScreenType.EmbeddedGPCProof,
          proofRequest: request,
          collectionIds: realCollectionIds,
          circuitIdentifier,
          callback: (result: ProveResult) => {
            this.getContext().dispatch({
              type: "hide-embedded-screen"
            });
            this.getAdvice().hideClient();
            resolve(result);
          }
        }
      });
      this.getAdvice().showClient();
    });
  }

  public async verify(
    proof: GPCProof,
    boundConfig: GPCBoundConfig,
    revealedClaims: GPCRevealedClaims
  ): Promise<boolean> {
    return gpcVerify(
      proof,
      boundConfig,
      revealedClaims,
      getGPCArtifactsURL(window.location.origin)
    );
  }

  public async verifyWithProofRequest(
    proof: GPCProof,
    boundConfig: GPCBoundConfig,
    revealedClaims: GPCRevealedClaims,
    proofRequest: p.PodspecProofRequest
  ): Promise<boolean> {
    const config = p.proofRequest(proofRequest).getProofRequest().proofConfig;
    config.circuitIdentifier = boundConfig.circuitIdentifier;

    return gpcVerify(
      proof,
      config as GPCBoundConfig,
      revealedClaims,
      getGPCArtifactsURL(window.location.origin)
    );
  }

  public async canProve({
    request,
    collectionIds
  }: {
    request: p.PodspecProofRequest;
    collectionIds?: string[];
  }): Promise<boolean> {
    collectionIds =
      collectionIds ?? this.getPermissions().REQUEST_PROOF?.collections ?? [];
    const pods = this.getPODsIfPermitted(collectionIds, "gpc.canProve");
    const prs = p.proofRequest(request);

    const inputPods = prs.queryForInputs(pods);
    return Object.values(inputPods).every(
      (candidates) => candidates.length > 0
    );
  }
}

export class ZupassRPCProcessor extends BaseZappServer implements ParcnetRPC {
  _version: "1" = "1" as const;
  public readonly identity: ZupassIdentityRPC;
  public readonly pod: ZupassPODRPC;
  public readonly gpc: ZupassGPCRPC;
  private readonly querySubscriptionManager: QuerySubscriptionManager =
    new QuerySubscriptionManager(this.getContext());

  public constructor(context: StateContextValue, advice: ConnectorAdvice) {
    super(context, advice);
    this.querySubscriptionManager.onSubscriptionUpdated(
      (subscriptionId, update, serial) => {
        this.getAdvice().subscriptionUpdate({ subscriptionId, update }, serial);
      }
    );
    context
      .getState()
      .pcds.changeEmitter.listen(() => this.querySubscriptionManager.update());
    this.pod = new ZupassPODRPC(
      this.getContext(),
      this.getAdvice(),
      this.querySubscriptionManager
    );
    this.identity = new ZupassIdentityRPC(this.getContext(), this.getAdvice());
    this.gpc = new ZupassGPCRPC(this.getContext(), this.getAdvice());
  }
}
