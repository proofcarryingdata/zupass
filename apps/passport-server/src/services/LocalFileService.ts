import { PipelineLoadSummary } from "@pcd/passport-interface";
import fs from "fs";
import path from "path";
import { PipelineAtom } from "../database/queries/pipelineAtomDB";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

export interface SerializedPipelineLoad {
  pipelineId: string;
  summary: PipelineLoadSummary;
  atoms: PipelineAtom[];
}

export class LocalFileService {
  private readonly tempDirectory: string = path.join(process.cwd(), "temp");
  private readonly tempPipelineLoadDirectory: string = path.join(
    this.tempDirectory,
    "pipeline-loads"
  );

  public constructor() {}

  private getPipelineLoadPath(pipelineId: string): string {
    return path.join(this.tempPipelineLoadDirectory, `${pipelineId}.json`);
  }

  public async loadPipelineLoad(
    pipelineId: string
  ): Promise<SerializedPipelineLoad | undefined> {
    return traced("LocalFileService", "loadPipelineLoad", async () => {
      const filePath = this.getPipelineLoadPath(pipelineId);
      if (!fs.existsSync(filePath)) {
        return undefined;
      }
      const serialized = await fs.promises.readFile(filePath, "utf8");
      return JSON.parse(serialized) satisfies SerializedPipelineLoad;
    });
  }

  public async savePipelineLoad(
    pipelineId: string,
    summary: PipelineLoadSummary,
    atoms: PipelineAtom[]
  ): Promise<void> {
    return traced("LocalFileService", "savePipelineLoad", async () => {
      const serialized = JSON.stringify({
        pipelineId,
        summary,
        atoms
      } satisfies SerializedPipelineLoad);

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
  }
}

export function startLocalFileService(): LocalFileService {
  return new LocalFileService();
}
