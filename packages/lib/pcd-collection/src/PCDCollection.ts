import { Emitter } from "@pcd/emitter";
import { getHash } from "@pcd/passport-crypto";
import { PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import stringify from "fast-json-stable-stringify";
import _ from "lodash";
import {
  AppendToFolderAction,
  DeleteFolderAction,
  PCDAction,
  ReplaceInFolderAction,
  isAppendToFolderAction,
  isDeleteFolderAction,
  isReplaceInFolderAction
} from "./actions";
import {
  AppendToFolderPermission,
  DeleteFolderPermission,
  PCDPermission,
  ReplaceInFolderPermission,
  isAppendToFolderPermission,
  isDeleteFolderPermission,
  isReplaceInFolderPermission
} from "./permissions";
import { getFoldersInFolder, isFolderAncestor, isRootFolder } from "./util";

export type MatchingActionPermission =
  | { permission: ReplaceInFolderPermission; action: ReplaceInFolderAction }
  | { permission: AppendToFolderPermission; action: AppendToFolderAction }
  | { permission: DeleteFolderPermission; action: DeleteFolderAction };

type AddPCDOptions = { upsert?: boolean };

export type MergeFilterPredicate = (pcd: PCD, target: PCDCollection) => boolean;

/**
 * Function type for use in deserialization.  This is a fallback option used
 * when no PCD package is available, or when the named package fails to
 * deserialize.  It could wrap the PCD in a different type, or perform some
 * more expensive parsing.
 *
 * If the fallback function fails (throws) it will cause the deserialization
 * to fail, in the same way (with the same error) as if there were no
 * fallback at all.
 *
 * @param collection the PCDCollection performing the deserialization
 * @param pcdPackage the package for the type of the serialized PCD, if any
 * @param serializedPCD the serialized PCD to deserialize
 * @param deserializeError the error thrown by the deserialize attempt
 * @return a PCD representing or wrapping the serialized PCD
 * @throws if no fallback deserialization is possible
 */
export type FallbackDeserializeFunction = (
  collection: PCDCollection,
  pcdPackage: PCDPackage | undefined,
  serializedPCD: SerializedPCD,
  deserializeError: unknown
) => Promise<PCD>;

export function matchActionToPermission(
  action: PCDAction,
  permissions: PCDPermission[]
): MatchingActionPermission | null {
  for (const permission of permissions) {
    if (
      isAppendToFolderAction(action) &&
      isAppendToFolderPermission(permission) &&
      (action.folder === permission.folder ||
        isFolderAncestor(action.folder, permission.folder))
    ) {
      return { action, permission };
    }

    if (
      isReplaceInFolderAction(action) &&
      isReplaceInFolderPermission(permission) &&
      (action.folder === permission.folder ||
        isFolderAncestor(action.folder, permission.folder))
    ) {
      return { action, permission };
    }

    if (
      isDeleteFolderAction(action) &&
      isDeleteFolderPermission(permission) &&
      (action.folder === permission.folder ||
        isFolderAncestor(action.folder, permission.folder))
    ) {
      return { action, permission };
    }
  }

  return null;
}

/**
 * This class represents all the PCDs a user may have, and also
 * contains references to all the relevant {@link PCDPackage}s,
 * which allows this class to effectively make use of all of the
 * PCDs.
 */
export class PCDCollection {
  /**
   * Emits an event whenever the contents of this {@link PCDCollection} changes.
   * Does not attempt to filter out changes which result in the same contents.
   */
  public readonly changeEmitter: Emitter;

  private packages: PCDPackage[];
  private pcds: PCD<unknown, unknown>[];
  public folders: Record<string, string>; // pcd id -> folder

  public constructor(
    packages: PCDPackage[],
    pcds?: PCD[],
    folders?: Record<string, string>
  ) {
    this.packages = packages;
    this.pcds = pcds ?? [];
    this.folders = folders ?? {};
    this.changeEmitter = new Emitter();
  }

  public getFoldersInFolder(folderPath: string): string[] {
    return getFoldersInFolder(folderPath, Object.values(this.folders));
  }

  public isValidFolder(folderPath: string): boolean {
    return Object.values(this.folders).includes(folderPath);
  }

  public setPCDFolder(pcdId: string, folder: string): void {
    if (!this.hasPCDWithId(pcdId)) {
      throw new Error(`can't set folder of pcd ${pcdId} - pcd doesn't exist`);
    }

    this.folders[pcdId] = folder;
    this.emitChange();
  }

  public async tryExec(
    action: PCDAction,
    permissions: PCDPermission[]
  ): Promise<boolean> {
    const match = matchActionToPermission(action, permissions);

    if (!match) {
      return false;
    }

    try {
      const result = await this.tryExecutingActionWithPermission(
        match.action,
        match.permission
      );

      if (result) {
        return true;
      }
    } catch (e) {
      // An exception here should be rare: trying to add the same PCD twice
      // or to multiple folders. Regular permission failures are not
      // exceptions.
      console.log(e);
      return false;
    }
    return false;
  }

  public async tryExecutingActionWithPermission(
    action: PCDAction,
    permission: PCDPermission
  ): Promise<boolean> {
    if (
      isAppendToFolderAction(action) &&
      isAppendToFolderPermission(permission)
    ) {
      if (
        action.folder !== permission.folder &&
        !isFolderAncestor(action.folder, permission.folder)
      ) {
        return false;
      }
      const pcds = await this.deserializeAll(action.pcds);

      for (const pcd of pcds) {
        if (this.hasPCDWithId(pcd.id)) {
          throw new Error(`pcd with ${pcd.id} already exists`);
        }
      }

      this.addAll(pcds);
      this.bulkSetFolder(
        pcds.map((pcd) => pcd.id),
        action.folder
      );
      return true;
    }

    if (
      isReplaceInFolderAction(action) &&
      isReplaceInFolderPermission(permission)
    ) {
      if (
        action.folder !== permission.folder &&
        !isFolderAncestor(action.folder, permission.folder)
      ) {
        return false;
      }

      const pcds = await this.deserializeAll(action.pcds);

      for (const pcd of pcds) {
        if (
          this.hasPCDWithId(pcd.id) &&
          this.getFolderOfPCD(pcd.id) !== action.folder
        ) {
          throw new Error(
            `pcd with ${pcd.id} already exists outside the allowed folder`
          );
        }
      }

      this.addAll(pcds, { upsert: true });
      this.bulkSetFolder(
        pcds.map((pcd) => pcd.id),
        action.folder
      );

      return true;
    }

    if (isDeleteFolderAction(action) && isDeleteFolderPermission(permission)) {
      if (
        action.folder !== permission.folder &&
        !isFolderAncestor(action.folder, permission.folder)
      ) {
        return false;
      }

      this.deleteFolder(action.folder, action.recursive);

      return true;
    }

    return false;
  }

  public getSize(): number {
    return this.pcds.length;
  }

  public getAllFolderNames(): string[] {
    const result = new Set<string>();
    Object.entries(this.folders).forEach(([_pcdId, folder]) =>
      result.add(folder)
    );
    return Array.from(result);
  }

  public bulkSetFolder(pcdIds: string[], folder: string): void {
    pcdIds.forEach((pcdId) => {
      if (!this.hasPCDWithId(pcdId)) {
        throw new Error(`can't set folder of pcd ${pcdId} - pcd doesn't exist`);
      }
    });

    pcdIds.forEach((pcdId) => {
      this.folders[pcdId] = folder;
    });

    this.emitChange();
  }

  public setFolder(pcdId: string, folder: string): void {
    this.bulkSetFolder([pcdId], folder);
  }

  public getFolderOfPCD(pcdId: string): string | undefined {
    if (!this.hasPCDWithId(pcdId)) {
      return undefined;
    }

    return Object.entries(this.folders).find(
      ([id, _folder]) => pcdId === id
    )?.[1];
  }

  public getAllPCDsInFolder(folder: string): PCD[] {
    if (isRootFolder(folder)) {
      const pcdIdsInFolders = new Set([...Object.keys(this.folders)]);
      const pcdsNotInFolders = this.pcds.filter(
        (pcd) => !pcdIdsInFolders.has(pcd.id)
      );
      return pcdsNotInFolders;
    }

    const pcdIds = Object.entries(this.folders)
      .filter(([_pcdId, f]) => f === folder)
      .map(([pcdId, _f]) => pcdId);

    return this.getByIds(pcdIds);
  }

  public removeAllPCDsInFolder(folder: string): void {
    const inFolder = this.getAllPCDsInFolder(folder);
    inFolder.forEach((pcd) => this.remove(pcd.id));
  }

  public replacePCDsInFolder(folder: string, pcds: PCD[]): void {
    this.removeAllPCDsInFolder(folder);
    this.addAll(pcds, { upsert: true });
    pcds.forEach((pcd) => this.setPCDFolder(pcd.id, folder));
  }

  /**
   * Removes all PCDs within a given folder, and optionally within all
   * subfolders.
   */
  private deleteFolder(folder: string, recursive: boolean): void {
    const folders = [folder];

    if (recursive) {
      const subFolders = Object.values(this.folders).filter((folderPath) => {
        return isFolderAncestor(folderPath, folder);
      });
      folders.push(..._.uniq(subFolders));
    }

    for (const folderPath of folders) {
      this.removeAllPCDsInFolder(folderPath);
    }
  }

  public getPackage<T extends PCDPackage = PCDPackage>(
    name: string
  ): T | undefined {
    const matching = this.packages.find((p) => p.name === name);
    return matching as T | undefined;
  }

  public hasPackage(name: string): boolean {
    return this.packages.find((p) => p.name === name) !== undefined;
  }

  public async serialize(pcd: PCD): Promise<SerializedPCD> {
    const pcdPackage = this.getPackage(pcd.type);
    if (!pcdPackage) throw new Error(`no package matching ${pcd.type}`);
    const serialized = await pcdPackage.serialize(pcd);
    return serialized;
  }

  public async serializeAll(): Promise<SerializedPCD[]> {
    return Promise.all(this.pcds.map(this.serialize.bind(this)));
  }

  public async serializeCollection(): Promise<string> {
    return stringify({
      pcds: await Promise.all(this.pcds.map(this.serialize.bind(this))),
      folders: this.folders
    } satisfies SerializedPCDCollection);
  }

  public async deserialize(
    serialized: SerializedPCD,
    options?: { fallbackDeserializeFunction?: FallbackDeserializeFunction }
  ): Promise<PCD> {
    const pcdPackage = this.getPackage(serialized.type);
    try {
      if (!pcdPackage)
        throw new Error(`no package matching ${serialized.type}`);
      const deserialized = await pcdPackage.deserialize(serialized.pcd);
      return deserialized;
    } catch (firstError: unknown) {
      if (options?.fallbackDeserializeFunction) {
        try {
          return await options.fallbackDeserializeFunction(
            this,
            pcdPackage,
            serialized,
            firstError
          );
        } catch (fallbackError) {
          // Fallback also failed, so fallthrough to re-throw the original error
        }
      }
      throw firstError;
    }
  }

  public async deserializeAll(
    serialized: SerializedPCD[],
    options?: { fallbackDeserializeFunction?: FallbackDeserializeFunction }
  ): Promise<PCD[]> {
    return Promise.all(
      serialized.map(async (serialized: SerializedPCD) =>
        this.deserialize(serialized, options)
      )
    );
  }

  public async deserializeAllAndAdd(
    serialized: SerializedPCD[],
    options?: {
      upsert?: boolean;
      fallbackDeserializeFunction?: FallbackDeserializeFunction;
    }
  ): Promise<void> {
    const deserialized = await this.deserializeAll(serialized, options);
    this.addAll(deserialized, options);
  }

  public async remove(pcdId: string): Promise<void> {
    this.pcds = this.pcds.filter((pcd) => pcd.id !== pcdId);
    this.folders = Object.fromEntries(
      Object.entries(this.folders).filter(([id]) => id !== pcdId)
    );
    this.emitChange();
  }

  public async deserializeAndAdd(
    serialized: SerializedPCD,
    options?: {
      upsert?: boolean;
      fallbackDeserializeFunction?: FallbackDeserializeFunction;
    }
  ): Promise<void> {
    await this.deserializeAllAndAdd([serialized], options);
  }

  public add(pcd: PCD, options?: AddPCDOptions): void {
    this.addAll([pcd], options);
  }

  public addAll(pcds: PCD[], options?: AddPCDOptions): void {
    const currentMap = new Map(this.pcds.map((pcd) => [pcd.id, pcd]));
    const toAddMap = new Map(pcds.map((pcd) => [pcd.id, pcd]));

    for (const [id, pcd] of Array.from(toAddMap.entries())) {
      if (currentMap.has(id) && !options?.upsert) {
        throw new Error(`pcd with id ${id} is already in this collection`);
      }

      currentMap.set(id, pcd);
    }

    this.pcds = Array.from(currentMap.values());

    this.emitChange();
  }

  public size(): number {
    return this.pcds.length;
  }

  public getAll(): PCD[] {
    return this.pcds;
  }

  public getAllIds(): string[] {
    return this.getAll().map((pcd) => pcd.id);
  }

  public getByIds(ids: string[]): PCD[] {
    return this.pcds.filter(
      (pcd) => ids.find((id) => pcd.id === id) !== undefined
    );
  }

  /**
   * Generates a unique hash based on the contents. This hash changes whenever
   * the set of pcds, or the contents of the pcds changes.
   */
  public async getHash(): Promise<string> {
    const allSerialized = await this.serializeCollection();
    const hashed = await getHash(allSerialized);
    return hashed;
  }

  public getById(id: string): PCD | undefined {
    return this.pcds.find((pcd) => pcd.id === id);
  }

  public hasPCDWithId(id: string): boolean {
    return this.getById(id) !== undefined;
  }

  public getPCDsByType(type: string): PCD[] {
    return this.pcds.filter((pcd) => pcd.type === type);
  }

  private emitChange(): void {
    // Emit the change asynchronously, so we don't need to delay until
    // listeners are complete.
    setTimeout(() => this.changeEmitter.emit(), 0);
  }

  public static async deserialize(
    packages: PCDPackage[],
    serialized: string,
    options?: { fallbackDeserializeFunction?: FallbackDeserializeFunction }
  ): Promise<PCDCollection> {
    const parsed = JSON.parse(serialized) as Partial<SerializedPCDCollection>;
    const collection = new PCDCollection(packages, []);

    const serializedPcdsList = parsed.pcds ?? [];
    const parsedFolders = parsed.folders ?? {};

    const pcds: PCD[] = await Promise.all(
      serializedPcdsList.map(async (serialized: SerializedPCD) =>
        collection.deserialize(serialized, options)
      )
    );
    collection.addAll(pcds, { upsert: true });
    collection.folders = parsedFolders;

    return collection;
  }

  /**
   * Merges another PCD collection into this one.
   * There is one option:
   * - `shouldInclude` is a function used to filter out PCDs from the other
   *   collection during merging, e.g. to filter out duplicates or PCDs of
   *   a type that should not be copied.
   */
  public merge(
    other: PCDCollection,
    options?: {
      shouldInclude?: MergeFilterPredicate;
    }
  ): void {
    let pcds = other.getAll();

    // If the caller has specified a filter function, run that first to filter
    // out unwanted PCDs from the merge.
    if (options?.shouldInclude) {
      pcds = pcds.filter((pcd: PCD) => options.shouldInclude?.(pcd, this));
    }

    this.addAll(pcds, { upsert: true });

    for (const pcd of pcds) {
      if (other.folders[pcd.id]) {
        this.setFolder(pcd.id, other.folders[pcd.id]);
      }
    }
  }
}

/**
 * {@link PCDCollection#serializeCollection} returns a stringified instance
 * of this interface, and {@link PCDCollection.deserialize} takes a stringified
 * instance of this object and returns a new {@link PCDCollection}.
 */
export interface SerializedPCDCollection {
  pcds: SerializedPCD[];
  folders: Record<string, string>;
}
