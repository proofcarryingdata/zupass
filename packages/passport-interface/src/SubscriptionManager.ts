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

  public subscribe(url: string, info: Feed): void {
    const existingSubscription = this.getSubscription(url, info.id);

    if (existingSubscription) {
      throw new Error(
        `already subscribed on provider ${url} to feed ${info.id} `
      );
    }

    this.getOrAddProvider(url);

    this.activeSubscriptions.push({
      credential: undefined,
      feed: info,
      providerUrl: url,
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

  public hasProvider(url: string): boolean {
    return this.getProvider(url) !== undefined;
  }

  public getProvider(url: string): SubscriptionProvider | undefined {
    return this.providers.find((p) => p.url === url);
  }

  public getOrAddProvider(url: string): SubscriptionProvider {
    const existingProvider = this.getProvider(url);
    if (existingProvider) {
      return existingProvider;
    }
    return this.addProvider(url);
  }

  public addProvider(url: string) {
    if (this.hasProvider(url)) {
      throw new Error(`provider ${url} already exists`);
    }

    const newProvider: SubscriptionProvider = {
      url,
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
  url: string;
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
