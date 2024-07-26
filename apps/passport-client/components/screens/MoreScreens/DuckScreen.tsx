import { Spacer, styled } from "@pcd/passport-ui";
import { ReactNode } from "react";
import { NewButton } from "../../NewButton";
import { H1, Placeholder } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

export function DuckScreen(): ReactNode {
  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <div className="flex-row flex align-center items-center gap-3">
          <img
            src="https://i.pinimg.com/originals/0a/d5/11/0ad5112cb48a2e9199174b0211412c64.jpg"
            width="48px"
          ></img>
          <H1 className="">Duckpass</H1>
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
              className="w-full h-[200px] border-black border-4 rounded-lg"
              style={{
                backgroundImage: `url('https://cdn.britannica.com/92/100692-050-5B69B59B/Mallard.jpg')`,
                backgroundSize: "cover"
              }}
            ></Clickable>
            <NewButton>Sync Your Duck</NewButton>
            <textarea
              placeholder="don't you want your duck to say something neat?"
              className="p-2 text-black 2-full border-black border-4 h-[200px] outline-none focus:ring-2 focus:ring-offset-4 focus:ring-white ring-opacity-60 ring-offset-[#19473f] transition-all duration-200"
            ></textarea>
            <NewButton>Set Duck Message</NewButton>
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
