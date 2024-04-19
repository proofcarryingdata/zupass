import {
  HydratedPipelineHistoryEntry,
  PipelineDefinition
} from "@pcd/passport-interface";
import { createContext, useContext, useMemo } from "react";

export interface GIError {
  name: string;
  description: string;
}

export interface GIContextState {
  setState: (state: Partial<GIContextState>) => void;
  error?: GIError;
  isAdminMode?: boolean;
  logout: () => Promise<void>;
  handleAuthToken: (token?: string) => Promise<void>;
  devModeAuthToken?: string;
  viewingOlderPipelineVersion?: HydratedPipelineHistoryEntry;
  pipelineDetailsAccordionState?: number[];
}

export const GIContext = createContext<GIContextState>({
  error: undefined,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setState: (_state: GIContextState) => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  logout: async (): Promise<void> => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleAuthToken: async (_token?: string): Promise<void> => {}
});

export function useGIContext(): GIContextState {
  return useContext(GIContext);
}

export interface HistoryState {
  viewingHistory: boolean;
  historyEntry?: HydratedPipelineHistoryEntry;
  pipeline: PipelineDefinition | undefined;
}

export function useViewingPipelineDefinition(
  defaultDefinition?: PipelineDefinition
): HistoryState {
  const ctx = useGIContext();
  const viewingHistory = ctx.viewingOlderPipelineVersion !== undefined;
  return useMemo(
    () =>
      ({
        viewingHistory,
        pipeline: viewingHistory
          ? ctx.viewingOlderPipelineVersion?.pipeline
          : defaultDefinition,
        historyEntry: ctx.viewingOlderPipelineVersion
      }) satisfies HistoryState,
    [ctx.viewingOlderPipelineVersion, defaultDefinition, viewingHistory]
  );
}
