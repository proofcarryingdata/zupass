import { PipelineAtom } from "../../services/generic-issuance/types";

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
