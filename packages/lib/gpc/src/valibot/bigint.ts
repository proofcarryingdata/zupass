import { bigintFromJSON, bigintToSimplestJSON, JSONBigInt } from "@pcd/pod";
import * as v from "valibot";
import { valibotParse } from "./valibotUtil";

export const Schema = {
  ToJSON: v.pipe(v.bigint(), v.transform(bigintToSimplestJSON)),
  FromJSON: v.pipe(
    v.union([v.string(), v.number()]),
    v.transform(bigintFromJSON)
  )
};

export type TSType = bigint;
export type JSONType = JSONBigInt;

//
// Don't customize below this point.  This boilerplate is intended to be the
// same for every type, and updated by copy/paste.
//

const _ToJsonOutputCheck = {} as v.InferOutput<
  typeof Schema.ToJSON
> satisfies JSONType;
const _ToJsonInputCheck = {} as TSType satisfies v.InferInput<
  typeof Schema.ToJSON
>;

const _FromJsonOutputCheck = {} as v.InferOutput<
  typeof Schema.FromJSON
> satisfies TSType;
const _FromJsonInputCheck = {} as JSONType satisfies v.InferInput<
  typeof Schema.FromJSON
>;

export function toJSON(gpcInput: TSType): JSONType {
  return valibotParse(Schema.ToJSON, gpcInput);
}

export function fromJSON(jsonInput: JSONType): TSType {
  return valibotParse(Schema.FromJSON, jsonInput);
}
