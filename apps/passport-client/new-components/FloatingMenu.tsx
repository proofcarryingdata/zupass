import { Cog6ToothIcon, Square3Stack3DIcon } from "@heroicons/react/24/solid";
import styled from "styled-components";
import { useDispatch } from "../src/appHooks";

const FloatingMenuContainer = styled.div`
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  bottom: 20px;
  background-color: #ffffff;

  z-index: 2;
  min-height: 56px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0px 1px 3px 0px #0000001a;

  padding: 8px 20px 8px 20px;
  border-radius: 200px;
  opacity: 0px;
`;

const FloatingMenuItem = styled.div`
  width: 48px;
  height: 40px;
  justify-content: center;
  align-items: center;
  display: flex;
`;

export const FloatingMenu = (): JSX.Element => {
  const dispatch = useDispatch();
  return (
    <FloatingMenuContainer>
      <FloatingMenuItem>
        <Square3Stack3DIcon color="#000000" opacity={0.6} height={24} />
      </FloatingMenuItem>
      <FloatingMenuItem
        onClick={() =>
          dispatch({
            type: "set-bottom-modal",
            modal: { modalType: "settings" }
          })
        }
      >
        <Cog6ToothIcon color="#000000" opacity={0.6} height={24} />
      </FloatingMenuItem>
    </FloatingMenuContainer>
  );
};
