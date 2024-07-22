import { ErrorMessage, Spacer } from "@pcd/passport-ui";

export function InlineError({ error }: { error?: string }): JSX.Element {
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
