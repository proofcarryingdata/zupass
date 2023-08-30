import { useCallback } from "react";
import { Button } from "../core";

export function ConfirmOverwriteAccountScreen() {
  const onOverwriteClick = useCallback(() => {
    alert("overwrite");
  }, []);
  const onNeverMindClick = useCallback(() => {
    alert("never mind");
  }, []);

  return (
    <div>
      <div>you've already registered, are you sure?</div>
      <Button onClick={onOverwriteClick}>Overwrite</Button>
      <Button onClick={onNeverMindClick}>Never Mind</Button>
    </div>
  );
}
