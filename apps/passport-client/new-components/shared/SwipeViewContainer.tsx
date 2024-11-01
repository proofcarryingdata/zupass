import styled from "styled-components";

export const SwipeViewContainer = styled.div<{ isZapp?: boolean }>`
  position: relative;
  height: ${({ isZapp }): string => (isZapp ? "100vh" : "inherit")};
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
`;
