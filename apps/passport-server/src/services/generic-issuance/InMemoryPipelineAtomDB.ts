import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../database/queries/pipelineAtomDB";

/**
 * An in-memory implementation of {@link IPipelineAtomDB} for testing purposes.
 */
export class InMemoryPipelineAtomDB implements IPipelineAtomDB {
  public data: {
    [pipelineId: string]: { [atomId: string]: PipelineAtom };
  } = {};

  public async clear(pipelineID: string): Promise<void> {
    this.data[pipelineID] = {};
  }

  public async save(pipelineID: string, atoms: PipelineAtom[]): Promise<void> {
    if (!this.data[pipelineID]) {
      this.data[pipelineID] = {};
    }
    atoms.forEach((atom) => {
      this.data[pipelineID][atom.id] = atom;
    });
  }

  public async load(pipelineID: string): Promise<PipelineAtom[]> {
    if (!this.data[pipelineID]) {
      return [];
    }

    return Object.values(this.data[pipelineID]);
  }

  public async loadById(
    pipelineID: string,
    atomID: string
  ): Promise<PipelineAtom | undefined> {
    const pipelineData = this.data[pipelineID];

    if (!pipelineData) {
      return undefined;
    }

    const values = Object.values(pipelineData);
    return values.find((v) => v.id === atomID);
  }

  public async loadByEmail(
    pipelineID: string,
    email: string
  ): Promise<PipelineAtom[]> {
    const pipelineData = this.data[pipelineID];
    if (!pipelineData) {
      return [];
    }
    const values = Object.values(pipelineData);
    return values.filter((v) => v.email === email);
  }
}
