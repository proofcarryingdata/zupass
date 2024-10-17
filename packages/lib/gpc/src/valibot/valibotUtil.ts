import * as v from "valibot";

/**
 * Helper for Valibot parsing which throws TypeError instead of ValiError, and
 * produces a more informative message.
 *
 * @param schema Valibot schema
 * @param input input to parse
 * @returns the parser output
 * @throws TypeError if the parser indicates invalid input
 */
export function valibotParse<
  const TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
>(schema: TSchema, input: unknown): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, input);
  if (!result.success) {
    const issue = result.issues[0];
    const dotPath = v.getDotPath(result.issues[0]);
    throw new TypeError(
      `Invalid input${!dotPath ? "" : " " + dotPath}: ${issue.message}`
    );
  }
  return result.output;
}
