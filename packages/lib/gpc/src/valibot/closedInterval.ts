import { bigintFromJSON, bigintToSimplestJSON } from "@pcd/pod";
import * as v from "valibot";
import { ClosedInterval } from "../gpcTypes";
import { valibotParse } from "./valibotUtil";

// TODO(artywman): Example of to declare a new type in its own file.
// Importantly, the code after the Schema and GPC type declarations can be
// copy/paste without any modifications.  The string "ClosedInterval" doesn't
// appear below the GPCType declaration in this file.

export const Schema = {
  ToJSON: v.strictObject({
    min: v.pipe(v.bigint(), v.transform(bigintToSimplestJSON)),
    max: v.pipe(v.bigint(), v.transform(bigintToSimplestJSON))
  }),
  FromJSON: v.strictObject({
    min: v.pipe(v.union([v.string(), v.number()]), v.transform(bigintFromJSON)),
    max: v.pipe(v.union([v.string(), v.number()]), v.transform(bigintFromJSON))
  })
};

export type GPCType = ClosedInterval;
export type JSONType = v.InferOutput<typeof Schema.ToJSON>;

const _ToJsonInputCheck = {} as GPCType satisfies v.InferInput<
  typeof Schema.ToJSON
>;

const _FromJsonOutputCheck = {} as GPCType satisfies v.InferOutput<
  typeof Schema.FromJSON
>;
const _FromJsonInputCheck = {} as JSONType satisfies v.InferInput<
  typeof Schema.FromJSON
>;

export function toJSON(gpcInput: GPCType): JSONType {
  return valibotParse(Schema.ToJSON, gpcInput);
}

export function fromJSON(jsonInput: JSONType): GPCType {
  return valibotParse(Schema.FromJSON, jsonInput);
}
