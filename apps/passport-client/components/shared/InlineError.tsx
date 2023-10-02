import { Spacer } from "@pcd/passport-ui";
import { ErrorMessage } from "../core/error";

export function InlineError({ error }: { error?: string }) {
  return (
    <>
      {error && (
        <>
          <Spacer h={16} />
          <ErrorMessage>{error}</ErrorMessage>
          <Spacer h={8} />
        </>
      )}
    </>
  );
}
