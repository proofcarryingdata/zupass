import { Emitter } from "@pcd/emitter";
import {
  matchActionToPermission,
  PCDAction,
  PCDCollection,
  PCDPermission
} from "@pcd/pcd-collection";
import {
  ArgsOf,
  PCDOf,
  PCDPackage,
  PCDTypeNameOf,
  SerializedPCD
} from "@pcd/pcd-types";
import { isFulfilled } from "@pcd/util";
import { v4 as uuid } from "uuid";
import { IFeedApi } from "./FeedAPI";
import { ListFeedsResponseValue } from "./RequestTypes";

export const enum PCDPassFeedIds {
  Devconnect = "1",
  Frogs = "2",
  Email = "3",
  Zuzalu_1 = "4"
}

/**
 * Applies a set of actions to a PCD collection.
 */
export async function applyActions(
  collection: PCDCollection,
  actions: SubscriptionActions[]
): Promise<void> {
  for (const actionSet of actions) {
    for (const action of actionSet.actions) {
      // tryExec already handles any exceptions that can come from executing
      // actions, so we don't need to catch anything here.
      await collection.tryExec(action, actionSet.subscription.feed.permissions);
    }
  }
}

function ensureHasId(sub: Subscription): Subscription {
  if (!sub.id) {
    sub.id = uuid();
  }

  return sub;
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
  private errors: Map<string, SubscriptionError>;

  public constructor(
    api: IFeedApi,
    providers?: SubscriptionProvider[],
    activeSubscriptions?: Subscription[]
  ) {
    this.updatedEmitter = new Emitter();
    this.api = api;
    this.providers = providers ?? [];
    this.activeSubscriptions = (activeSubscriptions ?? []).map(ensureHasId);
    this.errors = new Map();
  }

  public async listFeeds(providerUrl: string): Promise<ListFeedsResponseValue> {
    return this.api.listFeeds(providerUrl).then((r) => {
      if (r.success) {
        return r.value;
      } else {
        throw new Error(r.error);
      }
    });
  }

  /**
   * This "refreshes" a feed. Existing feed errors are cleared, and new
   * ones may be detected.
   *
   * Returns an array of actions without trying to apply them. Attempted
   * application may lead to more errors.
   */
  public async pollSubscriptions(): Promise<SubscriptionActions[]> {
    const responsePromises: Promise<SubscriptionActions[]>[] = [];

    for (const subscription of this.activeSubscriptions) {
      responsePromises.push(this.fetchSingleSubscription(subscription));
    }

    const responses = (await Promise.allSettled(responsePromises))
      .filter(isFulfilled<Awaited<(typeof responsePromises)[number]>>)
      .flatMap((result) => result.value);

    this.updatedEmitter.emit();

    return responses;
  }

  /**
   * Poll a single subscription. Intended for use when resolving errors
   * with a feed that failed to load due to network/connection issues.
   */
  public async pollSingleSubscription(subscription: Subscription) {
    const actions = await this.fetchSingleSubscription(subscription);
    this.updatedEmitter.emit();
    return actions;
  }

  /**
   * Performs the network fetch of a subscription, and inspects the results
   * for validity. The error log for the subscription will be reset and
   * repopulated, so callers should check this in order to determine success.
   */
  private async fetchSingleSubscription(
    subscription: Subscription
  ): Promise<SubscriptionActions[]> {
    const responses: SubscriptionActions[] = [];
    this.resetError(subscription.id);
    try {
      const result = await this.api.pollFeed(subscription.providerUrl, {
        feedId: subscription.feed.id,
        pcd: subscription.credential
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const { actions } = result.value;

      this.validateActions(subscription, actions);

      responses.push({
        actions,
        subscription
      });
    } catch (e) {
      this.setError(subscription.id, {
        type: SubscriptionErrorType.FetchError
      });
    }

    return responses;
  }

  /**
   * Validates that the actions received in a feed are permitted by the user.
   */
  private validateActions(subscription: Subscription, actions: PCDAction[]) {
    const grantedPermissions = subscription.feed.permissions;
    const failedActions: PCDAction[] = [];
    for (const action of actions) {
      if (!matchActionToPermission(action, grantedPermissions)) {
        failedActions.push(action);
      }
    }
    if (failedActions.length > 0) {
      console.log(subscription);
      this.setError(subscription.id, {
        type: SubscriptionErrorType.PermissionError,
        actions: failedActions
      });
    }
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

  public unsubscribe(subscriptionId: string): void {
    const existingSubscription = this.getSubscription(subscriptionId);

    if (!existingSubscription) {
      throw new Error(`no subscription with id ${subscriptionId}`);
    }

    this.activeSubscriptions = this.activeSubscriptions.filter(
      (s) => s.id !== subscriptionId
    );

    this.errors.delete(existingSubscription.id);

    const remainingSubscriptionsOnProvider = this.getSubscriptionsForProvider(
      existingSubscription.providerUrl
    );

    if (remainingSubscriptionsOnProvider.length === 0) {
      this.removeProvider(existingSubscription.providerUrl);
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
  ): Subscription {
    if (!this.hasProvider(providerUrl)) {
      throw new Error(`provider ${providerUrl} does not exist`);
    }

    // This check will be wrong if we want to support multiple subscriptions
    // to the same feed with different credentials (e.g. multiple email
    // PCDs). For now the UI does not allow multiple subs to the same feed.
    const providerSubs = this.getSubscriptionsByProvider().get(providerUrl);
    const hasExistingSubscription =
      providerSubs && providerSubs.find((sub) => sub.feed.id === info.id);

    if (hasExistingSubscription) {
      throw new Error(
        `already subscribed on provider ${providerUrl} to feed ${info.id} `
      );
    }

    if (
      info.credentialType &&
      info.credentialType !== "email-pcd" &&
      info.credentialType !== "semaphore-signature-pcd"
    ) {
      throw new Error(
        `non-supported credential requested on ${providerUrl} feed ${info.id}`
      );
    }

    // Did the caller pass the wrong type of credential?
    if (info.credentialType && info.credentialType !== credential?.type) {
      throw new Error(
        credential?.type
          ? `wrong credential type "${credential.type}" (expected "${info.credentialType}") on ${providerUrl} feed ${info.id}`
          : `missing credential of type "${info.credentialType} on ${providerUrl} feed ${info.id}`
      );
    }

    const sub = {
      id: uuid(),
      credential,
      feed: info,
      providerUrl: providerUrl,
      subscribedTimestamp: Date.now()
    };

    this.activeSubscriptions.push(sub);

    this.updatedEmitter.emit();

    return sub;
  }

  public updateFeedPermissionsForSubscription(
    subscriptionId: string,
    permissions: PCDPermission[]
  ): void {
    const sub = this.getSubscription(subscriptionId);
    if (!sub) {
      throw new Error(`no subscription found matching ${subscriptionId}`);
    }

    sub.feed.permissions = permissions;

    this.updatedEmitter.emit();
  }

  public getSubscription(subscriptionId: string): Subscription | undefined {
    return this.activeSubscriptions.find((s) => s.id === subscriptionId);
  }

  public getSubscriptionsByProviderAndFeedId(
    providerUrl: string,
    feedId: string
  ): Subscription[] {
    return this.activeSubscriptions.filter(
      (s) => s.feed.id === feedId && s.providerUrl === providerUrl
    );
  }

  public hasProvider(providerUrl: string): boolean {
    return this.getProvider(providerUrl) !== undefined;
  }

  public getProvider(providerUrl: string): SubscriptionProvider | undefined {
    return this.providers.find((p) => p.providerUrl === providerUrl);
  }

  public getOrAddProvider(
    providerUrl: string,
    providerName: string
  ): SubscriptionProvider {
    const existingProvider = this.getProvider(providerUrl);
    if (existingProvider) {
      return existingProvider;
    }
    return this.addProvider(providerUrl, providerName);
  }

  public addProvider(providerUrl: string, providerName: string) {
    if (this.hasProvider(providerUrl)) {
      throw new Error(`provider ${providerUrl} already exists`);
    }

    const newProvider: SubscriptionProvider = {
      providerUrl,
      providerName,
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

  public setError(subscriptionId: string, error: SubscriptionError): void {
    console.log({ subscriptionId, error });
    this.errors.set(subscriptionId, error);
  }

  public resetError(subscriptionId: string): void {
    this.errors.delete(subscriptionId);
  }

  public getError(subscriptionId: string): SubscriptionError | null {
    return this.errors.get(subscriptionId) ?? null;
  }

  public getAllErrors(): Map<string, SubscriptionError> {
    return this.errors;
  }
}

export const enum SubscriptionErrorType {
  // The feed contained actions which the user has not permitted
  PermissionError = "permission-error",
  // The feed could not be fetched
  FetchError = "fetch-error"
}

export interface SubscriptionPermissionError {
  type: SubscriptionErrorType.PermissionError;
  actions: PCDAction[];
}

export interface SubscriptionFetchError {
  type: SubscriptionErrorType.FetchError;
}

export type SubscriptionError =
  | SubscriptionPermissionError
  | SubscriptionFetchError;

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
  providerName: string;
  timestampAdded: number;
}

export interface Feed<T extends PCDPackage = PCDPackage> {
  id: string;
  name: string;
  description: string;
  inputPCDType?: PCDTypeNameOf<T>;
  partialArgs?: ArgsOf<T>;
  permissions: PCDPermission[];
  credentialType?: "email-pcd" | "semaphore-signature-pcd";
}

export interface Subscription<T extends PCDPackage = PCDPackage> {
  // A UUID which identifies the subscription locally
  id: string;
  // The URL of the provider of the feed
  providerUrl: string;
  // The feed object as fetched when subscribing
  feed: Feed;
  // The credential selected for authentication to the feed
  credential: SerializedPCD<PCDOf<T>> | undefined;
  subscribedTimestamp: number;
}
