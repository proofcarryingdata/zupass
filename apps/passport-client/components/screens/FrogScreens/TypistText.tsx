import { useState } from "react";
import styled from "styled-components";
import Typewriter, { TypewriterClass } from "typewriter-effect";

/**
 * TypistText is a component that renders text with a typewriter effect. Any
 * children will be faded in after the typewriter effect is complete.
 */
export function TypistText({
  onInit,
  children
}: {
  /**
   * onInit will be called when the typewriter is ready.
   */
  onInit: (typewriter: TypewriterClass) => TypewriterClass;
  /**
   * Action button with the label will be rendered at the end of the adventure text.
   */
  children: React.ReactNode;
}): JSX.Element {
  const [ready, setReady] = useState(false);

  return (
    <>
      <TypewriterContainer>
        <Typewriter
          onInit={(typewriter): void => {
            onInit(typewriter)
              .callFunction(() => {
                setReady(true);
              })
              .start();
          }}
          options={{
            delay: 20
          }}
        />
      </TypewriterContainer>
      {ready && <FadeIn>{children}</FadeIn>}
    </>
  );
}

const FadeIn = styled.div`
  animation: fadeIn 0.5s ease-in forwards;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  width: 100%;
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 32px;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const TypewriterContainer = styled.div`
  font-size: 16px;
  user-select: none;
`;
