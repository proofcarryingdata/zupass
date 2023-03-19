import * as React from "react";
import styled from "styled-components";
import { Button } from "./Button";
import { BigInput } from "./Input";
import { Spacer } from "./Spacer";

export { Button, BigInput, Spacer };

export const H1 = styled.h1`
  color: #fcd270;
  letter-spacing: 3.5px;
  font-size: 36px;
  font-weight: 200;
`;

export const H2 = styled.h2`
  color: #fcd270;
  letter-spacing: 3.5px;
  font-size: 22px;
  font-weight: 300;
`;

export const H3 = styled.h3`
  color: #fff;
  letter-spacing: 0.5px;
  font-size: 22px;
  font-weight: 400;
`;

export const HR = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  margin: 0 16px;
`;

export const CenterColumn = styled.div<{ w: number }>`
  width: ${(p) => p.w + "px"};
  margin: 0 auto;
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

export const BackgroundGlow = styled.div`
  width: 100%;
  min-height: 100vh;
  background: radial-gradient(
    circle closest-side at center 224px,
    #297474,
    #19473f
  );
`;

export function ZuLogo() {
  return <img src="/assets/logo.svg" width="160px" height="155px" />;
}
