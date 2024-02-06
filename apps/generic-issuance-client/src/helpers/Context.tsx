import { createContext } from "react";

export interface GIError {
  name: string;
  description: string;
}

export interface GIContextState {
  setState: (state: GIContextState) => void;
  error?: GIError;
}

export const GIContext = createContext<GIContextState>({
  error: undefined,
  setState: (_state: GIContextState) => {
    //
  }
});
