import styled from "./StyledWrapper";

export function Spacer({
  w,
  h
}: {
  w?: 8 | 16 | 24 | 32 | 48 | 64;
  h?: 8 | 16 | 24 | 32 | 48 | 64 | 96 | 128 | 256 | 512;
}) {
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

export const FieldLabel = styled.span`
  font-weight: bold;
`;

export const LinkButton = styled.a`
  color: #e6a50f;
  cursor: pointer;
  text-decoration: none;
`;
