import zxcvbn from "zxcvbn";

declare global {
  interface Window {
    zxcvbn?: typeof zxcvbn;
  }
}

declare module "fast-fuzzy" {
  interface CoreOptions {
    ignoreCase?: boolean;
    ignoreSymbols?: boolean;
    normalizeWhitespace?: boolean;
    useDamerau?: boolean;
    useSellers?: boolean;
  }

  type FuzzyOptions = CoreOptions & { returnMatchData?: false };
  type FuzzyOptionsMatchData = CoreOptions & { returnMatchData: true };

  interface AdditionalOptions<T> {
    keySelector?: (s: T) => string | string[];
    threshold?: number;
  }

  type FullOptions<T> = FuzzyOptions & AdditionalOptions<T>;
  type FullOptionsMatchData<T> = FuzzyOptionsMatchData & AdditionalOptions<T>;

  export interface MatchData<T> {
    item: T;
    original: string;
    key: string;
    score: number;
    match: {
      index: number;
      length: number;
    };
  }

  interface TrieNode<T> {
    children: {
      [key: string]: TrieNode<T>;
    };
    candidates: T[];
    depth: number;
  }

  export function fuzzy(
    term: string,
    candidate: string,
    options?: FuzzyOptions
  ): number;
  export function fuzzy(
    term: string,
    candidate: string,
    options: FuzzyOptionsMatchData
  ): MatchData<string>;
  export function search<T extends string | object>(
    term: string,
    candidates: T[],
    options?: FullOptions<T>
  ): T[];
  export function search<T extends string | object>(
    term: string,
    candidates: T[],
    options: FullOptionsMatchData<T>
  ): MatchData<T>[];
  export class Searcher<T extends string | object> {
    options: FullOptions<T> | FullOptionsMatchData<T>;
    trie: TrieNode<T>;
    count: number;

    constructor(
      candidates?: T[],
      options?: FullOptions<T>
    ): this is { options: FullOptions<T> };
    constructor(
      candidates?: T[],
      options: FullOptionsMatchData<T>
    ): this is { options: FullOptionsMatchData<T> };
    add(...candidates: T[]);
    search(
      term: string,
      options?: FullOptions<T>
    ): this extends { options: FullOptionsMatchData<T> } ? MatchData<T>[] : T[];
    search(term: string, options: FullOptionsMatchData<T>): MatchData<T>[];
  }
}
