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
  border-radius: 99px;
  width: 90%;
  margin: 5%;
  box-sizing: border-box;
  height: 2px;
  background-color: var(--primary-lite);
  margin-top: 8px;
  margin-bottom: 8px;
`;
