import styled from "styled-components";
import { Button } from "./Button";
import { BigInput } from "./Input";
import { Spacer } from "./Spacer";

export { Button, BigInput, Spacer };

export const H1 = styled.h1`
  font-size: 2rem;
`;

export const H1Center = styled(H1)`
  text-align: center;
`;

export const Center = styled.div`
  text-align: center;
`;

export const Ellipsis = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;
  width: 320px;
  margin: 0 auto;
  position: relative;
`;
