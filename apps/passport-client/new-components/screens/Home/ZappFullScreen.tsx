import { ReactElement } from "react";
import styled from "styled-components";
import { ZappScreen } from "../../../components/screens/ZappScreens/ZappScreen";
import { AppContainer } from "../../../components/shared/AppContainer";
import { SwipeViewContainer } from "../../shared/SwipeViewContainer";

const FloatingReturnButton = styled.div`
  position: fixed;
  left: 50%;
  bottom: 20px;
  z-index: 2;
  transform: translateX(-50%);
  cursor: pointer;

  display: inline-flex;
  padding: 8px 20px;
  align-items: flex-start;

  border-radius: 200px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);

  /* text */
  color: #fff;
  text-align: center;
  font-family: Rubik;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 135%;
`;

interface ZappFullScreenProps {
  url: string;
  onReturn: () => void;
}

export const ZappFullScreen = ({
  url,
  onReturn
}: ZappFullScreenProps): ReactElement => {
  return (
    <AppContainer bg="gray" noPadding fullscreen>
      <SwipeViewContainer isZapp>
        <FloatingReturnButton onClick={onReturn}>
          <span>Back to Zupass</span>
        </FloatingReturnButton>
        <ZappScreen url={url} />
      </SwipeViewContainer>
    </AppContainer>
  );
};
