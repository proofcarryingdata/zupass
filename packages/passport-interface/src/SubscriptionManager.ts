import { Emitter } from "@pcd/emitter";
import { ArgsOf, PCDOf, PCDPackage, PCDTypeOf } from "@pcd/pcd-types";

export interface SerializedSubscriptionManager {
  providers: SubscriptionProvider[];
  subscribedFeeds: ActiveSubscription[];
}

export class SubscriptionManager {
  public updatedEmitter: Emitter;
  private providers: SubscriptionProvider[];
  private activeSubscriptions: ActiveSubscription[];

  public constructor(
    providers: SubscriptionProvider[],
    activeSubscriptions: ActiveSubscription[]
  ) {
    this.updatedEmitter = new Emitter();
    this.providers = providers;
    this.activeSubscriptions = activeSubscriptions;
  }

  public unsubscribe(providerUrl: string, feedId: string): void {
    const existingSubscription = this.getSubscription(providerUrl, feedId);

    if (!existingSubscription) {
      throw new Error(
        `never subscribed to provider ${providerUrl} feed id ${feedId}`
      );
    }

    this.activeSubscriptions = this.activeSubscriptions.filter(
      (s) => !(s.feed.id === feedId && s.providerUrl === providerUrl)
    );

    const remainingSubscriptionsOnProvider =
      this.getSubscriptionsForProvider(providerUrl);

    if (remainingSubscriptionsOnProvider.length === 0) {
      this.removeProvider(providerUrl);
    }

    this.updatedEmitter.emit();
  }

  public removeProvider(providerUrl: string): void {
    const subscriptions = this.getSubscriptionsForProvider(providerUrl);

    if (subscriptions.length > 0) {
      throw new Error(
        `can't remove provider ${providerUrl} - have ${subscriptions.length} existing subscriptions`
      );
    }

    this.providers = this.providers.filter(
      (p) => p.providerUrl !== providerUrl
    );
    this.updatedEmitter.emit();
  }

  public getSubscriptionsForProvider(
    providerUrl: string
  ): ActiveSubscription[] {
    return this.activeSubscriptions.filter(
      (s) => s.providerUrl === providerUrl
    );
  }

  public subscribe(providerUrl: string, info: Feed): void {
    const existingSubscription = this.getSubscription(providerUrl, info.id);

    if (existingSubscription) {
      throw new Error(
        `already subscribed on provider ${providerUrl} to feed ${info.id} `
      );
    }

    this.getOrAddProvider(providerUrl);

    this.activeSubscriptions.push({
      credential: undefined,
      feed: info,
      providerUrl: providerUrl,
      subscribedTimestamp: Date.now()
    });

    this.updatedEmitter.emit();
  }

  public getSubscription(
    url: string,
    infoId: string
  ): ActiveSubscription | undefined {
    return this.activeSubscriptions.find(
      (s) => s.providerUrl === url && s.feed.id === infoId
    );
  }

  public hasProvider(providerUrl: string): boolean {
    return this.getProvider(providerUrl) !== undefined;
  }

  public getProvider(providerUrl: string): SubscriptionProvider | undefined {
    return this.providers.find((p) => p.providerUrl === providerUrl);
  }

  public getOrAddProvider(providerUrl: string): SubscriptionProvider {
    const existingProvider = this.getProvider(providerUrl);
    if (existingProvider) {
      return existingProvider;
    }
    return this.addProvider(providerUrl);
  }

  public addProvider(providerUrl: string) {
    if (this.hasProvider(providerUrl)) {
      throw new Error(`provider ${providerUrl} already exists`);
    }

    const newProvider: SubscriptionProvider = {
      providerUrl: providerUrl,
      timestampAdded: Date.now()
    };

    this.providers.push(newProvider);
    this.updatedEmitter.emit();
    return newProvider;
  }

  public getProviders(): SubscriptionProvider[] {
    return this.providers;
  }

  public getActiveSubscriptions(): ActiveSubscription[] {
    return this.activeSubscriptions;
  }

  public serialize(): string {
    return JSON.stringify({
      providers: this.providers,
      subscribedFeeds: this.activeSubscriptions
    } satisfies SerializedSubscriptionManager);
  }

  public static deserialize(serialized: string): SubscriptionManager {
    const parsed = JSON.parse(serialized) as SerializedSubscriptionManager;
    return new SubscriptionManager(
      parsed.providers ?? [],
      parsed.subscribedFeeds ?? []
    );
  }
}

export interface SubscriptionProvider {
  providerUrl: string;
  timestampAdded: number;
}

export interface Feed<T extends PCDPackage = PCDPackage> {
  id: string;
  inputPCDType: PCDTypeOf<T>;
  partialArgs: ArgsOf<T>;
  description: string;
}

export interface ActiveSubscription<T extends PCDPackage = PCDPackage> {
  providerUrl: string;
  feed: Feed;
  credential: PCDOf<T> | undefined;
  subscribedTimestamp: number;
}
