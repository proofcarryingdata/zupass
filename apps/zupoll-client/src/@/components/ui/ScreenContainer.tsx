import styled from "styled-components";

export function ScreenContainer({ children }: React.PropsWithChildren) {
  return <ScreenStyle>{children}</ScreenStyle>;
}

const ScreenStyle = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: scroll;
`;
