import * as p from "./core";
import type {
  PodspecEntriesSerializedDef,
  RawEntriesType
} from "./types/entries";
export type GenericSerializedEntriesSpec =
  PodspecEntriesSerializedDef<RawEntriesType>;
export { p };
export default p;
