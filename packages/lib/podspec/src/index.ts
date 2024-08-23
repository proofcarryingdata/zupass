import * as p from "./core";
import type { RawEntriesType } from "./types/entries";
import { SerializedPodspecPOD } from "./types/pod";
export type GenericSerializedPodspecPOD = SerializedPodspecPOD<RawEntriesType>;
export { p };
export default p;
