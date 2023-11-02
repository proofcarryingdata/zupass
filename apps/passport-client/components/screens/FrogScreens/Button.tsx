import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

/**
 * A button that shows a loading spinner while the action is in progress.
 */
export function ActionButton({
  children,
  onClick,
  disabled
}: {
  children: string;
  /**
   * The action to perform when the button is clicked. This should return a
   * promise that resolves when the action is complete.
   */
  onClick: () => Promise<void>;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  // Every user click increment the trigger count, which will trigger the
  // useEffect to kick onClick action below.
  const [trigger, setTrigger] = useState(0);
  // nb: This improves the developer ergnomic and perserve the onClick semantics
  // such that it only fires once on click. By using ref, our trigger logic can
  // be freed from it as a dependency. Otherwise user needs to wrap onClick in
  // useCallback.
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  // nb: This useEffect is the core logic of this component. It will trigger
  // onClick action when trigger count is incremented. It will also set loading
  // state to true when onClick action is triggered, and set loading state to
  // false when onClick action is done.
  //
  // The key invariant is that because onClick action is async, we need to
  // ensure that the following scenario is handled correctly:
  //
  // 1. User click the button
  // 2. onClick action is triggered (Attempt X)
  // 3. User click the button again
  // 4. onClick action is triggered (Attempt Y)
  // 5. onClick action X is done, setting loading state to false, even though Y
  //    is still in progress.
  //
  // This would be incorrect and is handled by the abortController below.
  useEffect(() => {
    const abortController = new AbortController();

    if (trigger > 0) {
      setLoading(true);
      onClickRef
        .current()
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          // aborted means a newer onClick action is triggered and we should
          // take no further action
          if (abortController.signal.aborted) {
            return;
          }

          setLoading(false);
        });
    }

    return () => {
      abortController.abort();
    };
  }, [trigger]);

  const handleClick = useCallback(() => {
    setTrigger((prev) => prev + 1);
  }, []);

  return (
    <Button
      onClick={handleClick}
      disabled={loading || disabled}
      pending={loading}
    >
      {children}
    </Button>
  );
}

export const Button = styled.button<{ pending?: boolean }>`
  font-size: 16px;
  padding: 8px;
  border: none;
  border-radius: 4px;
  background-color: var(--bg-lite-primary);
  color: var(--white);
  cursor: pointer;
  flex: 1;

  &:disabled {
    background-color: rgba(var(--white-rgb), 0.2);
    filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25));
    cursor: ${(props) => (props.pending ? "wait" : "unset")};
  }
`;
