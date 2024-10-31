import styled from "styled-components";

export const ZappButton = styled.div`
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  height: 80px;
  position: relative;
  cursor: pointer;
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }
`;
