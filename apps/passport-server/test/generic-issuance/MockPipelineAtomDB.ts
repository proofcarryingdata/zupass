import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../src/database/queries/pipelineAtomDB";

/**
 * A mock implementation of {@link IPipelineAtomDB} for testing purposes.
 */
export class MockPipelineAtomDB implements IPipelineAtomDB {
  public data: {
    [pipelineId: string]: { [atomId: string]: PipelineAtom };
  } = {};

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
    const values = Object.values(pipelineData);
    return values.find((v) => v.id === atomID);
  }

  public async loadByEmail(
    pipelineID: string,
    email: string
  ): Promise<PipelineAtom[]> {
    const pipelineData = this.data[pipelineID];
    const values = Object.values(pipelineData);
    return values.filter((v) => v.email === email);
  }
}
