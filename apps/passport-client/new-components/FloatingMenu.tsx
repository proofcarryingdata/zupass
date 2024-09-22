import { Cog6ToothIcon, Square3Stack3DIcon } from "@heroicons/react/24/solid";
import styled from "styled-components";

const FloatingMenuContainer = styled.div`
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  bottom: 20px;
  background-color: #ffffff;

  min-width: 136px;
  z-index: 2;
  min-height: 56px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0px 1px 3px 0px #0000001a;

  padding: 8px 28px 8px 28px;
  gap: 0px;
  border-radius: 200px;
  opacity: 0px;
`;

export const FloatingMenu = (): JSX.Element => {
  return (
    <FloatingMenuContainer>
      <Square3Stack3DIcon color="#000000" opacity={0.6} height={24} />
      <Cog6ToothIcon color="#000000" opacity={0.6} height={24} />
    </FloatingMenuContainer>
  );
};
