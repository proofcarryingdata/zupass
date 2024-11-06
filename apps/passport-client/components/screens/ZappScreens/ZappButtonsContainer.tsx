import styled from "styled-components";
import { MAX_WIDTH_SCREEN } from "../../../src/sharedConstants";

export const ZappButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: ${MAX_WIDTH_SCREEN}px;
`;
