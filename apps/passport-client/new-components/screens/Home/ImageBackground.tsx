import styled, { css } from "styled-components";
import { BANNER_HEIGHT } from "../../../src/sharedConstants";
import { ReactElement } from "react";

const shared = css`
  position: absolute;
  top: ${BANNER_HEIGHT}px;
  right: 0;
  left: 0;
  height: calc(100% - ${BANNER_HEIGHT}px);
  max-height: calc(100vh - ${BANNER_HEIGHT}px);
  min-height: calc(600px + ${BANNER_HEIGHT}px);
  z-index: -1;
`;
const BackgroundImage = styled.div<{ image: string }>`
  ${shared}

  background: url(${({ image }): string => image}) var(--dot-bg) 70% / cover
    no-repeat;
  transition: background 1s linear;
`;

const Gredient = styled.div`
  ${shared}
  background: linear-gradient(
    rgba(255, 255, 255, 0) 90%,
    rgba(236, 236, 236, 1) 100%
  );
`;

export const ImageBackground = ({
  image
}: {
  image?: string;
}): ReactElement | null => {
  if (!image) return null;
  return (
    <>
      <BackgroundImage image={image} />
      <Gredient />
    </>
  );
};
