import { createContext } from "react";

// I am overall not sure about this file, so I didn't go too far.
// I would really like to get set up with Redux asap.

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
