import ChevronDownIcon from "@heroicons/react/16/solid/ChevronDownIcon";
import { ReactElement } from "react";
import styled, { keyframes } from "styled-components";

const anim = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0) translateX(-10px);
  }
  40% {
    transform: translateY(10px) translateX(-10px);
  }
  60% {
    transform: translateY(5px) translateX(-10px);
  }
`;
const ScrollIndicatorContainer = styled.div`
  position: absolute;
  bottom: 2%;
  left: 50%;
  transform: translateX(-10px);
  z-index: 2;
  display: flex;
  flex-direction: column;
  opacity: 0.3;

  animation: ${anim} 1.5s infinite;

  transition: opacity 0.5s ease;
`;

export const ScrollIndicator = (): ReactElement => {
  return (
    <ScrollIndicatorContainer>
      <ChevronDownIcon color="var(--text-tertiary)" width={30} height={30} />
      <ChevronDownIcon
        color="var(--text-tertiary)"
        width={30}
        height={30}
        style={{ marginTop: -20 }}
      />
    </ScrollIndicatorContainer>
  );
};
