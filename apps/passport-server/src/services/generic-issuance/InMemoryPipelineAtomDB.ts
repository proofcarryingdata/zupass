import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../database/queries/pipelineAtomDB";

export interface InMemoryAtomsEntry {
  atomsById: { [atomId: string]: PipelineAtom };
}

export interface InMemoryAtoms {
  [pipelineId: string]: InMemoryAtomsEntry;
}

/**
 * An in-memory implementation of {@link IPipelineAtomDB}.
 *
 * @todo at some point it may be necessary to store these in a key-value
 *   or postgres.
 */
export class InMemoryPipelineAtomDB implements IPipelineAtomDB {
  private readonly loadedFlags: Record<string, boolean> = {};

  public data: InMemoryAtoms = {};

  public async markAsLoaded(pipelineId: string): Promise<void> {
    this.loadedFlags[pipelineId] = true;
  }

  public async hasLoaded(pipelineId: string): Promise<boolean> {
    return !!this.loadedFlags[pipelineId];
  }

  public async clear(pipelineID: string): Promise<void> {
    this.data[pipelineID] = {
      atomsById: {}
    };
  }

  public async save(pipelineID: string, atoms: PipelineAtom[]): Promise<void> {
    if (!this.data[pipelineID]) {
      this.data[pipelineID] = {
        atomsById: {}
      };
    }

    atoms.forEach((atom) => {
      const entry: InMemoryAtomsEntry = this.data[pipelineID];
      entry.atomsById[atom.id] = atom;
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
    return values.filter((v) => v.email?.toLowerCase() === email.toLowerCase());
  }
}
