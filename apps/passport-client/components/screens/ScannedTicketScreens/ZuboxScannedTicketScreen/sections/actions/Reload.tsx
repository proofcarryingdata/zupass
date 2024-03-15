import { Dispatch, ReactNode, SetStateAction, useState } from "react";
import { Button } from "../../../../../core";
import { RippleLoader } from "../../../../../core/RippleLoader";

export function Reload({
  setIsLoading,
  isLoading
}: {
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}): ReactNode {
  const [clicked, setClicked] = useState(false);

  if (clicked) {
    return <RippleLoader />;
  }

  return (
    <Button
      disabled={isLoading}
      style="outline"
      onClick={(): void => {
        window.location.reload();
        setIsLoading(true);
        setClicked(true);
      }}
    >
      Reload
    </Button>
  );
}
