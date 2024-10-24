import {
  IPipelineAtomDB,
  PipelineAtom
} from "../../database/queries/pipelineAtomDB";

export interface InMemoryAtomsEntry {
  atomsById: { [atomId: string]: PipelineAtom };
  atomsByEmail: { [email: string]: PipelineAtom[] };
  allAtoms: PipelineAtom[];
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

  public async markAsLoaded(
    pipelineId: string,
    loaded?: boolean
  ): Promise<void> {
    this.loadedFlags[pipelineId] = loaded ?? true;
  }

  public async hasLoaded(pipelineId: string): Promise<boolean> {
    return !!this.loadedFlags[pipelineId];
  }

  public async clear(pipelineID: string): Promise<void> {
    this.markAsLoaded(pipelineID, false);
    this.data[pipelineID] = {
      atomsById: {},
      atomsByEmail: {},
      allAtoms: []
    };
  }

  public async save(pipelineID: string, atoms: PipelineAtom[]): Promise<void> {
    if (atoms.length > 0) {
      this.markAsLoaded(pipelineID);
    }

    const pipelineAtoms: InMemoryAtomsEntry = (this.data[pipelineID] = {
      atomsById: {},
      atomsByEmail: {},
      allAtoms: [...atoms]
    });

    atoms.forEach((atom) => {
      pipelineAtoms.atomsById[atom.id] = atom;

      if (atom.email) {
        const lowerCaseEmail = atom.email.toLowerCase();

        pipelineAtoms.atomsByEmail[lowerCaseEmail] =
          pipelineAtoms.atomsByEmail[lowerCaseEmail] ?? [];

        pipelineAtoms.atomsByEmail[lowerCaseEmail].push(atom);
      }
    });
  }

  public async load(pipelineID: string): Promise<PipelineAtom[]> {
    return [...(this.data[pipelineID]?.allAtoms ?? [])];
  }

  public async loadById(
    pipelineID: string,
    atomID: string
  ): Promise<PipelineAtom | undefined> {
    return this.data[pipelineID]?.atomsById?.[atomID];
  }

  public async loadByEmail(
    pipelineID: string,
    email: string
  ): Promise<PipelineAtom[]> {
    return this.data[pipelineID]?.atomsByEmail?.[email.toLowerCase()] ?? [];
  }
}
