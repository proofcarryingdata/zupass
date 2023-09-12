import { Emitter } from "@pcd/emitter";
import { PCDAction, PCDCollection, PCDPermission } from "@pcd/pcd-collection";
import {
  ArgsOf,
  PCDOf,
  PCDPackage,
  PCDTypeNameOf,
  SerializedPCD
} from "@pcd/pcd-types";
import { IFeedApi } from "./FeedAPI";

export const enum PCDPassFeedIds {
  Devconnect = "1",
  Frogs = "2"
}

export async function applyActions(
  collection: PCDCollection,
  actions: SubscriptionActions[]
) {
  for (const actionSet of actions) {
    for (const action of actionSet.actions) {
      // tryExec already handles any exceptions that can come from executing
      // actions
      await collection.tryExec(action, actionSet.subscription.feed.permissions);
    }
  }
}

/**
 * Class responsible for storing the list of feed providers this application is
 * aware of, as well as the list of feeds that each provider can serve, and which
 * of those we are subscribed to.
 */
export class FeedSubscriptionManager {
  public updatedEmitter: Emitter;
  private api: IFeedApi;
  private providers: SubscriptionProvider[];
  private activeSubscriptions: Subscription[];

  public constructor(
    api: IFeedApi,
    providers?: SubscriptionProvider[],
    activeSubscriptions?: Subscription[]
  ) {
    this.updatedEmitter = new Emitter();
    this.api = api;
    this.providers = providers ?? [];
    this.activeSubscriptions = activeSubscriptions ?? [];
  }

  public async listFeeds(providerUrl: string): Promise<Feed[]> {
    return this.api.listFeeds(providerUrl).then((r) => r.feeds);
  }

  public async pollSubscriptions(): Promise<SubscriptionActions[]> {
    const responses: SubscriptionActions[] = [];

    for (const subscription of this.activeSubscriptions) {
      try {
        responses.push({
          actions: (
            await this.api.pollFeed(subscription.providerUrl, {
              feedId: subscription.feed.id,
              pcd: subscription.credential
            })
          ).actions,
          subscription
        });
      } catch (e) {
        console.log(`failed to poll subscription`, e);
      }
    }

    return responses;
  }

  public getSubscriptionsByProvider(): Map<string, Subscription[]> {
    const result: Map<string, Subscription[]> = new Map();
    const providers = this.getProviders();

    for (const provider of providers) {
      const array = result.get(provider.providerUrl) ?? [];
      result.set(provider.providerUrl, array);

      array.push(
        ...this.activeSubscriptions.filter(
          (s) => s.providerUrl === provider.providerUrl
        )
      );
    }

    return result;
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

  public getSubscriptionsForProvider(providerUrl: string): Subscription[] {
    return this.activeSubscriptions.filter(
      (s) => s.providerUrl === providerUrl
    );
  }

  public subscribe(
    providerUrl: string,
    info: Feed,
    credential?: SerializedPCD
  ): void {
    const existingSubscription = this.getSubscription(providerUrl, info.id);

    if (existingSubscription) {
      throw new Error(
        `already subscribed on provider ${providerUrl} to feed ${info.id} `
      );
    }

    this.getOrAddProvider(providerUrl);

    this.activeSubscriptions.push({
      credential,
      feed: info,
      providerUrl: providerUrl,
      subscribedTimestamp: Date.now()
    });

    this.updatedEmitter.emit();
  }

  public getSubscription(
    providerUrl: string,
    infoId: string
  ): Subscription | undefined {
    return this.activeSubscriptions.find(
      (s) => s.providerUrl === providerUrl && s.feed.id === infoId
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

  public getActiveSubscriptions(): Subscription[] {
    return this.activeSubscriptions;
  }

  public serialize(): string {
    return JSON.stringify({
      providers: this.providers,
      subscribedFeeds: this.activeSubscriptions
    } satisfies SerializedSubscriptionManager);
  }

  public static deserialize(
    api: IFeedApi,
    serialized: string
  ): FeedSubscriptionManager {
    const parsed = JSON.parse(serialized) as SerializedSubscriptionManager;
    return new FeedSubscriptionManager(
      api,
      parsed.providers ?? [],
      parsed.subscribedFeeds ?? []
    );
  }
}

export interface SubscriptionActions {
  actions: PCDAction[];
  subscription: Subscription;
}

export interface SerializedSubscriptionManager {
  providers: SubscriptionProvider[];
  subscribedFeeds: Subscription[];
}

export interface SubscriptionProvider {
  providerUrl: string;
  timestampAdded: number;
}

export interface Feed<T extends PCDPackage = PCDPackage> {
  id: string;
  name: string;
  description: string;
  inputPCDType?: PCDTypeNameOf<T>;
  partialArgs?: ArgsOf<T>;
  permissions: PCDPermission[];
}

export interface Subscription<T extends PCDPackage = PCDPackage> {
  providerUrl: string;
  feed: Feed;
  credential: SerializedPCD<PCDOf<T>> | undefined;
  subscribedTimestamp: number;
}
