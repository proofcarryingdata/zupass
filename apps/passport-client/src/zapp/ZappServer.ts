import { ConnectorAdvice } from "@parcnet-js/client-helpers";
import {
  ParcnetGPCRPC,
  ParcnetIdentityRPC,
  ParcnetPODRPC,
  ParcnetRPC,
  PODQuery,
  ProveResult
} from "@parcnet-js/client-rpc";
import * as p from "@parcnet-js/podspec";
import { encodePrivateKey, POD, PODEntries } from "@pcd/pod";
import { isPODPCD, PODPCD, PODPCDPackage, PODPCDTypeName } from "@pcd/pod-pcd";
import { v3tov4Identity } from "@pcd/semaphore-identity-pcd";
import { v4 as uuidv4 } from "uuid";
import { StateContextValue } from "../dispatch";
import { EmbeddedScreenType } from "../embedded";

export const ZAPP_POD_SPECIAL_FOLDER_NAME = "PODs from Zapps";

abstract class BaseZappServer {
  constructor(
    private context: StateContextValue,
    private zapp: PODPCD,
    private advice: ConnectorAdvice
  ) {}

  public getZapp(): PODPCD {
    return this.zapp;
  }

  public getContext(): StateContextValue {
    return this.context;
  }

  public getAdvice(): ConnectorAdvice {
    return this.advice;
  }
}

export class ZupassIdentityRPC
  extends BaseZappServer
  implements ParcnetIdentityRPC
{
  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    clientChannel: ConnectorAdvice
  ) {
    super(context, zapp, clientChannel);
  }

  public async getSemaphoreV3Commitment(): Promise<bigint> {
    return this.getContext().getState().identityV3.getCommitment();
  }
}

class ZupassPODRPC extends BaseZappServer implements ParcnetPODRPC {
  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    advice: ConnectorAdvice
  ) {
    super(context, zapp, advice);
    this.getContext()
      .getState()
      .pcds.changeEmitter.listen(() => {});
  }

  public async subscribe(_query: PODQuery): Promise<string> {
    return "1";
  }

  public async unsubscribe(_subscriptionId: string): Promise<void> {}

  public async query(query: PODQuery): Promise<string[]> {
    const allPCDs = this.getContext()
      .getState()
      .pcds.getAllPCDsInFolder(ZAPP_POD_SPECIAL_FOLDER_NAME);
    const pods = allPCDs.filter(isPODPCD).map((pcd) => pcd.pod);

    const result = p.pod(query).query(pods);

    return result.matches.map((match) => match.serialize());
  }

  /**
   * Insert a POD into the PCD collection.
   */
  public async insert(serializedPod: string): Promise<void> {
    const pod = POD.deserialize(serializedPod);
    const id = uuidv4();
    const podPCD = new PODPCD(id, pod);
    const serializedPCD = await PODPCDPackage.serialize(podPCD);
    this.getContext().dispatch({
      type: "add-pcds",
      // This is probably not where we want to store these, but it's not clear
      // how much the folder concept should be visible to the API.
      // We could add a "meta" parameter which could contain a "zupassFolder"
      // record, for instance, but this begins to couple the API too closely to
      // the specifics of Zupass.
      // In the meantime, however, PODs stored in this way can be retrieved by
      // Zapps using the query API.
      folder: ZAPP_POD_SPECIAL_FOLDER_NAME,
      pcds: [serializedPCD],
      upsert: true
    });
  }

  /**
   * Delete all PODs with the given signature.
   */
  public async delete(signature: string): Promise<void> {
    const allPCDs = this.getContext()
      .getState()
      // Deletion is restricted to Zapp-created PODs
      .pcds.getAllPCDsInFolder(ZAPP_POD_SPECIAL_FOLDER_NAME);
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

    await Promise.all(
      pcdIds.map((id) =>
        this.getContext().dispatch({
          type: "remove-pcd",
          id
        })
      )
    );
  }

  public async sign(entries: PODEntries): Promise<string> {
    const pod = POD.sign(
      entries,
      encodePrivateKey(
        Buffer.from(
          v3tov4Identity(this.getContext().getState().identityV3).export(),
          "base64"
        )
      )
    );
    return pod.serialize();
  }
}

class ZupassGPCRPC extends BaseZappServer implements ParcnetGPCRPC {
  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    advice: ConnectorAdvice
  ) {
    super(context, zapp, advice);
  }

  public async prove(request: p.PodspecProofRequest): Promise<ProveResult> {
    console.log("prove", request);
    const prs = p.proofRequest(request);
    const pods = this.getContext()
      .getState()
      .pcds.getAllPCDsInFolder(ZAPP_POD_SPECIAL_FOLDER_NAME)
      .filter(isPODPCD)
      .map((pcd) => pcd.pod);

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

  public async verify(): Promise<boolean> {
    return true;
  }

  public async canProve(): Promise<boolean> {
    return true;
  }
}

export class ZupassRPCProcessor extends BaseZappServer implements ParcnetRPC {
  _version: "1" = "1" as const;
  //private readonly subscriptions: QuerySubscriptions;
  public readonly identity: ZupassIdentityRPC;
  public readonly pod: ZupassPODRPC;
  public readonly gpc: ZupassGPCRPC;

  public constructor(
    context: StateContextValue,
    zapp: PODPCD,
    advice: ConnectorAdvice
  ) {
    super(context, zapp, advice);
    // this.subscriptions = new QuerySubscriptions(this.pods);
    // this.subscriptions.onSubscriptionUpdated((update, serial) => {
    //   this.clientChannel.subscriptionUpdate(update, serial);
    // });
    this.pod = new ZupassPODRPC(
      this.getContext(),
      this.getZapp(),
      this.getAdvice()
    );
    this.identity = new ZupassIdentityRPC(
      this.getContext(),
      this.getZapp(),
      this.getAdvice()
    );
    this.gpc = new ZupassGPCRPC(
      this.getContext(),
      this.getZapp(),
      this.getAdvice()
    );
  }
}
