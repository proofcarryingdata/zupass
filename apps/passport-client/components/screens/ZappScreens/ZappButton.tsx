import styled from "styled-components";
export const ZAPP_BUTTON_HEIGHT = 60;
export const ZappButton = styled.div`
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  height: ${ZAPP_BUTTON_HEIGHT}px;
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
