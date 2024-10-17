import * as v from "valibot";
import { PODEntryIdentifier } from "../gpcTypes";
import { checkPODEntryIdentifier } from "../gpcUtil";
import { valibotParse } from "./valibotUtil";

export const Schema = {
  ToJSON: v.pipe(
    v.string(),
    v.transform((n) => checkPODEntryIdentifier(n, n as PODEntryIdentifier))
  ),
  FromJSON: v.pipe(
    v.string(),
    v.transform((n) => checkPODEntryIdentifier(n, n as PODEntryIdentifier))
  )
};

export type TSType = PODEntryIdentifier;
export type JSONType = PODEntryIdentifier;

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
