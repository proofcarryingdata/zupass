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

  public constructor() {}

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

        logger(
          `Saving pipeline ('${pipelineId}') load with ${
            atoms.length
          } atoms to local file: ${JSON.stringify(serialized)} with ${
            serialized.length
          } bytes`
        );

        await fs.promises.writeFile(
          this.getPipelineLoadPath(pipelineId),
          JSON.stringify(serialized)
        );
      });
    });
  }
}

export function startLocalFileService(): LocalFileService {
  return new LocalFileService();
}
