import { Emitter } from "@pcd/emitter";
import { ArgsOf, PCDOf, PCDPackage, PCDTypeOf } from "@pcd/pcd-types";

export interface SerializedSubscriptionManager {
  subscriptions: SubscriptionProvider[];
  subscriptionInfos: PossibleSubscription[];
  activeSubscriptions: LiveSubscription[];
}

export class SubscriptionManager {
  public updatedEmitter: Emitter;
  private subscriptions: SubscriptionProvider[];
  private subscriptionInfos: PossibleSubscription[];
  private activeSubscriptions: LiveSubscription[];

  public constructor(
    subscriptions: SubscriptionProvider[],
    subscriptionInfos: PossibleSubscription[],
    activeSubscriptions: LiveSubscription[]
  ) {
    this.updatedEmitter = new Emitter();
    this.subscriptions = subscriptions;
    this.subscriptionInfos = subscriptionInfos;
    this.activeSubscriptions = activeSubscriptions;
  }

  public serialize(): string {
    return JSON.stringify({
      subscriptions: this.subscriptions,
      subscriptionInfos: this.subscriptionInfos,
      activeSubscriptions: this.activeSubscriptions
    } satisfies SerializedSubscriptionManager);
  }

  public static deserialize(serialized: string): SubscriptionManager {
    const parsed = JSON.parse(serialized) as SerializedSubscriptionManager;
    return new SubscriptionManager(
      parsed.subscriptions ?? [],
      parsed.subscriptionInfos ?? [],
      parsed.activeSubscriptions ?? []
    );
  }
}

export interface SubscriptionProvider {
  id: string;
  url: string;
}

export interface PossibleSubscription<T extends PCDPackage = PCDPackage> {
  id: string;
  inputPCDType: PCDTypeOf<T>;
  partialArgs: ArgsOf<T>;
  description: string;
}

export interface LiveSubscription<T extends PCDPackage = PCDPackage> {
  subscriptionProviderId: string;
  credential: PCDOf<T>;
}
