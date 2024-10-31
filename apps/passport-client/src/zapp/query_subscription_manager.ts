import * as p from "@parcnet-js/podspec";
import {
  EntriesSchema,
  PODData,
  PODSchema,
  PodSpec
} from "@parcnet-js/podspec";
import type { POD } from "@pcd/pod";
import { createNanoEvents } from "nanoevents";
import { StateContextValue } from "../dispatch";
import { getPODsForCollections } from "./collections";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Subscription<E extends EntriesSchema = any> {
  query: PodSpec<E>;
  serial: number;
  lastInputSignatures: string[];
  lastOutputSignatures: string[];
  id: string;
}

export class QuerySubscriptionManager {
  private readonly subscriptionsByCollectionId: Map<string, Subscription[]> =
    new Map();
  private readonly emitter = createNanoEvents<{
    subscriptionUpdated: (
      subscriptionId: string,
      update: PODData[],
      serial: number
    ) => void;
  }>();

  private nextSubscriptionId = 0;

  public constructor(private readonly context: StateContextValue) {}

  public onSubscriptionUpdated(
    callback: (
      subscriptionId: string,
      update: PODData[],
      serial: number
    ) => void
  ): void {
    this.emitter.on("subscriptionUpdated", callback);
  }

  public addSubscription<E extends EntriesSchema>(
    collectionId: string,
    query: PODSchema<E>
  ): string {
    const serial = 0;
    const id = (this.nextSubscriptionId++).toString();
    this.subscriptionsByCollectionId.set(collectionId, [
      ...(this.subscriptionsByCollectionId.get(collectionId) ?? []),
      {
        query: p.pod(query),
        serial,
        lastInputSignatures: [],
        lastOutputSignatures: [],
        id
      }
    ]);
    return id;
  }

  public removeSubscription(subscriptionId: string): void {
    for (const [
      collectionId,
      subscriptions
    ] of this.subscriptionsByCollectionId.entries()) {
      const index = subscriptions.findIndex((sub) => sub.id === subscriptionId);
      if (index === -1) {
        continue;
      }
      if (subscriptions.length === 1) {
        this.subscriptionsByCollectionId.delete(collectionId);
      } else {
        subscriptions.splice(index, 1);
      }
    }
  }

  public update(): void {
    for (const [
      collectionId,
      subscriptions
    ] of this.subscriptionsByCollectionId.entries()) {
      const pods = getPODsForCollections(this.context.getState().pcds, [
        collectionId
      ]);
      const newSignatures = pods.map((pod) => pod.signature);

      for (const subscription of subscriptions) {
        const { lastInputSignatures, lastOutputSignatures } = subscription;
        subscription.lastInputSignatures = newSignatures;

        if (
          newSignatures.every((signature) =>
            lastInputSignatures.includes(signature)
          ) &&
          lastInputSignatures.every((signature) =>
            newSignatures.includes(signature)
          )
        ) {
          continue;
        }

        // Input data has changed, so we need to re-run the query.
        const queryResult = subscription.query.query(pods);
        const newOutputSignatures = queryResult.matches.map(
          (pod) => pod.signature
        );
        if (
          newOutputSignatures.every((signature) =>
            lastOutputSignatures.includes(signature)
          ) &&
          lastOutputSignatures.every((signature) =>
            newOutputSignatures.includes(signature)
          )
        ) {
          continue;
        }
        subscription.serial++;
        subscription.lastOutputSignatures = newOutputSignatures;

        // Output data has changed, so we need to trigger an event.
        this.emitter.emit(
          "subscriptionUpdated",
          subscription.id,
          queryResult.matches.map((pod) => p.podToPODData(pod as POD)),
          subscription.serial
        );
      }
    }
  }
}
