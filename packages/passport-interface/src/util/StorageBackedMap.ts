/**
 * A JavaScript map which syncs its entries to local storage, and loads them
 * during construction.
 */
export class StorageBackedMap<K, V> extends Map<K, V> {
  /**
   *  The local storage key
   */
  private readonly storageKey: string;
  /**
   *  Whether we're currently syncing to local storage
   */
  private syncing: boolean;

  public constructor(storageKey: string) {
    // Initializes the base map
    super();
    this.storageKey = storageKey;
    this.syncing = false;

    // Load data into the map
    this.reloadFromStorage();

    // Set up an event listener so that we get changes to local storage from
    // other tabs
    window.addEventListener("storage", (ev) => {
      // key === null means that storage was cleared
      // Probably this means that the user was logged out, so let's make sure
      // we don't keep any credentials in memory
      if (ev.key === null) {
        super.clear();
      } else if (ev.key === this.storageKey) {
        this.reloadFromStorage();
      }
    });
  }

  /**
   * Queues a microtask to sync to local storage once the current event loop
   *  has finished processing
   */
  private queueSync() {
    if (!this.syncing) {
      this.syncing = true;
      queueMicrotask(() => this.syncToStorage());
    }
  }

  /**
   * Sync the map entries to local storage
   */
  private syncToStorage(): void {
    const data = JSON.stringify(Array.from(this.entries()));
    if (window.localStorage.getItem(this.storageKey) !== data) {
      window.localStorage.setItem(this.storageKey, data);
    }
    this.syncing = false;
  }

  /**
   * Reloads data from storage, called in response to storage changes that
   * come from other tabs.
   */
  private reloadFromStorage() {
    const storageData = window.localStorage.getItem(this.storageKey);
    let loadedData = [];
    if (storageData) {
      try {
        const parsed = JSON.parse(storageData);
        if (parsed instanceof Array) {
          loadedData = parsed;
        }
      } catch (e) {
        // Local storage had invalid JSON, so proceed without having changed
        // `loadedData`
      }
    }

    super.clear();
    loadedData.forEach((entry: [K, V]) => {
      super.set(entry[0], entry[1]);
    });
  }

  /**
   * Wraps Map.set(), and queues a sync after the change
   */
  public set(key: K, value: V) {
    super.set(key, value);
    this.queueSync();
    return this;
  }

  /**
   * Wraps Map.delete(), and queues a sync after the change
   */
  public delete(key: K) {
    if (super.delete(key)) {
      this.queueSync();
      return true;
    }

    return false;
  }

  /**
   * Wraps Map.clear(), and queues a sync after the change
   */
  public clear() {
    super.clear();
    this.queueSync();
  }

  /**
   * Wraps Map.forEach(), and queues a sync.
   * This is necessary because callbackfn can mutate map entries.
   */
  public forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: any
  ): void {
    super.forEach(callbackfn, thisArg);
    this.queueSync();
  }
}
