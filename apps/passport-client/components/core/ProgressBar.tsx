import { ReactNode } from "react";
import styled from "styled-components";

export function ProgressBar({
  label,
  doneLabel,
  fractionCompleted
}: {
  label?: string;
  doneLabel?: string;
  fractionCompleted: number;
}): ReactNode {
  const displayPercent = Math.floor(fractionCompleted * 100) + "%";
  let renderedLabel =
    label === undefined ? displayPercent : `${label} ${displayPercent}`;
  if (fractionCompleted === 1) {
    renderedLabel = doneLabel ?? "Complete";
  }

  return (
    <ProgressBarContainer>
      <LabelContainerContainer>
        <ProgressIndicator
          style={{
            width: displayPercent
          }}
        />
        <LabelContainer>{renderedLabel}</LabelContainer>
      </LabelContainerContainer>
    </ProgressBarContainer>
  );
}

const ProgressBarContainer = styled.div`
  width: 100%;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid white;
  padding: 4px 8px;
  border-radius: 4px;
  position: relative;
  height: 75px;
  overflow: hidden;
`;

const MIN_PROGRESS_WIDTH = "5%";
const ProgressIndicator = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  min-width: ${MIN_PROGRESS_WIDTH};
  width: ${MIN_PROGRESS_WIDTH};
  height: 100%;
  background-color: #34a12a;
  z-index: 4;
  transition: width 200ms;

  @keyframes color-change {
    0% {
      background-color: #34a12a;
    }
    50% {
      background-color: #59aa52;
    }
    100% {
      background-color: #34a12a;
    }
  }

  animation: color-change 1s infinite;
`;

const LabelContainerContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LabelContainer = styled.div`
  background-color: var(--bg-dark-primary);
  border: 1px solid white;
  padding: 2px 20px;
  display: inline-block;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
`;
