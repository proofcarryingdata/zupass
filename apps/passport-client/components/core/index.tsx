import { Spacer } from "@pcd/passport-ui";
import { ZUPASS_SUPPORT_EMAIL } from "@pcd/util";
import styled from "styled-components";
import { icons } from "../icons";
import { Button } from "./Button";
import { BigInput } from "./Input";

export { BigInput, Button, Spacer };

export const H1 = styled.h1<{ col?: string }>`
  color: ${(p) => p.col || "var(--accent-dark)"};
  letter-spacing: 3.5px;
  font-size: 36px;
  font-weight: 200;
`;

export const H2 = styled.h2<{ col?: string }>`
  color: ${(p) => p.col || "var(--accent-dark)"};
  letter-spacing: 3.5px;
  font-size: 22px;
  font-weight: 300;
`;

export const H3 = styled.h3<{ col?: string }>`
  color: ${(p) => p.col || "var(--white)"};
  letter-spacing: 0.5px;
  font-size: 22px;
  font-weight: 500;
`;

export const H4 = styled.h4<{ col?: string }>`
  color: ${(p) => p.col || "var(--white)"};
  letter-spacing: 1px;
  font-size: 20px;
  font-weight: 400;
`;

export const H5 = styled.h5<{ col?: string }>`
  color: ${(p) => p.col || "var(--white)"};
  letter-spacing: 1px;
  font-size: 18px;
  font-weight: 400;
`;

export const Caption = styled.caption<{ col?: string }>`
  color: ${(p) => p.col || "var(--white)"};
  letter-spacing: 1px;
  font-size: 14px;
  font-weight: 500;
`;

export const InfoLine = styled.div`
  color: var(--primary-dark);
  letter-spacing: 0.5px;
  font-size: 14px;
  font-weight: 300;
`;

export const HR = styled.hr`
  border: none;
  border-top: 1px solid rgba(var(--white-rgb), 0.2);
  margin: 0 16px;
`;

export const CenterColumn = styled.div<{ w?: number }>`
  width: ${(p) => (p.w ?? 280) + "px"};
  margin: 0 auto;
`;

export const Placeholder = styled.div<{ minH?: number }>`
  width: 100%;
  ${(p) => (p.minH ? `min-height: ${p.minH}px` : "")};
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

export function ZuLogo() {
  return (
    <img draggable="false" src={icons.logo} width="160px" height="155px" />
  );
}

export const SupportLink = () => {
  return <a href={`mailto:${ZUPASS_SUPPORT_EMAIL}`}>{ZUPASS_SUPPORT_EMAIL}</a>;
};
