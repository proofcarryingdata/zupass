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

export const TextCenter = styled.div`
  text-align: center;
`;

export const TextEllipsis = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const TextSecondary = styled.div`
  color: #666;
`;

export const PreWrap = styled.pre`
  white-space: pre-wrap;
  overflow: hidden;
`;
