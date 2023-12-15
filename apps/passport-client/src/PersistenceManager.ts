import {
  FeedSubscriptionManager,
  NetworkFeedApi,
  OfflineDevconnectTicket,
  OfflineTickets,
  User,
  createStorageBackedCredentialCache,
  defaultOfflineTickets
} from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { z } from "zod";
import { getPackages } from "./pcdPackages";
import { AppState } from "./state";

/**
 * Zod Schema for parsing the type PersistentSyncStatus type.
 *
 * This object holds the persistent status of the state-machine for E2EE
 * storage.  This should be kept up-to-date with the other storage-related
 * fields such as encryption key, PCDs, and subscription feeds.  This object is
 * intended to leave room for more fields to be added later, which can be
 * loaded/stored atomically.
 */
const PersistentSyncStatusSchema = z.object({
  /**
   * Represents the most recent revision returned by the server when
   * downloading or uploading E2EE storage.  Should change in local storage
   * after upload is complete, or once that download has been integrated and
   * saved into local storage.  Can be used to allow the server to detect
   * changes on future download, and conflicts on future upload.
   */
  serverStorageRevision: z.string().optional(),

  /**
   * The client-calculated hash of the most recent storage uploaded to or
   * downloaded from the server.  Should always correspond to the same contents
   * as serverStorage Revision.  Can be used by the client to know whether
   * its local state has changed since it was last in sync with the server.
   */
  serverStorageHash: z.string().optional()
});
type PersistentSyncStatus = z.infer<typeof PersistentSyncStatusSchema>;

export class PersistenceManager {
  public constructor() {
    //
  }

  public async saveState(state: AppState): Promise<void> {
    //
  }

  public async loadInitialState(): Promise<AppState> {
    let identity = this.loadIdentity();

    if (identity == null) {
      console.log("Generating a new Semaphore identity...");
      identity = new Identity();
      this.saveIdentity(identity);
    }

    const self = this.loadSelf();
    const pcds = await this.loadPCDs();
    const encryptionKey = this.loadEncryptionKey();
    const subscriptions = await this.loadSubscriptions();
    const offlineTickets = this.loadOfflineTickets();
    const checkedInOfflineDevconnectTickets =
      this.loadCheckedInOfflineDevconnectTickets();

    subscriptions.updatedEmitter.listen(() =>
      this.saveSubscriptions(subscriptions)
    );

    let modal = { modalType: "none" } as AppState["modal"];

    if (
      // If on Zupass legacy login, ask user to set password
      self != null &&
      encryptionKey == null &&
      self.salt == null
    ) {
      console.log("Asking existing user to set a password");
      modal = { modalType: "upgrade-account-modal" };
    }

    const credentialCache = createStorageBackedCredentialCache();

    const persistentSyncStatus = this.loadPersistentSyncStatus();

    return {
      self,
      encryptionKey,
      pcds,
      identity,
      modal,
      subscriptions,
      resolvingSubscriptionId: undefined,
      credentialCache,
      offlineTickets,
      checkedinOfflineDevconnectTickets: checkedInOfflineDevconnectTickets,
      offline: !window.navigator.onLine,
      serverStorageRevision: persistentSyncStatus.serverStorageRevision,
      serverStorageHash: persistentSyncStatus.serverStorageHash,
      importScreen: {}
    };
  }

  private readonly OLD_PCDS_KEY = "pcds"; // deprecated
  private readonly COLLECTION_KEY = "pcd_collection";
  private async savePCDs(pcds: PCDCollection): Promise<void> {
    const serialized = await pcds.serializeCollection();
    window.localStorage[this.COLLECTION_KEY] = serialized;
  }

  private async loadPCDs(): Promise<PCDCollection> {
    const oldPCDs = window.localStorage[this.OLD_PCDS_KEY];
    if (oldPCDs) {
      const collection = new PCDCollection(await getPackages());
      await collection.deserializeAllAndAdd(JSON.parse(oldPCDs ?? "[]"));
      await this.savePCDs(collection);
      window.localStorage.removeItem(this.OLD_PCDS_KEY);
    }

    const serializedCollection = window.localStorage[this.COLLECTION_KEY];
    return await PCDCollection.deserialize(
      await getPackages(),
      serializedCollection ?? "{}"
    );
  }

  private async saveSubscriptions(
    subscriptions: FeedSubscriptionManager
  ): Promise<void> {
    window.localStorage["subscriptions"] = subscriptions.serialize();
  }

