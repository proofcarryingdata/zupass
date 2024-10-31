import styled from "styled-components";

export const SwipeViewContainer = styled.div<{ isZapp?: boolean }>`
  position: relative;
  width: min(100vw, 420px);
  height: ${({ isZapp }): string => (isZapp ? "100vh" : "inherit")};
  display: flex;
  flex-direction: column-reverse;
`;
