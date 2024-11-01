import styled from "styled-components";
import { MAX_WIDTH_SCREEN } from "../../../src/sharedConstants";

export const LoginContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
  gap: 12px;
  align-items: center;
  max-width: ${MAX_WIDTH_SCREEN}px;
`;
export const LoginTitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  padding: 0px 12px;
  text-align: left;
  margin-bottom: 24px;
`;
export const LoginForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 8px;
  margin-bottom: 30px;
`;
