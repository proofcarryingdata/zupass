import { Spacer } from "@pcd/passport-ui";
import { ReactNode } from "react";
import { cn } from "../../../src/util";
import { NewButton } from "../../NewButton";
import { H1, Placeholder, ZuLogo } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";

interface SubPage {
  image: string;
  title?: string;
  pageLink: string;
}

export function MoreScreen(): ReactNode {
  const subPages: SubPage[] = [
    {
      image: "https://i.imgur.com/8uWVBl6.png",
      pageLink: "#/duck"
    },
    {
      image: "https://i.imgur.com/dPHJPtO.png",
      pageLink: "#/fhe"
    },
    {
      image: "https://i.imgur.com/W9LVI5D.png",
      pageLink: "#/pod"
    },
    {
      image: "https://i.imgur.com/1fr57wQ.png",
      pageLink: "#/zk"
    },
    {
      image: "https://i.imgur.com/5wnnlmb.png",
      pageLink: "#/0xparc"
    },
    {
      image: "https://i.imgur.com/jrsV7Vr.png",
      pageLink: "https://github.com/proofcarryingdata/zupass"
    }
  ];

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <div className="flex-row flex align-center items-center gap-3">
          <ZuLogo width="48px" /> <H1 className="">Zupass</H1>
        </div>
        <Spacer h={24} />
        <Placeholder minH={540}>
          <NewButton
            onClick={() => {
              window.location.href = "#/";
            }}
          >
            Back
          </NewButton>

          <div className="grid grid-cols-2 gap-4 mt-[0.75rem] w-full">
            {subPages.map((page) => (
              <div
                key={page.title}
                className={squareStyle}
                onClick={() => {
                  window.location.href = page.pageLink;
                }}
                style={{
                  backgroundImage: `url('${page.image}')`,
                  backgroundSize: "cover"
                }}
              >
                {page.title && (
                  <span className="bg-black rounded-xl px-2 py-1 border-white border-4">
                    {page.title}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}

const squareStyle = cn(
  "rounded",
  "font-bold text-xl active:scale-[1.05] hover:translate-y-[-3px] active:translate-y-[4px] transition-all duration-200 select-none",
  "bg-red-500 p-4 aspect-square border-4 border-black cursor-pointer"
);
