import { Emitter } from "@pcd/emitter";
import {
  ArgsOf,
  PCDOf,
  PCDPackage,
  PCDTypeOf,
  SerializedPCD
} from "@pcd/pcd-types";
import {
  FeedRequest,
  FeedResponse,
  FeedResponseAction,
  ListFeedsResponse
} from "./RequestTypes";

export interface SerializedSubscriptionManager {
  providers: SubscriptionProvider[];
  subscribedFeeds: Subscription[];
}

export interface ReturnedAction {
  actions: FeedResponseAction[];
  subscription: Subscription;
}

export class SubscriptionManager {
  public updatedEmitter: Emitter;
  private providers: SubscriptionProvider[];
  private activeSubscriptions: Subscription[];

  public constructor(
    providers?: SubscriptionProvider[],
    activeSubscriptions?: Subscription[]
  ) {
    this.updatedEmitter = new Emitter();
    this.providers = providers ?? [];
    this.activeSubscriptions = activeSubscriptions ?? [];
  }

  public async pollSubscriptions(): Promise<ReturnedAction[]> {
    const responses: ReturnedAction[] = [];

    for (const subscription of this.activeSubscriptions) {
      try {
        responses.push({
          actions: (await SubscriptionManager.pollSubscription(subscription))
            .actions,
          subscription
        });
      } catch (e) {
        console.log(`failed to poll subscription`, e);
      }
    }

    return responses;
  }

  public static async pollSubscription(
    subscription: Subscription
  ): Promise<FeedResponse> {
    const request: FeedRequest = {
      feedId: subscription.feed.id,
      pcd: subscription.credential
    };

    const result = await fetch(subscription.providerUrl, {
      method: "POST",
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
    const parsed = (await result.json()) as FeedResponse;
    return parsed;
  }

  public static async listFeeds(providerUrl: string): Promise<Feed[]> {
    const result = await fetch(providerUrl);
    const parsed = (await result.json()) as ListFeedsResponse;
    return parsed.feeds;
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
  name: string;
  description: string;
  inputPCDType?: PCDTypeOf<T>;
  partialArgs?: ArgsOf<T>;
  permissions: PCDPermissions;
}

export interface Subscription<T extends PCDPackage = PCDPackage> {
  providerUrl: string;
  feed: Feed;
  credential: SerializedPCD<PCDOf<T>> | undefined;
  subscribedTimestamp: number;
}

export enum PCDPermissionType {
  FolderReplace = "FolderReplace",
  FolderAppend = "FolderAppend"
}

export interface PCDFolderPermission {
  type: PCDPermissionType.FolderAppend | PCDPermissionType.FolderReplace;
  folder: string;
}

export type PCDPermissions = PCDPermission[];

export type PCDPermission = PCDFolderPermission;
