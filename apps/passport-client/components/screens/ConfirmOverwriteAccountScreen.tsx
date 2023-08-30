import { useCallback } from "react";
import { useQuery } from "../../src/appHooks";
import { BigInput, Button, Spacer } from "../core";

export function ConfirmOverwriteAccountScreen() {
  const query = useQuery();
  const email = query?.get("email");
  const identityCommitment = query?.get("identityCommitment");

  const onOverwriteClick = useCallback(() => {
    alert("overwrite");
  }, []);

  const onNeverMindClick = useCallback(() => {
    alert("never mind");
  }, []);

  return (
    <div>
      <div>you've already registered, are you sure?</div>
      <BigInput value={email} disabled />
      <Spacer h={16} />
      <Button onClick={onOverwriteClick}>Overwrite</Button>
      <Spacer h={16} />
      <Button onClick={onNeverMindClick} style="danger">
        Never Mind
      </Button>
    </div>
  );
}
