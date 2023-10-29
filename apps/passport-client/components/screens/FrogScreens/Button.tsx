import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

export function ActionButton({
  children,
  onClick,
  disabled
}: {
  children: string;
  onClick: () => Promise<void>;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [trigger, setTrigger] = useState(0);
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);
  useEffect(() => {
    const abortController = new AbortController();

    if (trigger) {
      setLoading(true);
      onClickRef
        .current()
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
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
      loading={loading}
    >
      {children}
    </Button>
  );
}

export const Button = styled.button<{ loading?: boolean }>`
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
    cursor: ${(props) => (props.loading ? "wait" : "unset")};
  }
`;