  private async loadSubscriptions(): Promise<FeedSubscriptionManager> {
    return FeedSubscriptionManager.deserialize(
      new NetworkFeedApi(),
      window.localStorage["subscriptions"] ?? "{}"
    );
  }

  private readonly OFFLINE_TICKETS_KEY = "offline_tickets";
  private saveOfflineTickets(offlineTickets: OfflineTickets | undefined) {
    if (!offlineTickets) {
      window.localStorage.removeItem(this.OFFLINE_TICKETS_KEY);
    } else {
      window.localStorage.setItem(
        this.OFFLINE_TICKETS_KEY,
        JSON.stringify(offlineTickets)
      );
    }
  }
  private loadOfflineTickets(): OfflineTickets {
    let tickets = defaultOfflineTickets();

    try {
      tickets = JSON.parse(
        window.localStorage.getItem(this.OFFLINE_TICKETS_KEY) ??
          JSON.stringify(defaultOfflineTickets())
      );
    } catch (e) {
      //
    }

    return tickets;
  }

  private readonly CHECKED_IN_OFFLINE_TICKETS_KEY =
    "checked_in_offline_devconnect_tickets";
  private saveCheckedInOfflineTickets(
    offlineTickets: OfflineDevconnectTicket[]
  ) {
    if (!offlineTickets) {
      window.localStorage.removeItem(this.CHECKED_IN_OFFLINE_TICKETS_KEY);
    } else {
      window.localStorage.setItem(
        this.CHECKED_IN_OFFLINE_TICKETS_KEY,
        JSON.stringify(offlineTickets)
      );
    }
  }

  private loadCheckedInOfflineDevconnectTickets():
    | OfflineDevconnectTicket[]
    | undefined {
    let tickets = [];

    try {
      tickets = JSON.parse(
        window.localStorage.getItem(this.CHECKED_IN_OFFLINE_TICKETS_KEY) ?? "[]"
      );
    } catch (e) {
      //
    }

    return tickets;
  }

  private saveEncryptionKey(key: string): void {
    window.localStorage["encryption_key"] = key;
  }

  private loadEncryptionKey(): string | undefined {
    return window.localStorage["encryption_key"];
  }

  private loadSelf(): User | undefined {
    const self = window.localStorage["self"];
    if (self != null && self !== "") {
      return JSON.parse(self);
    }
  }

  private saveSelf(self: User): void {
    window.localStorage["self"] = JSON.stringify(self);
  }

  private loadIdentity(): Identity | null {
    const str = window.localStorage["identity"];
    return str ? new Identity(str) : null;
  }

  private saveIdentity(identity: Identity): void {
    window.localStorage["identity"] = identity.toString();
  }

  private loadPrivacyNoticeAgreed(): number | null {
    const stored = window.localStorage["privacy_notice_agreed"];
    return stored ? parseInt(stored) : null;
  }

  private savePrivacyNoticeAgreed(version: number): void {
    window.localStorage["privacy_notice_agreed"] = version.toString();
  }

  private savePersistentSyncStatus(status: PersistentSyncStatus): void {
    window.localStorage["sync_status"] = JSON.stringify(status);
  }

  private loadPersistentSyncStatus(): PersistentSyncStatus {
    const statusString = window.localStorage["sync_status"];
    if (!statusString) {
      return {};
    }
    try {
      return PersistentSyncStatusSchema.parse(JSON.parse(statusString));
    } catch (e) {
      console.error(
        "Can't parse stored PersistentSyncStatus.  Resetting to default.",
        e
      );
      return {};
    }
  }

  private saveUsingLaserScanner(usingLaserScanner: boolean) {
    window.localStorage["using_laser_scanner"] = usingLaserScanner.toString();
  }

  private loadUsingLaserScanner() {
    return window.localStorage["using_laser_scanner"] === "true";
  }

  private saveCheckinCredential(
    key: string,
    serializedPCD: SerializedPCD<SemaphoreSignaturePCD>
  ): void {
    window.localStorage[`checkin_credential_${key}`] =
      JSON.stringify(serializedPCD);
  }

  private loadCheckinCredential(
    key: string
  ): SerializedPCD<SemaphoreSignaturePCD> | undefined {
    try {
      const serializedPCD = JSON.parse(
        window.localStorage[`checkin_credential_${key}`]
      );
      if (serializedPCD) {
        return serializedPCD;
      }
    } catch (e) {
      // Do nothing
    }
    return undefined;
  }
}
