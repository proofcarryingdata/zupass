import styled from "./StyledWrapper";

export function Spacer({
  w,
  h
}: {
  w?: 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64;
  h?: 4 | 8 | 12 | 16 | 20 | 24 | 32 | 48 | 64 | 96 | 128 | 256 | 512 | 1024;
}): JSX.Element {
  const width = w && `${w}px`;
  const height = h && `${h}px`;
  return <div style={{ width, height, userSelect: "none" }} />;
}

export const Separator = styled.div`
  box-sizing: border-box;
  background-color: var(--primary-lite);
  width: 100%;
  height: 2px;
  border-radius: 99px;
  margin: 16px 0px;
  user-select: none;
`;

export const FieldLabel = styled.div`
  font-weight: bold;
  color: var(--text-tertiary);
  font-family: Barlow;
  font-size: 14px;
  font-weight: 700;
  line-height: 135%; /* 18.9px */
`;

export const StyledLinkButton = styled.a`
  color: #e6a50f;
  cursor: pointer;
  text-decoration: none;
`;
