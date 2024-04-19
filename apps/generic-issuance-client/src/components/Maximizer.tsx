import { Button } from "@chakra-ui/react";
import styled from "@emotion/styled";
import { ReactNode } from "react";

export function Maximizer({
  children,
  maximized,
  setMaximized
}: {
  children: ReactNode | ReactNode[] | undefined;
  maximized?: boolean;
  setMaximized?: React.Dispatch<React.SetStateAction<boolean>>;
}): ReactNode {
  if (maximized) {
    return (
      <MaximizerContainer>
        {children}
        <MinimizeContainer>
          <Button
            colorScheme="blue"
            onClick={(): void => setMaximized?.(false)}
          >
            Minimize
          </Button>
        </MinimizeContainer>
      </MaximizerContainer>
    );
  }

  return <>{children}</>;
}

export const MinimizeContainer = styled.div`
  position: fixed;
  bottom: 0;
  right: 0;
  padding: 16px 32px;
`;

export const MaximizerContainer = styled.div`
  z-index: 9999;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;

  min-width: 100vw;
  min-height: 100vh;
  overflow: hidden;
  background-color: black;
`;
