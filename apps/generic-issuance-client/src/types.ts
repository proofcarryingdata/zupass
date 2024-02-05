export interface UIError {
  message: string;
  description?: string;
  httpRequestError?: string;
}

export interface LoadHook<T> {
  value?: T;
  isLoading: boolean;
  setError?: React.Dispatch<React.SetStateAction<UIError>>;
  error?: UIError;
}

export interface APIActionHook<TArgs, APIResult> {
  load: (t: TArgs) => Promise<APIResult>;
  value: string;
  isLoading: boolean;
  setError?: React.Dispatch<React.SetStateAction<UIError>>;
  error?: UIError;
}
