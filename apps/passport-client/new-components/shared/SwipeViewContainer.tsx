import styled from "styled-components";

export const SwipeViewContainer = styled.div<{ isZapp?: boolean }>`
  position: relative;
  ${({ isZapp }): string => (isZapp ? "height:  100vh;" : "")};
  display: flex;
  flex-direction: column;
  width: 100%;
`;
