import { PipelineLoadSummary } from "@pcd/passport-interface";
import { Mutex } from "async-mutex";
import fs from "fs";
import path from "path";
import { PipelineAtom } from "../database/queries/pipelineAtomDB";
import { logger } from "../util/logger";
import { makePLogInfo } from "./generic-issuance/pipelines/logging";
import { traced } from "./telemetryService";

const LOG_TAG = "LocalFileService";

export interface SerializedPipelineLoad<T extends PipelineAtom = PipelineAtom> {
  timestampSaved: number;
  pipelineId: string;
  summary: PipelineLoadSummary;
  atoms: T[];
}

export class LocalFileService {
  private readonly mutex = new Mutex();
  /**
   * Write-through cache to disk, to prevent excessive disk I/O.
   */
  private readonly fsCache: Record<string, string> = {};
  private readonly tempDirectory: string = path.join(process.cwd(), "temp");
  private readonly tempPipelineLoadCacheDirectory: string = path.join(
    this.tempDirectory,
    "pipeline-loads"
  );

  public constructor() {
    if (!fs.existsSync(this.tempDirectory)) {
      fs.mkdirSync(this.tempDirectory, { recursive: true });
    }
    if (!fs.existsSync(this.tempPipelineLoadCacheDirectory)) {
      fs.mkdirSync(this.tempPipelineLoadCacheDirectory, { recursive: true });
    }
  }

  private async writeFile(path: string, data: string): Promise<void> {
    this.fsCache[path] = data;
    return fs.promises.writeFile(path, data);
  }

  private async readFile(filePath: string): Promise<string | undefined> {
    if (this.fsCache[filePath] === undefined) {
      if (!fs.existsSync(filePath)) {
        return undefined;
      }
      this.fsCache[filePath] = await fs.promises.readFile(filePath, "utf8");
    }
    return this.fsCache[filePath];
  }

  private getPipelineLoadCachePath(pipelineId: string): string {
    return path.join(this.tempPipelineLoadCacheDirectory, `${pipelineId}.json`);
  }

  public async getCachedLoadSize(pipelineId: string): Promise<number> {
    return traced("LocalFileService", "getCachedLoadSize", async () => {
      return await this.mutex.runExclusive(async () => {
        const filePath = this.getPipelineLoadCachePath(pipelineId);
        try {
          const size = (await this.readFile(filePath))?.length ?? 0;
          return size;
        } catch (e) {
          logger(
            LOG_TAG,
            `error getting cached load size for ${pipelineId}`,
            e
          );
          return 0;
        }
      });
    });
  }

  public async hasCachedLoad(pipelineId: string): Promise<boolean> {
    return traced("LocalFileService", "hasCachedLoad", async () => {
      return await this.mutex.runExclusive(async () => {
        try {
          const hasFile =
            (await this.readFile(this.getPipelineLoadCachePath(pipelineId))) !==
            undefined;
          return hasFile;
        } catch (e) {
          logger(LOG_TAG, `error checking cached load for ${pipelineId}`, e);
          return false;
        }
      });
    });
  }

  public async getCachedLoad<T extends PipelineAtom = PipelineAtom>(
    pipelineId: string
  ): Promise<SerializedPipelineLoad<T> | undefined> {
    return traced("LocalFileService", "loadPipelineLoad", async () => {
      return await this.mutex.runExclusive(async () => {
        try {
          const filePath = this.getPipelineLoadCachePath(pipelineId);
          const serialized = await this.readFile(filePath);

          if (!serialized) {
            return undefined;
          }

          const parsed = JSON.parse(serialized) as SerializedPipelineLoad<T>;

          if (
            parsed?.summary?.latestLogs &&
            parsed.timestampSaved &&
            !parsed?.summary?.fromCache
          ) {
            parsed.summary.latestLogs.unshift(
              makePLogInfo(`this load state was loaded from disk`, {
                pipelineId
              }),
              makePLogInfo(
                `it was saved to disk at ${new Date(
                  parsed.timestampSaved
                ).toLocaleString("en-US", {
                  timeZone: "America/Los_Angeles"
                })} pacific time`,
                {
                  pipelineId
                }
              ),
              makePLogInfo(
                `which is ${new Date(parsed.timestampSaved).toLocaleString(
                  "en-US",
                  {
                    timeZone: "Asia/Bangkok"
                  }
                )} in Bangkok`,
                {
                  pipelineId
                }
              )
            );
          }

          if (parsed.summary) {
            parsed.summary.fromCache = true;
          }

          return parsed;
        } catch (e) {
          logger(LOG_TAG, `error parsing cached load for ${pipelineId}`, e);
          return undefined;
        }
      });
    });
  }

  public async saveCachedLoad<T extends PipelineAtom = PipelineAtom>(
    pipelineId: string,
    summary: PipelineLoadSummary,
    atoms: T[]
  ): Promise<void> {
    return traced("LocalFileService", "savePipelineLoad", async () => {
      return await this.mutex.runExclusive(async () => {
        try {
          const serialized = JSON.stringify({
            timestampSaved: Date.now(),
            pipelineId,
            summary,
            atoms
          } satisfies SerializedPipelineLoad<T>);

          const tempPath = this.getPipelineLoadCachePath(pipelineId);

          logger(
            LOG_TAG,
            `Saving pipeline ('${pipelineId}') load with ${atoms.length} atoms to local file: ${tempPath} with ${serialized.length} bytes`
          );

          await this.writeFile(tempPath, serialized);
        } catch (e) {
          logger(LOG_TAG, `error saving pipeline load for ${pipelineId}`, e);
        }
      });
    });
  }

  public async clearPipelineCache(pipelineId: string): Promise<void> {
    return traced("LocalFileService", "clearPipelineCache", async () => {
      return await this.mutex.runExclusive(async () => {
        try {
          const filePath = this.getPipelineLoadCachePath(pipelineId);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            delete this.fsCache[filePath];
          }
        } catch (e) {
          logger(LOG_TAG, `error clearing pipeline cache for ${pipelineId}`, e);
        }
      });
    });
  }
}

export function startLocalFileService(): LocalFileService | null {
  if (process.env.LOCAL_FILE_SERVICE_ENABLED !== "true") {
    return null;
  }

  return new LocalFileService();
}
