/**
 * A place for the {@link PipelineAtom}s to be persisted.
 *
 * TODO:
 * - sql migration instantiating a table for these.
 * - what other functions should we have here? in the case that a
 *   pipeline has a LOT of data, there should probably be some cursor-based
 *   api that streams atoms.
 * - Other than atoms, what else should the {@link IPipelineAtomDB} be able
 *   to store for feeds?
 */
export interface IPipelineAtomDB<T extends PipelineAtom = PipelineAtom> {
  markAsLoaded(pipelineId: string, loaded?: boolean): Promise<void>;
  hasLoaded(pipelineId: string): Promise<boolean>;
  save(pipelineID: string, atoms: T[]): Promise<void>;
  load(pipelineID: string): Promise<T[]>;
  clear(pipelineID: string): Promise<void>;
  loadById(pipelineID: string, atomID: string): Promise<T | undefined>;
  loadByEmail(pipelineID: string, email: string): Promise<T[]>;
}

/**
 * {@link Pipeline}s store the data they load from their data providers in our
 * database. The fundamental unit of storage is a {@link PipelineAtom}. Each new
 * type of {@link Pipeline} should define a subtype of this interface to further
 * specify the data that it stores.
 *
 * The rough database schema I was thinking would make most sense for atoms is something like
 * (
 *  pipelineID varchar,
 *  id varchar,
 *  data json,
 *  timeCreated Date,
 *  timeUpdated Date,
 *  email (derived from data->>email),
 *  constraint unique(piipelineId, id)
 * )
 */
export interface PipelineAtom {
  id: string; // unique per pipeline configuration
  email?: string; // not constrained to be unique
}
