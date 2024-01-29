/**
 * A place for the {@link PipelineAtom}s to be persisted.
 *
 * TODO:
 * - sql migration instantiating a table for these.
 * - what other functions should we have here? in the case that a
 *   pipeline has a LOT of data, there should probably be some cursor-based
 *   api that streams atoms.
 * - Other than atoms, what else should the {@link PipelineAtomDB} be able
 *   to store for feeds?
 */
export interface PipelineAtomDB {
  save(pipelineID: string, atoms: PipelineAtom[]): Promise<void>;
  load(pipelineID: string): Promise<PipelineAtom[]>;
}

/**
 * {@link Pipeline}s store the data they load from their data providers in our
 * database. The fundamental unit of storage is a {@link PipelineAtom}. Each new
 * type of {@link Pipeline} should define a subtype of this interface to further
 * specify the data that it stores.
 *
 * TODO:
 * - what metadata should be stored per atom? pipeline name? timetamps?
 */
export interface PipelineAtom {
  id: string; // unique per pipeline configuration
  email?: string; // not constrained to be unique but generally useful
}
