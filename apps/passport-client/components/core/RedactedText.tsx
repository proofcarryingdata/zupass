import styled, { css } from "styled-components";

export const RedactedText = styled.div<{ redacted: boolean }>`
  ${({ redacted }) =>
    redacted
      ? css`
          background-color: var(--bg-dark-primary);
          color: var(--bg-dark-primary);
          &:before {
            content: "REDACTED";
            color: white;
            font-weight: bold;
            left: 25%;
            position: absolute;
          }
        `
      : css``}
  border-radius: 4px;
  margin-bottom: 4px;
  padding: 2px;
  position: relative;
  transition-property: color, background-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  /* Same duration as the toggle slide */
  transition-duration: 300ms;
`;
