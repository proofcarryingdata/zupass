import { Emitter } from "@pcd/emitter";
import { ArgsOf, PCDOf, PCDPackage, PCDTypeOf } from "@pcd/pcd-types";

export interface SerializedSubscriptionManager {
  subscriptions: SubscriptionProvider[];
  subscriptionInfos: SubscriptionInfo[];
  activeSubscriptions: ActiveSubscription[];
}

export class SubscriptionManager {
  public updatedEmitter: Emitter;
  private providers: SubscriptionProvider[];
  private subscriptionInfos: SubscriptionInfo[];
  private activeSubscriptions: ActiveSubscription[];

  public constructor(
    providers: SubscriptionProvider[],
    subscriptionInfos: SubscriptionInfo[],
    activeSubscriptions: ActiveSubscription[]
  ) {
    this.updatedEmitter = new Emitter();
    this.providers = providers;
    this.subscriptionInfos = subscriptionInfos;
    this.activeSubscriptions = activeSubscriptions;
  }

  public getProviders(): SubscriptionProvider[] {
    return this.providers;
  }

  public getSubscriptionInfos(): SubscriptionInfo[] {
    return this.subscriptionInfos;
  }

  public getActiveSubscriptions(): ActiveSubscription[] {
    return this.activeSubscriptions;
  }

  public serialize(): string {
    return JSON.stringify({
      subscriptions: this.providers,
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

export interface SubscriptionInfo<T extends PCDPackage = PCDPackage> {
  id: string;
  inputPCDType: PCDTypeOf<T>;
  partialArgs: ArgsOf<T>;
  description: string;
}

export interface ActiveSubscription<T extends PCDPackage = PCDPackage> {
  subscriptionProviderId: string;
  credential: PCDOf<T>;
}
