import styled from "styled-components";

export function Spacer({
  w,
  h,
}: {
  w?: 8 | 16 | 24 | 32 | 48 | 64;
  h?: 8 | 16 | 24 | 32 | 48 | 64 | 96 | 128;
}) {
  const width = w && `${w}px`;
  const height = h && `${h}px`;
  return <div style={{ width, height }} />;
}

export const Separator = styled.div`
  box-sizing: border-box;
  background-color: var(--primary-lite);
  width: 100%;
  height: 2px;
  border-radius: 99px;
  margin: 16px 0px;
`;

export const FieldLabel = styled.span`
  font-weight: bold;
`;
