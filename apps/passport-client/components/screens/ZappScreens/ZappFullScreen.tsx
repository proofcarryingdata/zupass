import { XMarkIcon } from "@heroicons/react/24/solid";
import { ReactElement } from "react";
import styled from "styled-components";
import { SwipeViewContainer } from "../../../new-components/shared/SwipeViewContainer";
import { AppContainer } from "../../shared/AppContainer";
import { ZappScreen } from "./ZappScreen";

const ContentWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
`;

const FloatingReturnButton = styled.div`
  width: 24px;
  height: 24px;
  position: absolute;
  right: 22px;
  top: 28px;
  z-index: 9998;
  cursor: pointer;
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
        <ContentWrapper>
          <FloatingReturnButton onClick={onReturn}>
            <XMarkIcon fill="#12823B" />
          </FloatingReturnButton>
          <ZappScreen url={url} />
        </ContentWrapper>
      </SwipeViewContainer>
    </AppContainer>
  );
};
