import { Spacer, styled } from "@pcd/passport-ui";
import { ReactNode, useState } from "react";
import { createGlobalStyle } from "styled-components";
import { useLocalStorage } from "usehooks-ts";
import { NewButton } from "../../NewButton";
import { H1, Placeholder } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

const OverrideStyles = createGlobalStyle`
  html {
    background-image: url("https://as1.ftcdn.net/v2/jpg/02/22/42/62/1000_F_222426277_KXFzXYBaKkFjHDEDkESWh830L9Wc4XyE.jpg") !important;
    background-repeat: repeat;
    animation: circleMove 10s linear infinite;
  }

  @keyframes circleMove {
    0% {
      background-position: 0% 0%;
    }
    25% {
      background-position: 5% 5%;
    }
    50% {
      background-position: 0% 10%;
    }
    75% {
      background-position: -5% 5%;
    }
    100% {
      background-position: 0% 0%;
    }
  }
`;

export function DuckScreen(): ReactNode {
  const [message, setMessage] = useLocalStorage("duck-message", "", {
    initializeWithValue: true
  });
  const [text, setText] = useState("");

  return (
    <>
      <OverrideStyles />
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <div className="flex-row flex align-center items-center gap-3">
          <img
            src="https://i.pinimg.com/originals/0a/d5/11/0ad5112cb48a2e9199174b0211412c64.jpg"
            width="48px"
          ></img>
          <H1 className="font-bold text-green-500">Duckpass</H1>
        </div>
        <Spacer h={24} />
        <Placeholder minH={540}>
          <div className="flex flex-col gap-2">
            <NewButton
              onClick={() => {
                window.location.href = "#/more";
              }}
            >
              Back
            </NewButton>
            <Clickable
              className="w-full h-[200px] border-black border-4 rounded-lg relative"
              style={{
                backgroundImage: `url('https://cdn.britannica.com/92/100692-050-5B69B59B/Mallard.jpg')`,
                backgroundSize: "cover"
              }}
            >
              {message && (
                <RainbowSpan className="rounded-lg m-2 p-2 inline-block">
                  {message}
                </RainbowSpan>
              )}
            </Clickable>
            <NewButton>Sync Your Duck</NewButton>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="don't you want your duck to say something neat?"
              className="rounded-lg p-2 text-black 2-full border-black border-4 h-[200px] outline-none focus:ring-2 focus:ring-offset-4 focus:ring-white ring-opacity-60 ring-offset-[#19473f] transition-all duration-200"
            ></textarea>
            <NewButton onClick={() => setMessage(text)}>
              Set Duck Message
            </NewButton>
          </div>
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}

export const Clickable = styled.div`
  transition: 150ms;
  cursor: pointer;

  &:hover {
    transform: scale(1.01) translateY(-2px);
  }

  &:active {
    transform: scale(1.015) translateY(4px);
  }
`;

const RainbowSpan = styled.span`
  display: inline-block;
  animation:
    rainbow-rotate 2s linear infinite,
    wobble 1s ease-in-out infinite,
    pulse 0.5s ease-in-out infinite;

  @keyframes rainbow-rotate {
    0% {
      background-color: red;
    }
    14% {
      background-color: orange;
    }
    28% {
      background-color: yellow;
    }
    42% {
      background-color: green;
    }
    57% {
      background-color: blue;
    }
    71% {
      background-color: indigo;
    }
    85% {
      background-color: violet;
    }
    100% {
      background-color: red;
    }
  }

  @keyframes wobble {
    0%,
    100% {
      transform: rotate(-3deg);
    }
    50% {
      transform: rotate(3deg);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  padding: 4px 8px;
  border-radius: 4px;
  color: white;
  font-weight: bold;
`;
