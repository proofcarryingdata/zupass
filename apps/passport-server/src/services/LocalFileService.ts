import { PipelineLoadSummary } from "@pcd/passport-interface";
import { Mutex } from "async-mutex";
import fs from "fs";
import path from "path";
import { PipelineAtom } from "../database/queries/pipelineAtomDB";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

export interface SerializedPipelineLoad<T extends PipelineAtom> {
  pipelineId: string;
  summary: PipelineLoadSummary;
  atoms: T[];
}

export class LocalFileService {
  private readonly mutex = new Mutex();
  private readonly tempDirectory: string = path.join(process.cwd(), "temp");
  private readonly tempPipelineLoadDirectory: string = path.join(
    this.tempDirectory,
    "pipeline-loads"
  );

  public constructor() {
    if (!fs.existsSync(this.tempDirectory)) {
      fs.mkdirSync(this.tempDirectory, { recursive: true });
    }
    if (!fs.existsSync(this.tempPipelineLoadDirectory)) {
      fs.mkdirSync(this.tempPipelineLoadDirectory, { recursive: true });
    }
  }

  private getPipelineLoadPath(pipelineId: string): string {
    return path.join(this.tempPipelineLoadDirectory, `${pipelineId}.json`);
  }

  public async loadPipelineLoad<T extends PipelineAtom>(
    pipelineId: string
  ): Promise<SerializedPipelineLoad<T> | undefined> {
    return traced("LocalFileService", "loadPipelineLoad", async () => {
      return await this.mutex.runExclusive(async () => {
        const filePath = this.getPipelineLoadPath(pipelineId);
        if (!fs.existsSync(filePath)) {
          return undefined;
        }
        const serialized = await fs.promises.readFile(filePath, "utf8");
        return JSON.parse(serialized) satisfies SerializedPipelineLoad<T>;
      });
    });
  }

  public async savePipelineLoad<T extends PipelineAtom>(
    pipelineId: string,
    summary: PipelineLoadSummary,
    atoms: T[]
  ): Promise<void> {
    return traced("LocalFileService", "savePipelineLoad", async () => {
      return await this.mutex.runExclusive(async () => {
        const serialized = JSON.stringify({
          pipelineId,
          summary,
          atoms
        } satisfies SerializedPipelineLoad<T>);

        const tempPath = this.getPipelineLoadPath(pipelineId);

        logger(
          `Saving pipeline ('${pipelineId}') load with ${atoms.length} atoms to local file: ${tempPath} with ${serialized.length} bytes`
        );

        await fs.promises.writeFile(tempPath, JSON.stringify(serialized));
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
